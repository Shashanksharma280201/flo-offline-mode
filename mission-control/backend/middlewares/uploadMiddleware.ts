import multer from "multer";
import { Request } from "express";
import { isValidDocumentType, isValidFileSize } from "../utils/s3Upload";

// Configure multer to use memory storage (we'll upload to S3 from memory)
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Validate file type
  if (!isValidDocumentType(file.mimetype)) {
    return cb(
      new Error("Invalid file type. Only JPG, PNG, and PDF files are allowed.")
    );
  }

  cb(null, true);
};

// Create multer upload instance
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

// Middleware for uploading operator documents (PAN and Aadhar)
// Supports multiple files per document type (up to 10 each)
export const uploadOperatorDocuments = upload.fields([
  { name: "panCardImage", maxCount: 10 },
  { name: "aadharCardImage", maxCount: 10 },
  { name: "imageUrl", maxCount: 1 }
]);
