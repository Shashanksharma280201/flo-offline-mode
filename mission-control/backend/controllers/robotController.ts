import {
  IoTClient,
  CreateTopicRuleCommand,
  ReplaceTopicRuleCommand,
  DeleteTopicRuleCommand
} from "@aws-sdk/client-iot"; // ES Modules import
import { Response, Request } from "express";
import asyncHandler from "express-async-handler";
import { v4 as uuidv4 } from "uuid";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import bcrypt from "bcryptjs";

import { ObjectId } from "mongoose";
import robotModel, { Robot } from "../models/robotModel";
import { Billing } from "../models/billingModel";
import userModel from "../models/userModel";
import { dateDiffInDays } from "../utils/date";
import logger from "../utils/logger";
import { generateRobotToken } from "../services/jsonWebToken";
import { redisClient } from "../services/redis";
import fleetModel from "../models/fleetModel";
import { s3Client } from "../services/aws";
import { runInTransaction } from "../services/mongodb";
import appUserModel from "../models/appUserModel";
import appDataModel from "../models/appDataModel";
import issueModel from "../models/issueModel";
import { MqttClientConnection } from "../mqtt/mqttClientConnection";
import { masterDataCacheService } from "../services/masterDataCacheService";
import { robotMasterDataService } from "../services/robotMasterDataService";
import QCSubmission from "../models/qcSubmissionModel";
import Shipment from "../models/shipmentModel";
import InventoryItem from "../models/inventoryItemModel";
import { refreshRobotOperationalSnapshots } from "../services/robotOperationalSnapshotService";

const ALL_OPERATIONAL_SNAPSHOT_SECTIONS: Array<
  "maintenance" | "bom" | "staffing" | "cycle"
> = ["maintenance", "bom", "staffing", "cycle"];

/**
 * Refresh specific operational snapshot sections for the affected robots.
 *
 * @param robotIds - Robot IDs whose operational snapshot cache should be updated
 * @param sections - Snapshot sections that should be recalculated
 */
const refreshRobotOperationalCache = async (
  robotIds: string[],
  sections: Array<"maintenance" | "bom" | "staffing" | "cycle">
): Promise<void> => {
  const uniqueRobotIds = [...new Set(robotIds.filter(Boolean))];

  if (uniqueRobotIds.length === 0) {
    return;
  }

  await refreshRobotOperationalSnapshots(uniqueRobotIds, sections);
};

/**
 * Create a robot
 * @access Private
 * @param req - Request with deviceId (phoneNumber of robot), Password, name, owner (userId) in JSON
 * @param res - Response
 * @returns created robot details
 *
 *
 */
const client = new IoTClient({
  region: "ap-south-1"
});
export const createRobot = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    password,
    desc,
    owner,
    fleetId,
    robotType,
    macAddress,
    maintenance
  }: {
    password: string;
    name: string;
    desc: string;
    owner: string;
    fleetId: string;
    robotType: "autonomous" | "manual";
    macAddress?: string;
    maintenance?: {
      schedule: number[];
      lastMaintenance: number;
    };
  } = req.body;

  if (!name || !owner || !password || !desc || !robotType) {
    res.status(400);
    throw new Error("Missing required request body parameters");
  }

  // Validate robotType and macAddress combination
  if (robotType === "manual" && !macAddress) {
    res.status(400);
    throw new Error(
      "MAC Address is required for manual robots (for live data dashboard)"
    );
  }

  if (robotType === "autonomous" && macAddress) {
    res.status(400);
    throw new Error("Autonomous robots cannot have a MAC Address");
  }

  const user = await userModel.findById(owner).select("-password -role");
  if (!user) {
    res.status(404);
    throw new Error("User does not exist");
  }

  const adminIds = await userModel.distinct("_id", { role: "admin" }) as string[];
  const consolidatedUserIds = Array.from(new Set([user.id, ...adminIds]));

  // Fleet validation is now handled during consumption logic below

  // Validate robot name format: MMR-{Number}[optional text]
  const robotNameRegex = /^MMR-\d+/;
  if (!robotNameRegex.test(name)) {
    res.status(400);
    throw new Error(
      "Robot name must be in the format 'MMR-{Number}' followed by any optional text"
    );
  }

  // Check if robot name already exists globally
  const existingRobotByName = await robotModel.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") }
  });
  if (existingRobotByName) {
    res.status(400);
    throw new Error("A robot with this name already exists");
  }

  // Normalize MAC address (uppercase, trim, remove colons/dashes)
  const normalizedMacAddress = macAddress
    ? macAddress.trim().toUpperCase().replace(/[:-]/g, "")
    : undefined;

  // Fetch Fleet if provided
  let fleet: any = null;

  if (fleetId) {
    fleet = await fleetModel.findById(fleetId);
    if (!fleet) {
      res.status(404);
      throw new Error("Fleet specified by user does not exist");
    }
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const id = uuidv4();

  const currentDate = new Date(Date.now());
  const dueDate = currentDate.setDate(currentDate.getDate() + 365);

  // Execute Transaction
  const { newRobot, updatedUser } = await runInTransaction(async (session) => {
    // 1. Prepare Robot Data
    const fleetSnapshot = fleet
      ? {
          id: fleet.id,
          name: fleet.name,
          prefix: fleet.prefix,
          modelVersion: fleet.modelVersion,
          qcTemplateId: fleet.qcTemplateId
            ? fleet.qcTemplateId.toString()
            : undefined
        }
      : undefined;

    const manufacturingData = {
      manufacturingStatus: "created",
      statusHistory: [
        {
          status: "created",
          changedAt: new Date(),
          changedBy: owner
        }
      ],
      partsConsumed: []
    };

    // 2. Create Robot
    const [robotInTransaction] = await robotModel.create(
      [
        {
          _id: id,
          robotType,
          password: hashedPassword,
          fleet: fleetId,
          fleetSnapshot, // Add snapshot
          manufacturingData, // Add mfg data
          macAddress: normalizedMacAddress,
          name,
          desc,
          owner,
          users: consolidatedUserIds,
          access: false,
          maintenance,
          expiry: dueDate
        }
      ],
      { session }
    );

    const userInTransaction = await userModel.updateMany(
      { _id: { $in: consolidatedUserIds } },
      { $addToSet: { robots: id } },
      { session }
    );

    return {
      newRobot: robotInTransaction,
      updatedUser: userInTransaction
    };
  });

  // Only setup MQTT streaming for manual robots (they need live data dashboard)
  if (newRobot.robotType === "manual" && newRobot.macAddress) {
    const input = {
      ruleName: `mmr_${newRobot.id.replaceAll("-", "_")}`,
      topicRulePayload: {
        sql: `SELECT '${newRobot.id}' AS botId,(timestamp() / 1000) AS epochTime,  * FROM 'mmr/publish/${newRobot.macAddress}'`,
        actions: [
          {
            firehose: {
              roleArn: "arn:aws:iam::357437884226:role/firehose-put",
              deliveryStreamName: "mmr_firehouse",
              separator: "\n",
              batchMode: false
            }
          }
        ]
      }
    };
    try {
      const command = new CreateTopicRuleCommand(input);
      await client.send(command);
      await MqttClientConnection.beginStream(newRobot.macAddress, newRobot);
    } catch (err) {
      logger.error(err);
    }
  }

  if (newRobot && updatedUser) {
    await refreshRobotOperationalCache(
      [newRobot.id],
      ALL_OPERATIONAL_SNAPSHOT_SECTIONS
    );

    // ✅ INVALIDATE MASTER DATA CACHE
    await masterDataCacheService.invalidateCache(
      `robot created: ${newRobot.id}`
    );

    res.status(201).json(newRobot);
  } else {
    res.status(400);
    throw new Error("Robot creation failed");
  }
});

/**
 * Create a robot with BOM verification and inventory deduction
 * @access Private
 * @param req - Request with robot data and BOM verification array
 * @param res - Response
 * @returns created robot with BOM status and inventory deduction details
 */
