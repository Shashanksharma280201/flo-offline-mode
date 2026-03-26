import asyncHandler from "express-async-handler";
import InventoryItem from "../models/inventoryItemModel";
import { generateInventoryId } from "../services/counterService";
import logger from "../utils/logger";

/**
 * Get all inventory items with optional filtering
 * @route GET /api/v1/inventory
 * @access Private
 */
export const getInventoryItems = asyncHandler(async (req, res) => {
  const {
    category,
    search,
    stockStatus,
    page = 1,
    limit = 20
  } = req.query;

  const query: any = {};

  // Filter by category
  if (category && (category === "mechanical" || category === "electronics")) {
    query.category = category;
  }

  // Text search on name
  if (search && typeof search === "string") {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { itemId: { $regex: search, $options: "i" } }
    ];
  }

  // Filter by stock status
  if (stockStatus) {
    if (stockStatus === "out-of-stock") {
      query.quantity = 0;
    } else if (stockStatus === "low-stock") {
      query.$expr = { $lte: ["$quantity", "$minStockLevel"] };
      query.quantity = { $gt: 0 };
    }
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    InventoryItem.find(query)
      .populate("createdBy", "name email")
      .populate("transactions.performedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    InventoryItem.countDocuments(query)
  ]);

  res.status(200).json({
    items,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum)
  });
});

/**
 * Get single inventory item by ID
 * @route GET /api/v1/inventory/:itemId
 * @access Private
 */
export const getInventoryItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const item = await InventoryItem.findOne({ itemId: itemId.toUpperCase() })
    .populate("createdBy", "name email")
    .populate("transactions.performedBy", "name email");

  if (!item) {
    res.status(404);
    throw new Error("Inventory item not found");
  }

  res.status(200).json(item);
});

/**
 * Create new inventory item
 * @route POST /api/v1/inventory
 * @access Private
 */
export const createInventoryItem = asyncHandler(async (req, res) => {
  const {
    name,
    category,
    quantity,
    unit,
    description,
    location,
    minStockLevel,
    vendor
  } = req.body;

  // Validation
  if (!name || !category || quantity === undefined || !unit || !vendor) {
    res.status(400);
    throw new Error("Missing required fields");
  }

  // Validate category
  if (category !== "mechanical" && category !== "electronics") {
    res.status(400);
    throw new Error("Category must be 'mechanical' or 'electronics'");
  }

  // Validate vendor required fields
  if (!vendor.name || !vendor.orderDate || !vendor.expectedArrivalDate) {
    res.status(400);
    throw new Error(
      "Vendor name, order date, and expected arrival date are required"
    );
  }

  // Check if item name already exists in same category
  const existingItem = await InventoryItem.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") },
    category
  });

  if (existingItem) {
    res.status(400);
    throw new Error(
      `Item '${name}' already exists in ${category} category`
    );
  }

  // Generate unique item ID
  const itemId = await generateInventoryId(category);

  // Create initial transaction for stock addition
  const userId = (req.user as any)._id;
  const userName = (req.user as any).name;

  const initialTransaction = {
    type: "add" as const,
    quantity,
    previousQty: 0,
    newQty: quantity,
    date: new Date(),
    performedBy: userId,
    notes: `Initial stock from vendor: ${vendor.name}`,
    vendorRef: vendor.name
  };

  // Create inventory item
  const item = await InventoryItem.create({
    itemId,
    name: name.trim(),
    category,
    quantity,
    unit,
    description,
    location,
    minStockLevel,
    vendor,
    transactions: [initialTransaction],
    createdBy: userId
  });

  const populatedItem = await InventoryItem.findById(item._id).populate(
    "createdBy",
    "name email"
  );

  logger.info(`Inventory item created: ${itemId} - ${name} by ${userName}`);

  res.status(201).json(populatedItem);
});

/**
 * Update inventory item quantity
 * @route PATCH /api/v1/inventory/:itemId/quantity
 * @access Private
 */
