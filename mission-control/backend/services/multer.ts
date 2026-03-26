import multer from "multer";
import multerS3 from "multer-s3";
import { Request } from "express";
import path from "path";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

import { s3Client } from "./aws";
import robotModel from "../models/robotModel";

dayjs.extend(utc);
dayjs.extend(timezone);

export const upload = multer({
  // CREATE MULTER-S3 FUNCTION FOR STORAGE
  storage: multerS3({
    s3: s3Client,
    bucket: "flo-robot-data",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    cacheControl: "max-age=31536000",
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: async (req: Request, file, cb) => {
      if (!file) {
        cb(new Error("No image file uploaded"));
        return;
      }
      const { robotId } = req.body;
      const fileName = file.originalname;
      const fileParts = fileName.split(".");
      const extension = fileParts[fileParts.length - 1];
      if (!robotId || !fileName) {
        cb(new Error("Missing required request parameter"));
      }
      const robot = await robotModel.findById(robotId);
      if (!robot) {
        cb(new Error("No robot found for the specified Id"));
      }

      cb(null, `${robotId}/image/logo.${extension}`);
    }
  }),
  // SET DEFAULT FILE SIZE UPLOAD LIMIT
  limits: { fileSize: 1024 * 1024 * 50 }, // 50MB
  // FILTER OPTIONS LIKE VALIDATING FILE EXTENSION
  fileFilter: (req, file, cb) => {
    const filetypes = /png/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    return cb(new Error("Only images of extension png is allowed!"));
  }
});

export const maintenanceUpload = multer({
  // CREATE MULTER-S3 FUNCTION FOR STORAGE
  storage: multerS3({
    s3: s3Client,
    bucket: "flo-robot-data",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    cacheControl: "max-age=31536000",
    metadata: (req, file, cb) => {
      cb(null, {
        fieldName: file.fieldname,
        uploadedAt: new Date().toISOString()
      });
    },
    key: (req: Request, file, cb) => {
      if (!file) {
        cb(new Error("No image file uploaded"));
        return;
      }
      const { robotId, submissionTimestamp } = req.body;
      const fileName = file.originalname;

      if (!robotId || !fileName || !submissionTimestamp) {
        cb(new Error("Missing required request parameter: robotId, submissionTimestamp, or fileName"));
        return;
      }

      cb(null, `${robotId}/maintenance/${submissionTimestamp}/${fileName}`);
    }
  }),
  // SET DEFAULT FILE SIZE UPLOAD LIMIT
  limits: {
    fileSize: 1024 * 1024 * 50, // 50MB
    files: 50 // Maximum 50 files
  },
  // FILTER OPTIONS LIKE VALIDATING FILE EXTENSION
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.includes("audio") ||
      file.mimetype.includes("image") ||
      file.mimetype.includes("video")
    ) {
      return cb(null, true);
    }
    return cb(
      new Error(
        `Unsupported File Format ${path.extname(file.originalname)} of type ${
          file.mimetype
        }. Only audio, image, and video files are allowed.`
      )
    );
  }
});

export const issueUpload = multer({
  // CREATE MULTER-S3 FUNCTION FOR STORAGE
  storage: multerS3({
    s3: s3Client,
    bucket: "flo-robot-data",
    contentType: (req, file, cb) => {
      if (
        file.mimetype.includes("audio") ||
        file.mimetype.includes("image") ||
        file.mimetype.includes("video")
      ) {
        return cb(null, file.mimetype);
      }
      return cb(
        new Error(
          `Unsupported File Format ${path.extname(file.originalname)} of type ${
            file.mimetype
          }`
        )
      );
    },
    cacheControl: "max-age=31536000",
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: async (req: Request, file, cb) => {
      if (!file) {
        cb(new Error("No file uploaded"));
        return;
      }
      const { id: senderId } = req.user! as {
        id: string;
      };
      const { robotId, raisedOnTimestamp, messageTimestamp } = req.body;
      const fileName = file.originalname;
      if (
        !robotId ||
        !raisedOnTimestamp ||
        !senderId ||
        !messageTimestamp ||
        !fileName
      ) {
        cb(new Error("Missing required request parameter"));
      }

      cb(
        null,
        `${robotId}/issues/${raisedOnTimestamp}/${senderId}/${messageTimestamp}/${fileName}`
      );
    }
  }),

  // SET DEFAULT FILE SIZE UPLOAD LIMIT
  limits: { fileSize: 1024 * 1024 * 50 }, // 50MB
  // FILTER OPTIONS LIKE VALIDATING FILE EXTENSION
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.includes("audio") ||
      file.mimetype.includes("image") ||
      file.mimetype.includes("video")
    ) {
      return cb(null, true);
    }
    return cb(
      new Error(
        `Unsupported File Format ${path.extname(file.originalname)} of type ${
          file.mimetype
        }`
      )
    );
  }
});

