// QC Question type
export type QCQuestion = {
    questionId: number;
    questionText: string;
    order: number;
    responseType: "checkbox" | "text" | "number";
    requiresImage?: boolean;
    requiresText?: boolean;
    required?: boolean;
    checkMethod?: string;
    passCriteria?: string;
};

// QC Category type
export type QCCategory = {
    categoryId: string;
    categoryName: string;
    order: number;
    questions: QCQuestion[];
};

// QC Tab type
export type QCTab = {
    tabId: string;
    tabName: string;
    order: number;
    categories: QCCategory[];
};

// Header field type
export type QCHeaderField = {
    fieldId: string;
    fieldName: string;
    fieldType: "text" | "date" | "dropdown" | "number";
    required: boolean;
    order?: number;
    options?: string[];
};

// Sign-off field type
export type QCSignOffField = {
    fieldId: string;
    fieldName: string;
    fieldType: "text" | "signature" | "textarea";
    required: boolean;
    order?: number;
};

// QC Form Template
// Backend uses toJSON transform to convert _id to id, so frontend only uses id
export interface QCFormTemplate {
    id: string; // MongoDB _id transformed to id
    name: string;
    description?: string;
    version: string;
    isActive: boolean;
    tabs: QCTab[];
    headerFields: QCHeaderField[];
    signOffFields: QCSignOffField[];
    totalQuestions: number; // Virtual
    createdBy:
        | {
              id: string; // Only id, not _id
              name: string;
              email: string;
          }
        | string; // Can be string if not populated
    updatedBy?:
        | {
              id: string; // Only id, not _id
              name: string;
              email: string;
          }
        | string;
    createdAt: string;
    updatedAt: string;
}

// QC Answer type
export type QCAnswer = {
    questionId: number;
    tabId: string;
    categoryId: string;
    status: "passed" | "repaired" | "replaced" | null;
    remarks?: string;
    imageUrls?: string[]; // Array of uploaded image URLs
    textResponse?: string; // For text-based questions
};

// QC Edit History
export type QCEditHistory = {
    editedBy: {
        id: string;
        name: string;
        email: string;
    };
    editedAt: string;
    changes: string;
};

// QC Submission
export interface QCSubmission {
    id: string;
    robotId: string;
    submittedBy: {
        id: string;
        name: string;
        email: string;
    };
    submittedAt?: string;
    status: "draft" | "submitted" | "approved";
    metadata: Record<string, any>;
    answers: QCAnswer[];
    signOff: Record<string, any>;
    totalQuestions: number;
    answeredQuestions: number;
    completionPercentage: number;
    passRate: number;
    history: QCEditHistory[];
    createdAt: string;
    updatedAt: string;
}

// API Response types
export interface QCFormTemplateResponse {
    success: boolean;
    data: QCFormTemplate;
    totalQuestions?: number;
}

export interface QCFormTemplatesResponse {
    success: boolean;
    count: number;
    data: QCFormTemplate[];
}

export interface QCSubmissionResponse {
    success: boolean;
    data: QCSubmission;
    message?: string;
}

export interface QCSubmissionsResponse {
    success: boolean;
    count: number;
    total: number;
    page: number;
    pages: number;
    data: QCSubmission[];
}

// Form state types for UI
export interface QCFormState {
    template: QCFormTemplate | null;
    submission: QCSubmission | null;
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;
    isDirty: boolean;
    lastSaved: Date | null;
}

// Answer update payload
export interface AnswerUpdatePayload {
    questionId: number;
    tabId: string;
    categoryId: string;
    status: "passed" | "repaired" | "replaced" | null;
    remarks?: string;
    imageUrls?: string[];
    textResponse?: string;
}
