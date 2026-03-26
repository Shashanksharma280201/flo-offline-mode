import { Request } from "express";
import appUserModel from "../models/appUserModel";
import robotModel from "../models/robotModel";
import pathMapModel from "../models/pathMapModel";
import userModel from "../models/userModel";
import clientModel from "../models/clientModel";
import issueModel from "../models/issueModel";
import leadsModel from "../models/leadsModel";
import inventoryItemModel from "../models/inventoryItemModel";
import shipmentModel from "../models/shipmentModel";
import overtimeRequestModel from "../models/overtimeRequestModel";
import appDataModel from "../models/appDataModel";

/**
 * AI Agent Service
 * Defines all available functions that the AI can call to interact with the system
 */

// Define all available functions for OpenAI function calling
export const availableFunctions = [
  // ============== OPERATOR FUNCTIONS ==============
  {
    name: "searchOperators",
    description: "Search for operators by name, phone number, or email. Returns list of matching operators.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query - can be operator name, phone number, or email"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "getOperatorDetails",
    description: "Get detailed information about a specific operator including their profile, stats, and assigned robots",
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
  },

  // ============== CLIENT/SITE FUNCTIONS ==============
  {
    name: "searchClients",
    description: "Search for client sites by name. Clients are physical locations/sites where robots operate. NOT the same as operators.",
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
    description: "Get detailed information about a specific client/site including location, operators, and operating hours",
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
    description: "List all client sites with optional active/inactive filter. Clients are physical locations, NOT operators.",
    parameters: {
      type: "object",
      properties: {
        isActive: {
          type: "boolean",
          description: "Filter by active status (true=active, false=inactive)"
        }
      }
    }
  },

  // ============== ROBOT FUNCTIONS ==============
  {
    name: "searchRobots",
    description: "Search for robots by name or ID (e.g., 'MMR-31', 'robot 31')",
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
    description: "Get comprehensive details about a robot including battery, status, location, assigned operator, and maintenance info",
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
  },

  // ============== MISSION FUNCTIONS ==============
  {
    name: "executeRobotMission",
    description: "Execute a mission on a specific robot. Requires robot name/ID, pathmap name, and mission name.",
    parameters: {
      type: "object",
      properties: {
        robotId: {
          type: "string",
          description: "Robot ID or name (e.g., 'MMR-31')"
        },
        pathMapName: {
          type: "string",
          description: "PathMap name (e.g., 'office-1', 'warehouse')"
        },
        missionName: {
          type: "string",
          description: "Mission name (e.g., 'kitchen', 'dispenser')"
        }
      },
      required: ["robotId", "pathMapName", "missionName"]
    }
  },
  {
    name: "selectDisambiguationChoice",
    description: "Select a specific option from disambiguation choices when multiple matches were found. Use when user says a number (e.g., '1', 'number 2') or specific name after being presented with options.",
    parameters: {
      type: "object",
      properties: {
        choice: {
          type: "string",
          description: "User's choice - can be a number (e.g., '1', '2') or the exact name/ID from the options"
        },
        disambiguationType: {
          type: "string",
          enum: ["robot", "pathmap", "mission"],
          description: "What type of disambiguation this is for"
        },
        robotId: {
          type: "string",
          description: "Robot ID (required if disambiguationType is 'pathmap' or 'mission')"
        },
        pathmapId: {
          type: "string",
          description: "Pathmap ID (required if disambiguationType is 'mission')"
        },
        pathMapName: {
          type: "string",
          description: "PathMap name (required if disambiguationType is 'robot')"
        },
        missionName: {
          type: "string",
          description: "Mission name (required if disambiguationType is 'pathmap' or 'robot')"
        }
      },
      required: ["choice", "disambiguationType"]
    }
  },
  {
    name: "abortRobotMission",
    description: "Abort the currently running mission on a robot",
    parameters: {
      type: "object",
      properties: {
        robotId: {
          type: "string",
          description: "Robot ID or name"
        }
      },
      required: ["robotId"]
    }
  },
  {
    name: "getRobotMissionStatus",
    description: "Get the current mission status of a robot",
    parameters: {
      type: "object",
      properties: {
        robotId: {
          type: "string",
          description: "Robot ID or name"
        }
      },
      required: ["robotId"]
    }
  },

  // ============== PATHMAP FUNCTIONS ==============
  {
    name: "listPathMaps",
    description: "List all available pathmaps with their missions",
    parameters: {
      type: "object",
      properties: {
        frame: {
          type: "string",
          enum: ["utm", "odom", "lidar"],
          description: "Filter by frame type"
        }
      }
    }
  },
  {
    name: "getPathMapDetails",
    description: "Get details about a specific pathmap including all missions and stations",
    parameters: {
      type: "object",
      properties: {
        pathMapId: {
          type: "string",
          description: "PathMap ID or name"
        }
      },
      required: ["pathMapId"]
    }
  },
  {
    name: "getMissionsInPathMap",
    description: "Get all missions available in a specific pathmap",
    parameters: {
      type: "object",
      properties: {
        pathMapName: {
          type: "string",
          description: "PathMap name"
        }
      },
      required: ["pathMapName"]
    }
  },

  // ============== ANALYTICS FUNCTIONS ==============
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

  // ============== FLEET FUNCTIONS ==============
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
  },

  // ============== NAVIGATION FUNCTIONS ==============
  {
    name: "navigateToPage",
    description: "Navigate user to a specific page in the application. Use this when user asks to 'show', 'open', or 'navigate to' something. For analytics pages, you can include filters like client name, robot name, date range, product, etc.",
    parameters: {
      type: "object",
      properties: {
        page: {
          type: "string",
          enum: [
            "operators",
            "operator_profile",
            "clients",
            "client_profile",
            "robots",
            "robot_profile",
            "dashboard",
            "analytics",
            "pathmaps",
            "inventory",
            "shipping",
            "qc_submissions",
            "master_data",
            "leads",
            "lead_profile",
            "lead_edit",
            "add_lead",
            "leads_analytics",
            "issues"
          ],
          description: "The page to navigate to. Use 'leads' for list, 'lead_profile' for details, 'lead_edit' to edit, 'add_lead' to create new, 'leads_analytics' for analytics"
        },
        id: {
          type: "string",
          description: "Optional: Entity ID for profile/edit pages (e.g., operator ID, robot ID, lead ID)"
        },
        highlightElements: {
          type: "array",
          items: { type: "string" },
          description: "CSS selectors or data attributes of elements to highlight"
        },
        clientName: {
          type: "string",
          description: "Optional: Client name for analytics page filtering (e.g., 'Nandi Housing', 'ABC Factory')"
        },
        robotName: {
          type: "string",
          description: "Optional: Robot name for analytics page filtering (e.g., 'MMR-31')"
        },
        startDate: {
          type: "string",
          description: "Optional: Start date for analytics filtering. Can be natural language (e.g., 'feb 1st', 'january 1st 2024', 'today') or ISO format"
        },
        endDate: {
          type: "string",
          description: "Optional: End date for analytics filtering. Can be natural language (e.g., 'today', 'march 31st') or ISO format"
        },
        product: {
          type: "string",
          enum: ["MMR rental", "MMR otb", "LM", "Autonomy", "Projects"],
          description: "Optional: Product filter for leads analytics page"
        }
      },
      required: ["page"]
    }
  },

  // ============== ISSUE MANAGEMENT FUNCTIONS ==============
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
  },

  // ============== LEADS (CRM) FUNCTIONS ==============
  {
    name: "searchLeads",
    description: "Search and filter leads (CRM) by various criteria. Use for queries like 'show leads', 'find leads in stage 3', 'leads for MMR rental', etc.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for company name or POC name"
        },
        stage: {
          type: "number",
          description: "Filter by stage number (1-7 for L1-L7)"
        },
        product: {
          type: "string",
          enum: ["MMR rental", "MMR otb", "LM", "Autonomy", "Projects"],
          description: "Filter by product type"
        },
        pipelineStage: {
          type: "string",
          enum: ["Cold", "Warm", "Hot", "Negotiation"],
          description: "Filter by pipeline stage"
        },
        source: {
          type: "string",
          description: "Filter by lead source"
        },
        category: {
          type: "string",
          description: "Filter by lead category"
        },
        city: {
          type: "string",
          description: "Filter by city/location"
        }
      }
    }
  },

  {
    name: "getLeadDetails",
    description: "Get detailed information about a specific lead including POC, company, ACV/TCV, responses, next steps, and close plan",
    parameters: {
      type: "object",
      properties: {
        leadId: {
          type: "string",
          description: "Lead ID or company name"
        }
      },
      required: ["leadId"]
    }
  },

  {
    name: "getLeadsByStage",
    description: "Get all leads in a specific stage (L1-L7)",
    parameters: {
      type: "object",
      properties: {
        stage: {
          type: "number",
          description: "Stage number (1-7 for L1-L7)"
        }
      },
      required: ["stage"]
    }
  },

  {
    name: "getLeadsByProduct",
    description: "Get all leads for a specific product type",
    parameters: {
      type: "object",
      properties: {
        product: {
          type: "string",
          enum: ["MMR rental", "MMR otb", "LM", "Autonomy", "Projects"],
          description: "Product type"
        }
      },
      required: ["product"]
    }
  },

  {
    name: "getTotalACV",
    description: "Calculate total Annual Contract Value (ACV) in Indian Rupees (₹) with optional filters. Returns totalACV, averageACV, and top leads by value.",
    parameters: {
      type: "object",
      properties: {
        stage: {
          type: "number",
          description: "Optional: Filter by stage (1-7)"
        },
        product: {
          type: "string",
          description: "Optional: Filter by product"
        },
        pipelineStage: {
          type: "string",
          description: "Optional: Filter by pipeline stage (Cold, Warm, Hot, Negotiation)"
        }
      }
    }
  },

  {
    name: "getTotalTCV",
    description: "Calculate total Total Contract Value (TCV) in Indian Rupees (₹) with optional filters. Returns totalTCV, averageTCV, and top leads by value.",
    parameters: {
      type: "object",
      properties: {
        stage: {
          type: "number",
          description: "Optional: Filter by stage (1-7)"
        },
        product: {
          type: "string",
          description: "Optional: Filter by product"
        },
        pipelineStage: {
          type: "string",
          description: "Optional: Filter by pipeline stage (Cold, Warm, Hot, Negotiation)"
        }
      }
    }
  },

  // ============== INVENTORY MANAGEMENT FUNCTIONS ==============
  {
    name: "listInventory",
    description: "List inventory items with optional filters. Use for queries like 'which items are low stock?', 'show electronics inventory', 'list all mechanical parts', etc.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["mechanical", "electronics"],
          description: "Filter by item category"
        },
        lowStock: {
          type: "boolean",
          description: "Filter for low stock items only (quantity <= minStockLevel)"
        }
      }
    }
  },

  {
    name: "searchInventory",
    description: "Search inventory items by name with optional filters",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for item name"
        },
        category: {
          type: "string",
          enum: ["mechanical", "electronics"],
          description: "Optional: Filter by category"
        },
        lowStock: {
          type: "boolean",
          description: "Optional: Filter for low stock items only"
        }
      },
      required: ["query"]
    }
  },

  // ============== SHIPPING MANAGEMENT FUNCTIONS ==============
  {
    name: "listShipments",
    description: "List shipments with optional filters. Use for queries like 'show recent shipments', 'list robot shipments in transit', 'show delivered miscellaneous shipments', etc.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["robot", "miscellaneous"],
          description: "Filter by shipment type"
        },
        status: {
          type: "string",
          enum: ["in-transit", "delivered", "cancelled"],
          description: "Filter by shipment status"
        },
        dateFrom: {
          type: "string",
          description: "Start date for filtering (ISO string or natural language)"
        },
        dateTo: {
          type: "string",
          description: "End date for filtering (ISO string)"
        }
      }
    }
  },

  // ============== OVERTIME MANAGEMENT FUNCTIONS ==============
  {
    name: "listOvertimeRequests",
    description: "List overtime requests with optional filters. Use for queries like 'show pending overtime requests', 'who worked overtime this week?', 'list approved overtime for operator X', etc.",
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
          description: "Start date for filtering (ISO string or natural language like 'today', 'yesterday')"
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
  },

  // ============== TRIP/SESSION ANALYTICS FUNCTIONS ==============
  {
    name: "getTripStats",
    description: "Get real trip statistics from AppData timeseries collection. Use for queries like 'total trips for MMR-31 this month', 'trip count today', 'how many trips yesterday?', etc.",
    parameters: {
      type: "object",
      properties: {
        robotId: {
          type: "string",
          description: "Optional: Filter by specific robot (use robot name like 'MMR-31')"
        },
        period: {
          type: "string",
          enum: ["today", "yesterday", "thisWeek", "lastWeek", "thisMonth", "lastMonth"],
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
  }
];

// ============== FUNCTION IMPLEMENTATIONS ==============

export class AIAgentFunctions {
  private req: Request;

  constructor(req: Request) {
    this.req = req;
  }

  // Operator Functions
  async searchOperators(args: { query: string }) {
    const operators = await appUserModel.find({
      $or: [
        { name: { $regex: args.query, $options: "i" } },
        { phoneNumber: { $regex: args.query } }
      ]
    }).limit(10).select("id name phoneNumber");

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
    const assignedRobots = await robotModel.find({
      activeOperator: args.operatorId
    }).select("id name status");

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

    const operators = await appUserModel.find(query).select("id name phoneNumber");

    return {
      success: true,
      count: operators.length,
      operators: operators
    };
  }

  // Client Functions
  async searchClients(args: { query: string }) {
    const clients = await clientModel.find({
      name: { $regex: args.query, $options: "i" }
    }).limit(10).select("id name isActive location");

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
    const client = await clientModel.findById(args.clientId)
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

    const clients = await clientModel.find(query)
      .select("id name isActive location operatingHours");

    return {
      success: true,
      count: clients.length,
      clients: clients
    };
  }

  // ============================================================================
  // ROBOT NORMALIZATION HELPER
  // Handles: "MMR-31", "MMR 31", "MMR_31", "mmr31", "robot 31", "31" -> finds MMR-31
  // ============================================================================
  private normalizeRobotQuery(query: string): string[] {
    const normalized = query.trim().toLowerCase();
    const variations: string[] = [];

    // Pattern 1: "robot 31" or "robot31" -> Extract number
    const robotMatch = normalized.match(/robot\s*(\d+)/);
    if (robotMatch) {
      const num = robotMatch[1];
      variations.push(`mmr-${num}`);  // "robot 31" -> "mmr-31"
      variations.push(`mmr_${num}`);  // "robot 31" -> "mmr_31"
      variations.push(`mmr ${num}`);  // "robot 31" -> "mmr 31"
      variations.push(`mmr${num}`);   // "robot 31" -> "mmr31"
    }

    // Pattern 2: "MMR 31" or "MMR31" -> Normalize to all variations
    const mmrMatch = normalized.match(/mmr[\s_-]?(\d+)/);
    if (mmrMatch) {
      const num = mmrMatch[1];
      variations.push(`mmr-${num}`);  // "mmr 31" -> "mmr-31"
      variations.push(`mmr_${num}`);  // "mmr 31" -> "mmr_31"
      variations.push(`mmr ${num}`);  // "mmr 31" -> "mmr 31"
      variations.push(`mmr${num}`);   // "mmr 31" -> "mmr31"
    }

    // Pattern 3: Just a number "31" -> Try all MMR variations
    if (/^\d+$/.test(normalized)) {
      variations.push(`mmr-${normalized}`);  // "31" -> "mmr-31"
      variations.push(`mmr_${normalized}`);  // "31" -> "mmr_31"
      variations.push(`mmr ${normalized}`);  // "31" -> "mmr 31"
      variations.push(`mmr${normalized}`);   // "31" -> "mmr31"
    }

    // Pattern 4: Already contains separator -> Keep as-is and add variations
    if (normalized.includes('-') || normalized.includes('_')) {
      variations.push(normalized);
      // Also add other separator variations
      const base = normalized.split(/[-_]/)[0];
      const num = normalized.split(/[-_]/)[1];
      if (base && num) {
        variations.push(`${base}-${num}`);
        variations.push(`${base}_${num}`);
        variations.push(`${base} ${num}`);
        variations.push(`${base}${num}`);
      }
    }

    // Pattern 5: No pattern matched, use original query
    if (variations.length === 0) {
      variations.push(normalized);
    }

    return variations;
  }

  // Robot scoring (similar to pathmap scoring)
  // NOTE: robotName is the human-readable name like "MMR-31", not the UUID _id
  private scoreRobotMatch(query: string, robotName: string): number {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedName = robotName.trim().toLowerCase();

    // Exact match = 100 points
    if (normalizedName === normalizedQuery) {
      return 100;
    }

    // Exact match ignoring separators = 95 points
    const queryNoSep = normalizedQuery.replace(/[-_\s]/g, '');
    const nameNoSep = normalizedName.replace(/[-_\s]/g, '');
    if (nameNoSep === queryNoSep) {
      return 95;
    }

    // Starts with query = 90 points
    if (normalizedName.startsWith(normalizedQuery)) {
      return 90;
    }

    // Contains query = 70 points
    if (normalizedName.includes(normalizedQuery)) {
      return 70;
    }

    return 0;
  }

  private async findRobotsWithScoring(query: string): Promise<Array<{ robot: any; score: number }>> {
    const variations = this.normalizeRobotQuery(query);

    console.log(`[AI Agent] Robot search variations:`, variations);

    // Build OR conditions for all variations
    // NOTE: _id contains UUIDs, not robot names. Robot names are in the `name` field.
    const orConditions = variations.flatMap(variation => [
      { name: { $regex: new RegExp(`^${variation}$`, "i") } },  // Exact name match
      { name: { $regex: new RegExp(variation, "i") } }           // Contains name match
    ]);

    const allMatches = await robotModel.find({
      $or: orConditions
    }).select("id name status robotType fleet").limit(20);

    console.log(`[AI Agent] Found ${allMatches.length} robot candidates`);

    // Score each match - use name field, not _id (which is a UUID)
    const scoredMatches = allMatches.map(robot => ({
      robot: robot,
      score: this.scoreRobotMatch(query, robot.name || robot._id)
    }));

    // Sort by score descending
    scoredMatches.sort((a, b) => b.score - a.score);

    // Filter out very low scores (< 50)
    const goodMatches = scoredMatches.filter(m => m.score >= 50);

    console.log(`[AI Agent] Good matches (score >= 50):`,
      goodMatches.map(m => `${m.robot._id} (${m.score})`));

    return goodMatches;
  }

  // Robot Functions
  async searchRobots(args: { query: string }) {
    const searchVariations = this.normalizeRobotQuery(args.query);

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
    const searchVariations = this.normalizeRobotQuery(args.robotId);

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
        id: robot.id,
        name: robot.name,
        status: robot.status,
        robotType: robot.robotType,
        fleet: robot.fleet,
        macAddress: robot.macAddress,
        lastMaintenance: robot.maintenance?.lastMaintenance,
        assignedOperator: assignedOperator,
        location: robot.gps
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

  // ============================================================================
  // PATHMAP & MISSION NORMALIZATION HELPERS
  // ============================================================================
  private normalizePathMapQuery(query: string): string[] {
    const normalized = query.trim().toLowerCase();
    const variations: string[] = [];

    // Add original query
    variations.push(normalized);

    // Handle "office" vs "office-1" vs "office 1"
    // If ends with number, try both hyphenated and space versions
    const matchNum = normalized.match(/^(.+?)[\s-]?(\d+)$/);
    if (matchNum) {
      const [, base, num] = matchNum;
      variations.push(`${base}-${num}`);  // "office 1" -> "office-1"
      variations.push(`${base} ${num}`);  // "office-1" -> "office 1"
      variations.push(`${base}${num}`);   // "office-1" -> "office1"
      variations.push(base);              // "office-1" -> "office"
    }

    // Handle "the office" -> "office"
    if (normalized.startsWith('the ')) {
      variations.push(normalized.substring(4));
    }

    // Add variations with common separators
    // "office map" -> "officemap", "office_map", "office-map"
    if (normalized.includes(' ') && !normalized.match(/\d+$/)) {
      variations.push(normalized.replace(/\s+/g, ''));       // "office map" -> "officemap"
      variations.push(normalized.replace(/\s+/g, '_'));      // "office map" -> "office_map"
      variations.push(normalized.replace(/\s+/g, '-'));      // "office map" -> "office-map"
    }

    return variations;
  }

  // ============================================================================
  // PATHMAP SCORING & DISAMBIGUATION
  // ============================================================================
  private scorePathmapMatch(query: string, pathmapName: string): number {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedName = pathmapName.trim().toLowerCase();

    // Exact match = 100 points
    if (normalizedName === normalizedQuery) {
      return 100;
    }

    // Exact match ignoring separators = 95 points
    const queryNoSep = normalizedQuery.replace(/[-_\s]/g, '');
    const nameNoSep = normalizedName.replace(/[-_\s]/g, '');
    if (nameNoSep === queryNoSep) {
      return 95;
    }

    // Starts with query = 90 points
    if (normalizedName.startsWith(normalizedQuery)) {
      return 90;
    }

    // Contains query = 70 points
    if (normalizedName.includes(normalizedQuery)) {
      return 70;
    }

    // Partial word match = 60 points
    const queryWords = normalizedQuery.split(/[-_\s]+/);
    const nameWords = normalizedName.split(/[-_\s]+/);
    const matchingWords = queryWords.filter(qw => nameWords.some(nw => nw === qw));
    if (matchingWords.length > 0) {
      return 50 + (matchingWords.length / queryWords.length) * 20;
    }

    return 0;
  }

  private async findPathmapsWithScoring(query: string): Promise<Array<{ pathmap: any; score: number }>> {
    const variations = this.normalizePathMapQuery(query);

    console.log(`[AI Agent] Pathmap search variations:`, variations);

    // Build OR conditions for all variations
    const orConditions = variations.flatMap(variation => [
      { name: { $regex: new RegExp(`^${variation}$`, "i") } },  // Exact match
      { name: { $regex: new RegExp(variation, "i") } }           // Contains match
    ]);

    const allMatches = await pathMapModel.find({
      $or: orConditions
    }).select("id name frame missions").limit(20);

    console.log(`[AI Agent] Found ${allMatches.length} pathmap candidates`);

    // Score each match
    const scoredMatches = allMatches.map(pm => ({
      pathmap: pm,
      score: this.scorePathmapMatch(query, pm.name)
    }));

    // Sort by score descending
    scoredMatches.sort((a, b) => b.score - a.score);

    // Filter out very low scores (< 50)
    const goodMatches = scoredMatches.filter(m => m.score >= 50);

    console.log(`[AI Agent] Good matches (score >= 50):`,
      goodMatches.map(m => `${m.pathmap.name} (${m.score})`));

    return goodMatches;
  }

  private normalizeMissionQuery(query: string): string[] {
    const normalized = query.trim().toLowerCase();
    const variations: string[] = [];

    // Add original query
    variations.push(normalized);

    // Handle "the kitchen" -> "kitchen"
    if (normalized.startsWith('the ')) {
      variations.push(normalized.substring(4));
    }

    // Handle "to kitchen" -> "kitchen"
    if (normalized.startsWith('to ')) {
      variations.push(normalized.substring(3));
    }

    return variations;
  }

  // Mission Functions
  async executeRobotMission(args: { robotId: string; pathMapName: string; missionName: string }) {
    console.log(`[AI Agent] Executing mission:`, args);

    // Step 1: Find robots with scoring
    const robotMatches = await this.findRobotsWithScoring(args.robotId);

    // No robot matches found
    if (robotMatches.length === 0) {
      console.log(`[AI Agent] No robots found for: "${args.robotId}"`);
      return {
        success: false,
        error: `No robot found matching "${args.robotId}". Please check the robot ID or name.`
      };
    }

    // Check if query is a partial prefix match (forces disambiguation)
    const isPartialPrefix = robotMatches.length > 1 && robotMatches.some(m => {
      const robotId = m.robot._id.toLowerCase();
      const queryLower = args.robotId.toLowerCase();
      // If robot ID starts with query but is longer, it's a partial match
      return robotId.startsWith(queryLower) && robotId !== queryLower;
    });

    // Multiple robot matches - need disambiguation (more aggressive thresholds)
    if (robotMatches.length > 1 &&
        (isPartialPrefix || robotMatches[0].score < 98 || robotMatches[0].score - robotMatches[1].score < 30)) {
      console.log(`[AI Agent] Multiple robot matches found - disambiguation needed` +
        (isPartialPrefix ? ' (partial prefix match detected)' : ''));

      return {
        success: false,
        needsDisambiguation: true,
        disambiguationType: "robot",
        query: args.robotId,
        pathMapName: args.pathMapName,
        missionName: args.missionName,
        options: robotMatches.slice(0, 5).map((match, index) => ({
          number: index + 1,
          id: match.robot._id,
          name: match.robot.name,
          status: match.robot.status,
          robotType: match.robot.robotType,
          score: match.score
        })),
        message: `I found ${robotMatches.length} robots matching "${args.robotId}". Please choose one:\n\n${robotMatches.slice(0, 5).map((m, i) => `${i + 1}. ${m.robot._id} (${m.robot.robotType}, status: ${m.robot.status})`).join('\n')}\n\nSay the number or full robot ID.`
      };
    }

    // Single high-confidence match - use it
    const robot = robotMatches[0].robot;
    console.log(`[AI Agent] Auto-selected robot: ${robot._id} (score: ${robotMatches[0].score})`);

    // Step 2: Validate robot is autonomous
    if (robot.robotType !== "autonomous") {
      console.log(`[AI Agent] Robot ${robot._id} is ${robot.robotType}, not autonomous`);
      return {
        success: false,
        error: `Robot ${robot.name} is a ${robot.robotType} robot. Voice mission commands only work for autonomous robots.`,
        robot: {
          id: robot._id,
          name: robot.name,
          robotType: robot.robotType
        }
      };
    }

    // Step 3: Find pathmaps with scoring
    const pathmapMatches = await this.findPathmapsWithScoring(args.pathMapName);

    // No matches found
    if (pathmapMatches.length === 0) {
      console.log(`[AI Agent] No pathmaps found for: "${args.pathMapName}"`);
      const availablePathMaps = await pathMapModel.find({}).select("name").limit(10);

      return {
        success: false,
        error: `No pathmap found matching "${args.pathMapName}".`,
        availablePathMaps: availablePathMaps.map(pm => pm.name),
        suggestion: `Available paths: ${availablePathMaps.map(pm => pm.name).join(', ')}`
      };
    }

    // Check if query is a partial prefix match (forces disambiguation)
    const isPathmapPartialPrefix = pathmapMatches.length > 1 && pathmapMatches.some(m => {
      const pathmapName = m.pathmap.name.toLowerCase();
      const queryLower = args.pathMapName.toLowerCase();
      // If pathmap name starts with query but is longer, it's a partial match
      return pathmapName.startsWith(queryLower) && pathmapName !== queryLower;
    });

    // Single high-confidence match - auto-select (more aggressive thresholds)
    if (pathmapMatches.length === 1 ||
        (!isPathmapPartialPrefix && pathmapMatches[0].score >= 98 && pathmapMatches[0].score - pathmapMatches[1]?.score >= 30)) {
      const pathMap = pathmapMatches[0].pathmap;
      console.log(`[AI Agent] Auto-selected pathmap: ${pathMap.name} (score: ${pathmapMatches[0].score})`);

      // Find mission in the selected pathmap
      return await this.findAndExecuteMission(robot, pathMap, args.missionName);
    }

    // Multiple good matches - need disambiguation
    console.log(`[AI Agent] Multiple pathmap matches found - disambiguation needed` +
      (isPathmapPartialPrefix ? ' (partial prefix match detected)' : ''));

    return {
      success: false,
      needsDisambiguation: true,
      disambiguationType: "pathmap",
      query: args.pathMapName,
      robot: {
        id: robot.id,
        name: robot.name
      },
      missionName: args.missionName,
      options: pathmapMatches.slice(0, 8).map((match, index) => ({
        number: index + 1,
        name: match.pathmap.name,
        id: match.pathmap.id,
        score: match.score,
        missionsCount: match.pathmap.missions?.length || 0
      })),
      message: `I found ${pathmapMatches.length} paths matching "${args.pathMapName}". Please choose one:\n\n${pathmapMatches.slice(0, 8).map((m, i) => `${i + 1}. ${m.pathmap.name}`).join('\n')}\n\nSay the number or full path name.`
    };
  }

  // Helper function to find and execute mission in a pathmap
  private async findAndExecuteMission(robot: any, pathMap: any, missionName: string) {
    const missionVariations = this.normalizeMissionQuery(missionName);
    console.log(`[AI Agent] Mission search variations:`, missionVariations);

    let mission = null;
    for (const variation of missionVariations) {
      mission = pathMap.missions.find((m: any) =>
        m.name.toLowerCase() === variation
      );
      if (mission) {
        console.log(`[AI Agent] Found mission "${mission.name}" using variation: "${variation}"`);
        break;
      }
    }

    if (!mission) {
      console.log(`[AI Agent] Mission not found for: "${missionName}"`);
      const availableMissions = pathMap.missions.map((m: any) => m.name);

      // Check if there are similar missions
      const similarMissions = availableMissions.filter((m: string) =>
        m.toLowerCase().includes(missionName.toLowerCase()) ||
        missionName.toLowerCase().includes(m.toLowerCase())
      );

      if (similarMissions.length > 1) {
        // Multiple similar missions - need disambiguation
        return {
          success: false,
          needsDisambiguation: true,
          disambiguationType: "mission",
          query: missionName,
          pathMap: {
            id: pathMap.id,
            name: pathMap.name
          },
          robot: {
            id: robot.id,
            name: robot.name
          },
          options: similarMissions.map((name: string, index: number) => ({
            number: index + 1,
            name: name
          })),
          message: `I found ${similarMissions.length} missions matching "${missionName}" in "${pathMap.name}". Please choose one:\n\n${similarMissions.map((m: string, i: number) => `${i + 1}. ${m}`).join('\n')}\n\nSay the number or full mission name.`
        };
      }

      return {
        success: false,
        error: `Mission "${missionName}" not found in PathMap "${pathMap.name}".`,
        searchedVariations: missionVariations,
        availableMissions: availableMissions,
        suggestion: `Available missions in ${pathMap.name}: ${availableMissions.join(', ')}`
      };
    }

    // Success! Mission found
    console.log(`[AI Agent] Mission execution ready:`, {
      robot: robot._id,
      pathMap: pathMap.name,
      mission: mission.name
    });

    return {
      success: true,
      action: "execute_mission",
      robot: {
        id: robot.id,
        name: robot.name,
        robotType: robot.robotType
      },
      pathMap: {
        id: pathMap.id,
        name: pathMap.name,
        frame: pathMap.frame
      },
      mission: {
        id: mission._id,
        name: mission.name,
        pathsCount: mission.mission?.length || 0
      },
      message: `Mission "${mission.name}" in "${pathMap.name}" is ready to execute on ${robot.name}`
    };
  }

  // Disambiguation choice handler
  async selectDisambiguationChoice(args: {
    choice: string;
    disambiguationType: string;
    robotId?: string;
    pathmapId?: string;
    pathMapName?: string;
    missionName?: string;
  }) {
    console.log(`[AI Agent] Handling disambiguation choice:`, args);

    if (args.disambiguationType === "robot") {
      // User is choosing a robot
      const choiceNumber = parseInt(args.choice);
      let selectedRobot;

      if (!isNaN(choiceNumber)) {
        // User said a number - search again and get Nth result
        const robotMatches = await this.findRobotsWithScoring(args.choice);
        if (choiceNumber > 0 && choiceNumber <= robotMatches.length) {
          selectedRobot = robotMatches[choiceNumber - 1].robot;
        }
      } else {
        // User said the exact robot ID/name
        // NOTE: _id contains UUIDs, not robot names. Robot names are in the `name` field.
        selectedRobot = await robotModel.findOne({
          name: { $regex: new RegExp(`^${args.choice}$`, "i") }
        });
      }

      if (!selectedRobot) {
        return {
          success: false,
          error: `Could not find robot with choice: "${args.choice}"`
        };
      }

      console.log(`[AI Agent] User selected robot: ${selectedRobot._id}`);

      // Now execute mission with selected robot
      return await this.executeRobotMission({
        robotId: selectedRobot._id,
        pathMapName: args.pathMapName!,
        missionName: args.missionName!
      });
    }

    // Get robot for pathmap/mission disambiguation
    const robot = await robotModel.findById(args.robotId);
    if (!robot) {
      return {
        success: false,
        error: `Robot not found with ID: ${args.robotId}`
      };
    }

    if (args.disambiguationType === "pathmap") {
      // User is choosing a pathmap
      const choiceNumber = parseInt(args.choice);
      let selectedPathmap;

      if (!isNaN(choiceNumber)) {
        // User said a number like "1" or "2"
        // We need to search again and get the Nth result
        const pathmapMatches = await this.findPathmapsWithScoring(args.choice);
        if (choiceNumber > 0 && choiceNumber <= pathmapMatches.length) {
          selectedPathmap = pathmapMatches[choiceNumber - 1].pathmap;
        }
      } else {
        // User said the exact name
        selectedPathmap = await pathMapModel.findOne({
          name: { $regex: new RegExp(`^${args.choice}$`, "i") }
        });
      }

      if (!selectedPathmap) {
        return {
          success: false,
          error: `Could not find pathmap with choice: "${args.choice}"`
        };
      }

      console.log(`[AI Agent] User selected pathmap: ${selectedPathmap.name}`);

      // Now execute the mission with the selected pathmap
      return await this.findAndExecuteMission(robot, selectedPathmap, args.missionName!);

    } else if (args.disambiguationType === "mission") {
      // User is choosing a mission from a pathmap
      const pathMap = await pathMapModel.findById(args.pathmapId);
      if (!pathMap) {
        return {
          success: false,
          error: `Pathmap not found with ID: ${args.pathmapId}`
        };
      }

      const choiceNumber = parseInt(args.choice);
      let selectedMission;

      if (!isNaN(choiceNumber)) {
        // User said a number
        const missions = pathMap.missions;
        if (choiceNumber > 0 && choiceNumber <= missions.length) {
          selectedMission = missions[choiceNumber - 1];
        }
      } else {
        // User said the exact mission name
        selectedMission = pathMap.missions.find((m: any) =>
          m.name.toLowerCase() === args.choice.toLowerCase()
        );
      }

      if (!selectedMission) {
        return {
          success: false,
          error: `Could not find mission with choice: "${args.choice}"`
        };
      }

      console.log(`[AI Agent] User selected mission: ${selectedMission.name}`);

      // Execute the mission
      return {
        success: true,
        action: "execute_mission",
        robot: {
          id: robot.id,
          name: robot.name,
          robotType: robot.robotType
        },
        pathMap: {
          id: pathMap.id,
          name: pathMap.name,
          frame: pathMap.frame
        },
        mission: {
          id: (selectedMission as any)._id,
          name: selectedMission.name,
          pathsCount: (selectedMission as any).mission?.length || 0
        },
        message: `Mission "${selectedMission.name}" in "${pathMap.name}" is ready to execute on ${robot.name}`
      };
    }

    return {
      success: false,
      error: `Invalid disambiguation type: ${args.disambiguationType}`
    };
  }

  async abortRobotMission(args: { robotId: string }) {
    const robotVariations = this.normalizeRobotQuery(args.robotId);
    console.log(`[AI Agent] Aborting mission for robot: "${args.robotId}"`);
    console.log(`[AI Agent] Robot search variations:`, robotVariations);

    // NOTE: _id contains UUIDs, not robot names. Robot names are in the `name` field.
    const robotOrConditions = robotVariations.flatMap(variation => [
      { name: { $regex: new RegExp(`^${variation}$`, "i") } },
      { name: { $regex: new RegExp(variation, "i") } }
    ]);

    const robot = await robotModel.findOne({
      $or: robotOrConditions
    }).select("id name status robotType");

    if (!robot) {
      return {
        success: false,
        error: `Robot "${args.robotId}" not found`,
        searchedVariations: robotVariations
      };
    }

    console.log(`[AI Agent] Abort command for robot: ${robot._id}`);

    return {
      success: true,
      action: "abort_mission",
      robot: {
        id: robot.id,
        name: robot.name,
        robotType: robot.robotType
      },
      message: `Abort command sent to ${robot.name}`
    };
  }

  async getRobotMissionStatus(args: { robotId: string }) {
    const robotVariations = this.normalizeRobotQuery(args.robotId);
    console.log(`[AI Agent] Getting mission status for: "${args.robotId}"`);
    console.log(`[AI Agent] Robot search variations:`, robotVariations);

    // NOTE: _id contains UUIDs, not robot names. Robot names are in the `name` field.
    const robotOrConditions = robotVariations.flatMap(variation => [
      { name: { $regex: new RegExp(`^${variation}$`, "i") } },
      { name: { $regex: new RegExp(variation, "i") } }
    ]);

    const robot = await robotModel.findOne({
      $or: robotOrConditions
    }).select("id name status robotType");

    if (!robot) {
      return {
        success: false,
        error: `Robot "${args.robotId}" not found`,
        searchedVariations: robotVariations
      };
    }

    console.log(`[AI Agent] Mission status for robot: ${robot._id}`);

    return {
      success: true,
      robot: {
        id: robot.id,
        name: robot.name,
        status: robot.status,
        robotType: robot.robotType,
        currentMission: robot.status === "active" ? "Mission in progress" : "No active mission"
      }
    };
  }

  // PathMap Functions
  async listPathMaps(args: { frame?: string }) {
    const query: any = {};
    if (args.frame) query.frame = args.frame;

    const pathMaps = await pathMapModel.find(query)
      .select("id name frame missions stations");

    return {
      success: true,
      count: pathMaps.length,
      pathMaps: pathMaps.map(pm => ({
        id: pm.id,
        name: pm.name,
        frame: pm.frame,
        missionsCount: pm.missions?.length || 0,
        stationsCount: pm.stations?.length || 0
      }))
    };
  }

  async getPathMapDetails(args: { pathMapId: string }) {
    const pathMap = await pathMapModel.findOne({
      $or: [
        { _id: args.pathMapId },
        { name: { $regex: args.pathMapId, $options: "i" } }
      ]
    });

    if (!pathMap) {
      return { success: false, error: "PathMap not found" };
    }

    return {
      success: true,
      pathMap: {
        id: pathMap.id,
        name: pathMap.name,
        frame: pathMap.frame,
        missions: pathMap.missions,
        stations: pathMap.stations
      }
    };
  }

  async getMissionsInPathMap(args: { pathMapName: string }) {
    const pathMap = await pathMapModel.findOne({
      name: { $regex: args.pathMapName, $options: "i" }
    }).select("name missions");

    if (!pathMap) {
      return { success: false, error: "PathMap not found" };
    }

    return {
      success: true,
      pathMapName: pathMap.name,
      missions: pathMap.missions.map((m: any) => ({
        id: m._id,
        name: m.name,
        pathsCount: m.mission?.length || 0
      }))
    };
  }

  // Analytics Functions
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

  // Fleet Functions
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

  // Navigation Functions
  async navigateToPage(args: {
    page: string;
    id?: string;
    highlightElements?: string[];
    clientName?: string;
    robotName?: string;
    startDate?: string;
    endDate?: string;
    product?: string;
  }) {
    const pageMap: Record<string, string> = {
      operators: "/operators",
      operator_profile: `/operators/${args.id}`,
      clients: "/clients",
      client_profile: `/clients/${args.id}`,
      robots: "/robots",
      robot_profile: `/robots/${args.id}`,
      dashboard: "/dashboard",
      analytics: "/analytics",
      pathmaps: "/pathmaps",
      inventory: "/inventory",
      shipping: "/shipping",
      qc_submissions: "/qc-submissions",
      master_data: "/master-data",
      leads: "/leads",
      lead_profile: `/leads/${args.id}`,
      lead_edit: `/leads/${args.id}/edit`,
      add_lead: "/leads/new",
      leads_analytics: "/leads/analytics",
      issues: "/issues"
    };

    const path = pageMap[args.page];

    if (!path) {
      return { success: false, error: `Unknown page: ${args.page}` };
    }

    // Build response object
    const response: any = {
      success: true,
      navigate: true,
      path: path,
      highlightElements: args.highlightElements || []
    };

    // For analytics page, include filter parameters
    if (args.page === "analytics") {
      const analyticsParams: any = {};

      // Add client name if provided
      if (args.clientName) {
        analyticsParams.clientName = args.clientName;
        console.log(`[AI Agent] Analytics navigation with client: "${args.clientName}"`);
      }

      // Add robot name if provided
      if (args.robotName) {
        analyticsParams.robotName = args.robotName;
        console.log(`[AI Agent] Analytics navigation with robot: "${args.robotName}"`);
      }

      // Parse and add start date if provided
      if (args.startDate) {
        const parsedStartDate = this.parseNaturalDate(args.startDate);
        if (parsedStartDate) {
          analyticsParams.startDate = parsedStartDate;
          console.log(`[AI Agent] Analytics start date: "${args.startDate}" -> ${parsedStartDate}`);
        } else {
          console.warn(`[AI Agent] Could not parse start date: "${args.startDate}"`);
        }
      }

      // Parse and add end date if provided
      if (args.endDate) {
        const parsedEndDate = this.parseNaturalDate(args.endDate);
        if (parsedEndDate) {
          analyticsParams.endDate = parsedEndDate;
          console.log(`[AI Agent] Analytics end date: "${args.endDate}" -> ${parsedEndDate}`);
        } else {
          console.warn(`[AI Agent] Could not parse end date: "${args.endDate}"`);
        }
      }

      // Add analytics params if any were provided
      if (Object.keys(analyticsParams).length > 0) {
        response.analyticsParams = analyticsParams;
      }
    }

    // For leads analytics page, include filter parameters
    if (args.page === "leads_analytics") {
      const leadsAnalyticsParams: any = {};

      // Add product filter if provided
      if (args.product) {
        leadsAnalyticsParams.product = args.product;
        console.log(`[AI Agent] Leads analytics navigation with product: "${args.product}"`);
      }

      // Parse and add start date if provided
      if (args.startDate) {
        const parsedStartDate = this.parseNaturalDate(args.startDate);
        if (parsedStartDate) {
          leadsAnalyticsParams.startDate = parsedStartDate;
          console.log(`[AI Agent] Leads analytics start date: "${args.startDate}" -> ${parsedStartDate}`);
        } else {
          console.warn(`[AI Agent] Could not parse start date: "${args.startDate}"`);
        }
      }

      // Parse and add end date if provided
      if (args.endDate) {
        const parsedEndDate = this.parseNaturalDate(args.endDate);
        if (parsedEndDate) {
          leadsAnalyticsParams.endDate = parsedEndDate;
          console.log(`[AI Agent] Leads analytics end date: "${args.endDate}" -> ${parsedEndDate}`);
        } else {
          console.warn(`[AI Agent] Could not parse end date: "${args.endDate}"`);
        }
      }

      // Add leads analytics params if any were provided
      if (Object.keys(leadsAnalyticsParams).length > 0) {
        response.leadsAnalyticsParams = leadsAnalyticsParams;
      }
    }

    return response;
  }

  // ============== DATE PARSING UTILITY ==============
  /**
   * Parse natural language dates to ISO format
   * Supports: "today", "yesterday", "feb 1st", "january 1st 2024", ISO dates
   */
  private parseNaturalDate(query: string): string | null {
    if (!query) return null;

    const normalized = query.trim().toLowerCase();
    const now = new Date();

    // Handle relative dates
    if (normalized === "today") {
      return now.toISOString();
    }

    if (normalized === "yesterday") {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString();
    }

    // Handle "N days ago"
    const daysAgoMatch = normalized.match(/(\d+)\s*days?\s*ago/);
    if (daysAgoMatch) {
      const daysAgo = parseInt(daysAgoMatch[1]);
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      return date.toISOString();
    }

    // Month name mapping
    const monthMap: { [key: string]: number } = {
      january: 0, jan: 0,
      february: 1, feb: 1,
      march: 2, mar: 2,
      april: 3, apr: 3,
      may: 4,
      june: 5, jun: 5,
      july: 6, jul: 6,
      august: 7, aug: 7,
      september: 8, sep: 8, sept: 8,
      october: 9, oct: 9,
      november: 10, nov: 10,
      december: 11, dec: 11
    };

    // Handle "feb 1st", "february 1", "feb 1st 2024"
    const monthDayYearMatch = normalized.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?$/);
    if (monthDayYearMatch) {
      const month = monthMap[monthDayYearMatch[1]];
      const day = parseInt(monthDayYearMatch[2]);
      const year = monthDayYearMatch[3] ? parseInt(monthDayYearMatch[3]) : now.getFullYear();

      if (month !== undefined && day >= 1 && day <= 31) {
        const date = new Date(year, month, day);
        return date.toISOString();
      }
    }

    // Handle "1st feb", "1 february 2024"
    const dayMonthYearMatch = normalized.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?$/);
    if (dayMonthYearMatch) {
      const day = parseInt(dayMonthYearMatch[1]);
      const month = monthMap[dayMonthYearMatch[2]];
      const year = dayMonthYearMatch[3] ? parseInt(dayMonthYearMatch[3]) : now.getFullYear();

      if (month !== undefined && day >= 1 && day <= 31) {
        const date = new Date(year, month, day);
        return date.toISOString();
      }
    }

    // Try parsing as ISO date or standard Date format
    const parsed = new Date(query);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }

    return null;
  }

  private parseDateQuery(query: string): { from: number; to: number } | null {
    const now = new Date();
    let from: Date;
    let to: Date;

    switch (query.toLowerCase()) {
      case "today":
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;

      case "yesterday":
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        from = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
        to = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
        break;

      case "thisweek":
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        from = new Date(now);
        from.setDate(now.getDate() + diffToMonday);
        from.setHours(0, 0, 0, 0);
        to = new Date(now);
        to.setDate(from.getDate() + 6);
        to.setHours(23, 59, 59, 999);
        break;

      case "lastweek":
        const lastWeekStart = new Date(now);
        const lastWeekDayOfWeek = now.getDay();
        const lastWeekDiffToMonday = lastWeekDayOfWeek === 0 ? -6 : 1 - lastWeekDayOfWeek;
        lastWeekStart.setDate(now.getDate() + lastWeekDiffToMonday - 7);
        lastWeekStart.setHours(0, 0, 0, 0);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        lastWeekEnd.setHours(23, 59, 59, 999);
        from = lastWeekStart;
        to = lastWeekEnd;
        break;

      case "thismonth":
        from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;

      case "lastmonth":
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;

      default:
        // Try parsing as ISO date
        const parsed = new Date(query);
        if (!isNaN(parsed.getTime())) {
          from = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0);
          to = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59);
        } else {
          return null;
        }
    }

    return {
      from: from.getTime(),
      to: to.getTime()
    };
  }

  // ============== ISSUE MANAGEMENT FUNCTIONS ==============
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
        const dateRange = this.parseDateQuery(args.dateFrom);
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
    const dateRange = this.parseDateQuery(args.period);

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

  // ============== LEADS (CRM) FUNCTIONS ==============

  async searchLeads(args: {
    query?: string;
    stage?: number;
    product?: string;
    pipelineStage?: string;
    source?: string;
    category?: string;
    city?: string;
  }) {
    const query: any = {};

    // Search by company name or POC name
    if (args.query) {
      query.$or = [
        { companyName: { $regex: args.query, $options: "i" } },
        { pocName: { $regex: args.query, $options: "i" } }
      ];
    }

    // Filter by stage
    if (args.stage) {
      query.stage = args.stage;
    }

    // Filter by product
    if (args.product) {
      query.product = args.product;
    }

    // Filter by pipeline stage
    if (args.pipelineStage) {
      query.pipelineStage = args.pipelineStage;
    }

    // Filter by source
    if (args.source) {
      query.source = { $regex: args.source, $options: "i" };
    }

    // Filter by category
    if (args.category) {
      query.category = { $regex: args.category, $options: "i" };
    }

    // Filter by city
    if (args.city) {
      query.city = { $regex: args.city, $options: "i" };
    }

    console.log(`[AI Agent] Searching leads with filters:`, args);

    const leads = await leadsModel
      .find(query)
      .select("id pocName companyName city stage product pipelineStage acv tcv robotCount")
      .sort({ dateAdded: -1 })
      .limit(50);

    return {
      success: true,
      count: leads.length,
      filters: args,
      leads: leads.map((lead: any) => ({
        id: lead.id,
        pocName: lead.pocName,
        companyName: lead.companyName,
        city: lead.city,
        stage: lead.stage,
        product: lead.product,
        pipelineStage: lead.pipelineStage,
        acv: lead.acv,
        tcv: lead.tcv,
        robotCount: lead.robotCount
      }))
    };
  }

  async getLeadDetails(args: { leadId: string }) {
    console.log(`[AI Agent] Getting lead details for: "${args.leadId}"`);

    // Try to find by ID first, then by company name
    const lead = await leadsModel.findOne({
      $or: [
        { _id: args.leadId },
        { companyName: { $regex: args.leadId, $options: "i" } }
      ]
    });

    if (!lead) {
      console.log(`[AI Agent] Lead not found for: "${args.leadId}"`);
      return {
        success: false,
        error: `Lead not found for "${args.leadId}". Please check the lead ID or company name.`
      };
    }

    console.log(`[AI Agent] Found lead: ${lead.companyName}`);

    return {
      success: true,
      lead: {
        id: lead.id,
        pocName: lead.pocName,
        companyName: lead.companyName,
        contact: lead.contact,
        phoneNumber: lead.phoneNumber,
        email: lead.email,
        designation: lead.designation,
        city: lead.city,
        stage: lead.stage,
        pipelineStage: lead.pipelineStage,
        product: lead.product,
        source: lead.source,
        category: lead.category,
        type: lead.type,
        acv: lead.acv,
        tcv: lead.tcv,
        robotCount: lead.robotCount,
        closePlan: lead.closePlan,
        accountNotes: lead.accountNotes,
        nextSteps: lead.nextSteps,
        responses: lead.responses,
        dateAdded: lead.dateAdded
      }
    };
  }

  async getLeadsByStage(args: { stage: number }) {
    console.log(`[AI Agent] Getting leads in stage ${args.stage}`);

    const leads = await leadsModel
      .find({ stage: args.stage })
      .select("id pocName companyName city product pipelineStage acv tcv robotCount")
      .sort({ dateAdded: -1 });

    return {
      success: true,
      stage: args.stage,
      count: leads.length,
      leads: leads.map((lead: any) => ({
        id: lead.id,
        pocName: lead.pocName,
        companyName: lead.companyName,
        city: lead.city,
        product: lead.product,
        pipelineStage: lead.pipelineStage,
        acv: lead.acv,
        tcv: lead.tcv,
        robotCount: lead.robotCount
      }))
    };
  }

  async getLeadsByProduct(args: { product: string }) {
    console.log(`[AI Agent] Getting leads for product: ${args.product}`);

    const leads = await leadsModel
      .find({ product: args.product })
      .select("id pocName companyName city stage pipelineStage acv tcv robotCount")
      .sort({ dateAdded: -1 });

    return {
      success: true,
      product: args.product,
      count: leads.length,
      leads: leads.map((lead: any) => ({
        id: lead.id,
        pocName: lead.pocName,
        companyName: lead.companyName,
        city: lead.city,
        stage: lead.stage,
        pipelineStage: lead.pipelineStage,
        acv: lead.acv,
        tcv: lead.tcv,
        robotCount: lead.robotCount
      }))
    };
  }

  async getTotalACV(args: { stage?: number; product?: string; pipelineStage?: string }) {
    const query: any = {};

    if (args.stage) query.stage = args.stage;
    if (args.product) query.product = args.product;
    if (args.pipelineStage) query.pipelineStage = args.pipelineStage;

    console.log(`[AI Agent] Calculating total ACV with filters:`, args);

    const leads = await leadsModel.find(query).select("acv companyName stage product");

    const totalACV = leads.reduce((sum, lead) => sum + (lead.acv || 0), 0);
    const avgACV = leads.length > 0 ? totalACV / leads.length : 0;

    return {
      success: true,
      filters: args,
      totalACV: totalACV,
      averageACV: avgACV,
      leadsCount: leads.length,
      topLeads: leads
        .filter(l => l.acv > 0)
        .sort((a, b) => (b.acv || 0) - (a.acv || 0))
        .slice(0, 5)
        .map(l => ({
          companyName: l.companyName,
          acv: l.acv,
          stage: l.stage,
          product: l.product
        }))
    };
  }

  async getTotalTCV(args: { stage?: number; product?: string; pipelineStage?: string }) {
    const query: any = {};

    if (args.stage) query.stage = args.stage;
    if (args.product) query.product = args.product;
    if (args.pipelineStage) query.pipelineStage = args.pipelineStage;

    console.log(`[AI Agent] Calculating total TCV with filters:`, args);

    const leads = await leadsModel.find(query).select("tcv companyName stage product");

    const totalTCV = leads.reduce((sum, lead) => sum + (lead.tcv || 0), 0);
    const avgTCV = leads.length > 0 ? totalTCV / leads.length : 0;

    return {
      success: true,
      filters: args,
      totalTCV: totalTCV,
      averageTCV: avgTCV,
      leadsCount: leads.length,
      topLeads: leads
        .filter(l => l.tcv > 0)
        .sort((a, b) => (b.tcv || 0) - (a.tcv || 0))
        .slice(0, 5)
        .map(l => ({
          companyName: l.companyName,
          tcv: l.tcv,
          stage: l.stage,
          product: l.product
        }))
    };
  }
}

