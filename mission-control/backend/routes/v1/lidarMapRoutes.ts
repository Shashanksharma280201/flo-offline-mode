import express from "express";
import protect from "../../middlewares/authMiddleware";
import {
  getAllLidarMaps,
  getLidarMapById,
  getLidarMapByName,
  getPresignedUrl,
  getAllPresignedUrls,
  createLidarMap,
  deleteLidarMap
} from "../../controllers/lidarMapController";

const lidarMapRouter = express.Router();

// GET APIs
lidarMapRouter.get("/", protect, getAllLidarMaps);
lidarMapRouter.get("/:id", protect, getLidarMapById);
lidarMapRouter.get("/name/:name", protect, getLidarMapByName);
lidarMapRouter.get("/:id/all-presigned-urls", protect, getAllPresignedUrls);

// POST APIs
lidarMapRouter.post("/", protect, createLidarMap);
lidarMapRouter.post("/:id/presigned-url", protect, getPresignedUrl);

// DELETE APIs
lidarMapRouter.delete("/:id", protect, deleteLidarMap);

export default lidarMapRouter;
