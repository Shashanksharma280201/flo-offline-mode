import dayjs from "dayjs";
import asyncHandler from "express-async-handler";
import leadsModel, { History, Lead } from "../models/leadsModel";

export const fetchLeadsHandler = asyncHandler(async (req, res) => {
  const {
    query,
    stage,
    source,
    pipelineStage,
    product,
    category,
    type,
    page = 1
  }: {
    query?: string;
    stage?: string;
    source?: string;
    pipelineStage?: string;
    product?: string;
    category?: string;
    type?: string;
    page?: number;
  } = req.query;

  const user = req.user as { _id: string };

  const limit = 10;
  const skip = (page - 1) * limit;

  const orCondition = [];
  const andCondition = [];

  if (query) {
    orCondition.push({
      $or: [
        { pocName: { $regex: query, $options: "i" } },
        { city: { $regex: query, $options: "i" } },
        { companyName: { $regex: query, $options: "i" } }
      ]
    });
  }

  if (stage) {
    andCondition.push({
      stage
    });
  }

  if (source) {
    andCondition.push({ source: { $regex: source, $options: "i" } });
  }

  if (pipelineStage) {
    andCondition.push({
      pipelineStage: { $regex: pipelineStage, $options: "i" }
    });
  }

  if (product) {
    andCondition.push({
      $expr: {
        $eq: [{ $toLower: "$product" }, product.toLowerCase()]
      }
    });
  }

  if (category) {
    andCondition.push({ category });
  }
  if (type) {
    andCondition.push({ type });
  }

  if (!andCondition.length) {
    andCondition.push({});
  }

  if (!orCondition.length) {
    orCondition.push({});
  }

  const searchCondition = {
    $or: orCondition,
    $and: andCondition
  };
  const [leads, leadCount] = await Promise.all([
    leadsModel
      .find(searchCondition)
      .limit(limit)
      .skip(skip)
      .sort({ updatedAt: -1 })
      .select("-history")
      .populate({ path: "addedBy", select: "name" })
      .populate({ path: "stageHistory.changedBy", select: "name" }),
    leadsModel.countDocuments(searchCondition)
  ]);

  // Limit stageHistory to last 5 entries for performance in list view
  const leadsWithLimitedHistory = leads.map((lead) => {
    const leadObj = lead.toObject();
    if (leadObj.stageHistory && leadObj.stageHistory.length > 5) {
      leadObj.stageHistory = leadObj.stageHistory.slice(-5);
    }
    return leadObj;
  });

  res.json({
    data: leadsWithLimitedHistory,
    metadata: {
      total: leadCount,
      page,
      current: leads.length,
      limit
    }
  });
});

type WeekByWeekData = {
  [date: string]: {
    [stage: string]: {
      acv: number;
      tcv: number;
      breakup: {
        [pocNameWithDate: string]: {
          acv: number;
          tcv: number;
          city: string;
          companyName: string;
          robotCount: number;
          pocName: string;
        };
      };
      count: number;
      robotCount: {
        [product: string]: number;
      };
    };
  };
};