export const updateInventoryQuantity = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { action, quantity, notes, orderDate, receivingDate, vendor, minStockLevel } = req.body;

  if (!action || !quantity) {
    res.status(400);
    throw new Error("Action and quantity are required");
  }

  if (action !== "add" && action !== "remove") {
    res.status(400);
    throw new Error("Action must be 'add' or 'remove'");
  }

  if (quantity <= 0) {
    res.status(400);
    throw new Error("Quantity must be greater than 0");
  }

  const item = await InventoryItem.findOne({ itemId: itemId.toUpperCase() });

  if (!item) {
    res.status(404);
    throw new Error("Inventory item not found");
  }

  const previousQty = item.quantity;
  let newQty: number;

  if (action === "add") {
    newQty = previousQty + quantity;
  } else {
    // remove
    if (quantity > previousQty) {
      res.status(400);
      throw new Error(
        `Cannot remove ${quantity} items. Only ${previousQty} available.`
      );
    }
    newQty = previousQty - quantity;
  }

  const userId = (req.user as any)._id;
  const userName = (req.user as any).name;

  // Update vendor information if provided
  if (vendor) {
    // Update vendor fields that are provided
    if (vendor.name !== undefined && vendor.name !== "") item.vendor.name = vendor.name;
    if (vendor.contactPerson !== undefined) item.vendor.contactPerson = vendor.contactPerson;
    if (vendor.phoneNumber !== undefined) item.vendor.phoneNumber = vendor.phoneNumber;
    if (vendor.email !== undefined) item.vendor.email = vendor.email;
    if (vendor.orderLink !== undefined) item.vendor.orderLink = vendor.orderLink;
    if (vendor.orderNumber !== undefined) item.vendor.orderNumber = vendor.orderNumber;
    if (vendor.notes !== undefined) item.vendor.notes = vendor.notes;
  }

  // Update vendor dates if provided
  if (orderDate) {
    item.vendor.orderDate = new Date(orderDate);
  }
  if (receivingDate) {
    item.vendor.actualArrivalDate = new Date(receivingDate);
  }

  // Update minimum stock level if provided
  if (minStockLevel !== undefined && minStockLevel >= 0) {
    item.minStockLevel = minStockLevel;
  }

  // Add transaction
  item.transactions.push({
    type: action,
    quantity,
    previousQty,
    newQty,
    date: new Date(),
    performedBy: userId,
    notes: notes || "",
    vendorRef: item.vendor.name
  });

  item.quantity = newQty;

  await item.save();

  const updatedItem = await InventoryItem.findById(item._id)
    .populate("createdBy", "name email")
    .populate("transactions.performedBy", "name email");

  logger.info(
    `Inventory ${action}: ${itemId} - ${action === "add" ? "+" : "-"}${quantity} by ${userName}`
  );

  res.status(200).json(updatedItem);
});

/**
 * Get inventory statistics
 * @route GET /api/v1/inventory/stats
 * @access Private
 */
export const getInventoryStats = asyncHandler(async (req, res) => {
  const [
    totalItems,
    mechanicalCount,
    electronicsCount,
    outOfStock,
    lowStock
  ] = await Promise.all([
    InventoryItem.countDocuments(),
    InventoryItem.countDocuments({ category: "mechanical" }),
    InventoryItem.countDocuments({ category: "electronics" }),
    InventoryItem.countDocuments({ quantity: 0 }),
    InventoryItem.countDocuments({
      $expr: { $lte: ["$quantity", "$minStockLevel"] },
      quantity: { $gt: 0 }
    })
  ]);

  res.status(200).json({
    totalItems,
    mechanical: mechanicalCount,
    electronics: electronicsCount,
    outOfStock,
    lowStock
  });
});

/**
 * Update inventory item details
 * @route PUT /api/v1/inventory/:itemId
 * @access Private
 */
