import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import QCSubmission from "../models/qcSubmissionModel";
import robotModel from "../models/robotModel";
import QCFormTemplate from "../models/qcFormTemplateModel";
import { s3Client } from "../services/aws";
import logger from "../utils/logger";

/**
 * CRITICAL UTILITY: Ensures QC submission always has user fields populated
 * Prevents frontend crashes from unpopulated references
 * @param submission - QC submission document or query
 * @returns Populated submission
 */
const ensurePopulated = async (submission: any) => {
  if (!submission) return submission;

  // Check if already populated (has name field)
  const needsPopulation =
    typeof submission.submittedBy !== "object" ||
    !submission.submittedBy?.name;

  if (needsPopulation) {
    await submission.populate([
      { path: "submittedBy", select: "name email" },
      { path: "history.editedBy", select: "name email" }
    ]);
  }

  return submission;
};

/**
 * @desc    Create new QC submission
 * @route   POST /api/v1/qc/submissions
 * @access  Private
 */
export const createSubmission = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId, metadata, answers, signOff, status, totalQuestions } =
      req.body;

    logger.info(`[QC Create] Creating submission for robotId: ${robotId}`);

    // Validation
    if (!robotId) {
      res.status(400);
      throw new Error("Robot ID is required");
    }

    // CRITICAL FIX: totalQuestions is now required
    if (!totalQuestions || totalQuestions < 1) {
      res.status(400);
      throw new Error(
        "totalQuestions is required and must be at least 1. Please provide the correct question count from the template."
      );
    }

    // Verify robot exists
    const robot = await robotModel.findById(robotId);
    if (!robot) {
      res.status(404);
      throw new Error("Robot not found");
    }

    logger.info(`[QC Create] Robot found: ${robot.name}, ID: ${robot._id}`);

    // Create submission with required totalQuestions
    const submission = await QCSubmission.create({
      robotId,
      submittedBy: req.user!._id,
      metadata: metadata || {},
      answers: answers || [],
      signOff: signOff || {},
      status: status || "draft",
      totalQuestions // Now required, not optional
    });

    logger.info(
      `[QC Create] Submission created with ID: ${submission._id}, for robotId: ${submission.robotId}`
    );

    // Populate submittedBy before returning (using utility for consistency)
    await ensurePopulated(submission);

    logger.info(
      `QC Submission created for robot ${robotId} by ${req.user!.email}`
    );

    res.status(201).json({
      success: true,
      data: submission
    });
  }
);

/**
 * @desc    Update QC submission
 * @route   PUT /api/v1/qc/submissions/:submissionId
 * @access  Private
 */
export const updateSubmission = asyncHandler(
  async (req: Request, res: Response) => {
    const { submissionId } = req.params;
    const { metadata, answers, signOff, status } = req.body;

    logger.info(`[QC Update] Updating submission: ${submissionId}`);

    const submission = await QCSubmission.findById(submissionId);

    if (!submission) {
      res.status(404);
      throw new Error("QC Submission not found");
    }

    logger.info(
      `[QC Update] Submission found for robotId: ${submission.robotId}`
    );

    // Track changes for history
    const changes: any = {};

    if (metadata) {
      changes.metadata = { old: submission.metadata, new: metadata };
      submission.metadata = metadata;
    }

    if (answers) {
      changes.answers = { modified: true };
      submission.answers = answers;
    }

    if (signOff) {
      changes.signOff = { old: submission.signOff, new: signOff };
      submission.signOff = signOff;
    }

    if (status) {
      changes.status = { old: submission.status, new: status };
      submission.status = status;
    }

    // Add to history
    submission.history.push({
      editedBy: req.user!._id,
      editedAt: new Date(),
      changes: JSON.stringify(changes)
    });

    const updatedSubmission = await submission.save();

    // Populate fields before returning (using utility for consistency)
    await ensurePopulated(updatedSubmission);

    logger.info(`QC Submission ${submissionId} updated by ${req.user!.email}`);

    res.status(200).json({
      success: true,
      data: updatedSubmission
    });
  }
);

/**
 * @desc    Submit QC submission (finalize)
 * @route   POST /api/v1/qc/submissions/:submissionId/submit
 * @access  Private
 */
