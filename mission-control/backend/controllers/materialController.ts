import asyncHandler from "express-async-handler";
import { MongoError } from "mongodb";
import { Error } from "mongoose";
import materialModel from "../models/materialModel";
import clientModel from "../models/clientModel";

export const getMaterials = asyncHandler(async (req, res) => {
  const materials = await materialModel.find();
  res.json(materials);
});

export const getClientMaterials = asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  if (!clientId) {
    res.status(400);
    throw new Error("Missing request parameters");
  }

  const client = await clientModel
    .findById(clientId)
    .populate({ path: "materials", select: "id name" })
    .select("materials");

  if (!client) {
    res.status(404);
    throw new Error("Client not found");
  }

  res.json(client.materials);
});

export const insertMaterials = asyncHandler(async (req, res) => {
  const { materials }: { materials: string[] } = req.body;

  if (!materials.length) {
    res.status(400);
    throw new Error("Missing required request parameters");
  }

  const materialList = materials.map((name) => ({ name }));

  try {
    const result = await materialModel.insertMany(materialList);

    if (result) {
      res.json({ message: "Materials inserted successfully" });
    } else {
      res.status(400);
      throw new Error("Unable to create material, Please try again later");
    }
  } catch (err) {
    if (err instanceof MongoError) {
      if (err.code === 11000) {
        res.status(400);
        throw new Error("Material already exists");
      }
    } else {
      res.status(500);
      throw new Error("Unable to create material, Please try again later");
    }
  }
});

export const updateMaterial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { material } = req.body;

  if (!id || !material) {
    res.status(400);
    throw new Error("Missing required request parameters");
  }

  const existingMaterial = await materialModel.findById(id);

  if (!existingMaterial) {
    res.status(404);
    throw new Error("No such material found");
  }

  const updatedMaterial = await materialModel.findByIdAndUpdate(
    id,
    {
      name: material
    },
    { new: true }
  );

  if (updatedMaterial) {
    res.status(200).json(updatedMaterial);
  } else {
    res.status(400);
    throw new Error("Error while updating material");
  }
});

export const updateClientStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (!id || isActive === undefined) {
    res.status(400);
    throw new Error("Missing required request parameters");
  }

  const client = await clientModel.findById(id);

  if (!client) {
    res.status(404);
    throw new Error("Client not found");
  }
  if (client.appUsers?.length !== 0) {
    res.status(404);
    throw new Error("Client has operators assigned");
  }

  const response = await clientModel.findByIdAndUpdate(id, {
    isActive
  });

  if (response) {
    res.status(200).json({
      message: "Client status updated successfully!"
    });
  } else {
    res.status(400);
    throw new Error("Error updating client status");
  }
});

export const updateMaterialStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (!id || isActive === undefined) {
    res.status(400);
    throw new Error("Missing required request parameters");
  }

  const material = await materialModel.findById(id);

  if (!material) {
    res.status(404);
    throw new Error("Material not found");
  }

  const materialIsBeingUsed = await clientModel.find({
    materials: id
  });

  if (materialIsBeingUsed?.length !== 0) {
    res.status(404);
    throw new Error(
      `Material is being used by ${materialIsBeingUsed.map(
        (client) => `${client.name}, `
      )}`
    );
  }

  const response = await materialModel.findByIdAndUpdate(id, {
    isActive
  });

  if (response) {
    res.status(200).json({
      message: "Material status updated successfully!"
    });
  } else {
    res.status(400);
    throw new Error("Error updating client status");
  }
});
