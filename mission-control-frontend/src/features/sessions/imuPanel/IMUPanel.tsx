import { useEffect, useState } from "react";
import { getIMUDataFn } from "../sensorService";
import { useMutation } from "react-query";
import { errorLogger } from "../../../util/errorLogger";
import { Imu } from "../../../data/types";

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
import { scaleTime } from "d3";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";

type DistancePanelProps = {
    robotId?: string;
    sessionId?: string;
};

const monthFormat = (date: number) => {
    return dayjs(date).format("h:mm:ss A");
};

export const getXAxisArgsForTimeBasedGraph = (numericValues: number[]) => {
    const maxValue = Math.max(...numericValues);
    const minValue = Math.min(...numericValues);
    const timeScale = scaleTime().domain([minValue, maxValue]).nice(5);
    return {
        scale: timeScale,
        type: "number",
        domain: timeScale.domain(),
        tickFormatter: monthFormat,
        ticks: timeScale.ticks(5)
    };
};

/**
 *
 * A graph depicting the distance travelled by robot during the session
 *
 */
const IMUPanel = ({ robotId, sessionId }: DistancePanelProps) => {
    const [imuData, setImuData] = useState<Imu[]>([]);
    const [isFetched, setIsFetched] = useState(false);

    const allDates = imuData.map((data) => dayjs(data.timestamp).valueOf());

    const { mutate: fetchIMUdata, isLoading } = useMutation(
        ({ robotId, sessionId }: { robotId: string; sessionId: string }) =>
            getIMUDataFn(robotId, sessionId),
        {
            onSuccess: (data: Imu[]) => {
                console.log({ imu: data });
                setImuData(data);
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
            fetchIMUdata({
                robotId,
                sessionId
            });
        }
        return () => {
            setImuData([]);
            setIsFetched(false);
        };
    }, [robotId, sessionId]);

    if (isFetched && imuData.length === 0) {
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
                <div className="flex flex-col gap-2 rounded-md bg-white p-3 text-black">
                    <span>
                        {dayjs(label).format("h:mm:ss A[, ]DD/MM/YYYY")}
                    </span>
                    <div className="flex flex-col gap-1">
                        <span className="text-[#F00]">{`Gyro x: ${payload[0]?.value}`}</span>
                        <span className="text-[#0F0]">{`Gyro y: ${payload[1]?.value}`}</span>
                        <span className="text-[#00F]">{`Gyro z: ${payload[2]?.value}`}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex h-full w-full flex-col gap-6 rounded-md border border-border p-4">
            <div className="flex flex-col gap-2">
                <span className="text-2xl">IMU panel</span>
                <span className="text-base text-neutral-400">
                    Plot of IMU timeseries data
                </span>
            </div>

            <div className="relative h-full w-full">
                {isLoading && (
                    <div className="absolute left-0 top-0 z-[100] flex h-full w-full items-center justify-center rounded-md bg-backgroundGray text-2xl opacity-90">
                        <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-background" />
                    </div>
                )}
                {imuData.length > 0 ? (
                    <ResponsiveContainer
                        width="100%"
                        height={300}
                        className="my-5"
                    >
                        <LineChart
                            width={500}
                            height={300}
                            data={imuData.map((data) => ({
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
                                type="monotone"
                                name="Gyro x"
                                dataKey="angularVelocity.x"
                                stroke="#F00"
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="angularVelocity.y"
                                stroke="#0F0"
                                name="Gyro y"
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="angularVelocity.z"
                                stroke="#00F"
                                name="Gyro z"
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full min-h-[30vh] w-full items-center justify-center rounded-md border  border-border bg-backgroundGray">
                        No IMU Data to display
                    </div>
                )}
            </div>
        </div>
    );
};

export default IMUPanel;
