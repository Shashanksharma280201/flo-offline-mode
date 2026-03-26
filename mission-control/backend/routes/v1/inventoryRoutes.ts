import express from "express";
import {
  getInventoryItems,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  updateInventoryQuantity,
  getInventoryStats,
  deleteInventoryItem
} from "../../controllers/inventoryController";
import protect, { hasPermission } from "../../middlewares/authMiddleware";

const inventoryRouter = express.Router();

// GET routes
inventoryRouter.get("/", protect, getInventoryItems);
inventoryRouter.get("/stats", protect, getInventoryStats);
inventoryRouter.get("/:itemId", protect, getInventoryItem);

// POST routes
inventoryRouter.post(
  "/",
  protect,
  hasPermission("change_robots"), // Reusing existing permission for now
  createInventoryItem
);

// PUT routes
inventoryRouter.put(
  "/:itemId",
  protect,
  hasPermission("change_robots"),
  updateInventoryItem
);

// PATCH routes
inventoryRouter.patch(
  "/:itemId/quantity",
  protect,
  hasPermission("change_robots"),
  updateInventoryQuantity
);

// DELETE routes
inventoryRouter.delete(
  "/:itemId",
  protect,
  hasPermission("change_robots"),
  deleteInventoryItem
);

export default inventoryRouter;
