/**
 * Master Agent - Analytics and Fleet Functions
 * Handles trip analytics, top performers, and fleet overview
 */

import { Request } from "express";
import robotModel from "../../models/robotModel";
import appUserModel from "../../models/appUserModel";
import appDataModel from "../../models/appDataModel";
import clientModel from "../../models/clientModel";
import { parseDateQuery, normalizeRobotQuery } from "./utils";

// ============== FUNCTION DEFINITIONS ==============
export const analyticsFunctionDefinitions = [
  {
    name: "getTripAnalytics",
    description: "Get trip statistics and analytics with various filters",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["today", "yesterday", "week", "month"],
          description: "Time period for analytics"
        },
        robotId: {
          type: "string",
          description: "Optional: Filter by specific robot"
        },
        operatorId: {
          type: "string",
          description: "Optional: Filter by specific operator"
        }
      }
    }
  },
  {
    name: "getTripStats",
    description:
      "Get real trip statistics from AppData timeseries collection. Use for queries like 'total trips for MMR-31 this month', 'trip count today', 'how many trips yesterday?', 'show analytics for client X from date Y to date Z', 'trips at client ABC this week', etc. CRITICAL: You MUST call searchClients() or searchRobots() FIRST before calling this function to verify the entity exists in database. Use the exact ID from search results. If search returns 0 matches, say 'not found'. If search returns multiple matches, ask user to clarify which one. NEVER guess IDs.",
    parameters: {
      type: "object",
      properties: {
        robotId: {
          type: "string",
          description: "Optional: Robot ID from searchRobots() result. Must be exact database ID."
        },
        clientId: {
          type: "string",
          description: "Optional: Client ID from searchClients() result. Must be exact database ID."
        },
        period: {
          type: "string",
          enum: [
            "today",
            "yesterday",
            "thisWeek",
            "lastWeek",
            "thisMonth",
            "lastMonth"
          ],
          description: "Predefined time period for trip stats"
        },
        dateFrom: {
          type: "string",
          description: "Custom start date (ISO string or natural language)"
        },
        dateTo: {
          type: "string",
          description: "Custom end date (ISO string)"
        }
      }
    }
  },
  {
    name: "getTopPerformers",
    description: "Get top performing robots or operators based on metrics",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["robots", "operators"],
          description: "Get top robots or operators"
        },
        metric: {
          type: "string",
          enum: ["trips", "success_rate", "uptime"],
          description: "Metric to rank by"
        },
        period: {
          type: "string",
          enum: ["today", "week", "month"],
          description: "Time period"
        },
        limit: {
          type: "number",
          description: "Number of top performers to return (default: 5)"
        }
      },
      required: ["type", "metric"]
    }
  },
  {
    name: "getFleetOverview",
    description: "Get complete fleet overview with all robots and their statuses",
    parameters: {
      type: "object",
      properties: {
        fleet: {
          type: "string",
          description: "Optional: Filter by specific fleet name"
        }
      }
    }
  }
];

// ============== FUNCTION IMPLEMENTATIONS ==============
export class AnalyticsFunctions {
  private req: Request;

  constructor(req: Request) {
    this.req = req;
  }

  async getTripAnalytics(args: { period?: string; robotId?: string; operatorId?: string }) {
    // TODO: Implement actual analytics query
    // This is a placeholder - you'll need to implement based on your analytics schema
    return {
      success: true,
      period: args.period || "today",
      analytics: {
        totalTrips: 145,
        successfulTrips: 142,
        successRate: 97.9,
        averageResponseTime: "2.3 minutes"
      }
    };
  }

