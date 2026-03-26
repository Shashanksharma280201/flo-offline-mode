import axios from "axios";
import { getAuthHeader } from "../auth/authService";
import { ProcessedAppData } from "@/data/types/appDataTypes";
import { getProcessedSessionData } from "./analyticsService";
import { CostAnalysisResult, MonthlyRobotCostInput } from "./types/costAnalysisTypes";
import { calculateCostAnalysis } from "./services/costAnalysisService";

export interface PDFData {
    client: {
        name: string;
        location: string;
        count?: number; // Number of clients in multi-client reports
    };
    dateRange: {
        start: number;
        end: number;
    };
    summary: {
        totalTrips: number;
        totalDowntime: number;
        totalOperationalTime: number;
        totalDistance: number;
        totalEnergyConsumed: number;
    };
    chartData: ProcessedAppData;
    costAnalysis?: CostAnalysisResult; // Optional cost analysis data
    shiftHours: number; // Full shift hours for operator productivity calculation
}

/**
 * Fetches analytics data for PDF generation for a single client
 * @param clientId - The client ID
 * @param startingTimestamp - Start date timestamp
 * @param endingTimestamp - End date timestamp
 * @param operatorId - Optional operator ID filter
 * @param robotId - Optional robot ID filter
 * @returns PDF data including summary and chart data
 */
export const fetchSingleClientPDFData = async ({
    clientId,
    startingTimestamp,
    endingTimestamp,
    operatorId,
    robotId,
    monthlyRobotCost
}: {
    clientId: string;
    startingTimestamp: number;
    endingTimestamp: number;
    operatorId?: string;
    robotId?: string;
    monthlyRobotCost?: number;
}): Promise<PDFData> => {
    // Fetch session data
    const response = await axios.post(
        "/api/v1/app/data/fetchSessionsInRange",
        {
            clientId,
            startingTimestamp,
            endingTimestamp,
            operatorId,
            robotId
        },
        { headers: getAuthHeader() }
    );

    // Get client details
    const clientResponse = await axios.get(`/api/v1/clients/${clientId}`, {
        headers: getAuthHeader()
    });

    // Extract shift hours from client data (default to 10 if not available)
    const clientShiftHours = clientResponse.data.operatingHours || 10;

    const chartData: ProcessedAppData = response.data;

    // Fetch sensor data (distance and energy) for robots
    let totalDistance = 0;
    let totalEnergyConsumed = 0;

    if (robotId) {
        // Single robot case - fetch sensor data for that robot
        try {
            const sessionInfo = await getProcessedSessionData({
                robotId,
                startingTimestamp,
                endingTimestamp
            });
            totalDistance = sessionInfo.totalDistance || 0;
            totalEnergyConsumed = sessionInfo.totalEnergyConsumed || 0;
        } catch (err) {
            console.error("Error fetching sensor data for robot:", err);
        }
    } else if (clientId) {
        // Client case - fetch sensor data for all robots that have sessions
        const robotIds = [
            ...new Set(
                chartData.appSessionData
                    .map((session) => session.robotId)
                    .filter((id) => id !== undefined && id !== null)
            )
        ];

        if (robotIds.length > 0) {
            try {
                const sensorDataPromises = robotIds.map(async (rId: string) => {
                    try {
                        return await getProcessedSessionData({
                            robotId: rId,
                            startingTimestamp,
                            endingTimestamp
                        });
                    } catch (err) {
                        console.error(`Error fetching sensor data for robot ${rId}:`, err);
                        return { totalDistance: 0, totalEnergyConsumed: 0 };
                    }
                });

                const sensorDataResults = await Promise.all(sensorDataPromises);

                totalDistance = sensorDataResults.reduce(
                    (sum, data) => sum + (data.totalDistance || 0),
                    0
                );
                totalEnergyConsumed = sensorDataResults.reduce(
                    (sum, data) => sum + (data.totalEnergyConsumed || 0),
                    0
                );
            } catch (err) {
                console.error("Error fetching sensor data for client robots:", err);
            }
        }
    }

    // Calculate summary from session data
    const summary = calculateSummary(chartData, totalDistance, totalEnergyConsumed);

    // Calculate cost analysis if monthly robot cost is provided
    let costAnalysis: CostAnalysisResult | undefined;
    if (monthlyRobotCost && monthlyRobotCost > 0) {
        // Pass client-specific productive hours (shift hours - 1 hour break) in labor config
        costAnalysis = calculateCostAnalysis(chartData, monthlyRobotCost, {
            laborDailyWage: 650,
            dailyProductiveHours: clientShiftHours - 1, // Subtract 1 hour for break
            laborersPerWheelbarrow: 2,
            laborersPerRobotLoading: 1,
            laborersPerRobotUnloading: 1,
            payloadRatio: 4,
            timeMultiplier: 1.65
        });
    }

    return {
        client: {
            name: clientResponse.data.name || "Unknown Client",
            location: ""
        },
        dateRange: {
            start: startingTimestamp,
            end: endingTimestamp
        },
        summary,
        chartData,
        costAnalysis,
        shiftHours: clientShiftHours // Full shift hours for operator productivity
    };
};

