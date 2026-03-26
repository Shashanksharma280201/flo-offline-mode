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
 * Script to check for a specific operator's stale check-in
 * Usage: Provide operatorId as command line argument
 */
const checkOperatorStaleCheckIn = async () => {
  try {
    const operatorId = process.argv[2] || "65b7a2cf9c197b011a143124"; // Default to the operator from logs

    // Connect to MongoDB
    await connectDb();

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    const attendanceCollection = db.collection("attendances");

    // Get start of today
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    logger.info(`Checking for operator ${operatorId} - stale check-ins before ${startOfToday.toISOString()}`);

    // Find all check-ins for this operator from before today
    const previousCheckIns = await attendanceCollection
      .find({
        "metadata.operatorId": operatorId,
        "metadata.entryType": "checkIn",
        startingTimestamp: { $lt: startOfToday.getTime() }
      })
      .sort({ startingTimestamp: -1 })
      .toArray();

    logger.info(`Found ${previousCheckIns.length} check-in(s) from before today for operator ${operatorId}`);

    if (previousCheckIns.length === 0) {
      logger.info("✅ No old check-ins found for this operator");
      await mongoose.connection.close();
      process.exit(0);
      return;
    }

    // Check each check-in for a matching check-out
    for (const checkIn of previousCheckIns) {
      const checkInTime = checkIn.startingTimestamp;
      const isOvertimeSession = checkIn.isOvertimeSession || false;
      const operatorName = checkIn.metadata.operatorName;
      const clientName = checkIn.metadata.clientName;

      logger.info(`\n📋 Check-in Details:`);
      logger.info(`   Operator: ${operatorName} (${operatorId})`);
      logger.info(`   Client: ${clientName}`);
      logger.info(`   Check-in time: ${new Date(checkInTime).toISOString()}`);
      logger.info(`   Is overtime: ${isOvertimeSession}`);
      logger.info(`   Document ID: ${checkIn._id}`);

      // Look for matching check-out
      const matchingCheckOut = await attendanceCollection.findOne({
        "metadata.operatorId": operatorId,
        "metadata.entryType": "checkOut",
        startingTimestamp: { $gte: checkInTime, $lt: startOfToday.getTime() }
      });

      if (!matchingCheckOut) {
        logger.error(`   ❌ NO MATCHING CHECK-OUT FOUND!`);
        logger.error(`   This unclosed session is BLOCKING new check-ins.`);
        logger.error(`\n   Solutions:`);
        logger.error(`   1. Create manual check-out for this session`);
        logger.error(`   2. Delete this check-in record (ID: ${checkIn._id})`);
        logger.error(`   3. Use force check-out API endpoint`);
      } else {
        logger.info(`   ✅ Check-out found at ${new Date(matchingCheckOut.startingTimestamp).toISOString()}`);
      }
    }

    await mongoose.connection.close();
    logger.info("\nDatabase connection closed");
    process.exit(0);
  } catch (error: any) {
    logger.error("Error checking operator stale check-in:", error);
    process.exit(1);
  }
};

checkOperatorStaleCheckIn();
