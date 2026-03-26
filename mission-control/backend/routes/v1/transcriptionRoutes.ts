import express from "express";
import protect from "../../middlewares/authMiddleware";
import { transcribeAudio } from "../../controllers/transcriptionController";

const transcriptionRouter = express.Router();

transcriptionRouter.post("/transcribe", protect, transcribeAudio);

export default transcriptionRouter;
