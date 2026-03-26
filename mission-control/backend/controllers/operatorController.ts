import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ObjectId } from "mongoose";
import appUserModel from "../models/appUserModel";
import { s3Client } from "../services/aws";
import appDataModel from "../models/appDataModel";
import robotModel from "../models/robotModel";
import logger from "../utils/logger";
import { masterDataCacheService } from "../services/masterDataCacheService";
import { getISTDateRange } from "../utils/date";
import {
  uploadOperatorDocument,
  deleteOperatorDocument as deleteFromS3
} from "../utils/s3Upload";

/**
 * Register a Data User
 * @access Public
 * @param req - Request with name, phoneNumber, DOB, imageUrl, password in JSON
 * @param res - Response
 *
 *
 */
export const registerOperator = asyncHandler(async (req, res) => {
  const { name, phoneNumber, password, imageUrl, dateOfBirth, clientId } =
    req.body;

  if (!name || !phoneNumber || !password) {
    res.status(400);
    throw new Error("Missing required request parameters");
  }
  const operatorExists = await appUserModel.findOne({ phoneNumber });
  if (operatorExists) {
    res.status(400);
    throw new Error("Operator already exists");
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const operator = await appUserModel.create({
    name,
    phoneNumber,
    password: hashedPassword,
    imageUrl,
    dateOfBirth,
    clientId
  });

  if (operator) {
    res.status(201).json({ message: "Operator Registered successfully!" });
  } else {
    res.status(400);
    throw new Error("Error registering operator");
  }
});

export const getAllOperators = asyncHandler(async (req, res) => {
  const { user } = req;

  if (!user) {
    res.status(401);
    throw new Error("Unauthenticated");
  }

  if (!user.clients) {
    res.status(403);
    throw new Error("User not part of any clients");
  }

  const { start: todayStartIST, end: todayEndIST } = getISTDateRange(); // for isCheckedInToday

  // OPTIMIZED: Single aggregation query instead of N+1 queries
  // Combines: operators from all user's clients + free operators (no client)
  // Performance: 1 query instead of (N clients × 2) + 1 = 2N+1 queries
  const operators = await appUserModel.aggregate([
    {
      // Match operators that belong to user's clients OR have no client (free operators)
      $match: {
        $or: [
          { clientId: { $in: user.clients } },
          { clientId: { $exists: false } }
        ]
      }
    },
    {
      // Lookup (join) with clients collection to get client details
      $lookup: {
        from: "clients",
        localField: "clientId",
        foreignField: "_id",
        as: "clientDetails"
      }
    },
    {
      // Lookup today's attendance records only
      $lookup: {
        from: "attendances",
        let: { operatorId: { $toString: "$_id" } },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$metadata.operatorId", "$$operatorId"] },
                  { $gte: ["$startingTimestamp", todayStartIST] },
                  { $lte: ["$startingTimestamp", todayEndIST] }
                ]
              }
            }
          },
          { $sort: { startingTimestamp: -1 } },
          { $limit: 1 }
        ],
        as: "attendanceDetails"
      }
    },
    {
      // Project (select) only the fields we need
      $project: {
        id: { $toString: "$_id" },
        name: 1,
        phoneNumber: 1,
        imageUrl: 1,
        isActive: 1,
        robotCount: { $size: { $ifNull: ["$robots", []] } },
        startingTimestamp: {
          $arrayElemAt: ["$attendanceDetails.startingTimestamp", 0]
        },
        entryType: {
          $arrayElemAt: ["$attendanceDetails.metadata.entryType", 0]
        },
        // Compute isCheckedInToday: true if latest entry today is a checkIn
        isCheckedInToday: {
          $cond: {
            if: {
              $and: [
                { $gt: [{ $size: "$attendanceDetails" }, 0] },
                {
                  $eq: [
                    {
                      $arrayElemAt: ["$attendanceDetails.metadata.entryType", 0]
                    },
                    "checkIn"
                  ]
                }
              ]
            },
            then: true,
            else: false
          }
        },
        client: {
          $cond: {
            if: { $gt: [{ $size: "$clientDetails" }, 0] },
            then: {
              id: { $toString: { $arrayElemAt: ["$clientDetails._id", 0] } },
              name: { $arrayElemAt: ["$clientDetails.name", 0] },
              checkInTimeWithZone: {
                $arrayElemAt: ["$clientDetails.checkInTimeWithZone", 0]
              }
            },
            else: null
          }
        }
      }
    }
  ]);

  // Transform to match original response format
  res.json(
    operators.map((operator) => ({
      id: operator.id,
      name: operator.name,
      phoneNumber: operator.phoneNumber,
      imageUrl: operator.imageUrl,
      robots: operator.robotCount,
      client: operator.client,
      isActive: operator.isActive,
      isCheckedInToday: operator.isCheckedInToday
    }))
  );
});

