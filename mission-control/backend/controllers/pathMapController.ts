import { toFile } from "openai";
import { Response, Request } from "express";
import asyncHandler from "express-async-handler";
import userModel, { IUser } from "../models/userModel";
import pathMapModel, {
  Boundary,
  Obstacle,
  Path,
  PathMap,
  Paths,
  Station
} from "../models/pathMapModel";
import robotModel from "../models/robotModel";
import { runInTransaction } from "../services/mongodb";
import { extractPathAndMissionPrompt, openai } from "../services/ai";

/**
 * Create a new PathMap
 * @access Private
 * @param req - Request with pathMap name and userId (owner) in JSON
 * @param res - Response
 * @returns created pathMap details
 *
 *
 */
export const createPathMap = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      name,
      owner,
      frame,
      lidarMapName
    }: { name: string; owner: string; frame: string; lidarMapName?: string } = req.body;
    if (!name || !owner) {
      res.status(400);
      throw new Error("Missing required request body parameters");
    }
    const user = await userModel.findById(owner).select("id");
    if (!user) {
      res.status(404);
      throw new Error("User does not exist");
    }
    const pathMap = await pathMapModel.findOne({ name, owner }).exec();
    if (pathMap) {
      res.status(400);
      throw new Error("PathMap already exists");
    }
    const { createdPathMap, updatedUser } = await runInTransaction(
      async (session) => {
        const pathMapInTransaction = (await pathMapModel.create(
          [
            {
              name,
              owner,
              frame: frame || "utm",
              lidarMapName: lidarMapName || undefined,
              users: [user],
              stations: [],
              missions: []
            }
          ],
          { session }
        )) as PathMap[];
        const userInTransaction = (await userModel
          .findByIdAndUpdate(
            user.id,
            { $addToSet: { pathMaps: pathMapInTransaction[0]._id } },
            { session, new: true }
          )
          .select("pathMaps")) as IUser;
        return {
          createdPathMap: pathMapInTransaction[0],
          updatedUser: userInTransaction
        };
      }
    );
    if (createdPathMap && updatedUser) {
      res.status(201).json({
        createdPathMap,
        updatedUser
      });
    } else {
      res.status(400);
      throw new Error("PathMap creation failed");
    }
  }
);

/**
 * Get pathMaps accessible by the user
 * @access Private
 * @param req - Request
 * @param res - Response
 * @returns pathMaps assigned to the user
 *
 *
 */
export const getPathMapsList = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { pathMaps } = (await userModel
      .findById(id)
      .populate({ path: "pathMaps", select: "id name frame" })
      .select("pathMaps")) as IUser;

    if (pathMaps) {
      res.status(200).json(pathMaps);
    } else {
      res.status(400);
      throw new Error("No pathMaps assigned to the requested user");
    }
  }
);
/**
 * Get pathMap based on Id
 * @access Private
 * @param req - Request
 * @param res - Response
 * @returns pathMaps assigned to the user
 *
 *
 */
export const getPathMapById = asyncHandler(
  async (req: Request, res: Response) => {
    const { pathMapId } = req.body;

    const pathMap = await pathMapModel.findById(pathMapId);

    if (pathMap) {
      res.status(200).json(pathMap);
    } else {
      res.status(400);
      throw new Error("No pathMaps assigned to the requested user");
    }
  }
);

/**
 * Delete a pathMap
 * @access Private
 * @param req - Request with pathMapId in JSON
 * @param res - Response
 * @returns response message along with status code
 *
 *
 */
export const deletePathMap = asyncHandler(
  async (req: Request, res: Response) => {
    const { id }: { id: string } = req.body;
    if (!id) {
      res.status(400);
      throw new Error("Missing required request body parameter");
    }
    const userId = req.user!.id;

    const pathMap = await pathMapModel.findById(id);

    if (!pathMap) {
      res.status(404);
      throw new Error("PathMap does not exist");
    }

    if (!userId) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    const transactionSuccess = await runInTransaction(async (session) => {
      if (userId === pathMap.owner.toString()) {
        await Promise.all(
          pathMap.users.map(async (user) => {
            await userModel.findByIdAndUpdate(
              user,
              { $pull: { pathMaps: id } },
              { session, new: true }
            );
          })
        );

        await pathMapModel.findByIdAndDelete(id, { session, new: true });
      } else {
        // if user is not owner
        await pathMapModel.findByIdAndUpdate(
          id,
          { $pull: { users: userId } },
          { session, new: true }
        );
        await userModel.findByIdAndUpdate(
          userId,
          { $pull: { pathMaps: id } },
          { session, new: true }
        );
      }

      return {
        success: true
      };
    });
    // if owner - remove from all + remove the model itself
    // Not - remove from self
    if (transactionSuccess) {
      res.status(200).json({
        message: "PathMap was removed successfully"
      });
    } else {
      res.status(400);
      throw new Error("Unable to remove the pathMap, Please try again");
    }
  }
);

