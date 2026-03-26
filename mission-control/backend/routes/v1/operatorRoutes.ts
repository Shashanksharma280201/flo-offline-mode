import express from "express";

import protect, { hasPermission } from "../../middlewares/authMiddleware";
import {
  getAllOperators,
  getOperatorDetails,
  getOperatorRobots,
  registerOperator,
  fetchOperatorsInRange,
  updateOperatorStatus,
  updateOperatorDetails,
  resetOperatorPassword,
  uploadOperatorDocuments,
  deleteOperatorDocument
} from "../../controllers/operatorController";
import { uploadOperatorDocuments as uploadMiddleware } from "../../middlewares/uploadMiddleware";

const operatorRouter = express.Router();

// POST APIs
operatorRouter.get("/", protect, getAllOperators);
operatorRouter.put("/:id/status", protect, updateOperatorStatus);
operatorRouter.post(
  "/",
  protect,
  hasPermission("change_site_mgmt"),
  registerOperator
);
operatorRouter.post("/fetchInRange", protect, fetchOperatorsInRange);
operatorRouter.post("/operator", protect, getOperatorDetails);
operatorRouter.post("/operator/robots", protect, getOperatorRobots);
operatorRouter.put("/operator/update", protect, updateOperatorDetails);
operatorRouter.post("/reset-password", protect, resetOperatorPassword);

// Upload operator documents (PAN and Aadhar cards)
operatorRouter.post(
  "/:id/documents",
  protect,
  uploadMiddleware,
  uploadOperatorDocuments
);

// Delete a specific operator document
operatorRouter.delete("/:id/documents", protect, deleteOperatorDocument);

export default operatorRouter;
