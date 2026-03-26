import express from "express";

import { loginANXUser, getMe } from "../../controllers/anxController";
import { protectAnx } from "../../middlewares/authMiddleware";

const anxRouter = express.Router();

// POST APIs
anxRouter.post("/login", loginANXUser);
anxRouter.post("/me", protectAnx, getMe);

export default anxRouter;
