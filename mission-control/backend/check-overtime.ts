import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from parent directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DB_URI = process.env.DB_URI || "";

async function checkOvertimeRecords() {
  try {
    await mongoose.connect(DB_URI);
    console.log("Connected to MongoDB");

    const overtimeRecords = await mongoose.connection.db
      .collection("overtimerequests")
      .find()
      .toArray();

    console.log(`\nTotal Overtime Records: ${overtimeRecords.length}\n`);

    if (overtimeRecords.length === 0) {
      console.log("No overtime records found in the database.");
    } else {
      overtimeRecords.forEach((record, index) => {
        console.log(`\n=== Record ${index + 1} ===`);
        console.log(`ID: ${record._id}`);
        console.log(`Operator: ${record.operatorName} (${record.operatorId})`);
        console.log(`Client: ${record.clientName} (${record.clientId})`);
        console.log(`Robot: ${record.robotName || "N/A"} (${record.robotId || "N/A"})`);
        console.log(`Requested At: ${record.requestedAt}`);
        console.log(`Requested Duration: ${record.requestedDuration} hours`);
        console.log(`Approved Duration: ${record.approvedDuration || "N/A"} hours`);
        console.log(`Status: ${record.status}`);
        console.log(`Reason: ${record.reason}`);
        if (record.approvedBy) {
          console.log(`Approved By: ${record.approvedByName} (${record.approvedBy})`);
          console.log(`Approved At: ${record.approvedAt}`);
        }
        if (record.rejectedBy) {
          console.log(`Rejected By: ${record.rejectedByName} (${record.rejectedBy})`);
          console.log(`Rejected At: ${record.rejectedAt}`);
          console.log(`Rejection Reason: ${record.rejectionReason}`);
        }
        if (record.expiresAt) {
          console.log(`Expires At: ${record.expiresAt}`);
        }
      });
    }

    await mongoose.connection.close();
    console.log("\n\nConnection closed");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkOvertimeRecords();
