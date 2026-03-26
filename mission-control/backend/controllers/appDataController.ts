import { Response, Request } from "express";
import asyncHandler from "express-async-handler";
import appDataModel, { SessionDataEntry } from "../models/appDataModel";
import appUserModel, { AppUser } from "../models/appUserModel";
import downtimeModel, { DowntimeEntry } from "../models/downtimeModel";
import { masterDataCacheService } from "../services/masterDataCacheService";
import { refreshRobotOperationalSnapshots } from "../services/robotOperationalSnapshotService";
import logger from "../utils/logger";

/**
 * Refresh cycle snapshots and invalidate cached master-data without failing the
 * already-committed write when downstream cache infrastructure is unavailable.
 *
 * @param robotIds - Robots whose cycle-derived master-data fields changed
 * @param reason - Logging context for cache invalidation
 * @returns Promise that resolves after best-effort downstream refresh work
 */
const refreshCycleDerivedCaches = async (
  robotIds: string[],
  reason: string
): Promise<void> => {
  const uniqueRobotIds = [...new Set(robotIds.filter(Boolean))];

  if (uniqueRobotIds.length === 0) {
    return;
  }

  try {
    await refreshRobotOperationalSnapshots(uniqueRobotIds, ["cycle"]);
    await masterDataCacheService.invalidateCache(reason);
  } catch (error) {
    logger.error(
      `Failed to refresh cycle snapshots or invalidate master-data cache: ${reason}`,
      error
    );
  }
};

/**
 * Create a new AppData entry
 * @access Public
 * @param req - Request with AppData details in JSON
 * @param res - Response
 * @returns created AppData entry
 */
export const createAppData = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId, operatorId, clientId, ...sessionData }: SessionDataEntry =
      req.body;
    const timestamp = sessionData.loadingStartTimestamp;
    if (!timestamp || Number.isNaN(timestamp)) {
      res.status(400);
      throw new Error("Missing loadingStartTimestamp for session data.");
    }

    const timestampDate = new Date(timestamp);
    // Check if timestamp is in milliseconds
    if (timestamp < 1e12 || Number.isNaN(timestampDate.getTime())) {
      res.status(400);
      throw new Error("Timestamp should be provided in milliseconds.");
    }

    const metadata = {
      robotId,
      sessionId: timestamp.toString(),
      operatorId,
      clientId
    };

    const appData = {
      metadata,
      timestamp: timestampDate,
      ...sessionData
    };

    // Deletes a sensor document based on session id
    const findResponse = await appDataModel.find({
      "metadata.robotId": metadata.robotId,
      "metadata.sessionId": metadata.sessionId
    });
    if (findResponse.length > 0) {
      // Deletes a sensor document based on session id
      await appDataModel.deleteMany({
        "metadata.robotId": metadata.robotId,
        "metadata.sessionId": metadata.sessionId
      });
    }
    // Create a new sensor document
    const appDataDocument = await appDataModel.create(appData);

    if (appDataDocument) {
      await refreshCycleDerivedCaches(
        [robotId],
        `app-data upserted for robot ${robotId}`
      );
      // Return the created sensor document in the response body
      if (findResponse.length > 0) {
        res.status(200).json(appDataDocument);
      } else {
        res.status(201).json(appDataDocument);
      }
    } else {
      res.status(400);
      throw new Error("Failed to create sensor reading");
    }
  }
);

/**
 * Create new AppData entries
 * @access Public
 * @param req - Request with an array of AppData details in JSON
 * @param res - Response
 * @returns created AppData entries
 */
