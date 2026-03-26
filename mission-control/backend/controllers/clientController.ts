import { Response, Request } from "express";
import asyncHandler from "express-async-handler";

import clientModel from "../models/clientModel";
import userModel from "../models/userModel";
import { runInTransaction } from "../services/mongodb";
import appUserModel from "../models/appUserModel";
import { LatLng } from "../models/pathMapModel";
import materialModel from "../models/materialModel";
import robotModel from "../models/robotModel";
import logger from "../utils/logger";
import { masterDataCacheService } from "../services/masterDataCacheService";
import { refreshRobotOperationalSnapshots } from "../services/robotOperationalSnapshotService";

/**
 * Refresh specific operational snapshot sections for the affected robots.
 *
 * @param robotIds - Robot IDs whose operational snapshot cache should be updated
 * @param sections - Snapshot sections that should be recalculated
 */
const refreshRobotOperationalCache = async (
  robotIds: string[],
  sections: Array<"staffing" | "cycle">
): Promise<void> => {
  const uniqueRobotIds = [...new Set(robotIds.filter(Boolean))];

  if (uniqueRobotIds.length === 0) {
    return;
  }

  await refreshRobotOperationalSnapshots(uniqueRobotIds, sections);
};

/**
 * Find robot IDs affected by operator-to-client snapshot changes.
 *
 * @param operatorId - Operator whose client-linked robot snapshots are changing
 * @returns Robot IDs affected by the snapshot source change
 */
const getRobotIdsForOperatorClientSnapshot = async (
  operatorId: string
): Promise<string[]> => {
  const robots = await robotModel
    .find({
      $or: [
        { activeOperator: operatorId },
        { appUsers: operatorId, activeOperator: { $exists: false } }
      ]
    })
    .select("_id")
    .lean();

  return robots.map((robot) => robot._id.toString());
};

export const getClientOperators = asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  if (!clientId) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const operators = await appUserModel.find({ clientId });

  res.json(
    operators.map((operator) => ({
      id: operator.id,
      name: operator.name,
      imageUrl: operator.imageUrl,
      phoneNumber: operator.phoneNumber,
      robots: operator.robots?.length || 0
    }))
  );
});

export const getClients = asyncHandler(async (req, res) => {
  const { id } = req.user as { id: string };

  if (!id) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  const user = await userModel.findById(id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const clients = user.clients || [];

  // If user has no clients, return empty array (valid response)
  if (clients.length === 0) {
    res.json([]);
    return;
  }

  const clientsInfo = await Promise.all(
    clients.map(async (clientId) => {
      const client = await clientModel.findById(clientId);
      if (!client) {
        // Log warning but don't throw - client might have been deleted
        console.warn(`Client not found: ${clientId}`);
        return null;
      }
      return {
        id: client.id,
        name: client.name,
        operators: client.appUsers?.length ?? 0,
        isActive: client.isActive,
        materials: client.materials?.length ?? 0
      };
    })
  );

  // Filter out null values (deleted clients)
  const validClientsInfo = clientsInfo.filter((client) => client !== null);
  res.json(validClientsInfo);
});

/**
 * Get associated client
 * @access Private
 * @returns created client details
 *
 *
 */
export const getClientDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const { user } = req;

    if (!user) {
      res.status(404);
      throw new Error("User does not exist");
    }

    const client = await clientModel
      .findOne({ users: { _id: user.id } })
      .populate("users appUsers", "-password -role");
    if (client) {
      res.status(201).json(client);
    } else {
      res.status(404);
      throw new Error("Client Not Found");
    }
  }
);

export const getSelectedClientDetails = asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  if (!clientId) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const client = await clientModel.findById(clientId);

  if (client) {
    res.json(client);
  } else {
    res.status(404);
    throw new Error("Client not found");
  }
});

/**
 * Create a client
 * @access Private
 * @param req - Request with name, owner (userId) in JSON
 * @param res - Response
 * @returns created client details
 *
 *
 */
