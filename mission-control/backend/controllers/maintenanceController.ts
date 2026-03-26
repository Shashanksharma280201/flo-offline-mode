import asyncHandler from "express-async-handler";
import dotenv from "dotenv";
import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import maintenanceModel from "../models/maintenanceModel";
import robotModel from "../models/robotModel";
import { s3Client } from "../services/aws";
import fleetModel from "../models/fleetModel";
import { masterDataCacheService } from "../services/masterDataCacheService";
import { refreshRobotOperationalSnapshots } from "../services/robotOperationalSnapshotService";
import logger from "../utils/logger";

dotenv.config();

const { API_URL } = process.env;

/**
 * Refresh maintenance-derived snapshot data and invalidate the assembled
 * master-data cache after a successful maintenance write.
 *
 * @param robotId - Robot whose maintenance state changed
 * @returns Promise that resolves when downstream maintenance caches are updated
 */
const refreshMaintenanceDerivedCaches = async (
  robotId: string
): Promise<void> => {
  await refreshRobotOperationalSnapshots([robotId], ["maintenance"]);
  await masterDataCacheService.invalidateCache(
    `maintenance updated for robot ${robotId}`
  );
};

export const createRobotMaintenanceEntry = asyncHandler(async (req, res) => {
  const { robotId, operatorId, clientId, submissionTimestamp } = req.body;

  logger.info(
    `Maintenance upload request received for robot: ${robotId}, timestamp: ${submissionTimestamp}`
  );

  // Validate required parameters
  if (!robotId || !operatorId || !clientId || !submissionTimestamp) {
    logger.error("Missing required parameters in maintenance upload");
    res.status(400);
    throw new Error("Missing request parameters");
  }

  // Validate that files were uploaded
  const files = req.files as Express.MulterS3.File[];
  if (!files || files.length === 0) {
    logger.error(
      `No files uploaded for maintenance entry: robotId=${robotId}, timestamp=${submissionTimestamp}`
    );
    res.status(400);
    throw new Error("No maintenance images uploaded");
  }

  logger.info(`Received ${files.length} files for maintenance upload`);

  // Verify robot exists
  const robot = await robotModel.findById(robotId).select("id name operatorSnapshot");
  if (!robot) {
    logger.error(`Robot not found: ${robotId}`);
    res.status(404);
    throw new Error("Robot not found");
  }

  // Check-in validation: operator must be checked in before uploading maintenance
  if (robot.operatorSnapshot) {
    if (robot.operatorSnapshot.id === operatorId && !robot.operatorSnapshot.checkedInToday) {
      logger.error(`Operator ${operatorId} not checked in for robot ${robotId}`);
      res.status(403);
      throw new Error("You must check in before uploading maintenance data. Please check in first.");
    }
  }

  // Verify files were successfully uploaded to S3
  const uploadedFiles = files.filter(file => file.key && file.location);
  if (uploadedFiles.length === 0) {
    logger.error(
      `All files failed to upload to S3 for robotId=${robotId}, timestamp=${submissionTimestamp}`
    );
    res.status(500);
    throw new Error("Failed to upload files to S3");
  }

  if (uploadedFiles.length !== files.length) {
    logger.warn(
      `Partial upload: ${uploadedFiles.length} of ${files.length} files uploaded for robotId=${robotId}`
    );
    res.status(500);
    throw new Error(
      `Only ${uploadedFiles.length} of ${files.length} files were successfully uploaded`
    );
  }

  logger.info(
    `All ${uploadedFiles.length} files successfully uploaded to S3 for robotId=${robotId}`
  );

  const metadata = {
    robotId,
    operatorId,
    clientId
  };

  try {
    // Create maintenance record in database
    const updatedMaintenanceData = await maintenanceModel.create({
      metadata,
      timestamp: submissionTimestamp
    });

    logger.info(
      `Maintenance record created in database: ${updatedMaintenanceData._id}`
    );

    // Update robot's last maintenance timestamp
    const updatedRobotData = await robotModel.findByIdAndUpdate(
      robotId,
      {
        "maintenance.lastMaintenance": submissionTimestamp
      },
      { new: true }
    );

    if (!updatedMaintenanceData || !updatedRobotData) {
      logger.error(
        `Failed to create maintenance data or update robot for robotId=${robotId}`
      );
      res.status(500);
      throw new Error("Error creating service data");
    }

    await refreshMaintenanceDerivedCaches(robotId);

    logger.info(
      `Maintenance upload completed successfully for robot: ${robot.name} (${robotId})`
    );
    res.json({
      url: `${API_URL}/robots/${robot.id}/maintenance/${submissionTimestamp}\n`,
      robotName: robot.name,
      filesUploaded: uploadedFiles.length,
      message: "Maintenance data uploaded successfully"
    });
  } catch (error: any) {
    // If database operations fail, log the issue
    // Note: Files are already uploaded to S3 at this point
    logger.error(
      `Error saving maintenance data for robotId=${robotId}: ${error.message}`,
      error
    );
    res.status(500);
    throw new Error(
      `Failed to save maintenance data: ${error.message || "Unknown error"}`
    );
  }
});

