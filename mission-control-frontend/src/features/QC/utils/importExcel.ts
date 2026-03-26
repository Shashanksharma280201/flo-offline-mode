import * as XLSX from "xlsx";
import {
    QCFormTemplate,
    QCTab,
    QCCategory,
    QCQuestion,
    QCHeaderField,
    QCSignOffField
} from "../types";
import { generateShortId } from "../../../util/shortId";
import { normalizeResponseType, normalizeBoolean } from "./normalization";

export interface ImportErrors {
    row: number;
    error: string;
}

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

interface ExcelRow {
    tab: string;
    sub_category: string;
    question: string;
    field_type?: string;
    requires_image?: string | boolean | number;
    requires_text?: string | boolean | number;
    required?: string | boolean | number;
}

/**
 * Normalizes a string to be used as an ID (slug).
 * e.g. "Mechanical Checks" -> "mechanical_checks"
 */
const slugify = (text: string): string => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_") // Replace spaces with _
        .replace(/[^\w\-]+/g, "") // Remove all non-word chars
        .replace(/\-\-+/g, "_"); // Replace multiple - with _
};

export const parseExcelFile = (
    file: File
): Promise<Partial<QCFormTemplate> | ImportErrors[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });

                // Assume first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Parse rows to JSON
                const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, {
                    raw: true, // Keep raw values to handle booleans nicely
                    defval: "" // Default empty cells to empty string
                });

                const errors: ImportErrors[] = [];
                const tabsMap = new Map<string, QCTab>();
                const categoriesMap = new Map<string, QCCategory>(); // Key: tabId_catId
                let questionCounter = 1;

                // 1. Validation & Processing Loop
                rows.forEach((row, index) => {
                    const rowNum = index + 2; // +1 for 0-index, +1 for header

                    // trim keys
                    const tab = row.tab?.toString().trim();
                    const subCat = row.sub_category?.toString().trim();
                    const questionText = row.question?.toString().trim();

                    if (!tab || !subCat || !questionText) {
                        // If fully empty row, skip (sheet_to_json might skip them automatically, but safety check)
                        if (!tab && !subCat && !questionText) return;

                        if (!tab)
                            errors.push({
                                row: rowNum,
                                error: "Missing 'tab'"
                            });
                        if (!subCat)
                            errors.push({
                                row: rowNum,
                                error: "Missing 'sub_category'"
                            });
                        if (!questionText)
                            errors.push({
                                row: rowNum,
                                error: "Missing 'question'"
                            });
                        return;
                    }

                    // Generate IDs
                    const tabId = slugify(tab);
                    const catId = slugify(tab + "_" + subCat);

                    // 1. Handle Tab
                    if (!tabsMap.has(tabId)) {
                        tabsMap.set(tabId, {
                            tabId,
                            tabName: tab, // Use original case for display
                            order: tabsMap.size + 1,
                            categories: []
                        });
                    }
                    const currentTab = tabsMap.get(tabId)!;

                    // 2. Handle Category
                    if (!categoriesMap.has(catId)) {
                        const newCat: QCCategory = {
                            categoryId: catId,
                            categoryName: subCat, // Use original case for display
                            order: currentTab.categories.length + 1,
                            questions: []
                        };
                        currentTab.categories.push(newCat);
                        categoriesMap.set(catId, newCat);
                    }
                    const currentCat = categoriesMap.get(catId)!;

                    // 3. Handle Question

                    // Generate Sequential ID
                    const qIdNumeric = questionCounter++;

                    const newQuestion: QCQuestion = {
                        questionId: qIdNumeric, // Use Numeric ID
                        questionText: questionText,
                        order: currentCat.questions.length + 1,
                        responseType: normalizeResponseType(row.field_type),
                        requiresImage: normalizeBoolean(row.requires_image),
                        requiresText: normalizeBoolean(row.requires_text),
                        required: true
                    };

                    currentCat.questions.push(newQuestion);
                });

                if (errors.length > 0) {
                    resolve(errors);
                } else {
                    const template: Partial<QCFormTemplate> = {
                        tabs: Array.from(tabsMap.values()),
                        headerFields: STANDARD_HEADER_FIELDS,
                        signOffFields: STANDARD_SIGN_OFF_FIELDS
                    };
                    resolve(template);
                }
            } catch (err) {
                resolve([
                    {
                        row: 0,
                        error: "Failed to parse Excel file. Ensure it is a valid .xlsx file."
                    }
                ]);
            }
        };

        reader.onerror = () => {
            resolve([{ row: 0, error: "Failed to read file." }]);
        };

        reader.readAsArrayBuffer(file);
    });
};