export const createRobotWithBOM = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotData, bomVerification } = req.body;

    // Validate request structure
    if (!robotData || !bomVerification) {
      res.status(400);
      throw new Error("Missing robotData or bomVerification");
    }

    const {
      name,
      password,
      desc,
      owner,
      fleetId,
      robotType,
      macAddress,
      maintenance
    } = robotData;

    // Same validations as createRobot
    if (!name || !owner || !password || !desc || !robotType) {
      res.status(400);
      throw new Error("Missing required robot data parameters");
    }

    // Fleet is REQUIRED for BOM verification
    if (!fleetId) {
      res.status(400);
      throw new Error("Fleet is required for BOM verification");
    }

    // Validate robotType and macAddress combination
    if (robotType === "manual" && !macAddress) {
      res.status(400);
      throw new Error("MAC Address is required for manual robots");
    }

    if (robotType === "autonomous" && macAddress) {
      res.status(400);
      throw new Error("Autonomous robots cannot have a MAC Address");
    }

    // Validate robot name format
    const robotNameRegex = /^MMR-\d+/;
    if (!robotNameRegex.test(name)) {
      res.status(400);
      throw new Error(
        "Robot name must be in the format 'MMR-{Number}' followed by any optional text"
      );
    }

    // Check duplicate name
    const existingRobotByName = await robotModel.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") }
    });
    if (existingRobotByName) {
      res.status(400);
      throw new Error("A robot with this name already exists");
    }

    // Verify owner exists
    const user = await userModel.findById(owner).select("-password -role");
    if (!user) {
      res.status(404);
      throw new Error("User does not exist");
    }

    const adminIds = await userModel.distinct("_id", { role: "admin" }) as string[];
    const consolidatedUserIds = Array.from(new Set([user.id, ...adminIds]));

    // Fetch Fleet
    const fleet = await fleetModel.findById(fleetId);
    if (!fleet) {
      res.status(404);
      throw new Error("Fleet not found");
    }

    // Validate BOM: Check that bomVerification matches fleet parts
    const fleetElectrical = fleet.partsConsumption?.electrical || [];
    const fleetMechanical = fleet.partsConsumption?.mechanical || [];
    const allFleetParts = [...fleetElectrical, ...fleetMechanical];

    // Insufficient parts tracking
    const insufficientParts: any[] = [];
    const inventoryDeductions: any[] = [];
    const warnings: any[] = [];
    // NEW: Track inventory status for each part
    const partInventoryStatus = new Map<string, 'sufficient' | 'insufficient' | 'external'>();

    // Validate each part in BOM verification
    for (const part of bomVerification) {
      if (!part.itemId || !part.quantity || !part.source) {
        res.status(400);
        throw new Error(
          `Invalid part data: itemId, quantity, and source are required`
        );
      }

      // Only check inventory for "Flo" parts
      if (part.source === "Flo") {
        const inventoryItem = await InventoryItem.findOne({
          itemId: part.itemId.toUpperCase()
        });

        if (!inventoryItem) {
          res.status(404);
          throw new Error(`Inventory item not found: ${part.itemId}`);
        }

        // Check if sufficient quantity
        if (inventoryItem.quantity < part.quantity) {
          insufficientParts.push({
            itemId: part.itemId,
            name: part.name,
            required: part.quantity,
            available: inventoryItem.quantity,
            shortfall: part.quantity - inventoryItem.quantity
          });
          // Mark as insufficient
          partInventoryStatus.set(part.itemId.toUpperCase(), 'insufficient');
        } else {
          // Track for deduction
          inventoryDeductions.push({
            itemId: part.itemId,
            name: part.name,
            quantity: part.quantity,
            remainingAfterDeduction: inventoryItem.quantity - part.quantity
          });
          // Mark as sufficient
          partInventoryStatus.set(part.itemId.toUpperCase(), 'sufficient');

          // Warn if low stock (below 10% threshold or less than 5 units)
          const remainingStock = inventoryItem.quantity - part.quantity;
          if (remainingStock < 5 || remainingStock < inventoryItem.quantity * 0.1) {
            warnings.push({
              itemId: part.itemId,
              name: part.name,
              message: `Low stock after deduction: ${remainingStock} units remaining`
            });
          }
        }
      } else {
        // GKX or Abhirup - external source
        partInventoryStatus.set(part.itemId.toUpperCase(), 'external');
      }
    }

    // Determine BOM completion status based on inventory availability
    // Set to 'incomplete' if any Flo parts have insufficient inventory
    const bomComplete = insufficientParts.length === 0;

    logger.info(`BOM Verification for robot ${name}:`);
    logger.info(`- Total parts: ${bomVerification.length}`);
    logger.info(`- Insufficient parts: ${insufficientParts.length}`);
    logger.info(`- Parts to deduct: ${inventoryDeductions.length}`);
    logger.info(`- BOM Complete: ${bomComplete}`);
    logger.info(`- BOM Status will be set to: ${bomComplete ? "complete" : "incomplete"}`);

    // Normalize MAC address
    const normalizedMacAddress = macAddress
      ? macAddress.trim().toUpperCase().replace(/[:-]/g, "")
      : undefined;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const id = uuidv4();

    const currentDate = new Date(Date.now());
    const dueDate = currentDate.setDate(currentDate.getDate() + 365);

    // Execute Transaction: Create robot + Deduct inventory
    const { newRobot, updatedUser } = await runInTransaction(
      async (session) => {
        // Prepare fleet snapshot
        const fleetSnapshot = {
          id: fleet.id,
          name: fleet.name,
          prefix: fleet.prefix,
          modelVersion: fleet.modelVersion,
          qcTemplateId: fleet.qcTemplateId
            ? fleet.qcTemplateId.toString()
            : undefined
        };

        // Prepare parts consumed with source info
        const partsConsumed = bomVerification.map((part: any) => ({
          itemId: part.itemId.toUpperCase(),
          name: part.name,
          quantity: part.quantity,
          unit: part.unit || "pcs",
          source: part.source,
          inventoryStatus: partInventoryStatus.get(part.itemId.toUpperCase()) || 'external',
          consumedAt: new Date(),
          consumedBy: owner,
          purpose: part.purpose
        }));

        // Manufacturing data with BOM status
        const manufacturingData = {
          manufacturingStatus: "created",
          statusHistory: [
            {
              status: "created",
              changedAt: new Date(),
              changedBy: owner
            }
          ],
          partsConsumed,
          bomCompletionStatus: bomComplete ? "complete" : "incomplete"
        };

        // Create Robot
        const [robotInTransaction] = await robotModel.create(
          [
            {
              _id: id,
              robotType,
              password: hashedPassword,
              fleet: fleetId,
              fleetSnapshot,
              manufacturingData,
            macAddress: normalizedMacAddress,
            name,
            desc,
            owner,
            users: consolidatedUserIds,
            access: false,
            maintenance,
            expiry: dueDate
          }
        ],
          { session }
        );

        // Deduct inventory for ALL sufficient parts (even if some other parts are insufficient)
        // Parts are physically consumed during robot creation, so we deduct them immediately
        // Insufficient parts will be handled later via "Update BOM Inventory" button
        if (inventoryDeductions.length > 0) {
          logger.info(`Deducting ${inventoryDeductions.length} sufficient parts for robot ${name}`);
          for (const deduction of inventoryDeductions) {
            // Fetch current inventory to get previousQty for transaction history
            const inventoryItem = await InventoryItem.findOne({
              itemId: deduction.itemId.toUpperCase()
            }).session(session);

            if (inventoryItem) {
              const previousQty = inventoryItem.quantity;
              const newQty = previousQty - deduction.quantity;

              // Deduct inventory and add transaction history
              await InventoryItem.findOneAndUpdate(
                { itemId: deduction.itemId.toUpperCase() },
                {
                  $inc: { quantity: -deduction.quantity },
                  $push: {
                    transactions: {
                      type: "remove",
                      quantity: deduction.quantity,
                      previousQty: previousQty,
                      newQty: newQty,
                      date: new Date(),
                      performedBy: owner,
                      notes: `Used for robot ${name}`
                    }
                  }
                },
                { session }
              );

              logger.info(`Deducted ${deduction.quantity} units of ${deduction.itemId} (${deduction.name})`);
            }
          }
        }

        // Log BOM status
        if (bomComplete) {
          logger.info(`All Flo parts have sufficient inventory. BOM is COMPLETE.`);
        } else {
          logger.warn(`Some Flo parts have insufficient inventory (${insufficientParts.length} parts). BOM marked as INCOMPLETE.`);
        }

        // Update user
        const userInTransaction = await userModel.updateMany(
          { _id: { $in: consolidatedUserIds } },
          { $addToSet: { robots: id } },
          { session }
        );

        return {
          newRobot: robotInTransaction,
          updatedUser: userInTransaction
        };
      }
    );

    // Setup MQTT for manual robots
    if (newRobot.robotType === "manual" && newRobot.macAddress) {
      const input = {
        ruleName: `mmr_${newRobot.id.replaceAll("-", "_")}`,
        topicRulePayload: {
          sql: `SELECT '${newRobot.id}' AS botId,(timestamp() / 1000) AS epochTime,  * FROM 'mmr/publish/${newRobot.macAddress}'`,
          actions: [
            {
              firehose: {
                roleArn: "arn:aws:iam::357437884226:role/firehose-put",
                deliveryStreamName: "mmr_firehouse",
                separator: "\n",
                batchMode: false
              }
            }
          ]
        }
      };
      try {
        const command = new CreateTopicRuleCommand(input);
        await client.send(command);
        await MqttClientConnection.beginStream(newRobot.macAddress, newRobot);
      } catch (err) {
        logger.error(err);
      }
    }

    if (newRobot && updatedUser) {
      await refreshRobotOperationalCache(
        [newRobot.id],
        ALL_OPERATIONAL_SNAPSHOT_SECTIONS
      );

      // Invalidate cache
      await masterDataCacheService.invalidateCache(
        `robot created with BOM: ${newRobot.id}`
      );

      logger.info(
        `Robot ${newRobot.name} created with BOM verification. Status: ${bomComplete ? "complete" : "incomplete"}`
      );

      res.status(201).json({
        success: true,
        robot: newRobot,
        bomStatus: bomComplete ? "complete" : "incomplete",
        inventoryDeductions,
        warnings
      });
    } else {
      res.status(400);
      throw new Error("Robot creation with BOM failed");
    }
  }
);