export const insertManyAppData = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      sessionDataEntries,
      downtimeEntries
    }: {
      sessionDataEntries: SessionDataEntry[];
      downtimeEntries: DowntimeEntry[];
    } = req.body;

    // Validate that the request body is an array
    if (!Array.isArray(sessionDataEntries)) {
      res.status(400);
      throw new Error(
        "Request body should be an array of SessionDataEntry entries."
      );
    }
    if (!Array.isArray(downtimeEntries)) {
      res.status(400);
      throw new Error(
        "Request body should be an array of DowntimeEntry entries."
      );
    }

    if (sessionDataEntries.length === 0 && downtimeEntries.length === 0) {
      res.status(400);
      throw new Error("No session or downtime entries were provided.");
    }

    // Check-out validation: operator must have checked out before uploading trips
    // FIX: Properly handle cases where only one array has data
    let operatorId: string | undefined;
    let robotId: string | undefined;

    if (sessionDataEntries.length > 0) {
      operatorId = sessionDataEntries[0].operatorId;
      robotId = sessionDataEntries[0].robotId;
    } else if (downtimeEntries.length > 0) {
      operatorId = downtimeEntries[0].operatorId;
      robotId = downtimeEntries[0].robotId;
    }

    if (operatorId && robotId) {
      const robotModel = (await import("../models/robotModel")).default;
      const robot = await robotModel.findById(robotId).select("operatorSnapshot");

      if (robot && robot.operatorSnapshot) {
        if (robot.operatorSnapshot.id === operatorId && robot.operatorSnapshot.checkedInToday) {
          res.status(403);
          throw new Error("You must check out before uploading trips. Please complete your shift first.");
        }
      }
    }

    // ✅ FIXED: Use insertMany instead of bulkWrite (timeseries collections don't support upsert)
    let appDataResults: Array<{
      status: "fulfilled" | "rejected";
      message: string;
      sessionId?: string;
    }> = [];

    if (sessionDataEntries.length > 0) {
      try {
        // First, delete existing entries for these sessions (to handle re-uploads)
        const deleteOperations = sessionDataEntries.map((entry) => {
          const { robotId, ...sessionData } = entry;
          const timestamp = sessionData.loadingStartTimestamp;

          if (!timestamp || Number.isNaN(timestamp)) {
            throw new Error(
              `Missing loadingStartTimestamp for robot ${
                robotId ?? "<unknown>"
              }`
            );
          }

          if (timestamp < 1e12) {
            throw new Error(
              `Timestamp should be provided in milliseconds for robot ${robotId}`
            );
          }

          return appDataModel.deleteMany({
            "metadata.robotId": robotId,
            "metadata.sessionId": timestamp.toString()
          });
        });

        await Promise.allSettled(deleteOperations);

        // Prepare documents for insertion
        const appDataDocs = sessionDataEntries.map((entry) => {
          const { robotId, operatorId, clientId, ...sessionData } = entry;
          const timestamp = sessionData.loadingStartTimestamp;
          const timestampDate = new Date(timestamp);

          const metadata = {
            robotId,
            sessionId: timestamp.toString(),
            operatorId,
            clientId
          };

          return {
            metadata,
            timestamp: timestampDate,
            ...sessionData
          };
        });

        // Insert all documents (timeseries collections support insertMany)
        const insertedDocs = await appDataModel.insertMany(appDataDocs, {
          ordered: false // Continue even if some operations fail
        });

        logger.info("insertManyAppData: insertMany completed", {
          entries: sessionDataEntries.length,
          inserted: insertedDocs.length
        });

        appDataResults = sessionDataEntries.map((entry) => ({
          status: "fulfilled" as const,
          message: "Data entry added",
          sessionId: entry.loadingStartTimestamp.toString()
        }));
      } catch (error: any) {
        logger.error("insertManyAppData: insertMany failed", {
          message: error?.message,
          code: error?.code,
          writeErrors: error?.writeErrors
        });
        res.status(500).json({
          message: "Failed to save trip data. Please retry the upload.",
          details: error?.message ?? "Unknown bulk write error"
        });
        return;
      }
    }

    const downtimeDataResults = await Promise.allSettled(
      downtimeEntries.map(async (entry) => {
        try {
          const {
            robotId,
            downtimeStartTimestamp,
            downtimeEndTimestamp,
            task,
            operatorId,
            clientId
          } = entry;

          if (
            !downtimeStartTimestamp ||
            !downtimeEndTimestamp ||
            downtimeStartTimestamp < 1e12 ||
            downtimeEndTimestamp < 1e12
          ) {
            throw new Error(
              `${downtimeStartTimestamp}-Invalid downtime timestamps provided`
            );
          }

          const downtimeTimestamp = new Date(downtimeStartTimestamp);

          const metadata = {
            robotId,
            sessionId: downtimeStartTimestamp.toString(),
            operatorId,
            clientId
          };

          const downtimeData = {
            metadata,
            timestamp: downtimeTimestamp,
            downtimeStartTimestamp,
            downtimeEndTimestamp,
            task
          };

          // Delete existing entries based on robotId and sessionId
          const findResponse = await downtimeModel.find({
            "metadata.robotId": metadata.robotId,
            "metadata.sessionId": metadata.sessionId
          });

          if (findResponse.length > 0) {
            await downtimeModel.deleteMany({
              "metadata.robotId": metadata.robotId,
              "metadata.sessionId": metadata.sessionId
            });
          }

          // Create a new sensor document
          const downtimeDocument = await downtimeModel.create(downtimeData);

          if (downtimeDocument) {
            return { success: true, data: downtimeDocument };
          }

          throw new Error(
            `${downtimeStartTimestamp}-Failed to create downtime entry`
          );
        } catch (error: any) {
          logger.error("insertManyAppData: downtime entry failed", {
            message: error?.message
          });
          return Promise.reject(new Error(error.message));
        }
      })
    );

    // Create a map of clients to get consolidated data
    // type ClientDataType = { [clientId: string]: number };
    // const clientData = appDataResults.reduce((acc: ClientDataType, result) => {
    //   if (result.status === "fulfilled" && result.value.success) {
    //     const { clientId } = result.value.data.metadata;
    //     if (!acc[clientId]) {
    //       acc[clientId] = 0;
    //     }
    //     acc[clientId] += 1;
    //   }
    //   return acc;
    // }, {});

    // await Promise.all(
    //   Object.keys(clientData).map(async (clientId) => {
    //     const clientJob = await scheduledJobsQueue.getJob(clientId);
    //     if (clientJob) {
    //       const updatedData = await clientJob.updateData({
    //         ...clientJob.data,
    //         noOfTrips: clientJob.data.noOfTrips + clientData[clientId]
    //       });

    //       return updatedData;
    //     }
    //     const delay = getDelayUntilTime(20);
    //     const scheduledJobs = await scheduledJobsQueue.add(
    //       "email",
    //       {
    //         type: "site-utilization-report",
    //         clientId,
    //         noOfTrips: clientData[clientId]
    //       },
    //       {
    //         jobId: clientId,
    //         delay,
    //         removeOnFail: true,
    //         removeOnComplete: true
    //       }
    //     );

    //     return scheduledJobs;
    //   })
    // );

    // Transform results to make them JSON-friendly

    const jsonFriendlyAppData =
      appDataResults.length > 0
        ? appDataResults
        : sessionDataEntries.map((entry) => ({
            status: "fulfilled" as const,
            message: "Data entry added",
            sessionId: entry.loadingStartTimestamp.toString()
          }));
    const jsonFriendlyDowntimeData = downtimeDataResults.map((result) => ({
      status: result.status,
      ...(result.status === "fulfilled"
        ? {
            message: "Downtime entry added",
            sessionId: result.value.data.downtimeStartTimestamp.toString()
          }
        : {
            message: result.reason.message
          })
    }));

    // Check if there are any failures
    const hasFailures = jsonFriendlyDowntimeData.some(
      (result) => result.status === "rejected"
    );

    // Set the appropriate status code
    const affectedRobotIds = [
      ...new Set(
        [...sessionDataEntries, ...downtimeEntries]
          .map((entry) => entry.robotId)
        .filter(Boolean)
      )
    ];

    await refreshCycleDerivedCaches(
      affectedRobotIds,
      `app-data bulk upserted for ${affectedRobotIds.length} robots`
    );

    res.status(hasFailures ? 207 : 201).json({
      appData: jsonFriendlyAppData,
      downtimeData: jsonFriendlyDowntimeData
    });
  }
);

