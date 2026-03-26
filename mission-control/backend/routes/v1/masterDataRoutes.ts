import express from "express";
import {
  getCachedMasterData,
  refreshMasterDataCache,
  getCacheStatus
} from "../../controllers/masterDataController";
import protect from "../../middlewares/authMiddleware";

const router = express.Router();

/**
 * Master Data Cache Routes
 *
 * Provides ultra-fast cached access to all robots master data
 * Cache auto-invalidates on all write operations
 */

// Get cached master data - Public endpoint (requires auth)
router.get("/cached", protect, getCachedMasterData);

// Refresh cache manually - Admin only
router.post("/refresh", protect, refreshMasterDataCache);

// Get cache status - Admin only
router.get("/cache-status", protect, getCacheStatus);

export default router;
