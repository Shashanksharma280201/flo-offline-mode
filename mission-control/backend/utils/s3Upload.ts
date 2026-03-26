import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../services/aws";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const BUCKET_NAME = "flo-operator-details";

/**
 * Upload operator document to S3
 * @param file - The file from multer
 * @param operatorId - The operator's ID
 * @param documentType - "pan" or "aadhar"
 * @returns S3 file URL
 */
export const uploadOperatorDocument = async (
  file: Express.Multer.File,
  operatorId: string,
  documentType: "pan" | "aadhar" | "profile"
): Promise<string> => {
  try {
    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;

    // Path structure: operators/{operatorId}/{documentType}/{filename}
    const s3Key = `operators/${operatorId}/${documentType}/${fileName}`;

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
      // Make files private by default
      ACL: "private" as const
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Return the S3 URL
    const s3Url = `https://${BUCKET_NAME}.s3.ap-south-1.amazonaws.com/${s3Key}`;
    return s3Url;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw new Error("Failed to upload document to S3");
  }
};

/**
 * Delete operator document from S3
 * @param s3Url - The full S3 URL of the file
 */
export const deleteOperatorDocument = async (s3Url: string): Promise<void> => {
  try {
    // Extract the key from URL
    // URL format: https://flo-operator-details.s3.ap-south-1.amazonaws.com/operators/{operatorId}/{documentType}/{filename}
    const urlParts = s3Url.split(".amazonaws.com/");
    if (urlParts.length < 2) {
      throw new Error("Invalid S3 URL");
    }

    const s3Key = urlParts[1];

    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key
    };

    await s3Client.send(new DeleteObjectCommand(deleteParams));
  } catch (error) {
    console.error("Error deleting from S3:", error);
    throw new Error("Failed to delete document from S3");
  }
};

/**
 * Validate file type for operator documents
 * @param mimetype - The MIME type of the file
 * @returns true if valid
 */
export const isValidDocumentType = (mimetype: string): boolean => {
  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf"
  ];
  return validTypes.includes(mimetype);
};

/**
 * Validate file size (max 5MB)
 * @param size - File size in bytes
 * @returns true if valid
 */
export const isValidFileSize = (size: number): boolean => {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB in bytes
  return size <= MAX_SIZE;
};
