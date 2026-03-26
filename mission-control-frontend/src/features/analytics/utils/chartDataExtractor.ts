import { ProcessedAppData } from "@/data/types/appDataTypes";
import dayjs from "dayjs";

export interface PieChartData {
    name: string;
    value: number;
    fill: string;
    percentage?: number;
}

export interface BarChartData {
    name: string;
    value: number;
    fill?: string;
}

export interface LineChartData {
    date: string;
    value: number;
}

/**
 * Extract operational time pie chart data
 */
export const extractOperationalTimePieData = (data: ProcessedAppData): PieChartData[] => {
    const { pieData, totalTime } = data.appSessionData.reduce(
        ({ pieData, totalTime }, session) => {
            pieData[0].value += session.loadingTime;
            pieData[1].value += session.tripTime;
            pieData[2].value += session.unloadingTime;
            pieData[3].value += session.returnTripTime;
            pieData[4].value += session.tripIdleTime;
            totalTime += session.totalTripTime;

            return { pieData, totalTime };
        },
        {
            pieData: [
                { name: "Loading Time", value: 0, fill: "#0070a3" },
                { name: "Trip Time", value: 0, fill: "#58508d" },
                { name: "Unloading Time", value: 0, fill: "#bc5090" },
                { name: "Return Trip time", value: 0, fill: "#ff6361" },
                { name: "Idle time", value: 0, fill: "#ffa600" }
            ],
            totalTime: 0
        }
    );

    // Add percentages
    return pieData.map((item) => ({
        ...item,
        percentage: totalTime > 0 ? (item.value / totalTime) * 100 : 0
    }));
};

/**
 * Extract material trips pie chart data
 * Groups materials with less than 1% into "Other" category
 */
export const extractMaterialTripsPieData = (data: ProcessedAppData): PieChartData[] => {
    const materialTrips: { [key: string]: number } = {};

    data.appSessionData.forEach((session) => {
        const material = session.loadingMaterialType || "Unknown";
        materialTrips[material] = (materialTrips[material] || 0) + 1;
    });

    const colors = [
        "#0070a3", "#58508d", "#bc5090", "#ff6361", "#ffa600",
        "#2ecc71", "#e74c3c", "#3498db", "#9b59b6", "#f39c12",
        "#1abc9c", "#e67e22", "#34495e", "#95a5a6", "#d35400"
    ];
    const totalTrips = Object.values(materialTrips).reduce((sum, count) => sum + count, 0);

    // Group materials with less than 1% into "Other"
    let otherValue = 0;
    const significantMaterials: PieChartData[] = [];

    Object.entries(materialTrips).forEach(([name, value]) => {
        const percentage = totalTrips > 0 ? (value / totalTrips) * 100 : 0;
        if (percentage < 1) {
            otherValue += value;
        } else {
            significantMaterials.push({
                name,
                value,
                fill: colors[significantMaterials.length % colors.length],
                percentage
            });
        }
    });

    // Sort by value descending
    significantMaterials.sort((a, b) => b.value - a.value);

    // Add "Other" category if there are grouped materials
    if (otherValue > 0) {
        significantMaterials.push({
            name: "Other Materials",
            value: otherValue,
            fill: "#95a5a6",
            percentage: totalTrips > 0 ? (otherValue / totalTrips) * 100 : 0
        });
    }

    return significantMaterials;
};

/**
 * Extract material quantity bar chart data
 * Limits to top 25 materials by quantity
 */
export const extractMaterialQuantityBarData = (data: ProcessedAppData): BarChartData[] => {
    const materialQuantity: { [key: string]: number } = {};

    data.appSessionData.forEach((session) => {
        const material = session.loadingMaterialType || "Unknown";
        const quantity = session.loadingMaterialQuantity || 0;
        materialQuantity[material] = (materialQuantity[material] || 0) + quantity;
    });

    return Object.entries(materialQuantity)
        .map(([name, value]) => ({ name, value, fill: "#0070a3" }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 25); // Limit to top 25 materials
};

/**
 * Extract trips over time line chart data
 */
export const extractTripsOverTimeData = (data: ProcessedAppData): LineChartData[] => {
    const tripsByDate: { [key: string]: number } = {};

    data.appSessionData.forEach((session) => {
        const date = dayjs(session.loadingStartTimestamp).format("DD MMM");
        tripsByDate[date] = (tripsByDate[date] || 0) + 1;
    });

    return Object.entries(tripsByDate)
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => {
            return (
                dayjs(a.date, "DD MMM").valueOf() - dayjs(b.date, "DD MMM").valueOf()
            );
        });
};

