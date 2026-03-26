import asyncHandler from "express-async-handler";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import mongoose from "mongoose";

// Extend dayjs with timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

import appUserModel from "../models/appUserModel";
import attendanceModel, {
  AttendanceData,
  AttendanceMetaData
} from "../models/attendanceModel";
import logger from "../utils/logger";
import clientModel from "../models/clientModel";
import robotModel from "../models/robotModel";
import { timeDifferenceInMinutes } from "../utils/date";
import { masterDataCacheService } from "../services/masterDataCacheService";
import { refreshOperatorOperationalSnapshots } from "../services/robotOperationalSnapshotService";
import OvertimeRequestModel from "../models/overtimeRequestModel";
import { emailQueue } from "../queues/emailQueue";
import { pushNotificationQueue } from "../queues/pushNotificationQueue";

/**
 * Refresh operational snapshots for all robots currently associated with an operator.
 * This keeps targeted staffing and cycle-efficiency derived data fresh after attendance changes.
 *
 * @param operatorId - Operator whose associated robot snapshots should be recomputed
 * @param reason - Log context for the refresh trigger
 * @returns Promise that resolves after best-effort refresh
 */
const refreshOperationalSnapshotsForOperator = async (
  operatorId: string,
  reason: string
): Promise<void> => {
  try {
    const refreshedSnapshots = await refreshOperatorOperationalSnapshots(
      operatorId,
      reason
    );

    logger.info(
      `[AttendanceOperationalSnapshot] Refreshed ${refreshedSnapshots.size} robot snapshots for operator ${operatorId} after ${reason}`
    );
  } catch (error) {
    logger.error(
      `[AttendanceOperationalSnapshot] Failed to refresh robot snapshots for operator ${operatorId} after ${reason}: ${error}`
    );
  }
};

export const fetchAttendance = asyncHandler(async (req, res) => {
  const { operatorId, startingTimestamp, endingTimestamp } = req.body;

  if (!operatorId || !startingTimestamp || !endingTimestamp) {
    res.status(400);
    throw new Error("Missing required request parameters");
  }

  const attendanceAggr = await attendanceModel.aggregate([
    {
      $match: {
        "metadata.operatorId": operatorId,
        startingTimestamp: {
          $gte: new Date(startingTimestamp),
          $lte: new Date(endingTimestamp)
        }
      }
    },
    {
      $addFields: {
        entryType: "$metadata.entryType"
      }
    },
    {
      $project: {
        metadata: false,
        __v: false
      }
    },
    {
      $facet: {
        attendanceData: [],
        totalAttended: [
          {
            $match: {
              $or: [{ entryType: "checkIn" }, { entryType: "attendance" }]
            }
          }
        ],
        totalOnTime: [
          {
            $match: {
              $or: [{ entryType: "checkIn" }, { entryType: "attendance" }],
              checkInStatus: {
                $ne: "late"
              }
            }
          }
        ]
      }
    }
  ]);

  const { attendanceData, totalAttended, totalOnTime } = attendanceAggr[0];

  if (attendanceData && totalAttended && totalOnTime) {
    res.json({
      attendanceData,
      totalAttended: totalAttended.length,
      totalOnTime: totalOnTime.length
    });
  } else {
    res.status(400);
    throw new Error(
      "Unable to fetch attendance entries, Please try again later"
    );
  }
});

export const fetchAllAttendance = asyncHandler(async (req, res) => {
  const { startingTimestamp, endingTimestamp } = req.body;

  if (!startingTimestamp || !endingTimestamp) {
    res.status(400);
    throw new Error("Missing required parameter");
  }
  const { user } = req;

  if (!user) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  const { clients } = user;

  const attendanceAggr = await attendanceModel.aggregate([
    {
      $match: {
        startingTimestamp: {
          $gte: new Date(startingTimestamp),
          $lte: new Date(endingTimestamp)
        },
        "metadata.clientId": {
          // @ts-ignore
          $in: clients.map((client) => client.toString())
        }
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
        checkInStatus: 1,
        clientName: 1,
        operatorName: 1,
        entryType: "$metadata.entryType",
        timestamp: "$startingTimestamp",
        id: "$_id"
      }
    }
  ]);

  if (!attendanceAggr) {
    res.status(500);
    throw new Error("Error fetching attendance");
  }
  res.json(attendanceAggr);
});