export const updateRobot = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    desc,
    robotId,
    robotType,
    macAddress,
    fleetId,
    maintenance
  }: {
    name: string;
    desc: string;
    robotId: string;
    robotType?: "autonomous" | "manual";
    fleetId: string;
    macAddress?: string;
    maintenance: {
      schedule: number[];
      lastMaintenance: number;
    };
  } = req.body;

  if (!robotId) {
    res.status(400);
    throw new Error("Missing request parameters");
  }
  const robot = await robotModel.findById(robotId);
  if (!robot) {
    res.status(404);
    throw new Error("No robot found for the specified Id");
  }

  // Validate robotType and macAddress combination if robotType is being updated
  if (robotType) {
    if (robotType === "manual" && !macAddress && !robot.macAddress) {
      res.status(400);
      throw new Error(
        "MAC Address is required for manual robots (for live data dashboard)"
      );
    }
    if (robotType === "autonomous" && (macAddress || robot.macAddress)) {
      res.status(400);
      throw new Error(
        "Autonomous robots cannot have a MAC Address. Please remove the MAC address first."
      );
    }
  }

  // Validate properties if they are being updated
  if (name) {
    // Validate robot name format
    const robotNameRegex = /^MMR-\d+/;
    if (!robotNameRegex.test(name)) {
      res.status(400);
      throw new Error(
        "Robot name must be in the format 'MMR-{Number}' followed by any optional text"
      );
    }

    // Check for duplicate name (excluding current robot)
    const existingRobotByName = await robotModel.findOne({
      _id: { $ne: robotId },
      name: { $regex: new RegExp(`^${name}$`, "i") }
    });
    if (existingRobotByName) {
      res.status(400);
      throw new Error("A robot with this name already exists");
    }
  }

  // Normalize MAC address (uppercase, trim, remove colons/dashes)
  const normalizedMacAddress = macAddress
    ? macAddress.trim().toUpperCase().replace(/[:-]/g, "")
    : undefined;

  // Build fleet snapshot if fleet is being assigned
  let fleetSnapshot = undefined;
  if (fleetId) {
    const fleet = await fleetModel.findById(fleetId).select("id name prefix");
    if (fleet) {
      fleetSnapshot = {
        id: fleet.id,
        name: fleet.name,
        prefix: fleet.prefix
      };
    }
  }

  const updatedRobot = await robotModel
    .findByIdAndUpdate(
      robotId,
      {
        ...(name && { name }),
        ...(desc && { desc }),
        ...(robotType && { robotType }),
        ...(maintenance && { maintenance }),
        ...(fleetId && { fleet: fleetId }),
        ...(fleetSnapshot && { fleetSnapshot }),
        ...(normalizedMacAddress !== undefined && {
          macAddress: normalizedMacAddress
        })
      },
      { new: true }
    )
    .populate({ path: "users", select: "email" });

  try {
    if (normalizedMacAddress && updatedRobot) {
      // Normalize old MAC address for comparison
      const oldNormalizedMac = robot.macAddress
        ? robot.macAddress.trim().toUpperCase().replace(/[:-]/g, "")
        : undefined;

      // Check if MAC address has actually changed (compare normalized values)
      if (oldNormalizedMac && normalizedMacAddress !== oldNormalizedMac) {
        logger.info(
          `MAC address changed for robot ${robot.id}: ${oldNormalizedMac} -> ${normalizedMacAddress}`
        );
        await MqttClientConnection.removeStream(oldNormalizedMac);
      }

      const input = {
        ruleName: `mmr_${robot.id.replaceAll("-", "_")}`,
        topicRulePayload: {
          sql: `SELECT '${robot.id}' AS botId,(timestamp() / 1000) AS epochTime,  * FROM 'mmr/publish/${normalizedMacAddress}'`,
          actions: [
            {
              firehose: {
                roleArn: "arn:aws:iam::357437884226:role/firehose-put",
                deliveryStreamName: "mmr_firehouse",
                separator: "\n",
                batchMode: false
              }
            }
          ]
        }
      };

      if (!robot.macAddress) {
        // No previous MAC address - create new AWS IoT Rule
        const command = new CreateTopicRuleCommand(input);
        await client.send(command);
      } else if (
        oldNormalizedMac &&
        normalizedMacAddress !== oldNormalizedMac
      ) {
        // MAC address changed - replace AWS IoT Rule
        const command = new ReplaceTopicRuleCommand(input);
        await client.send(command);
      }
      // Subscribe to MQTT topic with normalized MAC address
      await MqttClientConnection.beginStream(
        normalizedMacAddress,
        updatedRobot as unknown as Robot
      );
    } else if (robot.macAddress) {
      // MAC address removed - delete AWS IoT Rule and MQTT subscription
      const command = new DeleteTopicRuleCommand({
        ruleName: `mmr_${robot.id.replaceAll("-", "_")}`
      });
      await client.send(command);

      // Normalize MAC address before removing stream
      const oldNormalizedMac = robot.macAddress
        .trim()
        .toUpperCase()
        .replace(/[:-]/g, "");
      await MqttClientConnection.removeStream(oldNormalizedMac);
    }
  } catch (err) {
    logger.error(err);
  }

  if (updatedRobot) {
    if (maintenance?.lastMaintenance !== undefined) {
      await refreshRobotOperationalCache([robotId], ["maintenance"]);
    }

    // ✅ INVALIDATE MASTER DATA CACHE
    await masterDataCacheService.invalidateCache(`robot updated: ${robotId}`);

    res.json({ message: "Robot updated successfully" });
  } else {
    res.status(500);
    throw new Error("Error updating robot");
  }
});

/**
 * Delete a robot
 * @access Private
 * @param req - Request with robotId
 * @param res - Response
 * @returns Success Response
 *
 *
 */
export const deleteRobot = asyncHandler(async (req: Request, res: Response) => {
  const {
    robotId
  }: {
    robotId: string;
  } = req.body;

  if (!robotId) {
    res.status(400);
    throw new Error("Missing required request body parameters");
  }
  const robot = await robotModel.findById(robotId).populate({
    path: "users",
    select: "id"
  });
  if (!robot) {
    res.status(404);
    throw new Error("No robot found for the specified Id");
  }

  const { deletedRobot } = await runInTransaction(async (session) => {
    if (robot.users && robot.users.length > 0) {
      await Promise.all(
        robot.users?.map(async (user) => {
          const userInTransaction = await userModel
            .findByIdAndUpdate(
              user.id,
              { $pull: { robots: robotId } },
              { session, new: true }
            )
            .select("robots");

          return userInTransaction;
        })
      );
    }
    if (robot.appUsers && robot.appUsers.length > 0) {
      await Promise.all(
        robot.appUsers?.map(async (appUser) => {
          const appUserInTransaction = await appUserModel
            .findByIdAndUpdate(
              appUser.id,
              { $pull: { robots: robotId } },
              { session, new: true }
            )
            .select("robots");

          return appUserInTransaction;
        })
      );
    }
    const robotInTransaction = await robotModel.findByIdAndDelete(robotId, {
      session
    });
    return {
      deletedRobot: robotInTransaction
    };
  });

  if (deletedRobot) {
    // ✅ INVALIDATE MASTER DATA CACHE
    await masterDataCacheService.invalidateCache(`robot deleted: ${robotId}`);

    res.status(200).json(deletedRobot);
  } else {
    res.status(400);
    throw new Error("Robot creation failed");
  }
});

