import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import { s3Client } from "../services/aws";
import { generateAppToken } from "../services/jsonWebToken";
import ClientModel from "../models/clientModel";
import appUserModel from "../models/appUserModel";
import attendanceModel from "../models/attendanceModel";

dayjs.extend(duration);

const environment = process.env.NODE_ENV;
/**
 * Change the password of a AppUser
 * @access Public
 * @param req - Request with dataUserId in JSON
 * @param res - Response
 * @returns Message stating if password update was successful or not
 *
 *
 */
export const updatePasswordForAppUser = asyncHandler(async (req, res) => {
  const { dataUserId, newPassword } = req.body;

  if (!dataUserId || !newPassword) {
    res.status(400);
    throw new Error("Missing required request parameters");
  }

  const appUser = await appUserModel.findById(dataUserId);

  if (!appUser) {
    res.status(404);
    throw new Error("Operator not found");
  }

  const isPasswordSame = await bcrypt.compare(newPassword, appUser.password);
  if (isPasswordSame) {
    res.status(400);
    throw new Error("New password cannot be the same as the old password");
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  const response = await appUser.update({ password: hashedPassword });
  if (response.acknowledged) {
    res.status(200).json({
      message: "Password was updated successfully!"
    });
  } else {
    res.status(400);
    throw new Error("Unable to update password, Please try again later");
  }
});

/**
 * Authenticate a AppUser
 * @access Public
 * @param req - Request with email, password in JSON
 * @param res - Response
 * @returns AppUser Details with JWT token
 *
 *
 */
export const loginAppUser = asyncHandler(async (req, res) => {
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || !password) {
    res.status(400);
    throw new Error("Missing required request parameter");
  }

  const appUser = await appUserModel.findOne({ phoneNumber });

  if (!appUser) {
    res.status(404);
    throw new Error("Operator not found");
  }

  if (appUser && (await bcrypt.compare(password, appUser.password))) {
    res.status(200).json({
      id: appUser.id,
      name: appUser.name,
      phoneNumber: appUser.phoneNumber,
      dateOfBirth: appUser.dateOfBirth,
      imageUrl: appUser.imageUrl,
      token: generateAppToken(appUser.id)
    });
  } else {
    res.status(401);
    throw new Error("Invalid credentials");
  }
});

export const getClientDetails = asyncHandler(async (req, res) => {
  const { clientId } = req.user!; // Passed by the middleware protectApp

  if (!clientId) {
    res.status(404);
    throw new Error("Client not linked");
  }

  const client = await ClientModel.findById(clientId).populate({
    path: "materials",
    select: "id name"
  });

  if (!client) {
    res.status(404);
    throw new Error("Client not found");
  }

  res.status(200).json({
    id: client.id,
    name: client.name,
    checkInTimeWithZone: client.checkInTimeWithZone,
    operatingHours: client.operatingHours,
    location: client.location,
    materials: client?.materials || []
  });
});

export const fetchApkUrl = asyncHandler(async (req, res) => {
  const Key =
    environment === "production"
      ? "production/flotrips.apk"
      : "staging/flotrips-staging.apk";
  const getObjectCommand = new GetObjectCommand({
    Bucket: "flo-data-apk",
    Key
  });

  const headObjectCommand = new HeadObjectCommand({
    Bucket: "flo-data-apk",
    Key
  });

  const apkUrl = await getSignedUrl(s3Client, getObjectCommand, {
    expiresIn: 3600
  });
  const metadata = await s3Client.send(headObjectCommand);

  if (apkUrl && metadata && metadata.Metadata) {
    res.status(200).json({
      url: apkUrl,
      version: metadata.Metadata["apk-version"]
    });
  } else {
    res.status(400);
    throw new Error("Unable to fetch app Url, Please try again later");
  }
});

export const fetchApkVersion = asyncHandler(async (req, res) => {
  const headObjectCommand = new HeadObjectCommand({
    Bucket: "flo-data-apk",
    Key:
      environment === "production"
        ? "production/flotrips.apk"
        : "staging/flotrips-staging.apk"
  });
  const metadata = await s3Client.send(headObjectCommand);

  if (metadata && metadata.Metadata) {
    res.status(200).json({
      version: metadata.Metadata["apk-version"]
    });
  } else {
    res.status(400);
    throw new Error("Unable to fetch app Url, Please try again later");
  }
});

