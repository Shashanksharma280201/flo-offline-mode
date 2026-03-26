import express from "express";
import protect from "../../middlewares/authMiddleware";
import {
  getBaseStations,
  registerBaseStation
} from "../../controllers/baseStationController";

const baseStationRouter = express.Router();

// POST APIs
baseStationRouter.get("/", protect, getBaseStations);
baseStationRouter.post("/register", protect, registerBaseStation);

export default baseStationRouter;
