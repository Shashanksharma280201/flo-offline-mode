import express from "express";

import {
  getMe,
  loginUser,
  registerUser
} from "../../controllers/authController";
import protect from "../../middlewares/authMiddleware";
import { authLimiter } from "../../middlewares/rateLimitMiddleware";

const authRouter = express.Router();

// GET APIs
authRouter.get("/me", protect, getMe);

// POST APIs
authRouter.post("/register", authLimiter, registerUser);
authRouter.post("/login", authLimiter, loginUser);

export default authRouter;
