import { memo, useCallback, useEffect, useState } from "react";
import { Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ProcessedAppData } from "../../../data/types/appDataTypes";
import { colors } from "@/util/constants";
import { useWindowDimensions } from "@/hooks/useWindowDimensions";

type TripMaterialData = {
    material: string;
    count: number;
    fill: string;
    stroke: string;
};

const COLORS_500 = colors.COLORS_500();

/**
 * Pie chart for number of trips for every material in the processedAppData.
 */
const MaterialTripsPieChart = ({ data }: { data: ProcessedAppData }) => {
    const [tripMaterialData, setTripMaterialData] =
        useState<TripMaterialData[]>();
    const [totalTrips, setTotalTrips] = useState(0);
    const { width } = useWindowDimensions();

    const renderLabel = useCallback(
        (piePiece: { name: string; value: number; fill: string }) => {
            if (width < 500) return null;
            // Threshold of 3% of the totalTrips - if less than that, dont render label
            if ((piePiece.value / totalTrips) * 100 < 3) return null;

            return `${piePiece.name} ${(
                (piePiece.value / totalTrips) *
                100
            ).toFixed(2)}%`;
        },
        [totalTrips, width]
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
                        <span className="text-green-500">{`Trips: ${payload[0].value}`}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    useEffect(() => {
        setTotalTrips(data.appSessionData.length);
        
        const materialCount = data.appSessionData.reduce((materialCount ,session) => {  
            materialCount[session.loadingMaterialType] =
                (materialCount[session.loadingMaterialType] || 0) + 1;
                
                return materialCount;
        }, {} as {
            [materialName: string]: number;
        });

        const materialCountArr: TripMaterialData[] = [];

        Object.keys(materialCount).forEach((material) => {
            materialCountArr.push({
                material,
                count: materialCount[material],
                fill: COLORS_500[materialCountArr.length % COLORS_500.length],
                stroke: COLORS_500[materialCountArr.length % COLORS_500.length]
            });
        });

        setTripMaterialData(materialCountArr);
    }, [data]);

    return (
        <ResponsiveContainer width="100%" className="min-h-[30vh]">
            <PieChart key={tripMaterialData?.length}>
                <Pie
                    data={tripMaterialData}
                    dataKey="count"
                    nameKey="material"
                    // @ts-ignore
                    labelLine={({
                        cx,
                        cy,
                        midAngle,
                        innerRadius,
                        outerRadius,
                        value
                    }) => {
                        if (width < 500) return null;
                        const RADIAN = Math.PI / 180;

                        const radius1 =
                            20 + innerRadius + (outerRadius - innerRadius);
                        const radius2 =
                            innerRadius + (outerRadius - innerRadius);
                        const x2 = cx + radius1 * Math.cos(-midAngle * RADIAN);
                        const y2 = cy + radius1 * Math.sin(-midAngle * RADIAN);
                        const x1 = cx + radius2 * Math.cos(-midAngle * RADIAN);
                        const y1 = cy + radius2 * Math.sin(-midAngle * RADIAN);

                        if ((value / totalTrips) * 100 < 3) {
                            return null;
                        }

                        return (
                            <line
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke="#ccc"
                                strokeWidth={1}
                            ></line>
                        );
                    }}
                    cx="50%"
                    cy="50%"
                    stroke="0"
                    label={renderLabel}
                    outerRadius={width < 500 ? "100%" : "60%"}
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

export default memo(MaterialTripsPieChart);
