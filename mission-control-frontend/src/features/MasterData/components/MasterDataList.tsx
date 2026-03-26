import React, { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "react-query";
import { useShallow } from "zustand/react/shallow";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/Table";
import { getRobotsMasterData } from "../service/masterDataService";
import { useMasterDataStore } from "@/stores/masterDataStore";
import { RobotMasterData, LatestQCInfo } from "@/data/types/masterDataTypes";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { naturalSort } from "@/util/sortRobots";
import { PaginationComponent } from "@/components/pagination/PaginationComponent";
import { useSocketStore } from "@/stores/socketStore";

// ===================================================================
// HELPER FUNCTIONS - EXTRACTED OUTSIDE COMPONENT TO PREVENT RE-CREATION
// ===================================================================

/**
 * Format dates for display
 */
const formatDate = (date?: Date | string): string | null => {
    if (!date) return null;
    try {
        const dateObj = typeof date === "string" ? new Date(date) : date;
        return dateObj.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        });
    } catch {
        return null;
    }
};

/**
 * Get status badge component
 */
const getStatusBadge = (status?: string) => {
    if (!status) return <span className="text-gray-400">Unknown</span>;

    const statusColors: Record<string, string> = {
        Idle: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
        Running: "bg-green-500/20 text-green-300 border-green-500/30",
        Scrap: "bg-gray-500/20 text-gray-300 border-gray-500/30",
        DOWN: "bg-red-500/20 text-red-300 border-red-500/30",
        "Testing phase": "bg-blue-500/20 text-blue-300 border-blue-500/30",
        Shipped: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        "Sold - Refurbished": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
    };

    const colorClass = statusColors[status] || "bg-gray-500/20 text-gray-300";

    return (
        <span
            className={`rounded-md border px-2 py-1 text-xs font-medium ${colorClass}`}
        >
            {status}
        </span>
    );
};

