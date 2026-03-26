import React from "react";
import { View, Text, Svg, Circle, Rect, Path, Line, StyleSheet } from "@react-pdf/renderer";
import {
    PieChartData,
    BarChartData,
    LineChartData,
    StackedBarChartData
} from "../utils/chartDataExtractor";
import dayjs from "dayjs";

const chartStyles = StyleSheet.create({
    chartContainer: {
        width: "100%",
        height: 300,
        marginTop: 10,
        marginBottom: 10
    },
    legend: {
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginTop: 10
    },
    legendItem: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        fontSize: 9
    },
    legendBox: {
        width: 12,
        height: 12,
        borderRadius: 2
    },
    legendText: {
        fontSize: 9,
        color: "#333"
    }
});

/**
 * PDF Pie Chart Component
 */
export const PDFPieChart: React.FC<{ data: PieChartData[]; title?: string }> = ({
    data,
    title
}) => {
    const centerX = 150;
    const centerY = 120;
    const radius = 80;

    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
        return (
            <View style={chartStyles.chartContainer}>
                <Text style={{ fontSize: 10, color: "#999", textAlign: "center" }}>
                    No data available
                </Text>
            </View>
        );
    }

    let currentAngle = -90; // Start from top

    const slices = data.map((item, index) => {
        const percentage = (item.value / total) * 100;
        const angle = (percentage / 100) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;

        // Convert to radians
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;

        // Calculate arc path
        const x1 = centerX + radius * Math.cos(startRad);
        const y1 = centerY + radius * Math.sin(startRad);
        const x2 = centerX + radius * Math.cos(endRad);
        const y2 = centerY + radius * Math.sin(endRad);

        const largeArc = angle > 180 ? 1 : 0;

        const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
            "Z"
        ].join(" ");

        // Calculate label position (callout line)
        const midAngle = (startAngle + endAngle) / 2;
        const midRad = (midAngle * Math.PI) / 180;

        // Point on the edge of the pie
        const edgeX = centerX + radius * Math.cos(midRad);
        const edgeY = centerY + radius * Math.sin(midRad);

        // Point for the label (extended beyond pie)
        const labelRadius = radius + 30;
        const labelX = centerX + labelRadius * Math.cos(midRad);
        const labelY = centerY + labelRadius * Math.sin(midRad);

        currentAngle = endAngle;

        return {
            path: pathData,
            fill: item.fill,
            name: item.name,
            percentage: percentage.toFixed(1),
            edgeX,
            edgeY,
            labelX,
            labelY,
            // Only show callout if percentage is above 3% (to avoid clutter)
            showCallout: percentage > 3
        };
    });

    // Split legend into columns if too many items
    const itemsPerColumn = 6;
    const columns = [];
    for (let i = 0; i < data.length; i += itemsPerColumn) {
        columns.push(data.slice(i, i + itemsPerColumn));
    }

    return (
        <View>
            <View style={chartStyles.chartContainer}>
                <Svg width="400" height="250">
                    {/* Pie slices */}
                    {slices.map((slice, index) => (
                        <Path key={`slice-${index}`} d={slice.path} fill={slice.fill} />
                    ))}
                    {/* Callout lines and labels */}
                    {slices.map((slice, index) => {
                        if (!slice.showCallout) return null;
                        return (
                            <React.Fragment key={`callout-${index}`}>
                                {/* Line from edge to label */}
                                <Line
                                    x1={slice.edgeX}
                                    y1={slice.edgeY}
                                    x2={slice.labelX}
                                    y2={slice.labelY}
                                    stroke="#666"
                                    strokeWidth={0.5}
                                />
                                {/* Percentage label */}
                                <Text
                                    x={slice.labelX}
                                    y={slice.labelY}
                                    style={{
                                        fontSize: 8,
                                        fill: "#333",
                                        fontWeight: "bold",
                                        textAnchor: slice.labelX > centerX ? "start" : "end"
                                    }}
                                >
                                    {slice.percentage}%
                                </Text>
                            </React.Fragment>
                        );
                    })}
                </Svg>
            </View>
            <View
                style={{
                    display: "flex",
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 15,
                    marginTop: 10
                }}
            >
                {columns.map((column, colIndex) => (
                    <View key={colIndex} style={{ flex: 1, minWidth: "30%" }}>
                        {column.map((item, index) => {
                            const originalIndex = colIndex * itemsPerColumn + index;
                            return (
                                <View
                                    key={originalIndex}
                                    style={{
                                        display: "flex",
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 5,
                                        marginBottom: 5
                                    }}
                                >
                                    <View
                                        style={{
                                            width: 10,
                                            height: 10,
                                            backgroundColor: item.fill,
                                            borderRadius: 2
                                        }}
                                    />
                                    <Text style={{ fontSize: 8, color: "#333" }}>
                                        {item.name} ({slices[originalIndex].percentage}%)
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                ))}
            </View>
        </View>
    );
};

/**
 * PDF Bar Chart Component - Horizontal Orientation
 */
export const PDFBarChart: React.FC<{
    data: BarChartData[];
    title?: string;
    formatValue?: (value: number) => string;
}> = ({ data, title, formatValue = (v) => v.toFixed(0) }) => {
    if (data.length === 0) {
        return (
            <View style={chartStyles.chartContainer}>
                <Text style={{ fontSize: 10, color: "#999", textAlign: "center" }}>
                    No data available
                </Text>
            </View>
        );
    }

    const chartWidth = 450;
    const maxChartHeight = 600; // Max height to fit on page
    const padding = { top: 20, right: 40, bottom: 20, left: 150 }; // More left padding for labels

    // Calculate dynamic bar height to fit all bars within max height
    const baseBarHeight = 20;
    const baseBarSpacing = 8;
    const availableHeight = maxChartHeight - padding.top - padding.bottom;
    const neededHeight = data.length * (baseBarHeight + baseBarSpacing);

    let barHeight = baseBarHeight;
    let barSpacing = baseBarSpacing;

    if (neededHeight > availableHeight) {
        // Reduce bar size to fit all items
        const totalSpace = availableHeight / data.length;
        barHeight = Math.max(12, Math.floor(totalSpace * 0.7)); // 70% for bar, 30% for spacing
        barSpacing = Math.max(4, Math.floor(totalSpace * 0.3));
    }

    const totalBarsHeight = data.length * (barHeight + barSpacing);
    const chartHeight = Math.max(200, totalBarsHeight + padding.top + padding.bottom);
    const maxValue = Math.max(...data.map((d) => d.value));

    return (
        <View>
            <Svg width={chartWidth} height={chartHeight}>
                {/* Y-axis (vertical - now for labels) */}
                <Line
                    x1={padding.left}
                    y1={padding.top}
                    x2={padding.left}
                    y2={chartHeight - padding.bottom}
                    stroke="#ccc"
                    strokeWidth={1}
                />
                {/* X-axis (horizontal - now for values) */}
                <Line
                    x1={padding.left}
                    y1={chartHeight - padding.bottom}
                    x2={chartWidth - padding.right}
                    y2={chartHeight - padding.bottom}
                    stroke="#ccc"
                    strokeWidth={1}
                />

                {/* Vertical grid lines and X-axis value labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((factor, index) => {
                    const value = maxValue * factor;
                    const x = padding.left + (chartWidth - padding.left - padding.right) * factor;
                    const labelText = formatValue(value);
                    return (
                        <React.Fragment key={index}>
                            <Line
                                x1={x}
                                y1={padding.top}
                                x2={x}
                                y2={chartHeight - padding.bottom}
                                stroke="#f0f0f0"
                                strokeWidth={1}
                            />
                            <Text
                                x={x}
                                y={chartHeight - padding.bottom + 12}
                                style={{ fontSize: 7, fill: "#666", textAnchor: "middle" }}
                            >
                                {labelText}
                            </Text>
                        </React.Fragment>
                    );
                })}

                {/* Horizontal Bars */}
                {data.map((item, index) => {
                    const barWidth = ((chartWidth - padding.left - padding.right) * item.value) / maxValue;
                    const x = padding.left;
                    const y = padding.top + index * (barHeight + barSpacing);

                    return (
                        <React.Fragment key={index}>
                            {/* Bar */}
                            <Rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                fill={item.fill || "#0070a3"}
                            />
                            {/* Y-axis label (material name) */}
                            <Text
                                x={padding.left - 10}
                                y={y + barHeight / 2 + 3}
                                style={{
                                    fontSize: 7,
                                    textAnchor: "end",
                                    fill: "#333"
                                }}
                            >
                                {(item.name || 'Unknown').length > 20 ? (item.name || 'Unknown').substring(0, 20) + '...' : (item.name || 'Unknown')}
                            </Text>
                            {/* Value label at end of bar */}
                            <Text
                                x={x + barWidth + 5}
                                y={y + barHeight / 2 + 3}
                                style={{
                                    fontSize: 7,
                                    fill: "#333"
                                }}
                            >
                                {formatValue(item.value)}
                            </Text>
                        </React.Fragment>
                    );
                })}
            </Svg>
        </View>
    );
};

/**
 * PDF Line Chart Component
 */
export const PDFLineChart: React.FC<{
    data: LineChartData[];
    title?: string;
    formatValue?: (value: number) => string;
}> = ({ data, title, formatValue = (v) => v.toFixed(0) }) => {
    if (data.length === 0) {
        return (
            <View style={chartStyles.chartContainer}>
                <Text style={{ fontSize: 10, color: "#999", textAlign: "center" }}>
                    No data available
                </Text>
            </View>
        );
    }

    const chartWidth = 450;
    const chartHeight = 200;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const maxValue = Math.max(...data.map((d) => d.value));
    const pointWidth = (chartWidth - padding.left - padding.right) / (data.length - 1 || 1);

    // Generate path for line
    const pathData = data
        .map((point, index) => {
            const x = padding.left + index * pointWidth;
            const y =
                chartHeight -
                padding.bottom -
                ((chartHeight - padding.top - padding.bottom) * point.value) / maxValue;
            return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
        })
        .join(" ");

    return (
        <View style={chartStyles.chartContainer}>
            <Svg width={chartWidth} height={chartHeight + 60}>
                {/* Y-axis */}
                <Line
                    x1={padding.left}
                    y1={padding.top}
                    x2={padding.left}
                    y2={chartHeight - padding.bottom}
                    stroke="#ccc"
                    strokeWidth={1}
                />
                {/* X-axis */}
                <Line
                    x1={padding.left}
                    y1={chartHeight - padding.bottom}
                    x2={chartWidth - padding.right}
                    y2={chartHeight - padding.bottom}
                    stroke="#ccc"
                    strokeWidth={1}
                />

                {/* Grid lines and Y-axis labels (render before bars so bars are on top) */}
                {[0, 0.25, 0.5, 0.75, 1].map((factor, index) => {
                    const value = maxValue * factor;
                    const y =
                        chartHeight -
                        padding.bottom -
                        (chartHeight - padding.top - padding.bottom) * factor;
                    const labelText = formatValue(value);
                    return (
                        <React.Fragment key={index}>
                            <Line
                                x1={padding.left}
                                y1={y}
                                x2={chartWidth - padding.right}
                                y2={y}
                                stroke="#f0f0f0"
                                strokeWidth={1}
                            />
                            <Text
                                x={5}
                                y={y + 3}
                                style={{ fontSize: 7, fill: "#666" }}
                            >
                                {labelText}
                            </Text>
                        </React.Fragment>
                    );
                })}

                {/* Line */}
                <Path d={pathData} stroke="#0070a3" strokeWidth={2} fill="none" />

                {/* Points */}
                {data.map((point, index) => {
                    const x = padding.left + index * pointWidth;
                    const y =
                        chartHeight -
                        padding.bottom -
                        ((chartHeight - padding.top - padding.bottom) * point.value) / maxValue;

                    // Show labels at start, middle, and end points
                    const showLabel = index === 0 ||
                                     index === Math.floor(data.length / 2) ||
                                     index === data.length - 1 ||
                                     (data.length <= 15 && index % Math.ceil(data.length / 8) === 0);

                    return (
                        <React.Fragment key={index}>
                            <Circle cx={x} cy={y} r={3} fill="#0070a3" />
                            {/* X-axis label */}
                            {showLabel && (
                                <Text
                                    x={x}
                                    y={chartHeight - padding.bottom + 15}
                                    style={{ fontSize: 7, textAlign: "center" }}
                                >
                                    {point.date}
                                </Text>
                            )}
                        </React.Fragment>
                    );
                })}
            </Svg>
        </View>
    );
};

/**
 * PDF Stacked Bar Chart Component - Horizontal Orientation
 */
export const PDFStackedBarChart: React.FC<{
    data: StackedBarChartData[];
    title?: string;
    colors?: { [key: string]: string };
    formatValue?: (value: number) => string;
}> = ({ data, title, colors, formatValue = (v) => v.toFixed(0) }) => {
    if (data.length === 0) {
        return (
            <View style={chartStyles.chartContainer}>
                <Text style={{ fontSize: 10, color: "#999", textAlign: "center" }}>
                    No data available
                </Text>
            </View>
        );
    }

    // Extract all keys except "name" to get the stack segments
    const keys = Object.keys(data[0]).filter((k) => k !== "name");

    // Default colors if not provided
    const defaultColors: { [key: string]: string } = {
        loadingTime: "#003f5c",
        tripTime: "#58508d",
        unloadingTime: "#bc5090",
        returnTripTime: "#ff6361",
        idleTime: "#ffa600",
        idle: "#003f5c",
        returnTrip: "#58508d",
        unloading: "#bc5090",
        trip: "#ff6361",
        loading: "#ffa600"
    };

    const chartColors = colors || defaultColors;

    // Calculate max value for scaling
    const maxValue = Math.max(
        ...data.map((item) =>
            keys.reduce((sum, key) => sum + (Number(item[key]) || 0), 0)
        )
    );

    const chartWidth = 450;
    const maxChartHeight = 600; // Max height to fit on page
    const padding = { top: 20, right: 40, bottom: 30, left: 120 }; // More left padding for labels

    // Calculate dynamic bar height to fit all bars within max height
    const baseBarHeight = 25;
    const baseBarSpacing = 10;
    const availableHeight = maxChartHeight - padding.top - padding.bottom;
    const neededHeight = data.length * (baseBarHeight + baseBarSpacing);

    let barHeight = baseBarHeight;
    let barSpacing = baseBarSpacing;

    if (neededHeight > availableHeight) {
        // Reduce bar size to fit all items
        const totalSpace = availableHeight / data.length;
        barHeight = Math.max(15, Math.floor(totalSpace * 0.7)); // 70% for bar, 30% for spacing
        barSpacing = Math.max(5, Math.floor(totalSpace * 0.3));
    }

    const totalBarsHeight = data.length * (barHeight + barSpacing);
    const chartHeight = Math.max(200, totalBarsHeight + padding.top + padding.bottom);

    return (
        <View>
            <Svg width={chartWidth} height={chartHeight}>
                {/* Y-axis (vertical - for labels) */}
                <Line
                    x1={padding.left}
                    y1={padding.top}
                    x2={padding.left}
                    y2={chartHeight - padding.bottom}
                    stroke="#ccc"
                    strokeWidth={1}
                />
                {/* X-axis (horizontal - for values) */}
                <Line
                    x1={padding.left}
                    y1={chartHeight - padding.bottom}
                    x2={chartWidth - padding.right}
                    y2={chartHeight - padding.bottom}
                    stroke="#ccc"
                    strokeWidth={1}
                />

                {/* Vertical grid lines and X-axis value labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((factor, index) => {
                    const value = maxValue * factor;
                    const x = padding.left + (chartWidth - padding.left - padding.right) * factor;
                    const labelText = formatValue(value);
                    return (
                        <React.Fragment key={index}>
                            <Line
                                x1={x}
                                y1={padding.top}
                                x2={x}
                                y2={chartHeight - padding.bottom}
                                stroke="#f0f0f0"
                                strokeWidth={1}
                            />
                            <Text
                                x={x}
                                y={chartHeight - padding.bottom + 12}
                                style={{ fontSize: 7, fill: "#666", textAnchor: "middle" }}
                            >
                                {labelText}
                            </Text>
                        </React.Fragment>
                    );
                })}

                {/* Horizontal Stacked Bars */}
                {data.map((item, barIndex) => {
                    const y = padding.top + barIndex * (barHeight + barSpacing);
                    let xOffset = padding.left;

                    return (
                        <React.Fragment key={barIndex}>
                            {/* Y-axis label (row name) */}
                            <Text
                                x={padding.left - 10}
                                y={y + barHeight / 2 + 3}
                                style={{
                                    fontSize: 7,
                                    textAnchor: "end",
                                    fill: "#333"
                                }}
                            >
                                {String(item.name || 'Unknown').length > 18
                                    ? String(item.name || 'Unknown').substring(0, 18) + '...'
                                    : String(item.name || 'Unknown')}
                            </Text>

                            {/* Stacked segments */}
                            {keys.map((key, segmentIndex) => {
                                const value = Number(item[key]) || 0;
                                if (value === 0) return null;

                                const segmentWidth =
                                    ((chartWidth - padding.left - padding.right) * value) / maxValue;

                                const segment = (
                                    <Rect
                                        key={`${barIndex}-${segmentIndex}`}
                                        x={xOffset}
                                        y={y}
                                        width={segmentWidth}
                                        height={barHeight}
                                        fill={chartColors[key] || `hsl(${segmentIndex * 60}, 70%, 50%)`}
                                    />
                                );

                                xOffset += segmentWidth;
                                return segment;
                            })}

                            {/* Total value label at end of stacked bar */}
                            <Text
                                x={xOffset + 5}
                                y={y + barHeight / 2 + 3}
                                style={{
                                    fontSize: 7,
                                    fill: "#333"
                                }}
                            >
                                {formatValue(
                                    keys.reduce((sum, key) => sum + (Number(item[key]) || 0), 0)
                                )}
                            </Text>
                        </React.Fragment>
                    );
                })}
            </Svg>

            {/* Legend for stacked segments */}
            <View
                style={{
                    display: "flex",
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 10,
                    marginTop: 15
                }}
            >
                {keys.map((key, index) => (
                    <View
                        key={index}
                        style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 5
                        }}
                    >
                        <View
                            style={{
                                width: 10,
                                height: 10,
                                backgroundColor: chartColors[key] || `hsl(${index * 60}, 70%, 50%)`,
                                borderRadius: 2
                            }}
                        />
                        <Text style={{ fontSize: 8, color: "#333" }}>
                            {key && key.length > 0 ? key.charAt(0).toUpperCase() + key.slice(1) : 'Unknown'}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
};
