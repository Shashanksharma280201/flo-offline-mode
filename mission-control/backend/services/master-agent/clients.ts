/**
 * Master Agent - Client Functions
 * Search, list, and get details about client sites
 */

import { Request } from "express";
import clientModel from "../../models/clientModel";

// ============== FUNCTION DEFINITIONS ==============

export const clientFunctionDefinitions = [
  {
    name: "searchClients",
    description:
      "Search for client sites by name. Clients are physical locations/sites where robots operate. NOT the same as operators. CRITICAL: This function ONLY searches the database and returns matches. If multiple matches found, you MUST present them to user for disambiguation. If no matches found, respond 'No client found'. NEVER guess or automatically pick the first match.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query - client/site name"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "getClientDetails",
    description:
      "Get detailed information about a specific client/site including location, operators, and operating hours",
    parameters: {
      type: "object",
      properties: {
        clientId: {
          type: "string",
          description: "The client's ID"
        }
      },
      required: ["clientId"]
    }
  },
  {
    name: "listClients",
    description:
      "List all client sites with optional active/inactive filter. Clients are physical locations, NOT operators.",
    parameters: {
      type: "object",
      properties: {
        isActive: {
          type: "boolean",
          description: "Filter by active status (true=active, false=inactive)"
        }
      }
    }
  }
];

// ============== FUNCTION IMPLEMENTATIONS ==============

export class ClientFunctions {
  private req: Request;

  constructor(req: Request) {
    this.req = req;
  }

  async searchClients(args: { query: string }) {
    const clients = await clientModel
      .find({
        name: { $regex: args.query, $options: "i" }
      })
      .limit(10)
      .select("id name isActive location");

    return {
      success: true,
      count: clients.length,
      clients: clients.map((client: any) => ({
        id: client.id,
        name: client.name,
        isActive: client.isActive,
        location: client.location
      }))
    };
  }

  async getClientDetails(args: { clientId: string }) {
    const client = await clientModel
      .findById(args.clientId)
      .populate("owner", "name email")
      .populate("appUsers", "name phoneNumber");

    if (!client) {
      return { success: false, error: "Client not found" };
    }

    return {
      success: true,
      client: {
        id: client.id,
        name: client.name,
        isActive: client.isActive,
        owner: client.owner,
        location: client.location,
        operatingHours: client.operatingHours,
        checkInTime: client.checkInTimeWithZone,
        operators: client.appUsers,
        operatorsCount: client.appUsers?.length || 0
      }
    };
  }

  async listClients(args: { isActive?: boolean }) {
    const query: any = {};
    if (args.isActive !== undefined) {
      query.isActive = args.isActive;
    }

    const clients = await clientModel
      .find(query)
      .select("id name isActive location operatingHours");

    return {
      success: true,
      count: clients.length,
      clients: clients
    };
  }
}