const formatRelativeSeconds = (seconds?: number) => {
    if (seconds === undefined || seconds === null) {
        return "Unknown";
    }
    if (seconds < 60) {
        return `${seconds}s ago`;
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
};

const getConnectivityFreshnessSeconds = (
    lastConnectionOn?: Date | string | number
) => {
    if (!lastConnectionOn) {
        return undefined;
    }

    const timestamp = new Date(lastConnectionOn).getTime();
    if (Number.isNaN(timestamp)) {
        return undefined;
    }

    return Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
};

const ConnectivityBadge = React.memo(({ robot }: { robot: RobotMasterData }) => {
    const [freshnessSeconds, setFreshnessSeconds] = React.useState(() =>
        getConnectivityFreshnessSeconds(robot.lastConnectionOn)
    );

    useEffect(() => {
        setFreshnessSeconds(getConnectivityFreshnessSeconds(robot.lastConnectionOn));

        if (!robot.lastConnectionOn) {
            return;
        }

        const interval = window.setInterval(() => {
            setFreshnessSeconds(
                getConnectivityFreshnessSeconds(robot.lastConnectionOn)
            );
        }, 15000);

        return () => {
            window.clearInterval(interval);
        };
    }, [robot.lastConnectionOn]);

    const state =
        deriveConnectivityState(
            robot.status,
            freshnessSeconds,
            Boolean(robot.lastConnectionOn)
        ) ||
        robot.connectivityFreshnessState ||
        "unknown";
    const colorClass: Record<string, string> = {
        live: "border-green-500/30 bg-green-500/20 text-green-300",
        stale: "border-yellow-500/30 bg-yellow-500/20 text-yellow-300",
        offline: "border-red-500/30 bg-red-500/20 text-red-300",
        unknown: "border-gray-500/30 bg-gray-500/20 text-gray-300"
    };
    const labelMap: Record<string, string> = {
        live: "Live",
        stale: "Stale",
        offline: "Offline",
        unknown: "Unknown"
    };
    const titleParts = [
        `State: ${labelMap[state] || "Unknown"}`,
        `Status: ${robot.status || "Unknown"}`,
        `Last connection: ${formatDate(robot.lastConnectionOn ? new Date(robot.lastConnectionOn) : undefined) || "Unknown"}`,
        `Connected clients: ${robot.connectedClientsCount || 0}`
    ];

    return (
        <div className="flex flex-col gap-1">
            <span
                className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${colorClass[state] || colorClass.unknown}`}
                title={titleParts.join("\n")}
            >
                {labelMap[state] || "Unknown"}
            </span>
            <span className="text-[10px] text-gray-400">
                {formatRelativeSeconds(freshnessSeconds)}
            </span>
        </div>
    );
});

const getStaffingStateMeta = (robot: RobotMasterData) => {
    const state = robot.staffingCoverageState || "unknown";
    const labelMap: Record<string, string> = {
        unassigned: "Unassigned",
        assigned_not_checked_in: "Assigned, absent",
        covered: "Covered",
        overtime_risk: "OT risk",
        auto_checkout_risk: "Auto checkout",
        unknown: "Unknown"
    };
    const colorClass: Record<string, string> = {
        unassigned: "border-gray-500/30 bg-gray-500/20 text-gray-300",
        assigned_not_checked_in:
            "border-yellow-500/30 bg-yellow-500/20 text-yellow-300",
        covered: "border-green-500/30 bg-green-500/20 text-green-300",
        overtime_risk: "border-orange-500/30 bg-orange-500/20 text-orange-300",
        auto_checkout_risk: "border-red-500/30 bg-red-500/20 text-red-300",
        unknown: "border-gray-500/30 bg-gray-500/20 text-gray-300"
    };

    return {
        label: labelMap[state] || "Unknown",
        badgeClass: colorClass[state] || colorClass.unknown
    };
};

const getOperatorCell = (robot: RobotMasterData) => {
    const staffing = getStaffingStateMeta(robot);
    const checkedInToday = Boolean(robot.checkedInToday);
    const attendanceLabel = checkedInToday ? "Present" : "Absent";
    const attendanceClass = checkedInToday
        ? "text-green-300"
        : "text-red-300";
    const lastCheckIn =
        formatDate(
            robot.lastCheckInTime ||
                robot.operator?.lastCheckInTime ||
                undefined
        ) || "Unknown";
    const staffingFreshness =
        formatDate(robot.metricFreshness?.staffing) || "Unknown";

    if (!robot.operator) {
        return (
            <div className="group relative flex max-w-[180px] flex-col gap-1">
                <span className="text-xs italic text-gray-500 sm:text-sm">
                    No operator
                </span>

                <div className="pointer-events-none absolute left-0 top-full z-[80] mt-2 hidden w-56 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                    <div className="mb-1 font-semibold">Staffing</div>
                    <div className="space-y-1 text-[11px]">
                        <div>Status: {staffing.label}</div>
                        <div>Checked in today: No</div>
                        <div>Last check-in: {lastCheckIn}</div>
                        <div>Freshness: {staffingFreshness}</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="group relative flex max-w-[220px] flex-col gap-1">
            <div className="min-w-0">
                <div className="truncate text-xs font-medium sm:text-sm">
                    {robot.operator.name}
                </div>
                <div className="truncate text-[10px] text-gray-400 sm:text-xs">
                    {robot.operator.phoneNumber} |{" "}
                    <span className={attendanceClass}>{attendanceLabel}</span>
                </div>
            </div>

            <div className="pointer-events-none absolute left-0 top-full z-[80] mt-2 hidden w-64 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                <div className="mb-1 flex items-center gap-2">
                    <span
                        className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-medium ${staffing.badgeClass}`}
                    >
                        {staffing.label}
                    </span>
                </div>
                <div className="space-y-1 text-[11px]">
                    <div>Checked in today: {checkedInToday ? "Yes" : "No"}</div>
                    <div>Last check-in: {lastCheckIn}</div>
                    <div>Freshness: {staffingFreshness}</div>
                </div>
            </div>
        </div>
    );
};

const getMaintenanceDueCell = (robot: RobotMasterData) => {
    const maintenanceState = robot.maintenanceState || "unknown";
    const overdueDays = robot.maintenanceOverdueDays;
    const lastMaintenance = robot.maintenance?.lastMaintenance
        ? formatDate(new Date(robot.maintenance.lastMaintenance))
        : "Unknown";
    const schedule =
        robot.maintenance?.schedule && robot.maintenance.schedule.length > 0
            ? robot.maintenance.schedule.join(", ")
            : "Not set";
    const freshness =
        formatDate(robot.metricFreshness?.maintenance) || "Unknown";
    const hasMaintenanceData =
        overdueDays !== undefined ||
        Boolean(robot.maintenance?.lastMaintenance) ||
        Boolean(robot.maintenance?.schedule?.length);

    let label = "Unknown";
    let badgeClass = "border-gray-500/30 bg-gray-500/20 text-gray-300";

    if (hasMaintenanceData || maintenanceState !== "unknown") {
        if (maintenanceState === "critical") {
            label = `${overdueDays ?? 0}d overdue`;
            badgeClass = "border-red-500/30 bg-red-500/20 text-red-300";
        } else if (maintenanceState === "overdue") {
            label = `${overdueDays ?? 0}d overdue`;
            badgeClass =
                "border-yellow-500/30 bg-yellow-500/20 text-yellow-300";
        } else if (maintenanceState === "ok") {
            label = "On track";
            badgeClass = "border-green-500/30 bg-green-500/20 text-green-300";
        }
    }

    return (
        <div className="group relative flex max-w-[170px] flex-col gap-1">
            <span
                className={`inline-flex w-fit rounded-md border px-2 py-1 text-xs font-medium ${badgeClass}`}
            >
                {label}
            </span>
            <span className="text-[10px] text-gray-400">
                Last: {lastMaintenance}
            </span>

            <div className="pointer-events-none absolute left-0 top-full z-[80] mt-2 hidden w-60 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                <div className="mb-1 font-semibold">Maintenance Due</div>
                <div className="space-y-1 text-[11px]">
                    <div className="capitalize">State: {maintenanceState}</div>
                    <div>Overdue days: {overdueDays ?? 0}</div>
                    <div>Last maintenance: {lastMaintenance}</div>
                    <div>Schedule: {schedule}</div>
                    <div>Freshness: {freshness}</div>
                </div>
            </div>
        </div>
    );
};

const stickyHeaderCellClassName =
    "sticky top-0 z-20 bg-slate-800/95 px-2 py-2 text-xs font-semibold backdrop-blur-sm sm:px-3 sm:py-2.5 sm:text-sm md:px-4 md:py-3";

const getBomStatusCell = (robot: RobotMasterData) => {
    const bomState = robot.bomState || "unknown";
    const bomCompletionStatus = robot.bomCompletionStatus || "incomplete";
    const insufficientPartsCount = robot.insufficientPartsCount ?? 0;
    const freshness = formatDate(robot.metricFreshness?.bom) || "Unknown";

    let label = "Unknown";
    let badgeClass = "border-gray-500/30 bg-gray-500/20 text-gray-300";

    if (bomState === "insufficient_parts") {
        label = `${insufficientPartsCount} missing`;
        badgeClass = "border-yellow-500/30 bg-yellow-500/20 text-yellow-300";
    } else if (bomState === "incomplete") {
        label = "Incomplete";
        badgeClass = "border-orange-500/30 bg-orange-500/20 text-orange-300";
    } else if (bomState === "ok") {
        label = "Ready";
        badgeClass = "border-green-500/30 bg-green-500/20 text-green-300";
    }

    return (
        <div className="group relative flex max-w-[150px] flex-col gap-1">
            <span
                className={`inline-flex w-fit rounded-md border px-2 py-1 text-xs font-medium ${badgeClass}`}
            >
                {label}
            </span>
            <span className="text-[10px] capitalize text-gray-400">
                BOM: {bomCompletionStatus}
            </span>

            <div className="pointer-events-none absolute left-0 top-full z-[80] mt-2 hidden w-56 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                <div className="mb-1 font-semibold">BOM Status</div>
                <div className="space-y-1 text-[11px]">
                    <div className="capitalize">State: {bomState}</div>
                    <div className="capitalize">
                        Completion: {bomCompletionStatus}
                    </div>
                    <div>Insufficient parts: {insufficientPartsCount}</div>
                    <div>Freshness: {freshness}</div>
                </div>
            </div>
        </div>
    );
};

const getBillingStatusBadge = (status?: string) => {
    if (!status) {
        return (
            <span className="text-[10px] italic text-gray-500 sm:text-xs">
                -
            </span>
        );
    }

    const normalizedStatus = status.toLowerCase();
    let badgeClass = "border-gray-500/30 bg-gray-500/20 text-gray-300";

    if (
        normalizedStatus.includes("paid") ||
        normalizedStatus.includes("complete") ||
        normalizedStatus.includes("settled")
    ) {
        badgeClass = "border-green-500/30 bg-green-500/20 text-green-300";
    } else if (
        normalizedStatus.includes("pending") ||
        normalizedStatus.includes("draft") ||
        normalizedStatus.includes("processing")
    ) {
        badgeClass = "border-yellow-500/30 bg-yellow-500/20 text-yellow-300";
    } else if (
        normalizedStatus.includes("failed") ||
        normalizedStatus.includes("overdue") ||
        normalizedStatus.includes("cancel")
    ) {
        badgeClass = "border-red-500/30 bg-red-500/20 text-red-300";
    }

    return (
        <span
            className={`inline-flex w-fit rounded-md border px-2 py-0.5 text-[10px] font-medium sm:text-xs ${badgeClass}`}
        >
            {status}
        </span>
    );
};

const getCycleEfficiencyBadge = (robot: RobotMasterData) => {
    if (robot.cycleEfficiency === null || robot.cycleEfficiency === undefined) {
        return (
            <span
                className="text-xs text-gray-300"
                title={`Freshness: ${formatDate(robot.metricFreshness?.cycleEfficiency) || "Unknown"}`}
            >
                Pending
            </span>
        );
    }

    const normalizedEfficiency =
        robot.cycleEfficiency <= 1
            ? robot.cycleEfficiency * 100
            : robot.cycleEfficiency;
    const percentage = `${normalizedEfficiency.toFixed(1)}%`;
    const windowLabel =
        robot.cycleEfficiencyWindow === "current_shift"
            ? "Current shift"
            : robot.cycleEfficiencyWindow === "last_closed_shift"
              ? "Last shift"
              : "Unknown";

    return (
        <div className="flex flex-col gap-1">
            <span
                className="text-xs font-medium text-slate-200"
                title={`Window: ${windowLabel}\nFreshness: ${formatDate(robot.metricFreshness?.cycleEfficiency) || "Unknown"}`}
            >
                {percentage}
            </span>
            <span className="text-[10px] text-gray-400">{windowLabel}</span>
        </div>
    );
};

const deriveConnectivityState = (
    status?: string,
    freshnessSeconds?: number,
    hasLastConnection?: boolean
): RobotMasterData["connectivityFreshnessState"] => {
    if (status?.toLowerCase() === "offline") {
        return "offline";
    }
    if (!hasLastConnection || freshnessSeconds === undefined) {
        return "unknown";
    }
    if (freshnessSeconds <= 30) {
        return "live";
    }
    if (freshnessSeconds <= 120) {
        return "stale";
    }
    return "offline";
};

/**
 * Get QC status badge component with draft support
 * Tooltip only shows when hovering on the badge itself, not the whole area
 */
const getQCStatusBadge = (qc?: LatestQCInfo | null) => {
    if (!qc) {
        return (
            <span className="rounded-md border border-gray-500/30 bg-gray-500/20 px-2 py-1 text-xs font-medium text-gray-300">
                No QC
            </span>
        );
    }

    if (qc.status === "draft") {
        const daysSince = Math.floor(
            (Date.now() - new Date(qc.submittedAt).getTime()) /
                (1000 * 60 * 60 * 24)
        );

        return (
            <div className="flex flex-col gap-1">
                <span className="group relative rounded-md border border-blue-500/30 bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-300">
                    {qc.completionPercentage}%
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-48 -translate-x-1/2 rounded-md bg-slate-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                        <div className="mb-1 font-semibold">QC Draft:</div>
                        <div className="space-y-0.5 text-[10px]">
                            <div>{qc.completionPercentage}% complete</div>
                            <div>
                                {qc.answeredQuestions}/{qc.totalQuestions}{" "}
                                answered
                            </div>
                            {qc.answeredQuestions > 0 && (
                                <>
                                    <div className="text-green-300">
                                        Passed: {qc.passedCount}
                                    </div>
                                    <div className="text-yellow-300">
                                        Repaired: {qc.repairedCount}
                                    </div>
                                    <div className="text-orange-300">
                                        Replaced: {qc.replacedCount}
                                    </div>
                                </>
                            )}
                        </div>
                        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900"></span>
                    </span>
                </span>
                <span className="text-[10px] text-gray-400">
                    Draft {daysSince === 0 ? "Today" : `${daysSince}d ago`}
                </span>
            </div>
        );
    }

    // ✅ Handle SUBMITTED/APPROVED status (show resolution rate)
    let statusColor = "";
    let statusText = "";

    if (qc.passRate >= 95) {
        statusColor = "border-green-500/30 bg-green-500/20 text-green-300";
        statusText = `${qc.passRate}%`;
    } else if (qc.passRate >= 85) {
        statusColor = "border-blue-500/30 bg-blue-500/20 text-blue-300";
        statusText = `${qc.passRate}%`;
    } else if (qc.passRate >= 70) {
        statusColor = "border-yellow-500/30 bg-yellow-500/20 text-yellow-300";
        statusText = `${qc.passRate}%`;
    } else {
        statusColor = "border-red-500/30 bg-red-500/20 text-red-300";
        statusText = `${qc.passRate}%`;
    }

    const daysSince = Math.floor(
        (Date.now() - new Date(qc.submittedAt).getTime()) /
            (1000 * 60 * 60 * 24)
    );

    return (
        <div className="flex flex-col gap-1">
            {/* ✅ group class moved to badge span only */}
            <span
                className={`group relative rounded-md border px-2 py-1 text-xs font-medium ${statusColor}`}
            >
                {statusText}

                <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-48 -translate-x-1/2 rounded-md bg-slate-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                    <div className="mb-1 font-semibold">
                        QC {qc.status === "approved" ? "Approved" : "Submitted"}
                        :
                    </div>
                    <div className="space-y-0.5 text-[10px]">
                        <div className="text-green-300">Passed: {qc.passedCount}</div>
                        <div className="text-yellow-300">
                            Repaired: {qc.repairedCount}
                        </div>
                        <div className="text-orange-300">
                            Replaced: {qc.replacedCount}
                        </div>
                        <div className="mt-1 border-t border-slate-700 pt-1">
                            Resolution: {qc.passRate}%
                        </div>
                    </div>
                    <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900"></span>
                </span>
            </span>
            <span className="text-[10px] text-gray-400">
                {daysSince === 0 ? "Today" : `${daysSince}d ago`}
            </span>
        </div>
    );
};

/**
 * Open Issues Badge Component with type breakdown tooltip
 */
const OpenIssuesBadge: React.FC<{
    robot: RobotMasterData;
    onNavigateToIssues: () => void;
}> = ({ robot, onNavigateToIssues }) => {
    const [showTooltip, setShowTooltip] = React.useState(false);
    const openIssuesCount = robot.openIssuesCount || 0;
    const breakdown = robot.issueTypeBreakdown || {
        mechanical: 0,
        electrical: 0,
        other: 0
    };

    if (openIssuesCount === 0) {
        return (
            <span className="inline-flex items-center justify-center rounded-md border border-green-500/30 bg-green-500/20 px-2 py-1 text-xs font-semibold text-green-300 sm:px-3 sm:text-sm">
                None
            </span>
        );
    }

    const badgeColor =
        openIssuesCount <= 2
            ? "border-yellow-500/30 bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30"
            : "border-red-500/30 bg-red-500/20 text-red-300 hover:bg-red-500/30";

    return (
        <span
            className={`relative inline-flex cursor-pointer items-center justify-center rounded-md border px-2 py-1 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${badgeColor}`}
            onClick={(e) => {
                e.stopPropagation();
                onNavigateToIssues();
            }}
            onMouseEnter={(e) => {
                e.stopPropagation();
                setShowTooltip(true);
            }}
            onMouseLeave={(e) => {
                e.stopPropagation();
                setShowTooltip(false);
            }}
        >
            <span>{openIssuesCount}</span>

            {showTooltip && (
                <span className="pointer-events-none absolute bottom-full left-1/2 z-[100] mb-2 w-48 -translate-x-1/2 whitespace-normal rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
                    <div className="mb-2 font-semibold">Open Issues:</div>
                    <div className="space-y-1 text-[10px]">
                        {breakdown.mechanical > 0 && (
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1 text-orange-300">
                                    <svg
                                        className="h-3 w-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    Mechanical
                                </span>
                                <span className="font-semibold">
                                    {breakdown.mechanical}
                                </span>
                            </div>
                        )}
                        {breakdown.electrical > 0 && (
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1 text-yellow-300">
                                    <svg
                                        className="h-3 w-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    Electrical
                                </span>
                                <span className="font-semibold">
                                    {breakdown.electrical}
                                </span>
                            </div>
                        )}
                        {breakdown.other > 0 && (
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1 text-gray-300">
                                    <svg
                                        className="h-3 w-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    Other
                                </span>
                                <span className="font-semibold">
                                    {breakdown.other}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="mt-2 border-t border-slate-700 pt-1 text-center text-[10px] text-slate-400">
                        Click to view details
                    </div>
                    <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900"></span>
                </span>
            )}
        </span>
    );
};

// ===================================================================
// MAIN COMPONENT
// ===================================================================

const MasterDataList = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const clientSocket = useSocketStore((state) => state.clientSocket);

    // Get queryParams, currentPage, pagination info and setters from store
    const [
        queryParams,
        currentPage,
        paginationInfo,
        setCurrentPage,
        setPaginationInfo
    ] = useMasterDataStore(
        useShallow((state) => [
            state.queryParams,
            state.currentPage,
            state.paginationInfo,
            state.setCurrentPage,
            state.setPaginationInfo
        ])
    );

    // ===================================================================
    // FETCH DATA - Server-side pagination (20 robots per page)
    // Auto-refresh every 10 minutes ONLY when page is open and active
    // ===================================================================
    const queryKey = useMemo(
        () => ["robotsMasterData", queryParams, currentPage],
        [queryParams, currentPage]
    );

    const { data, isLoading, isError, error, refetch, isFetching } = useQuery(
        queryKey,
        () =>
            getRobotsMasterData(currentPage, 20, {
                // Fetch 20 robots per page
                status: queryParams.status,
                search: queryParams.searchQuery,
                client: queryParams.client,
                operator: queryParams.operator,
                fleet: queryParams.fleet,
                access: queryParams.access,
                gpsStatus: queryParams.gpsStatus
            }),
        {
            keepPreviousData: true, // Keep old data while fetching new page for smooth transitions

            // REST stays as baseline; live connectivity patches through socket/cache updates.
            refetchInterval: 5 * 60 * 1000,
            refetchIntervalInBackground: false, // Stop auto-refresh when tab is inactive (saves server resources)

            // ✅ No caching - always fetch fresh data when user visits page
            staleTime: 0, // Consider data stale immediately after fetch
            cacheTime: 0, // Don't keep in cache after component unmounts

            // ✅ Refetch behavior
            refetchOnMount: true, // Always fetch fresh data when component mounts
            refetchOnWindowFocus: false, // Don't refetch when just switching tabs
            refetchOnReconnect: false, // Don't refetch on network reconnect

            onSuccess: (data) => {
                // Update pagination info from server response
                if (data.pagination) {
                    // Convert backend pagination format to PaginationInfo format
                    setPaginationInfo({
                        total: data.pagination.total,
                        current: data.robots.length,
                        page: data.pagination.page,
                        limit: data.pagination.limit
                    });
                }
            }
        }
    );

    useEffect(() => {
        if (!clientSocket) return;

        const handleRobotStatus = (payload: {
            id?: string;
            data?: Record<string, string>;
        }) => {
            const robotId = payload?.id;
            if (!robotId || !payload?.data) return;

            const nextStatus =
                payload.data[robotId] || Object.values(payload.data)[0];
            if (!nextStatus) return;

            queryClient.setQueryData(queryKey, (currentData: any) => {
                if (!currentData?.robots) return currentData;

                return {
                    ...currentData,
                    robots: currentData.robots.map((robot: RobotMasterData) => {
                        if (robot.id !== robotId) {
                            return robot;
                        }

                        const nextLastConnectionOn =
                            nextStatus.toLowerCase() === "active"
                                ? Date.now()
                                : robot.lastConnectionOn;
                        const nextFreshnessSeconds =
                            nextStatus.toLowerCase() === "active"
                                ? 0
                                : robot.connectivityFreshnessSeconds;

                        return {
                            ...robot,
                            status: nextStatus,
                            lastConnectionOn: nextLastConnectionOn,
                            connectivityFreshnessSeconds: nextFreshnessSeconds,
                            connectivityFreshnessState: deriveConnectivityState(
                                nextStatus,
                                nextFreshnessSeconds,
                                Boolean(nextLastConnectionOn)
                            ),
                            metricFreshness: {
                                ...robot.metricFreshness,
                                connectivity: nextLastConnectionOn
                                    ? new Date(
                                          nextLastConnectionOn
                                      ).toISOString()
                                    : robot.metricFreshness?.connectivity
                            }
                        };
                    })
                };
            });
        };

        const handleRobotClients = (payload: {
            id?: string;
            connectedClients?: Record<string, { name: string; email: string }>;
            connectedClientsCount?: number;
        }) => {
            const robotId = payload?.id;
            if (!robotId) return;

            queryClient.setQueryData(queryKey, (currentData: any) => {
                if (!currentData?.robots) return currentData;

                return {
                    ...currentData,
                    robots: currentData.robots.map((robot: RobotMasterData) => {
                        if (robot.id !== robotId) {
                            return robot;
                        }

                        return {
                            ...robot,
                            connectedClientsCount:
                                payload.connectedClientsCount ??
                                Object.keys(payload.connectedClients || {})
                                    .length,
                            metricFreshness: {
                                ...robot.metricFreshness,
                                connectivity: robot.lastConnectionOn
                                    ? new Date(
                                          robot.lastConnectionOn
                                      ).toISOString()
                                    : robot.metricFreshness?.connectivity
                            }
                        };
                    })
                };
            });
        };

        clientSocket.on("robot:status", handleRobotStatus);
        clientSocket.on("robot:clients", handleRobotClients);

        return () => {
            clientSocket.off("robot:status", handleRobotStatus);
            clientSocket.off("robot:clients", handleRobotClients);
        };
    }, [clientSocket, queryClient, queryKey]);

    // ===================================================================
    // MEMOIZED VALUES - Called BEFORE any conditional returns
    // This prevents hook count violations
    // ===================================================================
    const robots = useMemo(() => data?.robots || [], [data?.robots]);

    // Sort robots by name using natural sort - memoized to prevent unnecessary re-sorting
    const sortedRobots = useMemo(() => {
        if (!robots || robots.length === 0) return [];
        return [...robots].sort((a, b) => naturalSort(a.name, b.name));
    }, [robots]);

    // ===================================================================
    // EVENT HANDLERS - useCallback prevents recreation on every render
    // ===================================================================
    const handleIssueClick = useCallback(
        (robotId: string) => {
            navigate(`/robots/${robotId}/issues`);
        },
        [navigate]
    );

    const handleRowClick = useCallback(
        (robotId: string) => {
            navigate(`/robots/${robotId}/profile`);
        },
        [navigate]
    );

    const handleClientClick = useCallback(
        (clientId: string) => {
            navigate(`/clients/${clientId}/config`);
        },
        [navigate]
    );

    const handleBillingClick = useCallback(
        (robotId: string) => {
            navigate(`/robots/${robotId}/billing`);
        },
        [navigate]
    );

    const handleShippingClick = useCallback(
        (robotId: string) => {
            navigate(`/robots/${robotId}/shipping`);
        },
        [navigate]
    );

    const handleManualRefresh = useCallback(() => {
        refetch();
    }, [refetch]);

    // ===================================================================
    // CONDITIONAL RETURNS - After all hooks are called
    // ===================================================================
    if (isLoading) {
        return (
            <div className="flex items-center justify-center rounded-lg bg-slate-800/45 p-8">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-center justify-center rounded-lg bg-slate-800/45 p-8">
                <div className="text-red-400">
                    Error loading data: {(error as Error).message}
                </div>
            </div>
        );
    }

    // ===================================================================
    // RENDER TABLE
    // ===================================================================
    return (
        <>
            {/* Manual Refresh Button */}
            <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                    {isFetching && !isLoading ? (
                        <span className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                            Refreshing data...
                        </span>
                    ) : (
                        <span>
                            Live connectivity patches via socket, full refresh
                            every 5 minutes
                        </span>
                    )}
                </div>
                <Button
                    onClick={handleManualRefresh}
                    disabled={isFetching}
                    className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <svg
                        className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                    {isFetching ? "Refreshing..." : "Refresh Now"}
                </Button>
            </div>

            <div className="relative rounded-xl bg-slate-800/45 p-2 sm:p-3 md:p-4">
                <Table
                    containerClassName="max-h-[calc(100vh-260px)] overflow-auto"
                    className="relative w-full text-xs sm:text-sm"
                    style={{ minWidth: "2580px" }}
                >
                    <TableCaption className="text-xs sm:text-sm">
                        {sortedRobots.length > 0
                            ? `Showing ${sortedRobots.length} robots`
                            : "No robots found"}
                    </TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead
                                className={`${stickyHeaderCellClassName} left-0 z-30 rounded-t-lg after:absolute after:bottom-0 after:right-0 after:top-0 after:w-px after:shadow-[2px_0_8px_rgba(0,0,0,0.5)]`}
                                style={{ minWidth: "150px", maxWidth: "150px" }}
                            >
                                Name
                            </TableHead>
                            <TableHead
                                className={stickyHeaderCellClassName}
                                style={{ minWidth: "100px" }}
                            >
                                Status
                            </TableHead>
                            <TableHead
                                className={stickyHeaderCellClassName}
                                style={{ minWidth: "130px" }}
                            >
                                Connectivity
                            </TableHead>
                            <TableHead
                                className={stickyHeaderCellClassName}
                                style={{ minWidth: "200px" }}
                            >
                                Operator
                            </TableHead>
                            <TableHead
                                className={stickyHeaderCellClassName}
                                style={{ minWidth: "130px" }}
                            >
                                Client
                            </TableHead>
                            <TableHead
                                className={stickyHeaderCellClassName}
                                style={{ minWidth: "150px" }}
                            >
                                Billing Client
                            </TableHead>
                            <TableHead
                                className={stickyHeaderCellClassName}
                                style={{ minWidth: "140px" }}
                            >
                                Billing Amount
                            </TableHead>
                            <TableHead
                                className={stickyHeaderCellClassName}
                                style={{ minWidth: "120px" }}
                            >
                                Shipping
                            </TableHead>
                            <TableHead
                                className={stickyHeaderCellClassName}
                                style={{ minWidth: "200px" }}
                            >
                                Fleet
                            </TableHead>
                            <TableHead
                                className={stickyHeaderCellClassName}
                                style={{ minWidth: "150px" }}
                            >
                                Maintenance Due
                            </TableHead>
                            <TableHead
                                className={stickyHeaderCellClassName}
                                style={{ minWidth: "140px" }}
                            >
                                BOM Status
                            </TableHead>
                            <TableHead
                                className={stickyHeaderCellClassName}
                                style={{ minWidth: "150px" }}
                            >
                                Cycle Efficiency
                            </TableHead>
                            <TableHead
                                className={`${stickyHeaderCellClassName} text-center`}
                                style={{ minWidth: "100px" }}
                            >
                                Open Issues
                            </TableHead>
                            <TableHead
                                className={stickyHeaderCellClassName}
                                style={{ minWidth: "160px" }}
                            >
                                MAC Address
                            </TableHead>
                            <TableHead
                                className={`${stickyHeaderCellClassName} text-center`}
                                style={{ minWidth: "160px" }}
                            >
                                Bluetooth
                            </TableHead>
                            <TableHead
                                className={`${stickyHeaderCellClassName} text-center`}
                                style={{ minWidth: "180px" }}
                            >
                                Tasks
                            </TableHead>
                            <TableHead
                                className={`${stickyHeaderCellClassName} text-center`}
                                style={{ minWidth: "130px" }}
                            >
                                Manufacturing Date{" "}
                            </TableHead>
                            <TableHead
                                className={`${stickyHeaderCellClassName} text-center`}
                                style={{ minWidth: "130px" }}
                            >
                                Shipping Date
                            </TableHead>
                            <TableHead
                                className={`${stickyHeaderCellClassName} text-center`}
                                style={{ minWidth: "130px" }}
                            >
                                Shift Hours
                            </TableHead>
                            <TableHead
                                className={`${stickyHeaderCellClassName} text-center`}
                                style={{ minWidth: "130px" }}
                            >
                                Next Step
                            </TableHead>
                            <TableHead
                                className={`${stickyHeaderCellClassName} text-center`}
                                style={{ minWidth: "130px" }}
                            >
                                Data collection
                            </TableHead>
                            <TableHead
                                className={`${stickyHeaderCellClassName} text-center`}
                                style={{ minWidth: "130px" }}
                            >
                                Last Trips
                            </TableHead>
                            <TableHead
                                className={`${stickyHeaderCellClassName} text-center`}
                                style={{ minWidth: "130px" }}
                            >
                                QC Status
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedRobots.map((robot: RobotMasterData) => (
                            <TableRow
                                key={robot.id}
                                className="cursor-pointer transition-colors hover:bg-slate-700/30"
                                onClick={() => handleRowClick(robot.id)}
                            >
                                <TableCell
                                    className="sticky left-0 z-10 bg-slate-800/95 px-2 py-2 font-medium backdrop-blur-sm transition-colors after:absolute after:bottom-0 after:right-0 after:top-0 after:w-px after:shadow-[2px_0_8px_rgba(0,0,0,0.5)] group-hover:bg-slate-700/90 sm:px-3 sm:py-2.5 md:px-4 md:py-3"
                                    style={{
                                        minWidth: "150px",
                                        maxWidth: "150px"
                                    }}
                                >
                                    <div className="truncate">{robot.name}</div>
                                </TableCell>
                                <TableCell className="px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3">
                                    {getStatusBadge(robot.status)}
                                </TableCell>
                                <TableCell className="px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3">
                                    <ConnectivityBadge robot={robot} />
                                </TableCell>
                                <TableCell className="px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3">
                                    {getOperatorCell(robot)}
                                </TableCell>
                                <TableCell className="px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3">
                                    {robot.client ? (
                                        <Button
                                            className="z-10 flex rounded-md bg-gray-600/30 p-1.5 hover:bg-gray-700 sm:p-2"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                robot.client &&
                                                    handleClientClick(
                                                        robot.client.id
                                                    );
                                            }}
                                        >
                                            <div className="text-xs font-medium sm:text-sm">
                                                {robot.client.name}
                                            </div>
                                        </Button>
                                    ) : (
                                        <span className="text-xs italic text-gray-500 sm:text-sm">
                                            No client
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3">
                                    {robot.billing ? (
                                        <div
                                            className="cursor-pointer font-medium"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleBillingClick(robot.id);
                                            }}
                                        >
                                            {robot.billing.clientName}
                                        </div>
                                    ) : (
                                        <span className="text-xs italic text-gray-500">
                                            -
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3">
                                    {robot.billing ? (
                                        <div
                                            className="flex cursor-pointer flex-col gap-1 font-mono"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleBillingClick(robot.id);
                                            }}
                                        >
                                            <span>₹{robot.billing.amount}</span>
                                            {getBillingStatusBadge(
                                                robot.billing.status
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs italic text-gray-500">
                                            -
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3">
                                    {robot.shipping?.status ? (
                                        <div
                                            className="cursor-pointer text-xs sm:text-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleShippingClick(robot.id);
                                            }}
                                        >
                                            {getStatusBadge(
                                                robot.shipping.status
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs italic text-gray-500">
                                            -
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3">
                                    {robot.fleet ? (
                                        <div>
                                            <div className="text-xs font-medium sm:text-sm">
                                                {robot.fleet.name}
                                            </div>
                                            <div className="text-[10px] text-gray-400 sm:text-xs">
                                                {robot.fleet.prefix}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-xs italic text-gray-500 sm:text-sm">
                                            No fleet
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3">
                                    {getMaintenanceDueCell(robot)}
                                </TableCell>
                                <TableCell className="px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3">
                                    {getBomStatusCell(robot)}
                                </TableCell>
                                <TableCell className="px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3">
                                    {getCycleEfficiencyBadge(robot)}
                                </TableCell>
                                <TableCell
                                    className="px-2 py-2 text-center sm:px-3 sm:py-2.5 md:px-4 md:py-3"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <OpenIssuesBadge
                                        robot={robot}
                                        onNavigateToIssues={() =>
                                            handleIssueClick(robot.id)
                                        }
                                    />
                                </TableCell>
                                <TableCell className="px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3">
                                    {robot.macAddress ? (
                                        <span className="font-mono text-[10px] sm:text-xs">
                                            {robot.macAddress}
                                        </span>
                                    ) : (
                                        <span className="text-xs italic text-gray-500 sm:text-sm">
                                            N/A
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="px-2 py-2 text-center sm:px-3 sm:py-2.5 md:px-4 md:py-3">
                                    {robot.motorData
                                        ?.bluetoothConnectionSerialNo || "N/A"}
                                </TableCell>
                                <TableCell className="px-2 py-2 text-center sm:px-3 sm:py-2.5 md:px-4 md:py-3">
                                    {robot.taskCounts &&
                                    robot.taskCounts.total > 0 ? (
                                        <div className="flex flex-col gap-0.5 sm:gap-1">
                                            <div className="flex justify-center gap-1 text-[10px] sm:gap-2 sm:text-xs">
                                                <span
                                                    className="rounded-md bg-yellow-500/20 px-1.5 py-0.5 text-yellow-300 sm:px-2"
                                                    title="Pending"
                                                >
                                                    P:{" "}
                                                    {robot.taskCounts.pending}
                                                </span>
                                                <span
                                                    className="rounded-md bg-blue-500/20 px-1.5 py-0.5 text-blue-300 sm:px-2"
                                                    title="In Progress"
                                                >
                                                    IP:{" "}
                                                    {
                                                        robot.taskCounts
                                                            .inProgress
                                                    }
                                                </span>
                                            </div>
                                            <div className="flex justify-center gap-1 text-[10px] sm:gap-2 sm:text-xs">
                                                <span
                                                    className="rounded-md bg-green-500/20 px-1.5 py-0.5 text-green-300 sm:px-2"
                                                    title="Completed"
                                                >
                                                    C:{" "}
                                                    {robot.taskCounts.completed}
                                                </span>
                                                <span
                                                    className="rounded-md bg-gray-500/20 px-1.5 py-0.5 text-gray-300 sm:px-2"
                                                    title="Cancelled"
                                                >
                                                    X:{" "}
                                                    {robot.taskCounts.cancelled}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-xs italic text-gray-500 sm:text-sm">
                                            No tasks
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="px-2 py-2 text-center sm:px-3 sm:py-2.5 md:px-4 md:py-3">
                                    {robot.manufacturingData
                                        ?.manufacturingDate ? (
                                        <span className="text-xs sm:text-sm">
                                            {formatDate(
                                                robot.manufacturingData
                                                    .manufacturingDate
                                            )}
                                        </span>
                                    ) : (
                                        <span className="text-xs italic text-gray-500 sm:text-sm">
                                            N/A
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="px-2 py-2 text-center sm:px-3 sm:py-2.5 md:px-4 md:py-3">
                                    {robot.manufacturingData?.shippingDate ? (
                                        <span className="text-xs sm:text-sm">
                                            {formatDate(
                                                robot.manufacturingData
                                                    .shippingDate
                                            )}
                                        </span>
                                    ) : (
                                        <span className="text-xs italic text-gray-500 sm:text-sm">
                                            N/A
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="px-2 py-2 text-center sm:px-3 sm:py-2.5 md:px-4 md:py-3">
                                    {robot.client?.operatingHours ? (
                                        <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300 sm:px-3 sm:py-1 sm:text-sm">
                                            {robot.client.operatingHours} hrs
                                        </span>
                                    ) : (
                                        <span className="text-xs italic text-gray-500 sm:text-sm">
                                            N/A
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="px-2 py-2 text-center sm:px-3 sm:py-2.5 md:px-4 md:py-3">
                                    {robot.latestTask ? (
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-xs font-medium sm:text-sm">
                                                {robot.latestTask.title}
                                            </span>
                                            <span className="text-[10px] text-gray-400 sm:text-xs">
                                                {robot.latestTask.status}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs italic text-gray-500 sm:text-sm">
                                            No tasks
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="px-2 py-2 text-center sm:px-3 sm:py-2.5 md:px-4 md:py-3">
                                    {robot.manufacturingData?.dataCollection !==
                                    undefined ? (
                                        <span
                                            className={`rounded-md px-2 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-sm ${
                                                robot.manufacturingData
                                                    .dataCollection
                                                    ? "border border-green-500/30 bg-green-500/20 text-green-300"
                                                    : "border border-gray-500/30 bg-gray-500/20 text-gray-300"
                                            }`}
                                        >
                                            {robot.manufacturingData
                                                .dataCollection
                                                ? "Enabled"
                                                : "Disabled"}
                                        </span>
                                    ) : (
                                        <span className="text-xs italic text-gray-500 sm:text-sm">
                                            N/A
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="px-2 py-2 text-center sm:px-3 sm:py-2.5 md:px-4 md:py-3">
                                    {robot.yesterdayTripCount !== undefined ? (
                                        <span
                                            className={`rounded-md border px-2 py-0.5 text-xs font-semibold sm:px-3 sm:py-1 sm:text-sm ${
                                                robot.yesterdayTripCount > 5
                                                    ? "border-green-500/30 bg-green-500/20 text-green-300"
                                                    : "border-red-500/30 bg-red-500/20 text-red-300"
                                            }`}
                                        >
                                            {robot.yesterdayTripCount}{" "}
                                            {robot.yesterdayTripCount === 1
                                                ? "trip"
                                                : "trips"}
                                        </span>
                                    ) : (
                                        <span className="text-xs italic text-gray-500 sm:text-sm">
                                            N/A
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="px-2 py-2 text-center sm:px-3 sm:py-2.5 md:px-4 md:py-3">
                                    {getQCStatusBadge(robot.latestQC)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {paginationInfo && (
                <div className="mt-4 flex justify-center">
                    <PaginationComponent
                        paginationInfo={paginationInfo}
                        currentPage={currentPage}
                        onPageChange={(page) => {
                            setCurrentPage(page);
                            // Scroll to top when changing pages
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                    />
                </div>
            )}
            {/* </div> */}
        </>
    );
};

export { MasterDataList };
export default MasterDataList;
