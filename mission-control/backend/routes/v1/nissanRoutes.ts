import express from "express";
import {
  addDataHandler,
  fetchCrackImages,
  fetchCrosswalkBlurImages,
  fetchLeaningPoleImages,
  fetchPoleImages,
  fetchPotholeImages,
  fetchSessionsInRange,
  fetchSystemMetrics,
  fetchWhitelineBlurImages,
  fetchImageUrl
} from "../../controllers/nissanController";

const nissanRouter = express.Router();

nissanRouter.post("/add", addDataHandler);
nissanRouter.post("/fetchSessionsInRange", fetchSessionsInRange);
nissanRouter.get("/:deviceId/:sessionId/system-metrics", fetchSystemMetrics);
nissanRouter.get("/:deviceId/:sessionId/crack", fetchCrackImages);
nissanRouter.get("/:deviceId/:sessionId/pole", fetchPoleImages);
nissanRouter.get("/:deviceId/:sessionId/pothole", fetchPotholeImages);
nissanRouter.get(
  "/:deviceId/:sessionId/crosswalk-blur",
  fetchCrosswalkBlurImages
);
nissanRouter.get("/:deviceId/:sessionId/leaning-pole", fetchLeaningPoleImages);
nissanRouter.get(
  "/:deviceId/:sessionId/white-line-blur",
  fetchWhitelineBlurImages
);
nissanRouter.post("/images/fetchImageUrl", fetchImageUrl);

export default nissanRouter;
