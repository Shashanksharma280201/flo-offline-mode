/**
 * Cost Analysis Service
 * Implements Excel-based cost analysis calculations
 */

import { ProcessedAppData, AppSessionData } from "@/data/types/appDataTypes";
import {
    LaborConfig,
    MaterialCostBreakdown,
    CostAnalysisResult,
    CostAnalysisParameters,
    CostAnalysisSummary
} from "../types/costAnalysisTypes";

/**
 * Default labor configuration values
 */
export const DEFAULT_LABOR_CONFIG: LaborConfig = {
    laborDailyWage: 650,               // INR per day
    dailyProductiveHours: 10,          // hours
    laborersPerWheelbarrow: 2,         // people
    laborersPerRobotLoading: 1,        // people (for loading)
    laborersPerRobotUnloading: 1,      // people (for manual unloading, 0 when actuator used)
    payloadRatio: 4,                   // robot carries 4x wheelbarrow
    timeMultiplier: 1.65               // wheelbarrow takes 1.65x longer
};

/**
 * Group sessions by material type
 */
function groupSessionsByMaterial(sessionData: ProcessedAppData): Map<string, any[]> {
    const groups = new Map<string, any[]>();

    sessionData.appSessionData.forEach(session => {
        const material = session.loadingMaterialType || "Unknown";
        if (!groups.has(material)) {
            groups.set(material, []);
        }
        groups.get(material)!.push(session);
    });

    return groups;
}

/**
 * Calculate average time per trip for a material
 */
function calculateAverageTime(sessions: any[]): number {
    if (sessions.length === 0) return 0;

    const totalTime = sessions.reduce((sum, session) => {
        return sum + (session.totalTripTime || 0);
    }, 0);

    return totalTime / sessions.length;
}

/**
 * Analyze actuator usage for a set of sessions
 */
function analyzeActuatorUsage(sessions: AppSessionData[]): {
    tripsWithActuator: number;
    tripsWithoutActuator: number;
    actuatorUsagePercent: number;
    totalLoadingTime: number;        // milliseconds
    totalUnloadingTime: number;      // milliseconds (ALL trips - actuator has no cost benefit)
} {
    let tripsWithActuator = 0;
    let tripsWithoutActuator = 0;
    let totalLoadingTime = 0;
    let totalUnloadingTime = 0;

    sessions.forEach(session => {
        // Count actuator usage for tracking purposes only
        if (session.unloadingActuatorUsed) {
            tripsWithActuator++;
        } else {
            tripsWithoutActuator++;
        }

        // Count ALL unloading time for labor cost (actuator has no cost benefit)
        totalUnloadingTime += session.unloadingTime || 0;

        // Always count loading time (loading always needs labor)
        totalLoadingTime += session.loadingTime || 0;
    });

    const actuatorUsagePercent = sessions.length > 0
        ? (tripsWithActuator / sessions.length) * 100
        : 0;

    return {
        tripsWithActuator,
        tripsWithoutActuator,
        actuatorUsagePercent,
        totalLoadingTime,
        totalUnloadingTime
    };
}

/**
 * Calculate effective days from session data
 */
function calculateEffectiveDays(sessionData: ProcessedAppData): number {
    if (sessionData.appSessionData.length === 0) return 1;

    const uniqueDates = new Set<string>();
    sessionData.appSessionData.forEach(session => {
        if (session.loadingEndTimestamp) {
            const date = new Date(session.loadingEndTimestamp).toDateString();
            uniqueDates.add(date);
        }
    });

    return Math.max(uniqueDates.size, 1);
}

/**
 * Calculate number of robots from session data
 */
function calculateNumberOfRobots(sessionData: ProcessedAppData): number {
    const uniqueRobots = new Set<string>();
    sessionData.appSessionData.forEach(session => {
        if (session.robotId) {
            uniqueRobots.add(session.robotId);
        }
    });
    return Math.max(uniqueRobots.size, 1);
}

/**
 * Calculate cost analysis for material breakdown
 */
