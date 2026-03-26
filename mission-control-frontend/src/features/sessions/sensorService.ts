import axios from "axios";
import { getAuthHeader } from "../auth/authService";

const API_URL = "/api/v1/sensors/";

/**
 * Sends API request to get video data
 * @param robotId - robotId
 * @param sessionId - session Id of the robot
 * @returns List of video urls accessible by the user
 */
export const getVideoDataFn = async (robotId: string, sessionId: string) => {
    const response = await axios.post(
        `${API_URL}fetchVideos`,
        {
            robotId,
            sessionId
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};
/**
 * Sends API request to get video data in a given time range
 * @param robotId - robotId
 * @param startingDate - Starting timestamp
 * @param endingDate - Ending timestamp
 * @returns List of video urls accessible by the user
 */
export const getVideoDataInRangeFn = async (
    robotId: string,
    startingTimestamp: number,
    endingTimestamp: number
) => {
    const response = await axios.post(
        `${API_URL}fetchVideosInRange`,
        {
            robotId,
            startingTimestamp,
            endingTimestamp
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};

/**
 * Sends API request to get distance data
 * @param robotId - robotId
 * @param sessionId - session Id of the robot
 * @returns List of distance readings accessible by the user
 */
export const getDistanceDataFn = async (robotId: string, sessionId: string) => {
    const response = await axios.post(
        "/api/v1/sensors/fetchDistance",
        {
            robotId,
            sessionId
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};

export const getIMUDataFn = async (robotId: string, sessionId: string) => {
    const response = await axios.post(
        "/api/v1/sensors/fetchImu",
        {
            robotId,
            sessionId
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};
/**
 * Sends API request to get sensor data in a given time range
 * @param robotId - robotId
 * @param startingDate - Starting timestamp
 * @param endingDate - Ending timestamp
 * @returns List of Robots accessible by the user
 */
export const getDistanceDataInRangeFn = async (
    robotId: string,
    startingTimestamp: number,
    endingTimestamp: number
) => {
    const response = await axios.post(
        "/api/v1/sensors/fetchDistanceInRange",
        {
            robotId,
            startingTimestamp,
            endingTimestamp
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};

/**
 * Sends API request to get gnss data
 * @param robotId - robotId
 * @param sessionId - session Id of the robot
 * @returns List of gnss readings accessible by the user
 */
export const getGnssDataFn = async (robotId: string, sessionId: string) => {
    const response = await axios.post(
        "/api/v1/sensors/fetchGnss",
        {
            robotId,
            sessionId
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};

/**
 * Sends API request to get sensor data in a given time range
 * @param robotId - robotId
 * @param startingDate - Starting timestamp
 * @param endingDate - Ending timestamp
 * @returns List of Robots accessible by the user
 */
export const getGnssDataInRangeFn = async (
    robotId: string,
    startingTimestamp: number,
    endingTimestamp: number
) => {
    const response = await axios.post(
        "/api/v1/sensors/fetchGnssInRange",
        {
            robotId,
            startingTimestamp,
            endingTimestamp
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};

/**
 * Sends API request to get battery data
 * @param robotId - robotId
 * @param sessionId - session Id of the robot
 * @returns List of battery readings accessible by the user
 */
export const getBatteryDataFn = async (robotId: string, sessionId: string) => {
    const response = await axios.post(
        "/api/v1/sensors/fetchBattery",
        {
            robotId,
            sessionId
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};

export const getMMRDataFn = async (robotId: string, sessionId: string) => {
    const response = await axios.post(
        "/api/v1/sensors/fetchMMRData",
        {
            robotId,
            sessionId
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};

/**
 * Sends API request to get payload weight data
 * @param robotId - robotId
 * @param sessionId - session Id of the robot
 * @returns List of payload weight readings accessible by the user
 */
export const getPayloadWeightDataFn = async (robotId: string, sessionId: string) => {
    const response = await axios.post(
        "/api/v1/sensors/fetchPayloadWeight",
        {
            robotId,
            sessionId
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};

/**
 * Sends API request to get sensor data in a given time range
 * @param robotId - robotId
 * @param startingDate - Starting timestamp
 * @param endingDate - Ending timestamp
 * @returns List of Robots accessible by the user
 */
export const getBatteryDataInRangeFn = async (
    robotId: string,
    startingTimestamp: number,
    endingTimestamp: number
) => {
    const response = await axios.post(
        "/api/v1/sensors/fetchBatteryInRange",
        {
            robotId,
            startingTimestamp,
            endingTimestamp
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};

/**
 * Sends API request to get imu data
 * @param robotId - robotId
 * @param sessionId - session Id of the robot
 * @returns List of imu readings accessible by the user
 */
export const getImuDataFn = async (robotId: string, sessionId: string) => {
    const response = await axios.post(
        "/api/v1/sensors/fetchImu",
        {
            robotId,
            sessionId
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};
/**
 * Sends API request to get sensor data in a given time range
 * @param robotId - robotId
 * @param startingDate - Starting timestamp
 * @param endingDate - Ending timestamp
 * @returns List of Robots accessible by the user
 */
export const getImuDataInRangeFn = async (
    robotId: string,
    startingTimestamp: number,
    endingTimestamp: number
) => {
    const response = await axios.post(
        "/api/v1/sensors/fetchImuInRange",
        {
            robotId,
            startingTimestamp,
            endingTimestamp
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};

export const getNissanSystemMetrics = async (
    deviceId: string,
    sessionId: string
) => {
    const response = await axios.get(
        `/api/v1/nissan/${deviceId}/${sessionId}/system-metrics`,
        { headers: getAuthHeader() }
    );
    return response.data;
};

export const getNissanSystemStatusFn = async (
    deviceId: string,
    sessionId: string
) => {
    const response = await axios.get(
        `/api/v1/nissan/${deviceId}/${sessionId}/systemStatus`,
        { headers: getAuthHeader() }
    );
    return response.data;
};

export const getNissanMediaFn = async (deviceId: string, sessionId: string) => {
    const response = await axios.get(
        `/api/v1/nissan/${deviceId}/${sessionId}/media`,
        { headers: getAuthHeader() }
    );
    return response.data;
};

export const getBatteryErrorsDataFn = async (
    robotId: string,
    sessionId: string
) => {
    const response = await axios.post(
        `${API_URL}fetchBatteryErrors`,
        {
            robotId,
            sessionId
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};
