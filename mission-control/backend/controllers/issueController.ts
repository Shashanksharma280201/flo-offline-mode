import { ObjectId } from "mongoose";
import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import asyncHandler from "express-async-handler";
import dayjs from "dayjs";
import dotenv from "dotenv";
import issueModel, { IssueData } from "../models/issueModel";
import { s3Client } from "../services/aws";
import robotModel from "../models/robotModel";
import { emailQueue } from "../queues/emailQueue";
import clientModel from "../models/clientModel";
import { pushNotificationQueue } from "../queues/pushNotificationQueue";
import { scheduledJobsQueue } from "../queues/scheduledJobs";
import { masterDataCacheService } from "../services/masterDataCacheService";

dotenv.config();

const repeatEverySevenDays = { pattern: "0 0 10 */7 * *", tz: "Asia/Kolkata" }; // repeat Every 7 days at 10am IST
const { API_URL } = process.env;
export const fetchRobotIssues = asyncHandler(async (req, res) => {
  const { robotId } = req.body;

  if (!robotId) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const robotIssues = await issueModel.aggregate([
    {
      $match: {
        robot: robotId
      }
    },
    {
      $lookup:
        /**
         * from: The target collection.
         * localField: The local join field.
         * foreignField: The target join field.
         * as: The name for the results.
         * pipeline: Optional pipeline to run on the foreign collection.
         * let: Optional variables to use in the pipeline field stages.
         */
        {
          from: "clients",
          let: {
            client: {
              $toObjectId: "$client"
            }
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$client"]
                }
              }
            }
          ],
          as: "client"
        }
    },
    {
      $unwind:
        /**
         * path: Path to the array field.
         * includeArrayIndex: Optional name for index.
         * preserveNullAndEmptyArrays: Optional
         *   toggle to unwind null and empty values.
         */
        {
          path: "$client",
          preserveNullAndEmptyArrays: true
        }
    },
    {
      $set:
        /**
         * field: The field name
         * expression: The expression.
         */
        {
          "client.id": {
            $toString: "$client._id"
          },
          id: {
            $toString: "$_id"
          }
        }
    },
    {
      $project:
        /**
         * specifications: The fields to
         *   include or exclude.
         */
        {
          id: 1,
          title: 1,
          "client.name": 1,
          "client.id": 1,
          status: 1,
          raisedOnTimestamp: 1,
          startTimestamp: 1,
          closeTimestamp: 1,
          threadCount: {
            $cond: {
              if: {
                $isArray: "$thread"
              },
              then: {
                $size: "$thread"
              },
              else: "NA"
            }
          }
        }
    }
  ]);

  if (robotIssues) {
    res.json(robotIssues);
  } else {
    res.status(400);
    throw new Error("Error fetching issues");
  }
});

export const queryRobotIssues = asyncHandler(async (req, res) => {
  const {
    startingTimestamp,
    endingTimestamp,
    robotId,
    clientId,
    issueStatus,
    searchValue,
    page = 1,
    typeOfIssue,
    issueSubCategory
  } = req.body;
  const limit = 10; // Number of documents per page
  const skip = (page - 1) * limit; // Number of documents to skip

  const { user } = req;

  if (!user) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  const clients = user.clients || [];

  const robotIssues = await issueModel.aggregate([
    {
      $match: {
        ...(robotId && { robot: robotId }),
        ...(clientId
          ? { client: clientId }
          : { client: { $in: clients.map((c: ObjectId) => c.toString()) } }),
        ...(startingTimestamp &&
          endingTimestamp && {
            startTimestamp: {
              $gte: startingTimestamp,
              $lte: endingTimestamp
            }
          }),
        ...(searchValue && {
          title: {
            $regex: searchValue,
            $options: "i"
          }
        }),
        ...(issueStatus &&
          issueStatus.toLowerCase() !== "all" && {
            status: issueStatus.toLowerCase()
          }),
        ...(typeOfIssue &&
          typeOfIssue.toLowerCase() !== "all" && {
            typeOfIssue: typeOfIssue.toLowerCase()
          }),
        ...(issueSubCategory && { issueSubCategory }),
      }
    },
    { $sort: { startTimestamp: -1 } },
    {
      $facet: {
        totalCount: [{ $count: "total" }],
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: "clients",
              let: { client: { $toObjectId: "$client" } },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$_id", "$$client"] }
                  }
                }
              ],
              as: "client"
            }
          },
          {
            $lookup: {
              from: "robots",
              localField: "robot",
              foreignField: "_id",
              as: "robot"
            }
          },
          {
            $unwind: {
              path: "$client",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $unwind: {
              path: "$robot",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $set: {
              "client.id": { $toString: "$client._id" },
              id: { $toString: "$_id" }
            }
          },
          {
            $project: {
              id: 1,
              title: 1,
              "robot.name": 1,
              "robot.id": "$robot._id",
              "client.name": 1,
              "client.id": 1,
              status: 1,
              typeOfIssue:1,
              issueSubCategory:1,
              raisedOnTimestamp: 1,
              startTimestamp: 1,
              closeTimestamp: 1,
              threadCount: {
                $cond: {
                  if: { $isArray: "$thread" },
                  then: { $size: "$thread" },
                  else: "NA"
                }
              }
            }
          }
        ]
      }
    }
  ]);

  if (robotIssues) {
    const total = robotIssues[0].totalCount[0]?.total ?? 0; // Total number of documents
    const current = robotIssues[0].data.length; // Number of documents in the current page
    const issues = robotIssues[0].data;

    res.json({
      metaData: {
        total,
        page,
        current,
        limit
      },
      issues
    });
  } else {
    res.status(500);
    throw new Error("Error fetching robot issues");
  }
});