export const createClient = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      name,
      operatingHours,
      checkInTimeWithZone,
      latitude,
      longitude
    }: {
      name: string;
      operatingHours: number;
      checkInTimeWithZone: string;
      latitude: number;
      longitude: number;
    } = req.body;

    if (
      !name ||
      !operatingHours ||
      !checkInTimeWithZone ||
      !latitude ||
      !longitude
    ) {
      res.status(400);
      throw new Error("Missing required request body parameters");
    }
    const { user } = req;
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    // Fetch all existing admins to grant them access
    const admins = await userModel.find({ role: "admin" }).select("_id").lean();
    const adminIds = admins.map((admin) => admin._id.toString());
    const consolidatedUserIds = Array.from(new Set([user.id, ...adminIds]));

    const { updatedClient, updatedUser } = await runInTransaction(
      async (session) => {
        // Create client with consolidated list of users
        const [clientInTransaction] = await clientModel.create(
          [
            {
              name,
              owner: user.id,
              users: consolidatedUserIds,
              operatingHours,
              checkInTimeWithZone,
              location: { lat: latitude, lng: longitude }
            }
          ],
          { session }
        );

        // Link the client to all admins and the creator
        const userUpdateResult = await userModel.updateMany(
          { _id: { $in: consolidatedUserIds } },
          { $addToSet: { clients: clientInTransaction.id } },
          { session }
        );

        return {
          updatedClient: clientInTransaction,
          updatedUser: userUpdateResult
        };
      }
    );

    if (updatedClient && updatedUser) {
      res.status(201).json(updatedClient);
    } else {
      res.status(400);
      throw new Error("Client creation failed");
    }
  }
);

export const updateClient = asyncHandler(async (req, res) => {
  const {
    id,
    name,
    operatingHours,
    checkInTimeWithZone,
    latitude,
    longitude
  }: {
    id: string;
    name: string;
    operatingHours: number;
    checkInTimeWithZone: string;
    latitude: number;
    longitude: number;
  } = req.body;

  if (
    !id ||
    !name ||
    !operatingHours ||
    !checkInTimeWithZone ||
    !latitude ||
    !longitude
  ) {
    res.status(400);
    throw new Error("Missing required parameters");
  }

  const { user } = req;
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const client = await clientModel.findByIdAndUpdate(id, {
    name,
    operatingHours,
    checkInTimeWithZone,
    location: { lat: latitude, lng: longitude }
  });
  if (client) {
    // ✅ UPDATE SNAPSHOTS: Update clientSnapshot on robots where this client is assigned
    // When client's name, location, or operating hours change, Master Data should reflect the update
    // PERFORMANCE: This is on the write path (client profile update), not read path
    // Write operations are infrequent compared to Master Data reads, so this is acceptable
    try {
      // Update clientSnapshot for all robots that have this client
      // Robots get client association through their operator's clientId
      const robotUpdateResult = await robotModel.updateMany(
        { "clientSnapshot.id": id },
        {
          $set: {
            "clientSnapshot.name": name,
            "clientSnapshot.location": { lat: latitude, lng: longitude },
            "clientSnapshot.operatingHours": operatingHours
          }
        }
      );

      if (robotUpdateResult.modifiedCount > 0) {
        logger.info(
          `Updated clientSnapshot on ${robotUpdateResult.modifiedCount} robots after updating client ${id} profile`
        );
      }
    } catch (error) {
      // Log error but don't fail the request - snapshot will be fixed on next check-in
      logger.error(
        `Failed to update robot snapshots after client profile update: ${error}`
      );
    }

    // ✅ INVALIDATE MASTER DATA CACHE
    // Client profile change affects master data display
    await masterDataCacheService.invalidateCache(
      `client ${id} profile updated (name: ${name})`
    );

    res.status(201).json(client);
  } else {
    res.status(400);
    throw new Error("Client creation failed");
  }
});

/**
 * Add user to a client
 * @access Private
 * @param req - Request with userEmail in JSON
 * @param res - Response
 * @returns updated client details
 *
 *
 */
export const addUserToClient = asyncHandler(
  async (req: Request, res: Response) => {
    const { clientId, userEmail }: { clientId: string; userEmail: string } =
      req.body;
    if (!userEmail || !clientId) {
      res.status(400);
      throw new Error("Missing required request body parameters.");
    }
    if (!req.user) {
      res.status(404);
      throw new Error("User not found");
    }
    const client = await clientModel.findById(clientId).populate("users");

    if (!client) {
      res.status(404);
      throw new Error("No client found");
    }

    const user = await userModel.findOne({ email: userEmail });
    if (!user) {
      res.status(404);
      throw new Error("No User found");
    }
    const { updatedClient, updatedUser } = await runInTransaction(
      async (session) => {
        const clientInTransaction = await clientModel
          .findByIdAndUpdate(
            client.id,
            { $addToSet: { users: user.id } },
            { session, new: true }
          )
          .select("users");
        const userInTransaction = await userModel
          .findByIdAndUpdate(
            user.id,
            { $addToSet: { clients: client.id } },
            { session, new: true }
          )
          .select("clients");
        return {
          updatedClient: clientInTransaction,
          updatedUser: userInTransaction
        };
      }
    );

    if (updatedClient && updatedUser) {
      res.status(200).json({
        updatedClient,
        updatedUser
      });
    } else {
      res.status(400);
      throw new Error("Unable to add user to the client");
    }
  }
);

