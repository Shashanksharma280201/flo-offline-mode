import { Worker } from "bullmq";
import dayjs from "dayjs";
import dotenv from "dotenv";
import { createRedisInstance } from "../services/redis";
import logger from "../utils/logger";
import robotModel from "../models/robotModel";
import { emailQueue } from "../queues/emailQueue";
import clientModel from "../models/clientModel";
import { pushNotificationQueue } from "../queues/pushNotificationQueue";
import issueModel from "../models/issueModel";
import leadsModel, { Lead } from "../models/leadsModel";
import appDataModel from "../models/appDataModel";
import appUserModel from "../models/appUserModel";

dotenv.config();
const { API_URL } = process.env;
type ScheduledJob = {
  type: string;
  clientId?: string;
  noOfTrips?: number;
  issueId?: string;
  robotId?: string;
  url?: string;
};

type UnassignedRobotEmailRobot = {
  _id: string;
  name: string;
};

/**
 * Returns true when the robot operator array is missing or empty.
 * @param appUsers - Operator assignment array from the robot document
 * @returns Whether the robot meets the no-operator sweep criteria
 */
export function hasNoAssignedOperators(
  appUsers?: Array<unknown> | null
): boolean {
  return !appUsers || appUsers.length === 0;
}

/**
 * Queues the unassigned robot report email for the provided robot list.
 * @param robots - Robot id/name pairs to include in the report email
 * @returns Promise that resolves when the email job is queued
 */
export const queueUnassignedRobotsReportEmail = async (
  robots: UnassignedRobotEmailRobot[]
): Promise<void> => {
  if (robots.length === 0) {
    return;
  }

  const reportIntro =
    "The daily 09:00 AM IST robot assignment sweep detected the following robots with no assigned operators.";
  const recipients = [
    "ashok@flomobility.com",
    "contact@flomobility.com",
    "pratyush@flomobility.com"
  ].join(", ");
  const subject = "Daily Report: Robots Without Assigned Operators";
  const textLinks = robots
    .map((robot) => {
      const url = `https://fleet.flomobility.com/robots/${robot._id}/operators`;
      return `- ${robot.name}: ${url}`;
    })
    .join("\n");
  const htmlLinks = robots
    .map((robot) => {
      const url = `https://fleet.flomobility.com/robots/${robot._id}/operators`;
      return `<li><a href="${url}">${robot.name}</a></li>`;
    })
    .join("");
  const body = `${reportIntro}

Affected robots:

${textLinks}

Required action:
Review the listed robots and assign operators as needed.

This is an automated system notification.`;
  const html = `<p>${reportIntro}</p><p>Affected robots:</p><ul> ${htmlLinks}</ul><p><strong>Required action:</strong><br />Review the listed robots and assign operators as needed.</p><p>This is an automated system notification.</p>`;

  await emailQueue.add(
    "unassigned-robot-report",
    {
      to: recipients,
      subject,
      body,
      html
    },
    {
      removeOnFail: true,
      removeOnComplete: true
    }
  );

  logger.info(
    `[UnassignedRobotSweep] Queued daily report email to ${recipients}`
  );
};

/**
 * Executes the daily sweep for robots with null or empty operator arrays and queues one report email.
 * @returns Promise that resolves when the sweep completes
 */
export const sendUnassignedRobotsReport = async (): Promise<void> => {
  logger.info("[UnassignedRobotSweep] Starting daily unassigned robot sweep");

  const robots = await robotModel
    .find({
      $or: [{ appUsers: { $exists: false } }, { appUsers: { $size: 0 } }]
    })
    .select("_id name");

  logger.info(
    `[UnassignedRobotSweep] Found ${robots.length} robots with null or empty operator arrays`
  );

  if (robots.length === 0) {
    logger.info(
      "[UnassignedRobotSweep] No robots matched the null-or-empty operator array criteria"
    );
    return;
  }

  await queueUnassignedRobotsReportEmail(
    robots.map((robot) => ({
      _id: robot._id.toString(),
      name: robot.name
    }))
  );
};

