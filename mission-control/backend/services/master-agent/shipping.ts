/**
 * Master Agent - Shipping Management Functions
 * List and track shipments
 */

import { Request } from "express";
import shipmentModel from "../../models/shipmentModel";
import { parseDateQuery } from "./utils";

// ============== FUNCTION DEFINITIONS ==============

export const shippingFunctionDefinitions = [
  {
    name: "listShipments",
    description:
      "List shipments with optional filters. Use for queries like 'show recent shipments', 'list robot shipments in transit', 'show delivered miscellaneous shipments', etc.",
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
          description:
            "Start date for filtering (ISO string or natural language)"
        },
        dateTo: {
          type: "string",
          description: "End date for filtering (ISO string)"
        }
      }
    }
  }
];

// ============== FUNCTION IMPLEMENTATIONS ==============

export class ShippingFunctions {
  private req: Request;

  constructor(req: Request) {
    this.req = req;
  }

  async listShipments(args: {
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const query: any = {};

    // Type filter
    if (args.type) {
      query.type = args.type;
    }

    // Status filter
    if (args.status) {
      query.status = args.status;
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
        query.startDate = {};
        if (fromTimestamp !== undefined) {
          query.startDate.$gte = new Date(fromTimestamp);
        }
        if (toTimestamp !== undefined) {
          query.startDate.$lte = new Date(toTimestamp);
        }
      }
    }

    const shipments = await shipmentModel
      .find(query)
      .populate("robots", "name _id")
      .select(
        "id shipmentId type status startDate endDate actualDeliveryDate robots items origin destination carrier trackingNumber"
      )
      .sort({ startDate: -1 })
      .limit(100);

    // Group by status for summary
    const summary = {
      total: shipments.length,
      inTransit: 0,
      delivered: 0,
      cancelled: 0
    };

    shipments.forEach((shipment: any) => {
      if (shipment.status === "in-transit") summary.inTransit++;
      else if (shipment.status === "delivered") summary.delivered++;
      else if (shipment.status === "cancelled") summary.cancelled++;
    });

    return {
      success: true,
      count: shipments.length,
      filters: args,
      summary: summary,
      shipments: shipments.map((shipment: any) => ({
        id: shipment.id,
        shipmentId: shipment.shipmentId,
        type: shipment.type,
        status: shipment.status,
        startDate: shipment.startDate,
        endDate: shipment.endDate,
        actualDeliveryDate: shipment.actualDeliveryDate,
        robots: shipment.robots,
        itemsCount: shipment.items?.length || 0,
        origin: shipment.origin,
        destination: shipment.destination,
        carrier: shipment.carrier,
        trackingNumber: shipment.trackingNumber
      }))
    };
  }
}