export const generateWeekByWeekData = asyncHandler(async (req, res) => {
  const {
    startDate,
    endDate,
    product: selectedProduct
  } = req.body as {
    startDate: string;
    endDate: string;
    product?: string;
  };

  if (!startDate || !endDate) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const leads = await leadsModel.find({
    ...(selectedProduct && { product: selectedProduct })
  });

  if (!leads) {
    res.json({});
    return;
  }

  const diff = dayjs(endDate).diff(startDate, "days");

  const weekByWeekData: WeekByWeekData = {};
  const weekArr: WeekByWeekData[] = [];
  for (let i = 0; i <= diff; i += 1) {
    const date = dayjs(startDate).add(i, "days").format("YYYY-MM-DD");

    weekByWeekData[date] = {};
    leads.forEach((lead) => {
      const { history } = lead;

      // @ts-ignore
      const dateObj = history.get(date);

      if (dateObj) {
        const { stage, product, acv, tcv, robotCount } = dateObj;
        if (selectedProduct) {
          if (product.toLowerCase() !== selectedProduct.toLowerCase()) {
            return;
          }
        }
        if (stage) {
          const stageStr = `L${stage}`;
          if (weekByWeekData[date][stageStr]) {
            weekByWeekData[date][stageStr].acv += acv || 0;
            weekByWeekData[date][stageStr].tcv += tcv || 0;
            weekByWeekData[date][stageStr].robotCount = {
              ...weekByWeekData[date][stageStr].robotCount,
              [product]:
                (weekByWeekData[date][stageStr].robotCount[product] || 0) +
                (robotCount || 0)
            };
            weekByWeekData[date][stageStr].count += 1;
            weekByWeekData[date][stageStr].breakup = {
              ...weekByWeekData[date][stageStr].breakup,
              [`${lead.pocName}-${new Date(lead.dateAdded).getTime()}`]: {
                acv: acv || 0,
                tcv: tcv || 0,
                city: lead.city,
                companyName: lead.companyName,
                robotCount: robotCount || 0,
                pocName: lead.pocName
              }
            };
          } else {
            weekByWeekData[date][stageStr] = {
              acv: acv || 0,
              tcv: tcv || 0,
              robotCount: {
                [product]: robotCount || 0
              },
              breakup: {
                [`${lead.pocName}-${new Date(lead.dateAdded).getTime()}`]: {
                  acv: acv || 0,
                  tcv: tcv || 0,
                  city: lead.city,
                  companyName: lead.companyName,
                  robotCount: robotCount || 0,
                  pocName: lead.pocName
                }
              },
              count: 1
            };
          }
        }
      }
    });

    if (Object.keys(weekByWeekData[date]).length) {
      weekArr.push({ [date]: weekByWeekData[date] });
    }
  }

  let result: WeekByWeekData = {};
  const { length } = weekArr;
  weekArr.reverse();
  if (length >= 30) {
    for (let i = 0; i <= length; i += 7) {
      const item = weekArr[i];
      if (item) {
        result = { ...result, ...item };
      }
    }
  } else if (length >= 15) {
    for (let i = 0; i <= length; i += 2) {
      const item = weekArr[i];
      if (item) {
        result = { ...result, ...item };
      }
    }
  } else {
    for (let i = 0; i <= length; i += 1) {
      const item = weekArr[i];
      if (item) {
        result = { ...result, ...item };
      }
    }
  }

  res.json(result);
});

export const downloadLeadsHandler = asyncHandler(async (req, res) => {
  const result = await leadsModel
    .find({})
    .populate({ path: "addedBy", select: "name" })
    .populate({ path: "stageHistory.changedBy", select: "name" });
  if (result) {
    res.json(result);
  } else {
    res.status(400);
    throw new Error("Error fetching leads");
  }
});

export const fetchLeadHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Note: Authorization check is currently disabled
  // const user = req.user as { _id: string };

  if (!id) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const lead = await leadsModel
    .findById(id)
    .populate({ path: "addedBy", select: "name email" })
    .populate({ path: "stageHistory.changedBy", select: "name email" });

  // NOTE: Authorization check currently disabled - all authenticated users can view any lead
  // This is intentional for cross-team collaboration. Re-enable if per-user access control is needed:
  // if (lead?.addedBy !== user._id.toString()) {
  //   res.status(401);
  //   throw new Error("User does not have access to this lead");
  // }

  if (lead) {
    res.json(lead);
  } else {
    res.status(404);
    throw new Error("Lead not found");
  }
});

export const addLeadHandler = asyncHandler(async (req, res) => {
  const {
    stage,
    pipelineStage,
    pocName,
    companyName,
    contact,
    phoneNumber,
    email,
    designation,
    billingStatus,
    sourceDetails,
    city,
    product,
    source,
    category,
    type,
    acv,
    tcv,
    dateAdded,
    robotCount,
    linkedinTag
  } = req.body;
  const { user } = req;
  if (!user) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  if (!pocName || !companyName || !city) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const newLead = await leadsModel.create({
    stage,
    pipelineStage,
    pocName,
    companyName,
    contact,
    sourceDetails,
    city,
    product,
    source,
    type,
    category,
    acv,
    tcv,
    dateAdded,
    robotCount,
    phoneNumber,
    email,
    designation,
    billingStatus,
    linkedinTag,
    addedBy: user._id,
    stageHistory:
      stage !== undefined || pipelineStage !== undefined
        ? [
            {
              date: new Date(),
              newStage: stage,
              newPipelineStage: pipelineStage,
              changedBy: user._id
            }
          ]
        : []
  });

  if (newLead) {
    // Populate the newly created lead's references before returning
    const populatedLead = await leadsModel
      .findById(newLead._id)
      .populate({ path: "addedBy", select: "name email" })
      .populate({ path: "stageHistory.changedBy", select: "name email" });

    res.status(201).json(populatedLead);
  } else {
    res.status(500);
    throw new Error("Error creating new lead");
  }
});

