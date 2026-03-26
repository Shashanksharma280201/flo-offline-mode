import dayjs from "dayjs";
import { ProcessedSessionInfo } from "../analyticsService";
import { DataCard } from "./DataCard";

/**
 * Show number cards for:
 * * Total distance covered
 * * Total operation time
 * * Total energy consumed
 */
export const SensorDataCards = ({
    processedSensorSessionInfo
}: {
    processedSensorSessionInfo: ProcessedSessionInfo;
}) => {
    return (
        <div className="flex flex-col gap-4 px-6 md:flex-row md:px-8">
            <DataCard
                isAnimated
                value={processedSensorSessionInfo.totalDistance}
                label="Distance Travelled"
                units="meters"
            />
            <DataCard
                isAnimated
                value={dayjs
                    .duration(processedSensorSessionInfo.totalOperationTime)
                    .asHours()}
                label="Operation Time"
                units="hours"
            />
            <DataCard
                isAnimated
                value={processedSensorSessionInfo.totalEnergyConsumed}
                label="Energy Consumed"
                units="units"
            />
        </div>
    );
};
