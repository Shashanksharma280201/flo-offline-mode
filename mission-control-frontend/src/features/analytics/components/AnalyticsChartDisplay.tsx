import { ChartPanel } from "./ChartPanel";
import OperationalTimePiePanel from "@/features/analytics/operationalTimePiePanel/OperationalTimePiePanel";
import OperationalTimeVsMaterialPanel from "@/features/analytics/operationalTimeVsMaterialPanel/OperationalTimeVsMaterialPanel";
import MaterialVsQuantityPanel from "@/features/analytics/materialVsQuantityPanel/MaterialVsQuantityPanel";
import MaterialTripsPieChart from "@/features/analytics/materialTripsPieChart/MaterialTripsPieChart";
import ProductivityPieChart from "@/features/analytics/productivityPieChart/ProductivityPieChart";
import MaterialVsTimePanel from "@/features/analytics/materialVsTimePanel/MaterialVsTimePanel";
import TripsVsTimePanel from "../tripsVsTimePanel/TripsVsTimePanel";
import OperationalTimePerMaterialPanel from "../operationalTimePerMaterialPanel/OperationalTimePerMaterialPanel";
import DowntimeTimelinePanel from "../downtimeTimelinePanel/DowntimeTimelinePanel";
import RobotPathPanel from "../robotPathPanel/RobotPathPanel";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";

export const AnalyticsChartDisplay = () => {
    const processedAppData = useAnalyticsStore(
        (state) => state.processedAppData
    );
    const gnssData = useAnalyticsStore((state) => state.gnssData);

    const selectedClient = useAnalyticsStore((state) => state.selectedClient);
    return (
        <div className="grid grid-cols-1 gap-6 px-6 py-6 md:grid-cols-2 bg-blue-900/25 md:gap-8 md:px-8 md:py-8">
            <ChartPanel
                dataLength={processedAppData.appSessionData.length}
                chart={<OperationalTimePiePanel data={processedAppData} />}
                title="Operational Time"
                description="Total operational time taken by the robot(s)"
            />
            <ChartPanel
                dataLength={processedAppData.appSessionData.length}
                chart={<MaterialTripsPieChart data={processedAppData} />}
                title="Trip distribution per material"
                description="Number of trips taken for each material"
            />
            <ChartPanel
                dataLength={processedAppData.appSessionData.length}
                chart={
                    <OperationalTimeVsMaterialPanel data={processedAppData} />
                }
                title="Operational Time vs Material Distribution"
                description="Operation Time for different types of material"
            />
            <ChartPanel
                dataLength={processedAppData.appSessionData.length}
                chart={<DowntimeTimelinePanel data={processedAppData} />}
                title="Downtime Distribution over Time"
                description="Downtime was observed over this time"
            />
            <ChartPanel
                dataLength={processedAppData.appSessionData.length}
                chart={<MaterialVsQuantityPanel data={processedAppData} />}
                title="Material Quantity Distribution"
                description="Quantity for different types of material"
            />

            <ChartPanel
                dataLength={processedAppData.appSessionData.length}
                chart={<ProductivityPieChart data={processedAppData} />}
                title="Operator productivity"
                description={`Operator productivity for working ${selectedClient?.operatingHours} hours/day`}
            />
            <ChartPanel
                dataLength={processedAppData.appSessionData.length}
                chart={<MaterialVsTimePanel data={processedAppData} />}
                title="Material Distribution over Time"
                description="Material Quantity distributed over given time range"
            />
            <ChartPanel
                dataLength={processedAppData.appSessionData.length}
                chart={<TripsVsTimePanel data={processedAppData} />}
                title="Trips over Time"
                description="Trips taken by the robot over given time range"
            />
            <ChartPanel
                dataLength={processedAppData.appSessionData.length}
                chart={
                    <OperationalTimePerMaterialPanel data={processedAppData} />
                }
                title="Time Distribution per material"
                description="Operational time taken by the robot(s) for every material"
            />
            <RobotPathPanel gnssData={gnssData || []} />
            {/* <div className="w-full md:col-span-2">
                <ChartPanel
                    dataLength={processedAppData.appSessionData.length}
                    chart={<CostEfficiencyPanel data={processedAppData} />}
                    title="Cost Effectiveness"
                    description="Cost effectiveness of robots compared to manual labour"
                />
            </div> */}
        </div>
    );
};
