import express from "express";

import protect, { hasPermission } from "../../middlewares/authMiddleware";
import {
  addUserToPathMap,
  createPathMap,
  deletePathMap,
  getPathMapsList,
  getMissions,
  removeUserFromPathMap,
  updatePathMap,
  deleteMission,
  createMission,
  updateMission,
  getPathMapById,
  addBoundaryToPathMap,
  triggerMissionViaVoiceHandler
} from "../../controllers/pathMapController";
import { voiceMissionUpload } from "../../services/multer";

const pathMapRouter = express.Router();

// GET APIs
pathMapRouter.get("/", protect, getPathMapsList);
pathMapRouter.get("/get-missions", protect, getMissions);

// POST APIs
pathMapRouter.post("/", protect, getPathMapById);
pathMapRouter.post(
  "/create",
  protect,
  hasPermission("change_missions"),
  createPathMap
);
pathMapRouter.post(
  "/delete",
  protect,
  hasPermission("change_missions"),
  deletePathMap
);
pathMapRouter.post(
  "/add-user",
  protect,
  hasPermission("change_missions"),
  addUserToPathMap
);
pathMapRouter.post(
  "/remove-user",
  protect,
  hasPermission("change_missions"),
  removeUserFromPathMap
);
pathMapRouter.post(
  "/update",
  protect,
  hasPermission("change_missions"),
  updatePathMap
);
pathMapRouter.post(
  "/add-boundary",
  protect,
  hasPermission("change_missions"),
  addBoundaryToPathMap
);
pathMapRouter.post(
  "/update-mission",
  protect,
  hasPermission("change_missions"),
  updateMission
);
pathMapRouter.post(
  "/create-mission",
  protect,
  hasPermission("change_missions"),
  createMission
);
pathMapRouter.post(
  "/delete-mission",
  protect,
  hasPermission("change_missions"),
  deleteMission
);

pathMapRouter.post(
  "/voice-mission",
  protect,
  voiceMissionUpload.single("voiceCommand"),
  triggerMissionViaVoiceHandler
);

export default pathMapRouter;