function calculateMaterialBreakdown(
    sessionData: ProcessedAppData,
    laborConfig: LaborConfig,
    effectiveDays: number
): MaterialCostBreakdown[] {
    const materialGroups = groupSessionsByMaterial(sessionData);
    const breakdown: MaterialCostBreakdown[] = [];

    materialGroups.forEach((sessions, materialType) => {
        // C: Robot Trips (Actual)
        const robotTrips = sessions.length;

        // NEW: Analyze actuator usage
        const actuatorStats = analyzeActuatorUsage(sessions);

        // Calculate loading labor hours (always needed)
        const loadingHours = actuatorStats.totalLoadingTime / (1000 * 60 * 60); // Convert ms to hours
        const loadingLaborHours = loadingHours * laborConfig.laborersPerRobotLoading;

        // Calculate unloading labor hours (ALL trips - actuator has no cost benefit)
        const unloadingHours = actuatorStats.totalUnloadingTime / (1000 * 60 * 60); // Convert ms to hours
        const unloadingLaborHours = unloadingHours * laborConfig.laborersPerRobotUnloading;

        // Total labor hours
        const totalLaborHours = loadingLaborHours + unloadingLaborHours;

        // D: Equivalent manual trips = Robot trips × Payload Ratio
        const manualTripsEquivalent = robotTrips * laborConfig.payloadRatio;

        // E: Per day manual trips = Manual trips ÷ Effective days
        const perDayManualTrips = manualTripsEquivalent / effectiveDays;

        // F: Avg. actual time per trip (in minutes)
        const avgTimePerTrip = calculateAverageTime(sessions) / (1000 * 60); // Convert ms to minutes

        // G: Equivalent wheelbarrow trip time = Avg time × Time Multiplier
        const wheelbarrowTimePerTrip = avgTimePerTrip * laborConfig.timeMultiplier;

        // H: Number of Robot Hours = (Robot trips × Avg time) ÷ 60
        const robotHours = (robotTrips * avgTimePerTrip) / 60;

        // I: Number of wheelbarrow Hours = (Manual trips × Wheelbarrow time) ÷ 60
        const wheelbarrowHours = (manualTripsEquivalent * wheelbarrowTimePerTrip) / 60;

        // J: Labour man-hours = Wheelbarrow hours × Laborers per wheelbarrow
        const laborManHours = wheelbarrowHours * laborConfig.laborersPerWheelbarrow;

        // K: Cost of Labour = (Man-hours × Daily wage) ÷ Productive hours
        const laborCost = (laborManHours * laborConfig.laborDailyWage) / laborConfig.dailyProductiveHours;

        breakdown.push({
            materialType,
            robotTrips,

            // NEW: Actuator tracking
            tripsWithActuator: actuatorStats.tripsWithActuator,
            tripsWithoutActuator: actuatorStats.tripsWithoutActuator,
            actuatorUsagePercent: actuatorStats.actuatorUsagePercent,

            // NEW: Labor breakdown
            loadingLaborHours,
            unloadingLaborHours,
            totalLaborHours,

            // Existing fields
            manualTripsEquivalent,
            perDayManualTrips,
            avgTimePerTrip,
            wheelbarrowTimePerTrip,
            robotHours,
            wheelbarrowHours,
            laborManHours,
            laborCost
        });
    });

    return breakdown;
}

/**
 * Calculate robot rental cost for multi-client with different costs per client
 */
function calculateMultiClientRobotRentalCost(
    sessionData: ProcessedAppData,
    clientCostMapping: { [clientName: string]: number }
): number {
    // Group robots by client name
    const robotsByClient: { [clientName: string]: Set<string> } = {};
    const datesByClient: { [clientName: string]: Set<string> } = {};

    sessionData.appSessionData.forEach(session => {
        const clientName = session.clientName;
        const robotId = session.robotId;
        const date = new Date(session.loadingEndTimestamp).toDateString();

        if (!robotsByClient[clientName]) {
            robotsByClient[clientName] = new Set();
            datesByClient[clientName] = new Set();
        }

        if (robotId) {
            robotsByClient[clientName].add(robotId);
        }
        datesByClient[clientName].add(date);
    });

    // Calculate rental cost per client and sum
    let totalRentalCost = 0;

    Object.keys(robotsByClient).forEach(clientName => {
        const robotCount = robotsByClient[clientName].size;
        const effectiveDays = Math.max(datesByClient[clientName].size, 1);
        const monthlyCost = clientCostMapping[clientName] || 0;

        if (monthlyCost > 0 && robotCount > 0) {
            // Cost formula: (numberOfRobots × Monthly cost ÷ 30) × Effective days
            const clientRentalCost = (robotCount * monthlyCost / 30) * effectiveDays;
            totalRentalCost += clientRentalCost;
        } else {
            if (monthlyCost === 0) {
                console.warn(`Client "${clientName}" not found in cost mapping. Available clients:`, Object.keys(clientCostMapping));
            }
        }
    });

    return totalRentalCost;
}

/**
 * Calculate aggregate cost analysis summary with per-client costs
 */
