import attendanceModel, { AttendanceData } from "../models/attendanceModel";
import clientModel from "../models/clientModel";
import appUserModel from "../models/appUserModel";
import robotModel from "../models/robotModel";
import { pushNotificationQueue } from "../queues/pushNotificationQueue";
import logger from "../utils/logger";
import dayjs from "dayjs";
import mongoose from "mongoose";
import { masterDataCacheService } from "../services/masterDataCacheService";
import { refreshOperatorOperationalSnapshots } from "../services/robotOperationalSnapshotService";

const AUTO_CHECKOUT_GRACE_HOURS = Number(process.env.AUTO_CHECKOUT_GRACE_HOURS) || 2;
const AUTO_CHECKOUT_OLD_SESSION_HOURS = 48; // Auto-close unclosed sessions older than 48 hours

/**
 * Scheduled job to automatically check out operators who have exceeded their shift duration + grace period
 * Runs every hour to detect and force-checkout overdue operators
 *
 * ENHANCED: Now also processes unclosed sessions from previous days (older than 48 hours)
 * to prevent deadlock situations where operators cannot check in
 */
export const autoCheckoutJob = async () => {
  try {
    logger.info("[AutoCheckout] AUTO-CHECKOUT DISABLED - Only push notifications are sent");

    // DISABLED: Auto-checkout feature has been disabled as per user request
    // Users now only receive push notifications to remind them to check out
    // Manual checkout or force-close via app required
    return;

    /* ORIGINAL CODE - DISABLED
    logger.info("[AutoCheckout] Starting auto-checkout job");
    const now = Date.now();
    const startOfToday = dayjs().startOf("day").valueOf();
    const oldSessionCutoff = now - (AUTO_CHECKOUT_OLD_SESSION_HOURS * 60 * 60 * 1000); // 48 hours ago

    let regularCheckoutsCount = 0;
    let overtimeCheckoutsCount = 0;
    let oldSessionsClosedCount = 0;

    // ========== REGULAR SHIFTS ==========
    // Find all check-ins from today without matching check-outs
    const todayCheckIns = await attendanceModel.find({
      "metadata.entryType": "checkIn",
      isOvertimeSession: { $ne: true },
      startingTimestamp: { $gte: startOfToday }
    });

    logger.info(`[AutoCheckout] Found ${todayCheckIns.length} regular check-in(s) today`);

    for (const checkIn of todayCheckIns) {
      try {
        const operatorId = checkIn.metadata.operatorId;
        const clientId = checkIn.metadata.clientId;
        const checkInTime = checkIn.startingTimestamp;

        // Check if there's already a check-out for this check-in
        const existingCheckOut = await attendanceModel.findOne({
          "metadata.operatorId": operatorId,
          "metadata.clientId": clientId,
          "metadata.entryType": "checkOut",
          startingTimestamp: { $gte: checkInTime }
        });

        if (existingCheckOut) {
          // Already checked out, skip
          continue;
        }

        // Get client to determine shift duration
        const client = await clientModel.findById(clientId);
        if (!client) {
          logger.warn(`[AutoCheckout] Client ${clientId} not found for check-in ${checkIn._id}`);
          continue;
        }

        const shiftHours = client.operatingHours || 8;
        const expectedCheckOutTime = checkInTime + (shiftHours * 60 * 60 * 1000);
        const graceDeadline = expectedCheckOutTime + (AUTO_CHECKOUT_GRACE_HOURS * 60 * 60 * 1000);

        // Check if operator is overdue
        if (now > graceDeadline) {
          logger.info(`[AutoCheckout] Operator ${operatorId} overdue - creating forced check-out`);

          // Get operator details
          const operator = await appUserModel.findById(operatorId).select("name phoneNumber robots");
          if (!operator) {
            logger.warn(`[AutoCheckout] Operator ${operatorId} not found`);
            continue;
          }

          // Create auto check-out entry
          const autoCheckOutEntry = await attendanceModel.create({
            metadata: {
              operatorId,
              clientId,
              entryType: "checkOut"
            },
            startingTimestamp: graceDeadline,
            location: client.location || checkIn.location, // Use client location or last known location
            autoCheckedOut: true,
            autoCheckOutReason: `Exceeded shift duration (${shiftHours}h) + ${AUTO_CHECKOUT_GRACE_HOURS}h grace period`,
            autoCheckOutTime: new Date(graceDeadline)
          });

          logger.info(`[AutoCheckout] Created auto check-out entry ${autoCheckOutEntry._id} for operator ${operator.name}`);
          regularCheckoutsCount++;

          // Update robot snapshots
          await updateRobotSnapshots(operatorId, false);

          // Send push notification to operator
          await sendAutoCheckoutPushNotification(operator, client, checkInTime, graceDeadline, shiftHours, false);

          // Invalidate master data cache
          await masterDataCacheService.invalidateCache(`operator ${operatorId} auto-checked-out`);
        }
      } catch (error: any) {
        logger.error(`[AutoCheckout] Error processing check-in ${checkIn._id}:`, error);
        // Continue with next check-in
      }
    }

    // ========== OVERTIME SHIFTS ==========
    // Find all unclosed overtime sessions
    const unclosedOvertimeSessions = await attendanceModel.find({
      "metadata.entryType": "checkIn",
      isOvertimeSession: true,
      overtimeEndTime: { $exists: false }
    });

    logger.info(`[AutoCheckout] Found ${unclosedOvertimeSessions.length} unclosed overtime session(s)`);

    for (const checkIn of unclosedOvertimeSessions) {
      try {
        const operatorId = checkIn.metadata.operatorId;
        const clientId = checkIn.metadata.clientId;
        const approvedHours = checkIn.overtimeApprovedDuration || 2;
        const checkInTime = new Date(checkIn.overtimeStartTime || checkIn.startingTimestamp).getTime();
        const expectedCheckOutTime = checkInTime + (approvedHours * 60 * 60 * 1000);
        const graceDeadline = expectedCheckOutTime + (AUTO_CHECKOUT_GRACE_HOURS * 60 * 60 * 1000);

        // Check if operator is overdue
        if (now > graceDeadline) {
          logger.info(`[AutoCheckout] Operator ${operatorId} overtime overdue - forcing check-out`);

          // Get operator and client details
          const operator = await appUserModel.findById(operatorId).select("name phoneNumber robots");
          const client = await clientModel.findById(clientId);

          if (!operator || !client) {
            logger.warn(`[AutoCheckout] Operator or client not found for overtime session ${checkIn._id}`);
            continue;
          }

          // Calculate actual overtime duration and cost
          const overtimeDurationHours = (graceDeadline - checkInTime) / (1000 * 60 * 60);
          const OT_RATE_MULTIPLIER = Number(process.env.OT_RATE_MULTIPLIER) || 1.5;
          const HOURLY_RATE = 100;
          const overtimeCost = overtimeDurationHours * HOURLY_RATE * OT_RATE_MULTIPLIER;

          // Create auto check-out entry for overtime (similar to regular shifts)
          // Note: We create a separate checkout entry instead of updating the check-in
          // because time-series collections have limitations on updates
          const autoCheckOutEntry = await attendanceModel.create({
            metadata: {
              operatorId,
              clientId,
              entryType: "checkOut"
            },
            startingTimestamp: graceDeadline,
            location: client.location || checkIn.location,
            isOvertimeSession: true,
            overtimeRequestId: checkIn.overtimeRequestId,
            overtimeApprovedDuration: approvedHours,
            overtimeActualDuration: overtimeDurationHours,
            overtimeStartTime: new Date(checkInTime),
            overtimeEndTime: new Date(graceDeadline),
            overtimeCost: overtimeCost,
            autoCheckedOut: true,
            autoCheckOutReason: `Exceeded approved duration (${approvedHours}h) + ${AUTO_CHECKOUT_GRACE_HOURS}h grace period`,
            autoCheckOutTime: new Date(graceDeadline)
          });

          logger.info(`[AutoCheckout] Created auto check-out entry ${autoCheckOutEntry._id} for overtime session ${checkIn._id}`);
          overtimeCheckoutsCount++;

          // Update robot snapshots
          await updateRobotSnapshots(operatorId, false);

          // Send push notification to operator
          await sendAutoCheckoutPushNotification(operator, client, checkInTime, graceDeadline, approvedHours, true);

          // Invalidate master data cache
          await masterDataCacheService.invalidateCache(`operator ${operatorId} overtime auto-checked-out`);
        }
      } catch (error: any) {
        logger.error(`[AutoCheckout] Error processing overtime session ${checkIn._id}:`, error);
        // Continue with next session
      }
    }

    // ========== OLD UNCLOSED SESSIONS (48+ HOURS OLD) ==========
    // PREVENTION: Close any unclosed sessions older than 48 hours to prevent deadlock
    logger.info(`[AutoCheckout] Checking for old unclosed sessions (older than ${AUTO_CHECKOUT_OLD_SESSION_HOURS}h)`);

    const oldUnclosedCheckIns = await attendanceModel.find({
      "metadata.entryType": "checkIn",
      isOvertimeSession: { $ne: true },
      startingTimestamp: {
        $lt: Math.min(oldSessionCutoff, startOfToday) // Use whichever is earlier (should be oldSessionCutoff since 48h < today)
      }
    });

    logger.info(`[AutoCheckout] Found ${oldUnclosedCheckIns.length} old check-in(s) to evaluate`);

    for (const checkIn of oldUnclosedCheckIns) {
      try {
        const operatorId = checkIn.metadata.operatorId;
        const clientId = checkIn.metadata.clientId;
        const checkInTime = checkIn.startingTimestamp;

        // Check if there's already a check-out for this check-in
        const existingCheckOut = await attendanceModel.findOne({
          "metadata.operatorId": operatorId,
          "metadata.clientId": clientId,
          "metadata.entryType": "checkOut",
          startingTimestamp: {
            $gte: checkInTime,
            $lt: startOfToday // Before today
          }
        });

        if (existingCheckOut) {
          // Already checked out, skip
          continue;
        }

        // Get client and operator details
        const client = await clientModel.findById(clientId);
        const operator = await appUserModel.findById(operatorId).select("name phoneNumber robots");

        if (!client || !operator) {
          logger.warn(`[AutoCheckout] Client or operator not found for old check-in ${checkIn._id}`);
          continue;
        }

        const shiftHours = client.operatingHours || 8;
        const forcedCheckOutTime = checkInTime + (shiftHours * 60 * 60 * 1000);

        logger.info(`[AutoCheckout] Auto-closing old unclosed session from ${dayjs(checkInTime).format("YYYY-MM-DD HH:mm")} for operator ${operator.name}`);

        // Create auto check-out entry for old session
        await attendanceModel.create({
          metadata: {
            operatorId,
            clientId,
            entryType: "checkOut"
          },
          startingTimestamp: forcedCheckOutTime,
          location: client.location || checkIn.location,
          autoCheckedOut: true,
          autoCheckOutReason: `Auto-closed old unclosed session (${AUTO_CHECKOUT_OLD_SESSION_HOURS}h+ old) to prevent deadlock`,
          autoCheckOutTime: new Date()
        });

        oldSessionsClosedCount++;

        // Update robot snapshots
        await updateRobotSnapshots(operatorId, false);

        // Invalidate master data cache
        await masterDataCacheService.invalidateCache(`operator ${operatorId} old session auto-closed`);

        logger.info(`[AutoCheckout] Successfully closed old session ${checkIn._id} for operator ${operator.name}`);
      } catch (error: any) {
        logger.error(`[AutoCheckout] Error processing old check-in ${checkIn._id}:`, error);
        // Continue with next check-in
      }
    }

    // Also process old unclosed overtime sessions
    const oldUnclosedOvertimeSessions = await attendanceModel.find({
      "metadata.entryType": "checkIn",
      isOvertimeSession: true,
      overtimeEndTime: { $exists: false },
      startingTimestamp: {
        $lt: oldSessionCutoff // Older than 48 hours
      }
    });

    logger.info(`[AutoCheckout] Found ${oldUnclosedOvertimeSessions.length} old unclosed overtime session(s)`);

    for (const checkIn of oldUnclosedOvertimeSessions) {
      try {
        const operatorId = checkIn.metadata.operatorId;
        const clientId = checkIn.metadata.clientId;
        const approvedHours = checkIn.overtimeApprovedDuration || 2;
        const checkInTime = new Date(checkIn.overtimeStartTime || checkIn.startingTimestamp).getTime();
        const forcedCheckOutTime = checkInTime + (approvedHours * 60 * 60 * 1000);

        const operator = await appUserModel.findById(operatorId).select("name phoneNumber robots");
        const client = await clientModel.findById(clientId);

        if (!operator || !client) {
          logger.warn(`[AutoCheckout] Operator or client not found for old overtime session ${checkIn._id}`);
          continue;
        }

        logger.info(`[AutoCheckout] Auto-closing old overtime session from ${dayjs(checkInTime).format("YYYY-MM-DD HH:mm")} for operator ${operator.name}`);

        const overtimeDurationHours = (forcedCheckOutTime - checkInTime) / (1000 * 60 * 60);
        const OT_RATE_MULTIPLIER = Number(process.env.OT_RATE_MULTIPLIER) || 1.5;
        const HOURLY_RATE = 100;
        const overtimeCost = overtimeDurationHours * HOURLY_RATE * OT_RATE_MULTIPLIER;

        // Update the overtime session with end time
        checkIn.overtimeEndTime = new Date(forcedCheckOutTime);
        checkIn.overtimeActualDuration = overtimeDurationHours;
        checkIn.overtimeCost = overtimeCost;
        checkIn.autoCheckedOut = true;
        checkIn.autoCheckOutReason = `Auto-closed old unclosed overtime session (${AUTO_CHECKOUT_OLD_SESSION_HOURS}h+ old)`;
        checkIn.autoCheckOutTime = new Date();
        await checkIn.save();

        oldSessionsClosedCount++;

        // Update robot snapshots
        await updateRobotSnapshots(operatorId, false);

        // Invalidate master data cache
        await masterDataCacheService.invalidateCache(`operator ${operatorId} old overtime session auto-closed`);

        logger.info(`[AutoCheckout] Successfully closed old overtime session ${checkIn._id} for operator ${operator.name}`);
      } catch (error: any) {
        logger.error(`[AutoCheckout] Error processing old overtime session ${checkIn._id}:`, error);
        // Continue with next session
      }
    }

    logger.info(`[AutoCheckout] Job completed - ${regularCheckoutsCount} regular checkout(s), ${overtimeCheckoutsCount} overtime checkout(s), ${oldSessionsClosedCount} old session(s) closed`);
    */ // END DISABLED CODE
  } catch (error: any) {
    logger.error(`[AutoCheckout] Fatal error in auto-checkout job:`, error);
  }
};

