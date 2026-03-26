import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { PDFData } from "../pdfService";
import dayjs from "dayjs";
import { PDFPieChart, PDFBarChart, PDFLineChart, PDFStackedBarChart } from "./PDFCharts";
import {
    extractOperationalTimePieData,
    extractMaterialTripsPieData,
    extractMaterialQuantityBarData,
    extractTripsOverTimeData,
    extractDowntimeOverTimeData,
    extractProductivityPieData,
    extractOperationalTimePerMaterialData,
    extractOperationalTimeVsMaterialData,
    extractMaterialDistributionOverTimeData
} from "../utils/chartDataExtractor";

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontSize: 11,
        fontFamily: "Helvetica",
        backgroundColor: "#ffffff"
    },
    coverPage: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        backgroundColor: "#f8f9fa"
    },
    coverTitle: {
        fontSize: 48,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: "center",
        color: "#047857"
    },
    coverSubtitle: {
        fontSize: 24,
        marginBottom: 15,
        textAlign: "center",
        color: "#334155"
    },
    coverInfo: {
        fontSize: 14,
        marginBottom: 8,
        textAlign: "center",
        color: "#64748b"
    },
    coverDate: {
        fontSize: 11,
        marginTop: 40,
        textAlign: "center",
        color: "#94a3b8"
    },
    section: {
        marginBottom: 25
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 15,
        color: "#047857",
        borderBottom: "3pt solid #10b981",
        paddingBottom: 8
    },
    summaryGrid: {
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 15,
        marginBottom: 20
    },
    summaryCard: {
        width: "48%",
        padding: 20,
        backgroundColor: "#f1f5f9",
        borderRadius: 8,
        borderLeft: "4pt solid #10b981"
    },
    summaryLabel: {
        fontSize: 11,
        color: "#64748b",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5
    },
    summaryValue: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#1e293b"
    },
    summaryUnit: {
        fontSize: 10,
        color: "#94a3b8",
        marginTop: 4
    },
    chartSection: {
        marginBottom: 30,
        padding: 20,
        backgroundColor: "#f8fafc",
        borderRadius: 8
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 8,
        color: "#047857"
    },
    chartDescription: {
        fontSize: 10,
        color: "#64748b",
        marginBottom: 15
    },
    table: {
        display: "flex",
        flexDirection: "column",
        marginTop: 15,
        borderRadius: 8,
        overflow: "hidden"
    },
    tableHeader: {
        display: "flex",
        flexDirection: "row",
        backgroundColor: "#047857",
        color: "#ffffff",
        padding: 10,
        fontWeight: "bold",
        fontSize: 10
    },
    tableRow: {
        display: "flex",
        flexDirection: "row",
        borderBottom: "1pt solid #e2e8f0",
        padding: 8,
        fontSize: 9,
        backgroundColor: "#ffffff"
    },
    tableRowAlt: {
        backgroundColor: "#f8fafc"
    },
    tableCell: {
        flex: 1,
        textAlign: "left",
        paddingRight: 5
    },
    footer: {
        position: "absolute",
        bottom: 20,
        left: 30,
        right: 30,
        textAlign: "center",
        fontSize: 9,
        color: "#94a3b8",
        borderTop: "1pt solid #e2e8f0",
        paddingTop: 10
    },
    watermark: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%) rotate(-45deg)",
        fontSize: 80,
        color: "#f1f5f9",
        opacity: 0.1,
        fontWeight: "bold"
    }
});

interface PDFDocumentProps {
    data: PDFData;
}

