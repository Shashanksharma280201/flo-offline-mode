import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import dayjs from "dayjs";
import mongoose from "mongoose";
import OvertimeRequestModel from "../models/overtimeRequestModel";
import OvertimeSessionModel from "../models/overtimeSessionModel";
import attendanceModel from "../models/attendanceModel";
import appUserModel from "../models/appUserModel";
import clientModel from "../models/clientModel";
import robotModel from "../models/robotModel";
import { emailQueue } from "../queues/emailQueue";
import { pushNotificationQueue } from "../queues/pushNotificationQueue";
import { refreshOperatorOperationalSnapshots } from "../services/robotOperationalSnapshotService";
import logger from "../utils/logger";

const MISSION_CONTROL_URL = process.env.MISSION_CONTROL_URL || "http://localhost:3000";
const OVERTIME_EMAIL_RECIPIENT = process.env.OVERTIME_EMAIL_RECIPIENT || "tahir@flomobility.com";
const OVERTIME_EMAIL_CC = process.env.OVERTIME_EMAIL_CC || "contact@flomobility.com,pratyush@flomobility.com";
const OT_APPROVAL_EXPIRY_HOURS = Number(process.env.OT_APPROVAL_EXPIRY_HOURS) || 1;

/**
 * Refresh operational snapshots for all robots currently associated with an operator.
 *
 * @param operatorId - Operator whose robot snapshots should be recomputed
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
      `[OvertimeOperationalSnapshot] Refreshed ${refreshedSnapshots.size} robot snapshots for operator ${operatorId} after ${reason}`
    );
  } catch (error) {
    logger.error(
      `[OvertimeOperationalSnapshot] Failed to refresh robot snapshots for operator ${operatorId} after ${reason}: ${error}`
    );
  }
};

/**
 * POST /api/overtime/request
 * Operator submits overtime request
 * @access Private (Operator role)
 */
export const createOvertimeRequest = asyncHandler(async (req: Request, res: Response) => {
  const { operatorId, clientId, robotId, requestedDuration, reason } = req.body;

  logger.info(`Overtime request received from operator: ${operatorId}`);

  // Validate required fields
  if (!operatorId || !clientId || !requestedDuration || !reason) {
    res.status(400);
    throw new Error("Missing required fields: operatorId, clientId, requestedDuration, reason");
  }

  // Validate duration range
  if (requestedDuration < 0.5 || requestedDuration > 12) {
    res.status(400);
    throw new Error("Requested duration must be between 0.5 and 12 hours");
  }

  // Validate reason length
  if (reason.length < 10 || reason.length > 500) {
    res.status(400);
    throw new Error("Reason must be between 10 and 500 characters");
  }

  // REMOVED: Check for existing pending request - operators can have unlimited requests per day
  // OLD CODE:
  // const existingPendingRequest = await OvertimeRequestModel.findOne({
  //   operatorId,
  //   status: "pending"
  // });
  // if (existingPendingRequest) {
  //   res.status(400);
  //   throw new Error("You already have a pending overtime request");
  // }

  // Check if operator already has an active overtime session
  // FIXED: Use OvertimeSessionModel instead of attendanceModel
  // The new overtime system uses a separate collection with status field
  // This ensures we only check active sessions in the current system, not stale records from old system
  const activeOTSession = await OvertimeSessionModel.findOne({
    operatorId,
    status: "active"
  });

  if (activeOTSession) {
    res.status(400);
    throw new Error("You already have an active overtime session. Please check out first.");
  }

  // Fetch operator details
  const operator = await appUserModel.findById(operatorId);
  if (!operator) {
    res.status(404);
    throw new Error("Operator not found");
  }

  // Fetch client details
  const client = await clientModel.findById(clientId);
  if (!client) {
    res.status(404);
    throw new Error("Client not found");
  }

  // Fetch robot details if provided
  let robot = null;
  if (robotId) {
    robot = await robotModel.findById(robotId);
    if (!robot) {
      res.status(404);
      throw new Error("Robot not found");
    }
  }

  // Create overtime request
  const overtimeRequest = await OvertimeRequestModel.create({
    operatorId,
    operatorName: operator.name,
    clientId,
    clientName: client.name,
    robotId: robotId || undefined,
    robotName: robot?.name || undefined,
    requestedAt: new Date(),
    requestedDuration,
    reason,
    status: "pending"
  });

  logger.info(`Overtime request created: ${overtimeRequest._id}`);

  // Send email notification to admin
  try {
    const approvalUrl = `${MISSION_CONTROL_URL}/admin/overtime?tab=pending&requestId=${overtimeRequest._id}`;

    const emailBody = `New Overtime Request

Operator: ${operator.name}
Client: ${client.name}${robot?.name ? `\nRobot: ${robot.name}` : ""}
Duration: ${requestedDuration} hours
Requested At: ${dayjs(overtimeRequest.requestedAt).format("MMM D, YYYY h:mm A")}

Reason:
${reason}

Review and Approve: ${approvalUrl}`;

    await emailQueue.add("overtime-request", {
      to: OVERTIME_EMAIL_RECIPIENT,
      subject: `Overtime Request from ${operator.name}`,
      body: emailBody,
      cc: OVERTIME_EMAIL_CC
    });

    logger.info(`Overtime request email queued for ${OVERTIME_EMAIL_RECIPIENT} (CC: ${OVERTIME_EMAIL_CC})`);
  } catch (emailError: any) {
    logger.error(`Failed to send overtime request email: ${emailError.message}`);
    // Don't fail the request if email fails
  }

  res.status(201).json({
    success: true,
    requestId: overtimeRequest._id,
    message: "Overtime request submitted successfully"
  });
});

