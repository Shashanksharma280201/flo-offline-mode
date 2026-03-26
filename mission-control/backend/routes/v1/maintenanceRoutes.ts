import express, { Request, Response, NextFunction } from "express";
import protect, { protectApp } from "../../middlewares/authMiddleware";
import { maintenanceUpload } from "../../services/multer";
import {
  createRobotMaintenanceEntry,
  fetchAllMaintenanceEntries,
  fetchMaintenanceSteps,
  fetchSingleMaintenanceEntry
} from "../../controllers/maintenanceController";

const maintenanceRouter = express.Router();

// Multer error handler middleware
const handleMulterError = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File size too large. Maximum file size is 50MB."
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        error: "Too many files. Maximum 50 files allowed."
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        error: "Unexpected field in file upload."
      });
    }
    if (err.message) {
      return res.status(400).json({
        error: err.message
      });
    }
    return res.status(500).json({
      error: "File upload failed. Please try again."
    });
  }
  next();
};

// Robot Services
maintenanceRouter.post(
  "/",
  protectApp,
  (req: Request, res: Response, next: NextFunction) => {
    const upload = maintenanceUpload.array("maintenanceImages", 50);
    upload(req, res, (err: any) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  createRobotMaintenanceEntry
);

maintenanceRouter.post("/fetchSteps", protectApp, fetchMaintenanceSteps);

maintenanceRouter.post("/fetchAll", protect, fetchAllMaintenanceEntries);
maintenanceRouter.post("/fetchOne", protect, fetchSingleMaintenanceEntry);

export default maintenanceRouter;
