import {
    FormattedLeadPayload,
    LeadPayload,
    NextStep,
    NextStepPayload,
    ResponsePayload,
    TargetChangePayload
} from "@/data/types/leadTypes";
import { getAuthHeader } from "@/features/auth/authService";
import axios from "axios";

const baseUrl = "/api/v1/leads";

// Lead services
export const fetchLeadsFn = async (query: string) => {
    const response = await axios.get(`${baseUrl}?${query}`, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const fetchWeeklyReportDataFn = async ({
    startDate,
    endDate,
    product
}: {
    startDate: Date;
    endDate: Date;
    product?: string;
}) => {
    const response = await axios.post(
        `${baseUrl}/get-weekly-report`,
        {
            startDate,
            endDate,
            product
        },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const downloadLeadsFn = async () => {
    const response = await axios.get(`${baseUrl}/download`, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const uploadLeadsFn = async (leads: FormattedLeadPayload[]) => {
    const response = await axios.post(baseUrl + "/merge-leads", leads, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const fetchLeadFn = async (leadId: string) => {
    const response = await axios.get(`${baseUrl}/${leadId}`, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const addLeadFn = async (lead: Partial<LeadPayload>) => {
    const response = await axios.post(baseUrl, lead, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const updateLeadFn = async (
    lead: Partial<LeadPayload>,
    id: string,
    response?: ResponsePayload,
    nextStep?: NextStepPayload
) => {
    const result = await axios.put(
        `${baseUrl}/${id}`,
        { ...lead, nextStep, response },
        {
            headers: getAuthHeader()
        }
    );
    return result.data;
};

export const deleteLeadFn = async (id: string) => {
    const response = await axios.delete(`${baseUrl}/${id}`, {
        headers: getAuthHeader()
    });
    return response.data;
};

// Response services
export const addResponseFn = async (
    newResponse: ResponsePayload,
    leadId: string
) => {
    const response = await axios.post(
        `${baseUrl}/${leadId}/responses`,
        newResponse,
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const updateResponseFn = async (
    updatedResponse: ResponsePayload,
    leadId: string,
    responseId: string
) => {
    const response = await axios.put(
        `${baseUrl}/${leadId}/responses/${responseId}`,
        updatedResponse,
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const deleteResponseFn = async (leadId: string, responseId: string) => {
    const response = await axios.delete(
        `${baseUrl}/${leadId}/responses/${responseId}`,
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

// NextStep services
export const addNextStepFn = async (
    newNextStep: Partial<NextStep>,
    leadId: string
) => {
    const response = await axios.post(
        `${baseUrl}/${leadId}/steps`,
        newNextStep,
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const updateNextStepFn = async (
    updatedNextStep: Partial<NextStep>,
    leadId: string,
    stepId: string
) => {
    const response = await axios.put(
        `${baseUrl}/${leadId}/steps/${stepId}`,
        updatedNextStep,
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const deleteNextStepFn = async (leadId: string, stepId: string) => {
    const response = await axios.delete(
        `${baseUrl}/${leadId}/steps/${stepId}`,
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

// Closing Plan services
export const addClosingPlanFn = async (
    closePlan: { description: string; audioData?: string; audioDuration?: number },
    leadId: string
) => {
    const response = await axios.post(
        `${baseUrl}/${leadId}/plan`,
        closePlan,
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const updateClosingPlanFn = async (
    closePlan: { description: string; audioData?: string; audioDuration?: number },
    leadId: string
) => {
    const response = await axios.put(
        `${baseUrl}/${leadId}/plan`,
        closePlan,
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const addTargetChangeFn = async (
    targetChange: TargetChangePayload,
    leadId: string
) => {
    const response = await axios.post(
        `${baseUrl}/${leadId}/targetChange`,
        targetChange,
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const updateTargetChangeFn = async (
    targetChange: TargetChangePayload,
    leadId: string,
    targetId: string
) => {
    const response = await axios.put(
        `${baseUrl}/${leadId}/targetChange/${targetId}`,
        targetChange,
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};