const notifyMaintenancePending = async () => {
  const fourDaysAgo = dayjs().subtract(4, "days").valueOf();

  const robots = await robotModel
    .find({
      "maintenance.schedule": { $ne: [] },
      "maintenance.lastMaintenance": {
        $lt: fourDaysAgo
      }
    })
    .select("owner id name maintenance")
    .populate({ path: "owner", select: "id email" });

  await Promise.all(
    robots.map(async (robot) => {
      const now = Date.now();
      const daysPending = Math.floor(
        (now - robot.maintenance!.lastMaintenance) / 86400000
      ); // Robot maintenance has to exist for this job to exist
      // const maintenanceDueHtml = render(
      //   MaintenanceDue({
      //     robotName: robot.name,
      //     daysPending,
      //     lastMaintenance: dayjs(robot.maintenance!.lastMaintenance).format(
      //       "DD/MM/YYYY h:mm:ss a"
      //     )
      //   })
      // );
      const maintenanceDueBody = `${
        robot.name
      }'s Maintenance is overdue for ${daysPending} days.\r\n\r\nLast Maintenance Time: ${dayjs(
        robot.maintenance!.lastMaintenance
      ).format("DD/MM/YYYY h:mm:ss a")}`;
      await emailQueue.add(
        "email",
        {
          to: robot.owner.email,
          subject: `Alert: Maintenance overdue for ${robot.name}`,
          body: maintenanceDueBody
        },
        {
          removeOnFail: true,
          removeOnComplete: true
        }
      );
    })
  );
};
const notifyMaintenanceDue = async () => {
  const today = dayjs().day();

  const robots = await robotModel
    .find({
      "maintenance.schedule": { $in: [today], $exists: true, $ne: [] }
    })
    .select("owner id name maintenance")
    .populate({ path: "owner", select: "id email" });

  await Promise.all(
    robots.map(async (robot) => {
      await pushNotificationQueue.add("pushNotification", {
        title: robot.name,
        body: `Maintenance for ${robot.name} is due for today`,
        type: "maintenance",
        robotId: robot.id
      });
    })
  );
};
const notifySiteUtilizationReport = async (job: ScheduledJob) => {
  const { clientId, noOfTrips } = job;
  const client = await clientModel
    .findById(clientId)
    .select("id name owner")
    .populate({ path: "owner", select: "id name email" });
  if (!client) {
    throw new Error("No client found to send client report");
  }
  if (!noOfTrips) {
    throw new Error(
      "Cannot generate site utilization report without no of trips."
    );
  }
  // const clientReportHtml = render(
  //   SiteUtilizationReport({
  //     clientName: client.name,
  //     date: dayjs().format("DD/MM/YYYY h:mm:ss a"),
  //     noOfTrips,
  //     url: `${API_URL}/analytics`
  //   })
  // );
  const clientReportBody = `${noOfTrips} trips were completed today\r\n\r\nSite Name: ${
    client.name
  }\r\nDate: ${dayjs().format(
    "DD/MM/YYYY h:mm:ss a"
  )}\r\n\r\nView Analytics: ${API_URL}/analytics`;
  await emailQueue.add(
    "email",
    {
      to: client.owner.email,
      subject: `Site Utilization Summary - ${client.name}`,
      body: clientReportBody
    },
    {
      removeOnFail: true,
      removeOnComplete: true
    }
  );
};

