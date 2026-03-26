import { useEffect } from "react";
import { useOperationsStore } from "@/stores/operationsStore";
import Header from "@/components/header/Header";
import { useShallow } from "zustand/react/shallow";

const Operations = () => {
    const [selectedDate, setSelectedDate] = useOperationsStore(
        useShallow((state) => [state.selectedDate, state.setSelectedDate])
    );

    useEffect(() => {
        // NOTE: API integration pending - currently displays static UI
        // Implement data fetching when backend endpoints are ready
    }, [selectedDate]);

    return (
        <div className="h-screen overflow-y-auto bg-blue-900/25">
            <Header title="Daily Operations Dashboard">
                <div className="flex items-center gap-4">
                    <input
                        type="date"
                        value={selectedDate.toISOString().split("T")[0]}
                        onChange={(e) =>
                            setSelectedDate(new Date(e.target.value))
                        }
                        className="rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-white"
                    />
                </div>
            </Header>

            <div className="mx-auto flex w-full flex-col gap-6 p-7 md:gap-8 md:p-10">
                {/* Today's Summary */}
                <TodaysSummary />

                {/* Operator Attendance */}
                <OperatorAttendanceSection />

                {/* Robot Status by Location */}
                {/* <RobotStatusByLocation /> */}

                {/* Critical Alerts */}
                <CriticalAlerts />
            </div>
        </div>
    );
};

const TodaysSummary = () => {
    const robotSummary = useOperationsStore((state) => state.robotSummary);
    const issueSummary = useOperationsStore((state) => state.issueSummary);
    const operatorSummary = useOperationsStore(
        (state) => state.operatorSummary
    );

    return (
        <div className="rounded-lg border-2 border-gray-700 bg-gray-800/85 p-6">
            <h2 className="mb-4 text-2xl font-bold">Today's Summary</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Running Robots */}
                <SummaryCard
                    title="Running Robots"
                    value={`${robotSummary?.runningRobots || 0}/${robotSummary?.totalRobots || 0}`}
                    percentage={
                        robotSummary?.totalRobots
                            ? Math.round(
                                  (robotSummary.runningRobots /
                                      robotSummary.totalRobots) *
                                      100
                              )
                            : 0
                    }
                    color="green"
                />

                {/* Idle Robots */}
                <SummaryCard
                    title="Idle Robots"
                    value={robotSummary?.idleRobots || 0}
                    color="yellow"
                />

                {/* Issues Reported */}
                <SummaryCard
                    title="Issues Reported"
                    value={issueSummary?.totalIssues || 0}
                    subValue={`${issueSummary?.criticalIssues || 0} Critical`}
                    color="red"
                />

                {/* Operators On Leave */}
                <SummaryCard
                    title="Operators On Leave"
                    value={operatorSummary?.onLeave || 0}
                    color="blue"
                />
            </div>
        </div>
    );
};

const SummaryCard = ({
    title,
    value,
    subValue,
    percentage,
    color
}: {
    title: string;
    value: string | number;
    subValue?: string;
    percentage?: number;
    color: "green" | "yellow" | "red" | "blue";
}) => {
    const colorClasses = {
        green: "border-1 border-gray-300/20 bg-gray-900/70 text-green-500",
        yellow: "border-1 border-gray-300/20  bg-gray-900/70 text-yellow-500",
        red: "border-1 border-gray-300/20 bg-gray-900/70 text-red-500",
        blue: "border-1 border-gray-300/20 bg-gray-900/70 text-blue-500"
    };

    return (
        <div className={`rounded-lg border-2 p-4 ${colorClasses[color]}`}>
            <div className="text-sm opacity-80">{title}</div>
            <div className="mt-2 text-3xl font-bold">{value}</div>
            {percentage !== undefined && (
                <div className="mt-1 text-sm">({percentage}%)</div>
            )}
            {subValue && (
                <div className="mt-1 text-sm opacity-80">{subValue}</div>
            )}
        </div>
    );
};

const CriticalAlerts = () => {
    const issues = useOperationsStore((state) => state.issues);

    // Filter for critical issues from last 24 hours
    const criticalIssues = issues.filter(
        (issue) =>
            issue.severity === "Critical" &&
            new Date(issue.reportedAt).getTime() >
                Date.now() - 24 * 60 * 60 * 1000
    );

    return (
        <div className="rounded-lg border-2 border-gray-700 bg-gray-800/85 p-6">
            <h2 className="mb-4 text-2xl font-bold text-white">
                CRITICAL ALERTS (Last 24hrs)
            </h2>
            {criticalIssues.length === 0 ? (
                <p className="text-gray-400">No critical alerts</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {criticalIssues.map((issue) => (
                        <div
                            key={issue._id}
                            className="flex items-center justify-between rounded-md border border-red-500 bg-red-500/10 p-3"
                        >
                            <div>
                                <span className="font-bold">{issue.mmrId}</span>{" "}
                                - {issue.title}
                                {issue.totalDowntimeMinutes && (
                                    <span className="ml-2 text-sm text-red-400">
                                        (
                                        {Math.round(
                                            issue.totalDowntimeMinutes / 60
                                        )}
                                        hrs downtime)
                                    </span>
                                )}
                            </div>
                            <div className="text-sm text-gray-400">
                                {issue.currentLocation}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const RobotStatusByLocation = () => {
    const robotsByLocation = useOperationsStore(
        (state) => state.robotsByLocation
    );

    return (
        <div className="rounded-lg border-2 border-gray-700 bg-gray-800/85 p-6">
            <h2 className="mb-4 text-2xl font-bold">
                Robot Status by Location
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {robotsByLocation.map((location) => (
                    <div
                        key={location.city}
                        className="rounded-lg border border-gray-600 bg-gray-700/50 p-4"
                    >
                        <div className="text-lg font-bold">{location.city}</div>
                        <div className="mt-2 text-3xl font-bold">
                            {location.count}
                        </div>
                        <div className="mt-2 flex gap-4 text-sm">
                            <span className="text-green-500">
                                Running: {location.running}
                            </span>
                            <span className="text-yellow-500">
                                Idle: {location.idle}
                            </span>
                            {location.issues > 0 && (
                                <span className="text-red-500">
                                    Issues: {location.issues}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const OperatorAttendanceSection = () => {
    const operatorSummary = useOperationsStore(
        (state) => state.operatorSummary
    );

    return (
        <div className="rounded-lg border-2 border-gray-700 bg-gray-800/85 p-6">
            <h2 className="mb-4 text-2xl font-bold">Operator Attendance</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg border-2 border-gray-300/20 bg-gray-900/70 p-4 text-green-500">
                    <div className="text-sm">Present</div>
                    <div className="mt-2 text-3xl font-bold">
                        {operatorSummary?.activeOperators || 0}
                    </div>
                </div>
                <div className="rounded-lg border-2 border-gray-300/20 bg-gray-900/70 p-4 text-yellow-500">
                    <div className="text-sm">On Leave</div>
                    <div className="mt-2 text-3xl font-bold">
                        {operatorSummary?.onLeave || 0}
                    </div>
                </div>
                <div className="rounded-lg border-2 border-gray-300/20 bg-gray-900/70 p-4 text-red-500">
                    <div className="text-sm">Absent</div>
                    <div className="mt-2 text-3xl font-bold">
                        {operatorSummary?.absent || 0}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Operations;