export const submitQC = asyncHandler(async (req: Request, res: Response) => {
  const { submissionId } = req.params;

  const submission = await QCSubmission.findById(submissionId);

  if (!submission) {
    res.status(404);
    throw new Error("QC Submission not found");
  }

  if (submission.status === "submitted" || submission.status === "approved") {
    res.status(400);
    throw new Error("QC Submission is already finalized");
  }

  // Update status
  submission.status = "submitted";
  submission.submittedAt = new Date();

  // Add to history
  submission.history.push({
    editedBy: req.user!._id,
    editedAt: new Date(),
    changes: JSON.stringify({ status: { old: "draft", new: "submitted" } })
  });

  const submittedQC = await submission.save();

  // Update associated robot status
  await robotModel.findByIdAndUpdate(submission.robotId, {
    "manufacturingData.manufacturingStatus": "qc_pending",
    $push: {
      "manufacturingData.statusHistory": {
        status: "qc_pending",
        changedAt: new Date(),
        changedBy: req.user!._id
      }
    }
  });

  // Populate fields before returning (using utility for consistency)
  await ensurePopulated(submittedQC);

  logger.info(`QC Submission ${submissionId} submitted by ${req.user!.email}`);

  res.status(200).json({
    success: true,
    message: "QC Submission finalized successfully",
    data: submittedQC
  });
});

/**
 * @desc    Get latest QC submission for a robot
 * @route   GET /api/v1/qc/submissions/robot/:robotId
 * @access  Private
 */
export const getLatestQCForRobot = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId } = req.params;

    const latestSubmission = await QCSubmission.findOne({ robotId }).sort({
      createdAt: -1
    });

    if (!latestSubmission) {
      res.status(404);
      throw new Error("No QC submissions found for this robot");
    }

    // Ensure population using utility
    await ensurePopulated(latestSubmission);

    res.status(200).json({
      success: true,
      data: latestSubmission
    });
  }
);

/**
 * @desc    Get QC submission history for a robot
 * @route   GET /api/v1/qc/submissions/robot/:robotId/history
 * @access  Private
 */
export const getQCHistoryForRobot = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    logger.info(`[QC History] Fetching QC history for robotId: ${robotId}`);

    const total = await QCSubmission.countDocuments({ robotId });
    logger.info(`[QC History] Total QC submissions found: ${total}`);

    // Also check all submissions to debug
    const allSubmissions = await QCSubmission.find({})
      .select("robotId")
      .limit(5);
    logger.info(
      `[QC History] Sample robotIds in database: ${allSubmissions
        .map((s) => s.robotId)
        .join(", ")}`
    );

    const submissions = await QCSubmission.find({ robotId })
      .populate("submittedBy", "name email")
      .populate("history.editedBy", "name email")
      .select("-answers") // Exclude heavy answers field, but keep history for last editor info
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    logger.info(
      `[QC History] Returning submissions count: ${submissions.length}`
    );

    res.status(200).json({
      success: true,
      count: submissions.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: submissions
    });
  }
);

/**
 * @desc    Get QC submission by ID
 * @route   GET /api/v1/qc/submissions/:submissionId
 * @access  Private
 */
export const getSubmissionById = asyncHandler(
  async (req: Request, res: Response) => {
    const { submissionId } = req.params;

    const submission = await QCSubmission.findById(submissionId);

    if (!submission) {
      res.status(404);
      throw new Error("QC Submission not found");
    }

    // Ensure population using utility
    await ensurePopulated(submission);

    res.status(200).json({
      success: true,
      data: submission
    });
  }
);

/**
 * @desc    Delete QC submission
 * @route   DELETE /api/v1/qc/submissions/:submissionId
 * @access  Private
 */
export const deleteSubmission = asyncHandler(
  async (req: Request, res: Response) => {
    const { submissionId } = req.params;

    const submission = await QCSubmission.findById(submissionId);

    if (!submission) {
      res.status(404);
      throw new Error("QC Submission not found");
    }

    await submission.deleteOne();

    logger.info(`QC Submission ${submissionId} deleted by ${req.user!.email}`);

    res.status(200).json({
      success: true,
      message: "QC Submission deleted successfully"
    });
  }
);

/**
 * @desc    Upload QC images to S3
 * @route   POST /api/v1/qc/upload-image
 * @access  Private
 */
export const uploadQCImage = asyncHandler(
  async (req: Request, res: Response) => {
    // Files will be uploaded to S3 via multer middleware
    // The multer-s3 middleware automatically uploads files and populates req.files

    if (!req.files || (req.files as Express.MulterS3.File[]).length === 0) {
      res.status(400);
      throw new Error("No files uploaded");
    }

    const files = req.files as Express.MulterS3.File[];

    // Generate signed URLs for immediate preview (valid for 7 days)
    // Also return S3 keys for permanent storage
    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        const getObjectCommand = new GetObjectCommand({
          Bucket: "flo-robot-data",
          Key: file.key
        });

        const signedUrl = await getSignedUrl(s3Client, getObjectCommand, {
          expiresIn: 604800 // 7 days in seconds
        });

        return {
          key: file.key,
          url: signedUrl
        };
      })
    );

    logger.info(
      `Uploaded ${uploadedFiles.length} QC images for question ${
        req.body.questionId
      } by ${req.user!.email}`
    );

    res.status(200).json({
      success: true,
      urls: uploadedFiles.map((f) => f.url), // Return signed URLs for immediate display
      keys: uploadedFiles.map((f) => f.key), // Also return S3 keys for reference
      message: `Successfully uploaded ${uploadedFiles.length} image(s)`
    });
  }
);

