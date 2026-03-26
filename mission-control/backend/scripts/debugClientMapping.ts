/**
 * Diagnostic Script: Debug Robot Client Mapping Issues
 *
 * This script analyzes the database to identify why clients are not mapped to robots
 * in the Robot Master Data page.
 *
 * It checks for:
 * 1. Robots without clientSnapshot
 * 2. Robots without activeOperator or appUsers
 * 3. Operators without clientId assigned
 * 4. Missing or invalid client references
 *
 * Usage (from mission-control directory):
 *   MONGO_URI="your-mongodb-connection-string" npx tsx backend/scripts/debugClientMapping.ts
 *
 * DO NOT make any changes - this is for diagnosis only.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Import models
import robotModel from "../models/robotModel.js";
import appUserModel from "../models/appUserModel.js";
import clientModel from "../models/clientModel.js";

// Ensure models are registered
const _clientModelRef = clientModel;

interface DiagnosticResult {
  totalRobots: number;
  robotsWithClientSnapshot: number;
  robotsWithoutClientSnapshot: number;
  robotsWithActiveOperator: number;
  robotsWithAppUsersOnly: number;
  robotsWithNoOperators: number;
  operatorsWithoutClientId: number;
  totalOperators: number;
  details: {
    robotsWithoutClient: Array<{
      robotId: string;
      robotName: string;
      hasActiveOperator: boolean;
      appUsersCount: number;
      operatorSnapshot: any;
      reason: string;
    }>;
    operatorsMissingClient: Array<{
      operatorId: string;
      operatorName: string;
      phoneNumber: string;
      assignedRobots: number;
    }>;
  };
}

async function connectToDatabase() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI environment variable is not set");
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB successfully\n");
}

async function runDiagnostics(): Promise<DiagnosticResult> {
  const result: DiagnosticResult = {
    totalRobots: 0,
    robotsWithClientSnapshot: 0,
    robotsWithoutClientSnapshot: 0,
    robotsWithActiveOperator: 0,
    robotsWithAppUsersOnly: 0,
    robotsWithNoOperators: 0,
    operatorsWithoutClientId: 0,
    totalOperators: 0,
    details: {
      robotsWithoutClient: [],
      operatorsMissingClient: []
    }
  };

  // 1. Get all robots
  const robots = await robotModel
    .find({})
    .select("_id name activeOperator appUsers clientSnapshot operatorSnapshot")
    .lean();

  result.totalRobots = robots.length;

  console.log("========================================");
  console.log("ROBOT ANALYSIS");
  console.log("========================================\n");

  for (const robot of robots) {
    const hasClientSnapshot = !!robot.clientSnapshot;
    const hasActiveOperator = !!robot.activeOperator;
    const hasAppUsers = robot.appUsers && robot.appUsers.length > 0;

    if (hasClientSnapshot) {
      result.robotsWithClientSnapshot++;
    } else {
      result.robotsWithoutClientSnapshot++;

      // Determine reason
      let reason = "Unknown";
      if (!hasActiveOperator && !hasAppUsers) {
        reason = "No operators assigned (no activeOperator and empty appUsers)";
        result.robotsWithNoOperators++;
      } else if (hasActiveOperator) {
        // Has active operator but no client - operator might not have clientId
        const operator = await appUserModel.findById(robot.activeOperator).select("name clientId").lean();
        if (!operator) {
          reason = "activeOperator reference is invalid (operator not found)";
        } else if (!operator.clientId) {
          reason = `activeOperator (${operator.name}) has no clientId assigned`;
        } else {
          reason = "activeOperator has clientId but clientSnapshot not populated (needs backfill)";
        }
        result.robotsWithActiveOperator++;
      } else if (hasAppUsers) {
        // Has appUsers but no activeOperator
        const firstOperator = await appUserModel.findById(robot.appUsers![0]).select("name clientId").lean();
        if (!firstOperator) {
          reason = "First appUser reference is invalid (operator not found)";
        } else if (!firstOperator.clientId) {
          reason = `First appUser (${firstOperator.name}) has no clientId assigned`;
        } else {
          reason = "Has appUsers with clientId but no activeOperator set (needs setActiveOperator call or backfill)";
        }
        result.robotsWithAppUsersOnly++;
      }

      result.details.robotsWithoutClient.push({
        robotId: robot._id as string,
        robotName: robot.name,
        hasActiveOperator,
        appUsersCount: robot.appUsers?.length || 0,
        operatorSnapshot: robot.operatorSnapshot || null,
        reason
      });
    }
  }

  // 2. Get all operators without clientId
  console.log("========================================");
  console.log("OPERATOR ANALYSIS");
  console.log("========================================\n");

  const allOperators = await appUserModel
    .find({})
    .select("_id name phoneNumber clientId robots")
    .lean();

  result.totalOperators = allOperators.length;

  for (const operator of allOperators) {
    if (!operator.clientId) {
      result.operatorsWithoutClientId++;
      result.details.operatorsMissingClient.push({
        operatorId: operator._id.toString(),
        operatorName: operator.name,
        phoneNumber: operator.phoneNumber,
        assignedRobots: operator.robots?.length || 0
      });
    }
  }

  return result;
}

function printResults(result: DiagnosticResult) {
  console.log("\n========================================");
  console.log("DIAGNOSTIC SUMMARY");
  console.log("========================================\n");

  console.log("ROBOTS:");
  console.log(`  Total robots: ${result.totalRobots}`);
  console.log(`  With clientSnapshot: ${result.robotsWithClientSnapshot} (${((result.robotsWithClientSnapshot / result.totalRobots) * 100).toFixed(1)}%)`);
  console.log(`  Without clientSnapshot: ${result.robotsWithoutClientSnapshot} (${((result.robotsWithoutClientSnapshot / result.totalRobots) * 100).toFixed(1)}%)`);
  console.log("");
  console.log("  Breakdown of robots without client:");
  console.log(`    - No operators at all: ${result.robotsWithNoOperators}`);
  console.log(`    - Has activeOperator: ${result.robotsWithActiveOperator}`);
  console.log(`    - Has appUsers only (no activeOperator): ${result.robotsWithAppUsersOnly}`);

  console.log("\nOPERATORS:");
  console.log(`  Total operators: ${result.totalOperators}`);
  console.log(`  Without clientId: ${result.operatorsWithoutClientId} (${((result.operatorsWithoutClientId / result.totalOperators) * 100).toFixed(1)}%)`);

  if (result.details.robotsWithoutClient.length > 0) {
    console.log("\n========================================");
    console.log("ROBOTS WITHOUT CLIENT (First 20)");
    console.log("========================================\n");

    result.details.robotsWithoutClient.slice(0, 20).forEach((robot, index) => {
      console.log(`${index + 1}. ${robot.robotName} (${robot.robotId})`);
      console.log(`   Active Operator: ${robot.hasActiveOperator ? "Yes" : "No"}`);
      console.log(`   AppUsers Count: ${robot.appUsersCount}`);
      console.log(`   Operator Snapshot: ${robot.operatorSnapshot ? robot.operatorSnapshot.name : "None"}`);
      console.log(`   REASON: ${robot.reason}`);
      console.log("");
    });

    if (result.details.robotsWithoutClient.length > 20) {
      console.log(`... and ${result.details.robotsWithoutClient.length - 20} more robots without client`);
    }
  }

  if (result.details.operatorsMissingClient.length > 0) {
    console.log("\n========================================");
    console.log("OPERATORS WITHOUT CLIENT (First 20)");
    console.log("========================================\n");

    result.details.operatorsMissingClient.slice(0, 20).forEach((op, index) => {
      console.log(`${index + 1}. ${op.operatorName} (${op.operatorId})`);
      console.log(`   Phone: ${op.phoneNumber}`);
      console.log(`   Assigned Robots: ${op.assignedRobots}`);
      console.log("");
    });

    if (result.details.operatorsMissingClient.length > 20) {
      console.log(`... and ${result.details.operatorsMissingClient.length - 20} more operators without client`);
    }
  }

  console.log("\n========================================");
  console.log("RECOMMENDED ACTIONS");
  console.log("========================================\n");

  if (result.operatorsWithoutClientId > 0) {
    console.log("1. ASSIGN CLIENTS TO OPERATORS:");
    console.log(`   ${result.operatorsWithoutClientId} operators do not have a client assigned.`);
    console.log("   Action: Update these operators with their correct clientId in the database.\n");
  }

  if (result.robotsWithAppUsersOnly > 0) {
    console.log("2. SET ACTIVE OPERATORS:");
    console.log(`   ${result.robotsWithAppUsersOnly} robots have appUsers but no activeOperator set.`);
    console.log("   Action: Call setActiveOperator API for these robots OR re-run backfill script.\n");
  }

  if (result.robotsWithActiveOperator > 0) {
    console.log("3. RE-RUN BACKFILL SCRIPT:");
    console.log(`   ${result.robotsWithActiveOperator} robots have activeOperator but clientSnapshot is missing.`);
    console.log("   Action: Run the backfill script: npx tsx backend/scripts/backfillRobotSnapshots.ts\n");
  }

  if (result.robotsWithNoOperators > 0) {
    console.log("4. ASSIGN OPERATORS TO ROBOTS:");
    console.log(`   ${result.robotsWithNoOperators} robots have no operators assigned at all.`);
    console.log("   Action: These robots need operators assigned via addAppUserToRobot API.\n");
  }
}

async function main() {
  try {
    await connectToDatabase();
    const result = await runDiagnostics();
    printResults(result);
  } catch (error) {
    console.error("Diagnostic failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

// Run the diagnostic
main();