export const getRobots = asyncHandler(async (req, res) => {
  const { robots } = req.user as {
    robots: string[];
  };

  // ✅ OPTIMIZED: Single query using $in and pre-stored openIssuesCount
  // No more N separate queries to issueModel - uses snapshot field updated on issue raise/close
  const allRobots = await robotModel
    .find({ _id: { $in: robots } })
    .select("id name appUsers openIssuesCount manufacturingData.bomCompletionStatus")
    .lean();

  if (!allRobots) {
    res.status(400);
    throw new Error("User does not have access to the robot");
  }

  // Query for recent open issues (past 2 days) - for Issue badge display
  // Only show Issue status for issues raised within the past 2 days
  const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const robotIds = allRobots.map((r) => r._id);

  let recentIssuesCounts: Map<string, number> = new Map();
  try {
    const recentIssuesAggr = await issueModel.aggregate([
      {
        $match: {
          robot: { $in: robotIds },
          status: "open",
          raisedOnTimestamp: { $gte: twoDaysAgo }
        }
      },
      {
        $group: {
          _id: "$robot",
          count: { $sum: 1 }
        }
      }
    ]);

    // Create a map for quick lookup
    recentIssuesAggr.forEach((item: { _id: string; count: number }) => {
      recentIssuesCounts.set(item._id, item.count);
    });
  } catch (error) {
    logger.error("Error fetching recent issues counts:", error);
    // Continue without recent issues data - will fall back to 0
  }

  // Add recentOpenIssuesCount to each robot
  const robotsWithRecentIssues = allRobots.map((robot) => ({
    ...robot,
    id: robot._id,
    // Recent open issues count (past 2 days) - use this for Issue badge display
    recentOpenIssuesCount: recentIssuesCounts.get(robot._id as string) || 0,
    // Extract nested bomCompletionStatus to top-level for frontend
    bomCompletionStatus: robot.manufacturingData?.bomCompletionStatus
  }));

  res.json(robotsWithRecentIssues);
});

/**
 * Get all robots in the system (Admin only)
 * Used for user management - assigning robot access to users
 * @access Private (Admin with change_users permission)
 * @param req - Request
 * @param res - Response
 * @returns List of all robots (id and name only)
 */
export const getAllRobotsForAdmin = asyncHandler(async (req, res) => {
  // Fetch all robots - simplified data for user assignment
  const allRobots = await robotModel
    .find({})
    .select("_id name")
    .sort({ name: 1 })
    .lean();

  // Transform _id to id for consistent response format
  const robotsWithId = allRobots.map((robot) => ({
    id: robot._id.toString(),
    name: robot.name
  }));

  res.json(robotsWithId);
});

export const fetchRobotsInRange = asyncHandler(
  async (req: Request, res: Response) => {
    // Robot was part of the client at some point
    const { startingTimestamp, endingTimestamp } = req.body;
    const { user } = req;

    if (!startingTimestamp || !endingTimestamp) {
      res.status(400);
      throw new Error("Missing request parameters");
    }

    if (!user) {
      res.status(401);
      throw new Error("Unauthenticated");
    }
    const { clients } = user;

    const robots = await appDataModel.aggregate([
      {
        $match: {
          timestamp: {
            $gte: new Date(startingTimestamp),
            $lte: new Date(endingTimestamp)
          },
          "metadata.clientId": {
            $in: clients.map((c: ObjectId) => c.toString())
          }
        }
      },
      {
        $lookup: {
          from: "robots",
          localField: "metadata.robotId",
          foreignField: "_id",
          as: "robot"
        }
      },
      {
        $project: {
          robot: {
            $arrayElemAt: ["$robot", 0]
          }
        }
      },
      {
        $group: {
          _id: {
            robotId: "$robot._id",
            name: "$robot.name"
          }
        }
      },
      {
        $project: {
          id: "$_id.robotId",
          name: "$_id.name",
          _id: false
        }
      }
    ]);

    if (robots) {
      res.json(robots);
    } else {
      res.status(500);
      throw new Error("Error fetching robots in this range");
    }
  }
);

/**
 * Fetch Robot accessible by a user
 * @access Private
 * @param req - Request robotId in JSON
 * @param res - Response
 * @returns robot details along with status
 *
 *
 */
export const getRobot = asyncHandler(async (req, res) => {
  const { robotId }: { robotId: string } = req.body;

  if (!robotId) {
    res.status(400);
    throw new Error("Missing required request body parameter");
  }

  const { robots } = req.user as {
    robots: string[];
  };

  if (!robots.includes(robotId)) {
    res.status(400);
    throw new Error("User does not have access to the robot");
  }

  const robot = await robotModel.findById(robotId).populate("fleet");

  if (robot) {
    const getObjectCommand = new GetObjectCommand({
      Bucket: "flo-robot-data",
      Key: `${robot.id}/image/logo.png`
    });

    const imageUrl = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: 3600
    });

    robot.image = imageUrl;
    const status = (await redisClient.json.get(`robot:${robot.id}`, {
      path: [".status"]
    })) as string;
    robot.status = status;

    res.status(200).json(robot);
  } else {
    res.status(400);
    throw new Error("User does not have access to the robot");
  }
});

export const getRobotOperators = asyncHandler(async (req, res) => {
  const { robotId } = req.body;
  if (!robotId) {
    res.status(400);
    throw new Error("Missing required parameters");
  }

  const robot = await robotModel
    .findById(robotId)
    .populate({
      path: "appUsers",
      select: "id name imageUrl phoneNumber robots"
    })
    .select("activeOperator");

  if (!robot || !robot.appUsers) {
    res.status(400);
    throw new Error("Error fetching operators");
  }

  const activeOperatorId = robot.activeOperator?.toString();

  if (robot) {
    res.json(
      robot.appUsers.map((op) => ({
        id: op.id,
        name: op.name,
        imageUrl: op.imageUrl,
        phoneNumber: op.phoneNumber,
        robots: op.robots?.length || 0,
        isActiveOperator: op.id === activeOperatorId // Flag indicating if this operator is the active one
      }))
    );
  } else {
    res.status(400);
    throw new Error("User does not have access to the robot");
  }
});

/**
 * Activate a robot
 * @access Private
 * @param req - Request with deviceId (phoneNumber of robot) and days in JSON
 * @param res - Response
 * @returns updated robot details
 *
 *
 */
export const activateRobot = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId, days }: { robotId: string; days: number } = req.body;
    if (!robotId || !days) {
      res.status(400);
      throw new Error("Missing required request body parameter");
    }

    const robot = await robotModel.findById(robotId);
    if (robot) {
      const previousDate = new Date(robot.expiry);
      const currentDate = new Date(Date.now());

      // get number of days in difference
      const diffInDays = dateDiffInDays(currentDate, previousDate);
      logger.info(diffInDays);

      // add additional days when diffdays are greater than zero that is when robot is activated before expiry date
      const data = await robotModel
        .findByIdAndUpdate(
          robotId,
          {
            access: true,
            expiry: currentDate.setDate(
              currentDate.getDate() +
                (diffInDays > 0 ? days + diffInDays : days)
            )
          },
          { new: true }
        )
        .select("-users -password");
      res.status(200).json(data);
    } else {
      res.status(400);
      throw new Error("No robot found for specified ID");
    }
  }
);

/**
 * Deactivate a robot
 * @access Private
 * @param req - Request with deviceId (phoneNumber of robot) in JSON
 * @param res - Response
 * @returns updated robot details
 *
 *
 */
export const deactivateRobot = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId }: { robotId: string } = req.body;
    if (!robotId) {
      res.status(400);
      throw new Error("Robot Id is a required request body parameter");
    }
    const robot = await robotModel
      .findByIdAndUpdate(
        robotId,
        {
          access: false
        },
        { new: true }
      )
      .select("-users -password");
    if (!robot) {
      res.status(404);
      throw new Error("No robot found for the specified Id");
    }
    res.status(200).json(robot);
  }
);

/**
 * Add user to a robot
 * @access Private
 * @param req - Request with deviceId (phoneNumber of robot) and userEmail in JSON
 * @param res - Response
 * @returns updated robot details
 *
 *
 */
