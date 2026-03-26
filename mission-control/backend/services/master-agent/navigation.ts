/**
 * Master Agent - Navigation Functions
 * Handles page navigation with optional filters for analytics
 */

import { Request } from "express";
import { parseNaturalDate } from "./utils";

// ============== FUNCTION DEFINITIONS ==============
export const navigationFunctionDefinitions = [
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
  }
];

// ============== FUNCTION IMPLEMENTATIONS ==============
export class NavigationFunctions {
  private req: Request;

  constructor(req: Request) {
    this.req = req;
  }

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
        const parsedStartDate = parseNaturalDate(args.startDate);
        if (parsedStartDate) {
          analyticsParams.startDate = parsedStartDate;
          console.log(`[AI Agent] Analytics start date: "${args.startDate}" -> ${parsedStartDate}`);
        } else {
          console.warn(`[AI Agent] Could not parse start date: "${args.startDate}"`);
        }
      }

      // Parse and add end date if provided
      if (args.endDate) {
        const parsedEndDate = parseNaturalDate(args.endDate);
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
        const parsedStartDate = parseNaturalDate(args.startDate);
        if (parsedStartDate) {
          leadsAnalyticsParams.startDate = parsedStartDate;
          console.log(`[AI Agent] Leads analytics start date: "${args.startDate}" -> ${parsedStartDate}`);
        } else {
          console.warn(`[AI Agent] Could not parse start date: "${args.startDate}"`);
        }
      }

      // Parse and add end date if provided
      if (args.endDate) {
        const parsedEndDate = parseNaturalDate(args.endDate);
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
}
