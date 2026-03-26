import { Request, Response } from "express";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import LidarMap from "../models/lidarMapModel";
import logger from "../utils/logger";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.AWS_ENDPOINT, // MinIO endpoint
  forcePathStyle: process.env.AWS_FORCE_PATH_STYLE === "true", // Required for MinIO
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_SECRET_KEY as string
  }
});

const BUCKET_NAME = process.env.AWS_BUCKET || "lidar-maps";
const PRESIGNED_URL_EXPIRY = 3600; // 1 hour

/**
 * Get all LIDAR maps
 * GET /api/v1/lidar-maps
 */
export const getAllLidarMaps = async (req: Request, res: Response) => {
  try {
    const maps = await LidarMap.find({ status: "ready" }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: maps
    });
  } catch (error) {
    logger.error(`Error fetching LIDAR maps: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch LIDAR maps",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

/**
 * Get single LIDAR map by ID
 * GET /api/v1/lidar-maps/:id
 */
export const getLidarMapById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const map = await LidarMap.findById(id);

    if (!map) {
      return res.status(404).json({
        success: false,
        message: "LIDAR map not found"
      });
    }

    return res.json({
      success: true,
      data: map
    });
  } catch (error) {
    logger.error(`Error fetching LIDAR map: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch LIDAR map",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

/**
 * Get single LIDAR map by name
 * GET /api/v1/lidar-maps/name/:name
 */
export const getLidarMapByName = async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    const map = await LidarMap.findOne({ name });

    if (!map) {
      return res.status(404).json({
        success: false,
        message: "LIDAR map not found"
      });
    }

    return res.json({
      success: true,
      data: map
    });
  } catch (error) {
    logger.error(`Error fetching LIDAR map by name: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch LIDAR map",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

/**
 * Get pre-signed URL for a specific file in LIDAR map
 * POST /api/v1/lidar-maps/:id/presigned-url
 * Body: { fileName: "dlio_map_2d.pgm" | "dlio_map.pcd" | "dlio_map_2d.yaml" | "georef_points.json" }
 */
export const getPresignedUrl = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fileName } = req.body;

    if (!fileName) {
      return res.status(400).json({
        success: false,
        message: "fileName is required"
      });
    }

    const map = await LidarMap.findById(id);

    if (!map) {
      return res.status(404).json({
        success: false,
        message: "LIDAR map not found"
      });
    }

    // Construct S3 key
    const s3Key = `${map.s3FolderPath}/${fileName}`;

    // Generate pre-signed URL
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRY
    });

    return res.json({
      success: true,
      data: {
        presignedUrl,
        expiresIn: PRESIGNED_URL_EXPIRY,
        fileName
      }
    });
  } catch (error) {
    logger.error(`Error generating pre-signed URL: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Failed to generate pre-signed URL",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

/**
 * Get pre-signed URLs for all files in LIDAR map
 * GET /api/v1/lidar-maps/:id/all-presigned-urls
 */
export const getAllPresignedUrls = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const map = await LidarMap.findById(id);

    if (!map) {
      return res.status(404).json({
        success: false,
        message: "LIDAR map not found"
      });
    }

    // Generate pre-signed URLs for all files
    const files = [
      { key: "map2dPgm", fileName: map.map2dPgmFileName },
      { key: "map2dYaml", fileName: map.map2dYamlFileName },
      { key: "map3d", fileName: map.map3dFileName },
      { key: "georef", fileName: map.georefFileName }
    ];

    const urls: Record<string, string> = {};

    for (const file of files) {
      const s3Key = `${map.s3FolderPath}/${file.fileName}`;
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key
      });

      urls[file.key] = await getSignedUrl(s3Client, command, {
        expiresIn: PRESIGNED_URL_EXPIRY
      });
    }

    return res.json({
      success: true,
      data: {
        urls,
        expiresIn: PRESIGNED_URL_EXPIRY
      }
    });
  } catch (error) {
    logger.error(`Error generating pre-signed URLs: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Failed to generate pre-signed URLs",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

/**
 * Create a new LIDAR map entry (for robot to call after uploading to S3)
 * POST /api/v1/lidar-maps
 */
export const createLidarMap = async (req: Request, res: Response) => {
  try {
    const {
      name,
      s3FolderPath,
      map3dFileName,
      map2dPgmFileName,
      map2dYamlFileName,
      georefFileName,
      mapMetadata,
      georefPoints,
      robotId,
      fileSize
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !s3FolderPath ||
      !map3dFileName ||
      !map2dPgmFileName ||
      !map2dYamlFileName ||
      !georefFileName
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Check if map with same name exists
    const existingMap = await LidarMap.findOne({ name });
    if (existingMap) {
      return res.status(400).json({
        success: false,
        message: `LIDAR map with name '${name}' already exists`
      });
    }

    const lidarMap = await LidarMap.create({
      name,
      s3FolderPath,
      map3dFileName,
      map2dPgmFileName,
      map2dYamlFileName,
      georefFileName,
      mapMetadata,
      georefPoints,
      status: "ready",
      robotId,
      fileSize
    });

    return res.status(201).json({
      success: true,
      data: lidarMap
    });
  } catch (error) {
    logger.error(`Error creating LIDAR map: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Failed to create LIDAR map",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

/**
 * Delete LIDAR map (soft delete - set status to failed)
 * DELETE /api/v1/lidar-maps/:id
 */
export const deleteLidarMap = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const map = await LidarMap.findByIdAndUpdate(
      id,
      { status: "failed" },
      { new: true }
    );

    if (!map) {
      return res.status(404).json({
        success: false,
        message: "LIDAR map not found"
      });
    }

    return res.json({
      success: true,
      message: "LIDAR map deleted successfully"
    });
  } catch (error) {
    logger.error(`Error deleting LIDAR map: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Failed to delete LIDAR map",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
