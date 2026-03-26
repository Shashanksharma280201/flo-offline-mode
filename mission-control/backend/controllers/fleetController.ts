import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import fleetModel from "../models/fleetModel";
import robotModel from "../models/robotModel";
import InventoryItem from "../models/inventoryItemModel";
import QCFormTemplate from "../models/qcFormTemplateModel";
import { s3Client } from "../services/aws";
import logger from "../utils/logger";

/**
 * Get fleet details
 * @access Private
 * @param req - Request with user
 * @param res - Response
 * @returns fleets detail
 *
 *
 */
export const getFleets = asyncHandler(async (req: Request, res: Response) => {
  const fleets = await fleetModel.find();
  if (!fleets) {
    res.status(400);
    throw new Error("No Fleets Found");
  }
  res.status(200).json(fleets);
});

export const addFleet = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    prefix,
    modelVersion,
    partsConsumption,
    sensors,
    qcTemplateId
  } = req.body;

  // Required fields validation
  if (!name || !prefix) {
    res.status(400);
    throw new Error("Missing required fields: name and prefix");
  }

  // Validate parts if provided
  if (partsConsumption) {
    const allParts = [
      ...(partsConsumption.electrical || []),
      ...(partsConsumption.mechanical || [])
    ];

    for (const part of allParts) {
      if (part.itemId) {
        const item = await InventoryItem.findOne({
          itemId: part.itemId.toUpperCase()
        });
        if (!item) {
          res.status(400);
          throw new Error(
            `Invalid Item ID: ${part.itemId}. Part not found in inventory.`
          );
        }
      }
    }
  }

  // Validate QC template if provided (optional)
  if (qcTemplateId) {
    const template = await QCFormTemplate.findById(qcTemplateId);
    if (!template) {
      res.status(404);
      throw new Error("QC Template not found");
    }
  }

  // Create fleet with all template data
  const fleet = await fleetModel.create({
    name,
    prefix,
    modelVersion: modelVersion || "V1", // Default to V1 if not provided
    partsConsumption: partsConsumption || { electrical: [], mechanical: [] },
    sensors: sensors || [],
    qcTemplateId: qcTemplateId || undefined
  });

  if (fleet) {
    logger.info(
      `Fleet created: ${fleet.name} (${fleet.id}) with model version ${fleet.modelVersion}`
    );
    res.json(fleet);
  } else {
    res.status(400);
    throw new Error("Error adding fleet");
  }
});

export const updateFleetMetadata = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const { name, prefix, modelVersion } = req.body;

    if (!name || !prefix || !id || !modelVersion) {
      res.status(400);
      throw new Error("Missing request parameters");
    }

    const fleet = await fleetModel
      .findByIdAndUpdate(id, { name, prefix, modelVersion }, { new: true })
      .lean();

    console.log(fleet);

    if (fleet) {
      logger.info(`Fleet metadata updated: ${fleet.name} (${id})`);
      res.json(fleet);
    } else {
      res.status(400);
      throw new Error("Error updating fleet");
    }
  }
);

export const getFleetRobots = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const robots = await robotModel.find({ fleet: id }).select("name id");

    res.json(robots);
  }
);

export const fetchMaintenanceSteps = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const fleet = await fleetModel.findById(id);

  if (!fleet) {
    res.status(404);
    throw new Error("Fleet not found");
  }

  logger.info(
    `Fetching maintenance steps for fleet ${id}: ${fleet.maintenanceSteps.length} steps`
  );

  fleet.maintenanceSteps.forEach((s: any, index: number) => {
    logger.info(
      `Step ${index + 1}: ${s.step} | tag: ${
        s.tag
      } | hasRefImage: ${!!s.referenceImageUrl} | url: ${
        s.referenceImageUrl || "none"
      }`
    );
  });

  res.json(fleet.maintenanceSteps);
});

