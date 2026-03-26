import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import logger from "../utils/logger";
import connectDb from "../services/mongodb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../../.env") });

const checkLast24Hours = async () => {
  try {
    await connectDb();
    const db = mongoose.connection.db!;
    const collection = db.collection("attendances");

    const operatorId = process.argv[2] || "65b7a2cf9c197b011a143124";
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

    logger.info(`Checking last 24 hours for operator ${operatorId}`);
    logger.info(`From: ${new Date(oneDayAgo).toISOString()}`);
    logger.info(`To: ${new Date().toISOString()}`);

    const records = await collection
      .find({
        "metadata.operatorId": operatorId,
        startingTimestamp: { $gte: oneDayAgo }
      })
      .sort({ startingTimestamp: -1 })
      .toArray();

    logger.info(`\nFound ${records.length} records in last 24 hours:\n`);

    records.forEach((r, i) => {
      const time = new Date(r.startingTimestamp);
      logger.info(`${i+1}. ${r.metadata.entryType.toUpperCase()} at ${time.toISOString()}`);
      logger.info(`   Client: ${r.metadata.clientName || 'Unknown'}`);
      logger.info(`   Timestamp: ${r.startingTimestamp}`);
      logger.info(`   Overtime: ${r.isOvertimeSession || false}`);
      logger.info(`   ID: ${r._id}\n`);
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error("Error:", error);
    process.exit(1);
  }
};

checkLast24Hours();
