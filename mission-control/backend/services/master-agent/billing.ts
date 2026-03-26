/**
 * Master Agent - Billing Management Functions
 * Query billing data and revenue information
 */

import { Request } from "express";
import { Billing } from "../../models/billingModel";
import robotModel from "../../models/robotModel";
import { parseDateQuery, normalizeRobotQuery } from "./utils";

// ============== FUNCTION DEFINITIONS ==============

export const billingFunctionDefinitions = [
  {
    name: "getBillingSummary",
    description:
      "Get billing summary and revenue totals with optional date range and grouping. Use for queries like 'what is total billing this month?', 'show revenue summary', 'billing breakdown by robot', etc.",
    parameters: {
      type: "object",
      properties: {
        dateFrom: {
          type: "string",
          description:
            "Start date for filtering (ISO string or natural language like 'today', 'thisMonth')"
        },
        dateTo: {
          type: "string",
          description: "End date for filtering (ISO string)"
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
          description: "Predefined time period for billing summary"
        },
        groupBy: {
          type: "string",
          enum: ["robot", "client", "status"],
          description: "Group billing by robot, client, or status"
        }
      }
    }
  },
  {
    name: "getRobotBilling",
    description:
      "Get billing information for a specific robot with optional date range. Use for queries like 'show billing for MMR-31', 'robot X billing this month', 'how much revenue from robot Y?', etc.",
    parameters: {
      type: "object",
      properties: {
        robotId: {
          type: "string",
          description: "Robot ID or name to get billing for"
        },
        dateFrom: {
          type: "string",
          description: "Start date for filtering (ISO string or natural language)"
        },
        dateTo: {
          type: "string",
          description: "End date for filtering (ISO string)"
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
          description: "Predefined time period for billing"
        }
      },
      required: ["robotId"]
    }
  },
  {
    name: "getBillingByPeriod",
    description:
      "Get billing data grouped by time period with filters. Use for queries like 'billing breakdown by month', 'weekly revenue', 'quarterly billing status', etc.",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["week", "month", "quarter"],
          description: "Time period to group billing by"
        },
        dateFrom: {
          type: "string",
          description: "Start date for the period"
        },
        dateTo: {
          type: "string",
          description: "End date for the period"
        },
        status: {
          type: "string",
          enum: [
            "not billing",
            "billing",
            "poc",
            "sold",
            "paid poc",
            "N/A",
            "work order pending"
          ],
          description: "Filter by billing status"
        }
      },
      required: ["period"]
    }
  }
];

// ============== FUNCTION IMPLEMENTATIONS ==============

export class BillingFunctions {
  private req: Request;

  constructor(req: Request) {
    this.req = req;
  }

  async getBillingSummary(args: {
    dateFrom?: string;
    dateTo?: string;
    period?: string;
    groupBy?: string;
  }) {
    const query: any = {};

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
      query.startDate = {};
      if (fromTimestamp !== undefined) {
        query.startDate.$gte = new Date(fromTimestamp);
      }
      if (toTimestamp !== undefined) {
        query.startDate.$lte = new Date(toTimestamp);
      }
    }

    console.log(`[AI Agent] Billing summary query:`, query);

    // Aggregate billing data
    const pipeline: any[] = [{ $match: query }];

    // Add grouping if specified
    if (args.groupBy) {
      let groupByField: string;
      if (args.groupBy === "robot") {
        groupByField = "$robotId";
      } else if (args.groupBy === "client") {
        groupByField = "$clientId";
      } else if (args.groupBy === "status") {
        groupByField = "$status";
      } else {
        groupByField = null as any;
      }

      if (groupByField) {
        pipeline.push({
          $group: {
            _id: groupByField,
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
            avgAmount: { $avg: "$amount" }
          }
        });
        pipeline.push({ $sort: { totalAmount: -1 } });
      }
    }

    const grouped = args.groupBy ? await Billing.aggregate(pipeline) : [];

