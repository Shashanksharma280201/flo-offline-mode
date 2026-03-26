import { useState, useEffect } from "react";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";
import { calculateCostAnalysis } from "../services/costAnalysisService";
import { CostAnalysisResult } from "../types/costAnalysisTypes";
import { CostAnalysisSummaryCards } from "./CostAnalysisSummaryCards";
import { CostAnalysisTable } from "./CostAnalysisTable";
import { TrendingDown, Calculator } from "lucide-react";

/**
 * Cost Analysis Section for the Analytics Dashboard
 * Allows user to input monthly robot cost and displays cost analysis
 */
export const CostAnalysisSection = () => {
    const processedAppData = useAnalyticsStore((state) => state.processedAppData);
    const [monthlyRobotCost, setMonthlyRobotCost] = useState<number>(50000);
    const [costAnalysis, setCostAnalysis] = useState<CostAnalysisResult | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    // Calculate cost analysis whenever processed data or monthly cost changes
    useEffect(() => {
        if (
            processedAppData.appSessionData.length > 0 &&
            monthlyRobotCost > 0
        ) {
            try {
                const result = calculateCostAnalysis(
                    processedAppData,
                    monthlyRobotCost
                );
                setCostAnalysis(result);
            } catch (error) {
                console.error("Error calculating cost analysis:", error);
                setCostAnalysis(null);
            }
        } else {
            setCostAnalysis(null);
        }
    }, [processedAppData, monthlyRobotCost]);

    // Don't render if no session data
    if (processedAppData.appSessionData.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-4 bg-gray-900/50 p-6 md:p-8">
            {/* Header with Cost Input */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-600/20 p-2">
                        <Calculator className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Cost Analysis</h2>
                        <p className="text-sm text-gray-400">
                            Compare robot vs manual process costs
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label
                        htmlFor="monthly-cost"
                        className="text-sm font-medium text-gray-300"
                    >
                        Monthly Robot Cost (INR)
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            ₹
                        </span>
                        <input
                            id="monthly-cost"
                            type="number"
                            min="0"
                            step="1000"
                            value={monthlyRobotCost}
                            onChange={(e) =>
                                setMonthlyRobotCost(parseFloat(e.target.value) || 0)
                            }
                            className="w-full rounded-lg border border-gray-600 bg-gray-800 py-2 pl-8 pr-16 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500 md:w-64"
                            placeholder="50000"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                            INR
                        </span>
                    </div>
                </div>
            </div>

            {/* Cost Analysis Results */}
            {costAnalysis && (
                <>
                    {/* Summary Cards */}
                    <CostAnalysisSummaryCards summary={costAnalysis.summary} />

                    {/* Material-wise Breakdown - Expandable */}
                    <div className="rounded-lg border border-gray-700 bg-gray-800">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-700/50"
                        >
                            <div className="flex items-center gap-2">
                                <TrendingDown className="h-5 w-5 text-green-500" />
                                <span className="font-semibold text-white">
                                    Material-wise Cost Breakdown
                                </span>
                            </div>
                            <svg
                                className={`h-5 w-5 text-gray-400 transition-transform ${
                                    isExpanded ? "rotate-180" : ""
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        </button>

                        {isExpanded && (
                            <div className="border-t border-gray-700 p-4">
                                <CostAnalysisTable
                                    materialBreakdown={costAnalysis.materialBreakdown}
                                    summary={costAnalysis.summary}
                                />
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* No Data Message */}
            {!costAnalysis && monthlyRobotCost > 0 && (
                <div className="rounded-lg border border-gray-700 bg-gray-800 p-8 text-center">
                    <p className="text-gray-400">
                        No session data available for cost analysis.
                        <br />
                        Please select a date range with trip data.
                    </p>
                </div>
            )}
        </div>
    );
};