export const updateLeadHandler = asyncHandler(async (req, res) => {
  const {
    stage,
    pipelineStage,
    pocName,
    companyName,
    contact,
    phoneNumber,
    email,
    designation,
    billingStatus,
    sourceDetails,
    city,
    product,
    source,
    category,
    type,
    acv,
    tcv,
    dateAdded,
    robotCount,
    response,
    nextStep,
    linkedinTag,
    accountNotes
  } = req.body;

  const { id } = req.params;
  const user = req.user as { _id: string };

  if (acv) {
    if (typeof acv !== "number") {
      res.status(400);
      throw new Error("ACV must be a number");
    }
  }
  if (tcv) {
    if (typeof tcv !== "number") {
      res.status(400);
      throw new Error("TCV must be a number");
    }
  }
  if (!id) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  // Fetch the existing lead to check for stage changes
  const existingLead = await leadsModel.findById(id);
  if (!existingLead) {
    res.status(404);
    throw new Error("Lead not found");
  }

  // Check if stage or pipelineStage has changed
  const stageChanged = stage !== undefined && stage !== existingLead.stage;
  const pipelineStageChanged =
    pipelineStage !== undefined && pipelineStage !== existingLead.pipelineStage;

  // Build $push object conditionally to avoid pushing undefined values
  const $push: any = {};

  if (response) {
    $push.responses = response;
  }

  if (nextStep) {
    $push.nextSteps = nextStep;
  }

  // If stage or pipelineStage changed, add to stageHistory
  if (stageChanged || pipelineStageChanged) {
    const historyEntry: any = {
      date: new Date(),
      changedBy: user._id
    };

    // Only include stage fields if they actually changed
    if (stageChanged) {
      historyEntry.previousStage = existingLead.stage;
      historyEntry.newStage = stage;
    }

    if (pipelineStageChanged) {
      historyEntry.previousPipelineStage = existingLead.pipelineStage;
      historyEntry.newPipelineStage = pipelineStage;
    }

    $push.stageHistory = historyEntry;
  }

  const updateData: any = {
    stage,
    pipelineStage,
    pocName,
    companyName,
    contact,
    sourceDetails,
    phoneNumber,
    email,
    designation,
    billingStatus,
    city,
    product,
    source,
    category,
    type,
    acv,
    tcv,
    dateAdded,
    robotCount,
    linkedinTag,
    accountNotes
  };

  // Only add $push if there's something to push
  if (Object.keys($push).length > 0) {
    updateData.$push = $push;
  }

  const updatedLead = await leadsModel
    .findByIdAndUpdate(id, updateData, { new: true })
    .select("-history")
    .populate({ path: "addedBy", select: "name email" })
    .populate({ path: "stageHistory.changedBy", select: "name email" });

  if (updatedLead) {
    res.json(updatedLead);
  } else {
    res.status(500);
    throw new Error("Error updating lead");
  }
});

export const addLeadsHandler = asyncHandler(async (req, res) => {
  const leads = req.body;
  const user = req.user as { _id: string };

  const newLeads = await leadsModel.insertMany(
    leads.map((lead: Lead) => ({ ...lead, addedBy: user._id }))
  );

  if (newLeads) {
    res.json({ message: "Leads added successfully" });
  } else {
    res.status(400);
    throw new Error("Error adding leads");
  }
});

export const deleteLeadHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const deletedLead = await leadsModel.findByIdAndDelete(id);

  if (deletedLead) {
    res.json({ message: "Lead deleted successfully!" });
  } else {
    res.status(500);
    throw new Error("Error deleting lead");
  }
});

export const addResponseHandler = asyncHandler(async (req, res) => {
  const { date, description, audioData, audioDuration } = req.body;
  const { id } = req.params;

  if (!id || !date) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  // Validate: either description or audio must be provided
  if (!description && !audioData) {
    res.status(400);
    throw new Error("Either description or audio must be provided");
  }

  const updatedLead = await leadsModel.findByIdAndUpdate(
    id,
    {
      $push: {
        responses: {
          date,
          description: description || "",
          audioData: audioData || "",
          audioDuration: audioDuration || 0
        }
      }
    },
    { new: true }
  );

  if (updatedLead) {
    res.json(updatedLead);
  } else {
    res.status(400);
    throw new Error("Error adding response");
  }
});

