import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getXAxisArgsForTimeBasedGraph } from "@/util/chartUtils";
import dayjs from "dayjs";
import {
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";

type RightCytronData = {
    timestamp: Date;
    value: number;
};
export const RightCytronTempChart = ({
    allDates,
    isLoading,
    data
}: {
    allDates: number[];
    isLoading: boolean;
    data: RightCytronData[];
}) => {
    const CustomTooltip = ({
        active,
        payload,
        label
    }: {
        active?: any;
        payload?: any;
        label?: any;
    }) => {
        if (active && payload && payload.length) {
            return (
                <div className="flex flex-col rounded-md bg-white p-3 text-black">
                    <span>
                        {dayjs(label).format("h:mm:ss A[, ]DD/MM/YYYY")}
                    </span>
                    <div>
                        <span className="text-green-500">{`Temperature: ${payload[0]?.value}°C`}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex h-full w-full flex-col gap-6 rounded-md border border-border p-4">
            <div className="flex flex-col gap-2">
                <span className="text-2xl">Right cytron temperature</span>
                <span className="text-base text-neutral-400">
                    Plot of right cytron temperature timeseries data
                </span>
            </div>

            <div className="relative h-full w-full">
                {isLoading && (
                    <div className="absolute left-0 top-0 z-[100] flex h-full w-full items-center justify-center rounded-md bg-backgroundGray text-2xl opacity-90">
                        <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-background" />
                    </div>
                )}
                {data.length > 0 ? (
                    <ResponsiveContainer
                        width="100%"
                        height={300}
                        className="my-5"
                    >
                        <LineChart
                            width={500}
                            height={300}
                            data={data.map((data) => ({
                                ...data,
                                timestamp: dayjs(data.timestamp).valueOf()
                            }))}
                            margin={{
                                top: 5,
                                right: 50,
                                left: 0,
                                bottom: 5
                            }}
                        >
                            {/* @ts-ignore , ignoring because recharts XAxis works with Date[] as well */}
                            <XAxis
                                padding={{ left: 20, right: 20 }}
                                dataKey="timestamp"
                                dy={10}
                                fontSize={12}
                                {...getXAxisArgsForTimeBasedGraph(allDates)}
                            />
                            <YAxis fontSize={12} />
                            <Tooltip
                                content={<CustomTooltip />}
                                wrapperClassName="text-black rounded-md"
                            />
                            <Legend
                                wrapperStyle={{
                                    bottom: -5
                                }}
                                verticalAlign="bottom"
                                className="p-3"
                            />
                            <Line
                                dot={false}
                                type="monotone"
                                dataKey="value"
                                stroke="#22c55e"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full min-h-[30vh] w-full items-center justify-center rounded-md border  border-border bg-backgroundGray">
                        No Right cytron temperature data to display
                    </div>
                )}
            </div>
        </div>
    );
};
type leftCytronTempData = {
    timestamp: Date;
    value: number;
};
export const LeftCytronTempChart = ({
    allDates,
    isLoading,
    data
}: {
    allDates: number[];
    isLoading: boolean;
    data: leftCytronTempData[];
}) => {
    const CustomTooltip = ({
        active,
        payload,
        label
    }: {
        active?: any;
        payload?: any;
        label?: any;
    }) => {
        if (active && payload && payload.length) {
            return (
                <div className="flex flex-col rounded-md bg-white p-3 text-black">
                    <span>
                        {dayjs(label).format("h:mm:ss A[, ]DD/MM/YYYY")}
                    </span>
                    <div>
                        <span className="text-green-500">{`Temperature: ${payload[0]?.value}°C`}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex h-full w-full flex-col gap-6 rounded-md border border-border p-4">
            <div className="flex flex-col gap-2">
                <span className="text-2xl">Left cytron temperature</span>
                <span className="text-base text-neutral-400">
                    Plot of left cytron temperature timeseries data
                </span>
            </div>

            <div className="relative h-full w-full">
                {isLoading && (
                    <div className="absolute left-0 top-0 z-[100] flex h-full w-full items-center justify-center rounded-md bg-backgroundGray text-2xl opacity-90">
                        <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-background" />
                    </div>
                )}
                {data.length > 0 ? (
                    <ResponsiveContainer
                        width="100%"
                        height={300}
                        className="my-5"
                    >
                        <LineChart
                            width={500}
                            height={300}
                            data={data.map((data) => ({
                                ...data,
                                timestamp: dayjs(data.timestamp).valueOf()
                            }))}
                            margin={{
                                top: 5,
                                right: 50,
                                left: 0,
                                bottom: 5
                            }}
                        >
                            {/* @ts-ignore , ignoring because recharts XAxis works with Date[] as well */}
                            <XAxis
                                padding={{ left: 20, right: 20 }}
                                dataKey="timestamp"
                                dy={10}
                                fontSize={12}
                                {...getXAxisArgsForTimeBasedGraph(allDates)}
                            />
                            <YAxis fontSize={12} />
                            <Tooltip
                                content={<CustomTooltip />}
                                wrapperClassName="text-black rounded-md"
                            />
                            <Legend
                                wrapperStyle={{
                                    bottom: -5
                                }}
                                verticalAlign="bottom"
                                className="p-3"
                            />
                            <Line
                                dot={false}
                                type="monotone"
                                dataKey="value"
                                stroke="#22c55e"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full min-h-[30vh] w-full items-center justify-center rounded-md border  border-border bg-backgroundGray">
                        No Left cytron temperature data to display
                    </div>
                )}
            </div>
        </div>
    );
};
