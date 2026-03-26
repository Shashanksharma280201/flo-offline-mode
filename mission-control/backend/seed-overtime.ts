import mongoose from "mongoose";
import dotenv from "dotenv";
import appUserModel from "./models/appUserModel.js";
import clientModel from "./models/clientModel.js";
import robotModel from "./models/robotModel.js";
import OvertimeRequestModel from "./models/overtimeRequestModel.js";

dotenv.config();

const DB_URI = process.env.DB_URI || "";

async function seedOvertimeRecords() {
  try {
    await mongoose.connect(DB_URI);
    console.log("Connected to MongoDB");

    // Fetch one operator, client, and robot from the database
    const operator = await appUserModel.findOne();
    const client = await clientModel.findOne();
    const robot = await robotModel.findOne();

    if (!operator || !client || !robot) {
      console.error("Need at least one operator, client, and robot in the database");
      console.log(`Operator found: ${!!operator}`);
      console.log(`Client found: ${!!client}`);
      console.log(`Robot found: ${!!robot}`);
      await mongoose.connection.close();
      return;
    }

    console.log("\nUsing:");
    console.log(`Operator: ${operator.name} (${operator._id})`);
    console.log(`Client: ${client.name} (${client._id})`);
    console.log(`Robot: ${robot.name} (${robot._id})`);

    // Create test overtime records
    const testRecords = [
      {
        operatorId: operator._id.toString(),
        operatorName: operator.name,
        clientId: client._id.toString(),
        clientName: client.name,
        robotId: robot._id,
        robotName: robot.name,
        requestedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        requestedDuration: 2,
        approvedDuration: 2,
        reason: "Heavy workload - multiple urgent deliveries scheduled",
        status: "approved",
        approvedBy: "admin123",
        approvedByName: "Admin User",
        approvedAt: new Date(Date.now() - 6.5 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 5.5 * 24 * 60 * 60 * 1000)
      },
      {
        operatorId: operator._id.toString(),
        operatorName: operator.name,
        clientId: client._id.toString(),
        clientName: client.name,
        robotId: robot._id,
        robotName: robot.name,
        requestedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        requestedDuration: 3,
        approvedDuration: 2.5,
        reason: "Staff shortage due to sick leave",
        status: "approved",
        approvedBy: "admin123",
        approvedByName: "Admin User",
        approvedAt: new Date(Date.now() - 4.8 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 3.8 * 24 * 60 * 60 * 1000)
      },
      {
        operatorId: operator._id.toString(),
        operatorName: operator.name,
        clientId: client._id.toString(),
        clientName: client.name,
        robotId: robot._id,
        robotName: robot.name,
        requestedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        requestedDuration: 4,
        reason: "Special event - need extra coverage for weekend",
        status: "pending"
      },
      {
        operatorId: operator._id.toString(),
        operatorName: operator.name,
        clientId: client._id.toString(),
        clientName: client.name,
        robotId: robot._id,
        robotName: robot.name,
        requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        requestedDuration: 1.5,
        reason: "Equipment maintenance took longer than expected",
        status: "rejected",
        rejectedBy: "admin123",
        rejectedByName: "Admin User",
        rejectedAt: new Date(Date.now() - 1.8 * 24 * 60 * 60 * 1000),
        rejectionReason: "Not enough budget remaining for this month"
      },
      {
        operatorId: operator._id.toString(),
        operatorName: operator.name,
        clientId: client._id.toString(),
        clientName: client.name,
        robotId: robot._id,
        robotName: robot.name,
        requestedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        requestedDuration: 2,
        approvedDuration: 2,
        reason: "Peak season - increased delivery volume",
        status: "approved",
        approvedBy: "admin123",
        approvedByName: "Admin User",
        approvedAt: new Date(Date.now() - 0.9 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 0.1 * 24 * 60 * 60 * 1000) // Expires in ~2.4 hours
      },
      {
        operatorId: operator._id.toString(),
        operatorName: operator.name,
        clientId: client._id.toString(),
        clientName: client.name,
        robotId: robot._id,
        robotName: robot.name,
        requestedAt: new Date(), // Today
        requestedDuration: 3,
        reason: "Covering for another operator who had an emergency",
        status: "pending"
      }
    ];

    // Clear existing test records (optional)
    console.log("\nClearing existing overtime records...");
    await OvertimeRequestModel.deleteMany({});

    // Insert test records
    console.log("\nInserting test overtime records...");
    const inserted = await OvertimeRequestModel.insertMany(testRecords);

    console.log(`\n✅ Successfully created ${inserted.length} overtime records!`);

    // Display summary
    console.log("\n=== Summary ===");
    const statusCounts = {
      pending: inserted.filter(r => r.status === "pending").length,
      approved: inserted.filter(r => r.status === "approved").length,
      rejected: inserted.filter(r => r.status === "rejected").length
    };
    console.log(`Pending: ${statusCounts.pending}`);
    console.log(`Approved: ${statusCounts.approved}`);
    console.log(`Rejected: ${statusCounts.rejected}`);

    await mongoose.connection.close();
    console.log("\n✅ Connection closed");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

seedOvertimeRecords();