/**
 * Removes a app data reading from a robot.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @throws {Error} Missing required request body parameters or failed to delete sensor reading.
 */
export const deleteAppDataFromRobot = asyncHandler(async (req, res) => {
  const { robotId, sessionId }: { robotId: string; sessionId: string } =
    req.body;

  if (!robotId || !sessionId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }

  // Deletes a sensor document based on session id
  const deleteResponse = await appDataModel.deleteMany({
    "metadata.robotId": robotId,
    "metadata.sessionId": sessionId
  });

  if (deleteResponse) {
    await refreshCycleDerivedCaches(
      [robotId],
      `app-data deleted for robot ${robotId}`
    );
    // Return the created sensor document in the response body
    res.status(200).json(deleteResponse);
  } else {
    res.status(400);
    throw new Error("Failed to create sensor reading");
  }
});

/**
 * List robots accessible by a user
 * @access Private
 * @param res - Response
 * @returns robot details along with status
 *
 *
 */
export const getRobotsList = asyncHandler(async (req, res) => {
  const { id: appUserId } = req.user!; // Passed by the middleware protectApp
  const { robots } = (await appUserModel
    .findById(appUserId)
    .populate({
      path: "robots",
      select: "id name fleet"
    })
    .select("id name robots")) as AppUser;

  if (robots) {
    res.status(200).json(robots);
  } else {
    res.status(400);
    throw new Error("Unable to fetch materials, Please try again later");
  }
});