const notifyPendingIssue = async (job: ScheduledJob) => {
  const { issueId, robotId, url } = job;
  const issue = await issueModel
    .findById(issueId)
    .select("id client name startTimestamp robot title")
    .populate({ path: "client robot", select: "id name" });

  if (!issue) {
    throw new Error("No Issue found");
  }
  const raisedByOperator = issue.thread.at(0)?.senderInfo.name;
  if (!raisedByOperator) {
    throw new Error("No sender info found");
  }

  const robot = await robotModel.findById(robotId).select("id name");
  if (!robot) {
    throw new Error("No robot data found");
  }
  if (!url) {
    throw new Error("Issue url not found");
  }
  const client = await clientModel
    .findById(issue.client.id)
    .select("id name owner")
    .populate({ path: "owner", select: "id name email" });

  if (!client) {
    throw new Error("No Client found for user found");
  }

  const now = Date.now();
  const daysPending = Math.floor((now - issue.startTimestamp) / 86400000);
  // const issuePendingHtml = render(
  //   IssuePending({
  //     title: issue.title,
  //     data: {
  //       robotName: robot.name,
  //       raisedByOperator,
  //       clientName: client.name,
  //       daysPending,
  //       startTime: dayjs(issue.startTimestamp).format("DD/MM/YYYY h:mm:ss a"),
  //       url
  //     }
  //   })
  // );
  const issuePendingBody = `${
    issue.title
  }\r\n\r\nAn Issue is pending for ${daysPending} days at ${
    client.name
  }\r\n\r\nRobot Name: ${
    robot.name
  }\r\nRaised By Operator: ${raisedByOperator}\r\nIssue Start Time: ${dayjs(
    issue.startTimestamp
  ).format("DD/MM/YYYY h:mm:ss a")}\r\n\r\nView Issue: ${url}`;

  await emailQueue.add(
    "email",
    {
      to: client.owner.email,
      subject: `${issue.title}`,
      body: issuePendingBody
    },
    {
      removeOnFail: true,
      removeOnComplete: true
    }
  );
};

type RemindNextStepJob = {
  leadId: string;
  step: string;
  pocName: string;
  emailId: string;
  companyName: string;
  cc?: string | string[];
};

const remindNextStep = async () => {
  const URL = process.env.API_URL;

  const leads = await leadsModel.find({});
  const leadsToNotify = leads.reduce((acc, lead) => {
    if (lead.nextSteps && lead.nextSteps.length) {
      const recentStep = lead.nextSteps[lead.nextSteps.length - 1];

      const isSameDay = dayjs().isSame(dayjs(recentStep.date), "day");
      if (isSameDay) {
        acc.push(lead);
      }
    }
    return acc;
  }, [] as Lead[]);

  const body = `
  Hi,
  These are the leads that have a next step today:
  ${leadsToNotify
    .map(
      (lead) => `
  Poc Name: ${lead.pocName}
  Company Name: ${lead.companyName}
  URL: ${URL}/leads/${lead.id}`
    )
    .join("\n")}
  `;

  await emailQueue.add(
    "email",
    {
      to: "contact@flomobility.com",
      subject: `Next Steps for today`,
      body,
      cc: "pratik@flomobility.com"
    },
    {
      removeOnFail: true,
      removeOnComplete: true
    }
  );
};