function calculateSummaryWithClientCosts(
    materialBreakdown: MaterialCostBreakdown[],
    parameters: CostAnalysisParameters,
    sessionData: ProcessedAppData,
    clientCostMapping: { [clientName: string]: number }
): CostAnalysisSummary {
    // Aggregate material-level metrics
    const totalRobotTrips = materialBreakdown.reduce((sum, m) => sum + m.robotTrips, 0);

    // NEW: Aggregate actuator usage
    const totalActuatorTrips = materialBreakdown.reduce((sum, m) => sum + m.tripsWithActuator, 0);
    const totalManualUnloadingTrips = materialBreakdown.reduce((sum, m) => sum + m.tripsWithoutActuator, 0);
    const actuatorAdoptionRate = totalRobotTrips > 0 ? (totalActuatorTrips / totalRobotTrips) * 100 : 0;

    // NEW: Aggregate labor hours
    const totalLoadingLaborHours = materialBreakdown.reduce((sum, m) => sum + m.loadingLaborHours, 0);
    const totalUnloadingLaborHours = materialBreakdown.reduce((sum, m) => sum + m.unloadingLaborHours, 0);

    // Existing aggregations
    const totalManualTripsEquivalent = materialBreakdown.reduce((sum, m) => sum + m.manualTripsEquivalent, 0);
    const totalRobotHours = materialBreakdown.reduce((sum, m) => sum + m.robotHours, 0);
    const totalWheelbarrowHours = materialBreakdown.reduce((sum, m) => sum + m.wheelbarrowHours, 0);
    const totalLaborManHours = materialBreakdown.reduce((sum, m) => sum + m.laborManHours, 0);

    // K14: Total cost in manual process = SUM(all labor costs)
    const manualProcessCost = materialBreakdown.reduce((sum, m) => sum + m.laborCost, 0);

    // Calculate robot work days = SUM(robot hours) ÷ Daily productive hours
    const robotWorkDays = totalRobotHours / parameters.dailyProductiveHours;

    // K15: Calculate robot rental cost with per-client costs
    const robotRentalCost = calculateMultiClientRobotRentalCost(sessionData, clientCostMapping);

    // NEW: Calculate loading and unloading labor costs separately
    const loadingLaborCost = (totalLoadingLaborHours * parameters.laborDailyWage) / parameters.dailyProductiveHours;
    const unloadingLaborCost = (totalUnloadingLaborHours * parameters.laborDailyWage) / parameters.dailyProductiveHours;
    const totalLaborCost = loadingLaborCost + unloadingLaborCost;

    // Actuator has no cost benefit - unloading labor counted for all trips
    const laborSavingsFromActuator = 0;

    // K17: Total cost robot + labour = Rental + Loading + Unloading labor
    const totalRobotCost = robotRentalCost + totalLaborCost;

    // K18: Actual Savings = Manual cost - Robot cost
    const actualSavings = manualProcessCost - totalRobotCost;

    // K19: Reduction in Cost (%) = (Savings ÷ Manual cost) × 100
    const costReductionPercent = manualProcessCost > 0 ? (actualSavings / manualProcessCost) * 100 : 0;

    // K20: Utilisation of robot = (Robot work days × 100) ÷ (Effective days × Number of robots)
    const robotUtilization = ((robotWorkDays * 100) / (parameters.effectiveDays * parameters.numberOfRobots));

    // K21: Potential Savings at 80% utilisation = (80 × Actual savings) ÷ Current utilization
    const potentialSavingsAt80Percent = robotUtilization > 0 ? (80 * actualSavings) / robotUtilization : 0;

    // K22: Reduction in Cost (%) at 80% = Potential savings ÷ Manual cost
    const potentialReductionPercent = manualProcessCost > 0 ? (potentialSavingsAt80Percent / manualProcessCost) * 100 : 0;

    // K27: Reduction in Time (%) = ((Manual hours - Robot hours) ÷ Manual hours) × 100
    const timeReductionPercent = totalLaborManHours > 0 ? ((totalLaborManHours - totalRobotHours) / totalLaborManHours) * 100 : 0;

    return {
        totalRobotTrips,
        totalManualTripsEquivalent,
        totalRobotHours,
        totalWheelbarrowHours,
        totalLaborManHours,
        manualProcessCost,

        // NEW: Labor cost breakdown
        robotRentalCost,
        loadingLaborCost,
        unloadingLaborCost,
        totalLaborCost,
        laborSavingsFromActuator,
        totalRobotCost,

        // NEW: Actuator metrics
        totalActuatorTrips,
        totalManualUnloadingTrips,
        actuatorAdoptionRate,

        // Existing fields
        actualSavings,
        costReductionPercent,
        robotUtilization,
        robotWorkDays,
        timeReductionPercent,
        potentialSavingsAt80Percent,
        potentialReductionPercent
    };
}

