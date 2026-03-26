import axios from "axios";
import { getAuthHeader } from "@/features/auth/authService";
import {
    QCSubmission,
    QCSubmissionResponse,
    QCSubmissionsResponse
} from "../types";

const API_BASE = "/api/v1/qc";

/**
 * Create a new QC submission
 */
export const createQCSubmission = async (
    submissionData: Partial<QCSubmission>
): Promise<QCSubmission> => {
    const response = await axios.post<QCSubmissionResponse>(
        `${API_BASE}/submissions`,
        submissionData,
        { headers: getAuthHeader() }
    );
    return response.data.data;
};

/**
 * Update existing QC submission
 */
export const updateQCSubmission = async (
    submissionId: string,
    submissionData: Partial<QCSubmission>
): Promise<QCSubmission> => {
    const response = await axios.put<QCSubmissionResponse>(
        `${API_BASE}/submissions/${submissionId}`,
        submissionData,
        { headers: getAuthHeader() }
    );
    return response.data.data;
};

/**
 * Submit/finalize QC submission
 */
export const submitQC = async (submissionId: string): Promise<QCSubmission> => {
    const response = await axios.post<QCSubmissionResponse>(
        `${API_BASE}/submissions/${submissionId}/submit`,
        {},
        { headers: getAuthHeader() }
    );
    return response.data.data;
};

/**
 * Get latest QC submission for a robot
 */
export const getLatestQCForRobot = async (
    robotId: string
): Promise<QCSubmission> => {
    const response = await axios.get<QCSubmissionResponse>(
        `${API_BASE}/submissions/robot/${robotId}`,
        { headers: getAuthHeader() }
    );
    return response.data.data;
};

/**
 * Get QC submission history for a robot
 */
export const getQCHistoryForRobot = async (
    robotId: string,
    page: number = 1,
    limit: number = 10
): Promise<{
    submissions: QCSubmission[];
    total: number;
    page: number;
    pages: number;
}> => {
    try {
        const response = await axios.get<QCSubmissionsResponse>(
            `${API_BASE}/submissions/robot/${robotId}/history`,
            {
                params: { page, limit },
                headers: getAuthHeader()
            }
        );

        return {
            submissions: Array.isArray(response.data?.data)
                ? response.data.data
                : [],
            total:
                typeof response.data?.total === "number"
                    ? response.data.total
                    : 0,
            page:
                typeof response.data?.page === "number"
                    ? response.data.page
                    : 1,
            pages:
                typeof response.data?.pages === "number"
                    ? response.data.pages
                    : 1
        };
    } catch (error) {
        console.error("Error in getQCHistoryForRobot:", error);
        return {
            submissions: [],
            total: 0,
            page: 1,
            pages: 1
        };
    }
};

/**
 * Get QC submission by ID
 */
export const getQCSubmissionById = async (
    submissionId: string
): Promise<QCSubmission> => {
    const response = await axios.get<QCSubmissionResponse>(
        `${API_BASE}/submissions/${submissionId}`,
        { headers: getAuthHeader() }
    );
    return response.data.data;
};

/**
 * Delete QC submission
 */
export const deleteQCSubmission = async (
    submissionId: string
): Promise<void> => {
    await axios.delete(`${API_BASE}/submissions/${submissionId}`, {
        headers: getAuthHeader()
    });
};
