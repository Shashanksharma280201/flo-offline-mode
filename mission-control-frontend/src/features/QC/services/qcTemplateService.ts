import axios from "axios";
import { getAuthHeader } from "@/features/auth/authService";
import { QCFormTemplate } from "../types";

const API_URL = "/api/v1/qc/templates";

// -- API Types --

export interface CreateQCTemplatePayload {
    name: string;
    version: string;
    description?: string;
    tabs: any[]; // Using any[] for now, should map to QCTab[]
    headerFields?: any[];
    signOffFields?: any[];
}

export interface UpdateQCTemplatePayload {
    name?: string;
    version?: string;
    description?: string;
    isActive?: boolean;
    tabs?: any[];
    headerFields?: any[];
    signOffFields?: any[];
}

export interface QCTemplatesResponse {
    success: boolean;
    count: number;
    data: QCFormTemplate[];
}

export interface QCTemplateResponse {
    success: boolean;
    data: QCFormTemplate;
}

// -- Service Functions --

/**
 * Fetch all QC templates
 */
export const getAllTemplates = async (params?: {
    isActive?: boolean;
}): Promise<QCFormTemplate[]> => {
    const response = await axios.get<QCTemplatesResponse>(API_URL, {
        params,
        headers: getAuthHeader()
    });

    return response.data.data;
};

/**
 * Get a single QC template by ID
 */
export const getTemplateById = async (id: string): Promise<QCFormTemplate> => {
    const response = await axios.get<QCTemplateResponse>(`${API_URL}/${id}`, {
        headers: getAuthHeader()
    });
	console.log("temple that is got: ",response.data.data)
    return response.data.data;
};

/**
 * Create a new QC template
 */
export const createTemplate = async (
    payload: CreateQCTemplatePayload
): Promise<QCFormTemplate> => {
    console.log(payload);
    const response = await axios.post<QCTemplateResponse>(API_URL, payload, {
        headers: getAuthHeader()
    });
    return response.data.data;
};

/**
 * Update an existing QC template
 * Useful for fixing typos or updating metadata
 */
export const updateTemplate = async (
    id: string,
    payload: UpdateQCTemplatePayload
): Promise<QCFormTemplate> => {
    const response = await axios.put<QCTemplateResponse>(
        `${API_URL}/${id}`,
        payload,
        {
            headers: getAuthHeader()
        }
    );
    return response.data.data;
};

/**
 * Clone a template to a new version
 */
export const cloneTemplate = async (
    id: string,
    newVersion: string
): Promise<QCFormTemplate> => {
    const sourceTemplate = await getTemplateById(id);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {
        id: _id, // Exclude id from cloning (will get new id from backend)
        createdAt,
        updatedAt,
        createdBy,
        ...templateData
    } = sourceTemplate as any;

    const payload: CreateQCTemplatePayload = {
        ...templateData,
        version: newVersion,
        name: templateData.name // Keep same name to indicate same "family"
    };

    return createTemplate(payload);
};

/**
 * Get active QC form template
 */
export const getActiveQCTemplate = async (): Promise<QCFormTemplate> => {
    const response = await axios.get(`${API_URL}/active`, {
        headers: getAuthHeader()
    });
    return response.data;
};

/**
 * Get resolved QC template for a robot (Snapshot -> Fleet -> Active)
 * Supports conditional fetching via templateId and lastUpdated
 */
export const getQCTemplateForRobot = async (
    robotId: string,
    params?: { templateId?: string; lastUpdated?: string }
): Promise<{ modified: boolean; data?: QCFormTemplate }> => {
    const response = await axios.get(`/api/v1/qc/robot/${robotId}/template`, {
        params,
        headers: getAuthHeader()
    });

    console.log("getActiveQCTemplate: ", response.data);
    return response.data;
};
