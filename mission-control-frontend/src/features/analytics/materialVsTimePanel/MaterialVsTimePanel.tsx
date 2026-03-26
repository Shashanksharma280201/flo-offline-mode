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
import { colors } from "@/util/constants";
import dayjs from "dayjs";

type Material = {
    name: string;
    quantity: number;
    timestamp: string;
};

const COLORS_400 = colors.COLORS_400();

const getProcessedMaterial = (data: ProcessedAppData) => {
    const materials = data.appSessionData.map((item, index) => {
        const name = item.loadingMaterialType;
        const quantity = item.loadingMaterialQuantity;
        const timestamp = dayjs(item.loadingStartTimestamp).format(
            "DD/MM/YYYY"
        );
        return { name, quantity, timestamp };
    });
    
   const stackedMaterials = materials.reduce((stackedMaterials, material) => {
        if (!stackedMaterials[material.timestamp]) {
            stackedMaterials[material.timestamp] = [];
        }
        stackedMaterials[material.timestamp].push(material);

        return stackedMaterials
    },{} as { [timestamp: string]: Material[] });


    const chartData = Object.keys(stackedMaterials).map((timestamp) => {
        const materials = stackedMaterials[timestamp];
        const dataPoint: { [x: string]: string | number } = { timestamp };

        materials.forEach((material) => {
            dataPoint[material.name] = ((dataPoint[material.name] as number) || 0) + material.quantity;
        });

        return dataPoint;
    });
    const materialNames = Array.from(
        new Set(materials.map((material) => material.name))
    );
    return { chartData, materialNames };
};

/**
 * Bar chart for Material moved for all the days worked.
 * 
 * Every bar is split into parts based on the material name 
 * 
 */
const MaterialVsTimePanel = ({ data }: { data: ProcessedAppData }) => {
    const [chartData, setChartData] = useState<
        {
            [key: string]: any;
        }[]
    >([]);
    
    const [materialNames, setMaterialNames] = useState<string[]>([]);

    useEffect(() => {
        const { chartData, materialNames } = getProcessedMaterial(data);
        setChartData(chartData);
        setMaterialNames(materialNames);
    }, [data]);
    
    return (
        <ResponsiveContainer
            width="100%"
            className="min-h-[30vh]  -translate-x-2 md:translate-x-0"
        >
            <BarChart data={chartData}>
                <Tooltip
                    cursor={{ fill: "#464646" }}
                    wrapperClassName="text-black rounded-md"
                />
                <XAxis dataKey="timestamp" />
                <YAxis />
                {materialNames.map((name, index) => (
                    <Bar
                        maxBarSize={50}
                        key={index}
                        dataKey={name}
                        stackId="a"
                        fill={`${
                            index % 2 === 0
                                ? COLORS_400[index % COLORS_400.length]
                                : COLORS_400[
                                      COLORS_400.length -
                                          (index % COLORS_400.length) -
                                          1
                                  ]
                        }`}
                    />
                ))}
                <Legend
                    wrapperStyle={{
                        bottom: -5
                    }}
                />
                <Brush
                    endIndex={chartData && chartData.length > 5 ? 5 : undefined}
                    dataKey="timestamp"
                    height={30}
                    fill="#191414"
                />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default memo(MaterialVsTimePanel);
