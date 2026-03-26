import { memo, useCallback, useEffect, useState } from "react";
import { Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ProcessedAppData } from "../../../data/types/appDataTypes";
import dayjs from "dayjs";
import { useWindowDimensions } from "@/hooks/useWindowDimensions";

type TimeData = {
    name: string;
    value: number;
    fill: string;
};

/**
 * Pie chart for operation time by the robot.
 * 
 * Parts of the pie chart:
 * 
 * * Loading time
 * * Trip time
 * * Unloading time
 * * Return trip time
 * * Idle time
 * 
 */
const OperationalTimePiePanel = ({ 
    data 
}: {
     data: ProcessedAppData 
}) => {
    const { width } = useWindowDimensions();

    const [taskData, setTaskData] = useState<TimeData[]>();
    const [totalTime, setTotalTime] = useState(0);

    const renderLabel = useCallback(
        (piePiece: { name: string; value: number; fill: string }) => {
            if (width < 500) return null;
            return `${piePiece.name} ${(
                (piePiece.value / totalTime) *
                100
            ).toFixed(2)}%`;
        },
        [totalTime, width]
    );

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
                    <span>{payload[0].name}</span>
                    <div>
                        <span className="text-green-500">{`${dayjs
                            .duration(payload[0].value)
                            .asHours()
                            .toFixed(2)} hours`}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Calculation required for the pie chart
    useEffect(() => {
        const { pieData, totalTime } = data.appSessionData.reduce(({
            pieData, totalTime
        }, session ) => {
            pieData[0].value += session.loadingTime;
            pieData[1].value += session.tripTime;
            pieData[2].value += session.unloadingTime;
            pieData[3].value += session.returnTripTime;
            pieData[4].value += session.tripIdleTime;
            totalTime += session.totalTripTime;

            return { pieData, totalTime }
        }, {
        pieData: [
            {
                name: "Loading Time",
                value: 0,
                fill: "#0070a3",
                stroke: "#0070a3"
            },
            {
                name: "Trip Time",
                value: 0,
                fill: "#58508d",
                stroke: "#58508d"
            },
            {
                name: "Unloading Time",
                value: 0,
                fill: "#bc5090",
                stroke: "#bc5090"
            },
            {
                name: "Return Trip time",
                value: 0,
                fill: "#ff6361",
                stroke: "#ff6361"
            },
            {
                name: "Idle time",
                value: 0,
                fill: "#ffa600",
                stroke: "#ffa600"
            }
        ], totalTime: 0
    });

        setTaskData(pieData);
        setTotalTime(totalTime);
    }, [data]);

    return (
        <ResponsiveContainer width="100%" className="min-h-[30vh]">
            <PieChart key={taskData?.length}>
                <Pie
                    data={taskData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    label={renderLabel}
                    outerRadius={width < 500 ? "80%" : "60%"}
                    labelLine={width > 500}
                />
                <Legend
                    wrapperStyle={{
                        bottom: -5,
                        display: width < 500 ? "block" : "none"
                    }}
                />
                <Tooltip content={<CustomTooltip />} />
            </PieChart>
        </ResponsiveContainer>
    );
};

export default memo(OperationalTimePiePanel);
