import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import asyncHandler from "express-async-handler";
import robotModel from "../models/robotModel";
import sensorModel, { SensorData, Distance, Gnss } from "../models/sensorModel";
import logger from "../utils/logger";
import { s3Client } from "../services/aws";
import { GPS_VALIDATION_CONFIG, GPSCorrectionType } from "../constants/gps";
import clientModel from "../models/clientModel";
import appUserModel from "../models/appUserModel";

const MAX_ROBOT_SPEED_KMPH = 5;

/**
 * Validates and filters distance data points based on speed limits.
 * Removes points that would result in speeds exceeding MAX_ROBOT_SPEED_KMPH.
 */
const filterDistanceBySpeed = (
  distanceArray: Distance[],
  operationTime: number,
  robotId: string,
  sessionId: string
): Distance[] => {
  if (!distanceArray || distanceArray.length === 0 || !operationTime) {
    return distanceArray;
  }

  const validDistances: Distance[] = [];
  let rejectedCount = 0;
  let totalDistance = 0;

  for (let i = 0; i < distanceArray.length; i++) {
    const distanceObj = distanceArray[i];
    const point = distanceObj.data; // data is just a number

    const newTotalDistance = totalDistance + point;
    const timeElapsedHours = operationTime / 3600;
    const potentialSpeed = newTotalDistance / 1000 / timeElapsedHours;

    if (potentialSpeed <= MAX_ROBOT_SPEED_KMPH) {
      validDistances.push(distanceObj);
      totalDistance = newTotalDistance;
    } else {
      rejectedCount++;
    }
  }

  if (rejectedCount > 0) {
    logger.warn(
      `Robot ${robotId}, Session ${sessionId}: Rejected ${rejectedCount} distance points ` +
        `that would exceed ${MAX_ROBOT_SPEED_KMPH} km/h speed limit. ` +
        `Total distance ${(totalDistance / 1000).toFixed(2)} km.`
    );
  }

  return validDistances;
};

/**
 * Calculates haversine distance between two GPS coordinates
 * @param from - Starting coordinate
 * @param to - Ending coordinate
 * @returns Distance in meters
 */