export const getOperatorDetails = asyncHandler(async (req, res) => {
  const { operatorId } = req.body;

  if (!operatorId) {
    res.status(400);
    throw new Error("Missing request paramters");
  }

  const operator = await appUserModel
    .findById(operatorId)
    .populate({ path: "clientId", select: "id name checkInTimeWithZone" })
    .select(
      "id name imageUrl phoneNumber robots isActive panCardImageUrls aadharCardImageUrls"
    );

  if (operator) {
    res.json({
      id: operator.id,
      name: operator.name,
      phoneNumber: operator.phoneNumber,
      imageUrl: operator.imageUrl,
      robots: operator.robots,
      client: operator.clientId,
      isActive: operator.isActive,
      panCardImageUrls: operator.panCardImageUrls || [],
      aadharCardImageUrls: operator.aadharCardImageUrls || []
    });
  } else {
    res.status(400);
    throw new Error("Error fetching operator details");
  }
});

export const getOperatorRobots = asyncHandler(async (req, res) => {
  const { operatorId } = req.body;

  if (!operatorId) {
    res.status(400);
    throw new Error("Missing request paramters");
  }

  const robots = await appUserModel
    .findById(operatorId)
    .populate("robots")
    .select("robots");

  if (!robots) {
    res.status(400);
    throw new Error("Error fetching operator robots");
  }
  if (robots.robots === undefined) {
    res.status(400);
    throw new Error("Error fetching operator robots");
  }

  const allRobots = await Promise.all(
    robots.robots.map(async (robot) => {
      // const
      try {
        const getObjectCommand = new GetObjectCommand({
          Bucket: "flo-robot-data",
          Key: `${robot.id}/image/logo.png`
        });

        await s3Client.send(getObjectCommand);

        const url = await getSignedUrl(s3Client, getObjectCommand, {
          expiresIn: 3600
        });
        return {
          id: robot.id,
          name: robot.name,
          operators: robot.appUsers?.length || 0,
          imageUrl: url
        };
      } catch (err) {
        return {
          id: robot.id,
          name: robot.name,
          operators: robot.appUsers?.length || 0,
          imageUrl: null
        };
      }
    })
  );

  if (allRobots) {
    res.json(allRobots);
  } else {
    res.status(400);
    throw new Error("Error fetching operator robots");
  }
});

export const updateOperatorDetails = asyncHandler(async (req, res) => {
  const { operatorId, name, phoneNumber } = req.body;

  if (!operatorId || !name || !phoneNumber) {
    res.status(400);
    throw new Error("Missing required request parameters");
  }

  const operator = await appUserModel.findById(operatorId);

  if (!operator) {
    res.status(404);
    throw new Error("Operator not found");
  }
  const newPassword = `flo${phoneNumber}`;

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  const response = await appUserModel.findByIdAndUpdate(operatorId, {
    name,
    phoneNumber,
    password: hashedPassword
  });

  if (response) {
    // ✅ UPDATE SNAPSHOTS: Update operatorSnapshot on robots where this operator is assigned
    // When operator's name or phone changes, Master Data should reflect the update
    // PERFORMANCE: This is on the write path (operator profile update), not read path
    // Write operations are infrequent compared to Master Data reads, so this is acceptable
    try {
      // Update operatorSnapshot for all robots where this operator is assigned
      // Match by: activeOperator field OR operatorSnapshot.id OR in appUsers array
      const robotUpdateResult = await robotModel.updateMany(
        {
          $or: [
            { activeOperator: operatorId },
            { "operatorSnapshot.id": operatorId },
            { appUsers: operatorId }
          ]
        },
        {
          $set: {
            "operatorSnapshot.name": name,
            "operatorSnapshot.phoneNumber": phoneNumber
          }
        }
      );

      if (robotUpdateResult.modifiedCount > 0) {
        logger.info(
          `Updated operatorSnapshot on ${robotUpdateResult.modifiedCount} robots after updating operator ${operatorId} profile`
        );
      }
    } catch (error) {
      // Log error but don't fail the request - snapshot will be fixed on next check-in
      logger.error(
        `Failed to update robot snapshots after operator profile update: ${error}`
      );
    }

    // ✅ INVALIDATE MASTER DATA CACHE
    // Operator profile change affects master data display
    await masterDataCacheService.invalidateCache(
      `operator ${operatorId} profile updated (name: ${name})`
    );

    res.status(200).json({
      message: "Operator updated successfully!"
    });
  } else {
    res.status(400);
    throw new Error("Error updating operator");
  }
});

