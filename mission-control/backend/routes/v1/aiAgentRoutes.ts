import express from "express";
import protect from "../../middlewares/authMiddleware";
import { voiceMissionUpload } from "../../services/multer";
import {
  handleAICommand,
  handleAITextCommand,
  getAIChatHistory,
  clearAIChatHistory
} from "../../controllers/aiAgentController";

const router = express.Router();

/**
 * AI Agent Routes
 * Handles voice commands and AI-powered interactions
 */

// @route   POST /api/v1/ai-agent/command
// @desc    Process voice command and execute AI actions
// @access  Private
router.post("/command", protect, voiceMissionUpload.single("audio"), handleAICommand);

// @route   POST /api/v1/ai-agent/command-text
// @desc    Process text command (for testing without audio)
// @access  Private
router.post("/command-text", protect, handleAITextCommand);

// @route   GET /api/v1/ai-agent/history
// @desc    Get AI chat history (optional feature for future)
// @access  Private
router.get("/history", protect, getAIChatHistory);

// @route   DELETE /api/v1/ai-agent/history
// @desc    Clear AI chat history (optional feature for future)
// @access  Private
router.delete("/history", protect, clearAIChatHistory);

export default router;