export const addUserToRobot = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId, userEmail }: { robotId: string; userEmail: string } =
      req.body;
    if (!robotId || !userEmail) {
      res.status(400);
      throw new Error("Missing required request body parameters.");
    }
    const robot = await robotModel.findById(robotId);
    if (!robot) {
      res.status(404);
      throw new Error("No robot found for the specified Id");
    }

    const user = await userModel.findOne({ email: userEmail });
    if (!user) {
      res.status(404);
      throw new Error("No User found");
    }

    const { updatedRobot, updatedUser } = await runInTransaction(
      async (session) => {
        const robotInTransaction = await robotModel
          .findByIdAndUpdate(
            robotId,
            { $addToSet: { users: user.id } },
            { new: true, session }
          )
          .select("users");
        const userInTransaction = await userModel
          .findByIdAndUpdate(
            user.id,
            { $addToSet: { robots: robotId } },
            { session, new: true }
          )
          .select("robots");
        return {
          updatedRobot: robotInTransaction,
          updatedUser: userInTransaction
        };
      }
    );

    if (updatedRobot && updatedUser) {
      // Refresh MQTT room membership if robot has macAddress
      if (robot.macAddress) {
        const refreshedRobot = await robotModel
          .findById(robotId)
          .populate({ path: "users", select: "email" });
        if (refreshedRobot) {
          await MqttClientConnection.refreshRoomRobot(
            robot.macAddress,
            refreshedRobot as unknown as Robot
          );
        }
      }

      res.status(200).json({
        updatedRobot,
        updatedUser
      });
    }
  }
);

/**
 * Remove a user from robot
 * @access Private
 * @param req - Request with deviceId (phoneNumber of robot) and userEmail in JSON
 * @param res - Response
 * @returns updated robot details
 *
 *
 */
export const removeUserFromRobot = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId, userEmail }: { robotId: string; userEmail: string } =
      req.body;
    if (!robotId || !userEmail) {
      res.status(400);
      throw new Error("Missing required request body parameters.");
    }
    const robot = await robotModel.findById(robotId);
    if (!robot) {
      res.status(404);
      throw new Error("No robot found for the specified Id");
    }

    const user = await userModel.findOne({ email: userEmail });
    if (!user) {
      res.status(404);
      throw new Error("No User found");
    }

    const { updatedRobot, updatedUser } = await runInTransaction(
      async (session) => {
        const robotInTransaction = await robotModel
          .findByIdAndUpdate(
            robotId,
            { $pull: { users: user.id } },
            { session, new: true }
          )
          .select("users");
        const userInTransaction = await userModel
          .findByIdAndUpdate(
            user.id,
            { $pull: { robots: robotId } },
            { session, new: true }
          )
          .select("robots");
        return {
          updatedRobot: robotInTransaction,
          updatedUser: userInTransaction
        };
      }
    );
    if (updatedRobot && updatedUser) {
      // Refresh MQTT room membership if robot has macAddress
      if (robot.macAddress) {
        const refreshedRobot = await robotModel
          .findById(robotId)
          .populate({ path: "users", select: "email" });
        if (refreshedRobot) {
          await MqttClientConnection.refreshRoomRobot(
            robot.macAddress,
            refreshedRobot as unknown as Robot
          );
        }
      }

      res.status(200).json({
        updatedRobot,
        updatedUser
      });
    }
  }
);

/**
 * Add app user to a robot
 * @access Private
 * @param req - Request with robotId and   in JSON
 * @param res - Response
 * @returns updated robot details
 *
 *
 */
export const addAppUserToRobot = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId, operatorId }: { robotId: string; operatorId: string } =
      req.body;

    if (!robotId || !operatorId) {
      res.status(400);
      throw new Error("Missing required request body parameters.");
    }
    const robot = await robotModel.findById(robotId);
    if (!robot) {
      res.status(404);
      throw new Error("No robot found for the specified Id");
    }

    const operator = await appUserModel.findById(operatorId);
    if (!operator) {
      res.status(404);
      throw new Error("No operator found");
    }

    // Allow inactive operators to be assigned to robots
    // Removed isActive check to support operators on leave or temporarily inactive

    const { updatedRobot, updatedUser } = await runInTransaction(
      async (session) => {
        const robotInTransaction = await robotModel
          .findByIdAndUpdate(
            robotId,
            { $addToSet: { appUsers: operator.id } },
            { new: true, session }
          )
          .select("appUsers");
        const userInTransaction = await appUserModel
          .findByIdAndUpdate(
            operator.id,
            { $addToSet: { robots: robotId } },
            { session, new: true }
          )
          .select("robots");
        return {
          updatedRobot: robotInTransaction,
          updatedUser: userInTransaction
        };
      }
    );

    if (updatedRobot && updatedUser) {
      // Refresh MQTT room membership if robot has macAddress
      if (robot.macAddress) {
        const refreshedRobot = await robotModel
          .findById(robotId)
          .populate({ path: "users", select: "email" });
        if (refreshedRobot) {
          await MqttClientConnection.refreshRoomRobot(
            robot.macAddress,
            refreshedRobot as unknown as Robot
          );
        }
      }

      // ✅ UPDATE SNAPSHOTS: If robot has no active operator, set this operator as active
      // This ensures newly assigned operators are immediately visible in Master Data
      // PERFORMANCE: This is on the write path (operator assignment), not read path
      try {
        const currentRobot = await robotModel
          .findById(robotId)
          .select("activeOperator");

        // If robot has no active operator, set this new operator as active with snapshots
        if (!currentRobot?.activeOperator) {
          // Get operator with populated client data for snapshot
          const operatorWithClient = await appUserModel
            .findById(operatorId)
            .populate({
              path: "clientId",
              select: "id name location operatingHours"
            });

          if (operatorWithClient) {
            // Build operator snapshot
            const operatorSnapshot = {
              id: operatorWithClient.id,
              name: operatorWithClient.name,
              phoneNumber: operatorWithClient.phoneNumber,
              checkedInToday: false,
              lastCheckInTime: undefined
            };

            // Build client snapshot if operator has a client
            const clientData = operatorWithClient.clientId as any;
            const clientSnapshot = clientData
              ? {
                  id: clientData.id || clientData._id?.toString(),
                  name: clientData.name,
                  location: clientData.location,
                  operatingHours: clientData.operatingHours
                }
              : undefined;

            // Set as active operator with snapshots
            await robotModel.findByIdAndUpdate(robotId, {
              activeOperator: operatorId,
              operatorSnapshot,
              ...(clientSnapshot && { clientSnapshot })
            });

            logger.info(
              `Set operator ${operatorId} as active operator for robot ${robotId} with snapshots`
            );
          }
        }
      } catch (error) {
        // Log error but don't fail the request - operator assignment succeeded
        logger.error(
          `Failed to set active operator on robot after assignment: ${error}`
        );
      }

      // ✅ INVALIDATE MASTER DATA CACHE
      if (!robot.activeOperator) {
        await refreshRobotOperationalCache([robotId], ["staffing", "cycle"]);
      }

      await masterDataCacheService.invalidateCache(
        `operator ${operatorId} assigned to robot ${robotId}`
      );

      res.status(200).json({
        updatedRobot,
        updatedUser
      });
    }
  }
);
/**
 * Remove an App user from robot
 * @access Private
 * @param req - Request with deviceId (phoneNumber of robot) and userEmail in JSON
 * @param res - Response
 * @returns updated robot details
 *
 * Also clears operatorSnapshot and clientSnapshot if the removed operator was the active one.
 */
export const removeAppUserFromRobot = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId, operatorId }: { robotId: string; operatorId: string } =
      req.body;
    if (!robotId || !operatorId) {
      res.status(400);
      throw new Error("Missing required request body parameters.");
    }
    const robot = await robotModel.findById(robotId);
    if (!robot) {
      res.status(404);
      throw new Error("No robot found for the specified Id");
    }

    const user = await appUserModel.findById(operatorId);
    if (!user) {
      res.status(404);
      throw new Error("No User found");
    }

    const { updatedRobot, updatedUser } = await runInTransaction(
      async (session) => {
        // Check if the operator being removed is the active operator
        const updateFields: any = { $pull: { appUsers: user.id } };
        if (
          robot.activeOperator &&
          robot.activeOperator.toString() === operatorId
        ) {
          // Clear activeOperator and snapshots if removing the active one
          updateFields.$unset = {
            activeOperator: "",
            operatorSnapshot: "",
            clientSnapshot: ""
          };
        }

        const robotInTransaction = await robotModel
          .findByIdAndUpdate(robotId, updateFields, { session, new: true })
          .select("appUsers activeOperator operatorSnapshot clientSnapshot");
        const userInTransaction = await appUserModel
          .findByIdAndUpdate(
            user.id,
            { $pull: { robots: robotId } },
            { session, new: true }
          )
          .select("robots");
        return {
          updatedRobot: robotInTransaction,
          updatedUser: userInTransaction
        };
      }
    );
    if (updatedRobot && updatedUser) {
      // Refresh MQTT room membership if robot has macAddress
      if (robot.macAddress) {
        const refreshedRobot = await robotModel
          .findById(robotId)
          .populate({ path: "users", select: "email" });
        if (refreshedRobot) {
          await MqttClientConnection.refreshRoomRobot(
            robot.macAddress,
            refreshedRobot as unknown as Robot
          );
        }
      }

      // ✅ INVALIDATE MASTER DATA CACHE
      if (
        robot.activeOperator &&
        robot.activeOperator.toString() === operatorId
      ) {
        await refreshRobotOperationalCache([robotId], ["staffing", "cycle"]);
      }

      await masterDataCacheService.invalidateCache(
        `operator ${operatorId} removed from robot ${robotId}`
      );

      res.status(200).json({
        updatedRobot,
        updatedUser
      });
    }
  }
);

