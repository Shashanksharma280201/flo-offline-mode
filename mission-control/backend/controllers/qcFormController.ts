import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import QCFormTemplate from "../models/qcFormTemplateModel";
import logger from "../utils/logger";

// this handles the QC templates not QC submissions or updates

/**
 * @desc    Create new QC form template
 * @route   POST /api/v1/qc/forms
 * @access  Private (QC Admin only)
 */
export const createFormTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, description, version, tabs, headerFields, signOffFields } =
      req.body;

    // Validation
    if (!name || !version || !tabs || tabs.length === 0) {
      res.status(400);
      throw new Error(
        "Please provide name, version, and at least one tab with questions"
      );
    }

    // Check if version already exists
    const existingTemplate = await QCFormTemplate.findOne({ name, version });
    if (existingTemplate) {
      res.status(400);
      throw new Error(`Form template with version ${version} already exists`);
    }

    // Calculate total questions
    let totalQuestions = 0;
    tabs.forEach((tab: any) => {
      tab.categories.forEach((category: any) => {
        totalQuestions += category.questions.length;
      });
    });

    // Create form template
    const formTemplate = await QCFormTemplate.create({
      name,
      description,
      version,
      isActive: false, // Admin must explicitly activate
      tabs,
      headerFields: headerFields || [],
      signOffFields: signOffFields || [],
      createdBy: req.user!._id
    });

    logger.info(
      `QC Form Template created: ${name} v${version} by ${req.user!.email}`
    );

    res.status(201).json({
      success: true,
      data: formTemplate,
      totalQuestions
    });
  }
);

/**
 * @desc    Update QC form template
 * @route   PUT /api/v1/qc/forms/:formId
 * @access  Private (QC Admin only)
 */
export const updateFormTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const { formId } = req.params;

    const formTemplate = await QCFormTemplate.findById(formId);

    if (!formTemplate) {
      res.status(404);
      throw new Error("Form template not found");
    }

    // Update fields
    const { name, description, version, tabs, headerFields, signOffFields } =
      req.body;

    if (name) formTemplate.name = name;
    if (description) formTemplate.description = description;
    if (version) formTemplate.version = version;
    if (tabs) formTemplate.tabs = tabs;
    if (headerFields) formTemplate.headerFields = headerFields;
    if (signOffFields) formTemplate.signOffFields = signOffFields;

    formTemplate.updatedBy = req.user!._id;

    const updatedTemplate = await formTemplate.save();

    logger.info(
      `QC Form Template updated: ${updatedTemplate.name} v${
        updatedTemplate.version
      } by ${req.user!.email}`
    );

    res.status(200).json({
      success: true,
      data: updatedTemplate
    });
  }
);

/**
 * @desc    Activate QC form template (sets as active, deactivates others)
 * @route   POST /api/v1/qc/forms/:formId/activate
 * @access  Private (QC Admin only)
 */
export const activateFormTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const { formId } = req.params;

    const formTemplate = await QCFormTemplate.findById(formId);

    if (!formTemplate) {
      res.status(404);
      throw new Error("Form template not found");
    }

    formTemplate.isActive = true;
    const activatedTemplate = await formTemplate.save();

    logger.info(
      `QC Form Template activated: ${activatedTemplate.name} v${
        activatedTemplate.version
      } by ${req.user!.email}`
    );

    res.status(200).json({
      success: true,
      message: "Form template activated successfully",
      data: activatedTemplate
    });
  }
);

/**
 * @desc    Get all QC form templates
 * @route   GET /api/v1/qc/forms
 * @access  Private (QC Admin only)
 */
export const getFormTemplates = asyncHandler(
  async (req: Request, res: Response) => {
    const formTemplates = await QCFormTemplate.find()
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: formTemplates.length,
      data: formTemplates
    });
  }
);

/**
 * @desc    Get active QC form template
 * @route   GET /api/v1/qc/forms/active
 * @access  Private
 */
export const getActiveFormTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const activeTemplate = await QCFormTemplate.findOne({ isActive: true });

    if (!activeTemplate) {
      res.status(404);
      throw new Error(
        "No active form template found. Please contact an administrator."
      );
    }

    res.status(200).json({
      success: true,
      data: activeTemplate
    });
  }
);

/**
 * @desc    Get QC form template by ID
 * @route   GET /api/v1/qc/forms/:formId
 * @access  Private
 */
export const getFormTemplateById = asyncHandler(
  async (req: Request, res: Response) => {
    const { formId } = req.params;

    const formTemplate = await QCFormTemplate.findById(formId)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!formTemplate) {
      res.status(404);
      throw new Error("Form template not found");
    }

    res.status(200).json({
      success: true,
      data: formTemplate
    });
  }
);

/**
 * @desc    Delete QC form template
 * @route   DELETE /api/v1/qc/forms/:formId
 * @access  Private (QC Admin only)
 */
export const deleteFormTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const { formId } = req.params;

    const formTemplate = await QCFormTemplate.findById(formId);

    if (!formTemplate) {
      res.status(404);
      throw new Error("Form template not found");
    }

    // Prevent deletion of active template
    if (formTemplate.isActive) {
      res.status(400);
      throw new Error(
        "Cannot delete active form template. Please activate another template first."
      );
    }

    await formTemplate.deleteOne();

    logger.info(
      `QC Form Template deleted: ${formTemplate.name} v${
        formTemplate.version
      } by ${req.user!.email}`
    );

    res.status(200).json({
      success: true,
      message: "Form template deleted successfully"
    });
  }
);