/**
 * GET /api/overtime/my-requests
 * Get operator's overtime request history
 * @access Private (Operator role)
 */
export const getMyOvertimeRequests = asyncHandler(async (req: Request, res: Response) => {
  const operatorId = req.query.operatorId as string;
  const status = req.query.status as string;
  const limit = Number(req.query.limit) || 20;

  if (!operatorId) {
    res.status(400);
    throw new Error("Missing required parameter: operatorId");
  }

  const query: any = { operatorId };
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    query.status = status;
  }

  const requests = await OvertimeRequestModel.find(query)
    .sort({ requestedAt: -1 })
    .limit(limit);

  const total = await OvertimeRequestModel.countDocuments(query);

  res.json({
    requests,
    total
  });
});

/**
 * GET /api/overtime/active-session
 * Get operator's current active overtime session
 * @access Private (Operator role)
 */
export const getActiveOvertimeSession = asyncHandler(async (req: Request, res: Response) => {
  const operatorId = req.query.operatorId as string;

  if (!operatorId) {
    res.status(400);
    throw new Error("Missing required parameter: operatorId");
  }

  const activeSession = await attendanceModel.findOne({
    "metadata.operatorId": operatorId,
    "metadata.entryType": "checkIn",
    isOvertimeSession: true,
    overtimeEndTime: { $exists: false }
  });

  if (!activeSession) {
    res.json({ session: null });
    return;
  }

  const sessionData = {
    id: activeSession._id,
    requestId: activeSession.overtimeRequestId,
    operatorId: activeSession.metadata.operatorId,
    clientId: activeSession.metadata.clientId,
    approvedDuration: activeSession.overtimeApprovedDuration,
    checkInTime: activeSession.overtimeStartTime?.getTime(),
    isActive: true
  };

  res.json({ session: sessionData });
});

/**
 * GET /api/overtime/admin/pending
 * Get all pending overtime requests
 * @access Private (Admin role)
 */
export const getPendingRequests = asyncHandler(async (req: Request, res: Response) => {
  const requests = await OvertimeRequestModel.find({ status: "pending" })
    .sort({ requestedAt: -1 });

  res.json({
    requests,
    count: requests.length
  });
});

/**
 * POST /api/overtime/admin/approve/:requestId
 * Approve overtime request
 * @access Private (Admin role)
 */