/**
 * Remove a user from client
 * @access Private
 * @param req - Request with userEmail in JSON
 * @param res - Response
 * @returns updated client details
 *
 *
 */

export const removeUserFromClient = asyncHandler(
  async (req: Request, res: Response) => {
    const { clientId, userEmail }: { clientId: string; userEmail: string } =
      req.body;
    if (!userEmail || !clientId) {
      res.status(400);
      throw new Error("Missing required request body parameters.");
    }
    if (!req.user) {
      res.status(404);
      throw new Error("User not found");
    }
    const client = await clientModel.findById(clientId).populate("users");

    if (!client) {
      res.status(404);
      throw new Error("No client found");
    }

    const user = await userModel.findOne({ email: userEmail });
    if (!user) {
      res.status(404);
      throw new Error("No User found");
    }
    const { updatedClient, updatedUser } = await runInTransaction(
      async (session) => {
        const clientInTransaction = await clientModel
          .findByIdAndUpdate(
            client.id,
            { $pull: { users: user.id } },
            { session, new: true }
          )
          .select("users");
        const userInTransaction = await userModel
          .findByIdAndUpdate(
            user.id,
            { $pull: { clients: client.id } },
            { session, new: true }
          )
          .select("clients");
        return {
          updatedClient: clientInTransaction,
          updatedUser: userInTransaction
        };
      }
    );

    if (updatedClient && updatedUser) {
      res.status(200).json({
        updatedClient,
        updatedUser
      });
    } else {
      res.status(400);
      throw new Error("Unable to remove user from the client");
    }
  }
);
/**
 * Add app user to a client
 * @access Private
 * @param req - Request with userEmail in JSON
 * @param res - Response
 * @returns updated client details
 *
 *
 */
export const addAppUserToClient = asyncHandler(
  async (req: Request, res: Response) => {
    const { clientId, operatorId }: { clientId: string; operatorId: string } =
      req.body;
    if (!operatorId || !clientId) {
      res.status(400);
      throw new Error("Missing required request body parameters.");
    }
    if (!req.user) {
      res.status(404);
      throw new Error("User not found");
    }
    const client = await clientModel.findById(clientId).populate("users");

    if (!client) {
      res.status(404);
      throw new Error("No client found");
    }

    const operator = await appUserModel.findById(operatorId);
    if (!operator) {
      res.status(404);
      throw new Error("No operator found");
    }
    // Allow inactive operators to be assigned to clients
    // Removed isActive check to support operators on leave or temporarily inactive
    const { updatedClient, updatedAppUser } = await runInTransaction(
      async (session) => {
        const clientInTransaction = await clientModel
          .findByIdAndUpdate(
            client.id,
            { $addToSet: { appUsers: operator.id } },
            { session, new: true }
          )
          .select("appUsers");
        const userInTransaction = await appUserModel
          .findByIdAndUpdate(
            operator.id,
            { clientId: client.id },
            { session, new: true }
          )
          .select("clientId");
        return {
          updatedClient: clientInTransaction,
          updatedAppUser: userInTransaction
        };
      }
    );

    if (updatedClient && updatedAppUser) {
      const affectedRobotIds =
        await getRobotIdsForOperatorClientSnapshot(operatorId);

      // ✅ UPDATE SNAPSHOTS: Update clientSnapshot on robots where this operator is assigned
      // This ensures Master Data shows correct client immediately without waiting for check-in
      // PERFORMANCE: This is on the write path (operator assignment), not read path (Master Data query)
      // Write operations are infrequent compared to reads, so this doesn't impact performance
      try {
        const clientSnapshot = {
          id: client.id,
          name: client.name,
          location: client.location,
          operatingHours: client.operatingHours
        };

        // Build operator snapshot for robots that need it
        const operatorSnapshot = {
          id: operator.id,
          name: operator.name,
          phoneNumber: operator.phoneNumber,
          checkedInToday: false,
          lastCheckInTime: undefined
        };

        // Update robots where this operator is assigned
        // Strategy: Update both activeOperator robots AND robots in appUsers array
        const robotUpdateResult = await robotModel.updateMany(
          {
            $or: [
              { activeOperator: operatorId }, // If already active
              { appUsers: operatorId, activeOperator: { $exists: false } } // If assigned but no active operator set
            ]
          },
          {
            $set: {
              clientSnapshot,
              operatorSnapshot,
              // Auto-set as activeOperator if not already set
              activeOperator: operatorId
            }
          }
        );

        if (robotUpdateResult.modifiedCount > 0) {
          logger.info(
            `Updated clientSnapshot on ${robotUpdateResult.modifiedCount} robots after assigning operator ${operatorId} to client ${clientId}`
          );
        } else {
          logger.warn(
            `No robots updated for operator ${operatorId} - operator may not be assigned to any robots yet`
          );
        }
      } catch (error) {
        // Log error but don't fail the request - snapshot will be fixed on next check-in
        logger.error(
          `Failed to update robot snapshots after adding operator to client: ${error}`
        );
      }

      // ✅ INVALIDATE MASTER DATA CACHE
      // Operator-client assignment affects master data display
      await refreshRobotOperationalCache(affectedRobotIds, [
        "staffing",
        "cycle"
      ]);

      await masterDataCacheService.invalidateCache(
        `operator ${operatorId} assigned to client ${clientId}`
      );

      res.status(200).json({
        updatedClient,
        updatedAppUser
      });
    } else {
      res.status(400);
      throw new Error("Unable to add operator to the client");
    }
  }
);