const generateSiteUtilizationReport = async () => {
  const URL = process.env.API_URL;
  const gte = dayjs().startOf("day");
  const lte = dayjs();

  logger.info(
    `Site util range: ${gte.format("DD/MM/YY hh:mm:ss a")} - ${lte.format(
      "DD/MM/YY hh:mm:ss a"
    )}`
  );
  const data = await appDataModel
    .find({
      timestamp: {
        $gte: gte.toDate(),
        $lte: lte.toDate()
      }
    })
    .populate({
      path: "metadata.clientId",
      select: "name id"
    })
    .populate({
      path: "metadata.robotId",
      select: "name"
    });

  const totalTripsOverall = data.length;
  const totalTripsPerSite = data.reduce(
    (acc, curr) => {
      const { metadata } = curr;
      const { clientId, robotId } = metadata as unknown as {
        clientId: { name: string; id: string };
        robotId: { name: string };
      };

      if (acc[clientId.name]) {
        if (acc[clientId.name][robotId.name]) {
          acc[clientId.name][robotId.name] += 1;
        } else {
          acc[clientId.name][robotId.name] = 1;
        }
      } else {
        // @ts-ignore
        acc[clientId.name] = {
          [robotId.name]: 1,
          url: `${URL}/analytics?client=${
            clientId.id
          }&gt=${gte.valueOf()}&lt=${lte.valueOf()}`
        };
      }
      return acc;
    },
    {} as {
      [clientId: string]: {
        [robot: string]: number;
        // @ts-ignore
        url: string;
      };
    }
  );

  const mailData = Object.keys(totalTripsPerSite).reduce((acc, clientName) => {
    const clientData = totalTripsPerSite[clientName];

    const robotData = Object.keys(clientData).reduce(
      (robotsString, robotName) => {
        if (robotName !== "url") {
          const robotItem = `${robotName}: ${clientData[robotName]}\n`;
          robotsString += robotItem;
        }
        return robotsString;
      },
      ""
    );

    const clientItem = `
  Client: ${clientName}
  URL: ${clientData.url}
  ${robotData}`;

    return acc + clientItem;
  }, "");

  const clientReportBody = `
  Hi,
  Please find the site utilization report below:

  Date: ${dayjs().format("DD MMM YYYY")}
  Total trips today: ${totalTripsOverall}
  ${mailData}`;

  await emailQueue.add(
    "email",
    {
      to: "contact@flomobility.com",
      subject: `Site Utilization Summary`,
      body: clientReportBody
    },
    {
      removeOnFail: true,
      removeOnComplete: true
    }
  );
};

const updateLeads = async () => {
  try {
    const leads = await leadsModel.find({});
    const today = dayjs().format("YYYY-MM-DD");

    await Promise.all(
      leads.map(async (lead) => {
        const {
          acv: currentAcv,
          product: currentProduct,
          tcv: currentTcv,
          robotCount: currentRobotCount,
          stage: currentStage
        } = lead;

        try {
          await leadsModel.findByIdAndUpdate(lead._id, {
            $set: {
              [`history.${today}`]: {
                acv: currentAcv,
                tcv: currentTcv,
                robotCount: currentRobotCount,
                stage: currentStage,
                product: currentProduct
              }
            }
          });
        } catch (error) {
          logger.error(`Failed to update lead ${lead._id}:`, error);
          throw error;
        }
      })
    );
  } catch (error) {
    logger.error("Failed to update leads", error);
    throw error;
  }
};

/**
 * Daily reset job that runs at midnight IST:
 * 1. Identifies operators with open check-in sessions (not checked out)
 * 2. Sends reminder notifications to operators who haven't checked out
 * 3. Resets operatorSnapshot.checkedInToday to false only for operators who have checked out
 * 4. Calculates yesterday's trip count for each robot and stores it
 * This pre-processes data for the Robot Master Data page to reduce API calls
 */
/**
 * Check for expired overtime approvals that were never used (no check-in)
 * and send email notifications to admin team
 */
