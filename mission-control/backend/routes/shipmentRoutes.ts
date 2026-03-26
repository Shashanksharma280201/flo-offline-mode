import express from "express";
import {
  getShipments,
  getShipment,
  getShipmentsByRobot,
  getShipmentStats,
  createShipment,
  updateShipment,
  deleteShipment
} from "../controllers/shipmentController";
import protect from "../middlewares/authMiddleware";

const router = express.Router();

// All routes are protected
router.use(protect);

// Stats route (must be before :shipmentId route)
router.get("/stats", getShipmentStats);

// Robot-specific shipments route
router.get("/robot/:robotId", getShipmentsByRobot);

// Main CRUD routes
router.route("/")
  .get(getShipments)
  .post(createShipment);

router.route("/:shipmentId")
  .get(getShipment)
  .patch(updateShipment)
  .delete(deleteShipment); // TODO: Add admin middleware

export default router;
