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
 * Script to check ALL attendance records for an operator (including today's partial records)
 */
const checkOperatorAllAttendance = async () => {
  try {
    const operatorId = process.argv[2] || "65b7a2cf9c197b011a143124";

    // Connect to MongoDB
    await connectDb();

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    const attendanceCollection = db.collection("attendances");

    // Get start of today (in local timezone - IST)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startOfToday.setHours(startOfToday.getHours() - 5);
    startOfToday.setMinutes(startOfToday.getMinutes() - 30);

    logger.info(`Checking ALL attendance records for operator ${operatorId}`);
    logger.info(`Start of today (IST): ${startOfToday.toISOString()} (${startOfToday.getTime()})`);

    // Find ALL records for this operator from today
    const allRecords = await attendanceCollection
      .find({
        "metadata.operatorId": operatorId,
        startingTimestamp: { $gte: startOfToday.getTime() }
      })
      .sort({ startingTimestamp: 1 })
      .toArray();

    logger.info(`\nFound ${allRecords.length} attendance record(s) for today`);

    if (allRecords.length === 0) {
      logger.info("✅ No attendance records found for today");
    } else {
      allRecords.forEach((record, index) => {
        const time = new Date(record.startingTimestamp);
        const entryType = record.metadata.entryType;
        const clientName = record.metadata.clientName || "Unknown";
        const isOT = record.isOvertimeSession || false;

        logger.info(`\n${index + 1}. ${entryType.toUpperCase()} - ${time.toISOString()}`);
        logger.info(`   Client: ${clientName}`);
        logger.info(`   Overtime: ${isOT}`);
        logger.info(`   Document ID: ${record._id}`);

        if (entryType === "checkIn") {
          logger.info(`   Status: ${record.checkInStatus || "unknown"}`);
          if (isOT) {
            logger.info(`   OT Request ID: ${record.overtimeRequestId || "missing"}`);
            logger.info(`   OT End Time: ${record.overtimeEndTime ? new Date(record.overtimeEndTime).toISOString() : "NOT CHECKED OUT"}`);
          }
        }
      });
    }

    // Check for check-ins without matching check-outs
    const checkIns = allRecords.filter(r => r.metadata.entryType === "checkIn");
    const checkOuts = allRecords.filter(r => r.metadata.entryType === "checkOut");

    logger.info(`\n${"=".repeat(80)}`);
    logger.info(`Summary: ${checkIns.length} check-in(s), ${checkOuts.length} check-out(s)`);

    checkIns.forEach(checkIn => {
      const isOT = checkIn.isOvertimeSession || false;

      if (isOT) {
        // For OT, check if overtimeEndTime is set
        if (!checkIn.overtimeEndTime) {
          logger.error(`⚠️  UNCLOSED OT SESSION: ${new Date(checkIn.startingTimestamp).toISOString()}`);
        }
      } else {
        // For regular, look for matching check-out
        const matchingCheckOut = checkOuts.find(co =>
          co.startingTimestamp >= checkIn.startingTimestamp
        );

        if (!matchingCheckOut) {
          logger.error(`⚠️  UNCLOSED REGULAR SESSION: ${new Date(checkIn.startingTimestamp).toISOString()}`);
          logger.error(`     This WILL BLOCK new check-ins!`);
        }
      }
    });

    await mongoose.connection.close();
    logger.info(`\n${"=".repeat(80)}`);
    logger.info("\nDatabase connection closed");
    process.exit(0);
  } catch (error: any) {
    logger.error("Error checking operator attendance:", error);
    process.exit(1);
  }
};

checkOperatorAllAttendance();
