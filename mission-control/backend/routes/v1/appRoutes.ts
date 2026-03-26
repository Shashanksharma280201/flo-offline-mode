import express from "express";
import {
  updatePasswordForAppUser,
  loginAppUser,
  getClientDetails,
  fetchApkUrl,
  fetchApkVersion
} from "../../controllers/appController";

import protect, {
  protectApp,
  protectAdmin
} from "../../middlewares/authMiddleware";

import {
  createAppData,
  deleteAppDataFromRobot,
  fetchProcessedAppDataInRange,
  getRobots,
  getRobotsList,
  insertManyAppData,
  createDowntimeData
} from "../../controllers/appDataController";

const appRouter = express.Router();
// Apk Route
appRouter.get("/apk", fetchApkUrl);
appRouter.get("/version", fetchApkVersion);

// App APIs
appRouter.post("/login", loginAppUser);
appRouter.post("/updatePassword", updatePasswordForAppUser);
appRouter.get("/client", protectApp, getClientDetails);
appRouter.get("/robots", protectApp, getRobotsList);

// App Data
appRouter.post("/data/downtime", protectApp, createDowntimeData);
appRouter.post("/data/create", protectApp, createAppData);
appRouter.post("/data/insertMany", protectApp, insertManyAppData);
appRouter.post(
  "/data/fetchSessionsInRange",
  protect,
  fetchProcessedAppDataInRange
);
appRouter.post("/data/robots", protect, getRobots);

appRouter.delete("/data/delete", protectAdmin, deleteAppDataFromRobot);

export default appRouter;