export const fetchIssueMessageAttachments = asyncHandler(async (req, res) => {
  const { robotId, issueId, senderId, messageId } = req.body;

  if (!robotId || !issueId || !senderId || !messageId) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const { robots } = req.user as {
    robots: string[];
  };

  if (!robots.includes(robotId)) {
    res.status(400);
    throw new Error("User does not have access to the robot");
  }

  const robotIssue = await issueModel
    .findById<IssueData>(issueId)
    .populate({ path: "robot", select: "id name" });

  if (!robotIssue) {
    res.status(404);
    throw new Error("Issue not found");
  }

  const listObjectsCommand = new ListObjectsV2Command({
    Bucket: "flo-robot-data",
    Prefix: `${robotIssue.robot.id}/issues/${robotIssue.raisedOnTimestamp}/${senderId}/${messageId}`
  });

  const data: string[] = [];
  const { Contents } = await s3Client.send(listObjectsCommand);

  Contents?.forEach((entry) => {
    if (entry.Key) data.push(entry.Key);
  });

  const attachmentRes = data.map(async (key) => {
    const getObjectCommand = new GetObjectCommand({
      Bucket: "flo-robot-data",
      Key: key
    });
    const headObjectCommand = new HeadObjectCommand({
      Bucket: "flo-robot-data",
      Key: key
    });
    const url = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: 3600
    });

    const metadata = await s3Client.send(headObjectCommand);

    return { mediaType: metadata.ContentType, url };
  });
  const attachments = await Promise.all(attachmentRes);

  if (attachments) {
    res.json(attachments);
  } else {
    res.status(400);
    throw new Error("Error fetching issue");
  }
});

