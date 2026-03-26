import express from "express";
import protect, {
  hasPermission,
  protectApp,
  protectWebAndApp
} from "../../middlewares/authMiddleware";
import {
  closeRobotIssue,
  exportIssuesForExcel,
  fetchIssueMessageAttachments,
  fetchIssueWithAttachments,
  fetchRobotIssueThread,
  fetchRobotIssues,
  queryRobotIssues,
  raiseRobotIssue,
  sendMessageToIssueThread,
  updateIssueData
} from "../../controllers/issueController";
import { issueUpload } from "../../services/multer";

const issueRouter = express.Router();

issueRouter.post(
  "/open",
  protectApp,
  issueUpload.array("issueMedia", 20),
  raiseRobotIssue
);
issueRouter.post("/", protectWebAndApp, fetchRobotIssues);
issueRouter.post("/query", protect, queryRobotIssues);
issueRouter.get("/export", protect, exportIssuesForExcel);
issueRouter.post("/issue", protectWebAndApp, fetchRobotIssueThread);
issueRouter.post(
  "/thread",
  protectWebAndApp,
  hasPermission("change_issues"),
  issueUpload.array("issueMedia", 20),
  sendMessageToIssueThread
);

issueRouter.put("/:id", protect, updateIssueData);

issueRouter.get("/issue/attachments", protect, fetchIssueWithAttachments);
issueRouter.post(
  "/issue/close",
  protect,
  hasPermission("change_issues"),
  closeRobotIssue
);

issueRouter.post(
  "/thread/attachments",
  protectApp,
  fetchIssueMessageAttachments
);

export default issueRouter;
