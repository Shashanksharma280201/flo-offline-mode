import asyncHandler from "express-async-handler";
import TutorialModel from "../models/tutorialModel";
import logger from "../utils/logger";

export const getTutorials = asyncHandler(async (req, res) => {
  const tutorials = await TutorialModel.find();
  if (!tutorials) {
    res.status(400);
    throw new Error("No Tutorials Found");
  }
  res.status(200).json(tutorials);
});

export const createTutorial = asyncHandler(async (req, res) => {
  const { title, tag, youtubeId } = req.body;
  logger.info("Creating tutorial", { body: req.body });
  if (!title || !tag || !youtubeId) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const tutorial = await TutorialModel.create({ title, tag, youtubeId });

  if (tutorial) {
    res.json(tutorial);
  } else {
    res.status(400);
    throw new Error("Error adding tutorial");
  }
});

export const updateTutorial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, tag, youtubeId } = req.body;

  if ((!title && !tag && !youtubeId) || !id) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const tutorial = await TutorialModel.findByIdAndUpdate(id, {
    ...(title && { title }),
    ...(tag && { tag }),
    ...(youtubeId && { youtubeId })
  });
  if (tutorial) {
    res.json(tutorial);
  } else {
    res.status(400);
    throw new Error("Error updating tutorial");
  }
});

export const deleteTutorial = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const tutorial = await TutorialModel.findByIdAndDelete(id);

  if (tutorial) {
    res.json(tutorial);
  } else {
    res.status(400);
    throw new Error("Error deleting tutorial");
  }
});
