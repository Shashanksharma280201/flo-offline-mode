/**
 * Master Agent - Leads (CRM) Functions
 * Handles lead search, details, filtering, and ACV/TCV calculations
 */

import { Request } from "express";
import leadsModel from "../../models/leadsModel";

// ============== FUNCTION DEFINITIONS ==============
export const leadsFunctionDefinitions = [
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
  }
];

// ============== FUNCTION IMPLEMENTATIONS ==============
export class LeadsFunctions {
  private req: Request;

  constructor(req: Request) {
    this.req = req;
  }

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