const checkExpiredOvertimeApprovals = async () => {
  try {
    logger.info(
      "[OvertimeExpiration] Running scheduled check for expired overtime approvals"
    );

    const OvertimeRequestModel = (
      await import("../models/overtimeRequestModel")
    ).default;
    const appUserModel = (await import("../models/appUserModel")).default;
    const { emailQueue } = await import("../queues/emailQueue");
    const { pushNotificationQueue } = await import(
      "../queues/pushNotificationQueue"
    );

    const ADMIN_EMAIL_TO =
      process.env.OVERTIME_EXPIRATION_EMAIL_TO || "tahir@flomobility.com";
    const ADMIN_EMAIL_CC =
      process.env.OVERTIME_EXPIRATION_EMAIL_CC ||
      "pratyush@flomobility.com,contact@flomobility.com";

    // Find all approved requests that:
    // 1. Have expired (expiresAt < now)
    // 2. Were never used (overtimeSessionId is null/undefined)
    // 3. Haven't already sent expiration email
    const now = new Date();
    const expiredRequests = await OvertimeRequestModel.find({
      status: "approved",
      expiresAt: { $lt: now },
      overtimeSessionId: { $exists: false },
      expirationEmailSent: { $ne: true }
    }).limit(50); // Process max 50 at a time to avoid overload

    if (expiredRequests.length === 0) {
      logger.info("[OvertimeExpiration] No expired approvals found");
      return;
    }

    logger.info(
      `[OvertimeExpiration] Found ${expiredRequests.length} expired approvals without check-in`
    );

    // Send email and push notification for each expired approval
    for (const request of expiredRequests) {
      try {
        const approvedDuration =
          request.approvedDuration || request.requestedDuration;
        const approvedAtTime = request.approvedAt
          ? new Date(request.approvedAt).toLocaleString()
          : "N/A";
        const expiresAtTime = request.expiresAt
          ? new Date(request.expiresAt).toLocaleString()
          : "N/A";
        const minutesSinceExpiry = request.expiresAt
          ? Math.floor(
              (now.getTime() - request.expiresAt.getTime()) / (1000 * 60)
            )
          : 0;

        // Send email to admin team
        const emailBody = `Overtime Approval Expired Without Check-In

Operator: ${request.operatorName}
Operator ID: ${request.operatorId}
Client: ${request.clientName}
${request.robotName ? `Robot: ${request.robotName}\n` : ""}
Approved Duration: ${approvedDuration} hours
Reason: ${request.reason}

Approval Details:
- Approved At: ${approvedAtTime}
- Approved By: ${request.approvedByName || request.approvedBy || "Unknown"}
- Expires At: ${expiresAtTime}
- Expired ${minutesSinceExpiry} minutes ago

The operator was approved for overtime but did not check in within the approval window.
This approval has now expired and cannot be used.

Request ID: ${request._id}

---
This is an automated notification from the Fleet Management System.`;

        await emailQueue.add("overtime-expiration", {
          to: ADMIN_EMAIL_TO,
          cc: ADMIN_EMAIL_CC,
          subject: `Overtime Approval Expired - ${request.operatorName} at ${request.clientName}`,
          body: emailBody
        });

        logger.info(
          `[OvertimeExpiration] Sent expiration email for request ${request._id} - Operator: ${request.operatorName}`
        );

        // Send push notification to operator
        try {
          const operator = await appUserModel
            .findById(request.operatorId)
            .select("robots");
          if (operator && operator.robots && operator.robots.length > 0) {
            await Promise.all(
              operator.robots.map(async (robotId) => {
                await pushNotificationQueue.add("pushNotification", {
                  title: "Overtime Approval Expired",
                  body: `Your overtime approval for ${approvedDuration} hours has expired. Please request approval again if you still need overtime.`,
                  robotId: robotId.toString(),
                  type: "issue",
                  data: {
                    type: "overtime-expired",
                    overtimeRequestId: request._id.toString(),
                    approvedDuration: approvedDuration.toString()
                  }
                });
              })
            );
            logger.info(
              `[OvertimeExpiration] Sent expiration push notification to operator ${request.operatorId}`
            );
          }
        } catch (notifError: any) {
          logger.error(
            `[OvertimeExpiration] Failed to send push notification for request ${request._id}:`,
            notifError
          );
          // Continue even if push notification fails
        }

        // Mark as email sent
        request.expirationEmailSent = true;
        await request.save();
      } catch (emailError: any) {
        logger.error(
          `[OvertimeExpiration] Failed to send email for request ${request._id}:`,
          emailError
        );
        // Continue with next request even if this one fails
      }
    }

    logger.info(
      `[OvertimeExpiration] Processed ${expiredRequests.length} expired approvals`
    );
  } catch (error: any) {
    logger.error("[OvertimeExpiration] Error in expiration checker:", error);
    throw error;
  }
};

