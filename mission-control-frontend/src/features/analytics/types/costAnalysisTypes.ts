/**
 * Cost Analysis Types
 * Based on Excel Cost Analysis sheet structure
 */

export interface LaborConfig {
    laborDailyWage: number;              // Default: 650 INR
    dailyProductiveHours: number;        // Default: 10 hours
    laborersPerWheelbarrow: number;      // Default: 2
    laborersPerRobotLoading: number;     // Default: 1 (for loading)
    laborersPerRobotUnloading: number;   // Default: 1 (for manual unloading, 0 when actuator used)
    payloadRatio: number;                // Default: 4 (robot = 4x wheelbarrow capacity)
    timeMultiplier: number;              // Default: 1.65 (wheelbarrow takes 1.65x longer)
}

export interface MaterialCostBreakdown {
    materialType: string;
    robotTrips: number;

    // Actuator usage tracking
    tripsWithActuator: number;           // Count of trips using actuator
    tripsWithoutActuator: number;        // Count of manual unloading trips
    actuatorUsagePercent: number;        // Percentage of trips using actuator

    // Labor breakdown
    loadingLaborHours: number;           // Separate loading hours
    unloadingLaborHours: number;         // Separate unloading hours (0 when actuator used)
    totalLaborHours: number;             // Combined labor hours

    manualTripsEquivalent: number;
    perDayManualTrips: number;
    avgTimePerTrip: number;              // in minutes
    wheelbarrowTimePerTrip: number;      // in minutes
    robotHours: number;
    wheelbarrowHours: number;
    laborManHours: number;
    laborCost: number;
}

export interface CostAnalysisParameters {
    numberOfRobots: number;
    monthlyRobotCost: number;            // Cost per robot per month
    laborDailyWage: number;
    dailyProductiveHours: number;
    laborersPerRobotLoading: number;     // 1 for loading
    laborersPerRobotUnloading: number;   // 1 for manual unloading
    laborersPerWheelbarrow: number;      // 2
    payloadRatio: number;                // 4
    timeMultiplier: number;              // 1.65
    effectiveDays: number;
}

export interface CostAnalysisSummary {
    // Trip counts
    totalRobotTrips: number;
    totalManualTripsEquivalent: number;

    // Hours
    totalRobotHours: number;
    totalWheelbarrowHours: number;
    totalLaborManHours: number;

    // Manual process costs
    manualProcessCost: number;

    // Robot process costs - detailed breakdown
    robotRentalCost: number;
    loadingLaborCost: number;            // Cost for loading labor
    unloadingLaborCost: number;          // Cost for unloading labor (when no actuator)
    totalLaborCost: number;              // Combined labor cost
    laborSavingsFromActuator: number;    // Savings from actuator usage
    totalRobotCost: number;

    // Actuator metrics
    totalActuatorTrips: number;          // Total trips using actuator
    totalManualUnloadingTrips: number;   // Total trips with manual unloading
    actuatorAdoptionRate: number;        // Percentage of trips using actuator

    // Savings
    actualSavings: number;
    costReductionPercent: number;

    // Efficiency metrics
    robotUtilization: number;            // Percentage
    robotWorkDays: number;
    timeReductionPercent: number;

    // Potential savings
    potentialSavingsAt80Percent: number;
    potentialReductionPercent: number;
}

export interface CostAnalysisResult {
    parameters: CostAnalysisParameters;
    materialBreakdown: MaterialCostBreakdown[];
    summary: CostAnalysisSummary;
}

export interface MonthlyRobotCost {
    clientId: string;
    clientName: string;
    cost: number;
}

export interface MonthlyRobotCostInput {
    [clientId: string]: number;
}
