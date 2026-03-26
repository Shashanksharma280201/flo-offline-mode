import express from "express";

import protect from "../../middlewares/authMiddleware";
import {
  addSensorDataToRobot,
  deleteSensorDataFromRobot,
  fetchBatteryData,
  fetchBatteryDataInRange,
  fetchBatteryErrors,
  fetchDistanceData,
  fetchDistanceDataInRange,
  fetchGnssData,
  fetchGnssDataInRange,
  fetchImuData,
  fetchImuDataInRange,
  fetchMMRData,
  fetchPayloadWeightData,
  fetchProcessedSessionData,
  fetchRobotSessionsInRange,
  fetchVideoFeedData,
  fetchVideoFeedInRange,
  getPresignedUrl
} from "../../controllers/sensorController";

const distanceRouter = express.Router();

// POST APIs
distanceRouter.post("/add", protect, addSensorDataToRobot);
distanceRouter.post(
  "/fetchSessionsInRange",
  protect,
  fetchRobotSessionsInRange
);
distanceRouter.post("/fetchVideos", protect, fetchVideoFeedData);
distanceRouter.post("/fetchDistance", protect, fetchDistanceData);
distanceRouter.post("/fetchMMRData", protect, fetchMMRData);
distanceRouter.post("/fetchPayloadWeight", protect, fetchPayloadWeightData);
distanceRouter.post("/fetchGnss", protect, fetchGnssData);
distanceRouter.post("/fetchBattery", protect, fetchBatteryData);
distanceRouter.post("/fetchImu", protect, fetchImuData);
distanceRouter.post("/fetchBatteryErrors", protect, fetchBatteryErrors);

distanceRouter.post("/fetchDistanceInRange", protect, fetchDistanceDataInRange);
distanceRouter.post("/fetchGnssInRange", protect, fetchGnssDataInRange);
distanceRouter.post("/fetchBatteryInRange", protect, fetchBatteryDataInRange);
distanceRouter.post("/fetchImuInRange", protect, fetchImuDataInRange);
distanceRouter.post("/fetchVideosInRange", protect, fetchVideoFeedInRange);

distanceRouter.post(
  "/fetchProcessedSessionData",
  protect,
  fetchProcessedSessionData
);

distanceRouter.post("/fetch-upload-url", protect, getPresignedUrl);

// DELETE APIs
distanceRouter.delete("/delete", protect, deleteSensorDataFromRobot);

export default distanceRouter;
