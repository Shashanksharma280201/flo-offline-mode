import { memo, useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";

import { CategoricalChartState } from "recharts/types/chart/types";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";
import { ProcessedAppData } from "../../../data/types/appDataTypes";
import { CostEfficiencyChart } from "./CostEfficiencyChart";
import { CostEfficiencyCards } from "./CostEfficiencyCards";

const TRIP_MULTIPLIER = 4;
const RUNNING_TIME_MULTIPLIER = 1.5;
const LABOUR_COST_PER_DAY = 500;
const LABOURERS_PER_WHEELBARROW = 3;
const WORKING_HOURS = 8

export type TripMaterialData = {
    material: string;
    robotTrips: number;
    equivalentManualTrips: number;
    robotRunningTime: number;
    manualRunningTime: number;
    robotTripsPerDay: number;
    robotAvgTurnAroundTime: number;
    wheelbarrowsRequiredPerDay: number;
    labourCost: number;
};

export type CostEfficiencyType = {
    robotTripsPerDay: number;
    robotAvgTurnAroundTime: number;
    wheelbarrowsRequiredPerDay: number;
    labourCost: number;
};

/**
 * Bar chart for comparing working done by robot vs manual labour
 * along with cards depicting:
 * 
 * * Robot Trips per day
 * * Running time per day
 * * Wheelbarrows equivalent
 * * Labour cost
 * 
 */
const CostEfficiencyPanel = ({ data }: { data: ProcessedAppData }) => {

    const [tripMaterialData, setTripMaterialData] =
        useState<TripMaterialData[]>();
    const setTotalLabourCost = useAnalyticsStore(
        (state) => state.setTotalLabourCost
    );
    
    const [businessData, setBusinessData] = useState<CostEfficiencyType>({
        robotTripsPerDay: 0,
        robotAvgTurnAroundTime: 0,
        wheelbarrowsRequiredPerDay: 0,
        labourCost: 0
    });

    const [totalBusinessData, setTotalBusinessData] =
        useState<CostEfficiencyType>({
            robotTripsPerDay: 0,
            robotAvgTurnAroundTime: 0,
            wheelbarrowsRequiredPerDay: 0,
            labourCost: 0
        });

    useEffect(() => {
        const totalDays = new Set<string>();
       
        const cBizData = {
            robotTripsPerDay: 0,
            robotAvgTurnAroundTime: 0,
            wheelbarrowsRequiredPerDay: 0,
            labourCost: 0
        };

        const materialCount = data.appSessionData.reduce((materialCount, session) => {
            const currentDate = dayjs(session.loadingStartTimestamp)
                .startOf("day")
                .toString();
            totalDays.add(currentDate);
        
            if (!materialCount[session.loadingMaterialType]) {
                materialCount[session.loadingMaterialType] = { trips: 0, runningTime: 0 };
            }
            
            materialCount[session.loadingMaterialType] = {
                trips: materialCount[session.loadingMaterialType].trips + 1,
                runningTime: materialCount[session.loadingMaterialType].runningTime + dayjs.duration(session.tripRunningTime).asHours()
            };
            
            return materialCount;
        }, {} as {
            [materialName: string]: { trips: number; runningTime: number };
        });

        const materialCountArr = Object.keys(materialCount).map((material) => {
            const robotTrips = materialCount[material].trips;
            const equivalentManualTrips = materialCount[material].trips * TRIP_MULTIPLIER;
            const equivalentManualTripsPerDay = totalDays.size > 0 ? equivalentManualTrips / totalDays.size : 0;

            const robotRunningTime = materialCount[material].runningTime; //in hours
            const manualRunningTime = robotRunningTime * RUNNING_TIME_MULTIPLIER; //in hours

            const robotTripsPerDay = totalDays.size > 0 ? robotTrips / totalDays.size : 0;
            const robotAvgTurnAroundTime = robotTrips > 0 ? robotRunningTime / robotTrips : 0; //in hours

            const equivalentManualTurnAroundTime =
            robotAvgTurnAroundTime * RUNNING_TIME_MULTIPLIER; //in hours

            const wheelbarrowsRequiredPerDay =
                WORKING_HOURS > 0 ? (equivalentManualTripsPerDay * equivalentManualTurnAroundTime) / WORKING_HOURS : 0;

            const labourRequiredForOneWheelbarrow = wheelbarrowsRequiredPerDay * LABOURERS_PER_WHEELBARROW
            const labourCost = labourRequiredForOneWheelbarrow * LABOUR_COST_PER_DAY * totalDays.size 
            
            cBizData.robotTripsPerDay += robotTripsPerDay;
            cBizData.robotAvgTurnAroundTime += robotAvgTurnAroundTime;
            cBizData.wheelbarrowsRequiredPerDay += wheelbarrowsRequiredPerDay;
            cBizData.labourCost += labourCost;
            
            return {
                material,
                robotTrips,
                equivalentManualTrips,
                robotRunningTime,
                manualRunningTime,
                robotTripsPerDay,
                robotAvgTurnAroundTime,
                wheelbarrowsRequiredPerDay,
                labourCost
            };
        });
        setTotalBusinessData(cBizData);
        setTotalLabourCost(cBizData.labourCost);
        setBusinessData(cBizData);
        setTripMaterialData(materialCountArr);
    }, [data]);

    const mouseMoveHandler = useCallback(
        (state: CategoricalChartState) => {
            if (!state.isTooltipActive) {
                setBusinessData(totalBusinessData);
            }

            if (state.activePayload) {
                const {
                    robotTripsPerDay,
                    robotAvgTurnAroundTime,
                    wheelbarrowsRequiredPerDay,
                    labourCost
                } = state.activePayload[0].payload;
                
                setBusinessData({
                    robotTripsPerDay,
                    robotAvgTurnAroundTime,
                    wheelbarrowsRequiredPerDay,
                    labourCost
                });
            }
        },
        [totalBusinessData]
    );

    return (
        <>
            <CostEfficiencyChart
                tripMaterialData={tripMaterialData}
                mouseMoveHandler={mouseMoveHandler}
            />
            <CostEfficiencyCards costEfficiencyData={businessData} />
        </>
    );
};

export default memo(CostEfficiencyPanel);