export const updateResponseHandler = asyncHandler(async (req, res) => {
  const { date, description, audioData, audioDuration } = req.body;
  const { id, responseId } = req.params;

  if (!id || !responseId) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const responseToUpdate = await leadsModel.findOne({
    _id: id,
    "responses._id": responseId
  });

  if (!responseToUpdate) {
    res.status(404);
    throw new Error("response doesn't exist");
  }

  const updateFields: any = {};
  if (date) updateFields["responses.$.date"] = date;
  if (description !== undefined)
    updateFields["responses.$.description"] = description;
  if (audioData !== undefined)
    updateFields["responses.$.audioData"] = audioData;
  if (audioDuration !== undefined)
    updateFields["responses.$.audioDuration"] = audioDuration;

  const updatedLead = await leadsModel.findOneAndUpdate(
    { _id: id, "responses._id": responseId },
    updateFields,
    { new: true }
  );

  if (updatedLead) {
    res.json(updatedLead);
  } else {
    res.status(400);
    throw new Error("Error updating response");
  }
});

export const deleteResponseHandler = asyncHandler(async (req, res) => {
  const { id, responseId } = req.params;
  if (!id || !responseId) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const responseToBeDeleted = await leadsModel.findOne({
    _id: id,
    "responses._id": responseId
  });

  if (!responseToBeDeleted) {
    res.status(400);
    throw new Error("response doesn't exist");
  }

  const updatedLead = await leadsModel.findByIdAndUpdate(
    id,
    {
      $pull: {
        responses: { _id: responseId }
      }
    },
    { new: true }
  );

  if (updatedLead) {
    res.json(updatedLead);
  } else {
    res.status(400);
    throw new Error("Error deleting response");
  }
});

export const addStepHandler = asyncHandler(async (req, res) => {
  const { date, description, audioData, audioDuration } = req.body;
  const { id } = req.params;

  if (!id || !date) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  // Validate: either description or audio must be provided
  if (!description && !audioData) {
    res.status(400);
    throw new Error("Either description or audio must be provided");
  }

  const updatedLead = await leadsModel
    .findByIdAndUpdate(
      id,
      {
        $push: {
          nextSteps: {
            date,
            description: description || "",
            audioData: audioData || "",
            audioDuration: audioDuration || 0
          }
        }
      },
      { new: true }
    )
    .populate({ path: "addedBy", select: "name email" });

  if (updatedLead) {
    res.json(updatedLead);
  } else {
    res.status(400);
    throw new Error("Error adding response");
  }
});

export const updateStepHandler = asyncHandler(async (req, res) => {
  const { date, description, audioData, audioDuration } = req.body;
  const { id, stepId } = req.params;

  if (!id || !stepId) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const stepToUpdate = await leadsModel.findOne({
    _id: id,
    "nextSteps._id": stepId
  });

  if (!stepToUpdate) {
    res.status(404);
    throw new Error("Step doesn't exist");
  }

  const updateFields: any = {};
  if (date) updateFields["nextSteps.$.date"] = date;
  if (description !== undefined)
    updateFields["nextSteps.$.description"] = description;
  if (audioData !== undefined)
    updateFields["nextSteps.$.audioData"] = audioData;
  if (audioDuration !== undefined)
    updateFields["nextSteps.$.audioDuration"] = audioDuration;

  const updatedLead = await leadsModel.findOneAndUpdate(
    { _id: id, "nextSteps._id": stepId },
    updateFields,
    { new: true }
  );

  if (updatedLead) {
    res.json(updatedLead);
  } else {
    res.status(400);
    throw new Error("Error updating step");
  }
});

export const deleteStepHandler = asyncHandler(async (req, res) => {
  const { id, stepId } = req.params;
  if (!id || !stepId) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const stepToBeDeleted = await leadsModel.findOne({
    _id: id,
    "nextSteps._id": stepId
  });

  if (!stepToBeDeleted) {
    res.status(400);
    throw new Error("Step doesn't exist");
  }

  const updatedLead = await leadsModel.findByIdAndUpdate(
    id,
    {
      $pull: {
        nextSteps: { _id: stepId }
      }
    },
    { new: true }
  );

  if (updatedLead) {
    res.json(updatedLead);
  } else {
    res.status(400);
    throw new Error("Error deleting response");
  }
});