/**
 * Remove a user from client
 * @access Private
 * @param req - Request with userEmail in JSON
 * @param res - Response
 * @returns updated client details
 *
 *
 */

export const moveOperatorBetweenClients = asyncHandler(
  async (req: Request, res: Response) => {
    const { toClientId, operatorId } = req.body;

    if (!toClientId || !operatorId) {
      res.status(400);
      throw new Error("Missing request paramters");
    }

    const operator = await appUserModel.findById(operatorId);
    if (!operator) {
      res.status(404);
      throw new Error("Operator not found");
    }
    // Allow inactive operators to be moved between clients
    // Removed isActive check to support operators on leave or temporarily inactive

    const toClient = await clientModel.findById(toClientId);
    if (!toClient) {
      res.status(404);
      throw new Error("Client not found");
    }

    const { currentClient, newClient, updatedOperator } =
      await runInTransaction(async (session) => {
        const currentClientInTransaction = await clientModel
          .findByIdAndUpdate(
            operator.clientId,
            { $pull: { appUsers: operator.id } },
            { session, new: true }
          )
          .select("appUsers");
        const newClientInTransaction = await clientModel
          .findByIdAndUpdate(
            toClient.id,
            { $addToSet: { appUsers: operator.id } },
            { session, new: true }
          )
          .select("appUsers");

        const userInTransaction = await appUserModel
          .findByIdAndUpdate(
            operatorId,
            { clientId: toClient.id },
            { session, new: true }
          )
          .select("clientId");
        return {
          currentClient: currentClientInTransaction,
          newClient: newClientInTransaction,
          updatedOperator: userInTransaction
        };
      });

    if (currentClient && newClient && updatedOperator) {
      // ✅ UPDATE SNAPSHOTS: Update clientSnapshot on robots where this operator is assigned
      // When operator moves between clients, robots need to show the new client
      // PERFORMANCE: This is on the write path (operator reassignment), not read path
      try {
        const newClientSnapshot = {
          id: toClient.id,
          name: toClient.name,
          location: toClient.location,
          operatingHours: toClient.operatingHours
        };

        // Update robots where this operator is assigned (active or in appUsers)
        const robotUpdateResult = await robotModel.updateMany(
          {
            $or: [
              { activeOperator: operatorId },
              { appUsers: operatorId, activeOperator: { $exists: false } }
            ]
          },
          { $set: { clientSnapshot: newClientSnapshot } }
        );

        if (robotUpdateResult.modifiedCount > 0) {
          logger.info(
            `Updated clientSnapshot on ${robotUpdateResult.modifiedCount} robots after moving operator ${operatorId} from client ${operator.clientId} to ${toClientId}`
          );
        } else {
          logger.warn(
            `No robots updated when moving operator ${operatorId} between clients`
          );
        }
      } catch (error) {
        // Log error but don't fail the request - snapshot will be fixed on next check-in
        logger.error(
          `Failed to update robot snapshots after moving operator between clients: ${error}`
        );
      }

      // ✅ INVALIDATE MASTER DATA CACHE
      // Operator moved between clients - affects master data display
      await masterDataCacheService.invalidateCache(
        `operator ${operatorId} moved from client ${operator.clientId} to ${toClientId}`
      );

      res.json({
        message: `${operator.name} was successfully moved to ${toClient.name}`
      });
    } else {
      res.status(400);
      throw new Error("Unable to remove user from the client");
    }
  }
);

