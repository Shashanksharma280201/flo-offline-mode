import { memo, useEffect, useState } from "react";
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

type Material = {
    name: string;
    quantity: number;
    loadingTime: number;
    tripTime: number;
    unloadingTime: number;
    returnTripTime: number;
    idleTime: number;
    totalTime: number;
};

function getProcessedAppData(data: ProcessedAppData) {

    const materialMap = data.appSessionData.reduce((materialMap, item) => {
        const name = item.loadingMaterialType;

        if (!materialMap[name]) {
            materialMap[name] = {
                name,
                quantity: 0,
                loadingTime: 0,
                tripTime: 0,
                unloadingTime: 0,
                returnTripTime: 0,
                idleTime: 0,
                totalTime: 0
            };
        }

        materialMap[name].quantity += item.loadingMaterialQuantity;
        materialMap[name].loadingTime += dayjs.duration(item.loadingTime).asHours()
        materialMap[name].tripTime += dayjs.duration(item.tripTime).asHours()
        materialMap[name].unloadingTime += dayjs.duration(item.unloadingTime).asHours()
        materialMap[name].returnTripTime += dayjs.duration( item.returnTripTime).asHours()
        materialMap[name].idleTime += dayjs.duration(item.tripIdleTime).asHours()
        materialMap[name].totalTime += dayjs.duration(item.totalTripTime).asHours()

        return materialMap
    }, {} as { [name: string]: Material });

    return Object.values(materialMap);
}


/**
 * Bar chart for operation time vs material name of the robot.
 * 
 * Each bar is subdivided into five parts:
 * 
 * * Loading time
 * * Trip time
 * * Unloading time
 * * Return trip time
 * * Idle time
 * 
 */
const OperationalTimeVsMaterialPanel = ({
    data
}: {
    data: ProcessedAppData;
}) => {
    const [materials, setMaterials] = useState<Material[]>();

    useEffect(() => {
        const materialArr = getProcessedAppData(data);
        setMaterials(materialArr);
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
        const matFound = materials?.find((item) => item.name == label);
        if (active && payload && payload.length && matFound) {
            return (
                <div className="flex flex-col gap-2 rounded-md bg-white p-3">
                    <h3 className="text-black">{label}</h3>
                    {payload[0] && payload[0].payload && payload[0].payload.totalTime && <h3 className="text-black">Total Trip Time: {payload[0].payload.totalTime.toFixed(2)} hours</h3>}
                    {/* @ts-ignore */}
                    {[...payload].reverse().map((item) => (
                        <div
                            style={{ color: item.fill }}
                            className="flex gap-2"
                            key={item.name}
                        >
                            <span>{item.name}</span>
                            <span>
                                {formatTime(dayjs.duration(item.value, "hours").asMilliseconds())}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer
            width="100%"
            className="min-h-[30vh] -translate-x-2 md:translate-x-0"
        >
            <BarChart maxBarSize={50} data={materials}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                    cursor={{ fill: "#464646" }}
                    content={<CustomTooltip />}
                />
                <Bar dataKey="loadingTime" stackId="a" fill="#003f5c" />
                <Bar dataKey="tripTime" stackId="a" fill="#58508d" />
                <Bar dataKey="unloadingTime" stackId="a" fill="#bc5090" />
                <Bar dataKey="returnTripTime" stackId="a" fill="#ff6361" />
                <Bar dataKey="idleTime" stackId="a" fill="#ffa600" />
                <Legend
                    wrapperStyle={{
                        bottom: -5
                    }}
                />
                <Brush
                    endIndex={materials && materials.length > 5 ? 5 : undefined}
                    dataKey="name"
                    height={30}
                    fill="#191414"
                />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default memo(OperationalTimeVsMaterialPanel);