export const fetchRobotIssueThread = asyncHandler(async (req, res) => {
  const { robotId, issueId } = req.body as {
    robotId: string;
    issueId: string;
  };
  if (!robotId || !issueId) {
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

  const robotIssue = await issueModel
    .findById(issueId)
    .populate({ path: "client robot", select: "id name" });

  if (robotIssue) {
    res.json(robotIssue);
  } else {
    res.status(400);
    throw new Error("Error fetching issue");
  }
});

export const sendMessageToIssueThread = asyncHandler(async (req, res) => {
  const { robotId, issueId, message, messageTimestamp } = req.body;

  if (!issueId || !message || !robotId || !messageTimestamp) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const {
    id: userId,
    name: userName,
    robots
  } = req.user! as {
    id: string;
    name: string;
    robots: string[];
  };

  if (!robots.includes(robotId)) {
    res.status(400);
    throw new Error("User does not have access to the robot");
  }

  const issue = await issueModel.findById(issueId);
  if (!issue) {
    res.status(404);
    throw new Error("Issue not found");
  }

  const robot = await robotModel.findById(robotId).select("id name");
  if (!robot) {
    res.status(404);
    throw new Error("Robot not found");
  }

  await pushNotificationQueue.add("pushNotification", {
    title: robot.name,
    body: `${userName} commented on your issue "${issue.title.substring(
      0,
      Math.min(issue.title.length, 20)
    )}${issue.title.length > 20 ? "..." : ""}"`,
    type: "issue",
    data: { issueId },
    robotId
  });

  const issueMessage = {
    id: messageTimestamp,
    message,
    senderInfo: { id: userId, name: userName },
    attachments: (req.files && req.files.length !== 0) ?? false
  };
  const updatedRobotIssue = await issueModel.findByIdAndUpdate(
    issueId,
    {
      $push: { thread: issueMessage }
    },
    { new: true, upsert: true }
  );

  if (updatedRobotIssue) {
    res.json({ message: "Message sent successfully" });
  } else {
    res.status(400);
    throw new Error("Error sending message to thread");
  }
});

export const raiseRobotIssue = asyncHandler(async (req, res) => {
  const {
    robotId,
    operatorId,
    operatorName,
    clientId,
    title,
    startTimestamp,
    message,
    raisedOnTimestamp,
    issueType,
    issueSubCategory
  } = req.body;
  if (
    !robotId ||
    !operatorId ||
    !clientId ||
    !operatorName ||
    !title ||
    !startTimestamp ||
    !message ||
    !raisedOnTimestamp
  ) {
    res.status(400);
    throw new Error("Missing request parameters");
  }
  const robot = await robotModel
    .findById(robotId)
    .select("owner id name operatorSnapshot")
    .populate({ path: "owner", select: "id email" });
  if (!robot) {
    res.status(404);
    throw new Error("Robot not found");
  }

  // Check-in validation: operator must be checked in before raising issues
  if (robot.operatorSnapshot) {
    if (robot.operatorSnapshot.id === operatorId && !robot.operatorSnapshot.checkedInToday) {
      res.status(403);
      throw new Error("You must check in before raising issues. Please check in first.");
    }
  }
  const client = await clientModel.findById(clientId).select("id name");

  const robotIssue = await issueModel.create({
    robot: robotId,
    client: clientId,
    title,
    startTimestamp,
    raisedOnTimestamp,
    typeOfIssue: issueType?.toLowerCase() || "other",
    issueSubCategory: issueSubCategory || "",
    thread: [
      {
        id: raisedOnTimestamp,
        message,
        senderInfo: {
          id: operatorId,
          name: operatorName
        },
        attachments: req.files ? req.files.length !== 0 : false
      }
    ],
    status: "open"
  });

  // Increment openIssuesCount on robot for faster Master Data queries
  await robotModel.findByIdAndUpdate(robotId, { $inc: { openIssuesCount: 1 } });

  // ✅ INVALIDATE MASTER DATA CACHE
  await masterDataCacheService.invalidateCache(`issue raised for robot ${robotId}: ${title}`);

  const url = `${API_URL}/robots/${robot.id}/issues/${robotIssue.id}`;
  // const issueOpenedHtml = render(
  //   IssueOpened({
  //     title,
  //     desc: message,
  //     data: {
  //       robotName: robot.name,
  //       raisedByOperator: operatorName,
  //       clientName: client?.name,
  //       startTime: dayjs(Number(startTimestamp)).format("DD/MM/YYYY h:mm:ss a"),
  //       url
  //     }
  //   })
  // );
  // Send email to hrithish with contact as CC
  await emailQueue.add("email", {
    to: "hrithish@flomobility.com",
    cc: "contact@flomobility.com",
    subject: `Issue raised for ${robot.name} ${
      client ? `at ${client.name}` : ""
    }`,
    body: `${title}\r\n\r\n${message}\r\n\r\n${
      client?.name ? `Site Name: ${client.name}\r\n` : ""
    }Robot Name: ${
      robot.name
    }\r\nRaised By Operator: ${operatorName}\r\nIssue Start Time: ${dayjs(
      Number(startTimestamp)
    ).format("DD/MM/YYYY h:mm:ss a")}\r\n\r\nView Open Issue: ${url}`
  });

  await scheduledJobsQueue.add(
    "email",
    {
      type: "issue-pending",
      issueId: robotIssue.id,
      robotId: robot.id,
      url
    },
    {
      jobId: robotIssue.id,
      repeat: repeatEverySevenDays,
      removeOnFail: true,
      removeOnComplete: true
    }
  );

  if (robotIssue) {
    res.json({
      robotName: robot.name,
      url: `${API_URL}/robots/${robot.id}/issues/${robotIssue.id}\n`
    });
  } else {
    res.status(500);
    throw new Error("Error raising an issue");
  }
});

export const closeRobotIssue = asyncHandler(async (req, res) => {
  const { robotId, issueId, closeTimestamp, issueSolution } =
    req.body;

  if (!issueId || !closeTimestamp || !issueSolution) {
    res.status(400);
    throw new Error("Missing request parameters");
  }
  const { robots, name: userName } = req.user! as {
    robots: string[];
    name: string;
  };

  if (!robots.includes(robotId)) {
    res.status(400);
    throw new Error("User does not have access to the robot");
  }

  const robot = await robotModel
    .findById(robotId)
    .select("owner id name")
    .populate({ path: "owner", select: "id email" });

  if (!robot) {
    res.status(404);
    throw new Error("Robot not found");
  }

  const issue = await issueModel
    .findById(issueId)
    .populate({ path: "client", select: "id name" });
  if (!issue) {
    res.status(404);
    throw new Error("Issue not found");
  }
  if (issue.status === "closed") {
    res.status(400);
    throw new Error("Issue was already closed");
  }

  const updateIssueResponse = await issueModel.findByIdAndUpdate(issueId, {
    status: "closed",
    solution: issueSolution,
    closeTimestamp
  });

  // Decrement openIssuesCount on robot for faster Master Data queries
  await robotModel.findByIdAndUpdate(robotId, { $inc: { openIssuesCount: -1 } });

  // ✅ INVALIDATE MASTER DATA CACHE
  await masterDataCacheService.invalidateCache(`issue closed for robot ${robotId}: ${issue.title}`);

  // const issueClosedHtml = render(
  //   IssueClosed({
  //     title: issue.title,
  //     data: {
  //       clientName: issue.client.name,
  //       robotName: robot.name,
  //       closedByOperator: userName,
  //       closeTime: dayjs(closeTimestamp).format("DD/MM/YYYY h:mm:ss a"),
  //       url: `${API_URL}/robots/${robot.id}/issues/${issueId}`
  //     }
  //   })
  // );

  // Send email to hrithish with contact as CC
  await emailQueue.add(
    "email",
    {
      to: "hrithish@flomobility.com",
      cc: "contact@flomobility.com",
      subject: `Issue closed for ${robot.name} ${
        issue.client ? `at ${issue.client.name}` : ""
      }`,
      body: `${issue.title}\n\nAn Issue was closed by ${userName} on ${dayjs(
        closeTimestamp
      ).format("DD/MM/YYYY h:mm:ss a")} in ${
        issue.client.name
      }\n\nView Closed Issue: ${`${API_URL}/robots/${robot.id}/issues/${issueId}`}`
    },
    {
      removeOnFail: true,
      removeOnComplete: true
    }
  );

  await pushNotificationQueue.add("pushNotification", {
    title: `${robot.name}`,
    body: `${userName} closed the issue ${issue.title}`,
    type: "issue",
    data: { issueId },
    robotId
  });

  await scheduledJobsQueue.removeRepeatable(
    "email",
    repeatEverySevenDays,
    issueId
  );

  if (updateIssueResponse) {
    res.json({ message: "Issue closed successfully!" });
  } else {
    res.status(400);
    throw new Error("Error resolving issue");
  }
});

// Udpating the issue data
export const updateIssueData = asyncHandler (async (req, res) => {
  const { id } = req.params;
  const { title, status, typeOfIssue, robotId } = req.body;

  if (!title || !status || !robotId || !typeOfIssue || !id) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const issueupdate = await issueModel.findByIdAndUpdate(id, {
    ...(title && { title }),
    ...(status && { status }),
    ...(typeOfIssue && { typeOfIssue: typeOfIssue.toLowerCase() }),
  });
  if (issueupdate) {
    res.json(issueupdate);
  } else {
    res.status(400);
    throw new Error("Error updating Issues");
  }
})

// Export issues for Excel download - returns all issues (no pagination) grouped by category
export const exportIssuesForExcel = asyncHandler(async (req, res) => {
  const {
    startingTimestamp,
    endingTimestamp,
    robotId,
    clientId,
    issueStatus,
    typeOfIssue,
    issueSubCategory
  } = req.query as {
    startingTimestamp?: string;
    endingTimestamp?: string;
    robotId?: string;
    clientId?: string;
    issueStatus?: string;
    typeOfIssue?: string;
    issueSubCategory?: string;
  };

  const { user } = req;

  if (!user) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  // Require date range to prevent massive exports
  if (!startingTimestamp || !endingTimestamp) {
    res.status(400);
    throw new Error("Date range is required for export");
  }

  const clients = user.clients || [];

  const issues = await issueModel.aggregate([
    {
      $match: {
        ...(robotId && { robot: robotId }),
        ...(clientId
          ? { client: clientId }
          : { client: { $in: clients.map((c: ObjectId) => c.toString()) } }),
        startTimestamp: {
          $gte: Number(startingTimestamp),
          $lte: Number(endingTimestamp)
        },
        ...(issueStatus &&
          issueStatus.toLowerCase() !== "all" && {
            status: issueStatus.toLowerCase()
          }),
        ...(typeOfIssue &&
          typeOfIssue.toLowerCase() !== "all" && {
            typeOfIssue: typeOfIssue.toLowerCase()
          }),
        ...(issueSubCategory && { issueSubCategory })
      }
    },
    { $sort: { startTimestamp: -1 } },
    {
      $lookup: {
        from: "clients",
        let: { client: { $toObjectId: "$client" } },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", "$$client"] }
            }
          }
        ],
        as: "clientData"
      }
    },
    {
      $lookup: {
        from: "robots",
        localField: "robot",
        foreignField: "_id",
        as: "robotData"
      }
    },
    {
      $unwind: {
        path: "$clientData",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: "$robotData",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        id: { $toString: "$_id" },
        title: 1,
        robotName: "$robotData.name",
        robotId: "$robotData._id",
        clientName: "$clientData.name",
        clientId: { $toString: "$clientData._id" },
        status: 1,
        typeOfIssue: 1,
        issueSubCategory: 1,
        raisedOnTimestamp: 1,
        startTimestamp: 1,
        closeTimestamp: 1,
        solution: 1,
        // Get the first thread message as the issue description
        issueDescription: {
          $cond: {
            if: { $and: [{ $isArray: "$thread" }, { $gt: [{ $size: "$thread" }, 0] }] },
            then: { $arrayElemAt: ["$thread.message", 0] },
            else: ""
          }
        },
        // Get who raised the issue (first thread sender)
        raisedBy: {
          $cond: {
            if: { $and: [{ $isArray: "$thread" }, { $gt: [{ $size: "$thread" }, 0] }] },
            then: { $arrayElemAt: ["$thread.senderInfo.name", 0] },
            else: ""
          }
        },
        threadCount: {
          $cond: {
            if: { $isArray: "$thread" },
            then: { $size: "$thread" },
            else: 0
          }
        }
      }
    }
  ]);

  // Group issues by category
  const groupedIssues: Record<string, typeof issues> = {
    mechanical: [],
    electrical: [],
    downtime: [],
    observation: [],
    other: []
  };

  issues.forEach((issue) => {
    const category = issue.typeOfIssue?.toLowerCase() || "other";
    if (groupedIssues[category]) {
      groupedIssues[category].push(issue);
    } else {
      groupedIssues.other.push(issue);
    }
  });

  res.json({
    totalCount: issues.length,
    groupedIssues,
    exportedAt: Date.now()
  });
});