export const handleOperatorCheckIn = asyncHandler(async (req, res) => {
  const { operatorId, clientId, checkInTimestamp, startOfDay, location, isOvertimeSession, overtimeRequestId } =
    req.body;

  if (
    !operatorId ||
    !clientId ||
    !checkInTimestamp ||
    !startOfDay ||
    !location
  ) {
    res.status(400);
    throw new Error("Missing required request parameters");
  }

  // If this is an overtime session, validate the request
  let overtimeRequest = null;
  if (isOvertimeSession) {
    if (!overtimeRequestId) {
      res.status(400);
      throw new Error("Overtime request ID is required for overtime check-in");
    }

    overtimeRequest = await OvertimeRequestModel.findById(overtimeRequestId);
    if (!overtimeRequest) {
      res.status(404);
      throw new Error("Overtime request not found");
    }

    if (overtimeRequest.status !== "approved") {
      res.status(400);
      throw new Error("Overtime request has not been approved");
    }

    if (overtimeRequest.operatorId !== operatorId) {
      res.status(403);
      throw new Error("This overtime request belongs to a different operator");
    }

    // Check if approval has expired
    if (overtimeRequest.expiresAt && new Date() > overtimeRequest.expiresAt) {
      res.status(400);
      throw new Error("Overtime approval has expired. Please request new approval.");
    }

    // Check if this approval has already been used
    if (overtimeRequest.overtimeSessionId) {
      res.status(400);
      throw new Error("This overtime approval has already been used");
    }

    // Check if operator already has an active overtime session
    const activeOTSession = await attendanceModel.findOne({
      "metadata.operatorId": operatorId,
      "metadata.entryType": "checkIn",
      isOvertimeSession: true,
      overtimeEndTime: { $exists: false }
    });

    if (activeOTSession) {
      res.status(400);
      throw new Error("You already have an active overtime session");
    }

    logger.info(`Overtime check-in initiated for operator ${operatorId}, request ${overtimeRequestId}`);
  }

  // Validate location object structure
  if (
    typeof location !== "object" ||
    typeof location.lat !== "number" ||
    typeof location.lng !== "number"
  ) {
    res.status(400);
    throw new Error("Invalid location format. Location must include lat and lng coordinates");
  }

  // Validate location coordinates are within valid ranges
  if (
    location.lat < -90 ||
    location.lat > 90 ||
    location.lng < -180 ||
    location.lng > 180
  ) {
    res.status(400);
    throw new Error("Invalid location coordinates. Latitude must be between -90 and 90, longitude between -180 and 180");
  }

  const now = Date.now();

  // Prevent datetime tampering
  if (Math.abs(now - checkInTimestamp) > 5 * 60 * 1000) {
    const operator = await appUserModel.findById(operatorId);
    const minutesDiff = dayjs.duration(Math.abs(now - checkInTimestamp)).asMinutes();
    logger.error(
      `Time mistmatch of ${minutesDiff.toFixed(1)}min by ${operator ? operator.name : operatorId}`
    );
    res.status(409);
    throw new Error(`Time mismatch detected: Your device time is ${minutesDiff.toFixed(0)} minutes off. Please sync your device time with network time and try again.`);
  }

  // Check in status
  const client = await clientModel.findById(clientId);

  if (!client) {
    res.status(404);
    throw new Error("Client not found");
  }

  if (!client.checkInTimeWithZone) {
    res.status(500);
    throw new Error("Check in time for the client has not been set");
  }

  // Validate checkInTimeWithZone format
  const checkInParts = client.checkInTimeWithZone.split(",");
  if (checkInParts.length !== 2) {
    logger.error(
      `Invalid checkInTimeWithZone format for client ${clientId}: ${client.checkInTimeWithZone}`
    );
    res.status(500);
    throw new Error(
      "Client check-in time configuration is invalid. Please contact administrator."
    );
  }

  const [clientCheckInTime, clientTimezone] = checkInParts;

  // Validate operator is still employed (active) before allowing check-in
  const operator = await appUserModel.findById(operatorId).select("isActive name");
  if (!operator) {
    res.status(404);
    throw new Error("Operator not found");
  }

  // Validate timezone and time format
  let operatorCheckIn: string;
  let checkInStatus: "early" | "ontime" | "late" = "early";

  try {
    operatorCheckIn = dayjs(checkInTimestamp)
      .tz(clientTimezone)
      .format("HH:mm:ss");

    // Additional validation: check if timezone is valid
    if (!operatorCheckIn || operatorCheckIn === "Invalid Date") {
      throw new Error("Invalid timezone");
    }

    const diffInMinutes = timeDifferenceInMinutes(
      operatorCheckIn,
      clientCheckInTime
    );

    if (diffInMinutes > 0) {
      checkInStatus = "early";
    } else if (diffInMinutes <= 0 && diffInMinutes >= -5) {
      checkInStatus = "ontime";
    } else {
      checkInStatus = "late";
    }
  } catch (error) {
    logger.error(
      `Timezone conversion error for client ${clientId}, timezone: ${clientTimezone}, error: ${error}`
    );
    res.status(500);
    throw new Error(
      "Unable to process check-in time. Client timezone configuration may be invalid."
    );
  }

  // Send late check-in email notification if operator is late
  if (checkInStatus === "late") {
    try {
      const diffInMinutes = Math.abs(timeDifferenceInMinutes(operatorCheckIn, clientCheckInTime));

      const emailBody = `Late Check-In Alert

Operator: ${operator.name}
Client: ${client.name}
Expected Check-In Time: ${clientCheckInTime}
Actual Check-In Time: ${operatorCheckIn}
Late By: ${diffInMinutes} minutes

Please review this late check-in and take appropriate action if needed.`;

      await emailQueue.add("late-check-in", {
        to: "tahir@flomobility.com",
        cc: "contact@flomobility.com",
        subject: `Late Check-In Alert - ${operator.name} at ${client.name}`,
        body: emailBody
      });

      logger.info(`[LateCheckIn] Email notification sent for operator ${operatorId} - late by ${diffInMinutes} minutes`);
    } catch (emailError: any) {
      logger.error(`[LateCheckIn] Failed to send late check-in email: ${emailError.message}`);
      // Don't fail the check-in if email fails
    }
  }

  if (operator.isActive === false) {
    res.status(403);
    throw new Error(
      `Operator account is inactive. Please contact your administrator to reactivate your account.`
    );
  }

  // Check if operator has an open session from a previous day (not checked out)
  // IMPORTANT: Only check the MOST RECENT session (yesterday). Older sessions are handled by admin via WhatsApp/force-close tool
  // NEW: Auto-close sessions >24 hours old, allow check-in if >18 hours old
  const previousDayStart = dayjs(startOfDay).subtract(1, "day").startOf("day").valueOf();
  const previousCheckIn = await attendanceModel.findOne({
    "metadata.operatorId": operatorId,
    "metadata.clientId": clientId,
    "metadata.entryType": "checkIn",
    startingTimestamp: {
      $lt: startOfDay // Before today
    }
  }).sort({ startingTimestamp: -1 }).limit(1);

  if (previousCheckIn) {
    const hoursSincePreviousCheckIn = (checkInTimestamp - previousCheckIn.startingTimestamp) / (1000 * 60 * 60);

    // Check if it's an overtime session
    if (previousCheckIn.isOvertimeSession) {
      // For overtime sessions, check BOTH overtimeEndTime AND separate check-out entries
      // (force-close creates separate check-out entries, while normal checkout updates overtimeEndTime)
      if (!previousCheckIn.overtimeEndTime) {
        // Check if there's a separate overtime check-out entry
        const previousOvertimeCheckOut = await attendanceModel.findOne({
          "metadata.operatorId": operatorId,
          "metadata.clientId": clientId,
          "metadata.entryType": "checkOut",
          isOvertimeSession: true,
          startingTimestamp: {
            $gte: previousCheckIn.startingTimestamp,
            $lt: startOfDay
          }
        });

        if (!previousOvertimeCheckOut) {
          // SMARTER SESSION DETECTION: Auto-close or allow based on age
          if (hoursSincePreviousCheckIn >= 24) {
            // Auto-close sessions >24 hours old
            const overtimeStartMs = new Date(previousCheckIn.overtimeStartTime || previousCheckIn.startingTimestamp).getTime();
            const approvedDuration = previousCheckIn.overtimeApprovedDuration || 2;
            const forcedCheckOutTime = overtimeStartMs + (approvedDuration * 60 * 60 * 1000);
            const overtimeDurationHours = (forcedCheckOutTime - overtimeStartMs) / (1000 * 60 * 60);
            const overtimeCost = overtimeDurationHours * HOURLY_RATE * OT_RATE_MULTIPLIER;

            await attendanceModel.create({
              metadata: {
                operatorId,
                clientId,
                entryType: "checkOut"
              },
              startingTimestamp: forcedCheckOutTime,
              location: client.location || previousCheckIn.location,
              isOvertimeSession: true,
              overtimeRequestId: previousCheckIn.overtimeRequestId,
              overtimeApprovedDuration: approvedDuration,
              overtimeActualDuration: overtimeDurationHours,
              overtimeStartTime: new Date(overtimeStartMs),
              overtimeEndTime: new Date(forcedCheckOutTime),
              overtimeCost: overtimeCost,
              autoCheckedOut: true,
              autoCheckOutReason: "Auto-closed (>24h old) during new check-in",
              autoCheckOutTime: new Date()
            });
            logger.info(`[AutoClose] Overtime session >24h old auto-closed for operator ${operatorId}, age: ${hoursSincePreviousCheckIn.toFixed(1)}h`);
          } else if (hoursSincePreviousCheckIn >= 18) {
            // Allow check-in if >18 hours (likely forgotten checkout, but not old enough to auto-close)
            logger.warn(`[SmartSession] Allowing check-in despite unclosed overtime session (${hoursSincePreviousCheckIn.toFixed(1)}h old) for operator ${operatorId}`);
          } else {
            // Recent session (<18 hours) - genuine issue, block check-in
            const previousDate = dayjs(previousCheckIn.startingTimestamp).format("MMM D, YYYY");
            res.status(400);
            throw new Error(`Previous shift still open: You checked in on ${previousDate} but didn't check out. Please use the 'Close Previous Session' button on the attendance screen, then try checking in again.`);
          }
        }
      }
    } else {
      // For regular sessions, check if there's a matching check-out
      const previousCheckOut = await attendanceModel.findOne({
        "metadata.operatorId": operatorId,
        "metadata.clientId": clientId,
        "metadata.entryType": "checkOut",
        startingTimestamp: {
          $gte: previousCheckIn.startingTimestamp,
          $lt: startOfDay
        }
      });

      if (!previousCheckOut) {
        // SMARTER SESSION DETECTION: Auto-close or allow based on age
        if (hoursSincePreviousCheckIn >= 24) {
          // Auto-close sessions >24 hours old
          const shiftHours = client.operatingHours || 8;
          const forcedCheckOutTime = previousCheckIn.startingTimestamp + (shiftHours * 60 * 60 * 1000);

          await attendanceModel.create({
            metadata: {
              operatorId,
              clientId,
              entryType: "checkOut"
            },
            startingTimestamp: forcedCheckOutTime,
            location: client.location || previousCheckIn.location,
            autoCheckedOut: true,
            autoCheckOutReason: "Auto-closed (>24h old) during new check-in",
            autoCheckOutTime: new Date()
          });
          logger.info(`[AutoClose] Regular session >24h old auto-closed for operator ${operatorId}, age: ${hoursSincePreviousCheckIn.toFixed(1)}h`);
        } else if (hoursSincePreviousCheckIn >= 18) {
          // Allow check-in if >18 hours (likely forgotten checkout, but not old enough to auto-close)
          logger.warn(`[SmartSession] Allowing check-in despite unclosed session (${hoursSincePreviousCheckIn.toFixed(1)}h old) for operator ${operatorId}`);
        } else {
          // Recent session (<18 hours) - genuine issue, block check-in
          const previousDate = dayjs(previousCheckIn.startingTimestamp).format("MMM D, YYYY");
          res.status(400);
          throw new Error(`Previous shift still open: You checked in on ${previousDate} but didn't check out. Please use the 'Close Previous Session' button on the attendance screen, then try checking in again.`);
        }
      }
    }
  }

  const metadata: AttendanceMetaData = {
    clientId,
    operatorId,
    entryType: "checkIn"
  };

  // Check for existing check-in based on session type
  // BUSINESS RULE:
  // - Regular shifts: Only ONE check-in allowed per day
  // - Overtime sessions: MULTIPLE check-ins allowed per day (requires separate approvals)
  const checkInQuery: any = {
    "metadata.operatorId": operatorId,
    "metadata.clientId": clientId,
    "metadata.entryType": "checkIn",
    startingTimestamp: {
      $gte: startOfDay,
      $lte: checkInTimestamp
    }
  };

  // If this is a regular check-in (not overtime), exclude overtime sessions from the check
  // This allows operators to check in for overtime AFTER their regular shift
  if (!isOvertimeSession) {
    checkInQuery.isOvertimeSession = { $ne: true };
  }

  // If this is an overtime check-in, only check for OTHER overtime sessions
  // (Regular check-in validation already handled above)
  if (isOvertimeSession) {
    checkInQuery.isOvertimeSession = true;
    // Each overtime approval is unique, so check if THIS SPECIFIC approval was already used
    // This is already validated above (lines 238-241), but double-check here for safety
  }

  const alreadyCheckedIn = (await attendanceModel.find(checkInQuery)) as AttendanceData[];

  if (alreadyCheckedIn.length) {
    // For regular check-ins: Operator already checked in today
    // For overtime check-ins: Operator is trying to use the same approval twice (should never happen)
    // Update robot snapshots to ensure consistency
    // (No need to modify isActive - that's employment status, not attendance)

    // Get the operator's full details to build/update snapshot
    const operatorWithClient = await appUserModel.findById(operatorId).populate({
      path: "clientId",
      select: "id name location operatingHours"
    });

    if (operatorWithClient) {
      const operatorIdStr = operatorId.toString();
      const checkInTime = new Date(checkInTimestamp);

      // Build the full operator snapshot
      const operatorSnapshot = {
        id: operatorIdStr,
        name: operatorWithClient.name,
        phoneNumber: operatorWithClient.phoneNumber,
        checkedInToday: true,
        lastCheckInTime: checkInTime
      };

      // Build client snapshot if operator has a client
      const clientData = operatorWithClient.clientId as any;
      const clientSnapshot = clientData ? {
        id: clientData.id || clientData._id?.toString(),
        name: clientData.name,
        location: clientData.location,
        operatingHours: clientData.operatingHours
      } : undefined;

      // Update robots where this operator is assigned
      // Match by: activeOperator field OR operatorSnapshot.id OR in appUsers array
      // Note: appUsers stores ObjectIds, so we need to convert operatorId string to ObjectId
      const operatorObjectId = new mongoose.Types.ObjectId(operatorId);
      const robotUpdateResult = await robotModel.updateMany(
        {
          $or: [
            { activeOperator: operatorObjectId },
            { "operatorSnapshot.id": operatorIdStr },
            { appUsers: operatorObjectId }
          ]
        },
        {
          $set: {
            operatorSnapshot,
            ...(clientSnapshot && { clientSnapshot })
          }
        }
      );
      logger.info(`Updated checkedInToday for ${robotUpdateResult.modifiedCount} robots for operator ${operatorId} (already checked in)`);
    }

    // INVALIDATE MASTER DATA CACHE
    await masterDataCacheService.invalidateCache(`operator ${operatorId} already checked in (snapshot updated)`);
    await refreshOperationalSnapshotsForOperator(
      operatorId,
      "already checked in"
    );

    res.status(200).json({
      operatorId: alreadyCheckedIn[0].metadata.operatorId,
      checkInTimestamp: alreadyCheckedIn[0].startingTimestamp,
      checkInStatus: alreadyCheckedIn[0].checkInStatus
    });
    return;
  }

  const attendanceData: any = {
    metadata,
    checkInStatus,
    location,
    startingTimestamp: checkInTimestamp
  };

  // Add overtime fields if this is an overtime session
  if (isOvertimeSession && overtimeRequest) {
    attendanceData.isOvertimeSession = true;
    attendanceData.overtimeRequestId = overtimeRequestId;
    attendanceData.overtimeApprovedDuration = overtimeRequest.approvedDuration || overtimeRequest.requestedDuration;
    attendanceData.overtimeStartTime = new Date(checkInTimestamp);
  }

  const attendanceEntry = await attendanceModel.create(attendanceData);

  if (attendanceEntry) {
    // If overtime session, link the session ID back to the request
    if (isOvertimeSession && overtimeRequest) {
      overtimeRequest.overtimeSessionId = attendanceEntry._id.toString();
      await overtimeRequest.save();
      logger.info(`Linked overtime session ${attendanceEntry._id} to request ${overtimeRequestId}`);
    }
    // Check-in successful - now update robot snapshots
    // NOTE: We do NOT modify isActive here - that's employment status, not attendance
    logger.info(`Operator ${operatorId} checked in successfully at client ${clientId}`);

    // Update operatorSnapshot.checkedInToday on robots where this operator is active
    // Get the operator's full details to build/update snapshot
    const operatorWithClient = await appUserModel.findById(operatorId).populate({
      path: "clientId",
      select: "id name location operatingHours"
    });

    if (operatorWithClient) {
      const operatorIdStr = operatorId.toString();
      const checkInTime = new Date(checkInTimestamp);

      // Build the full operator snapshot
      const operatorSnapshot = {
        id: operatorIdStr,
        name: operatorWithClient.name,
        phoneNumber: operatorWithClient.phoneNumber,
        checkedInToday: true,
        lastCheckInTime: checkInTime
      };

      // Build client snapshot if operator has a client
      const clientData = operatorWithClient.clientId as any;
      const clientSnapshot = clientData ? {
        id: clientData.id || clientData._id?.toString(),
        name: clientData.name,
        location: clientData.location,
        operatingHours: clientData.operatingHours
      } : undefined;

      // Update robots where this operator is assigned
      // Match by: activeOperator field OR operatorSnapshot.id OR in appUsers array
      // Note: appUsers stores ObjectIds, so we need to convert operatorId string to ObjectId
      // This ensures operatorSnapshot is created/updated for all robots this operator works with
      const operatorObjectId = new mongoose.Types.ObjectId(operatorId);
      const robotUpdateResult = await robotModel.updateMany(
        {
          $or: [
            { activeOperator: operatorObjectId },
            { "operatorSnapshot.id": operatorIdStr },
            { appUsers: operatorObjectId }
          ]
        },
        {
          $set: {
            operatorSnapshot,
            ...(clientSnapshot && { clientSnapshot })
          }
        }
      );
      logger.info(`Updated checkedInToday for ${robotUpdateResult.modifiedCount} robots for operator ${operatorId}`);

      // Schedule shift-end notification
      try {
        let shiftDurationHours: number;
        let shiftType: string;

        if (isOvertimeSession && overtimeRequest) {
          // For overtime: use approved duration
          shiftDurationHours = overtimeRequest.approvedDuration || overtimeRequest.requestedDuration || 2;
          shiftType = "overtime";
        } else {
          // For regular shift: use client operating hours
          shiftDurationHours = client.operatingHours || 8;
          shiftType = "regular";
        }

        const shiftEndTime = checkInTimestamp + (shiftDurationHours * 60 * 60 * 1000);
        const delayMs = shiftEndTime - Date.now();

        // Only schedule if shift end is in the future (not already passed)
        if (delayMs > 0) {
          // Get operator's robot IDs for push notification
          const operatorRobots = operatorWithClient.robots || [];

          if (operatorRobots.length > 0) {
            await Promise.all(
              operatorRobots.map(async (robotId) => {
                await pushNotificationQueue.add(
                  "pushNotification",
                  {
                    title: "Shift Time Complete",
                    body: `Your ${shiftType} shift of ${shiftDurationHours} hours is complete. Please check out when ready.`,
                    robotId: robotId.toString(),
                    type: "shift-end",
                    data: {
                      type: "shift-end",
                      shiftType,
                      checkInTimestamp: checkInTimestamp.toString(),
                      shiftDurationHours: shiftDurationHours.toString()
                    }
                  },
                  {
                    delay: delayMs,
                    removeOnComplete: true,
                    removeOnFail: true
                  }
                );
              })
            );

            logger.info(`[ShiftEnd] Scheduled ${shiftType} shift-end notification for operator ${operatorId} in ${(delayMs / 1000 / 60).toFixed(0)} minutes (${shiftDurationHours}h shift)`);
          }
        } else {
          logger.warn(`[ShiftEnd] Shift end time already passed for operator ${operatorId}, not scheduling notification`);
        }
      } catch (notifError: any) {
        logger.error(`[ShiftEnd] Failed to schedule shift-end notification: ${notifError.message}`);
        // Don't fail the check-in if notification scheduling fails
      }
    }

    // INVALIDATE MASTER DATA CACHE
    await masterDataCacheService.invalidateCache(`operator ${operatorId} checked in at client ${clientId}`);
    await refreshOperationalSnapshotsForOperator(
      operatorId,
      `checked in at client ${clientId}`
    );

    res.status(201).json({
      operatorId,
      checkInTimestamp,
      checkInStatus
    });
  } else {
    res.status(400);
    throw new Error(
      "Unable to create attendance entry, Please try again later"
    );
  }
});

