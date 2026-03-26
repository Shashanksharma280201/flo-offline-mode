import { memo } from "react";
import { colors } from "@/util/constants";
import { CategoricalChartState } from "recharts/types/chart/types";
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
import { TripMaterialData } from "./CostEfficiencyPanel";

const COLORS = colors.ALL_COLORS;

/**
 * Bar chart for comparing working done by robot vs manual labour
 * 
 * Each entry on the x axis has two bars
 * 
 * * Robot trips
 * * Equivalent manual trips
 * 
 */
export const CostEfficiencyChart = memo(
    ({
        tripMaterialData,
        mouseMoveHandler
    }: {
        tripMaterialData?: TripMaterialData[];
        mouseMoveHandler: (state: CategoricalChartState) => void;
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
                const {
                    material,
                    equivalentManualTrips,
                    robotTrips,
                    manualRunningTime,
                    robotRunningTime
                } = payload[0].payload;

                return (
                    <div className="flex flex-col gap-3 rounded-md bg-white p-3 text-black">
                        <span>{material}</span>
                        <div className="flex flex-col">
                        
                            <span
                                style={{ color: payload[0].fill }}
                            >{`Robot Trips: ${robotTrips}`}</span>
                            <span
                                style={{ color: payload[0].fill }}
                            >{`Robot Running Time: ${robotRunningTime.toFixed(
                                2
                            )} hrs`}</span>
                            <span
                                style={{ color: payload[1].fill }}
                            >{`Manual Trips: ${equivalentManualTrips}`}</span>
                            <span
                                style={{ color: payload[1].fill }}
                            >{`Manual Running Time: ${manualRunningTime.toFixed(
                                2
                            )} hrs`}</span>
                        </div>
                    </div>
                );
            }
            return null;
        };
        
        return (
            <ResponsiveContainer
                width="100%"
                className="min-h-[40vh] -translate-x-2 md:translate-x-0"
            >
                <BarChart
                    data={tripMaterialData}
                    onMouseMove={mouseMoveHandler}
                >
                    <XAxis dataKey="material" />
                    <Tooltip
                        cursor={{ fill: "#464646" }}
                        content={<CustomTooltip />}
                    />
                    <YAxis />
                    <Legend
                        wrapperStyle={{
                            bottom: -5
                        }}
                    />
                    <Bar
                        maxBarSize={50}
                        dataKey="robotTrips"
                        fill={COLORS.green[3]}
                    />
                    
                    <Bar
                        maxBarSize={50}
                        dataKey="equivalentManualTrips"
                        fill={COLORS.green[5]}
                    />
                    <Brush
                        endIndex={
                            tripMaterialData && tripMaterialData.length > 3
                                ? 3
                                : undefined
                        }
                        dataKey="material"
                        height={30}
                        fill="#191414"
                    />
                </BarChart>
            </ResponsiveContainer>
        );
    }
);
