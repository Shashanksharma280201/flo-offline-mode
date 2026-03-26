import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import logger from "../utils/logger";
import connectDb from "../services/mongodb";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: resolve(__dirname, "../../.env") });

/**
 * Script to drop the TTL index from overtimerequ ests collection
 * This index was auto-deleting approved overtime requests after expiry,
 * which prevented the history tab from showing historical data
 */
const dropTTLIndex = async () => {
  try {
    // Connect to MongoDB using the same connection config as the app
    await connectDb();

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    const collection = db.collection("overtimerequests");

    // Get all indexes
    const indexes = await collection.indexes();
    logger.info("Current indexes on overtimerequ ests collection:");
    indexes.forEach((index) => {
      logger.info(JSON.stringify(index, null, 2));
    });

    // Drop the TTL index if it exists
    try {
      await collection.dropIndex("expiresAt_1");
      logger.info("✅ Successfully dropped TTL index 'expiresAt_1'");
    } catch (dropError: any) {
      if (dropError.codeName === "IndexNotFound") {
        logger.info("TTL index 'expiresAt_1' does not exist (already dropped or never created)");
      } else {
        throw dropError;
      }
    }

    // Verify the index is gone
    const indexesAfter = await collection.indexes();
    logger.info("\nIndexes after dropping TTL:");
    indexesAfter.forEach((index) => {
      logger.info(JSON.stringify(index, null, 2));
    });

    await mongoose.connection.close();
    logger.info("\nDatabase connection closed");
    process.exit(0);
  } catch (error: any) {
    logger.error("Error dropping TTL index:", error);
    process.exit(1);
  }
};

dropTTLIndex();
