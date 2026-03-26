/**
 * Master Agent - Robot Functions
 * Handles robot search, details, listing, and status operations
 */

import { Request } from "express";
import robotModel from "../../models/robotModel";
import appUserModel from "../../models/appUserModel";
import {
  normalizeRobotQuery,
  scoreRobotMatch,
  findRobotsWithScoring
} from "./utils";

// ============== FUNCTION DEFINITIONS ==============
export const robotFunctionDefinitions = [
  {
    name: "searchRobots",
    description: "Search for robots by name or ID (e.g., 'MMR-31', 'robot 31'). CRITICAL: This function ONLY searches the database and returns actual matches. If 0 matches found, respond 'No robot found for X'. If multiple matches found (e.g., MMR-31 and MMR-310), you MUST ask user to clarify. NEVER guess or automatically pick the first match. Only proceed with robot operations if search returns exactly 1 match.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Robot name or ID (e.g., 'MMR-31', 'robot 31')"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "getRobotDetails",
    description: "Get comprehensive details about a robot including: battery info, motor data, status, location, assigned operator, client, fleet, manufacturing data (partner, dates, status), maintenance schedule, tasks summary, open issues count, trip count, and access info. Use for queries like 'show details for MMR-31', 'what is battery type of robot X?', 'manufacturing data for MMR-31', 'motor specs for robot Y', etc.",
    parameters: {
      type: "object",
      properties: {
        robotId: {
          type: "string",
          description: "Robot ID or name (e.g., 'MMR-31')"
        }
      },
      required: ["robotId"]
    }
  },
  {
    name: "listRobots",
    description: "List all robots with optional filters for status, type, or fleet",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["idle", "active", "charging", "maintenance", "error"],
          description: "Filter by robot status"
        },
        robotType: {
          type: "string",
          enum: ["autonomous", "manual"],
          description: "Filter by robot type"
        },
        fleet: {
          type: "string",
          description: "Filter by fleet name"
        }
      }
    }
  },
  {
    name: "getRobotsByStatus",
    description: "Get counts and lists of robots grouped by their current status",
    parameters: {
      type: "object",
      properties: {}
    }
  }
];

// ============== FUNCTION IMPLEMENTATIONS ==============
export class RobotFunctions {
  private req: Request;

  constructor(req: Request) {
    this.req = req;
  }

  async searchRobots(args: { query: string }) {
    const searchVariations = normalizeRobotQuery(args.query);

    console.log(`[AI Agent] Searching robots with query: "${args.query}"`);
    console.log(`[AI Agent] Normalized variations:`, searchVariations);

    // Build flexible OR query to check all variations
    // NOTE: _id contains UUIDs, not robot names. Robot names are in the `name` field.
    const orConditions = searchVariations.flatMap(variation => [
      { name: { $regex: new RegExp(`^${variation}$`, "i") } },  // Exact name match
      { name: { $regex: new RegExp(variation, "i") } }           // Contains name match
    ]);

    const robots = await robotModel.find({
      $or: orConditions
    }).limit(10).select("id name status robotType fleet");

    console.log(`[AI Agent] Found ${robots.length} robots`);
    if (robots.length > 0) {
      console.log(`[AI Agent] Robot IDs:`, robots.map(r => r._id));
    }

    return {
      success: true,
      count: robots.length,
      robots: robots
    };
  }