/**
 * Authenticate a robot
 * @access Public
 * @param req - Request with deviceId (phoneNumber of robot) and password in JSON
 * @param res - Response
 * @returns robot details along with token
 *
 *
 */
export const authenticateRobot = asyncHandler(
  async (req: Request, res: Response) => {
    const { deviceId, password }: { deviceId: string; password: string } =
      req.body;
    if (!deviceId || !password) {
      res.status(400);
      throw new Error("Missing required request parameters");
    }
    const robot = await robotModel.findById(deviceId);
    if (!robot) {
      res.status(404);
      throw new Error("No robot found");
    }

    if (robot && (await bcrypt.compare(password, robot?.password))) {
      res.status(200).json({
        id: robot.id,
        name: robot.name,
        token: generateRobotToken(robot.id)
      });
    } else {
      res.status(401);
      throw new Error("Invalid credentials");
    }
  }
);

/**
 * Upload image to aws s3 bucket for the robot
 * @access Private
 * @param req - Request
 * @param res - Response
 * @returns Uploaded image details
 *
 *
 */
export const uploadImageToRobot = asyncHandler(
  async (req: Request, res: Response) => {
    const { location } = req?.file as any;
    if (location) {
      res.status(200).json({
        message: "File uploaded successfully",
        location
      });
    } else {
      res.status(400);
      throw new Error("Unable to upload image data");
    }
  }
);

/**
 * Retrieves all robots' master data with populated operator and client information.
 * @access Private
 * @param req - Express request object with optional pagination and filter parameters.
 * @param res - Express response object.
 * @returns JSON response with list of robots including operator and client details.
 *
 * Utilizes pre-stored snapshot data:
 * - operatorSnapshot, clientSnapshot, fleetSnapshot: Stored snapshots updated on assignment.
 * - openIssuesCount: Count of open issues, updated when issues are raised or closed.
 * - yesterdayTripCount: Count of trips from yesterday, updated daily by a scheduled job.
 * - checkedInToday: Indicates if checked in today, updated on check-in and reset daily.
 * - maintenance and BOM are exposed as separate concerns in the response DTO.
 */
export const getRobotsMasterData = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      client,
      operator,
      fleet,
      access,
      gpsStatus
    }: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
      client?: string;
      operator?: string;
      fleet?: string;
      access?: string;
      gpsStatus?: string;
    } = req.query;
    const result = await robotMasterDataService.fetchRobotMasterData({
      page: Number(page),
      limit: Number(limit),
      filters: {
        status,
        search,
        client,
        operator,
        fleet,
        access,
        gpsStatus
      }
    });

    res.status(200).json(result);
  }
);

/**
 * Get Manufacturing Data for a Robot
 * @access Private
 * @route GET /api/v1/robots/:robotId/manufacturing-data
 * @param req - Request with robotId in params
 * @param res - Response
 * @returns Manufacturing data for the robot with insufficient parts count
 */
export const getManufacturingData = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId } = req.params;

    // Check user has access to this robot
    const { robots } = req.user as { robots: string[] };
    if (!robots.includes(robotId)) {
      res.status(403);
      throw new Error("User does not have access to this robot");
    }

    const robot = await robotModel
      .findById(robotId)
      .select("manufacturingData name createdAt")
      .lean();

    if (!robot) {
      res.status(404);
      throw new Error("Robot not found");
    }

    // Calculate insufficient parts count (only Flo parts)
    const partsConsumed = robot.manufacturingData?.partsConsumed || [];
    const insufficientFloParts = partsConsumed.filter(
      (part: any) => part.source === 'Flo' && part.inventoryStatus === 'insufficient'
    );
    const insufficientPartsCount = insufficientFloParts.length;
    const hasInsufficientParts = insufficientPartsCount > 0;

    res.status(200).json({
      robotId: robot._id,
      robotName: robot.name,
      manufacturedDate: robot.manufacturingData?.manufacturingDate || robot.createdAt,
      manufacturingData: robot.manufacturingData || {},
      insufficientPartsCount,
      hasInsufficientParts
    });
  }
);

/**
 * Update Manufacturing Data for a Robot
 * @access Private
 * @route PUT /api/v1/robots/:robotId/manufacturing-data
 * @param req - Request with robotId in params and manufacturing data in body
 * @param res - Response
 * @returns Updated manufacturing data
 */
export const updateManufacturingData = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId } = req.params;
    const manufacturingData = req.body;

    // Check user has access
    const { robots } = req.user as { robots: string[] };
    if (!robots.includes(robotId)) {
      res.status(403);
      throw new Error("User does not have access to this robot");
    }

    // Validate manufacturingPartnerOther
    if (
      manufacturingData.manufacturingPartner === "Others" &&
      !manufacturingData.manufacturingPartnerOther
    ) {
      res.status(400);
      throw new Error("Please specify the manufacturing partner");
    }

    const robot = await robotModel
      .findByIdAndUpdate(
        robotId,
        { manufacturingData },
        {
          new: true,
          runValidators: true
        }
      )
      .select("manufacturingData name");

    if (!robot) {
      res.status(404);
      throw new Error("Robot not found");
    }

    await refreshRobotOperationalCache([robotId], ["bom"]);

    res.status(200).json({
      message: "Manufacturing data updated successfully",
      manufacturingData: robot.manufacturingData
    });
  }
);

/**
 * Get Battery-Motor Data for a Robot
 * @access Private
 * @route GET /api/v1/robots/:robotId/motor-data
 * @param req - Request with robotId in params
 * @param res - Response
 * @returns Battery and motor data for the robot
 */
export const getMotorData = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId } = req.params;

    // Check user has access to this robot
    const { robots } = req.user as { robots: string[] };
    if (!robots.includes(robotId)) {
      res.status(403);
      throw new Error("User does not have access to this robot");
    }

    const robot = await robotModel
      .findById(robotId)
      .select("motorData name")
      .lean();

    if (!robot) {
      res.status(404);
      throw new Error("Robot not found");
    }

    res.status(200).json({
      robotId: robot._id,
      robotName: robot.name,
      motorData: robot.motorData || {}
    });
  }
);

/**
 * Update Battery-Motor Data for a Robot
 * @access Private
 * @route PUT /api/v1/robots/:robotId/motor-data
 * @param req - Request with robotId in params and battery-motor data in body
 * @param res - Response
 * @returns Updated battery-motor data
 */
export const updateMotorData = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId } = req.params;
    const motorData = req.body;

    // Check user has access
    const { robots } = req.user as { robots: string[] };
    if (!robots.includes(robotId)) {
      res.status(403);
      throw new Error("User does not have access to this robot");
    }

    const robot = await robotModel
      .findByIdAndUpdate(
        robotId,
        { motorData },
        {
          new: true,
          runValidators: true
        }
      )
      .select("motorData name");

    if (!robot) {
      res.status(404);
      throw new Error("Robot not found");
    }

    res.status(200).json({
      message: "Battery-Motor data updated successfully",
      motorData: robot.motorData
    });
  }
);

/**
 * Get all Tasks for a Robot
 * @access Private
 * @route GET /api/v1/robots/:robotId/tasks
 * @param req - Request with robotId in params
 * @param res - Response
 * @returns All tasks for the robot
 */