export const approveOvertimeRequest = asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { adminId, adminName, approvedDuration } = req.body;

  if (!adminId || !adminName) {
    res.status(400);
    throw new Error("Missing required fields: adminId, adminName");
  }

  const request = await OvertimeRequestModel.findById(requestId);
  if (!request) {
    res.status(404);
    throw new Error("Overtime request not found");
  }

  if (request.status !== "pending") {
    res.status(400);
    throw new Error(`Request has already been ${request.status}`);
  }

  // Validate approvedDuration if provided
  let finalApprovedDuration = request.requestedDuration; // Default to requested duration

  if (approvedDuration !== undefined && approvedDuration !== null) {
    if (approvedDuration < 0.5 || approvedDuration > 12) {
      res.status(400);
      throw new Error("Approved duration must be between 0.5 and 12 hours");
    }
    finalApprovedDuration = approvedDuration;
  }

  // Calculate expiry time (10 minutes)
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + 600); // 10 minutes (600 seconds)

  request.status = "approved";
  request.approvedBy = adminId;
  request.approvedByName = adminName;
  request.approvedAt = new Date();
  request.approvedDuration = finalApprovedDuration;
  request.expiresAt = expiresAt;

  await request.save();

  logger.info(
    `Overtime request ${requestId} approved by ${adminName} (${adminId}). Approved duration: ${finalApprovedDuration}h. Expires at ${expiresAt}`
  );

  // Send push notification to operator about overtime approval
  try {
    // Get operator's robots to send notifications to all their robot topics
    const operator = await appUserModel.findById(request.operatorId).select("robots");

    if (operator && operator.robots && operator.robots.length > 0) {
      const notificationTitle = "Overtime Request Approved";
      const wasModified = finalApprovedDuration !== request.requestedDuration;
      const notificationBody = wasModified
        ? `Your overtime request was approved for ${finalApprovedDuration} hours (modified from ${request.requestedDuration} hours)`
        : `Your overtime request was approved for ${finalApprovedDuration} hours`;

      // Send notification to all robot topics the operator is subscribed to
      await Promise.all(
        operator.robots.map(async (robotId) => {
          await pushNotificationQueue.add("pushNotification", {
            title: notificationTitle,
            body: notificationBody,
            robotId: robotId.toString(),
            type: "issue", // Reusing existing type since app only handles "issue" and "maintenance"
            data: {
              overtimeRequestId: requestId,
              approvedDuration: finalApprovedDuration.toString(),
              expiresAt: expiresAt.toISOString()
            }
          });
        })
      );

      logger.info(`Push notification sent to operator ${request.operatorId} for overtime approval`);
    }
  } catch (notificationError: any) {
    logger.error(`Failed to send push notification for overtime approval: ${notificationError.message}`);
    // Don't fail the approval if notification fails
  }

  res.json({
    success: true,
    message: "Overtime request approved successfully",
    approvedDuration: finalApprovedDuration,
    expiresAt
  });
});

/**
 * PATCH /api/overtime/admin/update-duration/:requestId
 * Update approved duration for an approved overtime request
 * @access Private (Admin role)
 */
export const updateApprovedDuration = asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { adminId, adminName, approvedDuration } = req.body;

  if (!adminId || !adminName) {
    res.status(400);
    throw new Error("Missing required fields: adminId, adminName");
  }

  if (approvedDuration === undefined || approvedDuration === null) {
    res.status(400);
    throw new Error("Missing required field: approvedDuration");
  }

  // Validate approvedDuration
  if (approvedDuration < 0.5 || approvedDuration > 12) {
    res.status(400);
    throw new Error("Approved duration must be between 0.5 and 12 hours");
  }

  const request = await OvertimeRequestModel.findById(requestId);
  if (!request) {
    res.status(404);
    throw new Error("Overtime request not found");
  }

  // Can only update approved requests
  if (request.status !== "approved") {
    res.status(400);
    throw new Error(`Cannot update duration for ${request.status} request. Only approved requests can be updated.`);
  }

  const oldDuration = request.approvedDuration;
  request.approvedDuration = approvedDuration;

  await request.save();

  logger.info(
    `Overtime request ${requestId} duration updated by ${adminName} (${adminId}). Changed from ${oldDuration}h to ${approvedDuration}h`
  );

  // Send push notification to operator about duration change
  try {
    const operator = await appUserModel.findById(request.operatorId).select("robots");

    if (operator && operator.robots && operator.robots.length > 0) {
      const notificationTitle = "Overtime Duration Updated";
      const notificationBody = `Your approved overtime duration was updated from ${oldDuration} hours to ${approvedDuration} hours`;

      await Promise.all(
        operator.robots.map(async (robotId) => {
          await pushNotificationQueue.add("pushNotification", {
            title: notificationTitle,
            body: notificationBody,
            robotId: robotId.toString(),
            type: "issue",
            data: {
              overtimeRequestId: requestId,
              approvedDuration: approvedDuration.toString(),
              expiresAt: request.expiresAt?.toISOString() || ""
            }
          });
        })
      );

      logger.info(`Push notification sent to operator ${request.operatorId} for duration update`);
    }
  } catch (notificationError: any) {
    logger.error(`Failed to send push notification for duration update: ${notificationError.message}`);
  }

  res.json({
    success: true,
    message: "Approved duration updated successfully",
    oldDuration,
    newDuration: approvedDuration
  });
});

