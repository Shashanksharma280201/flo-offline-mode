import express from "express";
import {
  createOvertimeRequest,
  getMyOvertimeRequests,
  getActiveOvertimeSession,
  getPendingRequests,
  approveOvertimeRequest,
  rejectOvertimeRequest,
  updateApprovedDuration,
  updateActiveSessionDuration,
  getActiveSessions,
  getOvertimeHistory,
  getOvertimeAnalytics,
  checkInOvertimeSession,
  checkOutOvertimeSession,
  getCurrentOvertimeStatus
} from "../controllers/overtimeController";

const router = express.Router();

// Operator routes
router.post("/request", createOvertimeRequest);
router.get("/my-requests", getMyOvertimeRequests);
router.get("/active-session", getActiveOvertimeSession);

// NEW: Overtime check-in/check-out routes (separate from regular attendance)
router.post("/check-in", checkInOvertimeSession);
router.post("/check-out", checkOutOvertimeSession);
router.post("/current-status", getCurrentOvertimeStatus);

// Admin routes
router.get("/admin/pending", getPendingRequests);
router.post("/admin/approve/:requestId", approveOvertimeRequest);
router.post("/admin/reject/:requestId", rejectOvertimeRequest);
router.patch("/admin/update-duration/:requestId", updateApprovedDuration);
router.patch("/admin/update-active-session/:sessionId", updateActiveSessionDuration);
router.get("/admin/active-sessions", getActiveSessions);
router.get("/admin/history", getOvertimeHistory);
router.get("/admin/analytics", getOvertimeAnalytics);

export default router;