export const getTasks = asyncHandler(async (req: Request, res: Response) => {
  const { robotId } = req.params;
  const { status, category, priority } = req.query;

  // Check user has access to this robot
  const { robots } = req.user as { robots: string[] };
  if (!robots.includes(robotId)) {
    res.status(403);
    throw new Error("User does not have access to this robot");
  }

  const robot = await robotModel
    .findById(robotId)
    .select("tasks name")
    .populate("tasks.createdBy", "name email")
    .populate("tasks.assignedTo", "name email")
    .populate("tasks.history.changedBy", "name email")
    .lean();

  if (!robot) {
    res.status(404);
    throw new Error("Robot not found");
  }

  let tasks = robot.tasks || [];

  // Filter tasks based on query params
  if (status) {
    tasks = tasks.filter((task) => task.status === status);
  }
  if (category) {
    tasks = tasks.filter((task) => task.category === category);
  }
  if (priority) {
    tasks = tasks.filter((task) => task.priority === priority);
  }

  res.status(200).json({
    robotId: robot._id,
    robotName: robot.name,
    tasks
  });
});

/**
 * Create a new Task for a Robot
 * @access Private
 * @route POST /api/v1/robots/:robotId/tasks
 * @param req - Request with robotId in params and task data in body
 * @param res - Response
 * @returns Created task
 */
export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const { robotId } = req.params;
  const taskData = req.body;
  const { id: userId } = req.user as { id: string };

  // Check user has access
  const { robots } = req.user as { robots: string[] };
  if (!robots.includes(robotId)) {
    res.status(403);
    throw new Error("User does not have access to this robot");
  }

  // Set createdBy to current user
  taskData.createdBy = userId;
  taskData.createdDate = new Date();
  taskData.history = [
    {
      date: new Date(),
      changedBy: userId,
      field: "created",
      newValue: "Task created",
      comment: "Initial task creation"
    }
  ];

  const robot = await robotModel
    .findByIdAndUpdate(
      robotId,
      { $push: { tasks: taskData } },
      {
        new: true,
        runValidators: true
      }
    )
    .select("tasks name");

  if (!robot) {
    res.status(404);
    throw new Error("Robot not found");
  }

  // Get the newly created task (last item in the array)
  const newTask = robot.tasks?.[robot.tasks.length - 1];

  res.status(201).json({
    message: "Task created successfully",
    task: newTask
  });
});

/**
 * Update a Task for a Robot
 * @access Private
 * @route PUT /api/v1/robots/:robotId/tasks/:taskId
 * @param req - Request with robotId and taskId in params, task data in body
 * @param res - Response
 * @returns Updated task
 */
export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const { robotId, taskId } = req.params;
  const updateData = req.body;
  const { id: userId } = req.user as { id: string };

  // Check user has access
  const { robots } = req.user as { robots: string[] };
  if (!robots.includes(robotId)) {
    res.status(403);
    throw new Error("User does not have access to this robot");
  }

  // Get the current robot with tasks
  const robot = await robotModel.findById(robotId);
  if (!robot) {
    res.status(404);
    throw new Error("Robot not found");
  }

  // Find the task to update
  const taskIndex = robot.tasks?.findIndex((t) => t._id?.toString() === taskId);
  if (taskIndex === undefined || taskIndex === -1) {
    res.status(404);
    throw new Error("Task not found");
  }

  const currentTask = robot.tasks![taskIndex];

  // Track history for changed fields
  const historyEntries: any[] = [];

  Object.keys(updateData).forEach((field) => {
    if (
      field !== "history" &&
      currentTask[field as keyof typeof currentTask] !== updateData[field]
    ) {
      historyEntries.push({
        date: new Date(),
        changedBy: userId,
        field,
        oldValue: String(currentTask[field as keyof typeof currentTask] || ""),
        newValue: String(updateData[field] || ""),
        comment: updateData.comment || ""
      });
    }
  });

  // Merge history
  const mergedHistory = [...(currentTask.history || []), ...historyEntries];

  // Update the task
  const updateQuery: any = {};
  Object.keys(updateData).forEach((key) => {
    if (key !== "comment") {
      updateQuery[`tasks.$.${key}`] = updateData[key];
    }
  });
  updateQuery["tasks.$.history"] = mergedHistory;

  // Mark completedDate if status changed to Completed
  if (updateData.status === "Completed" && currentTask.status !== "Completed") {
    updateQuery["tasks.$.completedDate"] = new Date();
  }

  const updatedRobot = await robotModel
    .findOneAndUpdate(
      { _id: robotId, "tasks._id": taskId },
      { $set: updateQuery },
      { new: true, runValidators: true }
    )
    .select("tasks name");

  if (!updatedRobot) {
    res.status(404);
    throw new Error("Failed to update task");
  }

  // Find and return the updated task
  const updatedTask = updatedRobot.tasks?.find(
    (t) => t._id?.toString() === taskId
  );

  res.status(200).json({
    message: "Task updated successfully",
    task: updatedTask
  });
});

/**
 * Delete a Task from a Robot
 * @access Private
 * @route DELETE /api/v1/robots/:robotId/tasks/:taskId
 * @param req - Request with robotId and taskId in params
 * @param res - Response
 * @returns Success message
 */
export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const { robotId, taskId } = req.params;

  // Check user has access
  const { robots } = req.user as { robots: string[] };
  if (!robots.includes(robotId)) {
    res.status(403);
    throw new Error("User does not have access to this robot");
  }

  const robot = await robotModel
    .findByIdAndUpdate(
      robotId,
      { $pull: { tasks: { _id: taskId } } },
      { new: true }
    )
    .select("tasks name");

  if (!robot) {
    res.status(404);
    throw new Error("Robot not found");
  }

  res.status(200).json({
    message: "Task deleted successfully"
  });
});

/**
 * Set Active Operator for a Robot
 * @access Private
 * @route PUT /api/v1/robots/:robotId/active-operator
 * @param req - Request with robotId and operatorId in body
 * @param res - Response
 * @returns Success message with updated robot
 *
 * Note: Only ONE operator can be active at a time per robot.
 * This endpoint sets the operator currently working with the robot.
 * Also updates operatorSnapshot and clientSnapshot for faster Master Data queries.
 */
export const setActiveOperator = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId, operatorId }: { robotId: string; operatorId: string } =
      req.body;

    if (!robotId || !operatorId) {
      res.status(400);
      throw new Error("Missing required request body parameters");
    }

    // Verify robot exists
    const robot = await robotModel.findById(robotId).select("appUsers");
    if (!robot) {
      res.status(404);
      throw new Error("No robot found for the specified Id");
    }

    // Verify operator exists and is assigned to this robot
    const operator = await appUserModel.findById(operatorId).populate({
      path: "clientId",
      select: "id name location operatingHours"
    });
    if (!operator) {
      res.status(404);
      throw new Error("Operator not found");
    }

    // Check if operator is assigned to this robot
    const operatorAssigned = robot.appUsers?.some(
      (appUser) => appUser.toString() === operatorId
    );
    if (!operatorAssigned) {
      res.status(400);
      throw new Error("Operator is not assigned to this robot");
    }

    // Build operator snapshot
    const operatorSnapshot = {
      id: operator.id,
      name: operator.name,
      phoneNumber: operator.phoneNumber,
      checkedInToday: false, // Will be updated by check-in or daily job
      lastCheckInTime: undefined
    };

    // Build client snapshot if operator has a client
    const clientData = operator.clientId as any;
    const clientSnapshot = clientData
      ? {
          id: clientData.id || clientData._id?.toString(),
          name: clientData.name,
          location: clientData.location,
          operatingHours: clientData.operatingHours
        }
      : undefined;

    // Update activeOperator field and snapshots
    const updatedRobot = await robotModel
      .findByIdAndUpdate(
        robotId,
        {
          activeOperator: operatorId,
          operatorSnapshot,
          ...(clientSnapshot && { clientSnapshot })
        },
        { new: true }
      )
      .populate({
        path: "activeOperator",
        select: "id name phoneNumber imageUrl isActive"
      });

    if (!updatedRobot) {
      res.status(500);
      throw new Error("Failed to set active operator");
    }

    // ✅ INVALIDATE MASTER DATA CACHE
    await refreshRobotOperationalCache([robotId], ["staffing", "cycle"]);

    await masterDataCacheService.invalidateCache(
      `active operator set: operator ${operatorId} on robot ${robotId}`
    );

    res.status(200).json({
      message: "Active operator set successfully",
      robot: {
        id: updatedRobot.id,
        name: updatedRobot.name,
        activeOperator: updatedRobot.activeOperator
      }
    });
  }
);

/**
 * Get MQTT Subscription Diagnostics
 * @access Private
 * @route GET /api/v1/robots/diagnostics/mqtt-subscriptions
 * @param req - Request
 * @param res - Response
 * @returns List of active MQTT subscriptions for debugging
 *
 * This endpoint provides diagnostic information about which robots
 * have active MQTT subscriptions, useful for debugging connectivity issues.
 */
