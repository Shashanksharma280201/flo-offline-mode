/**
 * Master Agent - Overtime Management Functions
 * List and track overtime requests
 */

import { Request } from "express";
import overtimeRequestModel from "../../models/overtimeRequestModel";
import { parseDateQuery } from "./utils";

// ============== FUNCTION DEFINITIONS ==============

export const overtimeFunctionDefinitions = [
  {
    name: "listOvertimeRequests",
    description:
      "List overtime requests with optional filters. Use for queries like 'show pending overtime requests', 'who worked overtime this week?', 'list approved overtime for operator X', etc.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["pending", "approved", "rejected"],
          description: "Filter by request status"
        },
        dateFrom: {
          type: "string",
          description:
            "Start date for filtering (ISO string or natural language like 'today', 'yesterday')"
        },
        dateTo: {
          type: "string",
          description: "End date for filtering (ISO string)"
        },
        operatorId: {
          type: "string",
          description: "Filter by specific operator"
        }
      }
    }
  }
];

// ============== FUNCTION IMPLEMENTATIONS ==============

export class OvertimeFunctions {
  private req: Request;

  constructor(req: Request) {
    this.req = req;
  }

  async listOvertimeRequests(args: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    operatorId?: string;
  }) {
    const query: any = {};

    // Status filter
    if (args.status) {
      query.status = args.status;
    }

    // Operator filter
    if (args.operatorId) {
      query.operatorId = args.operatorId;
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
        query.requestedAt = {};
        if (fromTimestamp !== undefined) {
          query.requestedAt.$gte = new Date(fromTimestamp);
        }
        if (toTimestamp !== undefined) {
          query.requestedAt.$lte = new Date(toTimestamp);
        }
      }
    }

    const requests = await overtimeRequestModel
      .find(query)
      .populate("operatorId", "name phoneNumber")
      .populate("clientId", "name")
      .populate("approvedBy", "name email")
      .select(
        "id operatorId clientId status requestedAt requestedDuration approvedDuration approvedBy notes"
      )
      .sort({ requestedAt: -1 })
      .limit(100);

    // Group by status for summary
    const summary = {
      total: requests.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      totalDurationRequested: 0,
      totalDurationApproved: 0
    };

    requests.forEach((request: any) => {
      if (request.status === "pending") summary.pending++;
      else if (request.status === "approved") summary.approved++;
      else if (request.status === "rejected") summary.rejected++;

      summary.totalDurationRequested += request.requestedDuration || 0;
      summary.totalDurationApproved += request.approvedDuration || 0;
    });

    return {
      success: true,
      count: requests.length,
      filters: args,
      summary: summary,
      requests: requests.map((request: any) => ({
        id: request.id,
        operator: request.operatorId,
        client: request.clientId,
        status: request.status,
        requestedAt: request.requestedAt,
        requestedDuration: request.requestedDuration,
        approvedDuration: request.approvedDuration,
        approvedBy: request.approvedBy,
        notes: request.notes
      }))
    };
  }
}