const dailyRobotDataReset = async () => {
  try {
    logger.info("Starting daily robot data reset job...");

    // Import models needed for this job
    const attendanceModel = (await import("../models/attendanceModel")).default;
    const appUserModel = (await import("../models/appUserModel")).default;
    const { pushNotificationQueue } = await import(
      "../queues/pushNotificationQueue"
    );

    // 1. Find all operators with open check-in sessions (checked in but not checked out)
    const todayStart = dayjs().startOf("day").toDate();
    const todayEnd = dayjs().endOf("day").toDate();

    // Find check-ins without matching check-outs for today
    const openCheckIns = await attendanceModel.find({
      "metadata.entryType": "checkIn",
      startingTimestamp: {
        $gte: todayStart,
        $lte: todayEnd
      }
    });

    const operatorsWithOpenSessions = [];
    for (const checkIn of openCheckIns) {
      const operatorId = checkIn.metadata.operatorId;

      // Check if this is an overtime session
      if (checkIn.isOvertimeSession) {
        // For overtime, check if overtimeEndTime exists
        if (!checkIn.overtimeEndTime) {
          operatorsWithOpenSessions.push({
            operatorId,
            clientId: checkIn.metadata.clientId,
            isOvertime: true
          });
        }
      } else {
        // For regular sessions, check if there's a matching check-out
        const checkOut = await attendanceModel.findOne({
          "metadata.operatorId": operatorId,
          "metadata.clientId": checkIn.metadata.clientId,
          "metadata.entryType": "checkOut",
          startingTimestamp: {
            $gte: checkIn.startingTimestamp
          }
        });

        if (!checkOut) {
          operatorsWithOpenSessions.push({
            operatorId,
            clientId: checkIn.metadata.clientId,
            isOvertime: false
          });
        }
      }
    }

    logger.info(
      `Found ${operatorsWithOpenSessions.length} operators with open check-in sessions`
    );

    // 2. Send push notifications to operators with open sessions
    for (const { operatorId, isOvertime } of operatorsWithOpenSessions) {
      try {
        const operator = await appUserModel
          .findById(operatorId)
          .select("robots name");
        if (operator && operator.robots && operator.robots.length > 0) {
          const sessionType = isOvertime ? "overtime" : "regular";
          await Promise.all(
            operator.robots.map(async (robotId) => {
              await pushNotificationQueue.add("pushNotification", {
                title: "Checkout Reminder",
                body: `Please check out from your ${sessionType} shift. You cannot check in tomorrow until you complete checkout.`,
                robotId: robotId.toString(),
                type: "issue", // Reusing issue type for compatibility
                data: {
                  type: "checkout-reminder",
                  isOvertime: isOvertime.toString()
                }
              });
            })
          );
          logger.info(
            `Sent checkout reminder to operator ${operator.name} (${operatorId})`
          );
        }
      } catch (notifError: any) {
        logger.error(
          `Failed to send checkout reminder to operator ${operatorId}: ${notifError.message}`
        );
      }
    }

    // 3. Reset checkedInToday to false ONLY for robots whose operators have checked out
    // We do NOT reset for operators with open sessions to prevent them from checking in again
    const operatorsWithOpenSessionsIds = operatorsWithOpenSessions.map(
      (s) => s.operatorId
    );

    if (operatorsWithOpenSessionsIds.length > 0) {
      logger.info(
        `Skipping reset for ${operatorsWithOpenSessionsIds.length} operators with open sessions`
      );
    }

    const resetResult = await robotModel.updateMany(
      {
        "operatorSnapshot.checkedInToday": true,
        // Exclude operators with open sessions
        ...(operatorsWithOpenSessionsIds.length > 0 && {
          "operatorSnapshot.id": {
            $nin: operatorsWithOpenSessionsIds.map((id) => id.toString())
          }
        })
      },
      {
        $set: {
          "operatorSnapshot.checkedInToday": false
        }
      }
    );
    logger.info(
      `Reset checkedInToday for ${resetResult.modifiedCount} robots (excluding ${operatorsWithOpenSessionsIds.length} with open sessions)`
    );

    // NOTE: We do NOT reset isActive here - that field represents employment status,
    // not daily attendance. isActive should only be changed by admin via operator management.
    // Attendance is tracked separately via checkedInToday and attendance records.

    // 2. Calculate yesterday's trip count for each robot
    const yesterdayStart = dayjs().subtract(1, "day").startOf("day").toDate();
    const yesterdayEnd = dayjs().subtract(1, "day").endOf("day").toDate();

    // Aggregate trip counts per robot for yesterday
    const tripCounts = await appDataModel.aggregate([
      {
        $match: {
          timestamp: {
            $gte: yesterdayStart,
            $lte: yesterdayEnd
          }
        }
      },
      {
        $group: {
          _id: "$metadata.robotId",
          tripCount: { $sum: 1 }
        }
      }
    ]);

    // Update each robot with yesterday's trip count
    const tripUpdates = tripCounts.map(async (item) => {
      return robotModel.findByIdAndUpdate(item._id, {
        yesterdayTripCount: item.tripCount
      });
    });

    await Promise.all(tripUpdates);
    logger.info(`Updated yesterday trip count for ${tripCounts.length} robots`);

    // Reset trip count to 0 for robots that had no trips yesterday
    // (to clear stale counts from previous days)
    const robotIdsWithTrips = tripCounts.map((item) => item._id);
    const clearResult = await robotModel.updateMany(
      {
        _id: { $nin: robotIdsWithTrips },
        yesterdayTripCount: { $gt: 0 }
      },
      { yesterdayTripCount: 0 }
    );
    logger.info(
      `Cleared stale trip counts for ${clearResult.modifiedCount} robots`
    );

    logger.info("Daily robot data reset job completed successfully");
  } catch (error) {
    logger.error("Failed to run daily robot data reset:", error);
    throw error;
  }
};

