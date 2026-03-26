/**
 * Backfill Script: Robot Snapshot Data
 *
 * This script populates the new denormalized snapshot fields for existing robots:
 * - operatorSnapshot: From activeOperator or first appUser
 * - clientSnapshot: From operator's clientId
 * - fleetSnapshot: From fleet reference
 * - openIssuesCount: Counted from issues collection
 * - yesterdayTripCount: Counted from appData collection
 *
 * Run this script ONCE after deploying the schema changes to populate
 * existing robots with snapshot data.
 *
 * Usage (from mission-control directory):
 *   npx tsx backend/scripts/backfillRobotSnapshots.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import dayjs from "dayjs";

dotenv.config();

// Import models with .js extension for ES modules
// Note: clientModel must be imported to register the "Client" schema for populate() to work
import robotModel from "../models/robotModel.js";
import appUserModel from "../models/appUserModel.js";
import fleetModel from "../models/fleetModel.js";
import issueModel from "../models/issueModel.js";
import appDataModel from "../models/appDataModel.js";
import clientModel from "../models/clientModel.js";

// Ensure clientModel is used (prevents tree-shaking from removing the import)
// This registers the "Client" schema with Mongoose
const _clientModelRef = clientModel;

const BATCH_SIZE = 50; // Process robots in batches to avoid memory issues
const DRY_RUN = process.argv.includes("--dry-run"); // Add dry-run flag for testing

async function connectToDatabase() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI environment variable is not set");
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB successfully");
}

async function backfillRobotSnapshots() {
  try {
    await connectToDatabase();

    // Get all robots
    const totalRobots = await robotModel.countDocuments({});
    console.log(`\nFound ${totalRobots} robots to process\n`);

    let processed = 0;
    let updated = 0;
    let errors = 0;

    // Process in batches
    const cursor = robotModel
      .find({})
      .select("_id name fleet activeOperator appUsers")
      .cursor();

    let batch: any[] = [];

    for await (const robot of cursor) {
      batch.push(robot);

      if (batch.length >= BATCH_SIZE) {
        const result = await processBatch(batch);
        updated += result.updated;
        errors += result.errors;
        processed += batch.length;

        console.log(`Progress: ${processed}/${totalRobots} robots processed (${updated} updated, ${errors} errors)`);
        batch = [];
      }
    }

    // Process remaining robots
    if (batch.length > 0) {
      const result = await processBatch(batch);
      updated += result.updated;
      errors += result.errors;
      processed += batch.length;
    }

    console.log("\n========================================");
    console.log(DRY_RUN ? "DRY RUN COMPLETE (no changes made)" : "BACKFILL COMPLETE");
    console.log("========================================");
    console.log(`Total robots processed: ${processed}`);
    console.log(`${DRY_RUN ? "Would update" : "Successfully updated"}: ${updated}`);
    console.log(`Errors: ${errors}`);
    console.log("========================================\n");

    if (DRY_RUN) {
      console.log("To apply changes, run without --dry-run flag");
    }

  } catch (error) {
    console.error("Backfill failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

async function processBatch(robots: any[]): Promise<{ updated: number; errors: number }> {
  let updated = 0;
  let errors = 0;

  // Calculate yesterday's date range
  const yesterdayStart = dayjs().subtract(1, "day").startOf("day").toDate();
  const yesterdayEnd = dayjs().subtract(1, "day").endOf("day").toDate();

  await Promise.all(
    robots.map(async (robot) => {
      try {
        const updateFields: any = {};

        // 1. Build Fleet Snapshot
        if (robot.fleet) {
          const fleet = await fleetModel.findById(robot.fleet).select("id name prefix").lean();
          if (fleet) {
            updateFields.fleetSnapshot = {
              id: fleet._id.toString(),
              name: fleet.name,
              prefix: fleet.prefix
            };
          }
        }

        // 2. Build Operator and Client Snapshots
        const operatorId = robot.activeOperator || robot.appUsers?.[0];
        if (operatorId) {
          const operator = await appUserModel
            .findById(operatorId)
            .select("id name phoneNumber isActive clientId")
            .populate({
              path: "clientId",
              select: "id name location operatingHours"
            })
            .lean();

          if (operator) {
            updateFields.operatorSnapshot = {
              id: operator._id.toString(),
              name: operator.name,
              phoneNumber: operator.phoneNumber,
              checkedInToday: false, // Will be updated by check-in
              lastCheckInTime: undefined
            };

            // Client snapshot from operator
            const clientData = operator.clientId as any;
            if (clientData) {
              updateFields.clientSnapshot = {
                id: clientData._id?.toString() || clientData.id,
                name: clientData.name,
                location: clientData.location,
                operatingHours: clientData.operatingHours
              };
            }
          }
        }

        // 3. Count Open Issues
        const openIssuesCount = await issueModel.countDocuments({
          robot: robot._id,
          status: "open"
        });
        updateFields.openIssuesCount = openIssuesCount;

        // 4. Count Yesterday's Trips
        const yesterdayTripCount = await appDataModel.countDocuments({
          "metadata.robotId": robot._id,
          timestamp: {
            $gte: yesterdayStart,
            $lte: yesterdayEnd
          }
        });
        updateFields.yesterdayTripCount = yesterdayTripCount;

        // Update the robot (skip if dry-run)
        if (!DRY_RUN) {
          await robotModel.findByIdAndUpdate(robot._id, { $set: updateFields });
        }
        updated += 1;

      } catch (err) {
        console.error(`Error processing robot ${robot._id} (${robot.name}):`, err);
        errors += 1;
      }
    })
  );

  return { updated, errors };
}

// Run the script
backfillRobotSnapshots();