const MINIMUM_WORK_DURATION_MINUTES = 30;
const OT_RATE_MULTIPLIER = Number(process.env.OT_RATE_MULTIPLIER) || 1.5;
const HOURLY_RATE = 100; // Base hourly rate in your currency
const EARLY_CHECKOUT_EMAIL_RECIPIENTS = process.env.EARLY_CHECKOUT_EMAIL_RECIPIENTS || "pratyush@flomobility.com";
const EARLY_CHECKOUT_EMAIL_CC = process.env.EARLY_CHECKOUT_EMAIL_CC || "tahir@flomobility.com,contact@flomobility.com";

export const handleOperatorCheckOut = asyncHandler(async (req, res) => {
  const { operatorId, clientId, checkOutTimestamp, startOfDay, location, isOvertimeSession, isEarlyCheckout } =
    req.body;

  if (
    !operatorId ||
    !clientId ||
    !checkOutTimestamp ||
    !startOfDay ||
    !location
  ) {
    res.status(400);
    throw new Error("Missing required request parameters");
  }

  // Find the corresponding check-in
  const checkInEntry = await attendanceModel.findOne({
    "metadata.operatorId": operatorId,
    "metadata.clientId": clientId,
    "metadata.entryType": "checkIn",
    isOvertimeSession: isOvertimeSession || false,
    startingTimestamp: {
      $gte: startOfDay
    }
  }).sort({ startingTimestamp: -1 });

  if (!checkInEntry) {
    res.status(400);
    const todayDate = dayjs(startOfDay).format("MMM D, YYYY");
    throw new Error(isOvertimeSession
      ? `No overtime check-in found for ${todayDate}. You must check in for overtime before checking out.`
      : `No check-in found for ${todayDate}. You must check in first before you can check out. If you already checked in but don't see it, please restart the app.`);
  }

  // For overtime sessions, ensure it hasn't already been checked out
  if (isOvertimeSession && checkInEntry.overtimeEndTime) {
    res.status(400);
    throw new Error("This overtime session has already been checked out");
  }

  // Validate location object structure
  if (
    typeof location !== "object" ||
    typeof location.lat !== "number" ||
    typeof location.lng !== "number"
  ) {
    res.status(400);
    throw new Error("Invalid location format. Location must include lat and lng coordinates");
  }

  // Validate location coordinates are within valid ranges
  if (
    location.lat < -90 ||
    location.lat > 90 ||
    location.lng < -180 ||
    location.lng > 180
  ) {
    res.status(400);
    throw new Error("Invalid location coordinates. Latitude must be between -90 and 90, longitude between -180 and 180");
  }

  const now = Date.now();

  // Prevent datetime tampering
  if (Math.abs(now - checkOutTimestamp) > 5 * 60 * 1000) {
    const operator = await appUserModel.findById(operatorId);
    const minutesDiff = dayjs.duration(Math.abs(now - checkOutTimestamp)).asMinutes();
    logger.error(
      `Time mistmatch of ${minutesDiff.toFixed(1)}min by ${operator ? operator.name : operatorId}`
    );
    res.status(409);
    throw new Error(`Time mismatch detected: Your device time is ${minutesDiff.toFixed(0)} minutes off. Please sync your device time with network time and try again.`);
  }

  // Validate operator is still employed (active) before allowing check-out
  const operator = await appUserModel.findById(operatorId).select("isActive name");
  if (!operator) {
    res.status(404);
    throw new Error("Operator not found");
  }

  if (operator.isActive === false) {
    res.status(403);
    throw new Error(
      `Operator account is inactive. Please contact your administrator to reactivate your account.`
    );
  }

  // Check client configuration
  const client = await clientModel.findById(clientId);

  if (!client) {
    res.status(404);
    throw new Error("Client not found");
  }

  if (!client.checkInTimeWithZone) {
    // Needed since checkout doesn't make sense without checking in
    res.status(500);
    throw new Error("Check in time for the client has not been set");
  }

  const metadata: AttendanceMetaData = {
    clientId,
    operatorId,
    entryType: "checkOut"
  };

  // Check for existing check-out based on session type
  // BUSINESS RULE:
  // - Regular check-out: Only ONE per day (matches regular check-in)
  // - Overtime check-out: Handled differently - updates the check-in record instead
  const checkOutQuery: any = {
    "metadata.operatorId": operatorId,
    "metadata.clientId": clientId,
    "metadata.entryType": "checkOut",
    startingTimestamp: {
      $gte: startOfDay,
      $lte: checkOutTimestamp
    }
  };

  // For regular check-outs, only look for regular check-out entries
  // (Overtime check-outs don't create separate check-out entries)
  if (!isOvertimeSession) {
    // No need to filter - regular check-outs are distinct entries
    // Overtime check-outs update the check-in record (overtimeEndTime field)
  }

  const alreadyCheckedOut = (await attendanceModel.find(checkOutQuery)) as AttendanceData[];

  if (alreadyCheckedOut.length) {
    // Operator already checked out today - update robot snapshots to ensure consistency
    // (No need to modify isActive - that's employment status, not attendance)

    // Update operatorSnapshot.checkedInToday to false on robots
    const operatorIdStr = operatorId.toString();
    const operatorObjectId = new mongoose.Types.ObjectId(operatorId);
    const robotUpdateResult = await robotModel.updateMany(
      {
        $or: [
          { activeOperator: operatorObjectId },
          { "operatorSnapshot.id": operatorIdStr },
          { appUsers: operatorObjectId }
        ]
      },
      {
        $set: {
          "operatorSnapshot.checkedInToday": false
        }
      }
    );
    logger.info(`Updated checkedInToday to false for ${robotUpdateResult.modifiedCount} robots for operator ${operatorId} (already checked out)`);

    // INVALIDATE MASTER DATA CACHE
    await masterDataCacheService.invalidateCache(`operator ${operatorId} already checked out (snapshot updated)`);
    await refreshOperationalSnapshotsForOperator(
      operatorId,
      "already checked out"
    );

    res.status(200).json({
      operatorId: alreadyCheckedOut[0].metadata.operatorId,
      checkOutTimestamp: alreadyCheckedOut[0].startingTimestamp
    });
    return;
  }

  let checkoutEntry;

  // Handle overtime check-out differently - update the check-in record
  if (isOvertimeSession && checkInEntry) {
    const overtimeStartMs = new Date(checkInEntry.overtimeStartTime || checkInEntry.startingTimestamp).getTime();
    const overtimeDurationHours = (checkOutTimestamp - overtimeStartMs) / (1000 * 60 * 60);
    const overtimeCost = overtimeDurationHours * HOURLY_RATE * OT_RATE_MULTIPLIER;

    checkInEntry.overtimeEndTime = new Date(checkOutTimestamp);
    checkInEntry.overtimeActualDuration = overtimeDurationHours;
    checkInEntry.overtimeCost = overtimeCost;
    await checkInEntry.save();

    logger.info(`Overtime session completed: ${overtimeDurationHours.toFixed(2)} hours, cost: ${overtimeCost.toFixed(2)}`);

    checkoutEntry = checkInEntry;
  } else {
    // Regular check-out - create separate entry
    checkoutEntry = await attendanceModel.create({
      metadata,
      location,
      startingTimestamp: checkOutTimestamp
    });
  }

  if (checkoutEntry) {
    // Check-out successful - now update robot snapshots
    // NOTE: We do NOT modify isActive here - that's employment status, not attendance
    logger.info(`Operator ${operatorId} checked out successfully at client ${clientId}`);

    // Update operatorSnapshot.checkedInToday to false on robots
    const operatorIdStr = operatorId.toString();
    const operatorObjectId = new mongoose.Types.ObjectId(operatorId);
    const robotUpdateResult = await robotModel.updateMany(
      {
        $or: [
          { activeOperator: operatorObjectId },
          { "operatorSnapshot.id": operatorIdStr },
          { appUsers: operatorObjectId }
        ]
      },
      {
        $set: {
          "operatorSnapshot.checkedInToday": false
        }
      }
    );
    logger.info(`Updated checkedInToday to false for ${robotUpdateResult.modifiedCount} robots for operator ${operatorId}`);

    // INVALIDATE MASTER DATA CACHE
    await masterDataCacheService.invalidateCache(`operator ${operatorId} checked out at client ${clientId}`);
    await refreshOperationalSnapshotsForOperator(
      operatorId,
      `checked out at client ${clientId}`
    );

    // Send email notification for early checkout
    logger.info(`[Checkout] isEarlyCheckout flag: ${isEarlyCheckout}`);

    if (isEarlyCheckout) {
      try {
        const checkInTime = new Date(checkInEntry.startingTimestamp).getTime();
        const durationMinutes = (checkOutTimestamp - checkInTime) / (1000 * 60);
        const durationHours = durationMinutes / 60;

        let expectedMinutes: number;
        let sessionType: string;

        if (isOvertimeSession) {
          expectedMinutes = (checkInEntry.overtimeApprovedDuration || 0) * 60;
          sessionType = "Overtime";
        } else {
          expectedMinutes = MINIMUM_WORK_DURATION_MINUTES;
          sessionType = "Regular";
        }

        const earlyByMinutes = expectedMinutes - durationMinutes;

        logger.info(`[EarlyCheckout] Operator: ${operator.name}, Session: ${sessionType}, Worked: ${durationMinutes.toFixed(1)}min, Expected: ${expectedMinutes}min, Early by: ${earlyByMinutes.toFixed(1)}min`);

        const emailBody = `Early Checkout Alert

Operator: ${operator.name}
Client: ${client.name}
Session Type: ${sessionType}

Check-in Time: ${dayjs(checkInTime).format("MMM D, YYYY h:mm A")}
Check-out Time: ${dayjs(checkOutTimestamp).format("MMM D, YYYY h:mm A")}
Duration Worked: ${durationHours.toFixed(2)} hours (${durationMinutes.toFixed(1)} minutes)
Expected Duration: ${(expectedMinutes / 60).toFixed(2)} hours (${expectedMinutes} minutes)
Early by: ${(earlyByMinutes / 60).toFixed(2)} hours (${earlyByMinutes.toFixed(1)} minutes)

Please review this early checkout and take appropriate action if needed.`;

        logger.info(`[EarlyCheckout] Queueing email to: ${EARLY_CHECKOUT_EMAIL_RECIPIENTS}, cc: ${EARLY_CHECKOUT_EMAIL_CC}`);

        // Send email with TO and CC
        await emailQueue.add("early-checkout", {
          to: EARLY_CHECKOUT_EMAIL_RECIPIENTS,
          cc: EARLY_CHECKOUT_EMAIL_CC,
          subject: `Early Checkout Alert - ${operator.name} at ${client.name}`,
          body: emailBody
        });

        logger.info(`[EarlyCheckout] Email job queued successfully to ${EARLY_CHECKOUT_EMAIL_RECIPIENTS}, cc: ${EARLY_CHECKOUT_EMAIL_CC} - ${operator.name} checked out ${earlyByMinutes.toFixed(1)} minutes early`);
      } catch (emailError: any) {
        logger.error(`[EarlyCheckout] Failed to queue early checkout email: ${emailError.message}`, emailError);
        // Don't fail the checkout if email fails
      }
    } else {
      logger.info(`[Checkout] No early checkout email sent - operator worked sufficient time`);
    }

    res.status(201).json({
      operatorId,
      checkOutTimestamp
    });
  } else {
    res.status(400);
    throw new Error("Unable to check out, please try again later");
  }
});