export const voiceMissionUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 50 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.includes("audio")) {
      return cb(null, true);
    }
    return cb(
      new Error(
        `Unsupported File Format ${path.extname(file.originalname)} of type ${
          file.mimetype
        }`
      )
    );
  }
});

export const qcImageUpload = multer({
  // CREATE MULTER-S3 FUNCTION FOR STORAGE
  storage: multerS3({
    s3: s3Client,
    bucket: "flo-robot-data",
    // Note: Bucket does not allow ACLs - using bucket policy for public access instead
    contentType: multerS3.AUTO_CONTENT_TYPE,
    cacheControl: "max-age=31536000",
    metadata: (req, file, cb) => {
      cb(null, {
        fieldName: file.fieldname,
        uploadedAt: new Date().toISOString(),
        fileType: file.mimetype.includes("video") ? "video" : "image"
      });
    },
    key: (req: Request, file, cb) => {
      if (!file) {
        cb(new Error("No file uploaded"));
        return;
      }
      const { robotId, submissionId, questionId } = req.body;
      const fileName = file.originalname;
      const timestamp = Date.now();
      const fileParts = fileName.split(".");
      const extension = fileParts[fileParts.length - 1];

      if (!robotId || !submissionId || !questionId) {
        cb(new Error("Missing required parameters: robotId, submissionId, or questionId"));
        return;
      }

      // Store QC images/videos in organized path: robotId/qc/submissionId/questionId/timestamp-filename
      cb(null, `${robotId}/qc/${submissionId}/q${questionId}/${timestamp}-${fileName}`);
    }
  }),
  // SET DEFAULT FILE SIZE UPLOAD LIMIT
  limits: {
    fileSize: 1024 * 1024 * 100, // 100MB per file (increased for videos)
    files: 10 // Maximum 10 files per upload
  },
  // FILTER OPTIONS LIKE VALIDATING FILE EXTENSION
  fileFilter: (req, file, cb) => {
    if (file.mimetype.includes("image") || file.mimetype.includes("video")) {
      return cb(null, true);
    }
    return cb(
      new Error(
        `Only image and video files are allowed. Received: ${file.mimetype}`
      )
    );
  }
});

export const maintenanceReferenceUpload = multer({
  // CREATE MULTER-S3 FUNCTION FOR STORAGE
  storage: multerS3({
    s3: s3Client,
    bucket: "flo-maintenance-references",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    cacheControl: "max-age=31536000",
    metadata: (req, file, cb) => {
      cb(null, {
        fieldName: file.fieldname,
        uploadedAt: new Date().toISOString(),
        purpose: "maintenance-reference"
      });
    },
    key: (req: Request, file, cb) => {
      if (!file) {
        cb(new Error("No image file uploaded"));
        return;
      }

      // Get stepInfo from custom property (set by middleware before Multer)
      const stepInfo = (req as any).stepInfo;
      if (!stepInfo || !stepInfo.fleetId || !stepInfo.stepTag) {
        cb(new Error("Missing required step information"));
        return;
      }

      const fileName = file.originalname;
      const fileParts = fileName.split(".");
      const extension = fileParts[fileParts.length - 1];

      // Store reference images in: maintenance-references/{fleetId}/{stepTag}.{extension}
      cb(null, `maintenance-references/${stepInfo.fleetId}/${stepInfo.stepTag}.${extension}`);
    }
  }),
  // SET DEFAULT FILE SIZE UPLOAD LIMIT
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB per reference image
  },
  // FILTER OPTIONS LIKE VALIDATING FILE EXTENSION
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    return cb(
      new Error(
        "Only image files (JPEG, PNG, WebP) are allowed for reference images"
      )
    );
  }
});
