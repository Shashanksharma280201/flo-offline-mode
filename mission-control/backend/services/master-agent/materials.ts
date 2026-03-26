/**
 * Master Agent - Materials Management Functions
 * List and search materials configured in the system
 */

import { Request } from "express";
import materialModel from "../../models/materialModel";
import clientModel from "../../models/clientModel";

// ============== FUNCTION DEFINITIONS ==============

export const materialsFunctionDefinitions = [
  {
    name: "listMaterials",
    description:
      "List all materials configured in the system with optional filters. Use for queries like 'show all materials', 'list active materials', 'what materials are available?', etc.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["active", "inactive"],
          description: "Filter by material status (active or inactive)"
        }
      }
    }
  },
  {
    name: "searchMaterials",
    description:
      "Search materials by name. Use for queries like 'find material named X', 'search for materials containing keyword', etc.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for material name"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "getClientMaterials",
    description:
      "Get materials configured for a specific client. Use for queries like 'what materials are available at client X?', 'show materials for client Y', etc.",
    parameters: {
      type: "object",
      properties: {
        clientId: {
          type: "string",
          description: "Client ID or name to get materials for"
        }
      },
      required: ["clientId"]
    }
  }
];

// ============== FUNCTION IMPLEMENTATIONS ==============

export class MaterialsFunctions {
  private req: Request;

  constructor(req: Request) {
    this.req = req;
  }

  async listMaterials(args: { status?: string }) {
    const query: any = {};

    // Status filter
    if (args.status) {
      query.isActive = args.status === "active";
    }

    const materials = await materialModel
      .find(query)
      .select("id name isActive")
      .sort({ name: 1 })
      .limit(100);

    // Group by status for summary
    const summary = {
      total: materials.length,
      active: 0,
      inactive: 0
    };

    materials.forEach((material: any) => {
      if (material.isActive) summary.active++;
      else summary.inactive++;
    });

    return {
      success: true,
      count: materials.length,
      filters: args,
      summary: summary,
      materials: materials.map((material: any) => ({
        id: material.id,
        name: material.name,
        status: material.isActive ? "active" : "inactive"
      }))
    };
  }

  async searchMaterials(args: { query: string }) {
    if (!args.query) {
      return {
        success: false,
        error: "Search query is required"
      };
    }

    console.log(`[AI Agent] Searching materials for: "${args.query}"`);

    // Search by name using regex
    const materials = await materialModel
      .find({
        name: { $regex: new RegExp(args.query, "i") }
      })
      .select("id name isActive")
      .sort({ name: 1 })
      .limit(50);

    if (materials.length === 0) {
      return {
        success: true,
        count: 0,
        query: args.query,
        materials: [],
        message: `No materials found matching "${args.query}"`
      };
    }

    return {
      success: true,
      count: materials.length,
      query: args.query,
      materials: materials.map((material: any) => ({
        id: material.id,
        name: material.name,
        status: material.isActive ? "active" : "inactive"
      }))
    };
  }

  async getClientMaterials(args: { clientId: string }) {
    if (!args.clientId) {
      return {
        success: false,
        error: "Client ID is required"
      };
    }

    console.log(`[AI Agent] Getting materials for client: "${args.clientId}"`);

    // Find client by ID or name
    const client = await clientModel.findOne({
      $or: [
        { _id: args.clientId },
        { id: args.clientId },
        { name: { $regex: new RegExp(`^${args.clientId}$`, "i") } },
        { name: { $regex: new RegExp(args.clientId, "i") } }
      ]
    }).populate("materials", "id name isActive");

    if (!client) {
      return {
        success: false,
        error: `Client not found for "${args.clientId}"`
      };
    }

    const materials = client.materials || [];

    return {
      success: true,
      clientId: client.id,
      clientName: client.name,
      count: materials.length,
      materials: materials.map((material: any) => ({
        id: material.id,
        name: material.name,
        status: material.isActive ? "active" : "inactive"
      }))
    };
  }
}