/**
 * Add user to a PathMap
 * @access Private
 * @param req - Request with PathMapId and userEmail in JSON
 * @param res - Response
 * @returns updated pathMap details
 *
 *
 */
export const addUserToPathMap = asyncHandler(
  async (req: Request, res: Response) => {
    const { pathMapId, userEmail }: { pathMapId: string; userEmail: string } =
      req.body;
    if (!pathMapId || !userEmail) {
      res.status(400);
      throw new Error("Missing required request body parameters.");
    }
    const pathMap = await pathMapModel.findById(pathMapId);
    if (!pathMap) {
      res.status(404);
      throw new Error("No pathMap found for the specified Id");
    }

    if (req.user?.role !== "admin") {
      if (req.user?.id !== pathMap.owner.toString()) {
        res.status(403);
        throw new Error("You dont have permission to access this pathMap");
      }
    }
    const user = await userModel.findOne({ email: userEmail });
    if (!user) {
      res.status(404);
      throw new Error("No User found");
    }

    const updatedPathMap = await pathMapModel.findByIdAndUpdate(
      pathMapId,
      { $addToSet: { users: user.id } },
      { new: true }
    );
    res.status(200).json(updatedPathMap);
  }
);

/**
 * Remove user from a PathMap
 * @access Private
 * @param req - Request with PathMapId and userEmail in JSON
 * @param res - Response
 * @returns updated PathMap details
 *
 *
 */
export const removeUserFromPathMap = asyncHandler(
  async (req: Request, res: Response) => {
    const { pathMapId, userEmail }: { pathMapId: string; userEmail: string } =
      req.body;
    if (!pathMapId || !userEmail) {
      res.status(400);
      throw new Error("Missing required request body parameters.");
    }
    const pathMap = await pathMapModel.findById(pathMapId);
    if (!pathMap) {
      res.status(404);
      throw new Error("No pathMap found for the specified Id");
    }
    if (
      req.user?.id !== pathMap.owner.toString() ||
      req.user?.role !== "admin"
    ) {
      res.status(403);
      throw new Error("You dont have permission to access this pathMap");
    }
    const user = await userModel.findOne({ email: userEmail });
    if (!user) {
      res.status(404);
      throw new Error("No User found");
    }
    const updatedPathMap = await pathMapModel.findByIdAndUpdate(
      pathMapId,
      { $pull: { users: user.id } },
      { new: true }
    );
    res.status(200).json(updatedPathMap);
  }
);

/**
 * Update a PathMap
 * @access Private
 * @param req - Request with pathMapId, paths and array of stations in JSON
 * @param res - Response
 * @returns updated PathMap details
 *
 *
 */
export const addBoundaryToPathMap = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      pathMapId,
      boundaries,
      obstacles
    }: {
      pathMapId: string;
      boundaries: Boundary[];
      obstacles: Obstacle[];
    } = req.body;

    if (!pathMapId || !boundaries.length) {
      res.status(400);
      throw new Error("Missing required request body parameters.");
    }
    const pathMap = await pathMapModel.findById(pathMapId);

    if (!pathMap) {
      res.status(404);
      throw new Error("No pathMap found for the specified Id");
    }

    const updatedPathMap = await pathMapModel.findByIdAndUpdate(
      pathMapId,
      {
        boundaries,
        obstacles
      },
      { new: true }
    );
    if (updatedPathMap) {
      res.status(200).json(updatedPathMap);
    } else {
      res.status(400);
      throw new Error(
        "Error updating adding boundaries and obstacles to path map"
      );
    }
  }
);

