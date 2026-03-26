import express from "express";
import protect from "../../middlewares/authMiddleware";
import {
  createBilling,
  getBillingSummary,
  getLatestRobotBilling,
  getRobotBillingHistory,
  updateRobotBilling
} from "../../controllers/billingController";

const billingRouter = express.Router();
billingRouter.post("/create", protect, createBilling);
billingRouter.post("/update/:robotId", protect, updateRobotBilling);
billingRouter.get("/history/:robotId", protect, getRobotBillingHistory);
billingRouter.get("/latest/:robotId", protect, getLatestRobotBilling);
billingRouter.get("/summary", protect, getBillingSummary);

export default billingRouter;
