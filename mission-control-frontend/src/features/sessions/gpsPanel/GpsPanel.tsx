import { useEffect, useState } from "react";
import { useMutation } from "react-query";
import { getGnssDataFn } from "../sensorService";
import { errorLogger } from "../../../util/errorLogger";
import { Gnss } from "../../../data/types";

import GpsTrack from "./GpsTrack";
import dayjs from "dayjs";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    YAxis,
    XAxis
} from "recharts";
import { getXAxisArgsForTimeBasedGraph } from "@/util/chartUtils";

type GpsPanelProps = {
    robotId?: string;
    sessionId?: string;
};

/**
 *
 * Path taken by the robot during the session depicted on google maps
 *
 */
const GpsPanel = ({ robotId, sessionId }: GpsPanelProps) => {
    const [gpsData, setGpsData] = useState<Gnss[]>([]);
    const [isFetched, setIsFetched] = useState(false);
    const { mutate: fetchGpsData, isLoading } = useMutation(
        ({ robotId, sessionId }: { robotId: string; sessionId: string }) =>
            getGnssDataFn(robotId, sessionId),
        {
            onSuccess: (data: Gnss[]) => {
                console.log({ gps: data });
                setGpsData(data);
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
            fetchGpsData({
                robotId,
                sessionId
            });
        }
        return () => {
            setGpsData([]);
            setIsFetched(false);
        };
    }, [robotId, sessionId]);

    if (isFetched && gpsData.length === 0) {
        return null;
    }

    return (
        <>
            <MapPanel
                title="GPS Panel"
                description="The path taken by the robot during the selected session"
                gpsData={gpsData}
                isLoading={isLoading}
            />
            <GPSSpeedChart
                title="Robot speed"
                description="Plot of robot speed timeseries data"
                gpsData={gpsData}
                isLoading={isLoading}
            />
        </>
    );
};

export const MapPanel = ({
    gpsData,
    isLoading,
    title,
    description
}: {
    gpsData: Gnss[];
    isLoading: boolean;
    title: string;
    description: string;
}) => {
    return (
        <div className="flex min-h-[30rem] w-full flex-col gap-6 rounded-3xl bg-slate-800 border border-border p-4">
            <div className="flex flex-col gap-2">
                <span className="text-2xl">{title}</span>
                <span className="text-base text-neutral-400">
                    {description}
                </span>
            </div>

            <GpsTrack coordinates={gpsData} isLoading={isLoading} />
        </div>
    );
};

export const GPSSpeedChart = ({
    isLoading,
    gpsData,
    title,
    description
}: {
    isLoading: boolean;
    gpsData: Gnss[];
    title: string;
    description: string;
}) => {
    const allDates = gpsData.map((data) => dayjs(data.timestamp).valueOf());

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
                        <span className="text-green-500">{`Speed: ${payload[0]?.value}%`}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex h-full w-full flex-col gap-6 rounded-md border border-border p-4">
            <div className="flex flex-col gap-2">
                <span className="text-2xl">{title}</span>
                <span className="text-base text-neutral-400  ">
                    {description}
                </span>
            </div>

            <div className="relative h-full w-full">
                {isLoading && (
                    <div className="absolute left-0 top-0 z-[100] flex h-full w-full items-center justify-center rounded-md bg-backgroundGray text-2xl opacity-90">
                        <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-background" />
                    </div>
                )}
                {gpsData.length > 0 ? (
                    <ResponsiveContainer
                        width="100%"
                        height={300}
                        className="my-5"
                    >
                        <LineChart
                            width={500}
                            height={300}
                            data={gpsData.map((data) => ({
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
                                dataKey="speed"
                                stroke="#22c55e"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full min-h-[30vh] w-full items-center justify-center rounded-md border  border-border bg-backgroundGray">
                        No speed data to display
                    </div>
                )}
            </div>
        </div>
    );
};

export default GpsPanel;
