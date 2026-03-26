import axios from "axios";
import { getAuthHeader } from "../auth/authService";
import { ProcessedAppData } from "@/data/types/appDataTypes";
import { fetchInBatches } from "./utils/analyticsHelpers";

/**
 * Sends an API request to get robots that user has access
 *
 * @returns List of Robots accessible by the user
 */
export const getRobotListFn = async () => {
    const response = await axios.get("/api/v1/users/robots", {
        headers: getAuthHeader()
    });

    return response.data;
};

/**
 * Sends an API request to get robots that user has access
 *
 * @returns List of Robots accessible by the user
 */
export const getRobotsFromAppUsersFn = async (id: string) => {
    const response = await axios.post(
        "/api/v1/app/data/robots",
        {
            id
        },
        {
            headers: getAuthHeader()
        }
    );

    return response.data;
};

/**
 * Sends an API request to get clients that user has access
 *
 * @returns List of clients accessible by the user
 */
export const getClientsListFn = async () => {
    const response = await axios.get("/api/v1/users/clients", {
        headers: getAuthHeader()
    });

    return response.data;
};

/**
 * Sends an API request to get operators that the client has access to.
 *
 * @returns List of operators accessible by the client
 */
export const getOperatorsListFn = async () => {
    const response = await axios.get("/api/v1/clients/appUsers", {
        headers: getAuthHeader()
    });

    return response.data;
};

/**
 * Type for the processed sensor data sent by the backend
 */
export type ProcessedSessionInfo = {
    totalDistance: number;
    totalOperationTime: number;
    totalEnergyConsumed: number;
};

/**
 * Fetches the processed sensor data in a timeframe for a particular robot
 * @returns A Promise that resolves with processed robot sensor data.
 */
export const getProcessedSessionData = async ({
    robotId,
    startingTimestamp,
    endingTimestamp
}: {
    robotId?: string;
    startingTimestamp?: number;
    endingTimestamp?: number;
}): Promise<ProcessedSessionInfo> => {
    const response = await axios.post(
        "/api/v1/sensors/fetchProcessedSessionData",
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
 * Fetches sessions within a specified time range from the server.
 * @returns A Promise that resolves with processed application data.
 */
export const getSessionsInRange = async ({
    robotId,
    clientId,
    operatorId,
    startingTimestamp,
    endingTimestamp
}: {
    robotId?: string;
    clientId?: string;
    operatorId?: string;
    startingTimestamp: number;
    endingTimestamp: number;
}): Promise<ProcessedAppData> => {
    const response = await axios.post(
        "/api/v1/app/data/fetchSessionsInRange",
        {
            robotId,
            clientId,
            operatorId,
            startingTimestamp,
            endingTimestamp
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};

export const getOperatorsInRange = async ({
    clientId,
    startingTimestamp,
    endingTimestamp
}: {
    clientId: string;
    startingTimestamp: number;
    endingTimestamp: number;
}) => {
    const response = await axios.post(
        "/api/v1/operators/fetchInRange",
        {
            clientId,
            startingTimestamp,
            endingTimestamp
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};

export const getRobotsInRange = async ({
    startingTimestamp,
    endingTimestamp
}: {
    startingTimestamp: number;
    endingTimestamp: number;
}) => {
    const response = await axios.post(
        "/api/v1/robots/fetchInRange",
        {
            startingTimestamp,
            endingTimestamp
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};

export const getGnssDataInRange = async ({
    robotId,
    startingTimestamp,
    endingTimestamp
}: {
    robotId: string;
    startingTimestamp: number;
    endingTimestamp: number;
}): Promise<import("@/data/types/sensorTypes").SensorData[]> => {
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
 * Fetches and aggregates sessions from multiple clients
 * @returns A Promise that resolves with aggregated ProcessedAppData from all clients
 */
export const getMultiClientSessionsInRange = async ({
    clientIds,
    startingTimestamp,
    endingTimestamp
}: {
    clientIds: string[];
    startingTimestamp: number;
    endingTimestamp: number;
}): Promise<ProcessedAppData & { metadata?: { failedClients: string[] } }> => {
    // Fetch data for all clients in BATCHES to prevent connection overflow
    const { successful, failed } = await fetchInBatches(
        clientIds,
        (clientId) => getSessionsInRange({
            clientId,
            startingTimestamp,
            endingTimestamp
        }),
        5 // Process 5 clients at a time
    );

    // Log failures for debugging
    if (failed.length > 0) {
        console.warn(
            `Failed to fetch data for ${failed.length} client(s):`,
            failed.map(f => f.item)
        );
    }

    // Aggregate all appSessionData and downtimeData from successful fetches
    const aggregatedData: ProcessedAppData = {
        appSessionData: [],
        downtimeData: []
    };

    successful.forEach((result) => {
        aggregatedData.appSessionData.push(...result.appSessionData);
        aggregatedData.downtimeData.push(...result.downtimeData);
    });

    // Attach metadata about failures for UI to display warnings
    return {
        ...aggregatedData,
        metadata: failed.length > 0 ? {
            failedClients: failed.map(f => f.item)
        } : undefined
    };
};