export const updatePathMap = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      pathMapId,
      paths,
      stations,
      boundaries,
      obstacles
    }: {
      pathMapId: string;
      paths: Paths;
      stations: Station[];
      boundaries?: Boundary[];
      obstacles?: Obstacle[];
    } = req.body;

    if (!pathMapId || !stations || stations.length === 0) {
      res.status(400);
      throw new Error("Missing required request body parameters.");
    }

    const pathMap = await pathMapModel.findById(pathMapId);

    if (!pathMap) {
      res.status(404);
      throw new Error("No pathMap found for the specified Id");
    }

    if (req.user?.role !== "admin") {
      if (req.user?.id !== pathMap.owner.toString()) {
        res.status(403);
        throw new Error("You dont have permission to access this pathMap");
      }
    }

    const updatedPathMap = await runInTransaction(async (session) => {
      // Build update object with required and optional fields
      const updateData: any = {
        paths,
        stations
      };

      // Add boundaries and obstacles if provided
      if (boundaries !== undefined) {
        updateData.boundaries = boundaries;
      }
      if (obstacles !== undefined) {
        updateData.obstacles = obstacles;
      }

      const pathMapInTransaction = await pathMapModel.findByIdAndUpdate(
        pathMapId,
        updateData,
        { new: true, session }
      );
      return pathMapInTransaction;
    });

    if (updatedPathMap) {
      res.status(200).json(updatedPathMap);
    } else {
      res.status(400);
      throw new Error("PathMap update failed");
    }
  }
);

/**
 * Get missions accessible by the user
 * @access Private
 * @param req - Request
 * @param res - Response
 * @returns missions available in the pathmap
 *
 *
 */
export const getMissions = asyncHandler(async (req: Request, res: Response) => {
  const { pathMapId } = req.query;

  if (!pathMapId) {
    res.status(404);
    throw new Error("pathMap Id not found");
  }

  const missions = await pathMapModel.findById(pathMapId).select("missions");

  res.status(200).json(missions);
});

/**
 * Create a mission
 * @access Private
 * @param req - Request with mission name and pathMapId in JSON
 * @param res - Response
 * @returns updated PathMap details
 *
 *
 */
export const createMission = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      name,
      pathMapId
    }: {
      name: string;
      pathMapId: string;
    } = req.body;

    if (!pathMapId || !name) {
      res.status(400);
      throw new Error("Missing required request body parameters.");
    }

    const pathMap = await pathMapModel.findById(pathMapId);

    if (!pathMap) {
      res.status(404);
      throw new Error("No pathMap found for the specified Id");
    }

    const updatedPathMap = await pathMapModel.findByIdAndUpdate(
      pathMapId,
      {
        $push: {
          missions: {
            name,
            mission: []
          }
        }
      },
      { upsert: true, new: true }
    );
    res.status(200).json(updatedPathMap);
  }
);

/**
 * Update a mission
 * @access Private
 * @param req - Request with missionId, pathMapId and mission in JSON
 * @param res - Response
 * @returns updated PathMap details
 *
 *
 */
export const updateMission = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      missionId,
      pathMapId,
      mission
    }: {
      missionId: string;
      pathMapId: string;
      mission: Path[];
    } = req.body;

    if (!pathMapId || !missionId || !mission) {
      res.status(400);
      throw new Error("Missing required request body parameters.");
    }

    const pathMap = await pathMapModel.findById(pathMapId);

    if (!pathMap) {
      res.status(404);
      throw new Error("No pathMap found for the specified Id");
    }

    const updatedPathMap = await pathMapModel.findOneAndUpdate(
      { _id: pathMapId, "missions._id": missionId },
      { $set: { "missions.$.mission": mission } },
      { new: true }
    );
    res.status(200).json(updatedPathMap);
  }
);

/**
 * Delete a mission
 * @access Private
 * @param req - Request with missionId and pathMapId in JSON
 * @param res - Response
 * @returns updated PathMap details
 *
 *
 */
export const deleteMission = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      missionId,
      pathMapId
    }: {
      missionId: string;
      pathMapId: string;
    } = req.body;
    if (!pathMapId || !missionId) {
      res.status(400);
      throw new Error("Missing required request body parameters.");
    }
    const pathMap = await pathMapModel.findById(pathMapId);

    if (!pathMap) {
      res.status(404);
      throw new Error("No pathMap found for the specified Id");
    }

    const updatedPathMap = await pathMapModel.findByIdAndUpdate(
      pathMapId,
      {
        $pull: {
          missions: {
            _id: missionId
          }
        }
      },
      { upsert: true, new: true }
    );

    res.status(200).json(updatedPathMap);
  }
);

export const triggerMissionViaVoiceHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { file } = req;

    if (!file) {
      res.status(400);
      throw new Error("Missing audio file.");
    }

    // Step 1: Transcribe audio using Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: await toFile(file.buffer, "audio.wav"),
      model: "whisper-1"
    });

    if (!transcription || !transcription.text) {
      res.status(400).json({ message: "Audio transcription failed" });
      return;
    }

    // Step 2: Extract command data using GPT-4o-mini
    const extractedData = await openai.responses.create({
      model: "gpt-4o-mini",
      instructions: extractPathAndMissionPrompt,
      input: transcription.text
    });

    if (!extractedData || !extractedData.output_text) {
      res.status(400).json({
        message: `Extraction failed for ${transcription.text}`,
        transcription: transcription.text
      });
      return;
    }

    const cleaned = extractedData.output_text
      .replace(/```json|```/g, "")
      .trim();

    const {
      action,
      robotName,
      pathMapName,
      missionName,
      frame,
      stationName
    } = JSON.parse(cleaned);

    // Step 3: Validate action type
    const validActions = ["execute", "abort", "pause", "resume", "return", "status"];
    const finalAction = action && validActions.includes(action) ? action : "execute";

    // Step 4: Handle non-execute actions (abort/pause/resume/return/status)
    if (finalAction !== "execute") {
      res.status(200).json({
        action: finalAction,
        robotName,
        stationName,
        transcription: transcription.text,
        message: `Action '${finalAction}' will be handled by frontend`
      });
      return;
    }

    // Step 5: Validate robot if specified
    let robot = null;
    if (robotName) {
      robot = await robotModel.findOne({
        name: { $regex: new RegExp(`^${robotName}$`, "i") }
      });

      if (!robot) {
        res.status(404).json({
          message: `Robot '${robotName}' not found`,
          transcription: transcription.text,
          extractedData: { action: finalAction, robotName, pathMapName, missionName, frame }
        });
        return;
      }

      // Validate robot type for execute commands
      if (robot.robotType !== "autonomous") {
        res.status(400).json({
          message: `Robot '${robotName}' is ${robot.robotType} type. Voice commands only work for autonomous robots. Please configure this robot as autonomous to use voice control.`,
          transcription: transcription.text,
          robotId: robot._id,
          robotType: robot.robotType
        });
        return;
      }
    }

    // Step 6: Validate mission execution parameters
    if (!pathMapName || !missionName) {
      res.status(400).json({
        message: `Could not extract mission details. Please specify both pathmap and mission name clearly.`,
        transcription: transcription.text,
        extractedData: { action: finalAction, robotName, pathMapName, missionName, frame }
      });
      return;
    }

    // Step 7: Find pathmap with frame validation
    const pathMapQuery: any = {
      name: { $regex: new RegExp(`^${pathMapName}$`, "i") }
    };

    // Add frame filter if specified
    if (frame) {
      pathMapQuery.frame = frame;
    }

    const pathMap = await pathMapModel.findOne(pathMapQuery);

    if (!pathMap) {
      const frameMsg = frame ? ` with frame '${frame}'` : "";
      res.status(404).json({
        message: `PathMap '${pathMapName}'${frameMsg} not found`,
        transcription: transcription.text,
        extractedData: { action: finalAction, robotName, pathMapName, missionName, frame }
      });
      return;
    }

    // Step 8: Find mission in pathmap
    const mission = pathMap.missions.find((m) => {
      return m.name.toLowerCase() === missionName.toLowerCase();
    }) as undefined | { _id: string };

    if (!mission) {
      res.status(404).json({
        message: `Mission '${missionName}' not found in PathMap '${pathMapName}'`,
        transcription: transcription.text,
        availableMissions: pathMap.missions.map((m: any) => m.name),
        extractedData: { action: finalAction, robotName, pathMapName, missionName, frame }
      });
      return;
    }

    // Step 9: Return success with all extracted data
    res.status(200).json({
      action: finalAction,
      pathMap,
      missionId: mission._id,
      robotId: robot?._id,
      robotName: robot?.name,
      robotType: robot?.robotType,
      frame: pathMap.frame,
      transcription: transcription.text,
      pathMapName,
      missionName,
      extractedData: { action: finalAction, robotName, pathMapName, missionName, frame, stationName }
    });
  }
);
