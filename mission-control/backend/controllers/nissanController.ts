import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import CrackModel from "../models/nissan/crackModel";
import LeaningPoleModel from "../models/nissan/leaningPole";
import PoleModel from "../models/nissan/poleModel";
import PotholeModel from "../models/nissan/potholeModel";
import CrosswalkBlurModel from "../models/nissan/crosswalkBlurModel";
import WhiteLineBlurModel from "../models/nissan/whiteLineBlur";
import nissanModel from "../models/nissan/nissanModel";
import NissanSystemMetrics from "../models/nissan/nissanSystemMetrics";
import logger from "../utils/logger";
import robotModel from "../models/robotModel";
import { fetchMediaUrl } from "../utils/fetchAzureMedia";

export const addDataHandler = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      timestamp,
      sessionId,
      deviceId,
      metrics,
      gps,
      cracks,
      poles,
      potHoles,
      crosswalkBlurs,
      whitelineBlurs,
      leaningPoles
    } = req.body;

    if (
      !timestamp ||
      !deviceId ||
      !metrics ||
      !gps ||
      !cracks ||
      !poles ||
      !potHoles ||
      !crosswalkBlurs ||
      !whitelineBlurs ||
      !leaningPoles
    ) {
      res.status(400);
      throw new Error("Missing one or more required fields in request body.");
    }

    await nissanModel.deleteMany({
      "metadata.deviceId": deviceId,
      "metadata.sessionId": sessionId
    });

    const [crack] = await CrackModel.create(
      [{ sessionId, deviceId, images: cracks }],
      { session }
    );
    const [pole] = await PoleModel.create(
      [{ sessionId, deviceId, images: poles }],
      { session }
    );
    const [pothole] = await PotholeModel.create(
      [{ sessionId, deviceId, images: potHoles }],
      { session }
    );
    const [crosswalkBlur] = await CrosswalkBlurModel.create(
      [{ sessionId, deviceId, images: crosswalkBlurs }],
      { session }
    );
    const [whiteLineBlur] = await WhiteLineBlurModel.create(
      [{ sessionId, deviceId, images: whitelineBlurs }],
      { session }
    );
    const [leaningPole] = await LeaningPoleModel.create(
      [{ sessionId, deviceId, images: leaningPoles }],
      { session }
    );
    const [sensorReading] = await NissanSystemMetrics.create(
      [{ sessionId, deviceId, metrics, gps }],
      { session }
    );

    if (
      !crack ||
      !leaningPole ||
      !pole ||
      !pothole ||
      !crosswalkBlur ||
      !whiteLineBlur ||
      !sensorReading
    ) {
      res.status(400);
      throw new Error("Error creating one or more sub-documents.");
    }

    await session.commitTransaction();
    session.endSession();

    // ⬇️ Insert into time-series collection *outside* the transaction
    const nissanMetaData = {
      deviceId,
      sessionId,
      sensorReading: sensorReading._id,
      cracks: crack._id,
      pole: pole._id,
      potHole: pothole._id,
      crosswalkBlur: crosswalkBlur._id,
      whitelineBlur: whiteLineBlur._id,
      leaningPole: leaningPole._id
    };

    const nissanData = {
      metadata: nissanMetaData,
      timestamp
    };

    const [response] = await nissanModel.create([nissanData]); // no session here
    res.status(201).json(response);
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    logger.error(`Error inserting Nissan data: ${error}`);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

export const fetchSessionsInRange = asyncHandler(async (req, res) => {
  const { startingTimestamp, endingTimestamp, deviceId } = req.body;
  if (!startingTimestamp || !endingTimestamp) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  const robot = await robotModel.findById(deviceId);
  if (!robot) {
    res.status(404);
    throw new Error("No Device found for the specified Id");
  }

  const sensorData = await nissanModel.find({
    "metadata.deviceId": deviceId,
    timestamp: { $gte: startingTimestamp, $lte: endingTimestamp }
  });

  if (sensorData) {
    // Return the fetched sensor data in the response body
    res.status(200).json(sensorData);
  } else {
    res.status(400);
    throw new Error("No Sensor Reading found for the specified session");
  }
});