/**
 * Calculate aggregate cost analysis summary
 */
function calculateSummary(
    materialBreakdown: MaterialCostBreakdown[],
    parameters: CostAnalysisParameters
): CostAnalysisSummary {
    // Aggregate material-level metrics
    const totalRobotTrips = materialBreakdown.reduce((sum, m) => sum + m.robotTrips, 0);

    // NEW: Aggregate actuator usage
    const totalActuatorTrips = materialBreakdown.reduce((sum, m) => sum + m.tripsWithActuator, 0);
    const totalManualUnloadingTrips = materialBreakdown.reduce((sum, m) => sum + m.tripsWithoutActuator, 0);
    const actuatorAdoptionRate = totalRobotTrips > 0 ? (totalActuatorTrips / totalRobotTrips) * 100 : 0;

    // NEW: Aggregate labor hours
    const totalLoadingLaborHours = materialBreakdown.reduce((sum, m) => sum + m.loadingLaborHours, 0);
    const totalUnloadingLaborHours = materialBreakdown.reduce((sum, m) => sum + m.unloadingLaborHours, 0);

    // Existing aggregations
    const totalManualTripsEquivalent = materialBreakdown.reduce((sum, m) => sum + m.manualTripsEquivalent, 0);
    const totalRobotHours = materialBreakdown.reduce((sum, m) => sum + m.robotHours, 0);
    const totalWheelbarrowHours = materialBreakdown.reduce((sum, m) => sum + m.wheelbarrowHours, 0);
    const totalLaborManHours = materialBreakdown.reduce((sum, m) => sum + m.laborManHours, 0);

    // K14: Total cost in manual process = SUM(all labor costs)
    const manualProcessCost = materialBreakdown.reduce((sum, m) => sum + m.laborCost, 0);

    // Calculate robot work days = SUM(robot hours) ÷ Daily productive hours
    const robotWorkDays = totalRobotHours / parameters.dailyProductiveHours;

    // K15: Cost of robot = (Number of robots × Monthly cost ÷ 30) × Effective days
    const robotRentalCost = (parameters.numberOfRobots * parameters.monthlyRobotCost / 30) * parameters.effectiveDays;

    // NEW: Calculate loading and unloading labor costs separately
    const loadingLaborCost = (totalLoadingLaborHours * parameters.laborDailyWage) / parameters.dailyProductiveHours;
    const unloadingLaborCost = (totalUnloadingLaborHours * parameters.laborDailyWage) / parameters.dailyProductiveHours;
    const totalLaborCost = loadingLaborCost + unloadingLaborCost;

    // Actuator has no cost benefit - unloading labor counted for all trips
    const laborSavingsFromActuator = 0;

    // K17: Total cost robot + labour = Rental + Loading + Unloading labor
    const totalRobotCost = robotRentalCost + totalLaborCost;

    // K18: Actual Savings = Manual cost - Robot cost
    const actualSavings = manualProcessCost - totalRobotCost;

    // K19: Reduction in Cost (%) = (Savings ÷ Manual cost) × 100
    const costReductionPercent = manualProcessCost > 0 ? (actualSavings / manualProcessCost) * 100 : 0;

    // K20: Utilisation of robot = (Robot work days × 100) ÷ (Effective days × Number of robots)
    const robotUtilization = ((robotWorkDays * 100) / (parameters.effectiveDays * parameters.numberOfRobots));

    // K21: Potential Savings at 80% utilisation = (80 × Actual savings) ÷ Current utilization
    const potentialSavingsAt80Percent = robotUtilization > 0 ? (80 * actualSavings) / robotUtilization : 0;

    // K22: Reduction in Cost (%) at 80% = Potential savings ÷ Manual cost
    const potentialReductionPercent = manualProcessCost > 0 ? (potentialSavingsAt80Percent / manualProcessCost) * 100 : 0;

    // K27: Reduction in Time (%) = ((Manual hours - Robot hours) ÷ Manual hours) × 100
    const timeReductionPercent = totalLaborManHours > 0 ? ((totalLaborManHours - totalRobotHours) / totalLaborManHours) * 100 : 0;

    return {
        totalRobotTrips,
        totalManualTripsEquivalent,
        totalRobotHours,
        totalWheelbarrowHours,
        totalLaborManHours,
        manualProcessCost,

        // NEW: Labor cost breakdown
        robotRentalCost,
        loadingLaborCost,
        unloadingLaborCost,
        totalLaborCost,
        laborSavingsFromActuator,
        totalRobotCost,

        // NEW: Actuator metrics
        totalActuatorTrips,
        totalManualUnloadingTrips,
        actuatorAdoptionRate,

        // Existing fields
        actualSavings,
        costReductionPercent,
        robotUtilization,
        robotWorkDays,
        timeReductionPercent,
        potentialSavingsAt80Percent,
        potentialReductionPercent
    };
}