/**
 * Extract downtime over time bar chart data
 */
export const extractDowntimeOverTimeData = (data: ProcessedAppData): LineChartData[] => {
    const downtimeByDate: { [key: string]: number } = {};

    data.downtimeData.forEach((downtime) => {
        const date = dayjs(downtime.downtimeStartTimestamp).format("DD MMM");
        downtimeByDate[date] = (downtimeByDate[date] || 0) + downtime.downTimeDuration;
    });

    return Object.entries(downtimeByDate)
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => {
            return (
                dayjs(a.date, "DD MMM").valueOf() - dayjs(b.date, "DD MMM").valueOf()
            );
        });
};

/**
 * Extract productivity pie chart data
 * This matches the dashboard logic - calculates based on operator working hours
 */
export const extractProductivityPieData = (
    data: ProcessedAppData,
    operatingHours: number = 8
): PieChartData[] => {
    // Calculate per-operator statistics (same logic as dashboard)
    // Use composite key to avoid merging operators with same name from different clients
    const operators = data.appSessionData.reduce(
        (operators, session) => {
            const operatorKey = `${session.clientName || 'unknown'}-${session.operatorName}`;

            if (!operators[operatorKey]) {
                const daysWorked = new Set<string>();
                daysWorked.add(
                    dayjs(session.loadingStartTimestamp).startOf("day").toString()
                );
                operators[operatorKey] = {
                    daysWorked,
                    hoursWorked: dayjs.duration(session.tripRunningTime).asHours()
                };
            } else {
                operators[operatorKey].daysWorked.add(
                    dayjs(session.loadingStartTimestamp).startOf("day").toString()
                );
                operators[operatorKey].hoursWorked += dayjs
                    .duration(session.tripRunningTime)
                    .asHours();
            }
            return operators;
        },
        {} as {
            [operatorKey: string]: {
                daysWorked: Set<string>;
                hoursWorked: number;
            };
        }
    );

    // Calculate max hours and total hours worked
    const workingHoursPerDay = (operatingHours ?? 8) - 1; // Subtract 1 hour for breaks
    const { maxHoursWorked, totalHoursWorked } = Object.keys(operators).reduce(
        (prev, name) => {
            let { maxHoursWorked, totalHoursWorked } = prev;
            const { daysWorked, hoursWorked } = operators[name];

            maxHoursWorked += daysWorked.size * workingHoursPerDay;
            totalHoursWorked += hoursWorked;

            return { maxHoursWorked, totalHoursWorked };
        },
        {
            maxHoursWorked: 0,
            totalHoursWorked: 0
        }
    );

    const idleHours = Math.max(0, maxHoursWorked - totalHoursWorked);
    const total = maxHoursWorked;

    return [
        {
            name: "Working Time",
            value: totalHoursWorked,
            fill: "#2ecc71",
            percentage: total > 0 ? (totalHoursWorked / total) * 100 : 0
        },
        {
            name: "Idle Time",
            value: idleHours,
            fill: "#f39c12",
            percentage: total > 0 ? (idleHours / total) * 100 : 0
        }
    ];
};

/**
 * Extract operational time per material bar chart data
 * Limits to top 25 materials by operational time
 */
