import express from "express";
import {
  handleAutonomyCommand,
  handleAutonomyTextCommand,
  getConversationHistory,
  clearConversation
} from "../../controllers/autonomyAgentController";
import protect from "../../middlewares/authMiddleware";
import { voiceMissionUpload } from "../../services/multer";

const autonomyAgentRouter = express.Router();

/**
 * POST /api/v1/autonomy-agent/command
 * Handle voice command for operational tasks
 * Requires audio file (WAV format)
 */
autonomyAgentRouter.post(
  "/command",
  protect,
  voiceMissionUpload.single("file"),
  handleAutonomyCommand
);

/**
 * POST /api/v1/autonomy-agent/command-text
 * Handle text command for operational tasks (disambiguation choices, no audio)
 * Continues an existing conversation identified by conversationId
 */
autonomyAgentRouter.post(
  "/command-text",
  protect,
  handleAutonomyTextCommand
);

/**
 * GET /api/v1/autonomy-agent/conversation/:conversationId
 * Get conversation history (for debugging)
 */
autonomyAgentRouter.get(
  "/conversation/:conversationId",
  protect,
  getConversationHistory
);

/**
 * DELETE /api/v1/autonomy-agent/conversation/:conversationId
 * Clear conversation state
 */
autonomyAgentRouter.delete(
  "/conversation/:conversationId",
  protect,
  clearConversation
);

export default autonomyAgentRouter;
