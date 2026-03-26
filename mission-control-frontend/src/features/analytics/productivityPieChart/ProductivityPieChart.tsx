import { memo, useCallback, useEffect, useState } from "react";
import { ProcessedAppData } from "../../../data/types/appDataTypes";
import dayjs from "dayjs";
import { Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { colors } from "@/util/constants";
import { useWindowDimensions } from "@/hooks/useWindowDimensions";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";

type ProductivityPieData = {
    name: string;
    value: number;
    fill: string;
};
const COLORS = colors.ALL_COLORS;

/**
 * Pie chart for operator productivity
 *
 * Parts of the pie chart:
 *
 * * Working time
 * * Idle time
 * * Down time
 *
 */
const ProductivityPieChart = ({ data }: { data: ProcessedAppData }) => {
    const { width } = useWindowDimensions();
    const workingHours = useAnalyticsStore(
        (state) => (state.selectedClient?.operatingHours ?? 8) - 1
    );

    const [productivityData, setProductivityData] =
        useState<ProductivityPieData[]>();
    const [totalWorkingHours, setTotalWorkingHours] = useState(0);

    const renderLabel = useCallback(
        (piePiece: { name: string; value: number; fill: string }) => {
            if (width < 500) return null;
            return `${piePiece.name} ${(
                (piePiece.value / totalWorkingHours) *
                100
            ).toFixed(2)}%`;
        },
        [totalWorkingHours, width]
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
                        <span className="text-green-500">{`${payload[0].value.toFixed(
                            2
                        )} hours`}</span>
                    </div>
                </div>
            );
        }

        return null;
    };

    useEffect(() => {
        const operators = data.appSessionData.reduce(
            (operators, session) => {
                // Create unique operator key combining client and operator to avoid
                // merging operators with same name from different clients
                const operatorKey = `${session.clientName || 'unknown'}-${session.operatorName}`;

                if (!operators[operatorKey]) {
                    const daysWorked = new Set<string>();
                    daysWorked.add(
                        dayjs(session.loadingStartTimestamp)
                            .startOf("day")
                            .toString()
                    );
                    operators[operatorKey] = {
                        daysWorked,
                        hoursWorked: dayjs
                            .duration(session.tripRunningTime)
                            .asHours()
                    };
                } else {
                    operators[operatorKey].daysWorked.add(
                        dayjs(session.loadingStartTimestamp)
                            .startOf("day")
                            .toString()
                    );
                    operators[operatorKey].hoursWorked += dayjs
                        .duration(session.tripRunningTime)
                        .asHours();
                }
                return operators;
            },
            {} as {
                [operatorKey: string]: {
                    daysWorked: Set<string>;
                    hoursWorked: number;
                };
            }
        );

        const { maxHoursWorked, totalHoursWorked } = Object.keys(
            operators
        ).reduce(
            (prev, name) => {
                let { maxHoursWorked, totalHoursWorked } = prev;

                const { daysWorked, hoursWorked } = operators[name];

                maxHoursWorked += daysWorked.size * workingHours;
                totalHoursWorked += hoursWorked;

                return { maxHoursWorked, totalHoursWorked };
            },
            {
                maxHoursWorked: 0,
                totalHoursWorked: 0
            }
        );

        const pieData = [
            {
                name: "Working Time",
                value: totalHoursWorked,
                fill: COLORS.emerald[5]
            },
            {
                name: "Idle Time",
                value: maxHoursWorked - totalHoursWorked,
                fill: COLORS.amber[5]
            }
        ];
        setTotalWorkingHours(maxHoursWorked);
        setProductivityData(pieData);
    }, [data]);

    return (
        <ResponsiveContainer width="100%" className="min-h-[30vh]">
            <PieChart key={productivityData?.length}>
                <Pie
                    data={productivityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    stroke="0"
                    label={renderLabel}
                    outerRadius={width < 500 ? "75%" : "60%"}
                    labelLine={width > 500}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    wrapperStyle={{
                        bottom: -5,
                        display: width < 500 ? "block" : "none"
                    }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
};

export default memo(ProductivityPieChart);
