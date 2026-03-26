import dayjs from "dayjs";
import { SystemMetrics } from "./NissanPanels";
import { NissanLineChart } from "./NissanLineChart";

const SystemMetricsPanel = ({
    systemMetrics
}: {
    systemMetrics: SystemMetrics[];
}) => {
    const allDates = systemMetrics.map((data) =>
        dayjs(data.timestamp).valueOf()
    );

    return (
        <>
            <NissanLineChart
                allDates={allDates}
                title="CPU Usage Percent"
                description="Plot of CPU usage percent timeseries data"
                tooltipKey="CPU Usage: "
                units="%"
                emptyDataMessage="No CPU usage data to display"
                dataKey="cpuUsagePercent"
                data={systemMetrics}
            />
            <NissanLineChart
                allDates={allDates}
                title="GPU Usage Percent"
                description="Plot of GPU usage percent timeseries data"
                tooltipKey="GPU Usage: "
                units="%"
                emptyDataMessage="No GPU usage data to display"
                dataKey="gpuUsagePercent"
                data={systemMetrics}
            />
            <NissanLineChart
                allDates={allDates}
                title="Memory Usage Percent"
                description="Plot of Memory usage percent timeseries data"
                tooltipKey="Memory Usage: "
                units="%"
                emptyDataMessage="No Memory usage data to display"
                dataKey="memoryUsagePercent"
                data={systemMetrics}
            />
            <NissanLineChart
                allDates={allDates}
                title="Disk Usage Percent"
                description="Plot of Disk usage percent timeseries data"
                tooltipKey="Disk Usage: "
                units="%"
                emptyDataMessage="No Disk usage data to display"
                dataKey="diskUsagePercent"
                data={systemMetrics}
            />
            <NissanLineChart
                allDates={allDates}
                title="CPU temperature"
                description="Plot of CPU temperature timeseries data"
                tooltipKey="Temperature: "
                units="°C"
                emptyDataMessage="No CPU temperature data to display"
                dataKey="cpuTempCelsius"
                data={systemMetrics}
            />
            <NissanLineChart
                allDates={allDates}
                title="GPU temperature"
                description="Plot of GPU temperature timeseries data"
                tooltipKey="Temperature: "
                units="°C"
                emptyDataMessage="No GPU temperature data to display"
                dataKey="gpuTempCelsius"
                data={systemMetrics}
            />
            <NissanLineChart
                allDates={allDates}
                title="CPU power"
                description="Plot of CPU power timeseries data"
                tooltipKey="Power: "
                units="W"
                emptyDataMessage="No CPU power data to display"
                dataKey="powerCpuWatts"
                data={systemMetrics}
            />
            <NissanLineChart
                allDates={allDates}
                title="GPU power"
                description="Plot of GPU power timeseries data"
                tooltipKey="Power: "
                units="W"
                emptyDataMessage="No GPU power data to display"
                dataKey="powerGpuWatts"
                data={systemMetrics}
            />
            <NissanLineChart
                allDates={allDates}
                title="Total power"
                description="Plot of total power timeseries data"
                tooltipKey="Power: "
                units="W"
                emptyDataMessage="No total power data to display"
                dataKey="powerTotalWatts"
                data={systemMetrics}
            />
        </>
    );
};

export default SystemMetricsPanel;
