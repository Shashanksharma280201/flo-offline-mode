import { LeadReportData } from "@/data/types";
import { colors } from "@/util/constants";
import { useEffect, useState } from "react";
import {
    Funnel,
    FunnelChart,
    LabelList,
    Legend,
    Line,
    LineChart,
    Rectangle,
    ResponsiveContainer,
    Tooltip,
    Trapezoid,
    XAxis,
    YAxis
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartWrapper } from "./ChartWrapper";
import dayjs from "dayjs";

type StageData = {
    date: string;
    L0: number;
    L1: number;
    L2: number;
    L3: number;
    L4: number;
    L5: number;
};

const COLORS_500 = colors.COLORS_500();

export const ACVTCVLineChart = ({ chartData }: { chartData: LeadReportData }) => {
    const [acvData, setAcvData] = useState<StageData[]>();
    const [tcvData, setTcvData] = useState<StageData[]>();

    useEffect(() => {
        const acvChartData: StageData[] = Object.keys(chartData).reduce((acc, date) => {
            const stagesOfTheDay = chartData[date];
            const L0 = stagesOfTheDay["L0"]?.acv || 0;
            const L1 = stagesOfTheDay["L1"]?.acv || 0;
            const L2 = stagesOfTheDay["L2"]?.acv || 0;
            const L3 = stagesOfTheDay["L3"]?.acv || 0;
            const L4 = stagesOfTheDay["L4"]?.acv || 0;
            const L5 = stagesOfTheDay["L5"]?.acv || 0;
            acc.push({
                date,
                L0,
                L1,
                L2,
                L3,
                L4,
                L5
            });
            return acc;
        }, [] as StageData[]);

        const tcvChartData: StageData[] = Object.keys(chartData).reduce((acc, date) => {
            const stagesOfTheDay = chartData[date];
            const L0 = stagesOfTheDay["L0"]?.tcv || 0;
            const L1 = stagesOfTheDay["L1"]?.tcv || 0;
            const L2 = stagesOfTheDay["L2"]?.tcv || 0;
            const L3 = stagesOfTheDay["L3"]?.tcv || 0;
            const L4 = stagesOfTheDay["L4"]?.tcv || 0;
            const L5 = stagesOfTheDay["L5"]?.tcv || 0;
            acc.push({
                date,
                L0,
                L1,
                L2,
                L3,
                L4,
                L5
            });
            return acc;
        }, [] as StageData[]);

        setAcvData(acvChartData.toReversed());
        setTcvData(tcvChartData.toReversed());
    }, [chartData]);

    const ACVTooltip = ({
        active,
        payload
    }: {
        active?: any;
        payload?: any;
    }) => {
        if (active && payload && payload.length) {
            return (
                <div className="flex flex-col gap-2 rounded-md bg-white p-3 text-black">
                    <span>{payload[0].payload.date}</span>
                    <div className="flex flex-col gap-1">
                        {payload.map((item: any) => {
                            return (
                                <span
                                    key={item.dataKey}
                                    style={{ color: item.color }}
                                >{`${item.dataKey}:  ${new Intl.NumberFormat(
                                    "en-IN",
                                    {
                                        style: "currency",
                                        currency: "INR",
                                        maximumFractionDigits: 0
                                    }
                                ).format(+item.value)}`}</span>
                            );
                        })}
                    </div>
                </div>
            );
        }
        return null;
    };

    const TCVTooltip = ({
        active,
        payload
    }: {
        active?: any;
        payload?: any;
    }) => {
        if (active && payload && payload.length) {
            return (
                <div className="flex flex-col gap-2 rounded-md bg-white p-3 text-black">
                    <span>{payload[0].payload.date}</span>
                    <div className="flex flex-col gap-1">
                        {payload.map((item: any) => {
                            return (
                                <span
                                    key={item.dataKey}
                                    style={{ color: item.color }}
                                >{`${item.dataKey}:  ${new Intl.NumberFormat(
                                    "en-IN",
                                    {
                                        style: "currency",
                                        currency: "INR",
                                        maximumFractionDigits: 0
                                    }
                                ).format(+item.value)}`}</span>
                            );
                        })}
                    </div>
                </div>
            );
        }
        return null;
    };

    const [selectedStages, setSelectedStages] = useState<string[]>([]);

    const CustomLegend = () => {
        return (
            <ul className="flex flex-wrap justify-center gap-x-3">
                {["L2", "L3", "L4", "L5"].map((stage, index) => {
                    const color =
                        COLORS_500[(2 * index + 3) % COLORS_500.length];
                    return (
                        <li
                            onClick={() => {
                                setSelectedStages((prev) => {
                                    if (prev.includes(stage)) {
                                        return prev.filter(
                                            (item) => item !== stage
                                        );
                                    }
                                    return [...prev, stage];
                                });
                            }}
                            style={{
                                borderColor: selectedStages.includes(stage)
                                    ? color
                                    : "#000000",
                                borderWidth: 1
                            }}
                            key={stage}
                            className="flex cursor-pointer items-center justify-center gap-1 rounded-md  border px-2"
                        >
                            <span
                                style={{
                                    backgroundColor: color
                                }}
                                className={`h-3 w-3`}
                            />
                            <span
                                style={{
                                    color
                                }}
                            >
                                {stage}
                            </span>
                        </li>
                    );
                })}
            </ul>
        );
    };

    const CustomXTick = (props: any) => {
        const { x, y, payload } = props;

        return (
            <g transform={`translate(${x},${y})`}>
                <text x={0} y={0} dy={16} textAnchor="end" fill="#666">
                    {dayjs(payload.value).format("Do MMM")}
                </text>
            </g>
        );
    };

    return (
        <div className="flex h-full w-full flex-col items-center justify-center p-4">
            <Tabs defaultValue="ACV" className="w-full items-center justify-center flex flex-col">
                <TabsList className="flex flex-row w-1/2 bg-transparent ">
                    <TabsTrigger value="ACV" className="flex w-1/2 bg-transparent text-white rounded-xl p-2 hover:bg-gray-800">ACV</TabsTrigger>
                    <TabsTrigger value="TCV" className="flex w-1/2 bg-transparent text-white rounded-xl p-2 hover:bg-gray-800">TCV</TabsTrigger>
                </TabsList>
                <TabsContent value="ACV" className="flex flex-col w-full h-full bg-gray-800/75 rounded-lg">
                    <ChartWrapper
                        isEmpty={acvData ? acvData.length === 0 : false}
                        description="ACV at each stage"
                        title="ACV chart"
                    >
                        <ResponsiveContainer width="95%" height={450}>
                            <LineChart
                                data={acvData}
                                margin={{ top: 20, right: 40, left: 60, bottom: 20 }}
                            >
                                <XAxis tick={<CustomXTick />} dataKey="date" />
                                <YAxis
                                    width={80}
                                    tick={{ fill: '#9CA3AF' }}
                                    tickFormatter={(value) =>
                                        new Intl.NumberFormat("en-IN", {
                                            notation: "compact",
                                            compactDisplay: "short",
                                            maximumFractionDigits: 1
                                        }).format(value)
                                    }
                                />
                                <Tooltip content={<ACVTooltip />} />
                                <Legend content={CustomLegend} />
                                <Line
                                    type="linear"
                                    dataKey="L2"
                                    strokeWidth={4}
                                    stroke={COLORS_500[3]}
                                    hide={
                                        selectedStages.length !== 0 &&
                                        !selectedStages.includes("L2")
                                    }
                                />
                                <Line
                                    type="linear"
                                    dataKey="L3"
                                    strokeWidth={4}
                                    stroke={COLORS_500[5]}
                                    hide={
                                        selectedStages.length !== 0 &&
                                        !selectedStages.includes("L3")
                                    }
                                />
                                <Line
                                    type="linear"
                                    dataKey="L4"
                                    strokeWidth={4}
                                    stroke={COLORS_500[7]}
                                    hide={
                                        selectedStages.length !== 0 &&
                                        !selectedStages.includes("L4")
                                    }
                                />
                                <Line
                                    type="linear"
                                    dataKey="L5"
                                    strokeWidth={4}
                                    stroke={COLORS_500[9]}
                                    hide={
                                        selectedStages.length !== 0 &&
                                        !selectedStages.includes("L5")
                                    }
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartWrapper>
                </TabsContent>
                <TabsContent value="TCV" className="flex flex-col h-full w-full">
                    <ChartWrapper
                        isEmpty={tcvData ? tcvData.length === 0 : false}
                        description="TCV at each stage"
                        title="TCV chart"
                    >
                        <ResponsiveContainer width="95%" height={450}>
                            <LineChart
                                data={tcvData}
                                margin={{ top: 20, right: 40, left: 60, bottom: 20 }}
                            >
                                <XAxis tick={<CustomXTick />} dataKey="date" />
                                <YAxis
                                    width={80}
                                    tick={{ fill: '#9CA3AF' }}
                                    tickFormatter={(value) =>
                                        new Intl.NumberFormat("en-IN", {
                                            notation: "compact",
                                            compactDisplay: "short",
                                            maximumFractionDigits: 1
                                        }).format(value)
                                    }
                                />
                                <Tooltip content={<TCVTooltip />} />
                                <Legend content={CustomLegend} />
                                <Line
                                    type="linear"
                                    dataKey="L2"
                                    strokeWidth={4}
                                    stroke={COLORS_500[3]}
                                    hide={
                                        selectedStages.length !== 0 &&
                                        !selectedStages.includes("L2")
                                    }
                                />
                                <Line
                                    type="linear"
                                    dataKey="L3"
                                    strokeWidth={4}
                                    stroke={COLORS_500[5]}
                                    hide={
                                        selectedStages.length !== 0 &&
                                        !selectedStages.includes("L3")
                                    }
                                />
                                <Line
                                    type="linear"
                                    dataKey="L4"
                                    strokeWidth={4}
                                    stroke={COLORS_500[7]}
                                    hide={
                                        selectedStages.length !== 0 &&
                                        !selectedStages.includes("L4")
                                    }
                                />
                                <Line
                                    type="linear"
                                    dataKey="L5"
                                    strokeWidth={4}
                                    stroke={COLORS_500[9]}
                                    hide={
                                        selectedStages.length !== 0 &&
                                        !selectedStages.includes("L5")
                                    }
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartWrapper>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export const ACVFunnelChart = ({
    chartData
}: {
    chartData: LeadReportData;
}) => {
    const [data, setData] = useState<
        { stage: string; value: number; fill: string }[]
    >([]);

    const [tcvData, setTcvData] = useState<
        { stage: string; value: number; fill: string }[]
    >([]);

    useEffect(() => {
        const lastDate = Object.keys(chartData).sort().pop();
        if (lastDate) {
            const acvPerStage = chartData[lastDate];
            if (acvPerStage) {
                const acvdata = Object.keys(acvPerStage)
                    .sort()
                    .map((stage, idx) => {
                        return {
                            stage,
                            value: acvPerStage[stage].acv,
                            fill: COLORS_500[(2 * idx + 1) % COLORS_500.length]
                        };
                    });

                const tcvdata = Object.keys(acvPerStage)
                    .sort()
                    .map((stage, idx) => {
                        return {
                            stage,
                            value: acvPerStage[stage].tcv,
                            fill: COLORS_500[(2 * idx + 1) % COLORS_500.length]
                        };
                    });

                setData(acvdata);
                setTcvData(tcvdata);
                return;
            }
            setData([]);
            setTcvData([]);
        } else {
            setData([]);
            setTcvData([]);
        }
    }, [chartData]);

    const ACVTooltip = ({
        active,
        payload
    }: {
        active?: any;
        payload?: any;
    }) => {
        if (active && payload && payload.length) {
            return (
                <div className="flex flex-col gap-2 rounded-md bg-white p-3 text-black">
                    <span>ACV per stage: </span>
                    <div className="flex flex-col gap-1">
                        <span
                            style={{ color: payload[0].payload.fill }}
                        >{`${payload[0].payload.stage}: ${new Intl.NumberFormat(
                            "en-IN",
                            {
                                style: "currency",
                                currency: "INR",
                                maximumFractionDigits: 0
                            }
                        ).format(+payload[0].value)}`}</span>
                    </div>
                </div>
            );
        }
        return null;
    };
    const TcvTooltip = ({
        active,
        payload
    }: {
        active?: any;
        payload?: any;
    }) => {
        if (active && payload && payload.length) {
            return (
                <div className="flex flex-col gap-2 rounded-md bg-white p-3 text-black">
                    <span>TCV per stage: </span>
                    <div className="flex flex-col gap-1">
                        <span
                            style={{ color: payload[0].payload.fill }}
                        >{`${payload[0].payload.stage}: ${new Intl.NumberFormat(
                            "en-IN",
                            {
                                style: "currency",
                                currency: "INR",
                                maximumFractionDigits: 0
                            }
                        ).format(+payload[0].value)}`}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    const ACVCustomLabel = (props: any) => {
        const stageData = data.find((item) => item.stage === props.value);
        const { y, height, parentViewBox } = props;

        return (
            <text
                x={parentViewBox.width / 2}
                y={y + height / 2}
                fill="#FFFFFF"
                textAnchor="middle"
            >
                {stageData?.stage}:{" "}
                {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0
                }).format(stageData?.value || 0)}
            </text>
        );
    };

    const TCVCustomLabel = (props: any) => {
        const stageData = tcvData.find((item) => item.stage === props.value);
        const { y, height, parentViewBox } = props;

        return (
            <text
                x={parentViewBox.width / 2}
                y={y + height / 2}
                fill="#FFFFFF"
                textAnchor="middle"
            >
                {stageData?.stage}:{" "}
                {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0
                }).format(stageData?.value || 0)}
            </text>
        );
    };

    const CustomShape = (props: any) => {
        const { parentViewBox, stage, width } = props;
        if (stage === "L5" || stage === "L1") {
            return (
                <Rectangle {...props} x={(parentViewBox.width - width) / 2} />
            );
        }
        return <Trapezoid {...props} />;
    };

    return (
        <>
            <div className="flex h-full w-full flex-col items-center justify-center p-4">
                <Tabs defaultValue="ACV" className="w-full items-center justify-center flex flex-col">
                    <TabsList className="flex flex-row w-1/2 bg-transparent ">
                        <TabsTrigger value="ACV" className="flex w-1/2 bg-transparent text-white rounded-xl p-2 hover:bg-gray-800">ACV</TabsTrigger>
                        <TabsTrigger value="TCV" className="flex w-1/2 bg-transparent text-white rounded-xl p-2 hover:bg-gray-800">TCV</TabsTrigger>
                    </TabsList>
                    <TabsContent value="ACV" className="flex flex-col w-full h-full bg-gray-800/75 rounded-lg">
                        <ChartWrapper
                            isEmpty={data ? data.length === 0 : false}
                            description=""
                            title="Funnel chart"
                        >
                            <ResponsiveContainer width="80%" height={400}>
                                <FunnelChart>
                                    <Tooltip content={<ACVTooltip />} />
                                    <Funnel
                                        shape={<CustomShape />}
                                        dataKey="value"
                                        data={data}
                                        isAnimationActive
                                    >
                                        <LabelList
                                            content={ACVCustomLabel}
                                            fill="#FFFFFF"
                                            stroke="none"
                                            dataKey="stage"
                                        />
                                    </Funnel>
                                </FunnelChart>
                            </ResponsiveContainer>
                        </ChartWrapper>
                    </TabsContent>
                    <TabsContent value="TCV" className="flex flex-col h-full w-full">
                        <ChartWrapper
                            isEmpty={tcvData ? tcvData.length === 0 : false}
                            description=""
                            title="Funnel chart"
                        >
                            <ResponsiveContainer width="80%" height={400}>
                                <FunnelChart>
                                    <Tooltip content={<TcvTooltip />} />
                                    <Funnel
                                        shape={<CustomShape />}
                                        dataKey="value"
                                        data={tcvData}
                                        isAnimationActive
                                    >
                                        <LabelList
                                            content={TCVCustomLabel}
                                            fill="#FFFFFF"
                                            stroke="none"
                                            dataKey="stage"
                                        />
                                    </Funnel>
                                </FunnelChart>
                            </ResponsiveContainer>
                        </ChartWrapper>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
};
