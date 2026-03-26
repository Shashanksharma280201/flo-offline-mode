import { MaterialCostBreakdown, CostAnalysisSummary } from "../types/costAnalysisTypes";

interface CostAnalysisTableProps {
    materialBreakdown: MaterialCostBreakdown[];
    summary: CostAnalysisSummary;
}

/**
 * Display material-wise cost breakdown in a table
 */
export const CostAnalysisTable = ({
    materialBreakdown,
    summary
}: CostAnalysisTableProps) => {
    const formatNumber = (num: number, decimals = 2): string => {
        return num.toFixed(decimals);
    };

    const formatCurrency = (amount: number): string => {
        return `₹${Math.round(amount).toLocaleString("en-IN")}`;
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-700 text-xs uppercase text-gray-400">
                    <tr>
                        <th className="px-4 py-3">Material Type</th>
                        <th className="px-4 py-3 text-right">Robot Trips</th>
                        <th className="px-4 py-3 text-right">Actuator Usage</th>
                        <th className="px-4 py-3 text-right">Loading Hrs</th>
                        <th className="px-4 py-3 text-right">Unloading Hrs</th>
                        <th className="px-4 py-3 text-right">Manual Trips</th>
                        <th className="px-4 py-3 text-right">Avg Time/Trip</th>
                        <th className="px-4 py-3 text-right">Wheelbarrow Time/Trip</th>
                        <th className="px-4 py-3 text-right">Robot Hours</th>
                        <th className="px-4 py-3 text-right">Wheelbarrow Hours</th>
                        <th className="px-4 py-3 text-right">Labor Man-Hours</th>
                        <th className="px-4 py-3 text-right">Labor Cost</th>
                    </tr>
                </thead>
                <tbody>
                    {materialBreakdown.map((material, index) => (
                        <tr
                            key={`${material.materialType}-${index}`}
                            className="border-b border-gray-700 hover:bg-gray-700/30"
                        >
                            <td className="px-4 py-3 font-medium text-white">
                                {material.materialType || "Unknown"}
                            </td>
                            <td className="px-4 py-3 text-right">
                                {material.robotTrips}
                            </td>
                            <td className="px-4 py-3 text-right">
                                <span className={material.actuatorUsagePercent > 50 ? "text-indigo-400 font-medium" : ""}>
                                    {formatNumber(material.actuatorUsagePercent, 1)}%
                                </span>
                                <span className="text-xs text-gray-500 block">
                                    ({material.tripsWithActuator}/{material.robotTrips})
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                                {formatNumber(material.loadingLaborHours, 2)}
                            </td>
                            <td className="px-4 py-3 text-right">
                                {formatNumber(material.unloadingLaborHours, 2)}
                            </td>
                            <td className="px-4 py-3 text-right">
                                {material.manualTripsEquivalent}
                            </td>
                            <td className="px-4 py-3 text-right">
                                {formatNumber(material.avgTimePerTrip, 2)} min
                            </td>
                            <td className="px-4 py-3 text-right">
                                {formatNumber(material.wheelbarrowTimePerTrip, 2)} min
                            </td>
                            <td className="px-4 py-3 text-right">
                                {formatNumber(material.robotHours, 2)} hrs
                            </td>
                            <td className="px-4 py-3 text-right">
                                {formatNumber(material.wheelbarrowHours, 2)} hrs
                            </td>
                            <td className="px-4 py-3 text-right">
                                {formatNumber(material.laborManHours, 2)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-green-500">
                                {formatCurrency(material.laborCost)}
                            </td>
                        </tr>
                    ))}

                    {/* Totals Row */}
                    <tr className="border-t-2 border-green-600 bg-gray-700/50 font-bold text-white">
                        <td className="px-4 py-3">TOTAL</td>
                        <td className="px-4 py-3 text-right">{summary.totalRobotTrips}</td>
                        <td className="px-4 py-3 text-right text-indigo-400">
                            {formatNumber(summary.actuatorAdoptionRate, 1)}%
                            <span className="text-xs text-gray-400 block">
                                ({summary.totalActuatorTrips}/{summary.totalRobotTrips})
                            </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                            {formatNumber(materialBreakdown.reduce((sum, m) => sum + m.loadingLaborHours, 0), 2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                            {formatNumber(materialBreakdown.reduce((sum, m) => sum + m.unloadingLaborHours, 0), 2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                            {summary.totalManualTripsEquivalent}
                        </td>
                        <td className="px-4 py-3 text-right">-</td>
                        <td className="px-4 py-3 text-right">-</td>
                        <td className="px-4 py-3 text-right">
                            {formatNumber(summary.totalRobotHours, 2)} hrs
                        </td>
                        <td className="px-4 py-3 text-right">
                            {formatNumber(summary.totalWheelbarrowHours, 2)} hrs
                        </td>
                        <td className="px-4 py-3 text-right">
                            {formatNumber(summary.totalLaborManHours, 2)}
                        </td>
                        <td className="px-4 py-3 text-right text-green-500">
                            {formatCurrency(summary.manualProcessCost)}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Table Legend */}
            <div className="mt-4 rounded-lg bg-blue-900/20 p-4 text-xs text-gray-400">
                <p className="mb-2 font-semibold text-gray-300">Notes:</p>
                <ul className="list-inside list-disc space-y-1">
                    <li>
                        <strong>Robot Trips:</strong> Actual trips made by robot(s)
                    </li>
                    <li>
                        <strong>Actuator Usage:</strong> Percentage of trips where actuator was used for unloading (no labor needed when actuator used)
                    </li>
                    <li>
                        <strong>Loading Hours:</strong> Labor hours for loading (always 1 laborer per robot)
                    </li>
                    <li>
                        <strong>Unloading Hours:</strong> Labor hours for unloading (only counted when actuator NOT used, 1 laborer)
                    </li>
                    <li>
                        <strong>Manual Trips:</strong> Equivalent wheelbarrow trips (Robot
                        capacity = 4× Wheelbarrow)
                    </li>
                    <li>
                        <strong>Wheelbarrow Time/Trip:</strong> 1.65× longer than robot
                    </li>
                    <li>
                        <strong>Labor Man-Hours:</strong> Wheelbarrow hours × 2 laborers
                    </li>
                    <li>
                        <strong>Labor Cost:</strong> Man-hours × ₹65/hour (₹650/day ÷ 10
                        hours)
                    </li>
                </ul>
            </div>
        </div>
    );
};
