import dayjs from "dayjs";
import { DataCard } from "./DataCard";
import { useEffect, useState } from "react";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";

type AppDataCardType = {
    robots: number;
    daysWorked: number;
    downtime: number;
    numberOfTrips: number;
};

/**
 * Show number cards for:
 * * Robots
 * * DaysWorked
 * * Downtime
 * * Savings
 */
export const AppDataCards = () => {
    const totalLabourCost = useAnalyticsStore((state) => state.totalLabourCost);
    const processedAppData = useAnalyticsStore(
        (state) => state.processedAppData
    );

    const totalDistance = useAnalyticsStore((state) => state.totalDistance);

    const [businessData, setBusinessData] = useState<AppDataCardType>({
        robots: 0,
        daysWorked: 0,
        numberOfTrips: 0,
        downtime: 0
    });

    useEffect(() => {
        const { daysWorked, robots, robotHoursWorked, trips } =
            processedAppData.appSessionData.reduce(
                ({ daysWorked, robots, robotHoursWorked, trips }, session) => {
                    daysWorked.add(
                        dayjs(session.loadingStartTimestamp)
                            .startOf("day")
                            .toString()
                    );

                    // Use robotId instead of robotName to avoid counting robots with
                    // same name from different clients as one robot
                    robots.add(session.robotId);

                    robotHoursWorked += dayjs
                        .duration(session.tripRunningTime)
                        .asHours();

                    trips += 1;

                    return { daysWorked, robots, robotHoursWorked, trips };
                },
                {
                    daysWorked: new Set<string>(),
                    robots: new Set<string>(),
                    robotHoursWorked: 0,
                    trips: 0
                }
            );

        const downtimeInHours = processedAppData.downtimeData.reduce(
            (acc, downtime) => {
                acc += downtime.downTimeDuration / 1000 / 60 / 60;
                return acc;
            },
            0
        );

        setBusinessData({
            robots: robots.size,
            daysWorked: daysWorked.size,
            numberOfTrips: trips,
            downtime: downtimeInHours
        });
    }, [processedAppData, totalLabourCost]);

    const totalDistanceRaw =
        typeof totalDistance === "number" ? totalDistance : 0;
    return (
        // <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-4 md:gap-8 md:p-8">
        <div className="grid grid-cols-1 bg-blue-900/25 gap-6 p-6 md:grid-cols-5 md:gap-8 md:p-8">
            <DataCard
                isAnimated
                value={businessData.robots}
                label="Robots"
                units=""
            />
            <DataCard
                isAnimated
                value={businessData.daysWorked}
                label="Days worked"
                units=""
            />
            <DataCard
                isAnimated
                value={Math.max(businessData.downtime, 0)}
                label="Downtime"
                units="hours"
            />
            <DataCard
                isAnimated
                value={businessData.numberOfTrips}
                precision={0}
                label="Total trips"
                units=""
            />
            <DataCard
                isAnimated
                value={
                    totalDistanceRaw >= 1000
                        ? totalDistanceRaw / 1000
                        : totalDistanceRaw
                }
                precision={2}
                label="Total Distance"
                units={totalDistanceRaw >= 1000 ? "km" : "m"}
            />
        </div>
    );
};
