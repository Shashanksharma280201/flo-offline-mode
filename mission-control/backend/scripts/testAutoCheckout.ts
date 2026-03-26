import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import logger from "../utils/logger";
import connectDb from "../services/mongodb";
import connectRedis from "../services/redis";
import { autoCheckoutJob } from "../jobs/autoCheckoutJob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../../.env") });

/**
 * Test script to manually trigger the auto-checkout job
 * Usage: npx tsx backend/scripts/testAutoCheckout.ts
 */
const testAutoCheckout = async () => {
  try {
    logger.info("=== Testing Auto-Checkout Job ===");
    connectRedis();
    await connectDb();

    logger.info("Running auto-checkout job...");
    await autoCheckoutJob();

    logger.info("Auto-checkout job completed successfully");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error("Error running auto-checkout job:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

testAutoCheckout();