/**
 * @desc    Approve or Reject QC submission
 * @route   POST /api/v1/qc/submissions/:submissionId/approve
 * @access  Private (Admin only)
 */
export const approveQCSubmission = asyncHandler(
  async (req: Request, res: Response) => {
    const { submissionId } = req.params;
    const { approved, notes } = req.body;

    const submission = await QCSubmission.findById(submissionId);
    if (!submission) {
      res.status(404);
      throw new Error("QC Submission not found");
    }

    if (submission.status !== "submitted") {
      res.status(400);
      throw new Error("Only submitted QC forms can be approved");
    }

    // Update submission status
    const targetStatus = approved ? "approved" : "draft";
    submission.status = targetStatus;

    // Add to submission history
    submission.history.push({
      editedBy: req.user!._id,
      editedAt: new Date(),
      changes: JSON.stringify({
        status: { old: "submitted", new: targetStatus },
        approvalNotes: notes
      })
    });

    await submission.save();

    // Update Robot Status
    const robotStatus = approved ? "qc_approved" : "manufactured";

    await robotModel.findByIdAndUpdate(submission.robotId, {
      "manufacturingData.manufacturingStatus": robotStatus,
      $push: {
        "manufacturingData.statusHistory": {
          status: robotStatus,
          changedAt: new Date(),
          changedBy: req.user!._id,
          comment: approved
            ? "QC Approved"
            : `QC Rejected: ${notes || "No notes provided"}`
        }
      }
    });

    res.status(200).json({
      success: true,
      message: `QC Submission ${targetStatus} successfully`,
      data: submission
    });
  }
);

/**
 * @desc    Get QC Template for a robot based on its version snapshot
 * @route   GET /api/v1/qc/robot/:robotId/template
 * @access  Private
 */
export const getQCTemplateForRobot = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId } = req.params;
    const { templateId: cachedTemplateId, lastUpdated } = req.query;

    // 1. Resolve Template ID (Lean Robot Fetch)
    const robot = await robotModel
      .findById(robotId)
      .select("fleet fleetSnapshot")
      .populate("fleet", "qcTemplateId")
      .lean();

    if (!robot) {
      res.status(404);
      throw new Error("Robot not found");
    }

    let targetTemplateId = null;
    let source = "";

    if (robot.fleetSnapshot?.qcTemplateId) {
      targetTemplateId = robot.fleetSnapshot.qcTemplateId;
      source = "fleet_snapshot";
    } else if (robot.fleet && (robot.fleet as any).qcTemplateId) {
      targetTemplateId = (robot.fleet as any).qcTemplateId;
      source = "fleet_config";
    }

    // 2. Identify Metadata (Lean Template Fetch)
    let templateMetadata;

    if (targetTemplateId) {
      templateMetadata = await QCFormTemplate.findById(targetTemplateId)
        .select("_id updatedAt version")
        .lean();
    }

    // Fallback to active if no specific template or template missing
    if (!templateMetadata) {
      templateMetadata = await QCFormTemplate.findOne({ isActive: true })
        .select("_id updatedAt version")
        .lean();
      source = targetTemplateId ? "active_fallback" : "active";
    }

    if (!templateMetadata) {
      res.status(404);
      throw new Error("No QC template found. Please contact administrator.");
    }

    // 3. Early Exit: Identity & Freshness Check
    const currentId = templateMetadata._id.toString();
    const currentUpdatedAt = templateMetadata.updatedAt.toISOString();

    const isSameId = cachedTemplateId === currentId;
    const isSameDate =
      lastUpdated &&
      new Date(lastUpdated as string).getTime() ===
        new Date(currentUpdatedAt).getTime();

    if (isSameId && isSameDate) {
      res.json({
        success: true,
        modified: false,
        source
      });
      return;
    }

    // 4. Full Load: Only if metadata mismatch
    // IMPORTANT: Do NOT use .lean() here to preserve virtuals (totalQuestions) and toJSON transform (id)
    const fullTemplate = await QCFormTemplate.findById(templateMetadata._id);
    
    res.json({
      success: true,
      modified: true,
      data: fullTemplate,
      robotVersion: robot.fleetSnapshot?.modelVersion,
      source
    });
  }
);
