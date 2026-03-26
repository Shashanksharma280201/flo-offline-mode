import express from "express";
import protect from "../../middlewares/authMiddleware";
import { get2DMap, getMapMetadata } from "../../controllers/mapController";

const mapRouter = express.Router();

// GET APIs
mapRouter.get("/:mapName/2d", protect, get2DMap);
mapRouter.get("/:mapName/metadata", protect, getMapMetadata);

export default mapRouter;