function haversineDistance(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const R = GPS_VALIDATION_CONFIG.EARTH_RADIUS_METERS;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Validates if GPS point is within acceptable range of the site
 * @param gnssPoint - GPS coordinate to validate
 * @param robotId - Robot ID to fetch assigned site
 * @returns Validation result with distance from site
 */
const validateGeofence = async (
  gnssPoint: { latitude: number; longitude: number },
  robotId: string
): Promise<{
  isValid: boolean;
  distanceFromSite: number;
  siteName?: string;
}> => {
  try {
    // Fetch robot's assigned client/site through appUser
    const robot = await robotModel.findById(robotId);

    if (!robot) {
      // Robot not found - skip geofence check
      return { isValid: true, distanceFromSite: 0 };
    }

    // Find an appUser associated with this robot
    const appUser = await appUserModel.findOne({ robots: robotId });

    if (!appUser || !appUser.clientId) {
      // No client assigned - skip geofence check
      return { isValid: true, distanceFromSite: 0 };
    }

    const client = await clientModel.findById(appUser.clientId);

    if (!client || !client.location) {
      // No location data - skip geofence check
      return { isValid: true, distanceFromSite: 0 };
    }

    const siteLocation = {
      lat: client.location.lat,
      lng: client.location.lng
    };

    const pointLocation = {
      lat: gnssPoint.latitude,
      lng: gnssPoint.longitude
    };

    // Calculate distance using haversine formula
    const distanceMeters = haversineDistance(siteLocation, pointLocation);

    // Get geofence radius (use default if not set)
    const geofenceRadius =
      client.geofenceRadius ||
      GPS_VALIDATION_CONFIG.DEFAULT_GEOFENCE_RADIUS_METERS;

    return {
      isValid: distanceMeters <= geofenceRadius,
      distanceFromSite: distanceMeters,
      siteName: client.name
    };
  } catch (error) {
    logger.error("Error in geofence validation:", error);
    // On error, allow the point (fail open to avoid blocking legitimate data)
    return { isValid: true, distanceFromSite: 0 };
  }
};

/**
 * Interpolates a GPS point between two coordinates
 * @param from - Starting point
 * @param to - Target point
 * @param ratio - How far to interpolate (0-1)
 * @returns Interpolated GPS point
 */
function interpolateGPSPoint(from: Gnss, to: Gnss, ratio: number): Gnss {
  return {
    timestamp: to.timestamp, // Keep original timestamp
    latitude: from.latitude + (to.latitude - from.latitude) * ratio,
    longitude: from.longitude + (to.longitude - from.longitude) * ratio,
    speed: GPS_VALIDATION_CONFIG.MAX_ROBOT_SPEED_KMPH, // Assume max speed during interpolation
    isOutlier: true,
    correctionType: GPSCorrectionType.INTERPOLATED
  };
}

/**
 * Validates GPS speed between consecutive points
 * @param currentPoint - New GPS point
 * @param previousPoint - Last valid GPS point
 * @returns Validation result with suggested action
 */
function validateGPSSpeed(
  currentPoint: Gnss,
  previousPoint: Gnss | null
): {
  isValid: boolean;
  impliedSpeed: number;
  action: "accept" | "interpolate" | "reject";
  correctedPoint?: Gnss;
} {
  if (!previousPoint) {
    // First point - always accept
    return { isValid: true, impliedSpeed: 0, action: "accept" };
  }

  // Calculate distance between points
  const distance = haversineDistance(
    { lat: previousPoint.latitude, lng: previousPoint.longitude },
    { lat: currentPoint.latitude, lng: currentPoint.longitude }
  );

  // Calculate time difference in hours
  const timeDiffMs =
    new Date(currentPoint.timestamp).getTime() -
    new Date(previousPoint.timestamp).getTime();
  const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

  // Avoid division by zero
  if (timeDiffHours < GPS_VALIDATION_CONFIG.MIN_TIME_DIFF_SECONDS / 3600) {
    // Less than minimum time diff - accept without speed check
    return { isValid: true, impliedSpeed: 0, action: "accept" };
  }

  // Calculate implied speed in km/h
  const impliedSpeed = distance / 1000 / timeDiffHours;

  // Calculate max allowable distance
  const maxDistanceMeters =
    GPS_VALIDATION_CONFIG.MAX_ROBOT_SPEED_KMPH * timeDiffHours * 1000;

  if (impliedSpeed <= GPS_VALIDATION_CONFIG.MAX_ROBOT_SPEED_KMPH) {
    // Valid - within speed limit
    return { isValid: true, impliedSpeed, action: "accept" };
  }

  if (
    impliedSpeed >
    GPS_VALIDATION_CONFIG.MAX_ROBOT_SPEED_KMPH *
      GPS_VALIDATION_CONFIG.EXTREME_OUTLIER_MULTIPLIER
  ) {
    // Extreme outlier (>50 km/h) - reject entirely
    return {
      isValid: false,
      impliedSpeed,
      action: "reject"
    };
  }

  // Moderate outlier (5-50 km/h) - interpolate
  const ratio = maxDistanceMeters / distance;
  const correctedPoint = interpolateGPSPoint(
    previousPoint,
    currentPoint,
    ratio
  );

  return {
    isValid: false,
    impliedSpeed,
    action: "interpolate",
    correctedPoint
  };
}

/**
 * Validates if GPS point is within acceptable range of the site (synchronous version with cached data)
 * @param gnssPoint - GPS coordinate to validate
 * @param clientData - Cached client data with location and geofence settings
 * @returns Validation result with distance from site
 */
function validateGeofenceWithCache(
  gnssPoint: { latitude: number; longitude: number },
  clientData: {
    location: { lat: number; lng: number };
    geofenceRadius: number;
    name: string;
  } | null
): {
  isValid: boolean;
  distanceFromSite: number;
  siteName?: string;
} {
  // No client data - skip geofence check
  if (!clientData || !clientData.location) {
    return { isValid: true, distanceFromSite: 0 };
  }

  const siteLocation = {
    lat: clientData.location.lat,
    lng: clientData.location.lng
  };

  const pointLocation = {
    lat: gnssPoint.latitude,
    lng: gnssPoint.longitude
  };

  // Calculate distance using haversine formula
  const distanceMeters = haversineDistance(siteLocation, pointLocation);

  // Get geofence radius (use default if not set)
  const geofenceRadius =
    clientData.geofenceRadius ||
    GPS_VALIDATION_CONFIG.DEFAULT_GEOFENCE_RADIUS_METERS;

  return {
    isValid: distanceMeters <= geofenceRadius,
    distanceFromSite: distanceMeters,
    siteName: clientData.name
  };
}

/**
 * Processes and validates GPS data (for both new and historical data)
 * @param gnssArray - Array of GPS points to process
 * @param robotId - Robot ID for geofence validation
 * @param previousLastPoint - Last valid GPS point from previous session (optional)
 * @returns Processed GPS array with validation flags
 */
async function processGPSData(
  gnssArray: Gnss[],
  robotId: string,
  previousLastPoint?: Gnss | null
): Promise<Gnss[]> {
  if (!gnssArray || gnssArray.length === 0) {
    return gnssArray;
  }

  // ========== N+1 FIX: Query geofence data ONCE before loop ==========
  // Instead of querying robot/appUser/client for every GPS point (3 queries × 1000 points = 3000 queries),
  // we query once before the loop (3 queries total)
  let cachedClientData: {
    location: { lat: number; lng: number };
    geofenceRadius: number;
    name: string;
  } | null = null;

  try {
    const robot = await robotModel.findById(robotId);
    if (robot) {
      const appUser = await appUserModel.findOne({ robots: robotId });
      if (appUser && appUser.clientId) {
        const client = await clientModel.findById(appUser.clientId);
        if (client && client.location) {
          cachedClientData = {
            location: { lat: client.location.lat, lng: client.location.lng },
            geofenceRadius:
              client.geofenceRadius ||
              GPS_VALIDATION_CONFIG.DEFAULT_GEOFENCE_RADIUS_METERS,
            name: client.name
          };
        }
      }
    }
  } catch (error) {
    logger.error(`Error fetching geofence data for robot ${robotId}:`, error);
    // Continue without geofence validation if data fetch fails
  }
  // ========== END N+1 FIX ==========

  const processedGNSS: Gnss[] = [];
  let lastValidPoint: Gnss | null = previousLastPoint || null;

  for (const gnssPoint of gnssArray) {
    try {
      // Validate GPS point has required fields
      if (
        !gnssPoint ||
        typeof gnssPoint.latitude !== "number" ||
        typeof gnssPoint.longitude !== "number"
      ) {
        logger.warn(
          `Invalid GPS point structure for robot ${robotId}, skipping point`
        );
        processedGNSS.push({
          ...gnssPoint,
          isOutlier: true,
          correctionType: GPSCorrectionType.REJECTED
        });
        continue;
      }

      // Layer 1: Geofence check (now synchronous with cached data - no DB queries!)
      const geofenceResult = validateGeofenceWithCache(
        { latitude: gnssPoint.latitude, longitude: gnssPoint.longitude },
        cachedClientData
      );

      if (!geofenceResult.isValid) {
        processedGNSS.push({
          ...gnssPoint,
          isOutlier: true,
          correctionType: GPSCorrectionType.GEOFENCE_VIOLATION
        });
        continue;
      }

      // Layer 2: Speed check
      const speedResult = validateGPSSpeed(gnssPoint, lastValidPoint);

      if (speedResult.action === "accept") {
        processedGNSS.push({
          ...gnssPoint,
          isOutlier: false,
          correctionType: GPSCorrectionType.NONE
        });
        lastValidPoint = gnssPoint;
      } else if (speedResult.action === "interpolate") {
        processedGNSS.push({
          ...gnssPoint,
          isOutlier: true,
          correctionType: GPSCorrectionType.INTERPOLATED
        });

        if (speedResult.correctedPoint) {
          processedGNSS.push(speedResult.correctedPoint);
          lastValidPoint = speedResult.correctedPoint;
        }
      } else if (speedResult.action === "reject") {
        processedGNSS.push({
          ...gnssPoint,
          isOutlier: true,
          correctionType: GPSCorrectionType.REJECTED
        });
      }
    } catch (error) {
      logger.error(`Error processing GPS point for robot ${robotId}:`, error);
      // Include point as rejected outlier if processing fails
      processedGNSS.push({
        ...gnssPoint,
        isOutlier: true,
        correctionType: GPSCorrectionType.REJECTED
      });
    }
  }

  return processedGNSS;
}

export const addSensorDataToRobot = asyncHandler(async (req, res) => {
  const { metadata, timestamp, sessionInfo, ...data }: SensorData = req.body;

  if (!sessionInfo || !metadata || !timestamp) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }

  const robot = await robotModel.findById(metadata.robotId);

  if (!robot) {
    res.status(404);
    throw new Error("No robot found for the specified Id");
  }

  if (timestamp < 1e12) {
    res.status(400);
    throw new Error("Timestamp should be provided in milliseconds.");
  }

  // ========== SPEED VALIDATION AND FILTERING ==========

  // Validation 1: Filter distance array points
  if (
    data.distance &&
    Array.isArray(data.distance) &&
    sessionInfo.operationTime
  ) {
    const originalCount = data.distance.length;

    const filteredDistance = filterDistanceBySpeed(
      data.distance,
      sessionInfo.operationTime,
      metadata.robotId,
      metadata.sessionId
    );

    data.distance = filteredDistance;

    // Recalculate total distance based on filtered points
    if (data.distance && data.distance.length !== originalCount) {
      const recalculatedDistance = data.distance.reduce(
        (sum: number, distObj: Distance) => sum + distObj.data,
        0
      );

      sessionInfo.distanceTravelled = recalculatedDistance;

      logger.info(
        `Robot ${metadata.robotId}: Recalculated distance from ${originalCount} to ${data.distance.length} points. ` +
          `New total: ${(recalculatedDistance / 1000).toFixed(2)} km`
      );
    }
  }

  // Validation 2: Check and cap session-level distance
  if (sessionInfo.operationTime && sessionInfo.distanceTravelled) {
    const sessionTimeHours = sessionInfo.operationTime / 3600;
    const sessionDistanceKm = sessionInfo.distanceTravelled / 1000;

    if (sessionTimeHours > 0) {
      const sessionSpeed = sessionDistanceKm / sessionTimeHours;

      if (sessionSpeed > MAX_ROBOT_SPEED_KMPH) {
        const maxAllowedDistanceKm = MAX_ROBOT_SPEED_KMPH * sessionTimeHours;
        const maxAllowedDistanceM = maxAllowedDistanceKm * 1000;

        logger.warn(
          `Robot ${metadata.robotId}, Session ${metadata.sessionId}: ` +
            `Reported speed ${sessionSpeed.toFixed(2)} km/h exceeds limit. ` +
            `Capping distance from ${sessionDistanceKm.toFixed(
              2
            )} km to ${maxAllowedDistanceKm.toFixed(2)} km.`
        );

        logger.info(
          `Speed violation: ${sessionSpeed.toFixed(
            2
          )} km/h - Capping to ${MAX_ROBOT_SPEED_KMPH} km/h ` +
            `(${sessionDistanceKm.toFixed(
              2
            )} km to ${maxAllowedDistanceKm.toFixed(2)} km)`
        );

        sessionInfo.distanceTravelled = maxAllowedDistanceM;
      }
    }
  }

  // Validation 3: Check speed between consecutive sessions
  const previousSession = await sensorModel
    .findOne({
      "metadata.robotId": metadata.robotId,
      "metadata.sessionId": { $ne: metadata.sessionId },
      timestamp: { $lt: timestamp }
    })
    .sort({ timestamp: -1 });

  if (previousSession && sessionInfo.distanceTravelled) {
    const timeDifferenceMs = timestamp - previousSession.timestamp;
    const timeDifferenceHours = timeDifferenceMs / (1000 * 60 * 60);

    if (timeDifferenceHours > 0.0003) {
      const reportedDistanceKm = sessionInfo.distanceTravelled / 1000;
      const maxAllowedDistanceKm = MAX_ROBOT_SPEED_KMPH * timeDifferenceHours;

      if (reportedDistanceKm > maxAllowedDistanceKm) {
        const calculatedSpeed = reportedDistanceKm / timeDifferenceHours;
        const maxAllowedDistanceM = maxAllowedDistanceKm * 1000;

        logger.warn(
          `Robot ${
            metadata.robotId
          }: Inter-session speed ${calculatedSpeed.toFixed(
            2
          )} km/h exceeds limit. ` +
            `Capping distance from ${reportedDistanceKm.toFixed(
              2
            )} km to ${maxAllowedDistanceKm.toFixed(2)} km.`
        );

        logger.info(
          `Inter-session speed violation: ${calculatedSpeed.toFixed(
            2
          )} km/h - Capping to ${MAX_ROBOT_SPEED_KMPH} km/h limit`
        );

        sessionInfo.distanceTravelled = maxAllowedDistanceM;
      }
    }
  }

  // ========== END SPEED VALIDATION ==========

  const sensorData = {
    metadata,
    timestamp,
    sessionInfo,
    ...data
  };

  const findResponse = await sensorModel.find({
    "metadata.robotId": metadata.robotId,
    "metadata.sessionId": metadata.sessionId
  });

  if (findResponse.length > 0) {
    res.status(200);
    await sensorModel.deleteMany({
      "metadata.robotId": metadata.robotId,
      "metadata.sessionId": metadata.sessionId
    });
  }

  const sensorDocument = await sensorModel.create(sensorData);

  if (sensorDocument) {
    if (findResponse.length > 0) {
      res.status(200).json(sensorDocument);
    } else {
      res.status(201).json(sensorDocument);
    }
  } else {
    res.status(400);
    throw new Error("Failed to create sensor reading");
  }
});

