import {
    QCFormTemplate,
    QCQuestion,
    QCTab,
    QCCategory,
    QCHeaderField,
    QCSignOffField
} from "../types";

const STANDARD_HEADER_FIELDS: QCHeaderField[] = [
    {
        fieldId: "vendor_name",
        fieldName: "Vendor Name",
        fieldType: "dropdown",
        required: true,
        order: 1,
        options: ["GKX", "Abhirup", "Flomobility"]
    }
];

const STANDARD_SIGN_OFF_FIELDS: QCSignOffField[] = [
    {
        fieldId: "qc_remarks",
        fieldName: "QC Remarks",
        fieldType: "textarea",
        required: false,
        order: 1
    }
];

/**
 * Normalizes response type to "checkbox", "text", or "number".
 * Default: "checkbox"
 */
export const normalizeResponseType = (
    val: any
): "checkbox" | "text" | "number" => {
    return "checkbox";
};

/**
 * Normalizes boolean values.
 * Supports: true, "true", "yes", "1", 1
 */
export const normalizeBoolean = (val: any): boolean => {
    if (val === true || val === 1) return true;
    if (typeof val === "string") {
        const lower = val.toLowerCase().trim();
        return lower === "true" || lower === "yes" || lower === "1";
    }
    return false;
};

/**
 * Normalizes a single question object.
 * This ensures that even if some fields are missing or wrongly typed in JSON,
 * they are corrected to valid defaults.
 */
export const normalizeQuestion = (question: any): QCQuestion => {
    return {
        ...question,
        questionId: question.questionId,
        questionText: question.questionText || "",
        order: question.order || 0,
        responseType: normalizeResponseType(question.responseType),
        requiresImage: normalizeBoolean(question.requiresImage),
        requiresText: normalizeBoolean(question.requiresText),
        required: true
    };
};

/**
 * Deeply normalizes a QC template structure.
 * Ensures all questions have valid response types and other fields.
 */
export const normalizeTemplate = (
    template: Partial<QCFormTemplate>
): Partial<QCFormTemplate> => {
    if (!template.tabs || !Array.isArray(template.tabs)) {
        return template;
    }

    const normalizedTabs: QCTab[] = template.tabs.map((tab: any) => ({
        ...tab,
        categories: (tab.categories || []).map((cat: any) => ({
            ...cat,
            questions: (cat.questions || []).map((q: any) =>
                normalizeQuestion(q)
            )
        }))
    }));

    return {
        ...template,
        tabs: normalizedTabs,
        headerFields:
            template.headerFields && template.headerFields.length > 0
                ? template.headerFields
                : STANDARD_HEADER_FIELDS,
        signOffFields:
            template.signOffFields && template.signOffFields.length > 0
                ? template.signOffFields
                : STANDARD_SIGN_OFF_FIELDS
    };
};
