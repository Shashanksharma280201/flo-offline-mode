import path from "path";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { s3Client } from "../services/aws";
import logger from "./logger";

const BUCKET_NAME = "flo-maintenance-references";

/**
 * Upload blog media to S3
 * @param file - The file from multer
 * @returns S3 file URL
 */
export const uploadBlogMedia = async (
  file: Express.Multer.File
): Promise<string> => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const s3Key = `blog-assets/${year}/${month}/${fileName}`;

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: "max-age=31536000"
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    return `https://${BUCKET_NAME}.s3.ap-south-1.amazonaws.com/${s3Key}`;
  } catch (error) {
    logger.error("Error uploading to S3:", error);
    throw new Error("Failed to upload blog media to S3");
  }
};

/**
 * Delete blog media from S3
 * @param s3Url - The full S3 URL of the file
 */
export const deleteBlogMedia = async (s3Url: string): Promise<void> => {
  try {
    const urlParts = s3Url.split(".amazonaws.com/");
    if (urlParts.length < 2) {
      throw new Error("Invalid S3 URL");
    }

    const s3Key = urlParts[1];

    if (!s3Key.startsWith("blog-assets/")) {
      throw new Error("Cannot delete non-blog assets");
    }

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key
      })
    );
  } catch (error) {
    logger.error("Error deleting from S3:", error);
    throw new Error("Failed to delete blog media from S3");
  }
};