/**
 * POST /api/overtime/admin/reject/:requestId
 * Reject overtime request
 * @access Private (Admin role)
 */
export const rejectOvertimeRequest = asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { adminId, adminName, reason } = req.body;

  if (!adminId || !adminName || !reason) {
    res.status(400);
    throw new Error("Missing required fields: adminId, adminName, reason");
  }

  const request = await OvertimeRequestModel.findById(requestId);
  if (!request) {
    res.status(404);
    throw new Error("Overtime request not found");
  }

  if (request.status !== "pending") {
    res.status(400);
    throw new Error(`Request has already been ${request.status}`);
  }

  request.status = "rejected";
  request.rejectedBy = adminId;
  request.rejectedByName = adminName;
  request.rejectedAt = new Date();
  request.rejectionReason = reason;

  await request.save();

  logger.info(
    `Overtime request ${requestId} rejected by ${adminName} (${adminId}). Reason: ${reason}`
  );

  res.json({
    success: true,
    message: "Overtime request rejected successfully"
  });
});

/**
 * GET /api/overtime/admin/active-sessions
 * Get all active overtime sessions
 * @access Private (Admin role)
 */
export const getActiveSessions = asyncHandler(async (req: Request, res: Response) => {
  // FIXED: Use OvertimeSessionModel instead of attendanceModel
  // The new overtime system stores sessions in OvertimeSessionModel collection
  const activeSessions = await OvertimeSessionModel.find({
    status: "active"
  });

  const sessionsWithDetails = await Promise.all(
    activeSessions.map(async (session) => {
      const operator = await appUserModel.findById(session.operatorId);
      const client = await clientModel.findById(session.clientId);

      const now = new Date();
      const checkInTime = session.checkInTime;
      const elapsedMs = now.getTime() - new Date(checkInTime).getTime();
      const elapsedHours = elapsedMs / (1000 * 60 * 60);

      const approvedDuration = session.approvedDuration || 0;
      const remainingMs = Math.max(0, (approvedDuration * 60 * 60 * 1000) - elapsedMs);

      return {
        session: {
          id: session._id,
          requestId: session.requestId,
          operatorId: session.operatorId,
          clientId: session.clientId,
          approvedDuration: session.approvedDuration,
          checkInTime: checkInTime,
          isActive: true
        },
        operator: {
          id: operator?._id,
          name: operator?.name || "Unknown"
        },
        client: {
          id: client?._id,
          name: client?.name || "Unknown"
        },
        elapsedTime: elapsedMs,
        remainingTime: remainingMs
      };
    })
  );

  res.json({
    sessions: sessionsWithDetails
  });
});

/**
 * GET /api/overtime/admin/history
 * Get overtime history with filters
 * @access Private (Admin role)
 */
export const getOvertimeHistory = asyncHandler(async (req: Request, res: Response) => {
  const {
    startDate,
    endDate,
    operatorId,
    clientId,
    robotId,
    status
  } = req.query;

  const query: any = {};

  if (startDate || endDate) {
    query.requestedAt = {};
    if (startDate) query.requestedAt.$gte = new Date(startDate as string);
    if (endDate) query.requestedAt.$lte = new Date(endDate as string);
  }

  if (operatorId) query.operatorId = operatorId;
  if (clientId) query.clientId = clientId;
  if (robotId) query.robotId = robotId;
  if (status && ["pending", "approved", "rejected"].includes(status as string)) {
    query.status = status;
  }

  const records = await OvertimeRequestModel.find(query).sort({ requestedAt: -1 });

  // Calculate totals for approved/completed requests
  // FIXED: Use OvertimeSessionModel instead of attendanceModel
  // The new overtime system stores sessions in OvertimeSessionModel collection
  const completedSessions = await OvertimeSessionModel.find({
    status: "completed"
  });

  const totalHours = completedSessions.reduce((sum, session) => {
    return sum + (session.actualDuration || 0);
  }, 0);

  // Note: totalCost removed - not tracked in new overtime system
  // Cost calculation should be done separately based on client's overtime rates
  const totalCost = 0;

  res.json({
    records,
    total: records.length,
    totalHours,
    totalCost
  });
});

