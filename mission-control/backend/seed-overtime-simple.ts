import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from parent directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DB_URI = process.env.DB_URI || "";

async function seedOvertimeRecords() {
  try {
    await mongoose.connect(DB_URI);
    console.log("Connected to MongoDB");

    // Fetch one operator, client, and robot from the database
    const operator = await mongoose.connection.db.collection("appusers").findOne();
    const client = await mongoose.connection.db.collection("clients").findOne();
    const robot = await mongoose.connection.db.collection("robots").findOne();

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

    // Create additional test overtime records (keeping existing ones)
    const testRecords = [
      {
        operatorId: operator._id.toString(),
        operatorName: operator.name,
        clientId: client._id.toString(),
        clientName: client.name,
        robotId: robot._id.toString(),
        robotName: robot.name,
        requestedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
        requestedDuration: 1.5,
        approvedDuration: 1.5,
        reason: "Training new staff member",
        status: "approved",
        approvedBy: "admin123",
        approvedByName: "Admin User",
        approvedAt: new Date(Date.now() - 13.8 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 12.8 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 13.8 * 24 * 60 * 60 * 1000)
      },
      {
        operatorId: operator._id.toString(),
        operatorName: operator.name,
        clientId: client._id.toString(),
        clientName: client.name,
        robotId: robot._id.toString(),
        robotName: robot.name,
        requestedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        requestedDuration: 3,
        approvedDuration: 2,
        reason: "Unexpected system maintenance required",
        status: "approved",
        approvedBy: "admin123",
        approvedByName: "Admin User",
        approvedAt: new Date(Date.now() - 9.7 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 8.7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 9.7 * 24 * 60 * 60 * 1000)
      },
      {
        operatorId: operator._id.toString(),
        operatorName: operator.name,
        clientId: client._id.toString(),
        clientName: client.name,
        robotId: robot._id.toString(),
        robotName: robot.name,
        requestedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        requestedDuration: 2.5,
        reason: "Client requested extended service hours",
        status: "pending",
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      },
      {
        operatorId: operator._id.toString(),
        operatorName: operator.name,
        clientId: client._id.toString(),
        clientName: client.name,
        robotId: robot._id.toString(),
        robotName: robot.name,
        requestedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
        requestedDuration: 4,
        approvedDuration: 3.5,
        reason: "Major event coverage - shopping festival",
        status: "approved",
        approvedBy: "admin123",
        approvedByName: "Admin User",
        approvedAt: new Date(Date.now() - 5.8 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 4.8 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 5.8 * 24 * 60 * 60 * 1000)
      },
      {
        operatorId: operator._id.toString(),
        operatorName: operator.name,
        clientId: client._id.toString(),
        clientName: client.name,
        robotId: robot._id.toString(),
        robotName: robot.name,
        requestedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        requestedDuration: 1,
        reason: "Quick delivery backlog clearance",
        status: "rejected",
        rejectedBy: "admin123",
        rejectedByName: "Admin User",
        rejectedAt: new Date(Date.now() - 3.9 * 24 * 60 * 60 * 1000),
        rejectionReason: "Similar request approved recently",
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 3.9 * 24 * 60 * 60 * 1000)
      },
      {
        operatorId: operator._id.toString(),
        operatorName: operator.name,
        clientId: client._id.toString(),
        clientName: client.name,
        robotId: robot._id.toString(),
        robotName: robot.name,
        requestedAt: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000), // 12 hours ago
        requestedDuration: 2,
        approvedDuration: 2,
        reason: "Last minute delivery surge",
        status: "approved",
        approvedBy: "admin123",
        approvedByName: "Admin User",
        approvedAt: new Date(Date.now() - 0.4 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 1.6 * 24 * 60 * 60 * 1000), // Expires in ~38 hours
        createdAt: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 0.4 * 24 * 60 * 60 * 1000)
      },
      {
        operatorId: operator._id.toString(),
        operatorName: operator.name,
        clientId: client._id.toString(),
        clientName: client.name,
        robotId: robot._id.toString(),
        robotName: robot.name,
        requestedAt: new Date(Date.now() - 0.2 * 24 * 60 * 60 * 1000), // 5 hours ago
        requestedDuration: 3,
        reason: "Need extended coverage for night shift",
        status: "pending",
        createdAt: new Date(Date.now() - 0.2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 0.2 * 24 * 60 * 60 * 1000)
      },
      {
        operatorId: operator._id.toString(),
        operatorName: operator.name,
        clientId: client._id.toString(),
        clientName: client.name,
        robotId: robot._id.toString(),
        robotName: robot.name,
        requestedAt: new Date(Date.now() - 0.1 * 24 * 60 * 60 * 1000), // 2-3 hours ago
        requestedDuration: 1.5,
        reason: "Urgent customer request - VIP delivery",
        status: "pending",
        createdAt: new Date(Date.now() - 0.1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 0.1 * 24 * 60 * 60 * 1000)
      }
    ];

    // Don't clear existing records, just add new ones
    console.log("\nAdding more overtime records to existing data...");

    // Insert test records
    console.log("\nInserting test overtime records...");
    const result = await mongoose.connection.db.collection("overtimerequests").insertMany(testRecords);

    console.log(`\n✅ Successfully added ${result.insertedCount} new overtime records!`);

    // Display summary of new records
    console.log("\n=== New Records Summary ===");
    const statusCounts = {
      pending: testRecords.filter(r => r.status === "pending").length,
      approved: testRecords.filter(r => r.status === "approved").length,
      rejected: testRecords.filter(r => r.status === "rejected").length
    };
    console.log(`Pending: ${statusCounts.pending}`);
    console.log(`Approved: ${statusCounts.approved}`);
    console.log(`Rejected: ${statusCounts.rejected}`);

    // Get total count
    const totalCount = await mongoose.connection.db.collection("overtimerequests").countDocuments();
    console.log(`\n=== Total Database Records: ${totalCount} ===`);

    await mongoose.connection.close();
    console.log("\n✅ Connection closed");
    console.log("\n🎉 Refresh your overtime history page to see all the test data!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

seedOvertimeRecords();
