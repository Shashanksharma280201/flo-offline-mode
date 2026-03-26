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
 * Script to check all check-ins for a specific operator (including today)
 */
const checkOperatorAllCheckIns = async () => {
  try {
    const operatorId = process.argv[2] || "65b7a2cf9c197b011a143124";

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
    logger.info(`Checking ALL check-ins for operator ${operatorId}`);
    logger.info(`Start of today: ${startOfToday.toISOString()}`);

    // Find ALL check-ins for this operator (last 7 days)
    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const allCheckIns = await attendanceCollection
      .find({
        "metadata.operatorId": operatorId,
        "metadata.entryType": "checkIn",
        startingTimestamp: { $gte: sevenDaysAgo.getTime() }
      })
      .sort({ startingTimestamp: -1 })
      .toArray();

    logger.info(`\nFound ${allCheckIns.length} check-in(s) in the last 7 days`);

    for (const checkIn of allCheckIns) {
      const checkInTime = checkIn.startingTimestamp;
      const checkInDate = new Date(checkInTime);
      const isOvertimeSession = checkIn.isOvertimeSession || false;
      const isToday = checkInTime >= startOfToday.getTime();

      logger.info(`\n${"=".repeat(80)}`);
      logger.info(`📋 Check-in: ${checkInDate.toISOString()}`);
      logger.info(`   ${isToday ? "🟢 TODAY" : "🔴 BEFORE TODAY"}`);
      logger.info(`   Operator: ${checkIn.metadata.operatorName} (${operatorId})`);
      logger.info(`   Client: ${checkIn.metadata.clientName}`);
      logger.info(`   Is overtime: ${isOvertimeSession}`);
      logger.info(`   Document ID: ${checkIn._id}`);

      // Look for matching check-out
      const matchingCheckOut = await attendanceCollection.findOne({
        "metadata.operatorId": operatorId,
        "metadata.entryType": "checkOut",
        startingTimestamp: { $gte: checkInTime }
      });

      if (!matchingCheckOut) {
        logger.error(`   ❌ NO CHECK-OUT FOUND - SESSION STILL OPEN!`);
        if (!isOvertimeSession && !isToday) {
          logger.error(`   ⚠️  This is blocking new check-ins!`);
        }
      } else {
        const checkOutTime = new Date(matchingCheckOut.startingTimestamp);
        logger.info(`   ✅ Check-out: ${checkOutTime.toISOString()}`);
        const duration = (matchingCheckOut.startingTimestamp - checkInTime) / (1000 * 60 * 60);
        logger.info(`   ⏱️  Duration: ${duration.toFixed(2)} hours`);
      }
    }

    await mongoose.connection.close();
    logger.info(`\n${"=".repeat(80)}`);
    logger.info("\nDatabase connection closed");
    process.exit(0);
  } catch (error: any) {
    logger.error("Error checking operator check-ins:", error);
    process.exit(1);
  }
};

checkOperatorAllCheckIns();
