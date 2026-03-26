import express from "express";
import protect, { hasPermission } from "../../middlewares/authMiddleware";
import {
  addLeadHandler,
  fetchLeadsHandler,
  addResponseHandler,
  updateResponseHandler,
  deleteResponseHandler,
  deleteLeadHandler,
  updateLeadHandler,
  addPlanHandler,
  addStepHandler,
  updateStepHandler,
  deleteStepHandler,
  updatePlanHandler,
  fetchLeadHandler,
  addLeadsHandler,
  addTargetChangeHandler,
  updateTargetChangeHandler,
  deleteTargetChangeHandler,
  downloadLeadsHandler,
  generateWeekByWeekData,
  mergeLeadsHandler
} from "../../controllers/leadsController";

const leadsRouter = express.Router();

leadsRouter.get("/", protect, hasPermission("view_leads"), fetchLeadsHandler);

leadsRouter.post(
  "/get-weekly-report",
  protect,
  hasPermission("view_leads"),
  generateWeekByWeekData
);
leadsRouter.post("/", protect, hasPermission("change_leads"), addLeadHandler);
leadsRouter.get(
  "/download",
  protect,
  hasPermission("change_leads"),
  downloadLeadsHandler
);
leadsRouter.post(
  "/many",
  protect,
  hasPermission("change_leads"),
  addLeadsHandler
);
leadsRouter.get("/:id", protect, hasPermission("view_leads"), fetchLeadHandler);
leadsRouter.put(
  "/:id",
  protect,
  hasPermission("change_leads"),
  updateLeadHandler
);
leadsRouter.delete(
  "/:id",
  protect,
  hasPermission("change_leads"),
  deleteLeadHandler
);

leadsRouter.post(
  "/:id/responses",
  protect,
  hasPermission("change_leads"),
  addResponseHandler
);
leadsRouter.put(
  "/:id/responses/:responseId",
  protect,
  hasPermission("change_leads"),
  updateResponseHandler
);
leadsRouter.delete(
  "/:id/responses/:responseId",
  protect,
  hasPermission("change_leads"),
  deleteResponseHandler
);

leadsRouter.post(
  "/:id/steps",
  protect,
  hasPermission("change_leads"),
  addStepHandler
);
leadsRouter.put(
  "/:id/steps/:stepId",
  protect,
  hasPermission("change_leads"),
  updateStepHandler
);
leadsRouter.delete(
  "/:id/steps/:stepId",
  protect,
  hasPermission("change_leads"),
  deleteStepHandler
);

leadsRouter.post(
  "/:id/plan",
  protect,
  hasPermission("change_leads"),
  addPlanHandler
);
leadsRouter.put(
  "/:id/plan",
  protect,
  hasPermission("change_leads"),
  updatePlanHandler
);

leadsRouter.post(
  "/:id/targetChange",
  protect,
  hasPermission("change_leads"),
  addTargetChangeHandler
);
leadsRouter.put(
  "/:id/targetChange/:targetId",
  protect,
  hasPermission("change_leads"),
  updateTargetChangeHandler
);
leadsRouter.delete(
  "/:id/targetChange/:targetId",
  protect,
  hasPermission("change_leads"),
  deleteTargetChangeHandler
);
leadsRouter.post(
  "/merge-leads",
  protect,
  hasPermission("change_leads"),
  mergeLeadsHandler
);
export default leadsRouter;
