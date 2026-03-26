import { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs/promises";
import { createReadStream } from "fs";
import sharp from "sharp";
import logger from "../utils/logger";
import { parsePGM } from "../utils/pgmParser";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get 2D LIDAR map image
 * Converts PGM to PNG and serves it
 * GET /api/v1/maps/:mapName/2d
 */
export const get2DMap = async (req: Request, res: Response) => {
  try {
    const { mapName } = req.params;

    // Validate map name to prevent directory traversal
    if (!mapName || mapName.includes("..") || mapName.includes("/")) {
      return res.status(400).json({
        success: false,
        message: "Invalid map name"
      });
    }

    // Path to the PGM file
    // Maps are stored in the root directory relative to backend
    const pgmPath = path.join(
      __dirname,
      "../../..",
      mapName,
      "dlio_map_2d.pgm"
    );

    logger.info(`Attempting to serve 2D map from: ${pgmPath}`);

    // Check if file exists
    try {
      await fs.access(pgmPath);
    } catch (error) {
      logger.error(`Map file not found: ${pgmPath}`);
      return res.status(404).json({
        success: false,
        message: `Map '${mapName}' not found`
      });
    }

    // Parse PGM file
    const pgmImage = await parsePGM(pgmPath);

    // Convert PGM data to PNG using sharp
    // Feed raw grayscale pixel data to sharp
    const pngBuffer = await sharp(pgmImage.data, {
      raw: {
        width: pgmImage.width,
        height: pgmImage.height,
        channels: 1 // Grayscale
      }
    })
      .png()
      .toBuffer();

    // Set cache headers for better performance
    res.set({
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      "Content-Length": pngBuffer.length
    });

    res.send(pngBuffer);
  } catch (error) {
    logger.error(`Error serving 2D map: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Failed to serve map image",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

/**
 * Get map metadata (resolution, origin, dimensions)
 * GET /api/v1/maps/:mapName/metadata
 */
export const getMapMetadata = async (req: Request, res: Response) => {
  try {
    const { mapName } = req.params;

    // Validate map name
    if (!mapName || mapName.includes("..") || mapName.includes("/")) {
      return res.status(400).json({
        success: false,
        message: "Invalid map name"
      });
    }

    // Path to the YAML metadata file
    const yamlPath = path.join(
      __dirname,
      "../../..",
      mapName,
      "dlio_map_2d.yaml"
    );

    logger.info(`Attempting to serve map metadata from: ${yamlPath}`);

    // Check if file exists
    try {
      await fs.access(yamlPath);
    } catch (error) {
      logger.error(`Map metadata file not found: ${yamlPath}`);
      return res.status(404).json({
        success: false,
        message: `Map metadata for '${mapName}' not found`
      });
    }

    // Read YAML file
    const yamlContent = await fs.readFile(yamlPath, "utf-8");

    // Simple YAML parsing for our specific format
    // Format:
    // resolution: 0.05
    // origin: [-8.407282, -81.081612, 0.0]
    // negate: 0
    // occupied_thresh: 0.65
    // free_thresh: 0.196
    const resolutionMatch = yamlContent.match(/resolution:\s*([0-9.]+)/);
    const originMatch = yamlContent.match(/origin:\s*\[([-0-9., ]+)\]/);

    if (!resolutionMatch || !originMatch) {
      return res.status(500).json({
        success: false,
        message: "Failed to parse map metadata"
      });
    }

    const resolution = parseFloat(resolutionMatch[1]);
    const origin = originMatch[1].split(",").map((s) => parseFloat(s.trim()));

    // Get image dimensions by parsing PGM
    const pgmPath = path.join(
      __dirname,
      "../../..",
      mapName,
      "dlio_map_2d.pgm"
    );

    const pgmImage = await parsePGM(pgmPath);

    return res.json({
      success: true,
      data: {
        mapName,
        resolution,
        origin: {
          x: origin[0],
          y: origin[1],
          z: origin[2] || 0
        },
        imageWidth: pgmImage.width,
        imageHeight: pgmImage.height
      }
    });
  } catch (error) {
    logger.error(`Error serving map metadata: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Failed to serve map metadata",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
