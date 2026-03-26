import { useEffect, useState } from "react";
import { getMMRDataFn } from "../sensorService";
import { useMutation } from "react-query";
import { errorLogger } from "../../../util/errorLogger";
import { MMRData } from "../../../data/types";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import dayjs from "dayjs";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import {
    LeftCytronTempChart,
    RightCytronTempChart
} from "../common/CommonCharts";
import { getXAxisArgsForTimeBasedGraph } from "@/util/chartUtils";

type MMRPanelProps = {
    robotId?: string;
    sessionId?: string;
};

/**
 *
 * A graph depicting the battery percentage of the robot during the session
 *
 */
const MMRPanel = ({ robotId, sessionId }: MMRPanelProps) => {
    const [mmrData, setMMRData] = useState<MMRData[]>([]);
    const [isFetched, setIsFetched] = useState(false);

    const allDates = mmrData.map((data) => dayjs(data.timestamp).valueOf());

    const { mutate: fetchMMRData, isLoading } = useMutation(
        ({ robotId, sessionId }: { robotId: string; sessionId: string }) =>
            getMMRDataFn(robotId, sessionId),
        {
            onSuccess: (data: MMRData[]) => {
                console.log({ mmr: data });
                setMMRData(data);
                setIsFetched(true);
            },
            onError: (error: any) => {
                errorLogger(error);
                setIsFetched(true);
            }
        }
    );

    useEffect(() => {
        if (robotId && sessionId) {
            fetchMMRData({
                robotId,
                sessionId
            });
        }
        return () => {
            setMMRData([]);
            setIsFetched(false);
        };
    }, [robotId, sessionId]);

    if (isFetched && mmrData.length === 0) {
        return null;
    }

    return (
        <>
            <LeftCytronTempChart
                allDates={allDates}
                isLoading={isLoading}
                data={mmrData.map((item) => ({
                    timestamp: item.timestamp,
                    value: item.leftCytronTemp
                }))}
            />
            <RightCytronTempChart
                allDates={allDates}
                isLoading={isLoading}
                data={mmrData.map((item) => ({
                    timestamp: item.timestamp,
                    value: item.rightCytronTemp
                }))}
            />
            <ThrottleChart
                allDates={allDates}
                isLoading={isLoading}
                mmrData={mmrData}
            />
            <BaroTempChart
                allDates={allDates}
                isLoading={isLoading}
                mmrData={mmrData}
            />
            <BaroAltitudeChart
                allDates={allDates}
                isLoading={isLoading}
                mmrData={mmrData}
            />
        </>
    );
};

const ThrottleChart = ({
    allDates,
    isLoading,
    mmrData
}: {
    allDates: number[];
    isLoading: boolean;
    mmrData: MMRData[];
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
                        <span className="text-green-500">{`Throttle: ${payload[0]?.value}%`}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex h-full w-full flex-col gap-6 rounded-md border border-border p-4">
            <div className="flex flex-col gap-2">
                <span className="text-2xl">Throttle</span>
                <span className="text-base text-neutral-400">
                    Plot of MMR Throttle timeseries data
                </span>
            </div>

            <div className="relative h-full w-full">
                {isLoading && (
                    <div className="absolute left-0 top-0 z-[100] flex h-full w-full items-center justify-center rounded-md bg-backgroundGray text-2xl opacity-90">
                        <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-background" />
                    </div>
                )}
                {mmrData.length > 0 ? (
                    <ResponsiveContainer
                        width="100%"
                        height={300}
                        className="my-5"
                    >
                        <LineChart
                            width={500}
                            height={300}
                            data={mmrData.map((data) => ({
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
                                dataKey="throttle"
                                stroke="#22c55e"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full min-h-[30vh] w-full items-center justify-center rounded-md border  border-border bg-backgroundGray">
                        No Throttle data to display
                    </div>
                )}
            </div>
        </div>
    );
};

const BaroTempChart = ({
    allDates,
    isLoading,
    mmrData
}: {
    allDates: number[];
    isLoading: boolean;
    mmrData: MMRData[];
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
                <span className="text-2xl">Barometer temperature</span>
                <span className="text-base text-neutral-400">
                    Plot of barometer temperature timeseries data
                </span>
            </div>

            <div className="relative h-full w-full">
                {isLoading && (
                    <div className="absolute left-0 top-0 z-[100] flex h-full w-full items-center justify-center rounded-md bg-backgroundGray text-2xl opacity-90">
                        <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-background" />
                    </div>
                )}
                {mmrData.length > 0 ? (
                    <ResponsiveContainer
                        width="100%"
                        height={300}
                        className="my-5"
                    >
                        <LineChart
                            width={500}
                            height={300}
                            data={mmrData.map((data) => ({
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
                                dataKey="baroTemperature"
                                stroke="#22c55e"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full min-h-[30vh] w-full items-center justify-center rounded-md border  border-border bg-backgroundGray">
                        No barometer temperature data to display
                    </div>
                )}
            </div>
        </div>
    );
};

const BaroAltitudeChart = ({
    allDates,
    isLoading,
    mmrData
}: {
    allDates: number[];
    isLoading: boolean;
    mmrData: MMRData[];
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
                        <span className="text-green-500">{`Altitude: ${payload[0]?.value}m`}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex h-full w-full flex-col gap-6 rounded-md border border-border p-4">
            <div className="flex flex-col gap-2">
                <span className="text-2xl">Barometer altitude</span>
                <span className="text-base text-neutral-400">
                    Plot of barometer altitude data
                </span>
            </div>

            <div className="relative h-full w-full">
                {isLoading && (
                    <div className="absolute left-0 top-0 z-[100] flex h-full w-full items-center justify-center rounded-md bg-backgroundGray text-2xl opacity-90">
                        <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-background" />
                    </div>
                )}
                {mmrData.length > 0 ? (
                    <ResponsiveContainer
                        width="100%"
                        height={300}
                        className="my-5"
                    >
                        <LineChart
                            width={500}
                            height={300}
                            data={mmrData.map((data) => ({
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
                                dataKey="baroAltitude"
                                stroke="#22c55e"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full min-h-[30vh] w-full items-center justify-center rounded-md border  border-border bg-backgroundGray">
                        No barometer altitude to display
                    </div>
                )}
            </div>
        </div>
    );
};

export default MMRPanel;