/**
 * PATCH /api/overtime/admin/update-active-session/:sessionId
 * Update duration for an active overtime session
 * @access Private (Admin role)
 */
export const updateActiveSessionDuration = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { adminId, adminName, newApprovedDuration } = req.body;

  if (!adminId || !adminName) {
    res.status(400);
    throw new Error("Missing required fields: adminId, adminName");
  }

  if (newApprovedDuration === undefined || newApprovedDuration === null) {
    res.status(400);
    throw new Error("Missing required field: newApprovedDuration");
  }

  // Validate new duration
  if (newApprovedDuration < 0.5 || newApprovedDuration > 12) {
    res.status(400);
    throw new Error("Approved duration must be between 0.5 and 12 hours");
  }

  // Find the active overtime session (attendance entry)
  const session = await attendanceModel.findById(sessionId);
  if (!session) {
    res.status(404);
    throw new Error("Overtime session not found");
  }

  // Validate it's an overtime session
  if (!session.isOvertimeSession) {
    res.status(400);
    throw new Error("This is not an overtime session");
  }

  // Validate session is still active (not checked out)
  if (session.overtimeEndTime) {
    res.status(400);
    throw new Error("This overtime session has already been completed. Cannot update duration.");
  }

  const oldDuration = session.overtimeApprovedDuration;

  // Update the approved duration
  session.overtimeApprovedDuration = newApprovedDuration;
  await session.save();

  logger.info(
    `Active overtime session ${sessionId} duration updated by ${adminName} (${adminId}). Changed from ${oldDuration}h to ${newApprovedDuration}h`
  );

  // Send push notification to operator about duration change
  try {
    const operator = await appUserModel.findById(session.metadata.operatorId).select("robots name");

    if (operator && operator.robots && operator.robots.length > 0) {
      const notificationTitle = "Overtime Duration Updated";
      const durationChange = newApprovedDuration > (oldDuration || 0) ? "extended" : "reduced";
      const notificationBody = `Your active overtime was ${durationChange} from ${oldDuration || 0} hours to ${newApprovedDuration} hours`;

      await Promise.all(
        operator.robots.map(async (robotId) => {
          await pushNotificationQueue.add("pushNotification", {
            title: notificationTitle,
            body: notificationBody,
            robotId: robotId.toString(),
            type: "issue", // Reusing existing type
            data: {
              type: "overtime-duration-updated",
              sessionId: sessionId,
              oldDuration: oldDuration?.toString() || "",
              newDuration: newApprovedDuration.toString(),
              overtimeRequestId: session.overtimeRequestId?.toString() || ""
            }
          });
        })
      );

      logger.info(`Push notification sent to operator ${session.metadata.operatorId} for duration update`);
    }
  } catch (notificationError: any) {
    logger.error(`Failed to send push notification for active session duration update: ${notificationError.message}`);
  }

  res.json({
    success: true,
    message: "Active session duration updated successfully",
    oldDuration,
    newDuration: newApprovedDuration,
    session: {
      id: session._id,
      operatorId: session.metadata.operatorId,
      overtimeApprovedDuration: session.overtimeApprovedDuration,
      overtimeStartTime: session.overtimeStartTime,
      isActive: !session.overtimeEndTime
    }
  });
});

/**
 * GET /api/overtime/admin/analytics
 * Get overtime analytics and statistics
 * @access Private (Admin role)
 */
