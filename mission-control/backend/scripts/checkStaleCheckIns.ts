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
 * Script to check for stale check-ins (check-ins without matching check-outs)
 * These can block operators from checking in for new shifts
 */
const checkStaleCheckIns = async () => {
  try {
    // Connect to MongoDB using the same connection config as the app
    await connectDb();

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    const attendanceCollection = db.collection("attendances");

    // Get start of today
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    logger.info(`Checking for stale check-ins before ${startOfToday.toISOString()}`);

    // Find all check-ins from before today
    const previousCheckIns = await attendanceCollection
      .find({
        "metadata.entryType": "checkIn",
        startingTimestamp: { $lt: startOfToday.getTime() }
      })
      .sort({ startingTimestamp: -1 })
      .toArray();

    logger.info(`Found ${previousCheckIns.length} check-ins from before today`);

    // Check each check-in for a matching check-out
    const staleCheckIns = [];

    for (const checkIn of previousCheckIns) {
      const operatorId = checkIn.metadata.operatorId;
      const clientId = checkIn.metadata.clientId;
      const checkInTime = checkIn.startingTimestamp;
      const isOvertimeSession = checkIn.isOvertimeSession || false;

      // Skip overtime sessions (they have their own expiry logic)
      if (isOvertimeSession) {
        continue;
      }

      // Look for matching check-out after this check-in
      const matchingCheckOut = await attendanceCollection.findOne({
        "metadata.operatorId": operatorId,
        "metadata.clientId": clientId,
        "metadata.entryType": "checkOut",
        startingTimestamp: { $gte: checkInTime, $lt: startOfToday.getTime() }
      });

      if (!matchingCheckOut) {
        staleCheckIns.push({
          _id: checkIn._id,
          operatorId,
          operatorName: checkIn.metadata.operatorName,
          clientId,
          clientName: checkIn.metadata.clientName,
          checkInTime: new Date(checkInTime).toISOString(),
          isOvertimeSession
        });
      }
    }

    if (staleCheckIns.length === 0) {
      logger.info("✅ No stale check-ins found!");
    } else {
      logger.info(`⚠️  Found ${staleCheckIns.length} stale check-in(s) without matching check-outs:`);
      staleCheckIns.forEach((stale, index) => {
        logger.info(`\n${index + 1}. Operator: ${stale.operatorName} (${stale.operatorId})`);
        logger.info(`   Client: ${stale.clientName} (${stale.clientId})`);
        logger.info(`   Check-in time: ${stale.checkInTime}`);
        logger.info(`   Document ID: ${stale._id}`);
      });

      logger.info("\n⚠️  These stale check-ins will BLOCK new check-ins for these operators!");
      logger.info("Solutions:");
      logger.info("1. Create manual check-out entries for these sessions");
      logger.info("2. Delete these stale check-in records");
      logger.info("3. Implement auto-cleanup logic in the backend");
    }

    await mongoose.connection.close();
    logger.info("\nDatabase connection closed");
    process.exit(0);
  } catch (error: any) {
    logger.error("Error checking stale check-ins:", error);
    process.exit(1);
  }
};

checkStaleCheckIns();