export const fetchLeavesOfOperator = asyncHandler(async (req, res) => {
  const { operatorId, clientId, startingTimestamp, endingTimestamp } = req.body;

  if (!operatorId || !clientId || !startingTimestamp || !endingTimestamp) {
    res.status(400);
    throw new Error("Missing required request parameters");
  }

  const operatorLeaves = await attendanceModel.aggregate([
    {
      $match: {
        "metadata.clientId": clientId,
        "metadata.operatorId": operatorId,
        "metadata.entryType": "leave",
        leaveApprovalStatus: "approved",
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
        _v: false,
        metadata: false
      }
    }
  ]);

  if (operatorLeaves) {
    res.json(operatorLeaves);
  } else {
    res.json(400);
    throw new Error("Error fetching leaves by operator");
  }
});

export const createLeaveRequest = asyncHandler(async (req, res) => {
  const { operatorId, leaveStartTimestamp, leaveEndTimestamp, reasonForLeave } =
    req.body;

  if (
    !operatorId ||
    !leaveStartTimestamp ||
    !leaveEndTimestamp ||
    !reasonForLeave
  ) {
    res.status(400);
    throw new Error("Missing required request parameters");
  }

  const loggedInUser = req.user;
  if (!loggedInUser) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  if (loggedInUser.id !== operatorId) {
    res.status(403);
    throw new Error("You cannot request leaves for this user");
  }

  const operatorUpdate = await appUserModel.findByIdAndUpdate(
    operatorId,
    {
      $push: {
        leaveRequests: {
          startingTimestamp: leaveStartTimestamp,
          endingTimestamp: leaveEndTimestamp,
          reasonForLeave
        }
      }
    },
    { upsert: true, new: true }
  );

  if (operatorUpdate) {
    res.json({ messsge: "Leave requested successfully" });
  } else {
    res.status(400);
    throw new Error("Unable to create leave request, Please try again later");
  }
});

export const fetchLeaveRequests = asyncHandler(async (req, res) => {
  const { operatorId, clientId } = req.body;

  if (!operatorId || !clientId) {
    res.status(400);
    throw new Error("Missing required request parameters");
  }

  const operator = await appUserModel.findById(operatorId);

  if (!operator) {
    res.status(404);
    throw new Error("Operator does not exist");
  }

  res.json(operator.leaveRequests);
});

export const approveOperatorLeaveRequest = asyncHandler(async (req, res) => {
  // Variables used in commented code below
  // const { operatorId, requestId, isApproved } = req.body;
  res.json({ message: "Under development" });
  // if (!operatorId || !requestId || typeof isApproved === undefined) {
  //   res.status(400);
  //   throw new Error("Missing required request parameters");
  // }

  // const operator = await appUserModel.findById(operatorId);

  // if (!operator) {
  //   res.status(404);
  //   throw new Error("Operator not found");
  // }

  // const leave = operator.leaveRequests.find(
  //   (request) => request._id.toString() === requestId
  // );

  // if (!leave) {
  //   res.status(404);
  //   throw new Error("Leave request not found");
  // }
  // if (!operator.clientId) {
  //   res.status(404);
  //   throw new Error("Operator not part of any clients");
  // }

  // const metadata: AttendanceMetaData = {
  //   clientId: operator.clientId.toString(),
  //   operatorId,
  //   entryType: "leave"
  // };

  // // Create leave entry
  // const attendance = await attendanceModel.create({
  //   metadata,
  //   startingTimestamp: leave.startingTimestamp,
  //   endingTimestamp: leave.endingTimestamp,
  //   reasonForLeave: leave.reasonForLeave,
  //   leaveApprovalStatus: isApproved ? "approved" : "denied"
  // });

  // if (!attendance) {
  //   res.status(400);
  //   throw new Error("Leave approval failed");
  // }

  // // Remove request from operator
  // const operatorUpdate = await appUserModel.findByIdAndUpdate(
  //   operatorId,
  //   {
  //     $pull: {
  //       leaveRequests: {
  //         _id: requestId
  //       }
  //     }
  //   },
  //   { upsert: true, new: true }
  // );

  // if (attendance && operatorUpdate) {
  //   res.json({
  //     message: `Leave Request has been ${isApproved ? "approved" : "denied"}`
  //   });
  // } else {
  //   res.status(400);
  //   throw new Error("Error while handling leave request");
  // }
});
