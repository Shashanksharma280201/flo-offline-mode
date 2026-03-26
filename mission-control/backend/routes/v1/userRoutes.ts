import express from "express";
import {
  getClientsListFromUser,
  getRobotsListFromUser,
  getUser,
  roleHandler,
  syncAppUserWithRobots,
  syncUserWithPathMaps,
  syncUserWithRobots,
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} from "../../controllers/userController";
import protect, { protectAdmin, hasPermission } from "../../middlewares/authMiddleware";

const userRouter = express.Router();

// POST APIs
userRouter.post("/get", protect, getUser);
userRouter.post("/change-role", protectAdmin, roleHandler);
userRouter.post("/syncUserWithRobots", syncUserWithRobots);
userRouter.post("/syncAppUserWithRobots", syncAppUserWithRobots);
userRouter.post("/syncUserWithPathMaps", syncUserWithPathMaps);
userRouter.get("/robots", protect, getRobotsListFromUser);
userRouter.get("/clients", protect, getClientsListFromUser);

// User Management CRUD APIs (Admin only with change_users permission)
userRouter.post("/create", protect, hasPermission("change_users"), createUser);
userRouter.get("/all", protect, hasPermission("change_users"), getAllUsers);
userRouter.get("/:userId", protect, hasPermission("change_users"), getUserById);
userRouter.put("/:userId", protect, hasPermission("change_users"), updateUser);
userRouter.delete("/:userId", protect, hasPermission("change_users"), deleteUser);

export default userRouter;