/**
 * Calculate summary metrics from session data
 */
function calculateSummary(
    data: ProcessedAppData,
    totalDistance: number,
    totalEnergyConsumed: number
): PDFData["summary"] {
    const { appSessionData, downtimeData } = data;

    const totalTrips = appSessionData.length;

    const totalDowntime = downtimeData.reduce((sum, dt) => sum + dt.downTimeDuration, 0);

    const totalOperationalTime = appSessionData.reduce(
        (sum, session) =>
            sum +
            session.loadingTime +
            session.tripTime +
            session.unloadingTime +
            session.returnTripTime,
        0
    );

    return {
        totalTrips,
        totalDowntime,
        totalOperationalTime,
        totalDistance,
        totalEnergyConsumed
    };
}

/**
 * Fetches analytics data for multiple clients and aggregates into ONE combined PDF
 * @param clientIds - Array of client IDs
 * @param startingTimestamp - Start date timestamp
 * @param endingTimestamp - End date timestamp
 * @param monthlyRobotCosts - Per-client monthly robot costs mapping
 * @returns Single PDFData object with aggregated data from all clients
 */
export const fetchMultiClientPDFData = async ({
    clientIds,
    startingTimestamp,
    endingTimestamp,
    monthlyRobotCosts
}: {
    clientIds: string[];
    startingTimestamp: number;
    endingTimestamp: number;
    monthlyRobotCosts?: MonthlyRobotCostInput;
}): Promise<PDFData> => {
    // Fetch data for all clients in BATCHES (not all at once)
    const batchSize = 5;
    const allResults: ProcessedAppData[] = [];
    const failedClients: string[] = [];

    for (let i = 0; i < clientIds.length; i += batchSize) {
        const batch = clientIds.slice(i, i + batchSize);
        const batchPromises = batch.map((clientId) =>
            axios
                .post(
                    "/api/v1/app/data/fetchSessionsInRange",
                    { clientId, startingTimestamp, endingTimestamp },
                    { headers: getAuthHeader() }
                )
                .then((response) => ({ success: true, data: response.data, clientId }))
                .catch((error) => ({ success: false, error, clientId }))
        );

        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result) => {
            if (result.status === "fulfilled") {
                const value = result.value;
                if (value.success) {
                    // Type assertion: we know success=true means data property exists
                    allResults.push((value as { success: true; data: ProcessedAppData; clientId: string }).data);
                } else {
                    failedClients.push(value.clientId);
                    console.warn(`Failed to fetch PDF data for client ${value.clientId}`);
                }
            } else {
                failedClients.push("unknown");
                console.warn(`Failed to fetch PDF data for unknown client`);
            }
        });
    }

    // Show warning if some clients failed
    if (failedClients.length > 0) {
        console.warn(
            `PDF generation: ${failedClients.length} clients failed`,
            failedClients
        );
    }

    // Aggregate all successful session and downtime data
    const aggregatedChartData: ProcessedAppData = {
        appSessionData: [],
        downtimeData: []
    };

    allResults.forEach((result) => {
        aggregatedChartData.appSessionData.push(...result.appSessionData);
        aggregatedChartData.downtimeData.push(...result.downtimeData);
    });

    // Extract unique robot IDs from all sessions
    const robotIds = [
        ...new Set(
            aggregatedChartData.appSessionData
                .map((session) => session.robotId)
                .filter((id) => id !== undefined && id !== null)
        )
    ];

    // Fetch sensor data for all robots IN BATCHES
    let totalDistance = 0;
    let totalEnergyConsumed = 0;

    if (robotIds.length > 0) {
        const sensorBatchSize = 5;
        for (let i = 0; i < robotIds.length; i += sensorBatchSize) {
            const sensorBatch = robotIds.slice(i, i + sensorBatchSize);
            const sensorPromises = sensorBatch.map(async (rId: string) => {
                try {
                    return await getProcessedSessionData({
                        robotId: rId,
                        startingTimestamp,
                        endingTimestamp
                    });
                } catch (err) {
                    console.error(`Error fetching sensor data for robot ${rId}:`, err);
                    return { totalDistance: 0, totalEnergyConsumed: 0 };
                }
            });

            const sensorResults = await Promise.allSettled(sensorPromises);

            sensorResults.forEach((result) => {
                if (result.status === "fulfilled") {
                    totalDistance += result.value.totalDistance || 0;
                    totalEnergyConsumed += result.value.totalEnergyConsumed || 0;
                }
            });
        }
    }

    // Calculate summary from aggregated data
    const summary = calculateSummary(
        aggregatedChartData,
        totalDistance,
        totalEnergyConsumed
    );

    // Fetch client details to build clientName -> cost and shiftHours mappings
    const clientDetailsPromises = clientIds
        .filter((id) => !failedClients.includes(id)) // Only fetch successful clients
        .map((clientId) =>
            axios
                .get(`/api/v1/clients/${clientId}`, { headers: getAuthHeader() })
                .then((response) => ({
                    id: clientId,
                    name: response.data.name,
                    shiftHours: response.data.operatingHours || 10
                }))
                .catch(() => ({
                    id: clientId,
                    name: "Unknown Client",
                    shiftHours: 10
                }))
        );

    const clientDetailsResults = await Promise.allSettled(clientDetailsPromises);
    const clientDetails = clientDetailsResults
        .filter((r): r is PromiseFulfilledResult<{ id: string; name: string; shiftHours: number }> => r.status === "fulfilled")
        .map((r) => r.value);

    const clientNames = clientDetails.map((c) => c.name).join(", ");

    // Build clientName -> monthlyRobotCost mapping
    const clientNameToCostMapping: { [clientName: string]: number } = {};
    // Build clientName -> productive hours mapping (shiftHours - 1) for cost analysis
    const clientNameToProductiveHoursMapping: { [clientName: string]: number } = {};

    if (monthlyRobotCosts) {
        clientDetails.forEach((client) => {
            const cost = monthlyRobotCosts[client.id];
            if (cost && cost > 0) {
                clientNameToCostMapping[client.name] = cost;
            }

            // Map productive hours (shift hours - 1 hour break) for cost analysis
            clientNameToProductiveHoursMapping[client.name] = client.shiftHours - 1;
        });
    }

    // Calculate weighted average of FULL shift hours for operator productivity
    let weightedAverageShiftHours = 10; // Default
    if (clientDetails.length > 0) {
        const sessionsByClient: { [clientName: string]: number } = {};
        aggregatedChartData.appSessionData.forEach(session => {
            const clientName = session.clientName;
            sessionsByClient[clientName] = (sessionsByClient[clientName] || 0) + 1;
        });

        let totalWeightedHours = 0;
        let totalSessions = 0;

        clientDetails.forEach((client) => {
            const sessionCount = sessionsByClient[client.name] || 0;
            if (sessionCount > 0) {
                totalWeightedHours += client.shiftHours * sessionCount; // Use FULL shift hours
                totalSessions += sessionCount;
            }
        });

        if (totalSessions > 0) {
            weightedAverageShiftHours = totalWeightedHours / totalSessions;
        }
    }

    // Calculate cost analysis with per-client costs and productive hours
    let costAnalysis: CostAnalysisResult | undefined;
    if (monthlyRobotCosts && Object.keys(clientNameToCostMapping).length > 0) {
        costAnalysis = calculateCostAnalysis(
            aggregatedChartData,
            clientNameToCostMapping,
            undefined, // Use default labor config but override with productive hours mapping
            clientNameToProductiveHoursMapping // Pass productive hours (shift - 1) mapping
        );
    }

    return {
        client: {
            name:
                clientNames +
                (failedClients.length > 0
                    ? ` (${failedClients.length} clients excluded)`
                    : ""),
            location: "",
            count: clientIds.length // Pass actual count for PDF display
        },
        dateRange: {
            start: startingTimestamp,
            end: endingTimestamp
        },
        summary,
        chartData: aggregatedChartData,
        costAnalysis,
        shiftHours: weightedAverageShiftHours // Weighted average of full shift hours for operator productivity
    };
};
