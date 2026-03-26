import { redisClient } from "./redis";
import logger from "../utils/logger";
import { robotMasterDataService } from "./robotMasterDataService";

const CACHE_KEY = "masterdata:cache";
const CACHE_LOCK_KEY = "masterdata:cache:building";
const CACHE_LOCK_TTL = 60; // 60 seconds lock

interface CachedMasterData {
  lastUpdated: string;
  version: number;
  robots: any[];
}

/**
 * Master Data Cache Service
 *
 * Implements a hybrid caching strategy:
 * - Primary: Redis cache for ultra-fast reads (<50ms)
 * - Fallback: rebuild from primary data stores through the master-data service
 * - Auto-invalidation on all write operations
 *
 * Cache is invalidated (deleted) on writes, then rebuilt on next read.
 * This ensures data consistency while maintaining high performance.
 */
class MasterDataCacheService {

  /**
   * Get cached master data from Redis
   * If cache miss, rebuilds through the master-data service
   *
   * @returns Cached master data or null if error
   */
  async getCachedMasterData(): Promise<CachedMasterData | null> {
    try {
      // Try to get from cache
      const cached = await redisClient.get(CACHE_KEY);

      if (cached) {
        logger.info("Master data cache HIT");
        return JSON.parse(cached);
      }

      logger.info("Master data cache MISS - rebuilding");

      // Cache miss - rebuild
      return await this.rebuildCache();

    } catch (error) {
      logger.error(`Error getting cached master data: ${error}`);
      return null;
    }
  }

  /**
   * Rebuild master data cache from the primary data stores
   * Uses distributed lock to prevent multiple simultaneous rebuilds
   *
   * @returns Rebuilt master data
   */
  async rebuildCache(): Promise<CachedMasterData | null> {
    try {
      // Try to acquire lock (prevent multiple rebuilds)
      const lockAcquired = await redisClient.set(
        CACHE_LOCK_KEY,
        "1",
        {
          EX: CACHE_LOCK_TTL,
          NX: true // Only set if not exists
        }
      );

      if (!lockAcquired) {
        logger.info("Another process is rebuilding cache, waiting...");
        // Wait a bit and try to get from cache
        await new Promise(resolve => setTimeout(resolve, 1000));
        const cached = await redisClient.get(CACHE_KEY);
        if (cached) {
          return JSON.parse(cached);
        }
        // Still no cache, return null and let fallback handle it
        return null;
      }

      logger.info("Building master data cache from primary data stores...");
      const startTime = Date.now();
      const robotsWithStatus =
        await robotMasterDataService.fetchAllRobotMasterData();

      const cacheData: CachedMasterData = {
        lastUpdated: new Date().toISOString(),
        version: Date.now(),
        robots: robotsWithStatus
      };

      // Store in Redis
      await redisClient.set(CACHE_KEY, JSON.stringify(cacheData));

      // Release lock
      await redisClient.del(CACHE_LOCK_KEY);

      const duration = Date.now() - startTime;
      logger.info(`Master data cache rebuilt successfully in ${duration}ms (${robotsWithStatus.length} robots)`);

      return cacheData;

    } catch (error) {
      logger.error(`Error rebuilding master data cache: ${error}`);
      // Release lock on error
      try {
        await redisClient.del(CACHE_LOCK_KEY);
      } catch (e) {
        // Ignore lock release errors
      }
      return null;
    }
  }

  /**
   * Invalidate (delete) the master data cache
   * Called after any write operation that affects master data
   * Cache will be rebuilt on next read request
   *
   * @param reason - Why cache is being invalidated (for logging)
   */
  async invalidateCache(reason: string): Promise<void> {
    try {
      await redisClient.del(CACHE_KEY);
      logger.info(`Master data cache invalidated: ${reason}`);
    } catch (error) {
      // Non-blocking - if invalidation fails, cache will eventually expire
      // or be overwritten on next rebuild
      logger.error(`Failed to invalidate master data cache: ${error}`);
    }
  }

  /**
   * Get fallback master data by rebuilding through the master-data service
   * Used when Redis is unavailable
   *
   * @returns Master data from the primary data stores
   */
  async getFallbackMasterData(): Promise<CachedMasterData> {
    logger.warn("Using fallback master data query (Redis unavailable)");

    try {
      // Rebuild will query the primary data stores through the master-data service
      const data = await this.rebuildCache();
      if (data) {
        return data;
      }

      // If rebuild fails, return empty data
      return {
        lastUpdated: new Date().toISOString(),
        version: Date.now(),
        robots: []
      };
    } catch (error) {
      logger.error(`Fallback master data query failed: ${error}`);
      return {
        lastUpdated: new Date().toISOString(),
        version: Date.now(),
        robots: []
      };
    }
  }

  /**
   * Manually refresh cache (admin endpoint)
   * Forces immediate cache rebuild
   */
  async refreshCache(): Promise<{
    success: boolean;
    message: string;
    duration?: number;
  }> {
    try {
      const startTime = Date.now();

      // Delete old cache
      await redisClient.del(CACHE_KEY);

      // Rebuild
      const data = await this.rebuildCache();

      if (!data) {
        return {
          success: false,
          message: "Failed to rebuild cache"
        };
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        message: `Cache refreshed successfully (${data.robots.length} robots)`,
        duration
      };
    } catch (error) {
      logger.error(`Manual cache refresh failed: ${error}`);
      return {
        success: false,
        message: `Cache refresh failed: ${error}`
      };
    }
  }
}

// Export singleton instance
export const masterDataCacheService = new MasterDataCacheService();
