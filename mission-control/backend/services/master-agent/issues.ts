/**
 * Master Agent - Issue Management Functions
 * Handles issue listing, searching, and date range queries
 */

import { Request } from "express";
import issueModel from "../../models/issueModel";
import { parseDateQuery } from "./utils";

// ============== FUNCTION DEFINITIONS ==============
export const issueFunctionDefinitions = [
  {
    name: "listIssues",
    description: "List issues with optional filters for status, date range, type, and robot/client. Use for queries like 'how many open issues today?', 'show issues from this week', 'how many open issues till now' (all time), etc. If no date filter is provided, returns all issues matching other filters.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["open", "pending", "closed"],
          description: "Filter by issue status"
        },
        typeOfIssue: {
          type: "string",
          enum: ["mechanical", "electrical", "downtime", "observation", "other"],
          description: "Filter by issue type"
        },
        dateFrom: {
          type: "string",
          description: "Start date for filtering (ISO string or natural language like 'today', 'yesterday')"
        },
        dateTo: {
          type: "string",
          description: "End date for filtering (ISO string)"
        },
        robotId: {
          type: "string",
          description: "Filter by specific robot"
        },
        clientId: {
          type: "string",
          description: "Filter by specific client/site"
        }
      }
    }
  },

  {
    name: "getIssuesByDateRange",
    description: "Get count and list of issues within a specific date range. Useful for daily/weekly/monthly reports.",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["today", "yesterday", "thisWeek", "lastWeek", "thisMonth", "lastMonth"],
          description: "Predefined time period"
        },
        status: {
          type: "string",
          enum: ["open", "pending", "closed"],
          description: "Optional: Filter by status"
        }
      },
      required: ["period"]
    }
  },

  {
    name: "searchIssues",
    description: "Search issues by title or description text",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for issue title or description"
        },
        status: {
          type: "string",
          enum: ["open", "pending", "closed"],
          description: "Optional: Filter by status"
        }
      },
      required: ["query"]
    }
  }
];

// ============== FUNCTION IMPLEMENTATIONS ==============
export class IssueFunctions {
  private req: Request;

  constructor(req: Request) {
    this.req = req;
  }

  async listIssues(args: {
    status?: string;
    typeOfIssue?: string;
    dateFrom?: string;
    dateTo?: string;
    robotId?: string;
    clientId?: string;
  }) {
    const query: any = {};

    // Status filter
    if (args.status) {
      query.status = args.status;
    }

    // Type filter
    if (args.typeOfIssue) {
      query.typeOfIssue = args.typeOfIssue;
    }

    // Date range filter
    if (args.dateFrom || args.dateTo) {
      let fromTimestamp: number | undefined;
      let toTimestamp: number | undefined;

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

      if (fromTimestamp !== undefined || toTimestamp !== undefined) {
        query.raisedOnTimestamp = {};
        if (fromTimestamp !== undefined) {
          query.raisedOnTimestamp.$gte = fromTimestamp;
        }
        if (toTimestamp !== undefined) {
          query.raisedOnTimestamp.$lte = toTimestamp;
        }
      }
    }

    // Robot filter
    if (args.robotId) {
      query.robot = args.robotId;
    }

    // Client filter
    if (args.clientId) {
      query.client = args.clientId;
    }

    const issues = await issueModel
      .find(query)
      .populate("robot", "name _id")
      .populate("client", "name")
      .select("id title status typeOfIssue raisedOnTimestamp robot client")
      .sort({ raisedOnTimestamp: -1 })
      .limit(100);

    return {
      success: true,
      count: issues.length,
      filters: args,
      issues: issues.map((issue: any) => ({
        id: issue.id,
        title: issue.title,
        status: issue.status,
        typeOfIssue: issue.typeOfIssue,
        raisedOn: new Date(issue.raisedOnTimestamp).toISOString(),
        robot: issue.robot,
        client: issue.client
      }))
    };
  }

  async getIssuesByDateRange(args: { period: string; status?: string }) {
    const dateRange = parseDateQuery(args.period);

    if (!dateRange) {
      return {
        success: false,
        error: `Invalid period: ${args.period}. Use 'today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', or 'lastMonth'.`
      };
    }

    const query: any = {
      raisedOnTimestamp: {
        $gte: dateRange.from,
        $lte: dateRange.to
      }
    };

    if (args.status) {
      query.status = args.status;
    }

    const issues = await issueModel
      .find(query)
      .populate("robot", "name _id")
      .populate("client", "name")
      .select("id title status typeOfIssue raisedOnTimestamp robot client")
      .sort({ raisedOnTimestamp: -1 });

    // Group by status for summary
    const summary = {
      open: 0,
      pending: 0,
      closed: 0
    };

    issues.forEach((issue: any) => {
      if (summary[issue.status as keyof typeof summary] !== undefined) {
        summary[issue.status as keyof typeof summary]++;
      }
    });

    return {
      success: true,
      period: args.period,
      dateRange: {
        from: new Date(dateRange.from).toISOString(),
        to: new Date(dateRange.to).toISOString()
      },
      total: issues.length,
      summary: summary,
      issues: issues.map((issue: any) => ({
        id: issue.id,
        title: issue.title,
        status: issue.status,
        typeOfIssue: issue.typeOfIssue,
        raisedOn: new Date(issue.raisedOnTimestamp).toISOString(),
        robot: issue.robot,
        client: issue.client
      }))
    };
  }

  async searchIssues(args: { query: string; status?: string }) {
    const query: any = {
      $or: [
        { title: { $regex: args.query, $options: "i" } },
        { solution: { $regex: args.query, $options: "i" } }
      ]
    };

    if (args.status) {
      query.status = args.status;
    }

    const issues = await issueModel
      .find(query)
      .populate("robot", "name _id")
      .populate("client", "name")
      .select("id title status typeOfIssue raisedOnTimestamp robot client solution")
      .sort({ raisedOnTimestamp: -1 })
      .limit(50);

    return {
      success: true,
      query: args.query,
      count: issues.length,
      issues: issues.map((issue: any) => ({
        id: issue.id,
        title: issue.title,
        status: issue.status,
        typeOfIssue: issue.typeOfIssue,
        raisedOn: new Date(issue.raisedOnTimestamp).toISOString(),
        robot: issue.robot,
        client: issue.client
      }))
    };
  }
}