export const getOvertimeAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  const dateFilter: any = {};
  if (startDate || endDate) {
    if (startDate) dateFilter.$gte = new Date(startDate as string);
    if (endDate) dateFilter.$lte = new Date(endDate as string);
  }

  const requestQuery: any = {};
  if (Object.keys(dateFilter).length > 0) {
    requestQuery.requestedAt = dateFilter;
  }

  // Get all requests in date range
  const allRequests = await OvertimeRequestModel.find(requestQuery);
  const totalRequests = allRequests.length;
  const approvedRequests = allRequests.filter((r) => r.status === "approved").length;
  const approvalRate = totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 0;

  // Get completed overtime sessions
  // FIXED: Use OvertimeSessionModel instead of attendanceModel
  // The new overtime system stores sessions in OvertimeSessionModel collection
  const sessionQuery: any = {
    status: "completed"
  };
  if (Object.keys(dateFilter).length > 0) {
    sessionQuery.checkInTime = dateFilter;
  }

  const completedSessions = await OvertimeSessionModel.find(sessionQuery);

  const totalOvertimeHours = completedSessions.reduce((sum, session) => {
    return sum + (session.actualDuration || 0);
  }, 0);

  // Note: totalCost removed - not tracked in new overtime system
  // Cost calculation should be done separately based on client's overtime rates
  const totalCost = 0;

  const averageDuration =
    completedSessions.length > 0 ? totalOvertimeHours / completedSessions.length : 0;

  // Group by operator
  const byOperatorMap = new Map<string, { name: string; hours: number }>();
  for (const session of completedSessions) {
    const operatorId = session.operatorId;
    const existing = byOperatorMap.get(operatorId) || {
      name: session.operatorName || "Unknown",
      hours: 0
    };
    existing.hours += session.actualDuration || 0;

    byOperatorMap.set(operatorId, existing);
  }

  const byOperator = Array.from(byOperatorMap.entries()).map(([operatorId, data]) => ({
    operatorId,
    name: data.name,
    hours: data.hours
  }));

  // Group by client
  const byClientMap = new Map<string, { name: string; hours: number }>();
  for (const session of completedSessions) {
    const clientId = session.clientId;
    const existing = byClientMap.get(clientId) || {
      name: session.clientName || "Unknown",
      hours: 0
    };
    existing.hours += session.actualDuration || 0;

    byClientMap.set(clientId, existing);
  }

  const byClient = Array.from(byClientMap.entries()).map(([clientId, data]) => ({
    clientId,
    name: data.name,
    hours: data.hours
  }));

  // Group by month
  const byMonthMap = new Map<string, { hours: number; cost: number }>();
  for (const session of completedSessions) {
    const month = new Date(session.checkInTime!).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short"
    });

    const existing = byMonthMap.get(month) || { hours: 0, cost: 0 };
    existing.hours += session.actualDuration || 0;
    // Note: cost calculation removed - not tracked in new overtime system
    existing.cost += 0;

    byMonthMap.set(month, existing);
  }

  const byMonth = Array.from(byMonthMap.entries()).map(([month, data]) => ({
    month,
    hours: data.hours,
    cost: data.cost
  }));

  res.json({
    totalRequests,
    approvalRate,
    averageDuration,
    totalOvertimeHours,
    totalCost,
    byOperator,
    byClient,
    byMonth
  });
});

/**
 * POST /api/overtime/check-in
 * Operator checks in for approved overtime session
 * @access Private (Operator role)
 */
