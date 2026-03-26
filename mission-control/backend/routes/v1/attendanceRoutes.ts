import express from "express";
import protect, {
  protectApp,
  protectWebAndApp
} from "../../middlewares/authMiddleware";
import {
  handleOperatorCheckIn,
  fetchAllAttendance,
  fetchAttendance,
  handleOperatorCheckOut,
  clearTodayAttendance,
  getCurrentAttendanceStatus,
  validateCheckIn,
  forceClosePreviousSession,
  checkoutPreviousSession
} from "../../controllers/attendanceController";
import {
  approveOperatorLeaveRequest,
  createLeaveRequest,
  fetchLeaveRequests,
  fetchLeavesOfOperator
} from "../../controllers/appController";
import { fetchAttendanceDataForClients } from "../../controllers/appDataController";

const attendanceRouter = express.Router();

// Attendance - app actions
attendanceRouter.post("/fetch", protectWebAndApp, fetchAttendance);
attendanceRouter.post("/fetchAll", protect, fetchAllAttendance);
attendanceRouter.post("/check-in", protectApp, handleOperatorCheckIn);
attendanceRouter.post("/check-out", protectApp, handleOperatorCheckOut);
attendanceRouter.post("/current-status", protectApp, getCurrentAttendanceStatus);
attendanceRouter.post("/validate-check-in", protectApp, validateCheckIn);

attendanceRouter.post("/leaves/fetch", protectApp, fetchLeavesOfOperator);
attendanceRouter.post(
  "/leaves/requests/create",
  protectApp,
  createLeaveRequest
);
attendanceRouter.post(
  "/leaves/requests/fetch",
  protectWebAndApp,
  fetchLeaveRequests
);

attendanceRouter.post(
  "/leaves/approve-leave",
  protect,
  approveOperatorLeaveRequest
);

attendanceRouter.post("/client", protect, fetchAttendanceDataForClients);

// Force-close previous unclosed session
attendanceRouter.post("/force-close-previous-session", protectApp, forceClosePreviousSession);

// Check out from previous day's session
attendanceRouter.post("/checkout-previous-session", protectApp, checkoutPreviousSession);

// TESTING ONLY - Clear today's attendance records
attendanceRouter.post("/clear-today", protectApp, clearTodayAttendance);

export default attendanceRouter;
