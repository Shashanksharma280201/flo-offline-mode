import { SessionsInRangeResponse } from "@/data/types";
import axios from "axios";
import { getAuthHeader } from "../../auth/authService";

const API_URL = "/api/v1";

/**
 * Sends API request to get session events in a given time range
 * @param robotId - robotId
 * @param startingDate - Starting timestamp
 * @param endingDate - Ending timestamp
 * @returns List of session events
 */
export const getSessionEventsFn = async (
    robotId: string,
    startingTimestamp: number,
    endingTimestamp: number
): Promise<SessionsInRangeResponse> => {
    const response = await axios.post(
        `${API_URL}/sensors/fetchSessionsInRange`,
        {
            robotId,
            startingTimestamp,
            endingTimestamp
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};

export const getMaintenanceData = async (
    robotId: string,
    startingTimestamp: number,
    endingTimestamp: number
) => {
    const response = await axios.post(
        `${API_URL}/maintenance/fetchAll`,
        {
            robotId,
            startingTimestamp,
            endingTimestamp
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};

export const getSingleMaintenanceData = async (
    robotId: string,
    submissionTimestamp: number
) => {
    const response = await axios.post(
        `${API_URL}/maintenance/fetchOne`,
        {
            robotId,
            submissionTimestamp
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};

export const getNissanSessions = async (
    deviceId: string,
    startingTimestamp: number,
    endingTimestamp: number
) => {
    const response = await axios.post(
        `${API_URL}/nissan/fetchSessionsInRange`,
        {
            deviceId,
            startingTimestamp,
            endingTimestamp
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};
