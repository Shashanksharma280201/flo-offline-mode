// Consolidated QC Service Entry Point
// Logic is moved to services/ to follow project conventions

export * from "./services/qcTemplateService";
export * from "./services/qcSubmissionService";

// Re-export types for backward compatibility
export type {
    QCFormTemplate,
    QCSubmission,
    QCAnswer,
    QCHeaderField,
    QCSignOffField,
    QCTab
} from "./types";

// Named exports for specific aliases used in components
export {
    getTemplateById as getQCTemplateById,
    getAllTemplates as getQCFormTemplates
} from "./services/qcTemplateService";
