import { memo, useCallback, useEffect, useState } from "react";
import {
    Bar,
    BarChart,
    Brush,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import { ProcessedAppData } from "../../../data/types/appDataTypes";
import dayjs from "dayjs";
import { formatTime } from "@/util/timeFormatter";
const BAR_COLORS = ["#003f5c", "#58508d", "#bc5090", "#ff6361", "#ffa600"];

/**
 * Bar chart for Material moved for all the days worked.
 *
 * Every bar is split into parts based on the material name
 *
 */
const DowntimeTimelinePanel = ({ data }: { data: ProcessedAppData }) => {
    const [chartData, setChartData] = useState<
        {
            [key: string]: any;
        }[]
    >([]);
    const [taskNames, setTaskNames] = useState<string[]>([]);

    useEffect(() => {
        const { chartData, taskNames } = getProcessedDowntime(data);
        setChartData(chartData);
        setTaskNames(taskNames);
    }, [data]);

    const CustomTooltip = ({
        active,
        payload,
        label
    }: {
        active?: any;
        payload?: any;
        label?: any;
    }) => {
        const totalDowntime =
            // @ts-ignore
            payload.reduce((acc, curr) => {
                return acc + curr.value;
            }, 0);

        if (active && payload && payload.length) {
            return (
                <div className="flex flex-col gap-2 rounded-md bg-white p-3">
                    <h3 className="text-black">{label}</h3>

                    <h3 className="text-black">
                        Total Down Time:{" "}
                        {formatTime(
                            dayjs
                                .duration(totalDowntime, "hours")
                                .asMilliseconds()
                        )}
                    </h3>

                    {/* @ts-ignore */}
                    {[...payload].reverse().map((item) => (
                        <div
                            style={{ color: item.fill }}
                            className="flex gap-2"
                            key={item.name}
                        >
                            <span>
                                {item.name.charAt(0).toUpperCase() +
                                    item.name.slice(1)}
                            </span>
                            <span>
                                {formatTime(
                                    dayjs
                                        .duration(item.value, "hours")
                                        .asMilliseconds()
                                )}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const getProcessedDowntime = useCallback((data: ProcessedAppData) => {
        // 01/02/2024: {idle: hours, unloading: hours, loading: hours, trip: hours, returnTrip: hours}
        let stackedDowntimeEntries = data.downtimeData.reduce(
            (acc, curr) => {
                const { task, downtimeEndTimestamp, downtimeStartTimestamp } =
                    curr;
                const duration = dayjs
                    .duration(downtimeEndTimestamp - downtimeStartTimestamp)
                    .asHours();

                const timestamp = dayjs(downtimeStartTimestamp).format(
                    "DD/MM/YYYY"
                );

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

        if (!Object.keys(stackedDowntimeEntries).length) {
            stackedDowntimeEntries = data.appSessionData.reduce(
                (acc, curr) => {
                    const { loadingStartTimestamp } = curr;

                    const timestamp = dayjs(loadingStartTimestamp).format(
                        "DD/MM/YYYY"
                    );

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
        const chartData = Object.keys(stackedDowntimeEntries).map(
            (timestamp) => {
                // entry = {idle: number, unloading: number, loading: number, trip: number, returnTrip: number}
                const entry = {
                    timestamp,
                    ...stackedDowntimeEntries[timestamp]
                };
                return entry;
            }
        );

        return {
            chartData,
            taskNames: ["idle", "returnTrip", "unloading", "trip", "loading"]
        };
    }, []);

    return (
        <ResponsiveContainer
            width="100%"
            className="min-h-[30vh] -translate-x-2 md:translate-x-0"
        >
            <BarChart data={chartData}>
                <Tooltip
                    cursor={{ fill: "#464646" }}
                    content={<CustomTooltip />}
                />
                <XAxis dataKey="timestamp" />
                <YAxis />
                {taskNames.map((name, index) => (
                    <Bar
                        maxBarSize={50}
                        key={index}
                        dataKey={name}
                        stackId="a"
                        fill={`${BAR_COLORS[index]}`}
                    />
                ))}
                <Legend
                    wrapperStyle={{
                        bottom: -5
                    }}
                />
                <Brush
                    endIndex={chartData && chartData.length > 5 ? 5 : undefined}
                    dataKey="timestamp"
                    height={30}
                    fill="#191414"
                />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default memo(DowntimeTimelinePanel);