// Type definitions for attendance status response
interface CheckInStatusInfo {
  operatorId: string;
  clientId: string;
  timestamp: number;
  status: "ontime" | "early" | "late" | undefined;
  isOvertimeSession: boolean;
  overtimeSessionId: string | undefined;
}

interface OvertimeSessionInfo {
  sessionId: string;
  requestId: string | undefined;
  clientId: string;
  approvedDuration: number | undefined;
  checkInTime: number;
}

interface UnclosedPreviousSessionInfo {
  checkInId: string;
  checkInDate: string; // YYYY-MM-DD format
  checkInTimestamp: number;
  isOvertimeSession: boolean;
}

interface AttendanceStatusResponse {
  isCheckedIn: boolean;
  hasActiveOvertimeSession: boolean;
  checkIn: CheckInStatusInfo | null;
  overtimeSession: OvertimeSessionInfo | null;
  hasUnclosedPreviousSession: boolean;
  unclosedPreviousSession: UnclosedPreviousSessionInfo | null;
}

/**
 * POST /api/attendance/current-status
 * Get current attendance status for an operator (for state recovery)
 * @access Public (App)
 */
export const getCurrentAttendanceStatus = asyncHandler(async (req, res) => {
  const { operatorId, startOfDay } = req.body;

  if (!operatorId || !startOfDay) {
    res.status(400);
    throw new Error("Missing required parameters: operatorId, startOfDay");
  }

  // Find today's check-in (regular or overtime)
  const checkIn = await attendanceModel.findOne({
    "metadata.operatorId": operatorId,
    "metadata.entryType": "checkIn",
    startingTimestamp: {
      $gte: startOfDay
    }
  }).sort({ startingTimestamp: -1 });

  // Find today's check-out
  const checkOut = await attendanceModel.findOne({
    "metadata.operatorId": operatorId,
    "metadata.entryType": "checkOut",
    startingTimestamp: {
      $gte: startOfDay
    }
  }).sort({ startingTimestamp: -1 });

  // Check for active overtime session (from today OR previous days)
  // IMPORTANT: This must match the validation in overtimeController.ts
  const activeOvertimeSession = await attendanceModel.findOne({
    "metadata.operatorId": operatorId,
    "metadata.entryType": "checkIn",
    isOvertimeSession: true,
    overtimeEndTime: { $exists: false }
    // NOTE: No startingTimestamp filter - check ALL unclosed overtime sessions
  });

  const isCheckedIn = !!checkIn && !checkOut;
  const hasActiveOvertimeSession = !!activeOvertimeSession;

  // Check for unclosed previous session (from before today)
  // IMPORTANT: Only check the MOST RECENT session (yesterday)
  // Older sessions are handled by admin via WhatsApp/force-close tool
  // NOTE: We do NOT filter by clientId here because operators can switch clients
  // The check-in validation (handleOperatorCheckIn) DOES filter by clientId
  const previousCheckIn = await attendanceModel.findOne({
    "metadata.operatorId": operatorId,
    "metadata.entryType": "checkIn",
    startingTimestamp: {
      $lt: startOfDay // Before today
    }
  }).sort({ startingTimestamp: -1 }).limit(1);

  let unclosedPreviousSession: UnclosedPreviousSessionInfo | null = null;
  if (previousCheckIn) {
    let isUnclosed = false;

    // Check if it's an overtime session
    if (previousCheckIn.isOvertimeSession) {
      // Check BOTH overtimeEndTime AND separate check-out entries
      if (!previousCheckIn.overtimeEndTime) {
        const previousOvertimeCheckOut = await attendanceModel.findOne({
          "metadata.operatorId": operatorId,
          "metadata.clientId": previousCheckIn.metadata.clientId, // Match same client
          "metadata.entryType": "checkOut",
          isOvertimeSession: true,
          startingTimestamp: {
            $gte: previousCheckIn.startingTimestamp,
            $lt: startOfDay
          }
        });
        isUnclosed = !previousOvertimeCheckOut;
      }
    } else {
      // For regular sessions, check if there's a check-out
      const previousCheckOut = await attendanceModel.findOne({
        "metadata.operatorId": operatorId,
        "metadata.clientId": previousCheckIn.metadata.clientId, // Match same client
        "metadata.entryType": "checkOut",
        startingTimestamp: {
          $gte: previousCheckIn.startingTimestamp,
          $lt: startOfDay
        }
      });
      isUnclosed = !previousCheckOut;
    }

    if (isUnclosed) {
      unclosedPreviousSession = {
        checkInId: previousCheckIn._id.toString(),
        checkInDate: dayjs(previousCheckIn.startingTimestamp).format("YYYY-MM-DD"),
        checkInTimestamp: previousCheckIn.startingTimestamp,
        isOvertimeSession: previousCheckIn.isOvertimeSession || false
      };
    }
  }

  // REMOVED: Auto-inclusion of old overtime sessions from previous implementation
  // With Plan A, we only check the MOST RECENT session via .limit(1) above
  // Older sessions are handled by admin via WhatsApp/force-close tool

  const response: AttendanceStatusResponse = {
    isCheckedIn,
    hasActiveOvertimeSession,
    checkIn: checkIn ? {
      operatorId: checkIn.metadata.operatorId,
      clientId: checkIn.metadata.clientId,
      timestamp: checkIn.startingTimestamp,
      status: checkIn.checkInStatus,
      isOvertimeSession: checkIn.isOvertimeSession || false,
      overtimeSessionId: checkIn.overtimeRequestId
    } : null,
    overtimeSession: activeOvertimeSession ? {
      sessionId: activeOvertimeSession._id.toString(),
      requestId: activeOvertimeSession.overtimeRequestId,
      clientId: activeOvertimeSession.metadata.clientId,
      approvedDuration: activeOvertimeSession.overtimeApprovedDuration,
      checkInTime: new Date(activeOvertimeSession.overtimeStartTime || activeOvertimeSession.startingTimestamp).getTime()
    } : null,
    hasUnclosedPreviousSession: !!unclosedPreviousSession,
    unclosedPreviousSession
  };

  res.json(response);
});