  async getRobotDetails(args: { robotId: string }) {
    const searchVariations = normalizeRobotQuery(args.robotId);

    console.log(`[AI Agent] Getting robot details for: "${args.robotId}"`);
    console.log(`[AI Agent] Search variations:`, searchVariations);

    // Build flexible OR query
    // NOTE: _id contains UUIDs, not robot names. Robot names are in the `name` field.
    const orConditions = searchVariations.flatMap(variation => [
      { name: { $regex: new RegExp(`^${variation}$`, "i") } },
      { name: { $regex: new RegExp(variation, "i") } }
    ]);

    const robot = await robotModel.findOne({
      $or: orConditions
    });

    if (!robot) {
      console.log(`[AI Agent] Robot not found for query: "${args.robotId}"`);
      return {
        success: false,
        error: `Robot not found for "${args.robotId}". Please check the robot ID.`,
        searchedVariations: searchVariations
      };
    }

    console.log(`[AI Agent] Found robot: ${robot._id}`);

    // Get assigned operator
    let assignedOperator = null;
    if (robot.activeOperator) {
      assignedOperator = await appUserModel.findById(robot.activeOperator)
        .select("id name phoneNumber");
    }

    return {
      success: true,
      robot: {
        // Basic Info
        id: robot.id,
        name: robot.name,
        status: robot.status,
        robotType: robot.robotType,
        fleet: robot.fleet,
        macAddress: robot.macAddress,
        image: robot.image,
        description: robot.desc,

        // Operator & Client Info (from snapshots for fast access)
        assignedOperator: robot.operatorSnapshot || assignedOperator,
        client: robot.clientSnapshot,
        fleetInfo: robot.fleetSnapshot,

        // Location
        location: robot.gps,

        // Maintenance Info
        maintenance: {
          lastMaintenance: robot.maintenance?.lastMaintenance,
          schedule: robot.maintenance?.schedule
        },

        // Manufacturing Data
        manufacturingData: robot.manufacturingData ? {
          partner: robot.manufacturingData.manufacturingPartner,
          partnerOther: robot.manufacturingData.manufacturingPartnerOther,
          manufacturingDate: robot.manufacturingData.manufacturingDate,
          shippingDate: robot.manufacturingData.shippingDate,
          status: robot.manufacturingData.manufacturingStatus,
          dataCollection: robot.manufacturingData.dataCollection,
          invoicingStatus: robot.manufacturingData.invoicingStatus,
          features: robot.manufacturingData.features,
          additionalInputs: robot.manufacturingData.additionalInputs
        } : null,

        // Motor & Battery Data
        motorData: robot.motorData ? {
          motorType: robot.motorData.motorType,
          motorModel: robot.motorData.motorModel,
          motorSerialNumber: robot.motorData.motorSerialNumber,
          motorId: robot.motorData.motorId,
          batteryId: robot.motorData.batteryId,
          batteryCode: robot.motorData.batteryCode,
          batterySerialNo: robot.motorData.batterySerialNo,
          batteryType: robot.motorData.batteryType,
          bluetoothSerialNo: robot.motorData.bluetoothConnectionSerialNo
        } : null,

        // Current Battery
        currentBattery: robot.currentBattery,

        // Tasks Summary
        tasks: robot.tasks ? {
          total: robot.tasks.length,
          pending: robot.tasks.filter((t: any) => t.status === 'Pending').length,
          inProgress: robot.tasks.filter((t: any) => t.status === 'In Progress').length,
          completed: robot.tasks.filter((t: any) => t.status === 'Completed').length
        } : null,

        // Stats (from snapshots)
        openIssuesCount: robot.openIssuesCount,
        yesterdayTripCount: robot.yesterdayTripCount,

        // Access Info
        access: robot.access,
        expiry: robot.expiry
      }
    };
  }

  async listRobots(args: { status?: string; robotType?: string; fleet?: string }) {
    const query: any = {};

    if (args.status) query.status = args.status;
    if (args.robotType) query.robotType = args.robotType;
    if (args.fleet) query.fleet = args.fleet;

    const robots = await robotModel.find(query)
      .select("id name status robotType fleet");

    return {
      success: true,
      count: robots.length,
      robots: robots
    };
  }

  async getRobotsByStatus() {
    const allRobots = await robotModel.find({}).select("id name status robotType");

    const grouped = {
      idle: [] as any[],
      active: [] as any[],
      charging: [] as any[],
      maintenance: [] as any[],
      error: [] as any[]
    };

    allRobots.forEach(robot => {
      const status = robot.status?.toLowerCase() || "idle";
      if (grouped[status as keyof typeof grouped]) {
        grouped[status as keyof typeof grouped].push({
          id: robot.id,
          name: robot.name,
          robotType: robot.robotType
        });
      }
    });

    return {
      success: true,
      summary: {
        idle: grouped.idle.length,
        active: grouped.active.length,
        charging: grouped.charging.length,
        maintenance: grouped.maintenance.length,
        error: grouped.error.length
      },
      robots: grouped
    };
  }
}
