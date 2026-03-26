import express from "express";
import {
  createSubmission,
  updateSubmission,
  submitQC,
  getLatestQCForRobot,
  getQCHistoryForRobot,
  getSubmissionById,
  deleteSubmission,
  uploadQCImage,
  approveQCSubmission,
  getQCTemplateForRobot
} from "../../controllers/qcController";
import protect from "../../middlewares/authMiddleware";
import { protectAdmin } from "../../middlewares/authMiddleware";
import { qcImageUpload } from "../../services/multer";

const qcRouter = express.Router();

// QC Image Upload route (must come before parameterized routes)
qcRouter.post("/upload-image", protect, qcImageUpload.array("files", 5), uploadQCImage);

// QC Submission routes
qcRouter.post("/submissions", protect, createSubmission);
qcRouter.put("/submissions/:submissionId", protect, updateSubmission);
qcRouter.post("/submissions/:submissionId/submit", protect, submitQC);
qcRouter.get("/submissions/robot/:robotId", protect, getLatestQCForRobot);
qcRouter.get("/submissions/robot/:robotId/history", protect, getQCHistoryForRobot);
qcRouter.get("/submissions/:submissionId", protect, getSubmissionById);
qcRouter.delete("/submissions/:submissionId", protect, protectAdmin, deleteSubmission);

// QC Approval route
qcRouter.post("/submissions/:submissionId/approve", protect, protectAdmin, approveQCSubmission);

// Robot specific QC Template lookup
qcRouter.get("/robot/:robotId/template", protect, getQCTemplateForRobot);

export default qcRouter;