/**
 * Update robot snapshots to set checkedInToday to false
 */
async function updateRobotSnapshots(operatorId: string, checkedInToday: boolean) {
  try {
    const operatorIdStr = operatorId.toString();
    const operatorObjectId = new mongoose.Types.ObjectId(operatorId);
    const robots = await robotModel
      .find(
        {
          $or: [
            { activeOperator: operatorObjectId },
            { "operatorSnapshot.id": operatorIdStr },
            { appUsers: operatorObjectId }
          ]
        }
      )
      .select("_id")
      .lean();

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
          "operatorSnapshot.checkedInToday": checkedInToday
        }
      }
    );

    logger.info(`[AutoCheckout] Updated ${robotUpdateResult.modifiedCount} robot(s) for operator ${operatorId}`);

    const refreshedSnapshots = await refreshOperatorOperationalSnapshots(
      operatorId,
      "auto-checkout snapshot update"
    );

    logger.info(
      `[AutoCheckoutOperationalSnapshot] Refreshed ${refreshedSnapshots.size} robot snapshots for operator ${operatorId}`
    );
  } catch (error: any) {
    logger.error(`[AutoCheckout] Failed to update robot snapshots:`, error.message);
  }
}

/**
 * Send push notification to operator about auto-checkout
 */
async function sendAutoCheckoutPushNotification(
  operator: any,
  client: any,
  checkInTime: number,
  checkOutTime: number,
  shiftHours: number,
  isOvertime: boolean
) {
  try {
    const robotIds = operator.robots || [];
    if (robotIds.length === 0) {
      logger.warn(`[AutoCheckout] No robots found for operator ${operator._id}, skipping push notification`);
      return;
    }

    const sessionType = isOvertime ? "overtime" : "regular";
    const actualHours = ((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(1);
    const overdueHours = (parseFloat(actualHours) - shiftHours).toFixed(1);

    await Promise.all(
      robotIds.map(async (robotId: any) => {
        await pushNotificationQueue.add(
          "pushNotification",
          {
            title: "Automatic Checkout",
            body: `You have been automatically checked out from your ${sessionType} shift. You worked ${actualHours} hours (${shiftHours}h shift + ${AUTO_CHECKOUT_GRACE_HOURS}h grace). Overtime: ${overdueHours}h`,
            robotId: robotId.toString(),
            type: "auto-checkout",
            data: {
              type: "auto-checkout",
              sessionType,
              checkInTime: checkInTime.toString(),
              checkOutTime: checkOutTime.toString(),
              shiftHours: shiftHours.toString(),
              actualHours,
              overdueHours
            }
          },
          {
            removeOnComplete: true,
            removeOnFail: true
          }
        );
      })
    );

    logger.info(`[AutoCheckout] Push notification sent to operator ${operator.name} on ${robotIds.length} device(s)`);
  } catch (error: any) {
    logger.error(`[AutoCheckout] Failed to send push notification:`, error.message);
  }
}