export const removeAppUserFromClient = asyncHandler(
  async (req: Request, res: Response) => {
    const { clientId, operatorId }: { clientId: string; operatorId: string } =
      req.body;
    if (!operatorId || !clientId) {
      res.status(400);
      throw new Error("Missing required request body parameters.");
    }
    if (!req.user) {
      res.status(404);
      throw new Error("User not found");
    }
    const client = await clientModel.findById(clientId).populate("users");
    if (!client) {
      res.status(404);
      throw new Error("No client found");
    }

    const user = await appUserModel.findById(operatorId);
    if (!user) {
      res.status(404);
      throw new Error("No User found");
    }
    const { updatedClient, updatedAppUser } = await runInTransaction(
      async (session) => {
        const clientInTransaction = await clientModel
          .findByIdAndUpdate(
            client.id,
            { $pull: { appUsers: user.id } },
            { session, new: true }
          )
          .select("appUsers");
        const userInTransaction = await appUserModel
          .findByIdAndUpdate(
            user.id,
            { $unset: { clientId: 1 } },
            { session, new: true }
          )
          .select("clientId");
        return {
          updatedClient: clientInTransaction,
          updatedAppUser: userInTransaction
        };
      }
    );

    if (updatedClient && updatedAppUser) {
      const affectedRobotIds =
        await getRobotIdsForOperatorClientSnapshot(operatorId);

      // ✅ UPDATE SNAPSHOTS: Clear clientSnapshot on robots where this operator is assigned
      // When operator is removed from client, robots should no longer show client association
      // PERFORMANCE: This is on the write path (operator removal), not read path
      try {
        // Clear clientSnapshot for robots where this operator is assigned
        // Strategy: Handle both robots with activeOperator AND robots in appUsers without activeOperator
        const robotUpdateResult = await robotModel.updateMany(
          {
            $or: [
              { activeOperator: operatorId }, // If already active
              { appUsers: operatorId, activeOperator: { $exists: false } } // If assigned but no active operator set
            ]
          },
          {
            $unset: {
              clientSnapshot: "",
              operatorSnapshot: "",
              activeOperator: ""
            }
          }
        );

        if (robotUpdateResult.modifiedCount > 0) {
          logger.info(
            `Cleared clientSnapshot on ${robotUpdateResult.modifiedCount} robots after removing operator ${operatorId} from client ${clientId}`
          );
        }
      } catch (error) {
        // Log error but don't fail the request - snapshot will be fixed on next check-in
        logger.error(
          `Failed to update robot snapshots after removing operator from client: ${error}`
        );
      }

      // ✅ INVALIDATE MASTER DATA CACHE
      // Operator removed from client - affects master data display
      await refreshRobotOperationalCache(affectedRobotIds, [
        "staffing",
        "cycle"
      ]);

      await masterDataCacheService.invalidateCache(
        `operator ${operatorId} removed from client ${clientId}`
      );

      res.status(200).json({
        updatedClient,
        updatedAppUser
      });
    } else {
      res.status(400);
      throw new Error("Unable to remove user from the client");
    }
  }
);