    // Get overall summary
    const summary = await Billing.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalRecords: { $sum: 1 },
          avgBilling: { $avg: "$amount" }
        }
      }
    ]);

    // Get status breakdown
    const statusBreakdown = await Billing.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);

    const result = summary.length > 0 ? summary[0] : null;

    return {
      success: true,
      period: args.period,
      dateRange:
        fromTimestamp && toTimestamp
          ? {
              from: new Date(fromTimestamp).toISOString(),
              to: new Date(toTimestamp).toISOString()
            }
          : undefined,
      summary: {
        totalRevenue: result?.totalRevenue || 0,
        totalRecords: result?.totalRecords || 0,
        avgBilling: result?.avgBilling || 0
      },
      statusBreakdown: statusBreakdown.map((item: any) => ({
        status: item._id,
        count: item.count,
        totalAmount: item.totalAmount
      })),
      groupedData: args.groupBy ? grouped : undefined
    };
  }

  async getRobotBilling(args: {
    robotId: string;
    dateFrom?: string;
    dateTo?: string;
    period?: string;
  }) {
    if (!args.robotId) {
      return {
        success: false,
        error: "Robot ID is required"
      };
    }

    console.log(`[AI Agent] Getting billing for robot: "${args.robotId}"`);

    // Normalize robot query to handle variations
    const robotVariations = normalizeRobotQuery(args.robotId);

    // Find robot by name
    const robotOrConditions = robotVariations.flatMap((variation) => [
      { name: { $regex: new RegExp(`^${variation}$`, "i") } },
      { name: { $regex: new RegExp(variation, "i") } },
      { _id: variation }
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

    const query: any = { robotId: robot._id };

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
      query.startDate = {};
      if (fromTimestamp !== undefined) {
        query.startDate.$gte = new Date(fromTimestamp);
      }
      if (toTimestamp !== undefined) {
        query.startDate.$lte = new Date(toTimestamp);
      }
    }

    console.log(`[AI Agent] Robot billing query:`, query);

    // Get billing records
    const billingRecords = await Billing.find(query)
      .populate("clientId", "name id")
      .select("id robotId clientId startDate endDate amount status")
      .sort({ startDate: -1 })
      .limit(100);

    // Calculate summary
    const totalRevenue = billingRecords.reduce(
      (sum: number, record: any) => sum + (record.amount || 0),
      0
    );

    return {
      success: true,
      robotId: robot._id,
      robotName: robot.name,
      period: args.period,
      dateRange:
        fromTimestamp && toTimestamp
          ? {
              from: new Date(fromTimestamp).toISOString(),
              to: new Date(toTimestamp).toISOString()
            }
          : undefined,
      summary: {
        totalRevenue: totalRevenue,
        recordCount: billingRecords.length,
        avgBilling: billingRecords.length > 0 ? totalRevenue / billingRecords.length : 0
      },
      records: billingRecords.map((record: any) => ({
        id: record.id,
        client: record.clientId,
        startDate: record.startDate,
        endDate: record.endDate,
        amount: record.amount,
        status: record.status
      }))
    };
  }

  async getBillingByPeriod(args: {
    period: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }) {
    const query: any = {};

    // Status filter
    if (args.status) {
      query.status = args.status;
    }

    // Date range filter
    let fromTimestamp: number | undefined;
    let toTimestamp: number | undefined;

    if (args.dateFrom) {
      const dateRange = parseDateQuery(args.dateFrom);
      if (dateRange) {
        fromTimestamp = dateRange.from;
      }
    }

    if (args.dateTo) {
      const dateTo = new Date(args.dateTo);
      if (!isNaN(dateTo.getTime())) {
        toTimestamp = dateTo.getTime();
      }
    }

    // Apply timestamp filter
    if (fromTimestamp !== undefined || toTimestamp !== undefined) {
      query.startDate = {};
      if (fromTimestamp !== undefined) {
        query.startDate.$gte = new Date(fromTimestamp);
      }
      if (toTimestamp !== undefined) {
        query.startDate.$lte = new Date(toTimestamp);
      }
    }

    console.log(`[AI Agent] Billing by period query:`, query, `period: ${args.period}`);

    // Determine grouping format based on period
    let dateFormat: any;
    if (args.period === "week") {
      dateFormat = {
        year: { $year: "$startDate" },
        week: { $week: "$startDate" }
      };
    } else if (args.period === "month") {
      dateFormat = {
        year: { $year: "$startDate" },
        month: { $month: "$startDate" }
      };
    } else if (args.period === "quarter") {
      dateFormat = {
        year: { $year: "$startDate" },
        quarter: {
          $ceil: { $divide: [{ $month: "$startDate" }, 3] }
        }
      };
    } else {
      return {
        success: false,
        error: `Invalid period "${args.period}". Use 'week', 'month', or 'quarter'.`
      };
    }

    // Aggregate by period
    const grouped = await Billing.aggregate([
      { $match: query },
      {
        $group: {
          _id: dateFormat,
          totalRevenue: { $sum: "$amount" },
          count: { $sum: 1 },
          avgBilling: { $avg: "$amount" }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.week": -1, "_id.quarter": -1 } },
      { $limit: 50 }
    ]);

    return {
      success: true,
      period: args.period,
      filters: args,
      count: grouped.length,
      data: grouped.map((item: any) => ({
        period: item._id,
        totalRevenue: item.totalRevenue,
        recordCount: item.count,
        avgBilling: item.avgBilling
      }))
    };
  }
}