/**
 * POST /api/attendance/validate-check-in
 * Validate if an operator can check in (for pre-validation before queuing)
 * Returns structured error with code and bilingual messages
 * @access Public (App)
 */
export const validateCheckIn = asyncHandler(async (req, res) => {
  const { operatorId, clientId, checkInTimestamp, startOfDay, isOvertimeSession, overtimeRequestId } = req.body;

  if (!operatorId || !clientId || !checkInTimestamp || !startOfDay) {
    res.status(400);
    throw new Error("Missing required parameters: operatorId, clientId, checkInTimestamp, startOfDay");
  }

  const validationResult: any = {
    canCheckIn: true,
    errorCode: null,
    errorMessage: null,
    errorMessageHindi: null,
    suggestedAction: null,
    suggestedActionHindi: null
  };

  try {
    // Check 1: Operator exists and is active
    const operator = await appUserModel.findById(operatorId).select("isActive name");
    if (!operator) {
      validationResult.canCheckIn = false;
      validationResult.errorCode = "OPERATOR_NOT_FOUND";
      validationResult.errorMessage = "Operator account not found";
      validationResult.errorMessageHindi = "ऑपरेटर खाता नहीं मिला";
      res.json(validationResult);
      return;
    }

    if (operator.isActive === false) {
      validationResult.canCheckIn = false;
      validationResult.errorCode = "OPERATOR_INACTIVE";
      validationResult.errorMessage = "Your account is inactive. Please contact your administrator.";
      validationResult.errorMessageHindi = "आपका खाता निष्क्रिय है। कृपया अपने प्रशासक से संपर्क करें।";
      validationResult.suggestedAction = "Contact administrator to reactivate account";
      validationResult.suggestedActionHindi = "खाता पुनः सक्रिय करने के लिए प्रशासक से संपर्क करें";
      res.json(validationResult);
      return;
    }

    // Check 2: Client exists
    const client = await clientModel.findById(clientId);
    if (!client) {
      validationResult.canCheckIn = false;
      validationResult.errorCode = "CLIENT_NOT_FOUND";
      validationResult.errorMessage = "Client location not found";
      validationResult.errorMessageHindi = "क्लाइंट स्थान नहीं मिला";
      res.json(validationResult);
      return;
    }

    // Check 3: Already checked in today (for regular sessions)
    if (!isOvertimeSession) {
      const existingCheckIn = await attendanceModel.findOne({
        "metadata.operatorId": operatorId,
        "metadata.clientId": clientId,
        "metadata.entryType": "checkIn",
        isOvertimeSession: { $ne: true },
        startingTimestamp: {
          $gte: startOfDay
        }
      });

      if (existingCheckIn) {
        validationResult.canCheckIn = false;
        validationResult.errorCode = "ALREADY_CHECKED_IN";
        validationResult.errorMessage = "You have already checked in today";
        validationResult.errorMessageHindi = "आपने आज पहले ही चेक-इन कर लिया है";
        validationResult.suggestedAction = "If you need to check out, use the check-out button";
        validationResult.suggestedActionHindi = "यदि आपको चेक-आउट करना है, तो चेक-आउट बटन का उपयोग करें";
        res.json(validationResult);
        return;
      }
    }

    // Check 4: Overtime request validation
    if (isOvertimeSession) {
      if (!overtimeRequestId) {
        validationResult.canCheckIn = false;
        validationResult.errorCode = "OVERTIME_REQUEST_REQUIRED";
        validationResult.errorMessage = "Overtime request ID is required for overtime check-in";
        validationResult.errorMessageHindi = "ओवरटाइम चेक-इन के लिए ओवरटाइम अनुरोध ID आवश्यक है";
        res.json(validationResult);
        return;
      }

      const overtimeRequest = await OvertimeRequestModel.findById(overtimeRequestId);
      if (!overtimeRequest) {
        validationResult.canCheckIn = false;
        validationResult.errorCode = "OVERTIME_REQUEST_NOT_FOUND";
        validationResult.errorMessage = "Overtime request not found";
        validationResult.errorMessageHindi = "ओवरटाइम अनुरोध नहीं मिला";
        res.json(validationResult);
        return;
      }

      if (overtimeRequest.status !== "approved") {
        validationResult.canCheckIn = false;
        validationResult.errorCode = "OVERTIME_NOT_APPROVED";
        validationResult.errorMessage = "Overtime request has not been approved yet";
        validationResult.errorMessageHindi = "ओवरटाइम अनुरोध अभी तक स्वीकृत नहीं हुआ है";
        validationResult.suggestedAction = "Wait for manager approval";
        validationResult.suggestedActionHindi = "प्रबंधक की स्वीकृति की प्रतीक्षा करें";
        res.json(validationResult);
        return;
      }

      if (overtimeRequest.expiresAt && new Date() > overtimeRequest.expiresAt) {
        validationResult.canCheckIn = false;
        validationResult.errorCode = "OVERTIME_APPROVAL_EXPIRED";
        validationResult.errorMessage = "Overtime approval has expired. Please request new approval.";
        validationResult.errorMessageHindi = "ओवरटाइम स्वीकृति समाप्त हो गई है। कृपया नई स्वीकृति का अनुरोध करें।";
        validationResult.suggestedAction = "Request new overtime approval";
        validationResult.suggestedActionHindi = "नई ओवरटाइम स्वीकृति का अनुरोध करें";
        res.json(validationResult);
        return;
      }

      if (overtimeRequest.overtimeSessionId) {
        validationResult.canCheckIn = false;
        validationResult.errorCode = "OVERTIME_APPROVAL_ALREADY_USED";
        validationResult.errorMessage = "This overtime approval has already been used";
        validationResult.errorMessageHindi = "यह ओवरटाइम स्वीकृति पहले ही उपयोग की जा चुकी है";
        res.json(validationResult);
        return;
      }
    }

    // Check 5: Unclosed previous session
    const previousCheckIn = await attendanceModel.findOne({
      "metadata.operatorId": operatorId,
      "metadata.clientId": clientId,
      "metadata.entryType": "checkIn",
      startingTimestamp: {
        $lt: startOfDay
      }
    }).sort({ startingTimestamp: -1 }).limit(1);

    if (previousCheckIn) {
      const hoursSincePreviousCheckIn = (checkInTimestamp - previousCheckIn.startingTimestamp) / (1000 * 60 * 60);
      let isUnclosed = false;

      if (previousCheckIn.isOvertimeSession) {
        if (!previousCheckIn.overtimeEndTime) {
          const previousOvertimeCheckOut = await attendanceModel.findOne({
            "metadata.operatorId": operatorId,
            "metadata.clientId": clientId,
            "metadata.entryType": "checkOut",
            isOvertimeSession: true,
            startingTimestamp: {
              $gte: previousCheckIn.startingTimestamp,
              $lt: startOfDay
            }
          });
          isUnclosed = !previousOvertimeCheckOut;
        }
      } else {
        const previousCheckOut = await attendanceModel.findOne({
          "metadata.operatorId": operatorId,
          "metadata.clientId": clientId,
          "metadata.entryType": "checkOut",
          startingTimestamp: {
            $gte: previousCheckIn.startingTimestamp,
            $lt: startOfDay
          }
        });
        isUnclosed = !previousCheckOut;
      }

      if (isUnclosed) {
        // Sessions >18 hours old are allowed (will be auto-closed or allowed by smarter detection)
        if (hoursSincePreviousCheckIn < 18) {
          validationResult.canCheckIn = false;
          validationResult.errorCode = "UNCLOSED_PREVIOUS_SESSION";
          validationResult.errorMessage = "You have not checked out from your previous shift";
          validationResult.errorMessageHindi = "आपने अपनी पिछली शिफ्ट से चेक-आउट नहीं किया है";
          validationResult.suggestedAction = "Check out from previous session first, or use 'Close Previous Session' button";
          validationResult.suggestedActionHindi = "पहले पिछले सत्र से चेक-आउट करें, या 'पिछला सत्र बंद करें' बटन का उपयोग करें";
          validationResult.previousSessionAge = Math.round(hoursSincePreviousCheckIn * 10) / 10; // Round to 1 decimal
          res.json(validationResult);
          return;
        } else {
          // Will be auto-closed or allowed
          validationResult.willAutoClose = hoursSincePreviousCheckIn >= 24;
          validationResult.previousSessionAge = Math.round(hoursSincePreviousCheckIn * 10) / 10;
        }
      }
    }

    // All checks passed
    validationResult.canCheckIn = true;
    res.json(validationResult);
  } catch (error: any) {
    logger.error(`[ValidateCheckIn] Error validating check-in for operator ${operatorId}: ${error.message}`);
    validationResult.canCheckIn = false;
    validationResult.errorCode = "VALIDATION_ERROR";
    validationResult.errorMessage = "Unable to validate check-in. Please try again.";
    validationResult.errorMessageHindi = "चेक-इन सत्यापित करने में असमर्थ। कृपया पुनः प्रयास करें।";
    res.json(validationResult);
  }
});

