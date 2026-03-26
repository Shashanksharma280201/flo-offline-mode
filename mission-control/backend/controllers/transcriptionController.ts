import asyncHandler from "express-async-handler";
import { openai } from "../services/ai";
import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import { fileURLToPath } from "url";
import os from "os";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const transcribeAudio = asyncHandler(
  async (req: Request, res: Response) => {
    const { audioData } = req.body;

    if (!audioData) {
      res.status(400);
      throw new Error("Audio data is required");
    }

    try {
      // Convert base64 to buffer
      const base64Data = audioData.replace(/^data:audio\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Create temp file in OS temp directory (more reliable)
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `audio-${Date.now()}.webm`);
      fs.writeFileSync(tempFilePath, buffer);

      // Create a File-like object for OpenAI
      const fileStream = fs.createReadStream(tempFilePath);

      // Transcribe using Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: "whisper-1",
        language: "en"
      });

      // Delete temp file
      fs.unlinkSync(tempFilePath);

      res.json({ text: transcription.text });
    } catch (error: any) {
      console.error("Transcription error:", error);
      res.status(500);
      throw new Error(
        error.message || "Error transcribing audio"
      );
    }
  }
);