// Execute a function by name
export async function executeFunctionCall(
  functionName: string,
  functionArgs: any,
  req: Request
): Promise<any> {
  const functions = new AIAgentFunctions(req);

  switch (functionName) {
    // Operators
    case "searchOperators":
      return await functions.searchOperators(functionArgs);
    case "getOperatorDetails":
      return await functions.getOperatorDetails(functionArgs);
    case "listOperators":
      return await functions.listOperators(functionArgs);

    // Clients
    case "searchClients":
      return await functions.searchClients(functionArgs);
    case "getClientDetails":
      return await functions.getClientDetails(functionArgs);
    case "listClients":
      return await functions.listClients(functionArgs);

    // Robots
    case "searchRobots":
      return await functions.searchRobots(functionArgs);
    case "getRobotDetails":
      return await functions.getRobotDetails(functionArgs);
    case "listRobots":
      return await functions.listRobots(functionArgs);
    case "getRobotsByStatus":
      return await functions.getRobotsByStatus();

    // Missions
    case "executeRobotMission":
      return await functions.executeRobotMission(functionArgs);
    case "selectDisambiguationChoice":
      return await functions.selectDisambiguationChoice(functionArgs);
    case "abortRobotMission":
      return await functions.abortRobotMission(functionArgs);
    case "getRobotMissionStatus":
      return await functions.getRobotMissionStatus(functionArgs);

    // PathMaps
    case "listPathMaps":
      return await functions.listPathMaps(functionArgs);
    case "getPathMapDetails":
      return await functions.getPathMapDetails(functionArgs);
    case "getMissionsInPathMap":
      return await functions.getMissionsInPathMap(functionArgs);

    // Analytics
    case "getTripAnalytics":
      return await functions.getTripAnalytics(functionArgs);
    case "getTopPerformers":
      return await functions.getTopPerformers(functionArgs);

    // Fleet
    case "getFleetOverview":
      return await functions.getFleetOverview(functionArgs);

    // Navigation
    case "navigateToPage":
      return await functions.navigateToPage(functionArgs);

    // Issues
    case "listIssues":
      return await functions.listIssues(functionArgs);
    case "getIssuesByDateRange":
      return await functions.getIssuesByDateRange(functionArgs);
    case "searchIssues":
      return await functions.searchIssues(functionArgs);

    // Leads (CRM)
    case "searchLeads":
      return await functions.searchLeads(functionArgs);
    case "getLeadDetails":
      return await functions.getLeadDetails(functionArgs);
    case "getLeadsByStage":
      return await functions.getLeadsByStage(functionArgs);
    case "getLeadsByProduct":
      return await functions.getLeadsByProduct(functionArgs);
    case "getTotalACV":
      return await functions.getTotalACV(functionArgs);
    case "getTotalTCV":
      return await functions.getTotalTCV(functionArgs);

    default:
      return { success: false, error: `Function ${functionName} not implemented` };
  }
}
