import express from "express";
import {
  createClient,
  addUserToClient,
  removeUserFromClient,
  getClientDetails,
  removeAppUserFromClient,
  addAppUserToClient,
  updateLocation,
  getClients,
  getSelectedClientDetails,
  updateClient,
  getClientOperators,
  moveOperatorBetweenClients,
  addMaterialsToClient,
  removeMaterialFromClient,
  updateClientStatus,
  validateClientIds
} from "../../controllers/clientController";
import protect, { hasPermission } from "../../middlewares/authMiddleware";

const clientRouter = express.Router();

// POST APIs
clientRouter.get("/", protect, getClientDetails);
clientRouter.get("/:clientId/operators", protect, getClientOperators);
clientRouter.get("/fetchAll", protect, getClients);
clientRouter.get("/:clientId", protect, getSelectedClientDetails);
clientRouter.post(
  "/update",
  protect,
  hasPermission("change_site_mgmt"),
  updateClient
);
clientRouter.post(
  "/create",
  protect,
  hasPermission("change_site_mgmt"),
  createClient
);
clientRouter.post(
  "/add-user",
  protect,
  hasPermission("change_site_mgmt"),
  addUserToClient
);
clientRouter.post(
  "/remove-user",
  protect,
  hasPermission("change_site_mgmt"),
  removeUserFromClient
);
clientRouter.post(
  "/add-appuser",
  protect,
  hasPermission("change_site_mgmt"),
  addAppUserToClient
);
clientRouter.post(
  "/add-materials",
  protect,
  hasPermission("change_site_mgmt"),
  addMaterialsToClient
);
clientRouter.post(
  "/remove-material",
  protect,
  hasPermission("change_site_mgmt"),
  removeMaterialFromClient
);
clientRouter.post(
  "/move-operator",
  protect,
  hasPermission("change_site_mgmt"),
  moveOperatorBetweenClients
);
clientRouter.post(
  "/remove-appuser",
  protect,
  hasPermission("change_site_mgmt"),
  removeAppUserFromClient
);
clientRouter.post(
  "/update-location",
  protect,
  hasPermission("change_site_mgmt"),
  updateLocation
);
clientRouter.post(
  "/",
  protect,
  hasPermission("change_site_mgmt"),
  updateLocation
);
clientRouter.put(
  "/:id/status",
  protect,
  hasPermission("change_site_mgmt"),
  updateClientStatus
);
clientRouter.post("/validate", protect, validateClientIds);

export default clientRouter;