/**
 * Fetches session events from a robot.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @throws {Error} Missing required request body parameters or failed to fetch session details.
 */
export const fetchRobotSessionsInRange = asyncHandler(async (req, res) => {
  const {
    robotId,
    startingTimestamp,
    endingTimestamp
  }: {
    robotId: string;
    startingTimestamp: number;
    endingTimestamp: number;
  } = req.body;

  if (!startingTimestamp || !endingTimestamp || !robotId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }

  // Check if timestamp is in milliseconds
  if (startingTimestamp < 1e12 || endingTimestamp < 1e12) {
    res.status(400);
    throw new Error("Timestamp should be provided in milliseconds.");
  }

  const sensorData = await sensorModel.aggregate([
    {
      $match: {
        "metadata.robotId": robotId,
        timestamp: {
          $gte: new Date(startingTimestamp),
          $lte: new Date(endingTimestamp)
        }
      }
    },
    { $sort: { timestamp: 1 } },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              firstDistanceArr: { $first: "$distance" },
              lastDistanceArr: { $last: "$distance" },
              totalOperationTime: { $sum: "$sessionInfo.operationTime" },
              totalEnergyConsumed: { $sum: "$sessionInfo.energyConsumed" },
              sumOfDistanceSnapshots: { $sum: "$sessionInfo.distanceTravelled" }
            }
          },
          {
            $project: {
              _id: 0,
              totalOperationTime: 1,
              totalEnergyConsumed: 1,
              distanceTravelled: {
                $let: {
                  vars: {
                    firstP: { $arrayElemAt: ["$firstDistanceArr.data", 0] },
                    lastP: { $arrayElemAt: ["$lastDistanceArr.data", -1] },
                    sumSnap: "$sumOfDistanceSnapshots"
                  },
                  in: {
                    $cond: {
                      if: {
                        $and: [
                          { $ne: ["$$firstP", null] },
                          { $ne: ["$$lastP", null] },
                          { $gte: [{ $subtract: ["$$lastP", "$$firstP"] }, 0] }
                        ]
                      },
                      then: { $subtract: ["$$lastP", "$$firstP"] },
                      else: { $ifNull: ["$$sumSnap", 0] }
                    }
                  }
                }
              }
            }
          }
        ],
        sessions: [
          {
            $project: {
              _id: 0,
              sessionId: "$metadata.sessionId",
              timestamp: 1,
              name: "$sessionInfo.name",
              sessionEndTimestamp: "$sessionInfo.sessionEndTimestamp"
            }
          }
        ]
      }
    },
    {
      $project: {
        totals: {
          $ifNull: [
            { $arrayElemAt: ["$totals", 0] },
            {
              distanceTravelled: 0,
              totalOperationTime: 0,
              totalEnergyConsumed: 0
            }
          ]
        },
        sessions: 1
      }
    }
  ]);

  if (sensorData && sensorData.length > 0) {
    res.status(200).json(sensorData[0]);
  } else {
    res.status(200).json({
      totals: {
        distanceTravelled: 0,
        totalOperationTime: 0,
        totalEnergyConsumed: 0
      },
      sessions: []
    });
  }
});