export const fetchAllMaintenanceEntries = asyncHandler(async (req, res) => {
  const { robotId, startingTimestamp, endingTimestamp } = req.body;

  if (!robotId || !startingTimestamp || !endingTimestamp) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const maintenanceData = await maintenanceModel
    .find({
      "metadata.robotId": robotId,
      timestamp: { $gte: startingTimestamp, $lte: endingTimestamp }
    })
    .select("timestamp");

  if (maintenanceData) {
    res.json(maintenanceData);
  } else {
    res.status(400);
    throw new Error("Error fetching maintenance data");
  }
});

export const fetchSingleMaintenanceEntry = asyncHandler(async (req, res) => {
  const { robotId, submissionTimestamp } = req.body;

  if (!robotId || !submissionTimestamp) {
    res.status(400);
    throw new Error("Missing request parameters");
  }
  const { robots } = req.user as {
    robots: string[];
  };

  if (!robots.includes(robotId)) {
    res.status(401);
    throw new Error("User does not have access to the robot");
  }

  const maintenanceMetadata = await maintenanceModel.aggregate([
    {
      $match: {
        "metadata.robotId": {
          $eq: robotId
        },
        timestamp: {
          $eq: new Date(submissionTimestamp)
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
        from: "appusers",
        let: {
          operatorId: {
            $toObjectId: "$metadata.operatorId"
          }
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$_id", "$$operatorId"]
              }
            }
          }
        ],
        as: "metadata.operatorId"
      }
    },
    {
      $lookup: {
        from: "clients",
        let: {
          clientId: {
            $toObjectId: "$metadata.clientId"
          }
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$_id", "$$clientId"]
              }
            }
          }
        ],
        as: "metadata.clientId"
      }
    },
    {
      $set: {
        robotName: {
          $arrayElemAt: ["$metadata.robotId.name", 0]
        },
        fleetId: {
          $arrayElemAt: ["$metadata.robotId.fleet", 0]
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
      $project: {
        metadata: false
      }
    }
  ]);

  const fleet = await fleetModel.findById(maintenanceMetadata[0].fleetId);
  if (!fleet) {
    res.status(404);
    throw new Error("Fleet not found");
  }

  const steps = fleet.maintenanceSteps.reduce((acc, curr) => {
    acc[curr.tag] = curr.step;
    return acc;
  }, {} as { [step: string]: string });

  const listObjectsCommand = new ListObjectsV2Command({
    Bucket: "flo-robot-data",
    Prefix: `${robotId}/maintenance/${submissionTimestamp}`
  });

  const data: string[] = [];
  const { Contents } = await s3Client.send(listObjectsCommand);

  Contents?.forEach((entry) => {
    if (entry.Key) {
      data.push(entry.Key);
    }
  });
  const maintenanceData: {
    [task: string]: { task: string; images: string[] };
  } = {};
  await Promise.all(
    data.map(async (key) => {
      const getObjectCommand = new GetObjectCommand({
        Bucket: "flo-robot-data",
        Key: key
      });

      const url = await getSignedUrl(s3Client, getObjectCommand, {
        expiresIn: 3600
      });
      const split = key.split("/");
      const taskSplit = split[split.length - 1].split("-");
      taskSplit.pop();
      const taskId = taskSplit.join("-");
      if (!maintenanceData[taskId]) {
        maintenanceData[taskId] = { task: steps[taskId], images: [] };
      }

      maintenanceData[taskId].images.push(url);
    })
  );

  if (maintenanceData && maintenanceMetadata) {
    res.json({ metadata: maintenanceMetadata[0], maintenanceData });
  } else {
    res.status(400);
    throw new Error("Error fetching maintenance data");
  }
});

export const fetchMaintenanceSteps = asyncHandler(async (req, res) => {
  const { robotId } = req.body;

  const robot = await robotModel.findById(robotId);
  if (!robot) {
    res.status(404);
    throw new Error("Robot not found");
  }

  const fleet = await fleetModel.findById(robot.fleet);

  if (!fleet) {
    res.status(404);
    throw new Error("Fleet not found");
  }

  logger.info(`Fetching maintenance steps for robot ${robotId}, fleet ${fleet.id}`);
  logger.info(`Returning ${fleet.maintenanceSteps.length} maintenance steps`);

  fleet.maintenanceSteps.forEach((step: any, index: number) => {
    logger.info(`Step ${index + 1}: ${step.step} | tag: ${step.tag} | hasRefImage: ${!!step.referenceImageUrl} | url: ${step.referenceImageUrl || 'none'}`);
  });

  res.json(fleet.maintenanceSteps);
});
