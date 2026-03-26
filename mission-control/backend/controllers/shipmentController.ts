import asyncHandler from "express-async-handler";
import Shipment from "../models/shipmentModel";
import InventoryItem from "../models/inventoryItemModel";
import { generateShipmentId } from "../services/counterService";
import logger from "../utils/logger";

/**
 * Get all shipments with optional filtering
 * @route GET /api/v1/shipments
 * @access Private
 */
export const getShipments = asyncHandler(async (req, res) => {
  const {
    type,
    status,
    search,
    robotId,
    page = 1,
    limit = 20
  } = req.query;

  const query: any = {};

  // Filter by type
  if (type && (type === "robot" || type === "miscellaneous")) {
    query.type = type;
  }

  // Filter by status
  if (status && ["in-transit", "delivered", "cancelled"].includes(status as string)) {
    query.status = status;
  }

  // Text search on shipmentId, locations, robot name/ID, and item names/descriptions
  if (search && typeof search === "string") {
    query.$or = [
      { shipmentId: { $regex: search, $options: "i" } },
      { startLocation: { $regex: search, $options: "i" } },
      { endLocation: { $regex: search, $options: "i" } },
      { "robots.name": { $regex: search, $options: "i" } },
      { "robots.robotId": { $regex: search, $options: "i" } },
      { "items.name": { $regex: search, $options: "i" } },
      { "additionalItems.name": { $regex: search, $options: "i" } },
      { "items.customDescription": { $regex: search, $options: "i" } },
      { "additionalItems.customDescription": { $regex: search, $options: "i" } }
    ];
  }

  // Filter by robot ID
  if (robotId) {
    query["robots.robotId"] = robotId;
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const [shipments, total] = await Promise.all([
    Shipment.find(query)
      .populate("createdBy", "name email")
      .populate("editHistory.editedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Shipment.countDocuments(query)
  ]);

  res.status(200).json({
    shipments,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum)
  });
});

/**
 * Get single shipment by ID
 * @route GET /api/v1/shipments/:shipmentId
 * @access Private
 */
export const getShipment = asyncHandler(async (req, res) => {
  const { shipmentId } = req.params;

  const shipment = await Shipment.findOne({ shipmentId: shipmentId.toUpperCase() })
    .populate("createdBy", "name email")
    .populate("editHistory.editedBy", "name email");

  if (!shipment) {
    res.status(404);
    throw new Error("Shipment not found");
  }

  res.status(200).json(shipment);
});

/**
 * Get shipments for a specific robot
 * @route GET /api/v1/shipments/robot/:robotId
 * @access Private
 */
export const getShipmentsByRobot = asyncHandler(async (req, res) => {
  const { robotId } = req.params;

  const shipments = await Shipment.find({
    "robots.robotId": robotId
  })
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json(shipments);
});

/**
 * Get shipment statistics
 * @route GET /api/v1/shipments/stats
 * @access Private
 */
export const getShipmentStats = asyncHandler(async (req, res) => {
  const [
    totalShipments,
    robotShipments,
    miscellaneousShipments,
    inTransit,
    delivered
  ] = await Promise.all([
    Shipment.countDocuments(),
    Shipment.countDocuments({ type: "robot" }),
    Shipment.countDocuments({ type: "miscellaneous" }),
    Shipment.countDocuments({ status: "in-transit" }),
    Shipment.countDocuments({ status: "delivered" })
  ]);

  res.status(200).json({
    totalShipments,
    robotShipments,
    miscellaneousShipments,
    inTransit,
    delivered
  });
});

/**
 * Create new shipment
 * @route POST /api/v1/shipments
 * @access Private
 */
export const createShipment = asyncHandler(async (req, res) => {
  const {
    type,
    robots,
    additionalItems,
    items,
    description,
    startLocation,
    endLocation,
    startDate,
    endDate
  } = req.body;

  // Validation
  if (!type || !startLocation || !endLocation || !startDate || !endDate) {
    res.status(400);
    throw new Error("Missing required fields");
  }

  // Validate type
  if (type !== "robot" && type !== "miscellaneous") {
    res.status(400);
    throw new Error("Type must be 'robot' or 'miscellaneous'");
  }

  // Validate robot shipments
  if (type === "robot" && (!robots || robots.length === 0)) {
    res.status(400);
    throw new Error("At least one robot is required for robot shipments");
  }

  // Validate miscellaneous shipments
  if (type === "miscellaneous" && (!items || items.length === 0)) {
    res.status(400);
    throw new Error("At least one item is required for miscellaneous shipments");
  }

  // Validate dates
  if (new Date(endDate) < new Date(startDate)) {
    res.status(400);
    throw new Error("End date must be after start date");
  }

  const userId = (req.user as any)._id;
  const userName = (req.user as any).name;

  // Collect all items that need inventory deduction (excluding "Others")
  const itemsToDeduct: Array<{ itemId: string; quantity: number; name: string }> = [];

  if (type === "robot" && additionalItems) {
    // Filter out "OTHERS" items as they don't exist in inventory
    itemsToDeduct.push(...additionalItems.filter((item: any) => item.itemId !== "OTHERS"));
  }

  if (type === "miscellaneous" && items) {
    // Filter out "OTHERS" items as they don't exist in inventory
    itemsToDeduct.push(...items.filter((item: any) => item.itemId !== "OTHERS"));
  }

  // STEP 1: Validate ALL items first (don't deduct yet)
  const inventoryItemsToUpdate: Array<{
    inventoryItem: any;
    item: { itemId: string; quantity: number; name: string };
  }> = [];

  if (itemsToDeduct.length > 0) {
    for (const item of itemsToDeduct) {
      const inventoryItem = await InventoryItem.findOne({ itemId: item.itemId.toUpperCase() });

      if (!inventoryItem) {
        res.status(404);
        throw new Error(`Inventory item ${item.itemId} not found`);
      }

      if (inventoryItem.quantity < item.quantity) {
        res.status(400);
        throw new Error(
          `Insufficient quantity for ${inventoryItem.name}. Available: ${inventoryItem.quantity}, Required: ${item.quantity}`
        );
      }

      // Store for later update
      inventoryItemsToUpdate.push({ inventoryItem, item });
    }
  }

  // STEP 2: All validations passed, now deduct quantities
  for (const { inventoryItem, item } of inventoryItemsToUpdate) {
    const previousQty = inventoryItem.quantity;
    inventoryItem.quantity -= item.quantity;

    inventoryItem.transactions.push({
      type: "remove",
      quantity: item.quantity,
      previousQty,
      newQty: inventoryItem.quantity,
      date: new Date(),
      performedBy: userId,
      notes: `Shipped via shipment (pending ID generation)`
    });

    await inventoryItem.save();

    logger.info(
      `Inventory deducted: ${item.itemId} - ${item.quantity} units (${previousQty} → ${inventoryItem.quantity}) by ${userName}`
    );
  }

  // Generate unique shipment ID
  const shipmentId = await generateShipmentId();

  // Update transaction notes with actual shipment ID
  for (const { inventoryItem } of inventoryItemsToUpdate) {
    if (inventoryItem.transactions.length > 0) {
      const lastTransaction = inventoryItem.transactions[inventoryItem.transactions.length - 1];
      if (lastTransaction.notes?.includes("pending ID generation")) {
        lastTransaction.notes = `Shipped via shipment ${shipmentId}`;
        await inventoryItem.save();
      }
    }
  }

  // Create shipment
  const shipment = await Shipment.create({
    shipmentId,
    type,
    robots: type === "robot" ? robots : undefined,
    additionalItems: type === "robot" ? additionalItems : undefined,
    items: type === "miscellaneous" ? items : undefined,
    description,
    startLocation,
    endLocation,
    startDate,
    endDate,
    createdBy: userId
  });

  const populatedShipment = await Shipment.findById(shipment._id)
    .populate("createdBy", "name email");

  logger.info(`Shipment created: ${shipmentId} - ${type} by ${userName}`);

  res.status(201).json(populatedShipment);
});

/**
 * Update shipment (only dates and locations)
 * @route PATCH /api/v1/shipments/:shipmentId
 * @access Private
 */
export const updateShipment = asyncHandler(async (req, res) => {
  const { shipmentId } = req.params;
  const { startLocation, endLocation, startDate, endDate, actualDeliveryDate, status } = req.body;

  const shipment = await Shipment.findOne({ shipmentId: shipmentId.toUpperCase() });

  if (!shipment) {
    res.status(404);
    throw new Error("Shipment not found");
  }

  const userId = (req.user as any)._id;
  const userName = (req.user as any).name;

  // Track changes for edit history
  const changes: any[] = [];

  // Update start location if changed
  if (startLocation !== undefined && startLocation !== shipment.startLocation) {
    changes.push({
      field: "startLocation",
      oldValue: shipment.startLocation,
      newValue: startLocation,
      editedBy: userId,
      editedAt: new Date()
    });
    shipment.startLocation = startLocation;
  }

  // Update end location if changed
  if (endLocation !== undefined && endLocation !== shipment.endLocation) {
    changes.push({
      field: "endLocation",
      oldValue: shipment.endLocation,
      newValue: endLocation,
      editedBy: userId,
      editedAt: new Date()
    });
    shipment.endLocation = endLocation;
  }

  // Update start date if changed
  if (startDate !== undefined) {
    const newStartDate = new Date(startDate);
    if (newStartDate.getTime() !== shipment.startDate.getTime()) {
      changes.push({
        field: "startDate",
        oldValue: shipment.startDate.toISOString(),
        newValue: newStartDate.toISOString(),
        editedBy: userId,
        editedAt: new Date()
      });
      shipment.startDate = newStartDate;
    }
  }

  // Update end date if changed
  if (endDate !== undefined) {
    const newEndDate = new Date(endDate);
    if (newEndDate.getTime() !== shipment.endDate.getTime()) {
      // Validate that end date is after start date
      if (newEndDate < shipment.startDate) {
        res.status(400);
        throw new Error("End date must be after start date");
      }
      changes.push({
        field: "endDate",
        oldValue: shipment.endDate.toISOString(),
        newValue: newEndDate.toISOString(),
        editedBy: userId,
        editedAt: new Date()
      });
      shipment.endDate = newEndDate;
    }
  }

  // Update actual delivery date if provided
  if (actualDeliveryDate !== undefined) {
    const newDeliveryDate = actualDeliveryDate ? new Date(actualDeliveryDate) : undefined;
    const oldDeliveryDate = shipment.actualDeliveryDate;

    if ((!oldDeliveryDate && newDeliveryDate) ||
        (oldDeliveryDate && newDeliveryDate && oldDeliveryDate.getTime() !== newDeliveryDate.getTime()) ||
        (oldDeliveryDate && !newDeliveryDate)) {
      changes.push({
        field: "actualDeliveryDate",
        oldValue: oldDeliveryDate ? oldDeliveryDate.toISOString() : "Not set",
        newValue: newDeliveryDate ? newDeliveryDate.toISOString() : "Removed",
        editedBy: userId,
        editedAt: new Date()
      });
      shipment.actualDeliveryDate = newDeliveryDate;
    }
  }

  // Update status if provided
  if (status !== undefined && status !== shipment.status) {
    if (!["in-transit", "delivered", "cancelled"].includes(status)) {
      res.status(400);
      throw new Error("Invalid status value");
    }

    // If changing to cancelled, restore inventory quantities
    if (status === "cancelled" && shipment.status !== "cancelled") {
      const itemsToRestore: Array<{ itemId: string; quantity: number; name: string }> = [];

      if (shipment.type === "robot" && shipment.additionalItems) {
        // Filter out "OTHERS" items as they don't exist in inventory
        itemsToRestore.push(...shipment.additionalItems.filter((item: any) => item.itemId !== "OTHERS"));
      }

      if (shipment.type === "miscellaneous" && shipment.items) {
        // Filter out "OTHERS" items as they don't exist in inventory
        itemsToRestore.push(...shipment.items.filter((item: any) => item.itemId !== "OTHERS"));
      }

      // Restore inventory quantities
      for (const item of itemsToRestore) {
        const inventoryItem = await InventoryItem.findOne({ itemId: item.itemId.toUpperCase() });

        if (inventoryItem) {
          const previousQty = inventoryItem.quantity;
          inventoryItem.quantity += item.quantity;

          inventoryItem.transactions.push({
            type: "add",
            quantity: item.quantity,
            previousQty,
            newQty: inventoryItem.quantity,
            date: new Date(),
            performedBy: userId,
            notes: `Restored from cancelled shipment ${shipment.shipmentId}`
          });

          await inventoryItem.save();

          logger.info(
            `Inventory restored: ${item.itemId} - ${item.quantity} units (${previousQty} → ${inventoryItem.quantity}) by ${userName}`
          );
        }
      }

      logger.info(`Shipment cancelled and inventory restored: ${shipment.shipmentId} by ${userName}`);
    }

    changes.push({
      field: "status",
      oldValue: shipment.status,
      newValue: status,
      editedBy: userId,
      editedAt: new Date()
    });
    shipment.status = status;
  }

  // Add changes to edit history
  if (changes.length > 0) {
    shipment.editHistory.push(...changes);
    await shipment.save();

    logger.info(
      `Shipment updated: ${shipmentId} - ${changes.length} field(s) changed by ${userName}`
    );
  }

  const updatedShipment = await Shipment.findById(shipment._id)
    .populate("createdBy", "name email")
    .populate("editHistory.editedBy", "name email");

  res.status(200).json(updatedShipment);
});

/**
 * Delete shipment
 * @route DELETE /api/v1/shipments/:shipmentId
 * @access Private (Admin only)
 */
export const deleteShipment = asyncHandler(async (req, res) => {
  const { shipmentId } = req.params;

  const shipment = await Shipment.findOne({
    shipmentId: shipmentId.toUpperCase()
  });

  if (!shipment) {
    res.status(404);
    throw new Error("Shipment not found");
  }

  const userId = (req.user as any)._id;
  const userName = (req.user as any).name;

  // Restore inventory if shipment was not delivered (in-transit or cancelled)
  if (shipment.status === "in-transit") {
    const itemsToRestore: Array<{ itemId: string; quantity: number; name: string }> = [];

    if (shipment.type === "robot" && shipment.additionalItems) {
      // Filter out "OTHERS" items as they don't exist in inventory
      itemsToRestore.push(...shipment.additionalItems.filter((item: any) => item.itemId !== "OTHERS"));
    }

    if (shipment.type === "miscellaneous" && shipment.items) {
      // Filter out "OTHERS" items as they don't exist in inventory
      itemsToRestore.push(...shipment.items.filter((item: any) => item.itemId !== "OTHERS"));
    }

    // Restore inventory quantities
    for (const item of itemsToRestore) {
      const inventoryItem = await InventoryItem.findOne({ itemId: item.itemId.toUpperCase() });

      if (inventoryItem) {
        const previousQty = inventoryItem.quantity;
        inventoryItem.quantity += item.quantity;

        inventoryItem.transactions.push({
          type: "add",
          quantity: item.quantity,
          previousQty,
          newQty: inventoryItem.quantity,
          date: new Date(),
          performedBy: userId,
          notes: `Restored from deleted shipment ${shipment.shipmentId}`
        });

        await inventoryItem.save();

        logger.info(
          `Inventory restored: ${item.itemId} - ${item.quantity} units (${previousQty} → ${inventoryItem.quantity}) by ${userName}`
        );
      }
    }

    logger.info(`Shipment deleted and inventory restored: ${shipmentId} by ${userName}`);
  }

  // Now delete the shipment
  await Shipment.findOneAndDelete({
    shipmentId: shipmentId.toUpperCase()
  });

  logger.info(`Shipment deleted: ${shipmentId} by ${userName}`);

  res.status(200).json({ message: "Shipment deleted successfully" });
});