/**
 * Removes a sensor reading from a robot.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @throws {Error} Missing required request body parameters or failed to delete sensor reading.
 */
export const deleteSensorDataFromRobot = asyncHandler(async (req, res) => {
  const { robotId, sessionId }: { robotId: string; sessionId: string } =
    req.body;

  if (!robotId || !sessionId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  // Find the robot using the robotId from sensorData
  const robot = await robotModel.findById(robotId);

  if (!robot) {
    res.status(404);
    throw new Error("No robot found for the specified Id");
  }

  // Deletes a sensor document based on session id
  const deleteResponse = await sensorModel.deleteMany({
    "metadata.robotId": robotId,
    "metadata.sessionId": sessionId
  });

  if (deleteResponse) {
    // Return the created sensor document in the response body
    res.status(200).json(deleteResponse);
  } else {
    res.status(400);
    throw new Error("Failed to create sensor reading");
  }
});

/**
 * Fetches the distance records for a particular session.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @throws {Error} Missing required request body parameters or failed to update sensor reading.
 */
export const fetchDistanceData = asyncHandler(async (req, res) => {
  const {
    robotId,
    sessionId
  }: {
    robotId: string;
    sessionId: string;
  } = req.body;

  if (!sessionId || !robotId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  // Find the robot using the robotId from distanceData
  const robot = await robotModel.findById(robotId);

  if (!robot) {
    res.status(404);
    throw new Error("No robot found for the specified Id");
  }

  // Find the distances for the given time
  const sensorData = await sensorModel.findOne(
    {
      "metadata.robotId": robotId,
      "metadata.sessionId": sessionId,
      distance: { $exists: true, $ne: [] }
    },
    "distance metadata timestamp"
  );

  if (sensorData) {
    // Return the fetched sensor data in the response body
    res.status(200).json(sensorData.distance);
  } else {
    // Return empty array if no distances are found.
    res.status(200).json([]);
  }
});

export const fetchMMRData = asyncHandler(async (req, res) => {
  const {
    robotId,
    sessionId
  }: {
    robotId: string;
    sessionId: string;
  } = req.body;

  if (!sessionId || !robotId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  // Find the robot using the robotId from distanceData
  const robot = await robotModel.findById(robotId);

  if (!robot) {
    res.status(404);
    throw new Error("No robot found for the specified Id");
  }

  // Find the distances for the given time
  const sensorData = await sensorModel.findOne(
    {
      "metadata.robotId": robotId,
      "metadata.sessionId": sessionId,
      mmr: { $exists: true, $ne: [] }
    },
    "mmr metadata timestamp"
  );

  if (sensorData) {
    // Return the fetched sensor data in the response body
    res.status(200).json(sensorData.mmr);
  } else {
    // Return empty array if no distances are found.
    res.status(200).json([]);
  }
});

/**
 * Fetches the payload weight records for a particular session.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @throws {Error} Missing required request body parameters or failed to fetch payload weight.
 */
export const fetchPayloadWeightData = asyncHandler(async (req, res) => {
  const {
    robotId,
    sessionId
  }: {
    robotId: string;
    sessionId: string;
  } = req.body;

  if (!sessionId || !robotId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }

  const robot = await robotModel.findById(robotId);

  if (!robot) {
    res.status(404);
    throw new Error("No robot found for the specified Id");
  }

  const sensorData = await sensorModel.findOne(
    {
      "metadata.robotId": robotId,
      "metadata.sessionId": sessionId,
      payloadWeight: { $exists: true, $ne: [] }
    },
    "payloadWeight metadata timestamp"
  );

  if (sensorData) {
    res.status(200).json(sensorData.payloadWeight);
  } else {
    res.status(200).json([]);
  }
});

/**
 * Fetches the records between two timestamps.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @throws {Error} Missing required request body parameters or failed to update sensor reading.
 */
export const fetchDistanceDataInRange = asyncHandler(async (req, res) => {
  const {
    robotId,
    startingTimestamp,
    endingTimestamp
  }: {
    robotId: string;
    startingTimestamp: number;
    endingTimestamp: number;
  } = req.body;

  if (!startingTimestamp || !endingTimestamp || !robotId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  // Find the robot using the robotId from distanceData
  const robot = await robotModel.findById(robotId);

  if (!robot) {
    res.status(404);
    throw new Error("No robot found for the specified Id");
  }

  // Check if timestamp is in milliseconds
  if (startingTimestamp < 1e12 || endingTimestamp < 1e12) {
    res.status(400);
    throw new Error("Timestamp should be provided in milliseconds.");
  }

  // Calculate the starting timestamp for the day
  const startDate = new Date(startingTimestamp);
  startDate.setHours(0, 0, 0, 0);
  const startOfDay = startDate.getTime();

  // Calculate the ending timestamp for the day
  const endDate = new Date(endingTimestamp);
  endDate.setHours(0, 0, 0, 0);
  const endOfDay = endDate.getTime() + 24 * 60 * 60 * 1000;

  // Find the distances for the given time
  const sensorData = await sensorModel.find(
    {
      "metadata.robotId": robotId,
      timestamp: { $gte: startOfDay, $lte: endOfDay },
      distance: { $exists: true, $ne: [] }
    },
    "distance metadata timestamp"
  );

  if (sensorData) {
    // Return the fetched sensor data in the response body
    res.status(200).json(sensorData);
  } else {
    // Return empty array if no distances are found.
    res.status(200).json([]);
  }
});

/**
 * Fetches the records for a particular session.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @throws {Error} Missing required request body parameters or failed to update sensor reading.
 */
export const fetchGnssData = asyncHandler(async (req, res) => {
  const {
    robotId,
    sessionId
  }: {
    robotId: string;
    sessionId: string;
  } = req.body;

  if (!sessionId || !robotId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  // Find the robot using the robotId from distanceData
  const robot = await robotModel.findById(robotId);

  if (!robot) {
    res.status(404);
    throw new Error("No robot found for the specified Id");
  }

  // Find the gnss data for the given session
  const sensorData = await sensorModel.findOne(
    {
      "metadata.robotId": robotId,
      "metadata.sessionId": sessionId,
      gnss: { $exists: true, $ne: [] }
    },
    "gnss metadata timestamp"
  );

  if (sensorData && sensorData.gnss) {
    // NOTE: Returning raw GPS data without validation for this endpoint
    // Validation is available via processGPSData() function when needed
    res.status(200).json(sensorData.gnss);

    // DISABLED CODE (uncomment after fixing):
    // const previousSession = await sensorModel
    //   .findOne({
    //     "metadata.robotId": robotId,
    //     timestamp: { $lt: sensorData.timestamp },
    //     gnss: { $exists: true, $ne: [] }
    //   })
    //   .sort({ timestamp: -1 });
    // const previousLastPoint = previousSession?.gnss?.[previousSession.gnss.length - 1] || null;
    // const processedGnss = await processGPSData(sensorData.gnss, robotId, previousLastPoint);
    // res.status(200).json(processedGnss);
  } else {
    res.status(200).json([]);
  }
});

/**
 * Fetches the records between two timestamps.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @throws {Error} Missing required request body parameters or failed to update sensor reading.
 */
export const fetchGnssDataInRange = asyncHandler(async (req, res) => {
  const {
    robotId,
    startingTimestamp,
    endingTimestamp
  }: {
    robotId: string;
    startingTimestamp: number;
    endingTimestamp: number;
  } = req.body;

  if (!startingTimestamp || !endingTimestamp || !robotId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  // Find the robot using the robotId from distanceData
  const robot = await robotModel.findById(robotId);

  if (!robot) {
    res.status(404);
    throw new Error("No robot found for the specified Id");
  }

  // Check if timestamp is in milliseconds
  if (startingTimestamp < 1e12 || endingTimestamp < 1e12) {
    res.status(400);
    throw new Error("Timestamp should be provided in milliseconds.");
  }

  // Calculate the starting timestamp for the day
  const startDate = new Date(startingTimestamp);
  startDate.setHours(0, 0, 0, 0);
  const startOfDay = startDate.getTime();

  // Calculate the ending timestamp for the day
  const endDate = new Date(endingTimestamp);
  endDate.setHours(0, 0, 0, 0);
  const endOfDay = endDate.getTime() + 24 * 60 * 60 * 1000;

  // Find the sessions for the given time range
  const sensorDataArray = await sensorModel
    .find(
      {
        "metadata.robotId": robotId,
        timestamp: { $gte: startOfDay, $lte: endOfDay },
        gnss: { $exists: true, $ne: [] }
      },
      "gnss metadata timestamp"
    )
    .sort({ timestamp: 1 }); // Sort by timestamp ascending

  if (sensorDataArray && sensorDataArray.length > 0) {
    // Return sessions with original GPS data (same format as before)
    const sessions = sensorDataArray.map((session) => ({
      gnss: session.gnss,
      metadata: session.metadata,
      timestamp: session.timestamp
    }));

    res.status(200).json(sessions);
  } else {
    res.status(200).json([]);
  }
});

/**
 * Fetches the records for a particular session.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @throws {Error} Missing required request body parameters or failed to update sensor reading.
 */
export const fetchBatteryData = asyncHandler(async (req, res) => {
  const {
    robotId,
    sessionId
  }: {
    robotId: string;
    sessionId: string;
  } = req.body;

  if (!sessionId || !robotId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  // Find the robot using the robotId from distanceData
  const robot = await robotModel.findById(robotId);

  if (!robot) {
    res.status(404);
    throw new Error("No robot found for the specified Id");
  }

  // Find the battery data for the given session
  const sensorData = await sensorModel.findOne(
    {
      "metadata.robotId": robotId,
      "metadata.sessionId": sessionId,
      battery: { $exists: true, $ne: [] }
    },
    "battery metadata timestamp"
  );

  if (sensorData) {
    // Return the fetched sensor data in the response body
    res.status(200).json(sensorData.battery);
  } else {
    // Return empty array if no distances are found.
    res.status(200).json([]);
  }
});

export const fetchBatteryErrors = asyncHandler(async (req, res) => {
  const {
    robotId,
    sessionId
  }: {
    robotId: string;
    sessionId: string;
  } = req.body;

  if (!sessionId || !robotId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }

  const robot = await robotModel.findById(robotId);

  if (!robot) {
    res.status(404);
    throw new Error("No robot found for the specified Id");
  }

  const sensorData = await sensorModel.findOne(
    {
      "metadata.robotId": robotId,
      "metadata.sessionId": sessionId,
      batteryErrors: { $exists: true, $ne: {} }
    },
    "batteryErrors metadata timestamp"
  );

  if (sensorData) {
    // Return the fetched sensor data in the response body
    res.status(200).json(sensorData.batteryErrors);
  } else {
    // Return empty array if no distances are found.
    res.status(200).json({
      errorCode1: [],
      errorCode2: [],
      errorCode3: [],
      errorCode4: [],
      errorCode5: [],
      errorCode6: [],
      errorCode7: [],
      errorCode8: []
    });
  }
});

/**
 * Fetches the records between two timestamps.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @throws {Error} Missing required request body parameters or failed to update sensor reading.
 */
export const fetchBatteryDataInRange = asyncHandler(async (req, res) => {
  const {
    robotId,
    startingTimestamp,
    endingTimestamp
  }: {
    robotId: string;
    startingTimestamp: number;
    endingTimestamp: number;
  } = req.body;

  if (!startingTimestamp || !endingTimestamp || !robotId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  // Find the robot using the robotId from distanceData
  const robot = await robotModel.findById(robotId);

  if (!robot) {
    res.status(404);
    throw new Error("No robot found for the specified Id");
  }

  // Check if timestamp is in milliseconds
  if (startingTimestamp < 1e12 || endingTimestamp < 1e12) {
    res.status(400);
    throw new Error("Timestamp should be provided in milliseconds.");
  }

  // Calculate the starting timestamp for the day
  const startDate = new Date(startingTimestamp);
  startDate.setHours(0, 0, 0, 0);
  const startOfDay = startDate.getTime();

  // Calculate the ending timestamp for the day
  const endDate = new Date(endingTimestamp);
  endDate.setHours(0, 0, 0, 0);
  const endOfDay = endDate.getTime() + 24 * 60 * 60 * 1000;

  // Find the distances for the given time
  const sensorData = await sensorModel.find(
    {
      "metadata.robotId": robotId,
      timestamp: { $gte: startOfDay, $lte: endOfDay },
      battery: { $exists: true, $ne: [] }
    },
    "battery metadata timestamp"
  );

  if (sensorData) {
    // Return the fetched sensor data in the response body
    res.status(200).json(sensorData);
  } else {
    // Return empty array if no distances are found.
    res.status(200).json([]);
  }
});

/**
 * Fetches the records for a particular session.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @throws {Error} Missing required request body parameters or failed to update sensor reading.
 */
export const fetchImuData = asyncHandler(async (req, res) => {
  const {
    robotId,
    sessionId
  }: {
    robotId: string;
    sessionId: string;
  } = req.body;

  if (!sessionId || !robotId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  // Find the robot using the robotId from distanceData
  const robot = await robotModel.findById(robotId);

  if (!robot) {
    res.status(404);
    throw new Error("No robot found for the specified Id");
  }

  // Find the battery data for the given session
  const sensorData = await sensorModel.findOne(
    {
      "metadata.robotId": robotId,
      "metadata.sessionId": sessionId,
      imu: { $exists: true, $ne: [] }
    },
    "imu metadata timestamp"
  );

  if (sensorData) {
    // Return the fetched sensor data in the response body
    res.status(200).json(sensorData.imu);
  } else {
    // Return empty array if no distances are found.
    res.status(200).json([]);
  }
});

/**
 * Fetches the records between two timestamps.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @throws {Error} Missing required request body parameters or failed to update sensor reading.
 */
export const fetchImuDataInRange = asyncHandler(async (req, res) => {
  const {
    robotId,
    startingTimestamp,
    endingTimestamp
  }: {
    robotId: string;
    startingTimestamp: number;
    endingTimestamp: number;
  } = req.body;

  if (!startingTimestamp || !endingTimestamp || !robotId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  // Find the robot using the robotId from distanceData
  const robot = await robotModel.findById(robotId);

  if (!robot) {
    res.status(404);
    throw new Error("No robot found for the specified Id");
  }

  // Check if timestamp is in milliseconds
  if (startingTimestamp < 1e12 || endingTimestamp < 1e12) {
    res.status(400);
    throw new Error("Timestamp should be provided in milliseconds.");
  }

  // Calculate the starting timestamp for the day
  const startDate = new Date(startingTimestamp);
  startDate.setHours(0, 0, 0, 0);
  const startOfDay = startDate.getTime();

  // Calculate the ending timestamp for the day
  const endDate = new Date(endingTimestamp);
  endDate.setHours(0, 0, 0, 0);
  const endOfDay = endDate.getTime() + 24 * 60 * 60 * 1000;

  // Find the distances for the given time
  const sensorData = await sensorModel.find(
    {
      "metadata.robotId": robotId,
      timestamp: { $gte: startOfDay, $lte: endOfDay },
      imu: { $exists: true, $ne: [] }
    },
    "imu metadata timestamp"
  );

  if (sensorData) {
    // Return the fetched sensor data in the response body
    res.status(200).json(sensorData);
  } else {
    // Return empty array if no distances are found.
    res.status(200).json([]);
  }
});

/**
 * Fetches the records between two timestamps.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @throws {Error} Missing required request body parameters or failed to update sensor reading.
 */
export const fetchSensorDataInRange = asyncHandler(async (req, res) => {
  const {
    robotId,
    startingTimestamp,
    endingTimestamp
  }: {
    robotId: string;
    startingTimestamp: number;
    endingTimestamp: number;
  } = req.body;

  if (!startingTimestamp || !endingTimestamp || !robotId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  // Find the robot using the robotId from distanceData
  const robot = await robotModel.findById(robotId);

  if (!robot) {
    res.status(404);
    throw new Error("No robot found for the specified Id");
  }

  // Check if timestamp is in milliseconds
  if (startingTimestamp < 1e12 || endingTimestamp < 1e12) {
    res.status(400);
    throw new Error("Timestamp should be provided in milliseconds.");
  }

  // Calculate the starting timestamp for the day
  const startDate = new Date(startingTimestamp);
  startDate.setHours(0, 0, 0, 0);
  const startOfDay = startDate.getTime();

  // Calculate the ending timestamp for the day
  const endDate = new Date(endingTimestamp);
  endDate.setHours(0, 0, 0, 0);
  const endOfDay = endDate.getTime() + 24 * 60 * 60 * 1000;

  // Find the distances for the given time
  const sensorData = await sensorModel.find({
    "metadata.robotId": robotId,
    timestamp: { $gte: startOfDay, $lte: endOfDay }
  });

  if (sensorData) {
    // Return the fetched sensor data in the response body
    res.status(200).json(sensorData);
  } else {
    // Return empty array if no distances are found.
    res.status(200).json([]);
  }
});

/**
 * Fetches video feed data between two timestamps.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @throws {Error} Missing required request body parameters or failed to update sensor reading.
 */
export const fetchVideoFeedData = asyncHandler(async (req, res) => {
  const {
    robotId,
    sessionId
  }: {
    robotId: string;
    sessionId: string;
  } = req.body;

  if (!sessionId || !robotId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  // Find the robot using the robotId from distanceData
  const robot = await robotModel.findById(robotId);

  if (!robot) {
    res.status(404);
    throw new Error("No robot found for the specified Id");
  }

  const sensorData = (await sensorModel.findOne({
    "metadata.robotId": robotId,
    "metadata.sessionId": sessionId
  })) as SensorData;
  if (sensorData) {
    const videoUrlPromises = sensorData.sessionInfo.videos.map(
      async (video) => {
        const keyParts = video.key.split("/");
        const [part, name] = keyParts.slice(-2);

        const getObjectCommand = new GetObjectCommand({
          Bucket: video.bucket,
          Key: video.key
        });
        const videoUrl = await getSignedUrl(s3Client, getObjectCommand, {
          expiresIn: 3600
        });
        return {
          name,
          part,
          videoUrl,
          startTimestamp: video.startTimestamp ?? sensorData.timestamp,
          endTimestamp: video.endTimestamp
        };
      }
    );
    const videoUrls = await Promise.all(videoUrlPromises);

    // Return the fetched sensor data in the response body
    res.status(200).json(videoUrls);
  } else {
    res.status(200).json([]);
  }
});

type VideoUrl = { key: string; url: string; createdTimestamp: number };
/**
 * Fetches video feed data between two timestamps.
 *
 ** @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @throws {Error} Missing required request body parameters or failed to update sensor reading.
 */
export const fetchVideoFeedInRange = asyncHandler(async (req, res) => {
  const {
    robotId,
    startingTimestamp,
    endingTimestamp
  }: {
    robotId: string;
    startingTimestamp: number;
    endingTimestamp: number;
  } = req.body;

  if (!startingTimestamp || !endingTimestamp || !robotId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  // Find the robot using the robotId from distanceData
  const robot = await robotModel.findById(robotId);

  if (!robot) {
    res.status(404);
    throw new Error("No robot found for the specified Id");
  }

  // Check if timestamp is in milliseconds
  if (startingTimestamp < 1e12 || endingTimestamp < 1e12) {
    res.status(400);
    throw new Error("Timestamp should be provided in milliseconds.");
  }

  // Calculate the starting timestamp for the day
  const startDate = new Date(startingTimestamp);
  startDate.setHours(0, 0, 0, 0);
  const startOfDay = startDate.getTime();

  // Calculate the ending timestamp for the day
  const endDate = new Date(endingTimestamp);
  endDate.setHours(0, 0, 0, 0);
  const endOfDay = endDate.getTime() + 24 * 60 * 60 * 1000;

  const listObjectsCommand = new ListObjectsV2Command({
    Bucket: "flo-robot-data",
    Prefix: `${robotId}/video/`
  });
  try {
    let isTruncated = true;
    const videoData: { key: string; createdTimestamp: number }[] = [];
    while (isTruncated) {
      const { Contents, IsTruncated, NextContinuationToken } =
        // eslint-disable-next-line no-await-in-loop
        await s3Client.send(listObjectsCommand);
      Contents?.forEach((entry) => {
        if (entry.Key) {
          // Converting timestamps from microsecond to ms
          const splitData = entry.Key.split("-");
          const timestamp = Math.floor(
            Number(entry.Key.split("-")[splitData.length - 3]) / 1000
          );
          videoData.push({ key: entry.Key, createdTimestamp: timestamp });
        }
      });
      isTruncated = IsTruncated ?? false;
      listObjectsCommand.input.ContinuationToken = NextContinuationToken;
    }

    const videoUrlsPromises = videoData
      .filter(
        ({ createdTimestamp }) =>
          createdTimestamp >= startOfDay && createdTimestamp <= endOfDay
      )
      .map(async ({ key, createdTimestamp }): Promise<VideoUrl> => {
        const getObjectCommand = new GetObjectCommand({
          Bucket: "flo-robot-data",
          Key: key
        });

        const videoUrl = await getSignedUrl(s3Client, getObjectCommand, {
          expiresIn: 3600
        });

        return { key, url: videoUrl, createdTimestamp };
      });

    const videoUrls: VideoUrl[] = await Promise.all(videoUrlsPromises);

    const videoUrlsRecord: Record<number, VideoUrl[]> = {};

    videoUrls.forEach((videoUrl: VideoUrl) => {
      if (!videoUrlsRecord[videoUrl.createdTimestamp]) {
        videoUrlsRecord[videoUrl.createdTimestamp] = []; // Initialize the array if it doesn't exist
      }
      videoUrlsRecord[videoUrl.createdTimestamp].push(videoUrl);
    });

    // Return the fetched sensor data in the response body
    res.status(200).json(videoUrlsRecord);
  } catch (err: any) {
    logger.error(err.message);
  }
});

/**
 * Fetches processed sessionInfo data.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @throws {Error} Missing required request body parameters or failed to update sensor reading.
 */
export const fetchProcessedSessionData = asyncHandler(async (req, res) => {
  const {
    robotId,
    startingTimestamp,
    endingTimestamp
  }: {
    robotId: string;
    startingTimestamp: number;
    endingTimestamp: number;
  } = req.body;

  if (!startingTimestamp || !endingTimestamp || !robotId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  // Find the robot using the robotId from distanceData
  const robot = await robotModel.findById(robotId);

  if (!robot) {
    res.status(404);
    throw new Error("No robot found for the specified Id");
  }

  // Check if timestamp is in milliseconds
  if (startingTimestamp < 1e12 || endingTimestamp < 1e12) {
    res.status(400);
    throw new Error("Timestamp should be provided in milliseconds.");
  }

  // Calculate the starting timestamp for the day
  const startDate = new Date(startingTimestamp);
  startDate.setHours(0, 0, 0, 0);
  const startOfDay = startDate.getTime();

  // Calculate the ending timestamp for the day
  const endDate = new Date(endingTimestamp);
  endDate.setHours(0, 0, 0, 0);
  const endOfDay = endDate.getTime() + 24 * 60 * 60 * 1000;

  const sensorData = await sensorModel.aggregate([
    {
      $match: {
        "metadata.robotId": robotId,
        timestamp: { $gte: new Date(startOfDay), $lte: new Date(endOfDay) }
      }
    },
    {
      $project: {
        distance: "$sessionInfo.distance",
        operationTime: "$sessionInfo.operationTime",
        energyConsumed: "$sessionInfo.energyConsumed"
      }
    },
    // To sum all distances
    {
      $group: {
        _id: null,
        totalDistance: { $sum: "$distance" },
        totalOperationTime: { $sum: "$operationTime" },
        totalEnergyConsumed: { $sum: "$energyConsumed" }
      }
    },
    {
      $project: {
        _id: 0,
        totalDistance: 1,
        totalOperationTime: 1,
        totalEnergyConsumed: 1
      }
    }
  ]);

  if (sensorData) {
    // Return the fetched sensor data in the response body
    res.status(200).json(sensorData[0]);
  } else {
    // Return empty array if no distances are found.
    res.status(200).json([]);
  }
});

export const getPresignedUrl = asyncHandler(async (req, res) => {
  const { Key, ContentType, Bucket } = req.body;
  if (!Key || !ContentType || !Bucket) {
    res.status(400);
    throw new Error("Missing request body parameters");
  }

  const putObjectCommand = new PutObjectCommand({
    Bucket,
    Key,
    ContentType
  });

  const uploadUrl = await getSignedUrl(s3Client, putObjectCommand, {
    expiresIn: 3600
  });

  res.json(uploadUrl);
});
