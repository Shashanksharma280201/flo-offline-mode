import express from "express";
import {
  createRobot,
  createRobotWithBOM,
  activateRobot,
  addUserToRobot,
  deactivateRobot,
  removeUserFromRobot,
  authenticateRobot,
  uploadImageToRobot,
  addAppUserToRobot,
  removeAppUserFromRobot,
  getRobot,
  getRobots,
  getAllRobotsForAdmin,
  getRobotOperators,
  deleteRobot,
  updateRobot,
  fetchRobotsInRange,
  getRobotsMasterData,
  getManufacturingData,
  updateManufacturingData,
  getMotorData,
  updateMotorData,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  setActiveOperator,
  getRobotPartsConsumed,
  completeBOMInventory,
  getMqttSubscriptionsDiagnostics,
  recreateRobotRoom
} from "../../controllers/robotController";
import protect, {
  hasPermission,
  protectAdmin
} from "../../middlewares/authMiddleware";
import { upload } from "../../services/multer";

const robotRouter = express.Router();

// GET APIs
robotRouter.get("/", protect, getRobots);
robotRouter.get("/all", protect, hasPermission("change_users"), getAllRobotsForAdmin);
robotRouter.get("/master-data", protect, getRobotsMasterData);

// POST APIs
robotRouter.post("/robot", protect, getRobot);
robotRouter.post("/fetchInRange", protect, fetchRobotsInRange);
robotRouter.post("/robot/operators", protect, getRobotOperators);
robotRouter.post(
  "/create",
  protect,
  hasPermission("change_robots"),
  createRobot
);
robotRouter.post(
  "/create-with-bom",
  protect,
  hasPermission("change_robots"),
  createRobotWithBOM
);
robotRouter.post(
  "/update",
  protect,
  hasPermission("change_robots"),
  updateRobot
);
robotRouter.post("/activate", protectAdmin, activateRobot);
robotRouter.post("/deactivate", protectAdmin, deactivateRobot);
robotRouter.post(
  "/add-user",
  protect,
  hasPermission("change_robots"),
  addUserToRobot
);
robotRouter.post(
  "/remove-user",
  protect,
  hasPermission("change_robots"),
  removeUserFromRobot
);
robotRouter.post(
  "/add-appuser",
  protect,
  hasPermission("change_robots"),
  addAppUserToRobot
);
robotRouter.post(
  "/remove-appuser",
  protect,
  hasPermission("change_robots"),
  removeAppUserFromRobot
);
robotRouter.post(
  "/set-active-operator",
  protect,
  hasPermission("change_robots"),
  setActiveOperator
);
robotRouter.post("/authenticate", authenticateRobot);
robotRouter.post(
  "/image-upload",
  protect,
  upload.single("image"),
  uploadImageToRobot
);

robotRouter.delete("/", protect, hasPermission("change_robots"), deleteRobot);

// Manufacturing Data Routes
robotRouter.get("/:robotId/manufacturing-data", protect, getManufacturingData);
robotRouter.put(
  "/:robotId/manufacturing-data",
  protect,
  hasPermission("change_robots"),
  updateManufacturingData
);
robotRouter.post(
  "/:robotId/complete-bom-inventory",
  protect,
  hasPermission("change_robots"),
  completeBOMInventory
);

// Battery-Motor Data Routes
robotRouter.get("/:robotId/motor-data", protect, getMotorData);
robotRouter.put(
  "/:robotId/motor-data",
  protect,
  hasPermission("change_robots"),
  updateMotorData
);

// Tasks Routes
robotRouter.get("/:robotId/tasks", protect, getTasks);
robotRouter.post(
  "/:robotId/tasks",
  protect,
  hasPermission("change_robots"),
  createTask
);
robotRouter.put(
  "/:robotId/tasks/:taskId",
  protect,
  hasPermission("change_robots"),
  updateTask
);
robotRouter.delete(
  "/:robotId/tasks/:taskId",
  protect,
  hasPermission("change_robots"),
  deleteTask
);

robotRouter.get(
  "/:robotId/parts-consumed",
  protect,
  getRobotPartsConsumed
);

// Diagnostic Routes
robotRouter.get(
  "/diagnostics/mqtt-subscriptions",
  protect,
  hasPermission("change_robots"),
  getMqttSubscriptionsDiagnostics
);
robotRouter.post(
  "/diagnostics/recreate-room",
  protect,
  hasPermission("change_robots"),
  recreateRobotRoom
);

export default robotRouter;