export const checkInOvertimeSession = asyncHandler(async (req: Request, res: Response) => {
  const {
    operatorId,
    clientId,
    checkInTimestamp,
    location,
    overtimeRequestId
  } = req.body;

  logger.info(`[OvertimeCheckIn] Request received from operator: ${operatorId}`);

  // Validate required fields
  if (!operatorId || !clientId || !checkInTimestamp || !location || !overtimeRequestId) {
    res.status(400);
    throw new Error("Missing required fields: operatorId, clientId, checkInTimestamp, location, overtimeRequestId");
  }

  // Validate location
  if (!location.lat || !location.lng) {
    res.status(400);
    throw new Error("Invalid location: lat and lng are required");
  }

  // Find the overtime request/approval
  const overtimeRequest = await OvertimeRequestModel.findById(overtimeRequestId);
  if (!overtimeRequest) {
    res.status(404);
    throw new Error("Overtime approval not found");
  }

  // Verify it's approved
  if (overtimeRequest.status !== "approved") {
    res.status(400);
    throw new Error(`Overtime request is ${overtimeRequest.status}, not approved`);
  }

  // Check if approval has expired
  if (overtimeRequest.expiresAt && new Date() > overtimeRequest.expiresAt) {
    res.status(400);
    throw new Error("Overtime approval has expired. Please request new approval.");
  }

  // Check if approval has already been used
  if (overtimeRequest.overtimeSessionId) {
    res.status(400);
    throw new Error("This overtime approval has already been used");
  }

  // Check if operator already has an active overtime session
  const existingActiveSession = await OvertimeSessionModel.findOne({
    operatorId,
    status: "active"
  });

  if (existingActiveSession) {
    res.status(400);
    throw new Error("You already have an active overtime session. Please check out first.");
  }

  // Fetch operator and client details for names
  const operator = await appUserModel.findById(operatorId);
  const client = await clientModel.findById(clientId);

  if (!operator || !client) {
    res.status(404);
    throw new Error("Operator or client not found");
  }

  // Create new overtime session
  const overtimeSession = await OvertimeSessionModel.create({
    requestId: overtimeRequestId,
    operatorId,
    operatorName: operator.name,
    clientId,
    clientName: client.name,
    approvedDuration: overtimeRequest.approvedDuration!,
    checkInTime: new Date(checkInTimestamp),
    status: "active",
    location: {
      lat: location.lat,
      lng: location.lng
    }
  });

  // Mark overtime request as used
  overtimeRequest.overtimeSessionId = overtimeSession._id.toString();
  await overtimeRequest.save();

  logger.info(`[OvertimeCheckIn] Session created: ${overtimeSession._id} for operator ${operator.name}`);

  // Update robot's operatorSnapshot.checkedInToday to true after check-in
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
        "operatorSnapshot.checkedInToday": true,
        "operatorSnapshot.lastCheckInTime": new Date(checkInTimestamp)
      }
    }
  );
  logger.info(`[OvertimeCheckIn] Updated checkedInToday to true for ${robotUpdateResult.modifiedCount} robots for operator ${operatorId}`);
  await refreshOperationalSnapshotsForOperator(
    operatorId,
    "overtime check-in"
  );

  // Send push notification to operator
  try {
    if (operator.robots && operator.robots.length > 0) {
      await Promise.all(
        operator.robots.map(async (robotId) => {
          await pushNotificationQueue.add("pushNotification", {
            title: "Overtime Check-In Successful",
            body: `You've checked in for ${overtimeRequest.approvedDuration} hours of overtime at ${client.name}. Have a productive shift!`,
            robotId: robotId.toString(),
            type: "issue",
            data: {
              type: "overtime-check-in",
              sessionId: overtimeSession._id.toString(),
              approvedDuration: overtimeRequest.approvedDuration!.toString()
            }
          });
        })
      );
      logger.info(`[OvertimeCheckIn] Push notification sent to operator ${operatorId}`);
    }
  } catch (notificationError: any) {
    logger.error(`[OvertimeCheckIn] Failed to send push notification: ${notificationError.message}`);
  }

  res.status(200).json({
    operatorId,
    checkInTimestamp,
    checkInStatus: "ontime",
    sessionId: overtimeSession._id,
    approvedDuration: overtimeRequest.approvedDuration
  });
});

/**
 * POST /api/overtime/check-out
 * Operator checks out from overtime session
 * @access Private (Operator role)
 */