/**
 * List robots accessible by a app User
 * @access Private
 * @param req - Request userId in JSON
 * @param res - Response
 * @returns robot details along with status
 *
 *
 */
export const getRobots = asyncHandler(async (req, res) => {
  const { id: appUserId } = req.body; // Passed by the middleware protectApp

  const { robots } = (await appUserModel
    .findById(appUserId)
    .populate({
      path: "robots",
      select: "id name fleet"
    })
    .select("id name robots")) as AppUser;
  if (robots) {
    res.status(200).json(robots);
  } else {
    res.status(400);
    throw new Error("Unable to fetch materials, Please try again later");
  }
});

/**
 * Fetches Trip session events from a robot.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @throws {Error} Missing required request body parameters or failed to fetch session details.
 */
export const fetchProcessedAppDataInRange = asyncHandler(async (req, res) => {
  const {
    robotId,
    clientId,
    operatorId,
    sessionId,
    startingTimestamp,
    endingTimestamp
  }: {
    robotId: string;
    clientId: string;
    operatorId: string;
    sessionId: string;
    startingTimestamp: number;
    endingTimestamp: number;
  } = req.body;

  if (!startingTimestamp || !endingTimestamp) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }

  // Validate clientId if provided
  if (clientId) {
    const clientModel = (await import("../models/clientModel")).default;
    const clientExists = await clientModel.findById(clientId);
    if (!clientExists) {
      res.status(404);
      throw new Error(`Client not found: ${clientId}`);
    }

    // Check if user has access to this client
    const { user } = req;
    if (user && user.clients) {
      const hasAccess = user.clients.some(
        (c: any) => c.toString() === clientId
      );
      if (!hasAccess) {
        res.status(403);
        throw new Error("You don't have access to this client");
      }
    }
  }

  if (!robotId && !clientId && !operatorId && !sessionId) {
    res.status(400);
    throw new Error(
      "Atleast one search filter should be provided for fetching trip session data"
    );
  }

  // Check if timestamp is in milliseconds
  if (startingTimestamp < 1e12 || endingTimestamp < 1e12) {
    res.status(400);
    throw new Error("Timestamp should be provided in milliseconds.");
  }

  // Debug logging
  logger.info("fetchProcessedAppDataInRange called", {
    robotId,
    clientId,
    operatorId,
    startingTimestamp,
    endingTimestamp,
    startDate: new Date(startingTimestamp).toISOString(),
    endDate: new Date(endingTimestamp).toISOString()
  });

  const downtimeData = await downtimeModel.aggregate([
    {
      $match: {
        ...(clientId && {
          "metadata.clientId": clientId
        }),
        ...(robotId && {
          "metadata.robotId": robotId
        }),
        ...(operatorId && {
          "metadata.operatorId": operatorId
        }),
        ...(sessionId && {
          "metadata.sessionId": sessionId
        }),
        timestamp: {
          $gte: new Date(startingTimestamp),
          $lte: new Date(endingTimestamp)
        }
      }
    },
    {
      $lookup: {
        from: "robots",
        localField: "metadata.robotId",
        foreignField: "_id",
        as: "metadata.robotId"
      }
    },
    {
      $lookup: {
        from: "clients",
        let: {
          clientId: {
            $convert: {
              input: "$metadata.clientId",
              to: "objectId",
              onError: null // Return null if conversion fails (invalid ObjectId)
            }
          }
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $ne: ["$$clientId", null] }, // Only match if clientId is valid
                  { $eq: ["$_id", "$$clientId"] }
                ]
              }
            }
          }
        ],
        as: "metadata.clientId"
      }
    },
    {
      $lookup: {
        from: "appusers",
        let: {
          operatorId: {
            $convert: {
              input: "$metadata.operatorId",
              to: "objectId",
              onError: null // Return null if conversion fails (invalid ObjectId)
            }
          }
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $ne: ["$$operatorId", null] }, // Only match if operatorId is valid
                  { $eq: ["$_id", "$$operatorId"] }
                ]
              }
            }
          }
        ],
        as: "metadata.operatorId"
      }
    },
    {
      $set: {
        robotName: {
          $arrayElemAt: ["$metadata.robotId.name", 0]
        },
        clientName: {
          $arrayElemAt: ["$metadata.clientId.name", 0]
        },
        operatorName: {
          $arrayElemAt: ["$metadata.operatorId.name", 0]
        }
      }
    },
    {
      $addFields: {
        downTimeDuration: {
          $subtract: ["$downtimeEndTimestamp", "$downtimeStartTimestamp"]
        }
      }
    },
    {
      $project: {
        metadata: false,
        loadingData: false,
        unloadingData: false,
        __v: false,
        _id: false
      }
    }
  ]);

  const appSessionData = await appDataModel.aggregate([
    {
      $match: {
        ...(clientId && {
          "metadata.clientId": clientId
        }),
        ...(robotId && {
          "metadata.robotId": robotId
        }),
        ...(operatorId && {
          "metadata.operatorId": operatorId
        }),
        ...(sessionId && {
          "metadata.sessionId": sessionId
        }),
        timestamp: {
          $gte: new Date(startingTimestamp),
          $lte: new Date(endingTimestamp)
        }
      }
    },
    {
      $lookup: {
        from: "robots",
        localField: "metadata.robotId",
        foreignField: "_id",
        as: "metadata.robotId"
      }
    },
    {
      $lookup: {
        from: "clients",
        let: {
          clientId: {
            $convert: {
              input: "$metadata.clientId",
              to: "objectId",
              onError: null // Return null if conversion fails (invalid ObjectId)
            }
          }
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $ne: ["$$clientId", null] }, // Only match if clientId is valid
                  { $eq: ["$_id", "$$clientId"] }
                ]
              }
            }
          }
        ],
        as: "metadata.clientId"
      }
    },
    {
      $lookup: {
        from: "materials",
        let: { materialValue: "$loadingData.typeOfMaterial" },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  // Try ObjectId match first (for new data with 24-char hex strings)
                  {
                    $and: [
                      { $eq: [{ $type: "$$materialValue" }, "string"] },
                      { $eq: [{ $strLenCP: "$$materialValue" }, 24] },
                      {
                        $eq: [
                          "$_id",
                          {
                            $convert: {
                              input: "$$materialValue",
                              to: "objectId",
                              onError: null
                            }
                          }
                        ]
                      }
                    ]
                  },
                  // Fallback: match by name (for old data with material names)
                  { $eq: ["$name", "$$materialValue"] }
                ]
              }
            }
          }
        ],
        as: "loadingData.typeOfMaterial"
      }
    },
    {
      $lookup: {
        from: "appusers",
        let: {
          operatorId: {
            $convert: {
              input: "$metadata.operatorId",
              to: "objectId",
              onError: null // Return null if conversion fails (invalid ObjectId)
            }
          }
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $ne: ["$$operatorId", null] }, // Only match if operatorId is valid
                  { $eq: ["$_id", "$$operatorId"] }
                ]
              }
            }
          }
        ],
        as: "metadata.operatorId"
      }
    },
    {
      $set: {
        robotId: {
          $arrayElemAt: ["$metadata.robotId._id", 0]
        }, // added new
        robotName: {
          $arrayElemAt: ["$metadata.robotId.name", 0]
        },
        clientName: {
          $arrayElemAt: ["$metadata.clientId.name", 0]
        },
        operatorName: {
          $arrayElemAt: ["$metadata.operatorId.name", 0]
        },
        "loadingData.typeOfMaterial": {
          $arrayElemAt: ["$loadingData.typeOfMaterial.name", 0]
        }
      }
    },
    {
      $addFields: {
        loadingMaterialType: "$loadingData.typeOfMaterial",
        loadingMaterialQuantity: {
          $convert: { input: "$loadingData.quantity", to: "long" }
        },
        loadingWorkerCount: {
          $convert: { input: "$loadingData.noOfWorkers", to: "long" }
        },
        unloadingWorkerCount: {
          $convert: { input: "$unloadingData.noOfWorkers", to: "long" }
        },
        unloadingActuatorUsed: "$unloadingData.isActuatorUsed",
        loadingTime: {
          $subtract: ["$loadingEndTimestamp", "$loadingStartTimestamp"]
        },
        tripTime: { $subtract: ["$tripEndTimestamp", "$tripStartTimestamp"] },
        unloadingTime: {
          $subtract: ["$unloadingEndTimestamp", "$unloadingStartTimestamp"]
        },
        returnTripTime: {
          $subtract: ["$returnTripEndTimestamp", "$returnTripStartTimestamp"]
        },
        totalDownTime: "$totalDownTime",
        totalTripTime: {
          $add: ["$tripRunningTime", "$tripIdleTime"]
        }
      }
    },
    {
      $project: {
        metadata: false,
        loadingData: false,
        unloadingData: false,
        __v: false,
        _id: false
      }
    }
  ]);

  // Debug logging for results
  logger.info("fetchProcessedAppDataInRange results", {
    appSessionDataCount: appSessionData.length,
    downtimeDataCount: downtimeData.length,
    sampleAppSession: appSessionData[0] || null
  });

  if (appSessionData && downtimeData) {
    // Return the fetched sensor data in the response body
    res.status(200).json({
      appSessionData,
      downtimeData
    });
  } else {
    res.status(200).json([]);
  }
});

