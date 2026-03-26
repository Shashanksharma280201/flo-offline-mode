import express from "express";
import {
  getClientMaterials,
  getMaterials,
  insertMaterials,
  updateMaterial,
  updateMaterialStatus
} from "../../controllers/materialController";
import protect, { hasPermission } from "../../middlewares/authMiddleware";

const materialRouter = express.Router();

materialRouter.get("/", protect, getMaterials);
materialRouter.get("/:clientId", protect, getClientMaterials);

materialRouter.put(
  "/:id",
  protect,
  hasPermission("change_site_mgmt"),
  updateMaterial
);

materialRouter.put(
  "/:id/status",
  protect,
  hasPermission("change_site_mgmt"),
  updateMaterialStatus
);

materialRouter.post(
  "/",
  protect,
  hasPermission("change_site_mgmt"),
  insertMaterials
);

export default materialRouter;