export const AnalyticsPDFDocument: React.FC<PDFDocumentProps> = ({ data }) => {
    const { client, dateRange, summary, chartData, costAnalysis } = data;

    const formatDuration = (ms: number): string => {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const formatTimestamp = (ts: number): string => {
        return dayjs(ts).format("DD MMM YYYY HH:mm");
    };

    // Detect if this is a multi-client report
    const isMultiClient = client.name.includes(",") || client.name.toLowerCase().includes("multi");
    const clientCount = client.count || 0; // Use actual count from service

    // Format client name for display
    const getDisplayClientName = (): string => {
        if (isMultiClient && clientCount > 3) {
            // For multi-client reports with more than 3 clients, show count instead
            return `Multi-Client Report (${clientCount} Clients)`;
        }
        return client.name;
    };

    const formatDistance = (meters: number): string => {
        const km = (meters / 1000).toFixed(2);
        return `${km} km`;
    };

    const formatEnergy = (wh: number): string => {
        const kwh = (wh / 1000).toFixed(2);
        return `${kwh} kWh`;
    };

    const formatCurrency = (amount: number): string => {
        return `Rs ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    };

    const formatHours = (hours: number): string => {
        return `${hours.toFixed(2)} hrs`;
    };

    const formatPercent = (percent: number): string => {
        return `${percent.toFixed(2)}%`;
    };

    // Extract chart data
    const operationalTimePieData = extractOperationalTimePieData(chartData);
    const materialTripsPieData = extractMaterialTripsPieData(chartData);
    const materialQuantityBarData = extractMaterialQuantityBarData(chartData);
    const tripsOverTimeData = extractTripsOverTimeData(chartData);
    const downtimeOverTimeData = extractDowntimeOverTimeData(chartData);
    // Use client-specific shift hours for operator productivity (defaults to 10 if not available)
    const productivityPieData = extractProductivityPieData(chartData, data.shiftHours ?? 10);
    const operationalTimePerMaterialData = extractOperationalTimePerMaterialData(chartData);
    const operationalTimeVsMaterialData = extractOperationalTimeVsMaterialData(chartData);
    const materialDistributionOverTimeData = extractMaterialDistributionOverTimeData(chartData);

    return (
        <Document>
            {/* Cover Page */}
            <Page size="A4" style={styles.page}>
                <View style={styles.coverPage}>
                    <Text style={styles.coverTitle}>Analytics Report</Text>
                    <Text style={styles.coverSubtitle}>{getDisplayClientName()}</Text>
                    <Text style={styles.coverInfo}>
                        {dayjs(dateRange.start).format("DD MMMM YYYY")} to{" "}
                        {dayjs(dateRange.end).format("DD MMMM YYYY")}
                    </Text>
                    {client.location && client.location.trim() !== "" && (
                        <Text style={styles.coverInfo}>{client.location}</Text>
                    )}
                    <Text style={styles.coverDate}>
                        Generated on {dayjs().format("DD MMMM YYYY [at] HH:mm")}
                    </Text>
                </View>
                <Text style={styles.footer} fixed>
                    Flo Mobility - Analytics Report | Confidential
                </Text>
            </Page>

            {/* Executive Summary Page */}
            <Page size="A4" style={styles.page}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Executive Summary</Text>
                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>Total Trips</Text>
                            <Text style={styles.summaryValue}>{summary.totalTrips}</Text>
                            <Text style={styles.summaryUnit}>completed trips</Text>
                        </View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>Operational Time</Text>
                            <Text style={styles.summaryValue}>
                                {formatDuration(summary.totalOperationalTime)}
                            </Text>
                            <Text style={styles.summaryUnit}>working hours</Text>
                        </View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>Total Downtime</Text>
                            <Text style={styles.summaryValue}>
                                {formatDuration(summary.totalDowntime)}
                            </Text>
                            <Text style={styles.summaryUnit}>idle time</Text>
                        </View>
                        {/* <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>Total Distance</Text>
                            <Text style={styles.summaryValue}>
                                {formatDistance(summary.totalDistance)}
                            </Text>
                            <Text style={styles.summaryUnit}>kilometers traveled</Text>
                        </View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>Total Energy</Text>
                            <Text style={styles.summaryValue}>
                                {formatEnergy(summary.totalEnergyConsumed)}
                            </Text>
                            <Text style={styles.summaryUnit}>energy consumed</Text>
                        </View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>Efficiency Rate</Text>
                            <Text style={styles.summaryValue}>
                                {summary.totalOperationalTime + summary.totalDowntime > 0
                                    ? (
                                          (summary.totalOperationalTime /
                                              (summary.totalOperationalTime +
                                                  summary.totalDowntime)) *
                                          100
                                      ).toFixed(1)
                                    : "0.0"}
                                %
                            </Text>
                            <Text style={styles.summaryUnit}>productivity</Text>
                        </View> */}
                    </View>
                </View>
                <Text style={styles.footer} fixed>
                    Page 2 | Executive Summary
                </Text>
            </Page>

            {/* Cost Analysis Page - Only show if cost analysis data is available */}
            {costAnalysis && (
                <>
                    {/* Cost Analysis Summary Page */}
                    <Page size="A4" style={styles.page}>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Cost Analysis</Text>

                            {/* Input Parameters */}
                            <View style={{ marginBottom: 20, padding: 15, backgroundColor: "#f8fafc", borderRadius: 8 }}>
                                <Text style={{ fontSize: 14, fontWeight: "bold", marginBottom: 10, color: "#047857" }}>
                                    Input Parameters
                                </Text>
                                <View style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                                    <View style={{ width: "48%" }}>
                                        <Text style={{ fontSize: 9, color: "#64748b" }}>Robots Deployed:</Text>
                                        <Text style={{ fontSize: 11, fontWeight: "bold" }}>{costAnalysis.parameters.numberOfRobots}</Text>
                                    </View>
                                    <View style={{ width: "48%" }}>
                                        <Text style={{ fontSize: 9, color: "#64748b" }}>Monthly Robot Cost:</Text>
                                        <Text style={{ fontSize: 11, fontWeight: "bold" }}>
                                            {costAnalysis.parameters.monthlyRobotCost > 0
                                                ? formatCurrency(costAnalysis.parameters.monthlyRobotCost)
                                                : "Per-client costs"}
                                        </Text>
                                    </View>
                                    <View style={{ width: "48%" }}>
                                        <Text style={{ fontSize: 9, color: "#64748b" }}>Daily Labor Wage:</Text>
                                        <Text style={{ fontSize: 11, fontWeight: "bold" }}>{formatCurrency(costAnalysis.parameters.laborDailyWage)}</Text>
                                    </View>
                                    <View style={{ width: "48%" }}>
                                        <Text style={{ fontSize: 9, color: "#64748b" }}>Effective Days:</Text>
                                        <Text style={{ fontSize: 11, fontWeight: "bold" }}>{costAnalysis.parameters.effectiveDays} days</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Cost Comparison */}
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 14, fontWeight: "bold", marginBottom: 10, color: "#047857" }}>
                                    Cost Comparison
                                </Text>
                                <View style={styles.summaryGrid}>
                                    <View style={[styles.summaryCard, { backgroundColor: "#fef2f2", borderLeftColor: "#ef4444" }]}>
                                        <Text style={styles.summaryLabel}>Manual Process Cost</Text>
                                        <Text style={styles.summaryValue}>{formatCurrency(costAnalysis.summary.manualProcessCost)}</Text>
                                        <Text style={styles.summaryUnit}>total labor cost</Text>
                                    </View>
                                    <View style={[styles.summaryCard, { backgroundColor: "#f0fdf4", borderLeftColor: "#10b981" }]}>
                                        <Text style={styles.summaryLabel}>Robot Process Cost</Text>
                                        <Text style={styles.summaryValue}>{formatCurrency(costAnalysis.summary.totalRobotCost)}</Text>
                                        <Text style={[styles.summaryUnit, { fontSize: 8 }]}>
                                            Rental: {formatCurrency(costAnalysis.summary.robotRentalCost)} + Loading: {formatCurrency(costAnalysis.summary.loadingLaborCost)} + Unloading: {formatCurrency(costAnalysis.summary.unloadingLaborCost)}
                                        </Text>
                                    </View>
                                    <View style={[styles.summaryCard, { backgroundColor: "#eff6ff", borderLeftColor: "#3b82f6" }]}>
                                        <Text style={styles.summaryLabel}>Actual Savings</Text>
                                        <Text style={styles.summaryValue}>{formatCurrency(costAnalysis.summary.actualSavings)}</Text>
                                        <Text style={styles.summaryUnit}>{formatPercent(costAnalysis.summary.costReductionPercent)} reduction</Text>
                                    </View>
                                    <View style={[styles.summaryCard, { backgroundColor: "#fefce8", borderLeftColor: "#eab308" }]}>
                                        <Text style={styles.summaryLabel}>Robot Utilization</Text>
                                        <Text style={styles.summaryValue}>{formatPercent(costAnalysis.summary.robotUtilization)}</Text>
                                        <Text style={styles.summaryUnit}>{formatHours(costAnalysis.summary.robotWorkDays * costAnalysis.parameters.dailyProductiveHours)}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Productivity Metrics */}
                            <View style={{ marginBottom: 10 }}>
                                <Text style={{ fontSize: 14, fontWeight: "bold", marginBottom: 10, color: "#047857" }}>
                                    Productivity Metrics
                                </Text>
                                <View style={styles.summaryGrid}>
                                    <View style={styles.summaryCard}>
                                        <Text style={styles.summaryLabel}>Time Reduction</Text>
                                        <Text style={styles.summaryValue}>{formatPercent(costAnalysis.summary.timeReductionPercent)}</Text>
                                        <Text style={styles.summaryUnit}>efficiency gain</Text>
                                    </View>
                                    <View style={[styles.summaryCard, { backgroundColor: "#fdf4ff", borderLeftColor: "#a855f7" }]}>
                                        <Text style={styles.summaryLabel}>Potential Savings @ 80%</Text>
                                        <Text style={styles.summaryValue}>{formatCurrency(costAnalysis.summary.potentialSavingsAt80Percent)}</Text>
                                        <Text style={styles.summaryUnit}>{formatPercent(costAnalysis.summary.potentialReductionPercent)} potential reduction</Text>
                                    </View>
                                    <View style={[styles.summaryCard, { backgroundColor: "#eef2ff", borderLeftColor: "#6366f1" }]}>
                                        <Text style={styles.summaryLabel}>Actuator Tracking</Text>
                                        <Text style={styles.summaryValue}>{formatPercent(costAnalysis.summary.actuatorAdoptionRate)}</Text>
                                        <Text style={styles.summaryUnit}>{costAnalysis.summary.totalActuatorTrips} of {costAnalysis.summary.totalRobotTrips} trips (no cost benefit)</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                        <Text style={styles.footer} fixed>
                            Page 3 | Cost Analysis Summary
                        </Text>
                    </Page>

                    {/* Material-wise Cost Breakdown Table */}
                    <Page size="A4" style={styles.page} orientation="landscape">
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Material-wise Cost Breakdown</Text>
                            <View style={styles.table}>
                                <View style={styles.tableHeader}>
                                    <Text style={[styles.tableCell, { flex: 1.2 }]}>Material</Text>
                                    <Text style={[styles.tableCell, { flex: 0.7 }]}>Robot Trips</Text>
                                    <Text style={[styles.tableCell, { flex: 0.8 }]}>Actuator %</Text>
                                    <Text style={[styles.tableCell, { flex: 0.7 }]}>Load Hrs</Text>
                                    <Text style={[styles.tableCell, { flex: 0.7 }]}>Unload Hrs</Text>
                                    <Text style={[styles.tableCell, { flex: 0.7 }]}>Manual Trips</Text>
                                    <Text style={[styles.tableCell, { flex: 0.7 }]}>Avg Time</Text>
                                    <Text style={[styles.tableCell, { flex: 0.7 }]}>Robot Hrs</Text>
                                    <Text style={[styles.tableCell, { flex: 0.7 }]}>Manual Hrs</Text>
                                    <Text style={[styles.tableCell, { flex: 0.8 }]}>Labor Cost</Text>
                                </View>
                                {costAnalysis.materialBreakdown.slice(0, 25).map((material, index) => (
                                    <View
                                        key={index}
                                        style={[
                                            styles.tableRow,
                                            index % 2 === 1 ? styles.tableRowAlt : {}
                                        ]}
                                    >
                                        <Text style={[styles.tableCell, { flex: 1.2 }]}>
                                            {material.materialType || 'Unknown'}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 0.7 }]}>
                                            {material.robotTrips}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 0.8 }]}>
                                            {material.actuatorUsagePercent.toFixed(1)}%
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 0.7 }]}>
                                            {material.loadingLaborHours.toFixed(1)}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 0.7 }]}>
                                            {material.unloadingLaborHours.toFixed(1)}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 0.7 }]}>
                                            {material.manualTripsEquivalent}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 0.7 }]}>
                                            {material.avgTimePerTrip.toFixed(1)}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 0.7 }]}>
                                            {material.robotHours.toFixed(1)}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 0.7 }]}>
                                            {material.wheelbarrowHours.toFixed(1)}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 0.8 }]}>
                                            {formatCurrency(material.laborCost)}
                                        </Text>
                                    </View>
                                ))}
                                {/* Totals Row */}
                                <View style={[styles.tableRow, { backgroundColor: "#047857", color: "#ffffff", fontWeight: "bold" }]}>
                                    <Text style={[styles.tableCell, { flex: 1.2, color: "#ffffff", fontWeight: "bold" }]}>TOTAL</Text>
                                    <Text style={[styles.tableCell, { flex: 0.7, color: "#ffffff", fontWeight: "bold" }]}>
                                        {costAnalysis.summary.totalRobotTrips}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 0.8, color: "#ffffff", fontWeight: "bold" }]}>
                                        {costAnalysis.summary.actuatorAdoptionRate.toFixed(1)}%
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 0.7, color: "#ffffff", fontWeight: "bold" }]}>
                                        {costAnalysis.materialBreakdown.reduce((sum, m) => sum + m.loadingLaborHours, 0).toFixed(1)}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 0.7, color: "#ffffff", fontWeight: "bold" }]}>
                                        {costAnalysis.materialBreakdown.reduce((sum, m) => sum + m.unloadingLaborHours, 0).toFixed(1)}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 0.7, color: "#ffffff", fontWeight: "bold" }]}>
                                        {costAnalysis.summary.totalManualTripsEquivalent}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 0.7, color: "#ffffff" }]}>-</Text>
                                    <Text style={[styles.tableCell, { flex: 0.7, color: "#ffffff", fontWeight: "bold" }]}>
                                        {costAnalysis.summary.totalRobotHours.toFixed(1)}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 0.7, color: "#ffffff", fontWeight: "bold" }]}>
                                        {costAnalysis.summary.totalWheelbarrowHours.toFixed(1)}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 0.8, color: "#ffffff", fontWeight: "bold" }]}>
                                        {formatCurrency(costAnalysis.summary.manualProcessCost)}
                                    </Text>
                                </View>
                            </View>
                            {costAnalysis.materialBreakdown.length > 25 && (
                                <Text style={{ marginTop: 10, fontSize: 9, color: "#64748b" }}>
                                    Showing top 25 materials of {costAnalysis.materialBreakdown.length} total materials
                                </Text>
                            )}
                        </View>
                        <Text style={styles.footer} fixed>
                            Page 4 | Material-wise Cost Breakdown
                        </Text>
                    </Page>
                </>
            )}

            {/* Chart Page 1: Operational Time Distribution */}
            <Page size="A4" style={styles.page}>
                <View style={styles.chartSection}>
                    <Text style={styles.chartTitle}>Operational Time Distribution</Text>
                    <Text style={styles.chartDescription}>
                        Breakdown of time spent on different operational tasks
                    </Text>
                    <PDFPieChart data={operationalTimePieData} />
                </View>
                <Text style={styles.footer} fixed>
                    Page 3 | Operational Time Distribution
                </Text>
            </Page>

            {/* Chart Page 2: Trip Distribution per Material */}
            <Page size="A4" style={styles.page}>
                <View style={styles.chartSection}>
                    <Text style={styles.chartTitle}>Trip Distribution per Material</Text>
                    <Text style={styles.chartDescription}>
                        Number of trips completed for each material type (materials &lt;1% grouped as "Other")
                    </Text>
                    <PDFPieChart data={materialTripsPieData} />
                </View>
                <Text style={styles.footer} fixed>
                    Page 4 | Trip Distribution per Material
                </Text>
            </Page>

            {/* Chart Page 3: Material Quantity Distribution */}
            <Page size="A4" style={styles.page}>
                <View style={styles.chartSection}>
                    <Text style={styles.chartTitle}>Material Quantity Distribution</Text>
                    <Text style={styles.chartDescription}>
                        Total quantity transported for each material type (top 25 materials shown)
                    </Text>
                    <PDFBarChart
                        data={materialQuantityBarData}
                        formatValue={(v) => v.toFixed(0)}
                    />
                </View>
                <Text style={styles.footer} fixed>
                    Page 5 | Material Quantity Distribution
                </Text>
            </Page>

            {/* Chart Page 4: Operator Productivity */}
            <Page size="A4" style={styles.page}>
                <View style={styles.chartSection}>
                    <Text style={styles.chartTitle}>Operator Productivity</Text>
                    <Text style={styles.chartDescription}>
                        Distribution of operational, downtime, and idle hours
                    </Text>
                    <PDFPieChart data={productivityPieData} />
                </View>
                <Text style={styles.footer} fixed>
                    Page 6 | Operator Productivity
                </Text>
            </Page>

            {/* Chart Page 5: Trips Over Time */}
            <Page size="A4" style={styles.page}>
                <View style={styles.chartSection}>
                    <Text style={styles.chartTitle}>Trips Over Time</Text>
                    <Text style={styles.chartDescription}>
                        Daily trip count throughout the reporting period
                    </Text>
                    <PDFLineChart
                        data={tripsOverTimeData}
                        formatValue={(v) => v.toFixed(0)}
                    />
                </View>
                <Text style={styles.footer} fixed>
                    Page 7 | Trips Over Time
                </Text>
            </Page>

            {/* Chart Page 6: Downtime Over Time */}
            <Page size="A4" style={styles.page}>
                <View style={styles.chartSection}>
                    <Text style={styles.chartTitle}>Downtime Over Time</Text>
                    <Text style={styles.chartDescription}>
                        Daily downtime duration throughout the reporting period
                    </Text>
                    <PDFLineChart
                        data={downtimeOverTimeData}
                        formatValue={(v) => formatDuration(v)}
                    />
                </View>
                <Text style={styles.footer} fixed>
                    Page 8 | Downtime Over Time
                </Text>
            </Page>

            {/* Chart Page 7: Operational Time per Material */}
            <Page size="A4" style={styles.page}>
                <View style={styles.chartSection}>
                    <Text style={styles.chartTitle}>Operational Time per Material</Text>
                    <Text style={styles.chartDescription}>
                        Total operational time spent on each material type (top 25 materials shown)
                    </Text>
                    <PDFBarChart
                        data={operationalTimePerMaterialData}
                        formatValue={(v) => formatDuration(v)}
                    />
                </View>
                <Text style={styles.footer} fixed>
                    Page 9 | Operational Time per Material
                </Text>
            </Page>

            {/* Chart Page 8: Operational Time vs Material Distribution */}
            <Page size="A4" style={styles.page}>
                <View style={styles.chartSection}>
                    <Text style={styles.chartTitle}>Operational Time vs Material Distribution</Text>
                    <Text style={styles.chartDescription}>
                        Breakdown of loading, trip, unloading, return, and idle time for each material (top 20 materials shown)
                    </Text>
                    <PDFStackedBarChart
                        data={operationalTimeVsMaterialData}
                        formatValue={(v) => v.toFixed(1) + "h"}
                    />
                </View>
                <Text style={styles.footer} fixed>
                    Page 10 | Operational Time vs Material Distribution
                </Text>
            </Page>

            {/* Chart Page 9: Material Distribution over Time */}
            <Page size="A4" style={styles.page}>
                <View style={styles.chartSection}>
                    <Text style={styles.chartTitle}>Material Distribution over Time</Text>
                    <Text style={styles.chartDescription}>
                        Material quantities transported per day
                    </Text>
                    <PDFStackedBarChart
                        data={materialDistributionOverTimeData}
                        formatValue={(v) => v.toFixed(0)}
                    />
                </View>
                <Text style={styles.footer} fixed>
                    Page 11 | Material Distribution over Time
                </Text>
            </Page>

            {/* Trip Sessions Table - Only show for single client reports or limit for multi-client */}
            {!isMultiClient && chartData.appSessionData.length > 0 && (
                <Page size="A4" style={styles.page} orientation="landscape">
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Trip Sessions Detail</Text>
                        <View style={styles.table}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableCell, { flex: 1.5 }]}>Robot</Text>
                                <Text style={[styles.tableCell, { flex: 1.5 }]}>Operator</Text>
                                <Text style={[styles.tableCell, { flex: 1.5 }]}>Material</Text>
                                <Text style={styles.tableCell}>Qty</Text>
                                <Text style={[styles.tableCell, { flex: 1.2 }]}>Loading</Text>
                                <Text style={[styles.tableCell, { flex: 1.2 }]}>Trip</Text>
                                <Text style={[styles.tableCell, { flex: 1.2 }]}>Unloading</Text>
                                <Text style={[styles.tableCell, { flex: 1.2 }]}>Return</Text>
                                <Text style={[styles.tableCell, { flex: 1.2 }]}>Total</Text>
                            </View>
                            {chartData.appSessionData.slice(0, 30).map((session, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.tableRow,
                                        index % 2 === 1 ? styles.tableRowAlt : {}
                                    ]}
                                >
                                    <Text style={[styles.tableCell, { flex: 1.5 }]}>
                                        {session.robotName}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 1.5 }]}>
                                        {session.operatorName}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 1.5 }]}>
                                        {session.loadingMaterialType}
                                    </Text>
                                    <Text style={styles.tableCell}>
                                        {session.loadingMaterialQuantity}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 1.2 }]}>
                                        {formatDuration(session.loadingTime)}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 1.2 }]}>
                                        {formatDuration(session.tripTime)}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 1.2 }]}>
                                        {formatDuration(session.unloadingTime)}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 1.2 }]}>
                                        {formatDuration(session.returnTripTime)}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 1.2 }]}>
                                        {formatDuration(session.totalTripTime)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                        {chartData.appSessionData.length > 30 && (
                            <Text style={{ marginTop: 10, fontSize: 9, color: "#64748b" }}>
                                Showing first 30 trips of {chartData.appSessionData.length} total
                                trips
                            </Text>
                        )}
                    </View>
                    <Text style={styles.footer} fixed>
                        Page 12 | Trip Sessions
                    </Text>
                </Page>
            )}

            {/* Downtime Table - Only show for single client reports */}
            {!isMultiClient && chartData.downtimeData && chartData.downtimeData.length > 0 && (
                <Page size="A4" style={styles.page} orientation="landscape">
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Downtime Analysis</Text>
                        <View style={styles.table}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableCell, { flex: 1.5 }]}>Robot</Text>
                                <Text style={[styles.tableCell, { flex: 1.5 }]}>Operator</Text>
                                <Text style={styles.tableCell}>Task</Text>
                                <Text style={[styles.tableCell, { flex: 2 }]}>Start Time</Text>
                                <Text style={[styles.tableCell, { flex: 2 }]}>End Time</Text>
                                <Text style={[styles.tableCell, { flex: 1.5 }]}>Duration</Text>
                            </View>
                            {chartData.downtimeData.slice(0, 30).map((downtime, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.tableRow,
                                        index % 2 === 1 ? styles.tableRowAlt : {}
                                    ]}
                                >
                                    <Text style={[styles.tableCell, { flex: 1.5 }]}>
                                        {downtime.robotName}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 1.5 }]}>
                                        {downtime.operatorName}
                                    </Text>
                                    <Text style={styles.tableCell}>{downtime.task}</Text>
                                    <Text style={[styles.tableCell, { flex: 2 }]}>
                                        {formatTimestamp(downtime.downtimeStartTimestamp)}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 2 }]}>
                                        {formatTimestamp(downtime.downtimeEndTimestamp)}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 1.5 }]}>
                                        {formatDuration(downtime.downTimeDuration)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                        {chartData.downtimeData.length > 30 && (
                            <Text style={{ marginTop: 10, fontSize: 9, color: "#64748b" }}>
                                Showing first 30 downtime records of{" "}
                                {chartData.downtimeData.length} total records
                            </Text>
                        )}
                    </View>
                    <Text style={styles.footer} fixed>
                        Page 13 | Downtime Analysis
                    </Text>
                </Page>
            )}
        </Document>
    );
};