export const addMaintenanceStep = asyncHandler(async (req, res) => {
  const { step, tag } = req.body;
  const { id } = req.params;

  if (!id || !step || !tag) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const stepExists = await fleetModel.exists({
    _id: id,
    "maintenanceSteps.step": step
  });

  if (stepExists) {
    res.status(400);
    throw new Error("Step already exists");
  }

  const updatedMaintenanceData = await fleetModel.findByIdAndUpdate(
    id,
    {
      $push: {
        maintenanceSteps: {
          step,
          tag
        }
      }
    },
    {
      new: true
    }
  );

  if (updatedMaintenanceData) {
    res.json(updatedMaintenanceData);
  } else {
    res.status(400);
    throw new Error("Error adding maintenance step");
  }
});

export const updateMaintenanceStep = asyncHandler(async (req, res) => {
  const { step } = req.body;
  const { id, stepId } = req.params;

  if (!id || !stepId || !step) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const updatedFleetData = await fleetModel.findOneAndUpdate(
    { _id: id, "maintenanceSteps._id": stepId },
    {
      "maintenanceSteps.$.step": step
    },
    {
      new: true
    }
  );

  if (updatedFleetData) {
    res.json(updatedFleetData);
  } else {
    res.status(400);
    throw new Error("Error updating maintenance step");
  }
});

export const deleteMaintenanceStep = asyncHandler(async (req, res) => {
  const { id, stepId } = req.params;

  if (!id || !stepId) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const updatedFleetData = await fleetModel.findOneAndUpdate(
    { _id: id },
    {
      $pull: {
        maintenanceSteps: {
          _id: stepId
        }
      }
    },
    {
      new: true
    }
  );

  if (updatedFleetData) {
    res.json(updatedFleetData);
  } else {
    res.status(400);
    throw new Error("Error deleting maintenance step");
  }
});

export const uploadMaintenanceStepReference = asyncHandler(async (req, res) => {
  const { id, stepId } = req.params;

  logger.info(
    `Reference image upload request received for fleet: ${id}, step: ${stepId}`
  );

  if (!id || !stepId) {
    logger.error("Missing required parameters: fleetId or stepId");
    res.status(400);
    throw new Error("Missing request parameters: fleetId or stepId");
  }

  // Validate that file was uploaded
  const file = req.file as Express.MulterS3.File;
  if (!file || !file.key || !file.location) {
    logger.error(`No file uploaded for fleet: ${id}, step: ${stepId}`);
    res.status(400);
    throw new Error("No reference image uploaded");
  }

  logger.info(`File uploaded to S3: ${file.location}`);

  // Update the maintenance step with the reference image URL
  const updatedFleetData = await fleetModel.findOneAndUpdate(
    { _id: id, "maintenanceSteps._id": stepId },
    {
      "maintenanceSteps.$.referenceImageUrl": file.location
    },
    {
      new: true
    }
  );

  if (!updatedFleetData) {
    logger.error(`Failed to update fleet ${id} with reference image URL`);
    res.status(404);
    throw new Error("Fleet or maintenance step not found");
  }

  // Verify the update was successful
  const updatedStep = updatedFleetData.maintenanceSteps.find(
    (s: any) => s._id.toString() === stepId
  );

  logger.info(
    `Successfully uploaded reference image for fleet: ${id}, step: ${stepId}`
  );
  logger.info(`File location: ${file.location}`);

  if (updatedStep) {
    logger.info(
      `Updated step details: ${updatedStep.step} | tag: ${updatedStep.tag}`
    );
    logger.info(
      `Step referenceImageUrl after update: ${
        updatedStep.referenceImageUrl || "MISSING!"
      }`
    );
  } else {
    logger.error(
      `Could not find updated step with ID ${stepId} in fleet data!`
    );
  }

  res.json({
    message: "Reference image uploaded successfully",
    referenceImageUrl: file.location
  });
});