export const fetchOperatorsInRange = asyncHandler(async (req, res) => {
  const { clientId, startingTimestamp, endingTimestamp } = req.body;

  if (!startingTimestamp || !endingTimestamp || !clientId) {
    res.status(400);
    throw new Error("Missing required request parameters");
  }

  const operators = await appDataModel.aggregate([
    {
      $match: {
        timestamp: {
          $gte: new Date(startingTimestamp),
          $lte: new Date(endingTimestamp)
        },
        "metadata.clientId": clientId.toString()
      }
    },
    {
      $project: {
        operator: {
          $toObjectId: "$metadata.operatorId"
        }
      }
    },
    {
      $lookup: {
        from: "appusers",
        localField: "operator",
        foreignField: "_id",
        as: "operator"
      }
    },
    {
      $project: {
        operator: {
          $arrayElemAt: ["$operator", 0]
        }
      }
    },
    {
      $group: {
        _id: {
          operatorId: "$operator._id",
          name: "$operator.name",
          phoneNumber: "$operator.phoneNumber",
          clientId: "$operator.clientId",
          robots: "$operator.robots"
        }
      }
    },
    {
      $project: {
        id: "$_id.operatorId",
        name: "$_id.name",
        _id: false
      }
    }
  ]);

  if (operators) {
    res.status(200).json(operators);
  } else {
    res.status(400);
    throw new Error("Error updating operator");
  }
});

export const updateOperatorStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (!id || isActive === undefined) {
    res.status(400);
    throw new Error("Missing required request parameters");
  }

  const operator = await appUserModel.findById(id);

  if (!operator) {
    res.status(404);
    throw new Error("Operator not found");
  }

  const response = await appUserModel.findByIdAndUpdate(id, {
    isActive
  });

  if (response) {
    res.status(200).json({
      message: "Operator status updated successfully!"
    });
  } else {
    res.status(400);
    throw new Error("Error updating operator status");
  }
});

/**
 * Reset operator password
 * @access Private (Admin only)
 * @param req - Request with operatorId in body
 * @param res - Response with new password
 */
export const resetOperatorPassword = asyncHandler(async (req, res) => {
  const { operatorId, newPassword } = req.body;

  if (!operatorId) {
    res.status(400);
    throw new Error("Missing required parameter: operatorId");
  }

  const operator = await appUserModel.findById(operatorId);

  if (!operator) {
    res.status(404);
    throw new Error("Operator not found");
  }

  // Use provided password or default to flo{phoneNumber}
  const passwordToSet = newPassword || `flo${operator.phoneNumber}`;

  // Validate password length
  if (passwordToSet.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters long");
  }

  // Hash the new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(passwordToSet, salt);

  // Update operator password
  await appUserModel.findByIdAndUpdate(operatorId, {
    password: hashedPassword
  });

  logger.info(`Password reset for operator ${operatorId} (${operator.name})`);

  // Invalidate master data cache
  await masterDataCacheService.invalidateCache(
    `operator ${operatorId} password reset`
  );

  res.status(200).json({
    message: "Password reset successfully",
    newPassword: passwordToSet // Return for admin to share with operator
  });
});

/**
 * Upload operator documents (Profile Photo, PAN and Aadhar cards) to S3
 * Supports multiple images per document type
 * @access Private (Admin only)
 * @param req - Request with files (panCardImages, aadharCardImages, imageUrl (profile))
 * @param res - Response with updated operator and uploaded URLs
 */