export const addPlanHandler = asyncHandler(async (req, res) => {
  const { description, audioData, audioDuration } = req.body;
  const { id } = req.params;

  if (!id) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  // Validate: either description or audio must be provided
  if (!description && !audioData) {
    res.status(400);
    throw new Error("Either description or audio must be provided");
  }

  const updatedLead = await leadsModel.findByIdAndUpdate(
    id,
    {
      closePlan: {
        description: description ? description.trim() : "",
        audioData: audioData || "",
        audioDuration: audioDuration || 0
      }
    },
    { new: true }
  );

  if (updatedLead) {
    res.json(updatedLead);
  } else {
    res.status(400);
    throw new Error("Error adding plan");
  }
});

export const updatePlanHandler = asyncHandler(async (req, res) => {
  const { description, audioData, audioDuration } = req.body;
  const { id } = req.params;

  if (!id) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  // Validate: either description or audio must be provided
  if (!description && !audioData) {
    res.status(400);
    throw new Error("Either description or audio must be provided");
  }

  const updatedLead = await leadsModel.findByIdAndUpdate(
    id,
    {
      closePlan: {
        description: description ? description.trim() : "",
        audioData: audioData || "",
        audioDuration: audioDuration || 0
      }
    },
    { new: true }
  );

  if (updatedLead) {
    res.json(updatedLead);
  } else {
    res.status(400);
    throw new Error("Error updating plan");
  }
});

export const addTargetChangeHandler = asyncHandler(async (req, res) => {
  const { date, changeReason } = req.body;
  const { id } = req.params;

  if (!id || !date || !changeReason) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const updatedLead = await leadsModel.findByIdAndUpdate(
    id,
    {
      $push: {
        targetChanges: { date, changeReason }
      }
    },
    { new: true }
  );

  if (updatedLead) {
    res.json(updatedLead);
  } else {
    res.status(400);
    throw new Error("Error adding response");
  }
});

export const updateTargetChangeHandler = asyncHandler(async (req, res) => {
  const { date, changeReason } = req.body;
  const { id, targetId } = req.params;

  if (!id || !targetId) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const responseToUpdate = await leadsModel.findOne({
    _id: id,
    "targetChanges._id": targetId
  });

  if (!responseToUpdate) {
    res.status(404);
    throw new Error("response doesn't exist");
  }
  const updatedLead = await leadsModel.findOneAndUpdate(
    { _id: id, "targetChanges._id": targetId },
    {
      ...(date && { "targetChanges.$.date": date }),
      ...(changeReason && { "targetChanges.$.changeReason": changeReason })
    },
    {
      new: true
    }
  );

  if (updatedLead) {
    res.json(updatedLead);
  } else {
    res.status(400);
    throw new Error("Error updating response");
  }
});

export const deleteTargetChangeHandler = asyncHandler(async (req, res) => {
  const { id, targetId } = req.params;
  if (!id || !targetId) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const responseToBeDeleted = await leadsModel.findOne({
    _id: id,
    "targetChanges._id": targetId
  });

  if (!responseToBeDeleted) {
    res.status(400);
    throw new Error("response doesn't exist");
  }

  const updatedLead = await leadsModel.findByIdAndUpdate(
    id,
    {
      $pull: {
        targetChanges: { _id: targetId }
      }
    },
    { new: true }
  );

  if (updatedLead) {
    res.json(updatedLead);
  } else {
    res.status(400);
    throw new Error("Error deleting response");
  }
});

export const mergeLeadsHandler = asyncHandler(async (req, res) => {
  const leads = req.body;

  const results = await Promise.all(
    leads.map(async (lead: Lead) => {
      const names = lead.pocName
        .trim()
        .split(",")
        .map((name) => name.trim());

      const mergedHistory: { [date: string]: History } = {};

      for (const pocName of names) {
        const curLead = await leadsModel.findOne({ pocName });

        if (curLead && curLead.history) {
          const { history } = curLead;

          // Convert Mongoose Map to plain object
          // @ts-ignore - history is a Mongoose Map at runtime
          history.forEach((value: History, date: string) => {
            if (mergedHistory[date]) {
              const existingHistory = mergedHistory[date];
              mergedHistory[date] = {
                acv: existingHistory.acv + value.acv,
                tcv: existingHistory.tcv + value.tcv,
                robotCount: existingHistory.robotCount + value.robotCount,
                stage: existingHistory.stage,
                product: existingHistory.product
              };
            } else {
              mergedHistory[date] = { ...value };
            }
          });
        }
      }

      return { ...lead, names, history: mergedHistory };
    })
  );

  if (results) {
    res.json({ results });
  } else {
    res.status(400);
    throw new Error("Error merging leads");
  }
});