  async getTripStats(args: {
    robotId?: string;
    clientId?: string;
    period?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const query: any = {};

    // Client filter
    if (args.clientId) {
      console.log(`[AI Agent] Trip stats for client: "${args.clientId}"`);

      // Find client by name or ID
      const client = await clientModel.findOne({
        $or: [
          { _id: args.clientId },
          { id: args.clientId },
          { name: { $regex: new RegExp(`^${args.clientId}$`, "i") } },
          { name: { $regex: new RegExp(args.clientId, "i") } }
        ]
      });

      if (!client) {
        return {
          success: false,
          error: `Client not found for "${args.clientId}". Please check the client name or ID.`
        };
      }

      console.log(`[AI Agent] Found client: ${client.name} (${client._id})`);

      // Get all robots assigned to this client
      const clientRobots = await robotModel.find({
        client: client._id
      }).select("_id name");

      if (clientRobots.length === 0) {
        return {
          success: true,
          clientId: args.clientId,
          clientName: client.name,
          message: "No robots assigned to this client",
          stats: {
            totalTrips: 0,
            totalRunningTime: 0,
            totalIdleTime: 0,
            totalDownTime: 0,
            avgRunningTime: 0,
            avgIdleTime: 0
          }
        };
      }

      console.log(`[AI Agent] Found ${clientRobots.length} robots at client ${client.name}:`, clientRobots.map(r => r.name));

      const robotIds = clientRobots.map(r => r._id);
      query["metadata.robotId"] = { $in: robotIds };
    }

    // Robot filter (only if client filter not already applied)
    if (args.robotId && !args.clientId) {
      // Normalize robot query to handle variations
      const robotVariations = normalizeRobotQuery(args.robotId);

      console.log(`[AI Agent] Trip stats for robot: "${args.robotId}"`);
      console.log(`[AI Agent] Robot search variations:`, robotVariations);

      // Find robot by name
      const robotOrConditions = robotVariations.flatMap((variation) => [
        { name: { $regex: new RegExp(`^${variation}$`, "i") } },
        { name: { $regex: new RegExp(variation, "i") } }
      ]);

      const robot = await robotModel.findOne({
        $or: robotOrConditions
      });

      if (!robot) {
        return {
          success: false,
          error: `Robot not found for "${args.robotId}". Please check the robot ID or name.`
        };
      }

      query["metadata.robotId"] = robot._id;
    }

    // Date range filter
    let fromTimestamp: number | undefined;
    let toTimestamp: number | undefined;

    if (args.period) {
      const dateRange = parseDateQuery(args.period);
      if (dateRange) {
        fromTimestamp = dateRange.from;
        toTimestamp = dateRange.to;
      }
    } else if (args.dateFrom || args.dateTo) {
      if (args.dateFrom) {
        const dateRange = parseDateQuery(args.dateFrom);
        if (dateRange) {
          fromTimestamp = dateRange.from;
          if (!args.dateTo) {
            toTimestamp = dateRange.to;
          }
        }
      }

      if (args.dateTo) {
        const dateTo = new Date(args.dateTo);
        if (!isNaN(dateTo.getTime())) {
          toTimestamp = dateTo.getTime();
        }
      }
    }

    // Apply timestamp filter
    if (fromTimestamp !== undefined || toTimestamp !== undefined) {
      query.timestamp = {};
      if (fromTimestamp !== undefined) {
        query.timestamp.$gte = new Date(fromTimestamp);
      }
      if (toTimestamp !== undefined) {
        query.timestamp.$lte = new Date(toTimestamp);
      }
    }

    console.log(`[AI Agent] Trip stats query:`, query);

    // Count total trips
    const totalTrips = await appDataModel.countDocuments(query);

    // Get aggregated stats
    const stats = await appDataModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          totalRunningTime: { $sum: "$tripRunningTime" },
          totalIdleTime: { $sum: "$tripIdleTime" },
          totalDownTime: { $sum: "$totalDownTime" },
          avgRunningTime: { $avg: "$tripRunningTime" },
          avgIdleTime: { $avg: "$tripIdleTime" }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : null;

    // Get client name if filtering by client
    let clientInfo = undefined;
    if (args.clientId) {
      const client = await clientModel.findOne({
        $or: [
          { _id: args.clientId },
          { id: args.clientId },
          { name: { $regex: new RegExp(`^${args.clientId}$`, "i") } },
          { name: { $regex: new RegExp(args.clientId, "i") } }
        ]
      }).select("name id");

      if (client) {
        const robotCount = await robotModel.countDocuments({ client: client._id });
        clientInfo = {
          clientId: client.id,
          clientName: client.name,
          robotCount: robotCount
        };
      }
    }

    const response: any = {
      success: true,
      robotId: args.robotId,
      clientId: args.clientId,
      client: clientInfo,
      period: args.period,
      dateRange: fromTimestamp && toTimestamp ? {
        from: new Date(fromTimestamp).toISOString(),
        to: new Date(toTimestamp).toISOString()
      } : undefined,
      stats: {
        totalTrips: totalTrips,
        totalRunningTime: result?.totalRunningTime || 0,
        totalIdleTime: result?.totalIdleTime || 0,
        totalDownTime: result?.totalDownTime || 0,
        avgRunningTime: result?.avgRunningTime || 0,
        avgIdleTime: result?.avgIdleTime || 0
      }
    };

    // Add navigation to analytics page with filters
    response.navigate = true;
    response.path = "/analytics";

    const analyticsParams: any = {};

    // Add client filter if provided
    if (args.clientId && clientInfo) {
      analyticsParams.clientName = clientInfo.clientName;
    }

    // Add robot filter if provided
    if (args.robotId && !args.clientId) {
      // Find robot name for display
      const robot = await robotModel.findOne({
        $or: normalizeRobotQuery(args.robotId).flatMap((variation) => [
          { name: { $regex: new RegExp(`^${variation}$`, "i") } },
          { name: { $regex: new RegExp(variation, "i") } }
        ])
      }).select("name");
      if (robot) {
        analyticsParams.robotName = robot.name;
      }
    }

    // Add date filters
    if (fromTimestamp) {
      analyticsParams.startDate = new Date(fromTimestamp).toISOString();
    }
    if (toTimestamp) {
      analyticsParams.endDate = new Date(toTimestamp).toISOString();
    }

    // Include analytics params for frontend filtering
    if (Object.keys(analyticsParams).length > 0) {
      response.analyticsParams = analyticsParams;
    }

    return response;
  }

  async getTopPerformers(args: { type: string; metric: string; period?: string; limit?: number }) {
    const limit = args.limit || 5;

    // TODO: Implement actual ranking logic based on your analytics
    // Placeholder implementation
    if (args.type === "robots") {
      const robots = await robotModel.find({})
        .select("id name status")
        .limit(limit);

      return {
        success: true,
        type: "robots",
        metric: args.metric,
        period: args.period || "today",
        topPerformers: robots
      };
    } else {
      const operators = await appUserModel.find({})
        .select("id name")
        .limit(limit);

      return {
        success: true,
        type: "operators",
        metric: args.metric,
        period: args.period || "today",
        topPerformers: operators
      };
    }
  }

  async getFleetOverview(args: { fleet?: string }) {
    const query: any = {};
    if (args.fleet) query.fleet = args.fleet;

    const robots = await robotModel.find(query)
      .select("id name status batteryPercentage robotType fleet");

    const summary = {
      total: robots.length,
      active: robots.filter(r => r.status === "active").length,
      idle: robots.filter(r => r.status === "idle").length,
      charging: robots.filter(r => r.status === "charging").length,
      maintenance: robots.filter(r => r.status === "maintenance").length
    };

    return {
      success: true,
      fleet: args.fleet || "all",
      summary: summary,
      robots: robots
    };
  }
}