/**
 * Main function: Calculate complete cost analysis
 *
 * @param sessionData - Processed session data from analytics
 * @param monthlyRobotCostOrMapping - Either a single monthly cost (number) or per-client cost mapping ({ [clientName: string]: number })
 * @param laborConfig - Labor configuration (optional, uses defaults if not provided)
 * @param clientShiftHoursMapping - Per-client shift hours mapping (optional, for multi-client reports)
 * @returns Complete cost analysis result
 */
export function calculateCostAnalysis(
    sessionData: ProcessedAppData,
    monthlyRobotCostOrMapping: number | { [clientName: string]: number },
    laborConfig: LaborConfig = DEFAULT_LABOR_CONFIG,
    clientShiftHoursMapping?: { [clientName: string]: number }
): CostAnalysisResult {
    // Calculate derived parameters
    const effectiveDays = calculateEffectiveDays(sessionData);
    const numberOfRobots = calculateNumberOfRobots(sessionData);

    // Determine if we have a single cost or per-client mapping
    const isSingleCost = typeof monthlyRobotCostOrMapping === 'number';
    const monthlyRobotCost = isSingleCost
        ? monthlyRobotCostOrMapping
        : 0; // Will be calculated differently for multi-client

    // Calculate weighted average shift hours for multi-client scenarios
    let effectiveShiftHours = laborConfig.dailyProductiveHours;
    if (clientShiftHoursMapping && !isSingleCost) {
        // Group sessions by client to calculate weighted average
        const sessionsByClient: { [clientName: string]: number } = {};
        sessionData.appSessionData.forEach(session => {
            const clientName = session.clientName;
            sessionsByClient[clientName] = (sessionsByClient[clientName] || 0) + 1;
        });

        let totalWeightedHours = 0;
        let totalSessions = 0;

        Object.keys(sessionsByClient).forEach(clientName => {
            const sessionCount = sessionsByClient[clientName];
            const productiveHours = clientShiftHoursMapping[clientName] || 9; // Default to 9 (10 - 1 break)
            totalWeightedHours += productiveHours * sessionCount;
            totalSessions += sessionCount;
        });

        if (totalSessions > 0) {
            effectiveShiftHours = totalWeightedHours / totalSessions;
        }
    }

    const parameters: CostAnalysisParameters = {
        numberOfRobots,
        monthlyRobotCost,
        laborDailyWage: laborConfig.laborDailyWage,
        dailyProductiveHours: effectiveShiftHours, // Use weighted average for multi-client
        laborersPerRobotLoading: laborConfig.laborersPerRobotLoading,
        laborersPerRobotUnloading: laborConfig.laborersPerRobotUnloading,
        laborersPerWheelbarrow: laborConfig.laborersPerWheelbarrow,
        payloadRatio: laborConfig.payloadRatio,
        timeMultiplier: laborConfig.timeMultiplier,
        effectiveDays
    };

    // Calculate material-wise breakdown (use effective shift hours)
    const adjustedLaborConfig = {
        ...laborConfig,
        dailyProductiveHours: effectiveShiftHours
    };
    const materialBreakdown = calculateMaterialBreakdown(sessionData, adjustedLaborConfig, effectiveDays);

    // Calculate aggregate summary
    // Pass the cost mapping if multi-client
    const summary = isSingleCost
        ? calculateSummary(materialBreakdown, parameters)
        : calculateSummaryWithClientCosts(materialBreakdown, parameters, sessionData, monthlyRobotCostOrMapping);

    return {
        parameters,
        materialBreakdown,
        summary
    };
}

/**
 * Format currency for display (INR)
 */
export function formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/**
 * Format percentage for display
 */
export function formatPercentage(percent: number): string {
    return `${percent.toFixed(2)}%`;
}

/**
 * Format hours for display
 */
export function formatHours(hours: number): string {
    return `${hours.toFixed(2)} hrs`;
}

/**
 * Format days for display
 */
export function formatDays(days: number): string {
    return `${days.toFixed(2)} days`;
}
