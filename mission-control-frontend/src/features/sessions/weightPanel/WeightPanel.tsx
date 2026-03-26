import { useEffect, useState } from "react";
import { getPayloadWeightDataFn } from "../sensorService";
import { useMutation } from "react-query";
import { errorLogger } from "../../../util/errorLogger";
import { PayloadWeight } from "../../../data/types";

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

type WeightPanelProps = {
    robotId?: string;
    sessionId?: string;
};

/**
 *
 * A graph depicting the payload weight of the robot during the session
 *
 */
const WeightPanel = ({ robotId, sessionId }: WeightPanelProps) => {
    const [weightData, setWeightData] = useState<PayloadWeight[]>([]);
    const [isFetched, setIsFetched] = useState(false);

    const allDates = weightData.map((data) => dayjs(data.timestamp).valueOf());

    const { mutate: fetchWeightData, isLoading } = useMutation(
        ({ robotId, sessionId }: { robotId: string; sessionId: string }) =>
            getPayloadWeightDataFn(robotId, sessionId),
        {
            onSuccess: (data: PayloadWeight[]) => {
                console.log({ payloadWeight: data });
                setWeightData(data);
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
            fetchWeightData({
                robotId,
                sessionId
            });
        }
        return () => {
            setWeightData([]);
            setIsFetched(false);
        };
    }, [robotId, sessionId]);

    if (isFetched && weightData.length === 0) {
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
                        <span className="text-green-500">{`Weight: ${payload[0]?.value.toFixed(2)} kg`}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex h-full w-full flex-col gap-6 rounded-md border border-border p-4">
            <div className="flex flex-col gap-2">
                <span className="text-2xl">Payload Weight</span>
                <span className="text-base text-neutral-400  ">
                    Plot of payload weight timeseries data
                </span>
            </div>

            <div className="relative h-full w-full">
                {isLoading && (
                    <div className="absolute left-0 top-0 z-[100] flex h-full w-full items-center justify-center rounded-md bg-backgroundGray text-2xl opacity-90">
                        <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-background" />
                    </div>
                )}
                {weightData.length > 0 ? (
                    <ResponsiveContainer
                        width="100%"
                        height={300}
                        className="my-5"
                    >
                        <LineChart
                            width={500}
                            height={300}
                            data={weightData.map((data) => ({
                                data: data.data,
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
                            <YAxis
                                fontSize={12}
                                label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft' }}
                            />
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
                                dataKey="data"
                                name="Weight (kg)"
                                stroke="#22c55e"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full min-h-[30vh] w-full items-center justify-center rounded-md border  border-border bg-backgroundGray">
                        No Weight Data to display
                    </div>
                )}
            </div>
        </div>
    );
};

export default WeightPanel;
