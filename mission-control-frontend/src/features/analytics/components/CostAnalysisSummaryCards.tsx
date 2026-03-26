import { CostAnalysisSummary } from "../types/costAnalysisTypes";
import { DataCard } from "./DataCard";

interface CostAnalysisSummaryCardsProps {
    summary: CostAnalysisSummary;
}

/**
 * Display cost analysis summary as a grid of cards
 */
export const CostAnalysisSummaryCards = ({
    summary
}: CostAnalysisSummaryCardsProps) => {
    const formatCurrency = (amount: number): number => {
        return Math.round(amount);
    };

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Manual Process Cost */}
            <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-border bg-gray-800 p-6">
                <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold text-red-500">
                        ₹{formatCurrency(summary.manualProcessCost).toLocaleString("en-IN")}
                    </span>
                </div>
                <span className="text-center text-lg text-slate-100">
                    Manual Process Cost
                </span>
                <span className="text-center text-sm text-slate-400">
                    Labor cost for wheelbarrow operations
                </span>
            </div>

            {/* Robot Process Cost */}
            <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-border bg-gray-800 p-6">
                <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold text-blue-500">
                        ₹{formatCurrency(summary.totalRobotCost).toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-slate-400">
                        Rental: ₹{formatCurrency(summary.robotRentalCost).toLocaleString("en-IN")} +
                        Loading: ₹{formatCurrency(summary.loadingLaborCost).toLocaleString("en-IN")} +
                        Unloading: ₹{formatCurrency(summary.unloadingLaborCost).toLocaleString("en-IN")}
                    </span>
                </div>
                <span className="text-center text-lg text-slate-100">
                    Robot Process Cost
                </span>
                <span className="text-center text-sm text-slate-400">
                    Rental + loading + unloading labor
                </span>
            </div>

            {/* Actual Savings */}
            <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-border bg-gray-800 p-6">
                <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold text-green-500">
                        ₹{formatCurrency(summary.actualSavings).toLocaleString("en-IN")}
                    </span>
                    <span className="text-sm text-green-400">
                        {summary.costReductionPercent.toFixed(1)}% reduction
                    </span>
                </div>
                <span className="text-center text-lg text-slate-100">Actual Savings</span>
                <span className="text-center text-sm text-slate-400">
                    Based on current utilization
                </span>
            </div>

            {/* Robot Utilization */}
            <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-border bg-gray-800 p-6">
                <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold text-purple-500">
                        {summary.robotUtilization.toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-400">
                        {summary.robotWorkDays} of {summary.robotWorkDays / (summary.robotUtilization / 100)} days
                    </span>
                </div>
                <span className="text-center text-lg text-slate-100">
                    Robot Utilization
                </span>
                <span className="text-center text-sm text-slate-400">
                    Actual working days vs available
                </span>
            </div>

            {/* Time Reduction */}
            <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-border bg-gray-800 p-6">
                <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold text-yellow-500">
                        {summary.timeReductionPercent.toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-400">
                        {summary.totalRobotHours.toFixed(0)} hrs vs{" "}
                        {summary.totalWheelbarrowHours.toFixed(0)} hrs
                    </span>
                </div>
                <span className="text-center text-lg text-slate-100">
                    Time Reduction
                </span>
                <span className="text-center text-sm text-slate-400">
                    Robot vs wheelbarrow time
                </span>
            </div>

            {/* Total Robot Trips */}
            <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-border bg-gray-800 p-6">
                <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold text-cyan-500">
                        {summary.totalRobotTrips}
                    </span>
                    <span className="text-xs text-slate-400">
                        = {summary.totalManualTripsEquivalent} wheelbarrow trips
                    </span>
                </div>
                <span className="text-center text-lg text-slate-100">Robot Trips</span>
                <span className="text-center text-sm text-slate-400">
                    Equivalent manual trips
                </span>
            </div>

            {/* Potential Savings at 80% */}
            <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-border bg-gray-800 p-6">
                <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold text-emerald-500">
                        ₹{formatCurrency(summary.potentialSavingsAt80Percent).toLocaleString("en-IN")}
                    </span>
                    <span className="text-sm text-emerald-400">
                        {summary.potentialReductionPercent.toFixed(1)}% reduction
                    </span>
                </div>
                <span className="text-center text-lg text-slate-100">
                    Potential at 80%
                </span>
                <span className="text-center text-sm text-slate-400">
                    Projected savings at 80% utilization
                </span>
            </div>

            {/* Total Labor Man-Hours */}
            <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-border bg-gray-800 p-6">
                <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold text-orange-500">
                        {summary.totalLaborManHours.toFixed(0)}
                    </span>
                    <span className="text-xs text-slate-400">man-hours</span>
                </div>
                <span className="text-center text-lg text-slate-100">
                    Manual Labor Needed
                </span>
                <span className="text-center text-sm text-slate-400">
                    Total man-hours for manual process
                </span>
            </div>

            {/* Actuator Savings */}
            <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-border bg-gray-800 p-6">
                <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold text-indigo-500">
                        ₹{formatCurrency(summary.laborSavingsFromActuator).toLocaleString("en-IN")}
                    </span>
                    <span className="text-sm text-indigo-400">
                        {summary.actuatorAdoptionRate.toFixed(1)}% adoption
                    </span>
                </div>
                <span className="text-center text-lg text-slate-100">
                    Actuator Savings
                </span>
                <span className="text-center text-sm text-slate-400">
                    {summary.totalActuatorTrips} of {summary.totalRobotTrips} trips used actuator
                </span>
            </div>
        </div>
    );
};
