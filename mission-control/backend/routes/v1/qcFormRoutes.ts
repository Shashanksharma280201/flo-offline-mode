import express from "express";
import {
  createFormTemplate,
  updateFormTemplate,
  activateFormTemplate,
  getFormTemplates,
  getActiveFormTemplate,
  getFormTemplateById,
  deleteFormTemplate
} from "../../controllers/qcFormController";
import { seedQCFormTemplate } from "../../controllers/seedQCController";
import protect, { hasPermission } from "../../middlewares/authMiddleware";

const qcFormRouter = express.Router();

qcFormRouter.get("/active", protect, getActiveFormTemplate);

qcFormRouter.post(
  "/seed",
  protect,
  hasPermission("manage_qc_templates"),
  seedQCFormTemplate
);

qcFormRouter.post(
  "/",
  protect,
  hasPermission("manage_qc_templates"),
  createFormTemplate
);

qcFormRouter.put(
  "/:formId",
  protect,
  hasPermission("manage_qc_templates"),
  updateFormTemplate
);

qcFormRouter.post(
  "/:formId/activate",
  protect,
  hasPermission("manage_qc_templates"),
  activateFormTemplate
);

qcFormRouter.get(
  "/",
  protect,
  hasPermission("manage_qc_templates"),
  getFormTemplates
);

qcFormRouter.get("/:formId", protect, getFormTemplateById);

qcFormRouter.delete(
  "/:formId",
  protect,
  hasPermission("manage_qc_templates"),
  deleteFormTemplate
);

export default qcFormRouter;