export const checkOutOvertimeSession = asyncHandler(async (req: Request, res: Response) => {
  const {
    operatorId,
    clientId,
    checkOutTimestamp,
    location
  } = req.body;

  logger.info(`[OvertimeCheckOut] Request received from operator: ${operatorId}`);

  // Validate required fields
  if (!operatorId || !clientId || !checkOutTimestamp || !location) {
    res.status(400);
    throw new Error("Missing required fields: operatorId, clientId, checkOutTimestamp, location");
  }

  // Validate location
  if (!location.lat || !location.lng) {
    res.status(400);
    throw new Error("Invalid location: lat and lng are required");
  }

  // Find active overtime session for operator
  const overtimeSession = await OvertimeSessionModel.findOne({
    operatorId,
    status: "active"
  });

  if (!overtimeSession) {
    res.status(404);
    throw new Error("No active overtime session found. Please check in first.");
  }

  // Verify client matches
  if (overtimeSession.clientId !== clientId) {
    logger.warn(
      `[OvertimeCheckOut] Client mismatch: session client ${overtimeSession.clientId} vs request client ${clientId}`
    );
  }

  // Calculate actual duration (in hours)
  const checkInTime = new Date(overtimeSession.checkInTime);
  const checkOutTime = new Date(checkOutTimestamp);
  const durationMs = checkOutTime.getTime() - checkInTime.getTime();
  const actualDuration = durationMs / (1000 * 60 * 60); // Convert to hours

  // Check if early checkout
  const isEarlyCheckout = actualDuration < overtimeSession.approvedDuration;

  // Update session
  overtimeSession.checkOutTime = checkOutTime;
  overtimeSession.checkOutLocation = {
    lat: location.lat,
    lng: location.lng
  };
  overtimeSession.actualDuration = actualDuration;
  overtimeSession.status = "completed";
  overtimeSession.isEarlyCheckout = isEarlyCheckout;

  await overtimeSession.save();

  logger.info(
    `[OvertimeCheckOut] Session completed: ${overtimeSession._id}. Duration: ${actualDuration.toFixed(2)}h ${isEarlyCheckout ? "(EARLY)" : ""}`
  );

  // Update robot's operatorSnapshot.checkedInToday to false after checkout
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
  logger.info(`[OvertimeCheckOut] Updated checkedInToday to false for ${robotUpdateResult.modifiedCount} robots for operator ${operatorId}`);
  await refreshOperationalSnapshotsForOperator(
    operatorId,
    "overtime check-out"
  );

  // If early checkout, send email to admin
  if (isEarlyCheckout) {
    try {
      const earlyBy = overtimeSession.approvedDuration - actualDuration;
      const emailBody = `Early Overtime Checkout Alert

Operator: ${overtimeSession.operatorName}
Client: ${overtimeSession.clientName}

Approved Duration: ${overtimeSession.approvedDuration} hours
Actual Duration: ${actualDuration.toFixed(2)} hours
Difference: ${earlyBy.toFixed(2)} hours early

Check-in Time: ${dayjs(checkInTime).format("MMM D, YYYY h:mm A")}
Check-out Time: ${dayjs(checkOutTime).format("MMM D, YYYY h:mm A")}

Please review and take necessary action.

Best regards,
Flo Mission Control System`;

      await emailQueue.add("overtime-early-checkout", {
        to: OVERTIME_EMAIL_RECIPIENT,
        subject: `Early Overtime Checkout Alert - ${overtimeSession.operatorName}`,
        body: emailBody,
        cc: OVERTIME_EMAIL_CC
      });

      logger.info(`[OvertimeCheckOut] Early checkout email queued for admin`);
    } catch (emailError: any) {
      logger.error(`[OvertimeCheckOut] Failed to send early checkout email: ${emailError.message}`);
    }
  }

  // Send push notification to operator
  try {
    const operator = await appUserModel.findById(operatorId).select("robots");

    if (operator && operator.robots && operator.robots.length > 0) {
      const notificationTitle = isEarlyCheckout ? "Early Check-Out Recorded" : "Overtime Check-Out Successful";
      const notificationBody = isEarlyCheckout
        ? `You've checked out ${(overtimeSession.approvedDuration - actualDuration).toFixed(1)} hours early. The admin team has been notified.`
        : `You've completed ${actualDuration.toFixed(1)} hours of overtime at ${overtimeSession.clientName}. Thank you!`;

      await Promise.all(
        operator.robots.map(async (robotId) => {
          await pushNotificationQueue.add("pushNotification", {
            title: notificationTitle,
            body: notificationBody,
            robotId: robotId.toString(),
            type: "issue",
            data: {
              type: "overtime-check-out",
              sessionId: overtimeSession._id.toString(),
              actualDuration: actualDuration.toString(),
              isEarlyCheckout: isEarlyCheckout.toString()
            }
          });
        })
      );
      logger.info(`[OvertimeCheckOut] Push notification sent to operator ${operatorId}`);
    }
  } catch (notificationError: any) {
    logger.error(`[OvertimeCheckOut] Failed to send push notification: ${notificationError.message}`);
  }

  res.status(200).json({
    operatorId,
    checkOutTimestamp,
    actualDuration,
    isEarlyCheckout
  });
});

/**
 * POST /api/overtime/current-status
 * Get current overtime status for operator (used by state recovery)
 * @access Private (Operator role)
 */
export const getCurrentOvertimeStatus = asyncHandler(async (req: Request, res: Response) => {
  const { operatorId, startOfDay } = req.body;

  if (!operatorId) {
    res.status(400);
    throw new Error("Missing required parameter: operatorId");
  }

  // Find active overtime session
  const activeSession = await OvertimeSessionModel.findOne({
    operatorId,
    status: "active"
  });

  if (!activeSession) {
    res.json({
      hasActiveOvertimeSession: false,
      overtimeSession: null
    });
    return;
  }

  // Return session data
  res.json({
    hasActiveOvertimeSession: true,
    overtimeSession: {
      sessionId: activeSession._id,
      requestId: activeSession.requestId,
      clientId: activeSession.clientId,
      approvedDuration: activeSession.approvedDuration,
      checkInTime: activeSession.checkInTime.getTime()
    }
  });
});
