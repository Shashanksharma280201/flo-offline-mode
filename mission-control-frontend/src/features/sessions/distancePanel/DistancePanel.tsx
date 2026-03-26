import { useEffect, useState } from "react";
import { getDistanceDataFn } from "../sensorService";
import { useMutation } from "react-query";
import { errorLogger } from "../../../util/errorLogger";
import { Distance } from "../../../data/types";

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
import { getXAxisArgsForTimeBasedGraph } from "@/util/chartUtils";

type DistancePanelProps = {
    robotId?: string;
    sessionId?: string;
};

/**
 *
 * A graph depicting the distance travelled by robot during the session
 *
 */
const DistancePanel = ({ robotId, sessionId }: DistancePanelProps) => {
    const [distanceData, setDistanceData] = useState<
        { distance: number; timestamp: number }[]
    >([]);
    const [isFetched, setIsFetched] = useState(false);

    const allDates = distanceData.map((data) => data.timestamp);

    const { mutate: fetchDistanceData, isLoading } = useMutation(
        ({ robotId, sessionId }: { robotId: string; sessionId: string }) =>
            getDistanceDataFn(robotId, sessionId),
        {
            onSuccess: (data: Distance[]) => {
                if (data.length === 0) {
                    setDistanceData([]);
                    setIsFetched(true);
                    return;
                }

                const firstReading = data[0].data;
                const normalizedData = data.map((value) => ({
                    distance: Number((value.data - firstReading).toFixed(2)),
                    timestamp: dayjs(value.timestamp).valueOf()
                }));

                setDistanceData(normalizedData);
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
            fetchDistanceData({
                robotId,
                sessionId
            });
        }
        return () => {
            setDistanceData([]);
            setIsFetched(false);
        };
    }, [robotId, sessionId]);

    if (isFetched && distanceData.length === 0) {
        return null;
    }

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
                        <span className="text-[#8884d8]">{`${Object.keys(payload[0]?.payload)[0]
                            }: ${payload[0]?.value}m`}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex h-full w-full flex-col gap-6 rounded-md border border-border p-4">
            <div className="flex flex-col gap-2">
                <span className="text-2xl">Distance Panel</span>
                <span className="text-base text-neutral-400">
                    Plot of distance timeseries data
                </span>
            </div>

            <div className="relative h-full w-full">
                {isLoading && (
                    <div className="absolute left-0 top-0 z-[100] flex h-full w-full items-center justify-center rounded-md bg-backgroundGray text-2xl opacity-90">
                        <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-background" />
                    </div>
                )}
                {distanceData.length > 0 ? (
                    <ResponsiveContainer
                        width="100%"
                        height={300}
                        className="my-5"
                    >
                        <LineChart
                            width={500}
                            height={300}
                            data={distanceData}
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
                                type="monotone"
                                dataKey="distance"
                                stroke="#8884d8"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full min-h-[30vh] w-full items-center justify-center rounded-md border  border-border bg-backgroundGray">
                        No Distance Data to display
                    </div>
                )}
            </div>
        </div>
    );
};

export default DistancePanel;