/**
 * DELETE /api/attendance/clear-today
 * Clear today's attendance records for a specific operator (TESTING ONLY)
 * @access Private (App)
 */
export const clearTodayAttendance = asyncHandler(async (req, res) => {
  const { operatorId, clientId } = req.body;

  if (!operatorId || !clientId) {
    res.status(400);
    throw new Error("Missing required parameters: operatorId, clientId");
  }

  const startOfDay = dayjs().startOf("day").valueOf();
  const endOfDay = dayjs().endOf("day").valueOf();

  try {
    // Delete all attendance records for this operator today
    const result = await attendanceModel.deleteMany({
      "metadata.operatorId": operatorId,
      "metadata.clientId": clientId,
      startingTimestamp: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    // Also clear any overtime sessions for today
    const overtimeResult = await attendanceModel.deleteMany({
      "metadata.operatorId": operatorId,
      "metadata.clientId": clientId,
      isOvertimeSession: true,
      startingTimestamp: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    logger.info(`[ClearAttendance] Cleared ${result.deletedCount} regular attendance records and ${overtimeResult.deletedCount} overtime records for operator ${operatorId}`);

    // Invalidate cache
    await masterDataCacheService.invalidateCache(`operator ${operatorId} attendance cleared for testing`);
    await refreshOperationalSnapshotsForOperator(
      operatorId,
      "attendance cleared for testing"
    );

    res.json({
      success: true,
      deletedCount: result.deletedCount + overtimeResult.deletedCount,
      message: `Cleared ${result.deletedCount + overtimeResult.deletedCount} attendance records for today`
    });
  } catch (error: any) {
    logger.error(`[ClearAttendance] Failed to clear attendance: ${error.message}`);
    res.status(500);
    throw new Error("Failed to clear attendance records");
  }
});

/**
 * POST /api/v1/attendance/force-close-previous-session
 * Force-close any unclosed attendance session from previous days
 * This resolves the deadlock where operator cannot check in (previous shift open)
 * and cannot check out (no today check-in)
 * @access Public (App)
 */
export const forceClosePreviousSession = asyncHandler(async (req, res) => {
  const { operatorId, clientId } = req.body;

  if (!operatorId || !clientId) {
    res.status(400);
    throw new Error("Missing required parameters: operatorId, clientId");
  }

  const startOfToday = dayjs().startOf("day").valueOf();
  let sessionsClosedCount = 0;
  const closedSessions: string[] = [];
  const processedCheckInIds = new Set<string>(); // Track which check-ins we've already processed
  const MAX_SESSIONS_TO_CLOSE = 50; // Safety limit to prevent infinite loops

  try {
    // Find ALL unclosed check-ins from before today (loop until none left)
    while (sessionsClosedCount < MAX_SESSIONS_TO_CLOSE) {
      const previousCheckIn = await attendanceModel.findOne({
        "metadata.operatorId": operatorId,
        "metadata.clientId": clientId,
        "metadata.entryType": "checkIn",
        startingTimestamp: {
          $lt: startOfToday // Before today
        },
        _id: {
          $nin: Array.from(processedCheckInIds).map(id => new mongoose.Types.ObjectId(id)) // Exclude already processed
        }
      }).sort({ startingTimestamp: -1 });

      if (!previousCheckIn) {
        // No more unclosed sessions found
        break;
      }

      // Mark this check-in as processed to avoid infinite loop
      processedCheckInIds.add(previousCheckIn._id.toString());

      // Check if it's an overtime session
      if (previousCheckIn.isOvertimeSession) {
        // For overtime, check BOTH overtimeEndTime AND separate check-out entries
        // (consistent with check-in validation logic)
        if (previousCheckIn.overtimeEndTime) {
          // Already closed, skip to next
          continue;
        }

        // Check if there's a separate overtime check-out entry
        const previousOvertimeCheckOut = await attendanceModel.findOne({
          "metadata.operatorId": operatorId,
          "metadata.clientId": clientId,
          "metadata.entryType": "checkOut",
          isOvertimeSession: true,
          startingTimestamp: {
            $gte: previousCheckIn.startingTimestamp,
            $lt: startOfToday
          }
        });

        if (previousOvertimeCheckOut) {
          // Already closed via separate check-out entry, skip to next
          continue;
        }

        // For overtime sessions, we CANNOT use .save() on time-series collections
        // Instead, create a separate check-out entry just like regular sessions
        const client = await clientModel.findById(clientId);
        if (!client) {
          logger.warn(`[ForceClose] Client ${clientId} not found, skipping overtime session`);
          continue;
        }

        const overtimeStartMs = new Date(previousCheckIn.overtimeStartTime || previousCheckIn.startingTimestamp).getTime();
        const approvedDuration = previousCheckIn.overtimeApprovedDuration || 2;
        const forcedCheckOutTime = overtimeStartMs + (approvedDuration * 60 * 60 * 1000);
        const overtimeDurationHours = (forcedCheckOutTime - overtimeStartMs) / (1000 * 60 * 60);
        const overtimeCost = overtimeDurationHours * HOURLY_RATE * OT_RATE_MULTIPLIER;

        // Create check-out entry for overtime session
        await attendanceModel.create({
          metadata: {
            operatorId,
            clientId,
            entryType: "checkOut"
          },
          startingTimestamp: forcedCheckOutTime,
          location: client.location || previousCheckIn.location,
          isOvertimeSession: true,
          overtimeRequestId: previousCheckIn.overtimeRequestId,
          overtimeApprovedDuration: approvedDuration,
          overtimeActualDuration: overtimeDurationHours,
          overtimeStartTime: new Date(overtimeStartMs),
          overtimeEndTime: new Date(forcedCheckOutTime),
          overtimeCost: overtimeCost,
          autoCheckedOut: true,
          autoCheckOutReason: "Force-closed by operator via app",
          autoCheckOutTime: new Date()
        });

        sessionsClosedCount++;
        closedSessions.push(dayjs(previousCheckIn.startingTimestamp).format("YYYY-MM-DD"));
        logger.info(`[ForceClose] Created forced check-out for previous overtime session from ${closedSessions[closedSessions.length - 1]} for operator ${operatorId}`);
      } else {
        // For regular sessions, check if there's already a check-out
        const previousCheckOut = await attendanceModel.findOne({
          "metadata.operatorId": operatorId,
          "metadata.clientId": clientId,
          "metadata.entryType": "checkOut",
          startingTimestamp: {
            $gte: previousCheckIn.startingTimestamp,
            $lt: startOfToday
          }
        });

        if (previousCheckOut) {
          // Already closed, skip to next
          continue;
        }

        // Get client to determine shift duration
        const client = await clientModel.findById(clientId);
        if (!client) {
          logger.warn(`[ForceClose] Client ${clientId} not found, skipping session`);
          continue;
        }

        const shiftHours = client.operatingHours || 8;
        const forcedCheckOutTime = previousCheckIn.startingTimestamp + (shiftHours * 60 * 60 * 1000);

        // Create forced check-out entry
        await attendanceModel.create({
          metadata: {
            operatorId,
            clientId,
            entryType: "checkOut"
          },
          startingTimestamp: forcedCheckOutTime,
          location: client.location || previousCheckIn.location,
          autoCheckedOut: true,
          autoCheckOutReason: "Force-closed by operator via app",
          autoCheckOutTime: new Date()
        });

        sessionsClosedCount++;
        closedSessions.push(dayjs(previousCheckIn.startingTimestamp).format("YYYY-MM-DD"));
        logger.info(`[ForceClose] Created forced check-out for previous session from ${closedSessions[closedSessions.length - 1]} for operator ${operatorId}`);
      }
    }

    // Check if any sessions were actually closed
    if (sessionsClosedCount === 0) {
      res.status(404);
      throw new Error("No unclosed previous sessions found");
    }

    // Update robot snapshots - set checkedInToday to false
    const operatorIdStr = operatorId.toString();
    const operatorObjectId = new mongoose.Types.ObjectId(operatorId);
    await robotModel.updateMany(
      {
        $or: [
          { activeOperator: operatorObjectId },
          { "operatorSnapshot.id": operatorIdStr },
          { appUsers: operatorObjectId }
        ]
      },
      {
        $set: {
          "operatorSnapshot.checkedInToday": false
        }
      }
    );

    // Invalidate cache
    await masterDataCacheService.invalidateCache(`operator ${operatorId} previous session force-closed`);
    await refreshOperationalSnapshotsForOperator(
      operatorId,
      "previous session force-closed"
    );

    // Send email notification to admin
    try {
      const operator = await appUserModel.findById(operatorId).select("name phoneNumber");
      const client = await clientModel.findById(clientId).select("name");

      if (operator && client) {
        const sessionsList = closedSessions.join(", ");
        const emailBody = `Force-Close Previous Session${sessionsClosedCount > 1 ? 's' : ''} Alert

Operator: ${operator.name} (${operator.phoneNumber})
Client: ${client.name}

The operator force-closed ${sessionsClosedCount} unclosed session${sessionsClosedCount > 1 ? 's' : ''} from previous day${sessionsClosedCount > 1 ? 's' : ''} via the mobile app.

Session Date${sessionsClosedCount > 1 ? 's' : ''}: ${sessionsList}
Sessions Closed: ${sessionsClosedCount}
Force-closed At: ${dayjs().format("MMM D, YYYY h:mm A")}

This typically happens when the operator forgot to check out or the app crashed during their shift.
All previous unclosed sessions have been automatically closed to allow the operator to check in today.`;

        await emailQueue.add("force-close-session", {
          to: "tahir@flomobility.com",
          cc: "contact@flomobility.com",
          subject: `Force-Close ${sessionsClosedCount} Session${sessionsClosedCount > 1 ? 's' : ''} - ${operator.name} at ${client.name}`,
          body: emailBody
        });

        logger.info(`[ForceClose] Email notification sent for operator ${operatorId} - ${sessionsClosedCount} sessions closed`);
      }
    } catch (emailError: any) {
      logger.error(`[ForceClose] Failed to send email notification: ${emailError.message}`);
      // Don't fail the operation if email fails
    }

    res.json({
      success: true,
      message: `${sessionsClosedCount} previous session${sessionsClosedCount > 1 ? 's' : ''} force-closed successfully. You can now check in.`,
      sessionsClosed: sessionsClosedCount,
      sessionDates: closedSessions
    });
  } catch (error: any) {
    logger.error(`[ForceClose] Failed to force-close previous session: ${error.message}`);
    throw error; // Re-throw to let asyncHandler handle it
  }
});

/**
 * POST /api/v1/attendance/checkout-previous-session
 * Check out from a specific previous day's session
 * This allows operators to manually close unclosed sessions from previous days
 * @access Public (App)
 */
export const checkoutPreviousSession = asyncHandler(async (req, res) => {
  const { operatorId, clientId, checkInId, location } = req.body;

  if (!operatorId || !clientId || !checkInId || !location) {
    res.status(400);
    throw new Error("Missing required parameters: operatorId, clientId, checkInId, location");
  }

  // Validate location object structure
  if (
    typeof location !== "object" ||
    typeof location.lat !== "number" ||
    typeof location.lng !== "number"
  ) {
    res.status(400);
    throw new Error("Invalid location format. Location must include lat and lng coordinates");
  }

  try {
    // Find the check-in entry
    const checkInEntry = await attendanceModel.findById(checkInId);

    if (!checkInEntry) {
      res.status(404);
      throw new Error("Check-in session not found");
    }

    // Verify it belongs to this operator
    if (checkInEntry.metadata.operatorId !== operatorId) {
      res.status(403);
      throw new Error("This session belongs to a different operator");
    }

    // IMPORTANT: Use the ACTUAL clientId from the check-in record, not what the mobile app sends
    // This handles cases where operators were reassigned to different clients after checking in
    const actualClientId = checkInEntry.metadata.clientId;

    // Log if client mismatch detected (operator was moved to different client)
    if (actualClientId !== clientId) {
      logger.info(`[PreviousCheckout] Client mismatch detected for operator ${operatorId}: check-in client=${actualClientId}, current client=${clientId}. Using check-in client for checkout.`);
    }

    // Verify it's from a previous day (not today)
    const startOfToday = dayjs().startOf("day").valueOf();
    if (checkInEntry.startingTimestamp >= startOfToday) {
      res.status(400);
      throw new Error("Cannot check out from today's session using this endpoint. Use regular check-out instead.");
    }

    // Check if already checked out
    if (checkInEntry.isOvertimeSession) {
      // For overtime, check both overtimeEndTime AND separate check-out entries
      if (checkInEntry.overtimeEndTime) {
        res.status(400);
        throw new Error("This overtime session has already been checked out");
      }

      const existingCheckOut = await attendanceModel.findOne({
        "metadata.operatorId": operatorId,
        "metadata.clientId": actualClientId,
        "metadata.entryType": "checkOut",
        isOvertimeSession: true,
        startingTimestamp: {
          $gte: checkInEntry.startingTimestamp,
          $lt: startOfToday
        }
      });

      if (existingCheckOut) {
        res.status(400);
        throw new Error("This overtime session has already been checked out");
      }
    } else {
      // For regular sessions
      const existingCheckOut = await attendanceModel.findOne({
        "metadata.operatorId": operatorId,
        "metadata.clientId": actualClientId,
        "metadata.entryType": "checkOut",
        startingTimestamp: {
          $gte: checkInEntry.startingTimestamp,
          $lt: startOfToday
        }
      });

      if (existingCheckOut) {
        res.status(400);
        throw new Error("This session has already been checked out");
      }
    }

    // Get client info (using actual client from check-in record)
    const client = await clientModel.findById(actualClientId);
    if (!client) {
      res.status(404);
      throw new Error("Client not found");
    }

    // Create check-out entry
    // IMPORTANT: Use a timestamp from the same day as the check-in, not from today
    // The validation in getCurrentAttendanceStatus expects checkout timestamps < startOfToday
    const checkInDayEnd = dayjs(checkInEntry.startingTimestamp).endOf("day").valueOf();
    const now = Date.now();
    let checkOutEntry;

    if (checkInEntry.isOvertimeSession) {
      // For overtime sessions, create a separate check-out entry
      const overtimeStartMs = new Date(checkInEntry.overtimeStartTime || checkInEntry.startingTimestamp).getTime();
      const overtimeDurationHours = (checkInDayEnd - overtimeStartMs) / (1000 * 60 * 60);
      const overtimeCost = overtimeDurationHours * HOURLY_RATE * OT_RATE_MULTIPLIER;

      checkOutEntry = await attendanceModel.create({
        metadata: {
          operatorId,
          clientId: actualClientId,
          entryType: "checkOut"
        },
        startingTimestamp: checkInDayEnd, // Use end of check-in day, not now
        location,
        isOvertimeSession: true,
        overtimeRequestId: checkInEntry.overtimeRequestId,
        overtimeApprovedDuration: checkInEntry.overtimeApprovedDuration,
        overtimeActualDuration: overtimeDurationHours,
        overtimeStartTime: new Date(overtimeStartMs),
        overtimeEndTime: new Date(checkInDayEnd),
        overtimeCost,
        autoCheckedOut: true,
        autoCheckOutReason: "Manual check-out from previous day via app",
        autoCheckOutTime: new Date()
      });

      logger.info(`[PreviousCheckout] Overtime session from ${dayjs(checkInEntry.startingTimestamp).format("YYYY-MM-DD")} checked out by operator ${operatorId}`);
    } else {
      // For regular sessions, create a separate check-out entry
      checkOutEntry = await attendanceModel.create({
        metadata: {
          operatorId,
          clientId: actualClientId,
          entryType: "checkOut"
        },
        startingTimestamp: checkInDayEnd, // Use end of check-in day, not now
        location,
        autoCheckedOut: true,
        autoCheckOutReason: "Manual check-out from previous day via app",
        autoCheckOutTime: new Date()
      });

      logger.info(`[PreviousCheckout] Regular session from ${dayjs(checkInEntry.startingTimestamp).format("YYYY-MM-DD")} checked out by operator ${operatorId}`);
    }

    // Update robot snapshots - set checkedInToday to false (in case it's stuck)
    const operatorIdStr = operatorId.toString();
    const operatorObjectId = new mongoose.Types.ObjectId(operatorId);
    await robotModel.updateMany(
      {
        $or: [
          { activeOperator: operatorObjectId },
          { "operatorSnapshot.id": operatorIdStr },
          { appUsers: operatorObjectId }
        ]
      },
      {
        $set: {
          "operatorSnapshot.checkedInToday": false
        }
      }
    );

    // Invalidate cache
    await masterDataCacheService.invalidateCache(`operator ${operatorId} previous session checked out`);
    await refreshOperationalSnapshotsForOperator(
      operatorId,
      "previous session checked out"
    );

    // Send email notification
    try {
      const operator = await appUserModel.findById(operatorId).select("name phoneNumber");

      if (operator && client) {
        const sessionDate = dayjs(checkInEntry.startingTimestamp).format("YYYY-MM-DD");
        const sessionType = checkInEntry.isOvertimeSession ? "Overtime" : "Regular";

        const emailBody = `Previous Day Check-Out Alert

Operator: ${operator.name} (${operator.phoneNumber})
Client: ${client.name}
Session Type: ${sessionType}
Session Date: ${sessionDate}

The operator manually checked out from a previous day's session via the mobile app.

Check-In Time: ${dayjs(checkInEntry.startingTimestamp).format("MMM D, YYYY h:mm A")}
Check-Out Time: ${dayjs(now).format("MMM D, YYYY h:mm A")}

This typically happens when the operator forgot to check out or the app crashed during their shift.`;

        await emailQueue.add("previous-day-checkout", {
          to: "tahir@flomobility.com",
          cc: "contact@flomobility.com",
          subject: `Previous Day Check-Out - ${operator.name} at ${client.name}`,
          body: emailBody
        });

        logger.info(`[PreviousCheckout] Email notification sent for operator ${operatorId}`);
      }
    } catch (emailError: any) {
      logger.error(`[PreviousCheckout] Failed to send email notification: ${emailError.message}`);
      // Don't fail the operation if email fails
    }

    res.json({
      success: true,
      message: "Previous session checked out successfully. You can now check in.",
      sessionDate: dayjs(checkInEntry.startingTimestamp).format("YYYY-MM-DD"),
      sessionType: checkInEntry.isOvertimeSession ? "overtime" : "regular"
    });
  } catch (error: any) {
    logger.error(`[PreviousCheckout] Failed to check out previous session: ${error.message}`);
    throw error; // Re-throw to let asyncHandler handle it
  }
});
