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

export const NissanLineChart = ({
    allDates,
    data,
    dataKey,
    title,
    description,
    tooltipKey,
    units,
    emptyDataMessage
}: {
    allDates: number[];
    data: any[];
    dataKey: string;
    title: string;
    description: string;
    tooltipKey: string;
    units: string;
    emptyDataMessage: string;
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
                        <span className="text-green-500">{`${tooltipKey}${payload[0]?.value}${units}`}</span>
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
                <span className="text-base text-neutral-400">
                    {description}
                </span>
            </div>

            <div className="relative h-full w-full">
                {data.length ? (
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
                                dataKey={dataKey}
                                stroke="#22c55e"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full min-h-[30vh] w-full items-center justify-center rounded-md border  border-border bg-backgroundGray">
                        {emptyDataMessage}
                    </div>
                )}
            </div>
        </div>
    );
};