export const extractOperationalTimePerMaterialData = (
    data: ProcessedAppData
): BarChartData[] => {
    const timePerMaterial: { [key: string]: number } = {};

    data.appSessionData.forEach((session) => {
        const material = session.loadingMaterialType || "Unknown";
        const operationalTime =
            session.loadingTime +
            session.tripTime +
            session.unloadingTime +
            session.returnTripTime;
        timePerMaterial[material] = (timePerMaterial[material] || 0) + operationalTime;
    });

    return Object.entries(timePerMaterial)
        .map(([name, value]) => ({ name, value, fill: "#58508d" }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 25); // Limit to top 25 materials
};

export interface StackedBarChartData {
    name: string;
    [key: string]: string | number;
}

/**
 * Extract operational time vs material stacked bar chart data
 * Shows breakdown of loading, trip, unloading, return, idle time per material
 * Limits to top 20 materials by total operational time
 */
export const extractOperationalTimeVsMaterialData = (
    data: ProcessedAppData
): StackedBarChartData[] => {
    const materialMap = data.appSessionData.reduce(
        (materialMap, session) => {
            const name = session.loadingMaterialType || "Unknown";

            if (!materialMap[name]) {
                materialMap[name] = {
                    name,
                    loadingTime: 0,
                    tripTime: 0,
                    unloadingTime: 0,
                    returnTripTime: 0,
                    idleTime: 0
                };
            }

            materialMap[name].loadingTime += dayjs.duration(session.loadingTime).asHours();
            materialMap[name].tripTime += dayjs.duration(session.tripTime).asHours();
            materialMap[name].unloadingTime += dayjs
                .duration(session.unloadingTime)
                .asHours();
            materialMap[name].returnTripTime += dayjs
                .duration(session.returnTripTime)
                .asHours();
            materialMap[name].idleTime += dayjs.duration(session.tripIdleTime).asHours();

            return materialMap;
        },
        {} as {
            [name: string]: {
                name: string;
                loadingTime: number;
                tripTime: number;
                unloadingTime: number;
                returnTripTime: number;
                idleTime: number;
            };
        }
    );

    // Sort by total time and limit to top 20
    return Object.values(materialMap)
        .sort((a, b) => {
            const totalA = a.loadingTime + a.tripTime + a.unloadingTime + a.returnTripTime + a.idleTime;
            const totalB = b.loadingTime + b.tripTime + b.unloadingTime + b.returnTripTime + b.idleTime;
            return totalB - totalA;
        })
        .slice(0, 20);
};

/**
 * Extract downtime distribution timeline stacked bar chart data
 * Shows breakdown of downtime by task type per date
 */
export const extractDowntimeTimelineData = (
    data: ProcessedAppData
): StackedBarChartData[] => {
    let stackedDowntimeEntries = data.downtimeData.reduce(
        (acc, curr) => {
            const { task, downtimeEndTimestamp, downtimeStartTimestamp } = curr;
            const duration = dayjs
                .duration(downtimeEndTimestamp - downtimeStartTimestamp)
                .asHours();

            const timestamp = dayjs(downtimeStartTimestamp).format("DD/MM/YYYY");

            if (!acc[timestamp]) {
                acc[timestamp] = {};
            }
            if (!acc[timestamp][task]) {
                acc[timestamp][task] = duration;
            } else {
                acc[timestamp][task] += duration;
            }
            return acc;
        },
        {} as {
            [timestamp: string]: {
                [task: string]: number;
            };
        }
    );

    // If no downtime data, create empty structure from session data
    if (!Object.keys(stackedDowntimeEntries).length) {
        stackedDowntimeEntries = data.appSessionData.reduce(
            (acc, curr) => {
                const { loadingStartTimestamp } = curr;
                const timestamp = dayjs(loadingStartTimestamp).format("DD/MM/YYYY");

                if (!acc[timestamp]) {
                    acc[timestamp] = {
                        idle: 0,
                        unloading: 0,
                        loading: 0,
                        trip: 0,
                        returnTrip: 0
                    };
                }
                return acc;
            },
            {} as {
                [timestamp: string]: {
                    [task: string]: number;
                };
            }
        );
    }

    // Transform to chart friendly shape
    return Object.keys(stackedDowntimeEntries).map((timestamp) => {
        const entry = {
            name: timestamp,
            ...stackedDowntimeEntries[timestamp]
        };
        return entry;
    });
};

/**
 * Extract material distribution over time stacked bar chart data
 * Shows material quantities grouped by date
 */
export const extractMaterialDistributionOverTimeData = (
    data: ProcessedAppData
): StackedBarChartData[] => {
    const materials = data.appSessionData.map((item) => {
        const name = item.loadingMaterialType || "Unknown";
        const quantity = item.loadingMaterialQuantity || 0;
        const timestamp = dayjs(item.loadingStartTimestamp).format("DD/MM/YYYY");
        return { name, quantity, timestamp };
    });

    const stackedMaterials = materials.reduce(
        (stackedMaterials, material) => {
            if (!stackedMaterials[material.timestamp]) {
                stackedMaterials[material.timestamp] = [];
            }
            stackedMaterials[material.timestamp].push(material);

            return stackedMaterials;
        },
        {} as { [timestamp: string]: { name: string; quantity: number; timestamp: string }[] }
    );

    return Object.keys(stackedMaterials).map((timestamp) => {
        const materials = stackedMaterials[timestamp];
        const dataPoint: StackedBarChartData = { name: timestamp };

        materials.forEach((material) => {
            dataPoint[material.name] =
                ((dataPoint[material.name] as number) || 0) + material.quantity;
        });

        return dataPoint;
    });
};