export const fetchIssueWithAttachments = asyncHandler(async (req, res) => {
  const { robotId, issueId } = req.query as {
    robotId: string;
    issueId: string;
  };

  if (!robotId || !issueId) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const { robots } = req.user as {
    robots: string[];
  };

  if (!robots.includes(robotId)) {
    res.status(400);
    throw new Error("User does not have access to the robot");
  }

  const robotIssue = await issueModel
    .findById<IssueData>(issueId)
    .populate({ path: "robot client", select: "id name" });

  if (!robotIssue) {
    res.status(404);
    throw new Error("Issue not found");
  }

  const issueThreadWithAttachments = await Promise.all(
    robotIssue.thread.map(async (threadItem) => {
      const keys: string[] = [];

      const listObjectsCommand = new ListObjectsV2Command({
        Bucket: "flo-robot-data",
        Prefix: `${robotIssue.robot.id}/issues/${robotIssue.raisedOnTimestamp}/${threadItem.senderInfo.id}/${threadItem.id}`
      });

      const { Contents } = await s3Client.send(listObjectsCommand);
      Contents?.forEach((entry) => {
        if (entry.Key) {
          keys.push(entry.Key);
        }
      });

      const urls = await Promise.all(
        keys.map(async (key) => {
          const getObjectCommand = new GetObjectCommand({
            Bucket: "flo-robot-data",
            Key: key
          });

          const headObjectCommand = new HeadObjectCommand({
            Bucket: "flo-robot-data",
            Key: key
          });

          const url = await getSignedUrl(s3Client, getObjectCommand, {
            expiresIn: 3600
          });
          const metadata = await s3Client.send(headObjectCommand);

          return { mediaType: metadata.ContentType, url };
        })
      );

      return {
        id: threadItem.id,
        message: threadItem.message,
        senderInfo: threadItem.senderInfo,
        attachments: urls
      };
    })
  );

  if (issueThreadWithAttachments) {
    res.json({
      id: robotIssue.id,
      title: robotIssue.title,
      client: robotIssue.client,
      robot: robotIssue.robot,
      raisedOnTimestamp: robotIssue.raisedOnTimestamp,
      startTimestamp: robotIssue.startTimestamp,
      status: robotIssue.status,
      issueSubCategory: robotIssue.issueSubCategory, 
      ...(robotIssue.solution && { solution: robotIssue.solution }),
      thread: issueThreadWithAttachments
    });
  } else {
    res.status(400);
    throw new Error("Error fetching issue");
  }
});
