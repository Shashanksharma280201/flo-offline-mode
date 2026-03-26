/**
 * Master Agent - Inventory Management Functions
 * List and search inventory items, check low stock
 */

import { Request } from "express";
import inventoryItemModel from "../../models/inventoryItemModel";

// ============== FUNCTION DEFINITIONS ==============

export const inventoryFunctionDefinitions = [
  {
    name: "listInventory",
    description:
      "List inventory items with optional filters. Use for queries like 'which items are low stock?', 'show electronics inventory', 'list all mechanical parts', etc.",
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
          description:
            "Filter for low stock items only (quantity <= minStockLevel)"
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
  }
];

// ============== FUNCTION IMPLEMENTATIONS ==============

export class InventoryFunctions {
  private req: Request;

  constructor(req: Request) {
    this.req = req;
  }

  async listInventory(args: { category?: string; lowStock?: boolean }) {
    const query: any = {};

    // Category filter
    if (args.category) {
      query.category = args.category;
    }

    // Low stock filter
    if (args.lowStock) {
      // Items where quantity <= minStockLevel
      query.$expr = {
        $lte: ["$quantity", "$minStockLevel"]
      };
    }

    const items = await inventoryItemModel
      .find(query)
      .select(
        "id itemId name category quantity unit minStockLevel location vendor"
      )
      .sort({ category: 1, name: 1 })
      .limit(100);

    // Calculate stock status for each item
    const itemsWithStatus = items.map((item: any) => {
      let stockStatus = "in-stock";
      if (item.quantity === 0) {
        stockStatus = "out-of-stock";
      } else if (item.minStockLevel && item.quantity <= item.minStockLevel) {
        stockStatus = "low-stock";
      }

      return {
        id: item.id,
        itemId: item.itemId,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        minStockLevel: item.minStockLevel,
        stockStatus: stockStatus,
        location: item.location,
        vendor: item.vendor?.name
      };
    });

    // Group by stock status for summary
    const summary = {
      total: itemsWithStatus.length,
      lowStock: itemsWithStatus.filter((i) => i.stockStatus === "low-stock")
        .length,
      outOfStock: itemsWithStatus.filter(
        (i) => i.stockStatus === "out-of-stock"
      ).length,
      inStock: itemsWithStatus.filter((i) => i.stockStatus === "in-stock")
        .length
    };

    return {
      success: true,
      count: itemsWithStatus.length,
      filters: args,
      summary: summary,
      items: itemsWithStatus
    };
  }

  async searchInventory(args: {
    query: string;
    category?: string;
    lowStock?: boolean;
  }) {
    const query: any = {
      name: { $regex: args.query, $options: "i" }
    };

    // Category filter
    if (args.category) {
      query.category = args.category;
    }

    // Low stock filter
    if (args.lowStock) {
      query.$expr = {
        $lte: ["$quantity", "$minStockLevel"]
      };
    }

    const items = await inventoryItemModel
      .find(query)
      .select(
        "id itemId name category quantity unit minStockLevel location vendor"
      )
      .sort({ name: 1 })
      .limit(50);

    // Calculate stock status for each item
    const itemsWithStatus = items.map((item: any) => {
      let stockStatus = "in-stock";
      if (item.quantity === 0) {
        stockStatus = "out-of-stock";
      } else if (item.minStockLevel && item.quantity <= item.minStockLevel) {
        stockStatus = "low-stock";
      }

      return {
        id: item.id,
        itemId: item.itemId,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        minStockLevel: item.minStockLevel,
        stockStatus: stockStatus,
        location: item.location,
        vendor: item.vendor?.name
      };
    });

    return {
      success: true,
      query: args.query,
      count: itemsWithStatus.length,
      filters: args,
      items: itemsWithStatus
    };
  }
}
