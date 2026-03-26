import { cn } from "@/lib/utils";

interface CalendarSessionMetricsProps {
    distanceTravelled?: number;
    operationTime?: number;
    energyConsumed?: number;
    className?: string;
}

/**
 * CalendarSessionMetrics component displays key performance indicators for robot sessions.
 * It uses a precision-industrial aesthetic with tabular numbers and dynamic unit scaling.
 */
export const CalendarSessionMetrics = ({
    distanceTravelled,
    operationTime,
    energyConsumed,
    className
}: CalendarSessionMetricsProps) => {
    const formatTime = (ms?: number) => {
        if (ms === undefined || ms === null)
            return { value: "Unknown", unit: "" };

        const minutes = ms / 1000 / 60;
        if (minutes < 60) {
            return { value: minutes.toFixed(2), unit: "minutes" };
        }
        const hours = minutes / 60;
        return { value: hours.toFixed(2), unit: "hours" };
    };

    const formatValue = (val?: number) => {
        if (val === undefined || val === null) return "Unknown";
        return val.toFixed(2);
    };

    const timeData = formatTime(operationTime);
    const distanceStr = formatValue(distanceTravelled);
    const energyStr = formatValue(energyConsumed);

    const MetricCard = ({
        label,
        value,
        unit,
        valueColor = "text-white"
    }: {
        label: string;
        value: string;
        unit?: string;
        valueColor?: string;
    }) => (
        <div className="flex flex-col gap-2 rounded-sm border border-white/5 bg-white/[0.02] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all hover:border-white/10 hover:bg-white/[0.04]">
            <span className="text-sm font-bold uppercase tracking-wider text-neutral-400">
                {label}
            </span>
            <div className="flex items-baseline gap-2">
                <span className={cn("text-4xl tabular-nums", valueColor)}>
                    {value}
                </span>
                {unit && (
                    <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        {unit}
                    </span>
                )}
            </div>
        </div>
    );

    return (
        <div
            className={cn(
                "grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6",
                className
            )}
        >
            <MetricCard
                label="Total Distance"
                value={distanceStr}
                unit={distanceStr !== "Unknown" ? "meters" : ""}
            />
            <MetricCard
                label="Operating Time"
                value={timeData.value}
                unit={timeData.unit}
                valueColor="text-green-500"
            />
            <MetricCard
                label="Energy Usage"
                value={energyStr}
                unit={energyStr !== "Unknown" ? "units" : ""}
                valueColor="text-red-500"
            />
        </div>
    );
};