export const uploadOperatorDocuments = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  if (!id) {
    res.status(400);
    throw new Error("Missing required parameter: operatorId");
  }

  const operator = await appUserModel.findById(id);

  if (!operator) {
    res.status(404);
    throw new Error("Operator not found");
  }

  const panCardImageUrls = operator.panCardImageUrls || [];
  const aadharCardImageUrls = operator.aadharCardImageUrls || [];
  let { imageUrl } = operator;

  try {
    // Upload Profile photo if provided
    if (files?.imageUrl && files.imageUrl.length > 0) {
      // Delete old profile photo from S3 if it exists
      if (imageUrl) {
        try {
          await deleteFromS3(imageUrl);
          logger.info(`Deleted old profile photo for operator ${id}`);
        } catch (err) {
          logger.error(
            `Failed to delete old profile photo for operator ${id}: ${err}`
          );
        }
      }
      const file = files.imageUrl[0];
      imageUrl = await uploadOperatorDocument(file, id, "profile");
      logger.info(`Uploaded profile photo for operator ${id}: ${imageUrl}`);
    }

    // Upload PAN card images if provided
    if (files?.panCardImage && files.panCardImage.length > 0) {
      for (const file of files.panCardImage) {
        const url = await uploadOperatorDocument(file, id, "pan");
        panCardImageUrls.push(url);
        logger.info(`Uploaded PAN card for operator ${id}: ${url}`);
      }
    }

    // Upload Aadhar card images if provided
    if (files?.aadharCardImage && files.aadharCardImage.length > 0) {
      for (const file of files.aadharCardImage) {
        const url = await uploadOperatorDocument(file, id, "aadhar");
        aadharCardImageUrls.push(url);
        logger.info(`Uploaded Aadhar card for operator ${id}: ${url}`);
      }
    }

    // Update operator with new image URLs
    const updatedOperator = await appUserModel.findByIdAndUpdate(
      id,
      {
        panCardImageUrls,
        aadharCardImageUrls,
        imageUrl
      },
      { new: true }
    );

    if (!updatedOperator) {
      res.status(400);
      throw new Error("Failed to update operator documents");
    }

    // Invalidate master data cache
    await masterDataCacheService.invalidateCache(
      `operator ${id} documents uploaded`
    );

    res.status(200).json({
      message: "Documents uploaded successfully",
      panCardImageUrls,
      aadharCardImageUrls,
      imageUrl
    });
  } catch (error: any) {
    logger.error(`Error uploading operator documents: ${error}`);
    res.status(500);
    throw new Error(error.message || "Failed to upload documents");
  }
});

/**
 * Delete a specific operator document from S3
 * @access Private (Admin only)
 * @param req - Request with operatorId, documentType, imageUrl
 * @param res - Response with success message
 */
export const deleteOperatorDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { documentType, imageUrl } = req.body;

  if (!id || !documentType || !imageUrl) {
    res.status(400);
    throw new Error("Missing required parameters");
  }

  if (
    documentType !== "pan" &&
    documentType !== "aadhar" &&
    documentType !== "profile"
  ) {
    res.status(400);
    throw new Error(
      "Invalid document type. Must be 'pan', 'aadhar' or 'profile'"
    );
  }

  const operator = await appUserModel.findById(id);

  if (!operator) {
    res.status(404);
    throw new Error("Operator not found");
  }

  try {
    // Delete from S3
    await deleteFromS3(imageUrl);
    logger.info(`Deleted ${documentType} document for operator ${id}`);

    // Update operator record
    let updateData = {};
    let responseData = {};

    if (documentType === "profile") {
      updateData = { imageUrl: "" };
      responseData = { imageUrl: "" };
    } else {
      const fieldName =
        documentType === "pan" ? "panCardImageUrls" : "aadharCardImageUrls";
      const imageUrls = operator[fieldName] || [];
      const updatedUrls = imageUrls.filter((url) => url !== imageUrl);
      updateData = { [fieldName]: updatedUrls };
      responseData = { [fieldName]: updatedUrls };
    }

    // Update operator
    const updatedOperator = await appUserModel.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true
      }
    );

    if (!updatedOperator) {
      res.status(400);
      throw new Error("Failed to update operator after deletion");
    }

    // Invalidate master data cache
    await masterDataCacheService.invalidateCache(
      `operator ${id} document deleted`
    );

    res.status(200).json({
      message: "Document deleted successfully",
      ...responseData
    });
  } catch (error: any) {
    logger.error(`Error deleting operator document: ${error}`);
    res.status(500);
    throw new Error(error.message || "Failed to delete document");
  }
});