export const getMqttSubscriptionsDiagnostics = asyncHandler(
  async (req: Request, res: Response) => {
    const activeSubscriptions = MqttClientConnection.getActiveSubscriptions();

    res.status(200).json({
      totalSubscriptions: activeSubscriptions.length,
      subscriptions: activeSubscriptions,
      timestamp: new Date().toISOString()
    });
  }
);

/**
 * Get robot consumed parts
 * @access Private
 */
export const getRobotPartsConsumed = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId } = req.params;
    const robot = await robotModel.findById(robotId);

    if (!robot) {
      res.status(404);
      throw new Error("Robot not found");
    }

    const parts = robot.manufacturingData?.partsConsumed || [];
    const electrical = parts.filter((p: any) => p.purpose === "electrical");
    const mechanical = parts.filter((p: any) => p.purpose === "mechanical");

    res.json({ electrical, mechanical, totalQuantity: parts.length });
  }
);

/**
 * Complete BOM Inventory - Re-check inventory for insufficient parts
 * @access Private
 * @route POST /api/v1/robots/:robotId/complete-bom-inventory
 * @param req - Request with robotId in params and optional partIds in body
 * @param res - Response with updated parts and still insufficient parts
 *
 * Re-checks Flo inventory for parts marked as insufficient.
 * If inventory is now sufficient, deducts the quantity and updates status to 'sufficient'.
 * External parts (GKX/Abhirup) are not rechecked.
 */
export const completeBOMInventory = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId } = req.params;
    const { partIds } = req.body; // Optional: specific parts to recheck

    // Check user has access
    const { robots } = req.user as { robots: string[] };
    if (!robots.includes(robotId)) {
      res.status(403);
      throw new Error("User does not have access to this robot");
    }

    // Fetch robot
    const robot = await robotModel.findById(robotId);
    if (!robot) {
      res.status(404);
      throw new Error("Robot not found");
    }

    // Get parts to check (either specified parts or all insufficient parts)
    const allParts = robot.manufacturingData?.partsConsumed || [];
    const partsToCheck = allParts.filter((part: any) => {
      // If specific partIds provided, only check those
      if (partIds && partIds.length > 0) {
        return partIds.includes(part.itemId);
      }
      // Otherwise, check all insufficient Flo parts
      // FALLBACK: Treat Flo parts without inventoryStatus as insufficient (old robots)
      const effectiveStatus = part.inventoryStatus || (part.source === 'Flo' ? 'insufficient' : 'external');
      return effectiveStatus === 'insufficient' && part.source === 'Flo';
    });

    if (partsToCheck.length === 0) {
      res.status(200).json({
        message: "No parts to recheck",
        updatedParts: [],
        stillInsufficientParts: []
      });
      return;
    }

    logger.info(`Re-checking inventory for ${partsToCheck.length} parts on robot ${robot.name}`);

    // Track results
    const updatedParts: any[] = [];
    const stillInsufficientParts: any[] = [];
    const inventoryDeductions: any[] = [];

    // Start transaction
    await runInTransaction(async (session) => {
      for (const part of partsToCheck) {
        // Only check Flo parts
        if (part.source !== 'Flo') {
          continue;
        }

        // Check current inventory
        const inventoryItem = await InventoryItem.findOne({
          itemId: part.itemId.toUpperCase()
        }).session(session);

        if (!inventoryItem) {
          logger.warn(`Inventory item not found for ${part.itemId}`);
          stillInsufficientParts.push({
            itemId: part.itemId,
            name: part.name,
            required: part.quantity,
            available: 0,
            shortfall: part.quantity
          });
          continue;
        }

        // Check if now sufficient
        if (inventoryItem.quantity >= part.quantity) {
          // Sufficient! Deduct inventory and add transaction history
          const previousQty = inventoryItem.quantity;
          const newQty = previousQty - part.quantity;

          await InventoryItem.findOneAndUpdate(
            { itemId: part.itemId.toUpperCase() },
            {
              $inc: { quantity: -part.quantity },
              $push: {
                transactions: {
                  type: "remove",
                  quantity: part.quantity,
                  previousQty: previousQty,
                  newQty: newQty,
                  date: new Date(),
                  performedBy: (req.user as any).id,
                  notes: `Updated BOM inventory for robot ${robot.name}`
                }
              }
            },
            { session }
          );

          inventoryDeductions.push({
            itemId: part.itemId,
            name: part.name,
            quantity: part.quantity,
            remainingAfterDeduction: inventoryItem.quantity - part.quantity
          });

          // Update part status in robot
          const partIndex = robot.manufacturingData!.partsConsumed!.findIndex(
            (p: any) => p.itemId === part.itemId
          );
          if (partIndex !== -1) {
            robot.manufacturingData!.partsConsumed![partIndex].inventoryStatus = 'sufficient';
          }

          updatedParts.push({
            itemId: part.itemId,
            name: part.name,
            newStatus: 'sufficient'
          });

          logger.info(`Updated ${part.itemId} to sufficient and deducted ${part.quantity} units`);
        } else {
          // Still insufficient
          stillInsufficientParts.push({
            itemId: part.itemId,
            name: part.name,
            required: part.quantity,
            available: inventoryItem.quantity,
            shortfall: part.quantity - inventoryItem.quantity
          });
        }
      }

      // Check if BOM is now complete
      const allPartsAfterUpdate = robot.manufacturingData?.partsConsumed || [];
      const anyInsufficientFlo = allPartsAfterUpdate.some((p: any) => {
        if (p.source !== 'Flo') return false;
        // FALLBACK: Treat Flo parts without inventoryStatus as insufficient (old robots)
        const effectiveStatus = p.inventoryStatus || 'insufficient';
        return effectiveStatus === 'insufficient';
      });

      // Update BOM completion status if all Flo parts are now sufficient
      if (!anyInsufficientFlo && robot.manufacturingData) {
        robot.manufacturingData.bomCompletionStatus = 'complete';
        logger.info(`Robot ${robot.name} BOM is now COMPLETE`);
      }

      // Save robot
      await robot.save({ session });
    });

    // Invalidate cache
    await refreshRobotOperationalCache([robotId], ["bom"]);

    await masterDataCacheService.invalidateCache(
      `BOM inventory completed for robot ${robotId}`
    );

    logger.info(`Inventory completion for ${robot.name}:`);
    logger.info(`- Updated parts: ${updatedParts.length}`);
    logger.info(`- Still insufficient: ${stillInsufficientParts.length}`);
    logger.info(`- BOM Status: ${robot.manufacturingData?.bomCompletionStatus}`);

    res.status(200).json({
      message: "Inventory re-checked successfully",
      updatedParts,
      stillInsufficientParts,
      inventoryDeductions,
      bomCompletionStatus: robot.manufacturingData?.bomCompletionStatus
    });
  }
);

/**
 * Recreate MQTT Room for a Robot
 * @access Private
 * @route POST /api/v1/robots/diagnostics/recreate-room
 * @param req - Request with robotId in body
 * @param res - Response
 * @returns Success message
 *
 * This endpoint recreates the MQTT room and subscription for a specific robot.
 * Useful for fixing robots that are stuck in "Offline" status despite sending data.
 * Steps: 1) Remove existing room/unsubscribe, 2) Recreate room/resubscribe
 */
export const recreateRobotRoom = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId }: { robotId: string } = req.body;

    if (!robotId) {
      res.status(400);
      throw new Error("Missing required parameter: robotId");
    }

    // Find robot in database
    const robot = await robotModel
      .findById(robotId)
      .populate({ path: "users", select: "email" })
      .select("id name macAddress users");

    if (!robot) {
      res.status(404);
      throw new Error(`Robot ${robotId} not found`);
    }

    if (!robot.macAddress) {
      res.status(400);
      throw new Error(`Robot ${robot.name} has no MAC address`);
    }

    logger.info(
      `Recreating MQTT room for robot ${robot.name} (${robot.macAddress})`
    );

    try {
      // Step 1: Remove existing room
      await MqttClientConnection.removeStream(robot.macAddress);
      logger.info(`Removed existing room for ${robot.name}`);

      // Wait a moment to ensure cleanup completes
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 2: Recreate room and resubscribe
      await MqttClientConnection.beginStream(robot.macAddress, robot);
      logger.info(`Recreated room for ${robot.name}`);

      res.status(200).json({
        success: true,
        message: `Successfully recreated MQTT room for ${robot.name}`,
        robot: {
          id: robot.id,
          name: robot.name,
          macAddress: robot.macAddress
        }
      });
    } catch (err) {
      logger.error(`Failed to recreate room for ${robot.name}`, err);
      res.status(500);
      throw new Error(
        `Failed to recreate room: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
);
