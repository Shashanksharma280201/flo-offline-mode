import express, { Request, Response, NextFunction } from "express";
import {
  addMaintenanceStep,
  deleteMaintenanceStep,
  getFleets,
  updateMaintenanceStep,
  fetchMaintenanceSteps,
  getFleetRobots,
  addFleet,
  updateFleetMetadata,
  uploadMaintenanceStepReference,
  deleteMaintenanceStepReference,
  updateFleetPartsConsumption,
  updateFleetSensors,
  linkFleetQCTemplate,
  getFleetPartsRequirement
} from "../../controllers/fleetController";
import protect, { hasPermission } from "../../middlewares/authMiddleware";
import { maintenanceReferenceUpload } from "../../services/multer";
import fleetModel from "../../models/fleetModel";

const fleetRouter = express.Router();

// POST APIs
fleetRouter.get("/", protect, getFleets);
fleetRouter.post("/", protect, hasPermission("change_fleet"), addFleet);
fleetRouter.put("/:id", protect, hasPermission("change_fleet"), updateFleetMetadata);
fleetRouter.get("/:id/robots", protect, getFleetRobots);
fleetRouter.get("/:id/maintenance", protect, fetchMaintenanceSteps);
fleetRouter.post(
  "/:id/maintenance",
  protect,
  hasPermission("change_fleet"),
  addMaintenanceStep
);
fleetRouter.put(
  "/:id/maintenance/:stepId",
  protect,
  hasPermission("change_fleet"),
  updateMaintenanceStep
);
fleetRouter.delete(
  "/:id/maintenance/:stepId",
  protect,
  hasPermission("change_fleet"),
  deleteMaintenanceStep
);

// Multer error handler middleware for reference image uploads
const handleMulterError = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File size too large. Maximum file size is 5MB for reference images."
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

// Middleware to fetch and attach step tag before upload
const attachStepTag = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, stepId } = req.params;
    const fleet = await fleetModel.findById(id);

    if (!fleet) {
      return res.status(404).json({ error: "Fleet not found" });
    }

    const step = fleet.maintenanceSteps.find(
      (s: any) => s._id.toString() === stepId
    );

    if (!step) {
      return res.status(404).json({ error: "Maintenance step not found" });
    }

    // Store in custom property (not req.body, as Multer will overwrite it)
    (req as any).stepInfo = {
      stepTag: step.tag,
      fleetId: id
    };
    next();
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch step information" });
  }
};

// Upload reference image for maintenance step
fleetRouter.post(
  "/:id/maintenance/:stepId/reference",
  protect,
  hasPermission("change_fleet"),
  attachStepTag,
  (req: Request, res: Response, next: NextFunction) => {
    const upload = maintenanceReferenceUpload.single("referenceImage");
    upload(req, res, (err: any) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  uploadMaintenanceStepReference
);

// Delete reference image for maintenance step
fleetRouter.delete(
  "/:id/maintenance/:stepId/reference",
  deleteMaintenanceStepReference
);

// Fleet Configuration APIs (Phase 2)
fleetRouter.put(
  "/:id/parts-consumption",
  protect,
  hasPermission("change_fleet"),
  updateFleetPartsConsumption
);

fleetRouter.put(
  "/:id/sensors",
  protect,
  hasPermission("change_fleet"),
  updateFleetSensors
);

fleetRouter.put(
  "/:id/qc-template",
  protect,
  hasPermission("change_fleet"),
  linkFleetQCTemplate
);

fleetRouter.get(
  "/:id/parts-requirement",
  protect,
  getFleetPartsRequirement
);

export default fleetRouter;