export const addMaterialsToClient = asyncHandler(async (req, res) => {
  const { materialIds, clientId }: { materialIds: string[]; clientId: string } =
    req.body;

  if (!materialIds.length || !clientId) {
    res.status(400);
    throw new Error("Missing required request parameters");
  }

  const client = await clientModel.findById(clientId);

  if (!client) {
    res.status(404);
    throw new Error("Client not found");
  }

  const clientMaterials = client?.materials || [];

  let exists = false;
  clientMaterials.forEach((id) => {
    if (materialIds.includes(id.toString())) {
      exists = true;
    }
  });

  if (exists) {
    res.status(400);
    throw new Error("Material already added to client");
  }

  const promiseArray = materialIds.map(async (materialId: string) => {
    const material = await materialModel.findById(materialId);
    if (!material) {
      res.status(404);
      throw new Error("Material not found");
    }
  });
  await Promise.all(promiseArray);

  const response = await clientModel.findByIdAndUpdate(
    clientId,
    {
      $push: {
        materials: {
          $each: materialIds
        }
      }
    },
    { new: true }
  );

  if (response) {
    res.status(201).json(response);
  } else {
    res.status(400);
    throw new Error(
      "Unable to add materials to client, Please try again later"
    );
  }
});

export const removeMaterialFromClient = asyncHandler(async (req, res) => {
  const { materialId, clientId }: { materialId: string; clientId: string } =
    req.body;

  if (!materialId || !clientId) {
    res.status(400);
    throw new Error("Missing required request parameters");
  }

  const updatedClient = await clientModel.findByIdAndUpdate(
    clientId,
    {
      $pull: {
        materials: materialId
      }
    },
    { new: true }
  );

  if (updatedClient) {
    res.status(201).json(updatedClient);
  } else {
    res.status(400);
    throw new Error(
      "Unable to add materials to client, Please try again later"
    );
  }
});

/**
 * Update Client Location
 * @access Private
 * @param req - Request with clientID
 * @param res - Response
 * @returns updated client details
 *
 *
 */

export const updateLocation = asyncHandler(
  async (req: Request, res: Response) => {
    const { clientId, latLng }: { clientId: string; latLng: LatLng } = req.body;
    if (!clientId || !latLng) {
      res.status(400);
      throw new Error("Missing required request body parameters.");
    }

    const updatedClient = await clientModel.findByIdAndUpdate(clientId, {
      location: latLng
    });
    if (!updatedClient) {
      res.status(404);
      throw new Error("No client found");
    }

    if (updatedClient) {
      res.status(200).json(updatedClient);
    } else {
      res.status(400);
      throw new Error("Unable to remove user from the client");
    }
  }
);

export const updateClientStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (!id || isActive === undefined) {
    res.status(400);
    throw new Error("Missing required request parameters");
  }

  const client = await clientModel.findById(id);

  if (!client) {
    res.status(404);
    throw new Error("Client not found");
  }
  if (client.appUsers?.length !== 0) {
    res.status(404);
    throw new Error("Client has operators assigned");
  }

  if (client.materials?.length !== 0) {
    res.status(404);
    throw new Error("Client has materials assigned");
  }

  const response = await clientModel.findByIdAndUpdate(id, {
    isActive
  });

  if (response) {
    res.status(200).json({
      message: "Client status updated successfully!"
    });
  } else {
    res.status(400);
    throw new Error("Error updating client status");
  }
});

/**
 * Validate multiple client IDs
 * @access Private
 * @param req - Request with clientIds array in body
 * @param res - Response
 * @returns validation results
 */
export const validateClientIds = asyncHandler(async (req, res) => {
  const { clientIds }: { clientIds: string[] } = req.body;

  if (!clientIds || !Array.isArray(clientIds)) {
    res.status(400);
    throw new Error("clientIds array is required");
  }

  const { user } = req;
  if (!user) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  const results = await Promise.all(
    clientIds.map(async (clientId) => {
      try {
        const client = await clientModel.findById(clientId);
        if (!client) {
          return { clientId, valid: false, reason: "not_found" };
        }

        // Check user access
        const hasAccess = user.clients.some(
          (c: any) => c.toString() === clientId
        );
        if (!hasAccess) {
          return { clientId, valid: false, reason: "unauthorized" };
        }

        return { clientId, valid: true };
      } catch (error) {
        return { clientId, valid: false, reason: "error" };
      }
    })
  );

  const valid = results.filter((r) => r.valid).map((r) => r.clientId);
  const invalid = results.filter((r) => !r.valid);

  res.json({
    valid,
    invalid,
    summary: {
      total: clientIds.length,
      validCount: valid.length,
      invalidCount: invalid.length
    }
  });
});