export const fetchAttendanceDataForClients = asyncHandler(async (req, res) => {
  const { startingTimestamp, endingTimestamp } = req.body;
  const { user } = req;

  if (!startingTimestamp || !endingTimestamp) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }

  if (!user) {
    res.status(403);
    throw new Error("Unauthorized");
  }
  const { clients } = user;

  // First, get attendance check-in/check-out data grouped by operator and date
  const attendanceModel = (await import("../models/attendanceModel")).default;
  const attendanceData = await attendanceModel.aggregate([
    {
      $match: {
        startingTimestamp: {
          $gte: new Date(startingTimestamp),
          $lte: new Date(endingTimestamp)
        },
        "metadata.clientId": {
          $in: clients.map((client: any) => client.toString())
        }
      }
    },
    {
      $group: {
        _id: {
          operatorId: "$metadata.operatorId",
          clientId: "$metadata.clientId",
          // Group by date (YYYY-MM-DD)
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$startingTimestamp"
            }
          }
        },
        checkInTimestamp: {
          $min: {
            $cond: [
              { $eq: ["$metadata.entryType", "checkIn"] },
              "$startingTimestamp",
              null
            ]
          }
        },
        checkOutTimestamp: {
          $max: {
            $cond: [
              { $eq: ["$metadata.entryType", "checkOut"] },
              "$startingTimestamp",
              null
            ]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        operatorId: "$_id.operatorId",
        clientId: "$_id.clientId",
        date: "$_id.date",
        checkInTimestamp: {
          $cond: [
            { $ne: ["$checkInTimestamp", null] },
            { $toLong: "$checkInTimestamp" },
            null
          ]
        },
        checkOutTimestamp: {
          $cond: [
            { $ne: ["$checkOutTimestamp", null] },
            { $toLong: "$checkOutTimestamp" },
            null
          ]
        }
      }
    }
  ]);

  // Create a lookup map for quick access to attendance data
  const attendanceMap = attendanceData.reduce((acc: any, entry: any) => {
    const key = `${entry.operatorId}_${entry.clientId}_${entry.date}`;
    acc[key] = {
      checkInTimestamp: entry.checkInTimestamp,
      checkOutTimestamp: entry.checkOutTimestamp
    };
    return acc;
  }, {});

  const results = await appDataModel.aggregate([
    {
      $match: {
        timestamp: {
          $gte: new Date(startingTimestamp),
          $lte: new Date(endingTimestamp)
        },
        "metadata.clientId": {
          // @ts-expect-error it does exist
          $in: clients.map((client) => client.toString())
        }
      }
    },
    {
      $lookup: {
        from: "appusers",
        let: {
          operatorId: {
            $convert: {
              input: "$metadata.operatorId",
              to: "objectId",
              onError: null // Return null if conversion fails (invalid ObjectId)
            }
          }
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $ne: ["$$operatorId", null] }, // Only match if operatorId is valid
                  { $eq: ["$_id", "$$operatorId"] }
                ]
              }
            }
          }
        ],
        as: "operator"
      }
    },
    {
      $unwind: {
        path: "$operator",
        preserveNullAndEmptyArrays: false
      }
    },
    {
      $lookup: {
        from: "clients",
        let: {
          clientId: {
            $convert: {
              input: "$metadata.clientId",
              to: "objectId",
              onError: null // Return null if conversion fails (invalid ObjectId)
            }
          }
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $ne: ["$$clientId", null] }, // Only match if clientId is valid
                  { $eq: ["$_id", "$$clientId"] }
                ]
              }
            }
          }
        ],
        as: "client"
      }
    },
    {
      $unwind: {
        path: "$client",
        preserveNullAndEmptyArrays: false
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
      $unwind: {
        path: "$robot",
        preserveNullAndEmptyArrays: false
      }
    },
    {
      $addFields: {
        dateKey: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$timestamp"
          }
        }
      }
    },
    {
      $project: {
        timestamp: "$loadingStartTimestamp",
        dateKey: 1,
        operatorId: "$metadata.operatorId",
        clientId: "$metadata.clientId",
        client: "$client.name",
        operatingHours: "$client.operatingHours",
        checkInTimeWithZone: "$client.checkInTimeWithZone",
        operator: "$operator.name",
        robot: "$robot.name"
      }
    }
  ]);

  // Merge attendance data into results
  const resultsWithAttendance = results.map((result: any) => {
    const key = `${result.operatorId}_${result.clientId}_${result.dateKey}`;
    const attendance = attendanceMap[key] || {};
    return {
      timestamp: result.timestamp,
      client: result.client,
      operatingHours: result.operatingHours,
      checkInTimeWithZone: result.checkInTimeWithZone,
      operator: result.operator,
      robot: result.robot,
      checkInTimestamp: attendance.checkInTimestamp || undefined,
      checkOutTimestamp: attendance.checkOutTimestamp || undefined
    };
  });

  // FIX: Replace console.log with logger
  logger.debug("Sample result with attendance:", { sample: resultsWithAttendance[0] });

  res.status(200).json(resultsWithAttendance);
  // Get robots, dates, operators, clients
});