export const deleteMaintenanceStepReference = asyncHandler(async (req, res) => {
  const { id, stepId } = req.params;

  logger.info(
    `Reference image delete request for fleet: ${id}, step: ${stepId}`
  );

  if (!id || !stepId) {
    res.status(400);
    throw new Error("Missing request parameters: fleetId or stepId");
  }

  // Get the fleet to find the current reference image URL
  const fleet = await fleetModel.findById(id);
  if (!fleet) {
    res.status(404);
    throw new Error("Fleet not found");
  }

  const step = fleet.maintenanceSteps.find(
    (s: any) => s._id.toString() === stepId
  );
  if (!step) {
    res.status(404);
    throw new Error("Maintenance step not found");
  }

  if (!step.referenceImageUrl) {
    res.status(400);
    throw new Error("No reference image to delete");
  }

  // Extract S3 key from URL
  const s3Key = step.referenceImageUrl.split(".com/")[1];

  if (s3Key) {
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: "flo-maintenance-references",
        Key: s3Key
      });
      await s3Client.send(deleteCommand);
      logger.info(`Deleted S3 object: ${s3Key}`);
    } catch (error: any) {
      logger.error(`Failed to delete S3 object ${s3Key}: ${error.message}`);
      // Continue to remove URL from database even if S3 deletion fails
    }
  }

  // Remove the reference image URL from the database
  const updatedFleetData = await fleetModel.findOneAndUpdate(
    { _id: id, "maintenanceSteps._id": stepId },
    {
      $unset: {
        "maintenanceSteps.$.referenceImageUrl": ""
      }
    },
    {
      new: true
    }
  );

  if (!updatedFleetData) {
    res.status(500);
    throw new Error("Failed to remove reference image from database");
  }

  logger.info(
    `Successfully deleted reference image for fleet: ${id}, step: ${stepId}`
  );

  res.json({
    message: "Reference image deleted successfully"
  });
});

export const updateFleetPartsConsumption = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { electrical, mechanical } = req.body?.partsConsumption;

  console.log(electrical, mechanical);

  if (!electrical && !mechanical) {
    res.status(400);
    throw new Error("Missing parts consumption data");
  }

  // 1. Validate Inventory Items
  const allParts = [...(electrical || []), ...(mechanical || [])];
  for (const part of allParts) {
    if (!part.itemId) continue;

    const item = await InventoryItem.findOne({
      itemId: part.itemId.toUpperCase()
    });
    if (!item) {
      res.status(400);
      throw new Error(`Invalid Item ID: ${part.itemId}`);
    }
  }

  // 2. Update Fleet
  const fleet = await fleetModel.findByIdAndUpdate(
    id,
    {
      partsConsumption: {
        electrical: electrical || [],
        mechanical: mechanical || []
      }
    },
    { new: true }
  );

  if (!fleet) {
    res.status(404);
    throw new Error("Fleet not found");
  }

  res.json(fleet);
});

export const updateFleetSensors = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { sensors } = req.body; // Expect array of SensorConfiguration

  if (!sensors || !Array.isArray(sensors)) {
    res.status(400);
    throw new Error("Invalid sensors data");
  }

  const fleet = await fleetModel.findByIdAndUpdate(
    id,
    { sensors },
    { new: true }
  );

  if (!fleet) {
    res.status(404);
    throw new Error("Fleet not found");
  }

  res.json(fleet);
});

export const linkFleetQCTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { qcTemplateId } = req.body;

  if (!qcTemplateId) {
    res.status(400);
    throw new Error("Missing QC Template ID");
  }

  // Validate Template Exists
  const template = await QCFormTemplate.findById(qcTemplateId);
  if (!template) {
    res.status(404);
    throw new Error("QC Template not found");
  }

  const fleet = await fleetModel.findByIdAndUpdate(
    id,
    { qcTemplateId },
    { new: true }
  );

  if (!fleet) {
    res.status(404);
    throw new Error("Fleet not found");
  }

  res.json(fleet);
});

export const getFleetPartsRequirement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const fleet = await fleetModel.findById(id);

  if (!fleet) {
    res.status(404);
    throw new Error("Fleet not found");
  }

  const parts = fleet.partsConsumption || { electrical: [], mechanical: [] };

  const enrichParts = async (partList: any[]) => {
    return Promise.all(
      partList.map(async (part) => {
        const item = await InventoryItem.findOne({ itemId: part.itemId });
        return {
          ...part, // plain object from mongoose
          availableQuantity: item ? item.quantity : 0,
          stockStatus: item ? (item as any).stockStatus : "unknown"
        };
      })
    );
  };

  const electrical = await enrichParts(parts.electrical || []);
  const mechanical = await enrichParts(parts.mechanical || []);

  res.json({
    electrical,
    mechanical
  });
});
