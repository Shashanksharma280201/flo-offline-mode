import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Billing, BillingStatus } from "../models/billingModel";
import mongoose from "mongoose";
import logger from "../utils/logger";
import robotModel from "../models/robotModel";

export const getRobotBillingHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId } = req.params;

    const bills = await Billing.find({ robotId })
      .sort({ createdAt: -1 }) // newest first
      .populate("robotId", "name")
      .populate("clientId", "name")
      .lean();

    res.json({
      success: true,
      count: bills.length,
      data: bills
    });
  }
);

export const getLatestRobotBilling = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId } = req.params;

    const latest = await Billing.findOne({ robotId })
      .sort({ createdAt: -1 }) // newest first
      .populate("robotId", "name")
      .populate("clientId", "name")
      .lean();

    if (!latest) {
      res.status(404);
      throw new Error("No billing record found for this robot");
    }

    res.json({
      success: true,
      data: latest
    });
  }
);

export const createBilling = asyncHandler(
  async (req: Request, res: Response) => {
    const { robotId, clientId, startDate, endDate, amount, status, createdBy } =
      req.body as Partial<Billing>;

    if (
      !robotId ||
      !clientId ||
      !startDate ||
      amount == null ||
      !status ||
      !createdBy
    ) {
      res.status(400);
      throw new Error("Missing required fields");
    }

    if (endDate && new Date(endDate) < new Date(startDate)) {
      res.status(400);
      throw new Error("End date must be after start date");
    }

    if (!Object.values(BillingStatus).includes(status as BillingStatus)) {
      res.status(400);
      throw new Error("Invalid billing status");
    }

    if (!mongoose.isValidObjectId(clientId)) {
      res.status(400);
      throw new Error("Invalid client ID");
    }

    // Since robotId is the UUID/Primary Key, we check if it exists in the robot collection
    const robotExists = await robotModel.exists({ _id: robotId });
    if (!robotExists) {
      res.status(404);
      throw new Error("Robot not found");
    }

    // Validations for No-Overlap Rule
    const latestBilling = await Billing.findOne({ robotId }).sort({ createdAt: -1 });

    if (latestBilling) {
      // 1. Check if previous entry is still open
      if (!latestBilling.endDate) {
        res.status(400);
        throw new Error(
          "Previous billing entry is still open. Please close it (set end date) before creating a new one."
        );
      }

      // 2. Validate new start_date >= previous end_date
      if (new Date(startDate) < new Date(latestBilling.endDate)) {
        res.status(400);
        throw new Error("New start date must be after the previous billing end date");
      }
    }

    // 3. Create Record with History
    const initialHistory = {
      action: "ENTRY_CREATED",
      changedBy: createdBy,
      updatedAt: new Date(),
      changes: {
        robotId,
        clientId,
        startDate,
        endDate,
        amount,
        status
      }
    };

    const billing = await Billing.create({
      robotId, // This is the UUID string
      clientId,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      amount,
      status,
      createdBy,
      history: [initialHistory]
    });

    res.status(201).json({
      success: true,
      data: billing
    });
  }
);

export const updateRobotBilling = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { robotId } = req.params;
    const { amount, endDate, startDate, createdBy } = req.body as Partial<Billing>;

    // Status is explicitly NOT retrieved or used to ensure immutability
    if (req.body.status) {
      // We could throw error, or just ignore. The prompt says "ignore it or throw an error".
      // Ignoring is often friendlier for mixed payloads, but let's be stricter if the user wants "Strict".
      // Let's ignore it for now to avoid breaking clients that might send full objects back,
      // but we definitely won't use it.
    }

    if (!createdBy) {
      res.status(400);
      throw new Error("createdBy is required when updating billing");
    }

    const current = await Billing.findOne({ robotId }).sort({ createdAt: -1 });

    if (!current) {
      res.status(404);
      throw new Error("No existing billing record found for this robot");
    }

    // Determine what is changing
    const changes: any = {};
    const updateFields: Partial<any> = {};

    if (amount !== undefined && amount !== current.amount) {
      updateFields.amount = amount;
      changes.amount = { old: current.amount, new: amount };
    }

    if (startDate && new Date(startDate).toISOString() !== new Date(current.startDate).toISOString()) {
      updateFields.startDate = new Date(startDate);
      changes.startDate = { old: current.startDate, new: new Date(startDate) };
    }

    // endDate can be null/undefined to 're-open' technically, but business logic says we usually close it.
    // If passed as null, we set it to null.
    // Compare dates properly
    const currentEndDateStr = current.endDate ? new Date(current.endDate).toISOString() : null;
    const newEndDateStr = endDate ? new Date(endDate).toISOString() : null;

    if (endDate !== undefined && currentEndDateStr !== newEndDateStr) {
      updateFields.endDate = endDate ? new Date(endDate) : null;
      changes.endDate = { old: current.endDate, new: endDate ? new Date(endDate) : null };
    }

    // Date Validation
    const finalStartDate = updateFields.startDate || current.startDate;
    const finalEndDate = updateFields.endDate !== undefined ? updateFields.endDate : current.endDate;

    if (finalEndDate && new Date(finalEndDate).getTime() < new Date(finalStartDate).getTime()) {
      res.status(400);
      throw new Error("End date must be after start date");
    }

    if (Object.keys(changes).length === 0) {
      res.json({
        success: true,
        message: "No changes provided",
        data: current
      });
      return;
    }

    // Push to history
    const historyEntry = {
      action: "UPDATED",
      changedBy: createdBy,
      updatedAt: new Date(),
      changes: changes
    };

    const updated = await Billing.findByIdAndUpdate(
      current._id,
      {
        $set: updateFields,
        $push: { history: historyEntry }
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Billing record updated",
      data: updated
    });
  }
);

export const getBillingSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const { clientId, status, startDate, endDate } = req.query;

    const matchStage: any = {};

    if (clientId) {
      matchStage["latestBilling.clientId"] = new mongoose.Types.ObjectId(
        clientId as string
      );
    }

    if (status) {
      matchStage["latestBilling.status"] = status;
    }

    if (startDate || endDate) {
      matchStage["latestBilling.startDate"] = {};
      if (startDate) {
        matchStage["latestBilling.startDate"].$gte = new Date(
          startDate as string
        );
      }
      if (endDate) {
        matchStage["latestBilling.startDate"].$lte = new Date(
          endDate as string
        );
      }
    }

    const summary = await robotModel.aggregate([
      {
        $lookup: {
          from: "billing",
          let: { rId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$robotId", "$$rId"] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 }
          ],
          as: "latestBilling"
        }
      },
      {
        $unwind: {
          path: "$latestBilling",
          preserveNullAndEmptyArrays: true
        }
      },
      { $match: matchStage },
      {
        $lookup: {
          from: "clients",
          localField: "latestBilling.clientId",
          foreignField: "_id",
          as: "client"
        }
      },
      {
        $unwind: {
          path: "$client",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          robotId: "$_id",
          robotName: "$name",
          clientName: "$client.name",
          clientId: "$latestBilling.clientId",
          amount: "$latestBilling.amount",
          status: "$latestBilling.status",
          startDate: "$latestBilling.startDate",
          endDate: "$latestBilling.endDate",
          _id: "$latestBilling._id"
        }
      },
      { $sort: { robotName: 1 } }
    ]);

    res.json({
      success: true,
      data: summary
    });
  }
);
