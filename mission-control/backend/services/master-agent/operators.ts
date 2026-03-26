/**
 * Master Agent - Operator Functions
 * Search, list, and get details about operators
 */

import { Request } from "express";
import appUserModel from "../../models/appUserModel";
import robotModel from "../../models/robotModel";

// ============== FUNCTION DEFINITIONS ==============

export const operatorFunctionDefinitions = [
  {
    name: "searchOperators",
    description:
      "Search for operators by name, phone number, or email. Returns list of matching operators from database. CRITICAL: This function ONLY returns actual database matches. If 0 matches found, respond 'No operator found for X'. If multiple matches found, you MUST ask user to clarify which one. NEVER guess or automatically pick the first match.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search query - can be operator name, phone number, or email"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "getOperatorDetails",
    description:
      "Get detailed information about a specific operator including their profile, stats, and assigned robots",
    parameters: {
      type: "object",
      properties: {
        operatorId: {
          type: "string",
          description: "The operator's ID"
        }
      },
      required: ["operatorId"]
    }
  },
  {
    name: "listOperators",
    description: "List all operators with optional status filter",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["active", "inactive", "all"],
          description: "Filter operators by status (default: all)"
        }
      }
    }
  }
];

// ============== FUNCTION IMPLEMENTATIONS ==============

export class OperatorFunctions {
  private req: Request;

  constructor(req: Request) {
    this.req = req;
  }

  async searchOperators(args: { query: string }) {
    const operators = await appUserModel
      .find({
        $or: [
          { name: { $regex: args.query, $options: "i" } },
          { phoneNumber: { $regex: args.query } }
        ]
      })
      .limit(10)
      .select("id name phoneNumber");

    return {
      success: true,
      count: operators.length,
      operators: operators.map((op: any) => ({
        id: op.id,
        name: op.name,
        phoneNumber: op.phoneNumber
      }))
    };
  }

  async getOperatorDetails(args: { operatorId: string }) {
    const operator = await appUserModel.findById(args.operatorId);

    if (!operator) {
      return { success: false, error: "Operator not found" };
    }

    // Get assigned robots
    const assignedRobots = await robotModel
      .find({
        activeOperator: args.operatorId
      })
      .select("id name status");

    // TODO: Get trip analytics for this operator
    const stats = {
      totalTrips: 0, // TODO: Implement from analytics
      successRate: 0, // TODO: Implement from analytics
      assignedRobotsCount: assignedRobots.length
    };

    return {
      success: true,
      operator: {
        id: operator.id,
        name: operator.name,
        phoneNumber: operator.phoneNumber,
        stats: stats,
        assignedRobots: assignedRobots
      }
    };
  }

  async listOperators(args: { status?: string }) {
    const query: any = {};
    // AppUser doesn't have status field, so we ignore it for now

    const operators = await appUserModel
      .find(query)
      .select("id name phoneNumber");

    return {
      success: true,
      count: operators.length,
      operators: operators
    };
  }
}
