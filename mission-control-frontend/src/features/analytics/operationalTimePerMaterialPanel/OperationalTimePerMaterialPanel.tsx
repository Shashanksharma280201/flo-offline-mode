import { memo, useEffect, useState } from "react";
import {
    Bar,
    BarChart,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import { ProcessedAppData } from "../../../data/types/appDataTypes";
import dayjs from "dayjs";
import { colors } from "@/util/constants";
import { formatTime } from "@/util/timeFormatter";

function getProcessedAppData(data: ProcessedAppData) {
    const materialMap = data.appSessionData.reduce(
        (materialMap, session) => {
            if (materialMap[session.loadingMaterialType]) {
                materialMap[session.loadingMaterialType][0].time += dayjs
                    .duration(session.loadingTime, "millisecond")
                    .asHours();
                materialMap[session.loadingMaterialType][1].time += dayjs
                    .duration(session.tripTime, "millisecond")
                    .asHours();
                materialMap[session.loadingMaterialType][2].time += dayjs
                    .duration(session.unloadingTime, "millisecond")
                    .asHours();
                materialMap[session.loadingMaterialType][3].time += dayjs
                    .duration(session.returnTripTime, "millisecond")
                    .asHours();
                materialMap[session.loadingMaterialType][4].time += dayjs
                    .duration(session.tripIdleTime, "millisecond")
                    .asHours();
            } else {
                materialMap[session.loadingMaterialType] = [
                    {
                        timeType: "Loading Time",
                        time: dayjs
                            .duration(session.loadingTime, "millisecond")
                            .asHours(),
                        fill: "#003f5c"
                    },
                    {
                        timeType: "Trip Time",
                        time: dayjs
                            .duration(session.tripTime, "millisecond")
                            .asHours(),
                        fill: "#58508d"
                    },
                    {
                        timeType: "Unloading Time",
                        time: dayjs
                            .duration(session.unloadingTime, "millisecond")
                            .asHours(),
                        fill: "#bc5090"
                    },
                    {
                        timeType: "Return Trip Time",
                        time: dayjs
                            .duration(session.returnTripTime, "millisecond")
                            .asHours(),
                        fill: "#ff6361"
                    },
                    {
                        timeType: "Idle Time",
                        time: dayjs
                            .duration(session.tripIdleTime, "millisecond")
                            .asHours(),
                        fill: "#ffa600"
                    }
                ];
            }
            return materialMap;
        },
        {} as { [materialName: string]: any }
    );

    const materials = Object.keys(materialMap);
    return { materials, materialMap };
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
const COLORS_400 = colors.COLORS_400();

const OperationalTimePerMaterialPanel = ({
    data
}: {
    data: ProcessedAppData;
}) => {
    const [materials, setMaterials] = useState<string[]>([]);
    const [materialMap, setMaterialMap] = useState<{
        [materialName: string]: any;
    }>();
    const [selectedMaterial, setSelectedMaterial] = useState("");

    useEffect(() => {
        const { materialMap, materials } = getProcessedAppData(data);
        setMaterials(materials);
        setSelectedMaterial(materials[0]);
        setMaterialMap(materialMap);
    }, [data]);

    const customLegend = () => {
        return (
            <ul className="flex flex-wrap justify-center gap-x-3">
                {materials.map((material, index) => (
                    <li
                        onClick={() => setSelectedMaterial(material)}
                        style={{
                            borderColor: COLORS_400[index % COLORS_400.length]
                        }}
                        key={`material-${index}`}
                        className={`flex cursor-pointer items-center justify-center gap-1 px-2 ${selectedMaterial === material && "rounded-md border"} `}
                    >
                        <span
                            style={{
                                backgroundColor:
                                    COLORS_400[index % COLORS_400.length]
                            }}
                            className={`h-3 w-3`}
                        />
                        <span
                            style={{
                                color: COLORS_400[index % COLORS_400.length]
                            }}
                        >
                            {material}
                        </span>
                    </li>
                ))}
            </ul>
        );
    };

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
                <div className="flex flex-col gap-2 rounded-md bg-white p-3">
                    {/* @ts-ignore */}
                    <div className="flex gap-2 text-black" key={label}>
                        <span>Time: </span>
                        <span style={{ color: payload[0].payload.fill }}>
                            {`${formatTime(dayjs.duration(payload[0].value, "hours").asMilliseconds())}`}
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <>
            {materialMap && materials.length > 0 && (
                <ResponsiveContainer
                    width="100%"
                    className="min-h-[30vh] -translate-x-2 md:translate-x-0"
                >
                    <BarChart
                        maxBarSize={50}
                        data={materialMap[selectedMaterial]}
                    >
                        <XAxis dataKey="timeType" />
                        <YAxis />
                        <Tooltip
                            cursor={{ fill: "#464646" }}
                            content={<CustomTooltip />}
                        />
                        <Legend
                            content={customLegend}
                            wrapperStyle={{
                                bottom: -5
                            }}
                        />
                        <Bar maxBarSize={50} dataKey="time" />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </>
    );
};

export default memo(OperationalTimePerMaterialPanel);