const scheduledJobsWorker = new Worker<ScheduledJob & RemindNextStepJob, void>(
  "schedule-job",
  async (job) => {
    logger.debug(`Recevied a ${job.data.type} job`);

    const { type } = job.data;

    switch (type) {
      case "maintenance-check": {
        await notifyMaintenancePending();
        break;
      }
      case "maintenance-due": {
        await notifyMaintenanceDue();
        break;
      }
      case "generate-site-utilization-report": {
        await generateSiteUtilizationReport();
        break;
      }
      case "issue-pending": {
        await notifyPendingIssue(job.data);
        break;
      }
      case "leads-daily-update": {
        await updateLeads();
        break;
      }
      case "remind-next-step": {
        await remindNextStep();
        break;
      }
      case "daily-robot-data-reset": {
        await dailyRobotDataReset();
        break;
      }
      case "check-expired-overtime": {
        await checkExpiredOvertimeApprovals();
        break;
      }
      case "auto-checkout": {
        const { autoCheckoutJob } = await import("../jobs/autoCheckoutJob");
        await autoCheckoutJob();
        break;
      }
      case "unassigned-robot-sweep": {
        await sendUnassignedRobotsReport();
        break;
      }
      default: {
        logger.debug("Unkown job type: ", job.id);
        break;
      }
    }
  },
  { connection: createRedisInstance() }
);
scheduledJobsWorker.on("error", (err) => {
  logger.error("Worker error:", err);
});

scheduledJobsWorker.on("completed", (job) => {
  logger.debug(`Scheduled Job ${job.id} completed`);
});

scheduledJobsWorker.on("failed", (job, err) => {
  logger.error(`Scheduled Job ${job?.id} failed with error: ${err.message}`);
});
