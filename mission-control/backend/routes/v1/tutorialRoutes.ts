import express from "express";
import {
  createTutorial,
  deleteTutorial,
  getTutorials,
  updateTutorial
} from "../../controllers/tutorialController";
import protect, {
  hasPermission,
  protectWebAndApp
} from "../../middlewares/authMiddleware";

const tutorialRouter = express.Router();

tutorialRouter.get("/", protectWebAndApp, getTutorials);
tutorialRouter.post(
  "/",
  protect,
  hasPermission("change_tutorials"),
  createTutorial
);
tutorialRouter.put(
  "/:id",
  protect,
  hasPermission("change_tutorials"),
  updateTutorial
);
tutorialRouter.delete(
  "/:id",
  protect,
  hasPermission("change_tutorials"),
  deleteTutorial
);

export default tutorialRouter;
