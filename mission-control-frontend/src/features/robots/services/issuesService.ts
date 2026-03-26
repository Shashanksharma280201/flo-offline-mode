import axios, { AxiosProgressEvent } from "axios";
import { getAuthHeader } from "../../auth/authService";

const API_URL = "/api/v1/issues";

export type IssueQueryParams = {
    startingTimestamp?: number;
    endingTimestamp?: number;
    robotId?: string;
    clientId?: string;
    searchValue?: string;
    issueStatus?: "All" | "Open" | "Closed";
    typeOfIssue?: "All" | "Mechanical" | "Electrical" | "Downtime" | "Observation" | "Other";
    issueSubCategory?: string;
    page: number;
};

export type IssueExportParams = {
    startingTimestamp: number;
    endingTimestamp: number;
    robotId?: string;
    clientId?: string;
    issueStatus?: "All" | "Open" | "Closed";
    typeOfIssue?: "All" | "Mechanical" | "Electrical" | "Downtime" | "Observation" | "Other";
    issueSubCategory?: string;
};

export type ExportedIssue = {
    id: string;
    title: string;
    robotName: string;
    robotId: string;
    clientName: string;
    clientId: string;
    status: string;
    typeOfIssue: string;
    issueSubCategory?: string;
    raisedOnTimestamp: number;
    startTimestamp: number;
    closeTimestamp?: number;
    solution?: string;
    issueDescription?: string;
    raisedBy?: string;
    threadCount: number;
};

export type IssueExportResponse = {
    totalCount: number;
    groupedIssues: {
        mechanical: ExportedIssue[];
        electrical: ExportedIssue[];
        downtime: ExportedIssue[];
        observation: ExportedIssue[];
        other: ExportedIssue[];
    };
    exportedAt: number;
};

/**
 * Sends API request to issues for a robot
 *
 * @param id - robotId
 * @returns List of Issues
 */
export const getIssuesListFn = async (robotId: string) => {
    const response = await axios.post(
        API_URL,
        { robotId },
        { headers: getAuthHeader() }
    );

    return response.data;
};

export const queryIssuesFn = async (issueQueryParams: IssueQueryParams) => {
    const response = await axios.post(`${API_URL}/query`, issueQueryParams, {
        headers: getAuthHeader()
    });

    return response.data;
};

/**
 * Sends API request to issue for a robot
 *
 * @param id - robotId and issueId
 * @returns Requested Issue
 */
export const getIssueFn = async (robotId: string, issueId: string) => {
    const response = await axios.get(API_URL + "/issue/attachments", {
        params: {
            robotId,
            issueId
        },
        headers: getAuthHeader()
    });

    return response.data;
};


// update issue details 
export const updateIssueFn = async (data: {
    title: string;
    status: string;
    typeOfIssue: string;
    // solution?: string;
    // client: string;
    // robot: string;
    // thread?: string;
    robotId: string;
    issueId: string;

}) => {
    const response = await axios.put(`${API_URL}/${data.issueId}`, data, {
        headers: getAuthHeader()
    });

    return response.data;
};

export type CloseIssuePayload = {
    robotId: string;
    issueId: string;
    closeTimestamp: number;
    issueSolution: string;
};

/**
 * Sends API request to close an issue for a robot
 *
 * @param id - robotId and closeTimestamp
 * @returns Requested Issue
 */
export const closeIssueFn = async (closeIssuePayload: CloseIssuePayload) => {
    const response = await axios.post(
        API_URL + "/issue/close",
        closeIssuePayload,
        {
            headers: getAuthHeader()
        }
    );

    return response.data;
};

export type SendMessageToThreadPayload = {
    robotId: string;
    issueId: string;
    raisedOnTimestamp: number;
    message: string;
    messageTimestamp: number;
    attachments: File[];
    uploadProgress?: (progress: AxiosProgressEvent) => void;
};
/**
 * Sends API request to send message to issue thread for a robot
 *
 * @returns Success message indicating successfull message submission
 */
export const sendMessageToThreadFn = async ({
    robotId,
    issueId,
    raisedOnTimestamp,
    message,
    messageTimestamp,
    attachments,
    uploadProgress
}: SendMessageToThreadPayload) => {
    const formData = new FormData();
    formData.append("robotId", robotId);
    formData.append("issueId", issueId);
    formData.append("raisedOnTimestamp", `${raisedOnTimestamp}`);
    formData.append("message", message);
    formData.append("messageTimestamp", `${messageTimestamp}`);

    attachments.forEach((file) => {
        formData.append("issueMedia", file);
    });

    const response = await axios.post(API_URL + "/thread", formData, {
        headers: {
            ...getAuthHeader(),
            "Content-Type": "multipart/form-data",
            Accept: "*/*"
        },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            uploadProgress && uploadProgress(progressEvent);
        }
    });

    return response.data;
};

/**
 * Fetches issues for Excel export - returns all issues (no pagination) grouped by category
 *
 * @param exportParams - Export parameters including date range and filters
 * @returns Grouped issues by category (mechanical, electrical, other)
 */
export const exportIssuesFn = async (
    exportParams: IssueExportParams
): Promise<IssueExportResponse> => {
    const response = await axios.get(`${API_URL}/export`, {
        params: {
            startingTimestamp: exportParams.startingTimestamp,
            endingTimestamp: exportParams.endingTimestamp,
            ...(exportParams.robotId && { robotId: exportParams.robotId }),
            ...(exportParams.clientId && { clientId: exportParams.clientId }),
            ...(exportParams.issueStatus && {
                issueStatus: exportParams.issueStatus
            }),
            ...(exportParams.typeOfIssue && {
                typeOfIssue: exportParams.typeOfIssue
            }),
            ...(exportParams.issueSubCategory && {
                issueSubCategory: exportParams.issueSubCategory
            })
        },
        headers: getAuthHeader()
    });

    return response.data;
};
