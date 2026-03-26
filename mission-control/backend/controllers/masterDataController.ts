import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { masterDataCacheService } from "../services/masterDataCacheService";
import logger from "../utils/logger";

/**
 * Get Cached Master Data
 * @access Private
 * @route GET /api/v1/masterdata/cached
 *
 * Returns all robots master data from Redis cache
 * Ultra-fast response (<50ms) with automatic fallback to MongoDB if cache miss
 *
 * Frontend handles filtering, sorting, and pagination for best UX
 */
export const getCachedMasterData = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Get from cache (auto-rebuilds if miss)
      const cachedData = await masterDataCacheService.getCachedMasterData();

      if (cachedData) {
        res.status(200).json({
          success: true,
          data: cachedData,
          source: "cache"
        });
        return;
      }

      // Cache failed - use fallback to MongoDB
      logger.warn("Cache unavailable, using fallback master data query");
      const fallbackData = await masterDataCacheService.getFallbackMasterData();

      res.status(200).json({
        success: true,
        data: fallbackData,
        source: "fallback"
      });

    } catch (error) {
      logger.error(`Error in getCachedMasterData: ${error}`);
      res.status(500);
      throw new Error("Failed to fetch master data");
    }
  }
);

/**
 * Refresh Master Data Cache
 * @access Private (Admin only)
 * @route POST /api/v1/masterdata/refresh
 *
 * Manually triggers cache rebuild
 * Useful for debugging or after bulk data imports
 */
export const refreshMasterDataCache = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const result = await masterDataCacheService.refreshCache();

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          duration: result.duration
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      logger.error(`Error in refreshMasterDataCache: ${error}`);
      res.status(500);
      throw new Error("Failed to refresh cache");
    }
  }
);

/**
 * Get Cache Status
 * @access Private (Admin only)
 * @route GET /api/v1/masterdata/cache-status
 *
 * Returns cache metadata (last updated, version, size)
 */
export const getCacheStatus = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const cachedData = await masterDataCacheService.getCachedMasterData();

      if (!cachedData) {
        res.status(200).json({
          success: true,
          cached: false,
          message: "No cache available"
        });
        return;
      }

      res.status(200).json({
        success: true,
        cached: true,
        lastUpdated: cachedData.lastUpdated,
        version: cachedData.version,
        robotCount: cachedData.robots.length
      });
    } catch (error) {
      logger.error(`Error in getCacheStatus: ${error}`);
      res.status(500);
      throw new Error("Failed to get cache status");
    }
  }
);
