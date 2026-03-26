import { memo } from "react";
import { DataCard } from "../components/DataCard";
import { CostEfficiencyType } from "./CostEfficiencyPanel";

/**
 * Number cards for the cost efficiency graph depicting:
 *
 * * Robot Trips per day
 * * Running time per day
 * * Wheelbarrows equivalent
 * * Labour cost
 *
 */
export const CostEfficiencyCards = memo(
    ({ costEfficiencyData }: { costEfficiencyData: CostEfficiencyType }) => {
        return (
            <div className="grid w-full grid-cols-1 gap-6 py-2 sm:grid-cols-2 md:grid-cols-4 md:gap-8">
                <DataCard
                    value={costEfficiencyData.robotTripsPerDay}
                    label="Trips per day"
                    units="count"
                />
                <DataCard
                    value={costEfficiencyData.robotAvgTurnAroundTime}
                    label="Running Time Per Day Per Trip"
                    units="hours"
                />
                <DataCard
                    value={costEfficiencyData.wheelbarrowsRequiredPerDay}
                    label="Wheelbarrows"
                    units="count"
                />
                <DataCard
                    value={costEfficiencyData.labourCost}
                    label="LabourCost"
                    units="rupees"
                />
            </div>
        );
    }
);