export const fetchCrackImages = asyncHandler(async (req, res) => {
  const { deviceId, sessionId } = req.params;
  if (!sessionId || !deviceId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  const robot = await robotModel.findById(deviceId);
  if (!robot) {
    res.status(404);
    throw new Error("No Device found for the specified Id");
  }

  const cracks = await CrackModel.findOne({
    deviceId,
    sessionId
  }).select("images");

  if (!cracks) {
    res.status(404);
    throw new Error("No Cracks found for the specified session");
  }
  res.status(200).json(cracks.images);
});

export const fetchPoleImages = asyncHandler(async (req, res) => {
  const { deviceId, sessionId } = req.params;
  if (!sessionId || !deviceId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  const robot = await robotModel.findById(deviceId);
  if (!robot) {
    res.status(404);
    throw new Error("No Device found for the specified Id");
  }
  const poles = await PoleModel.findOne({
    deviceId,
    sessionId
  }).select("images");
  if (!poles) {
    res.status(404);
    throw new Error("No Poles found for the specified session");
  }
  res.status(200).json(poles.images);
});

export const fetchPotholeImages = asyncHandler(async (req, res) => {
  const { deviceId, sessionId } = req.params;
  if (!sessionId || !deviceId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  const robot = await robotModel.findById(deviceId);
  if (!robot) {
    res.status(404);
    throw new Error("No Device found for the specified Id");
  }
  const potholes = await PotholeModel.findOne({
    deviceId,
    sessionId
  }).select("images");
  if (!potholes) {
    res.status(404);
    throw new Error("No Potholes found for the specified session");
  }
  res.status(200).json(potholes.images);
});

export const fetchCrosswalkBlurImages = asyncHandler(async (req, res) => {
  const { deviceId, sessionId } = req.params;
  if (!sessionId || !deviceId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  const robot = await robotModel.findById(deviceId);
  if (!robot) {
    res.status(404);
    throw new Error("No Device found for the specified Id");
  }
  const crosswalkBlurs = await CrosswalkBlurModel.findOne({
    deviceId,
    sessionId
  }).select("images");
  if (!crosswalkBlurs) {
    res.status(404);
    throw new Error("No CrosswalkBlurs found for the specified session");
  }
  res.status(200).json(crosswalkBlurs.images);
});

export const fetchWhitelineBlurImages = asyncHandler(async (req, res) => {
  const { deviceId, sessionId } = req.params;
  if (!sessionId || !deviceId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  const robot = await robotModel.findById(deviceId);
  if (!robot) {
    res.status(404);
    throw new Error("No Device found for the specified Id");
  }
  const whitelineBlurs = await WhiteLineBlurModel.findOne({
    deviceId,
    sessionId
  }).select("images");
  if (!whitelineBlurs) {
    res.status(404);
    throw new Error("No whitelineBlurs found for the specified session");
  }
  res.status(200).json(whitelineBlurs.images);
});

export const fetchLeaningPoleImages = asyncHandler(async (req, res) => {
  const { deviceId, sessionId } = req.params;
  if (!sessionId || !deviceId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  const robot = await robotModel.findById(deviceId);
  if (!robot) {
    res.status(404);
    throw new Error("No Device found for the specified Id");
  }
  const leaningPoles = await LeaningPoleModel.findOne({
    deviceId,
    sessionId
  }).select("images");
  if (!leaningPoles) {
    res.status(404);
    throw new Error("No leaningPoles found for the specified session");
  }
  res.status(200).json(leaningPoles.images);
});

export const fetchSystemMetrics = asyncHandler(async (req, res) => {
  const { deviceId, sessionId } = req.params;
  if (!sessionId || !deviceId) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  const robot = await robotModel.findById(deviceId);
  if (!robot) {
    res.status(404);
    throw new Error("No Device found for the specified Id");
  }
  const sensorReading = await NissanSystemMetrics.findOne({
    deviceId,
    sessionId
  }).select("metrics gps");
  if (!sensorReading) {
    res.status(404);
    throw new Error("No Sensor Reading found for the specified session");
  }
  res.status(200).json(sensorReading);
});

export const fetchImageUrl = asyncHandler(async (req, res) => {
  const { imagePath } = req.body;
  if (!imagePath) {
    res.status(400);
    throw new Error("Missing required request body parameters.");
  }
  const imageUrl = await fetchMediaUrl("deepstream-data", imagePath);

  res.json({ imageUrl });
});