export const updateInventoryItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const {
    name,
    category,
    unit,
    description,
    location,
    minStockLevel,
    vendor
  } = req.body;

  const item = await InventoryItem.findOne({ itemId: itemId.toUpperCase() });

  if (!item) {
    res.status(404);
    throw new Error("Inventory item not found");
  }

  const userId = (req.user as any)._id;
  const userName = (req.user as any).name;
  const changes: string[] = [];

  // Track and apply changes
  if (name && name.trim() !== item.name) {
    // Check if new name conflicts with existing item in same category
    const conflictingItem = await InventoryItem.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      category: category || item.category,
      itemId: { $ne: itemId.toUpperCase() }
    });

    if (conflictingItem) {
      res.status(400);
      throw new Error(
        `Item '${name}' already exists in ${category || item.category} category`
      );
    }

    changes.push(`name: "${item.name}" → "${name.trim()}"`);
    item.name = name.trim();
  }

  if (category && category !== item.category) {
    if (category !== "mechanical" && category !== "electronics") {
      res.status(400);
      throw new Error("Category must be 'mechanical' or 'electronics'");
    }
    changes.push(`category: ${item.category} → ${category}`);
    item.category = category;
  }

  if (unit && unit !== item.unit) {
    const validUnits = ["pieces", "meters", "kilograms", "liters", "sets", "boxes"];
    if (!validUnits.includes(unit)) {
      res.status(400);
      throw new Error(`Unit must be one of: ${validUnits.join(", ")}`);
    }
    changes.push(`unit: ${item.unit} → ${unit}`);
    item.unit = unit;
  }

  if (description !== undefined && description !== item.description) {
    changes.push(`description updated`);
    item.description = description;
  }

  if (location !== undefined && location !== item.location) {
    changes.push(`location: "${item.location || 'none'}" → "${location || 'none'}"`);
    item.location = location;
  }

  if (minStockLevel !== undefined && minStockLevel !== item.minStockLevel) {
    if (minStockLevel < 0) {
      res.status(400);
      throw new Error("Min stock level cannot be negative");
    }
    changes.push(`minStockLevel: ${item.minStockLevel || 0} → ${minStockLevel}`);
    item.minStockLevel = minStockLevel;
  }

  // Update vendor information if provided
  if (vendor) {
    if (vendor.name !== undefined && vendor.name !== item.vendor.name) {
      if (!vendor.name || vendor.name.trim() === "") {
        res.status(400);
        throw new Error("Vendor name cannot be empty");
      }
      changes.push(`vendor.name: "${item.vendor.name}" → "${vendor.name}"`);
      item.vendor.name = vendor.name;
    }

    if (vendor.contactPerson !== undefined && vendor.contactPerson !== item.vendor.contactPerson) {
      changes.push(`vendor.contactPerson updated`);
      item.vendor.contactPerson = vendor.contactPerson;
    }

    if (vendor.phoneNumber !== undefined && vendor.phoneNumber !== item.vendor.phoneNumber) {
      changes.push(`vendor.phoneNumber updated`);
      item.vendor.phoneNumber = vendor.phoneNumber;
    }

    if (vendor.email !== undefined && vendor.email !== item.vendor.email) {
      changes.push(`vendor.email updated`);
      item.vendor.email = vendor.email;
    }

    if (vendor.orderLink !== undefined && vendor.orderLink !== item.vendor.orderLink) {
      changes.push(`vendor.orderLink updated`);
      item.vendor.orderLink = vendor.orderLink;
    }

    if (vendor.orderNumber !== undefined && vendor.orderNumber !== item.vendor.orderNumber) {
      changes.push(`vendor.orderNumber updated`);
      item.vendor.orderNumber = vendor.orderNumber;
    }

    if (vendor.notes !== undefined && vendor.notes !== item.vendor.notes) {
      changes.push(`vendor.notes updated`);
      item.vendor.notes = vendor.notes;
    }

    if (vendor.orderDate && new Date(vendor.orderDate).getTime() !== item.vendor.orderDate.getTime()) {
      changes.push(`vendor.orderDate updated`);
      item.vendor.orderDate = new Date(vendor.orderDate);
    }

    if (vendor.expectedArrivalDate && new Date(vendor.expectedArrivalDate).getTime() !== item.vendor.expectedArrivalDate.getTime()) {
      changes.push(`vendor.expectedArrivalDate updated`);
      item.vendor.expectedArrivalDate = new Date(vendor.expectedArrivalDate);
    }

    if (vendor.actualArrivalDate !== undefined) {
      const newDate = vendor.actualArrivalDate ? new Date(vendor.actualArrivalDate) : undefined;
      const oldDate = item.vendor.actualArrivalDate;
      if ((newDate && !oldDate) || (!newDate && oldDate) || (newDate && oldDate && newDate.getTime() !== oldDate.getTime())) {
        changes.push(`vendor.actualArrivalDate updated`);
        item.vendor.actualArrivalDate = newDate;
      }
    }
  }

  // Only create transaction if changes were made
  if (changes.length > 0) {
    item.transactions.push({
      type: "adjustment",
      quantity: 0,
      previousQty: item.quantity,
      newQty: item.quantity,
      date: new Date(),
      performedBy: userId,
      notes: `Item edited: ${changes.join(", ")}`,
      vendorRef: item.vendor.name
    });

    await item.save();

    logger.info(
      `Inventory item updated: ${itemId} by ${userName} - Changes: ${changes.join(", ")}`
    );
  }

  const updatedItem = await InventoryItem.findById(item._id)
    .populate("createdBy", "name email")
    .populate("transactions.performedBy", "name email");

  res.status(200).json(updatedItem);
});

/**
 * Delete inventory item (soft delete)
 * @route DELETE /api/v1/inventory/:itemId
 * @access Private (Admin only)
 */
export const deleteInventoryItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const item = await InventoryItem.findOneAndDelete({
    itemId: itemId.toUpperCase()
  });

  if (!item) {
    res.status(404);
    throw new Error("Inventory item not found");
  }

  const userName = (req.user as any).name;

  logger.info(`Inventory item deleted: ${itemId} by ${userName}`);

  res.status(200).json({ message: "Inventory item deleted successfully" });
});