export const createDowntimeData = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      robotId,
      operatorId,
      clientId,
      downtimeStartTimestamp,
      downtimeEndTimestamp
    }: {
      robotId: string;
      operatorId: string;
      clientId: string;
      downtimeStartTimestamp: number;
      downtimeEndTimestamp: number;
    } = req.body;

    // Check if timestamp is in milliseconds
    if (
      !downtimeStartTimestamp ||
      !downtimeEndTimestamp ||
      downtimeStartTimestamp < 1e12 ||
      downtimeEndTimestamp < 1e12
    ) {
      res.status(400);
      throw new Error("Timestamp should be provided in milliseconds.");
    }

    const metadata = {
      robotId,
      operatorId,
      clientId,
      sessionId: downtimeStartTimestamp.toString()
    };

    const downtimeData = {
      metadata,
      timestamp: new Date(downtimeStartTimestamp),
      downtimeStartTimestamp,
      downtimeEndTimestamp,
      downTimeDuration: downtimeEndTimestamp - downtimeStartTimestamp
    };

    const downtimeDocument = await downtimeModel.create(downtimeData);

    if (downtimeDocument) {
      res.status(201).json(downtimeDocument);
    } else {
      res.status(400);
      throw new Error("Failed to create downtime data");
    }
  }
);
