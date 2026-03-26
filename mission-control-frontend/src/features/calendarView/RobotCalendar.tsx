import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useMutation } from "react-query";
import { View } from "react-big-calendar";
import CalendarView, { CalendarEvent } from "./CalendarView";
import {
    getMaintenanceData,
    getNissanSessions,
    getSessionEventsFn
} from "./services/robotCalendarService";
import { useRobotSessionsStore } from "../../stores/robotSessionsStore";
import { errorLogger } from "../../util/errorLogger";
import {
    RobotType,
    SensorData,
    SessionInfo,
    SessionsInRangeResponse
} from "../../data/types";
import { useShallow } from "zustand/react/shallow";
import { CalendarSessionMetrics } from "./components/CalendarSessionMetrics";

type RobotCalendarProps = {
    robot: RobotType;
    onDoubleClickEvent: (event: CalendarEvent) => void;
};

/**
 *
 * * Displays a calendar depicting the dates on which the robot operated,
 * double clicking an event opens details for that session with details
 * * Also displays cards for Distance travelled, Operation Time, Energy Consumed by the robot
 * for the time period
 *
 */
const RobotCalendar = ({ robot, onDoubleClickEvent }: RobotCalendarProps) => {
    const [
        sessionEvents,
        setSessionEvents,
        dateRange,
        setDateRange,
        analysisData,
        setAnalysisData,
        startingTimestamp,
        setStartingTimestamp,
        endingTimestamp,
        setEndingTimestamp
    ] = useRobotSessionsStore(
        useShallow((state) => [
            state.sessionEvents,
            state.setSessionEvents,
            state.dateRange,
            state.setDateRange,
            state.analysisData,
            state.setAnalysisData,
            state.startingTimestamp,
            state.setStartingTimestamp,
            state.endingTimestamp,
            state.setEndingTimestamp
        ])
    );
    const [maintenanceEvents, setMaintenanceEvents] = useState<
        { sessionId: number; title: string; start: Date; end: Date }[]
    >([]);
    /**
     * Calculates summary metrics for the selected time range.
     * - Time/Energy are summed up across all sessions.
     * - Distance is the delta (End - Start) because backend provides odometer snapshots.
     */
    const calculateAnalysisData = (
        events: any[],
        currentDateRange: { start: number; end: number } | undefined
    ) => {
        if (!currentDateRange || events.length === 0) {
            setAnalysisData({
                distanceTravelled: 0,
                operationTime: 0,
                energyConsumed: 0
            });
            return;
        }

        let totalOperationTime = 0;
        let totalEnergyConsumed = 0;

        // Filter sessions to match the user's selected date range on the calendar
        const filteredSessions = events.filter((event) => {
            const eventStart = dayjs(event.start).valueOf();
            const eventEnd = dayjs(event.end).valueOf();
            return (
                eventStart >= currentDateRange.start &&
                eventEnd <= currentDateRange.end
            );
        });

        if (filteredSessions.length > 0) {
            filteredSessions.forEach(({ resource }) => {
                const sessionInfo = resource as SessionInfo;
                console.log("Session Distance:", sessionInfo.distanceTravelled);
                totalOperationTime += sessionInfo.operationTime;
                totalEnergyConsumed += sessionInfo.energyConsumed;
            });

            console.info("filteredSessions length: ", filteredSessions.length);

            // Odometer Logic: Subtract first session's odometer from last session's odometer
            const earliestSession = filteredSessions[0].resource as SessionInfo;
            const latestSession = filteredSessions[filteredSessions.length - 1]
                .resource as SessionInfo;

            let rangeDistance =
                ((latestSession?.distanceTravelled || 0) -
                    (earliestSession?.distanceTravelled || 0)) /
                100;

            // If only one session exists, displacement is just that session's total
            if (filteredSessions.length === 1) {
                rangeDistance = (latestSession?.distanceTravelled || 0) / 100;
            }

            setAnalysisData({
                distanceTravelled: Math.max(0, rangeDistance),
                operationTime: totalOperationTime,
                energyConsumed: totalEnergyConsumed
            });
        } else {
            setAnalysisData({
                distanceTravelled: 0,
                operationTime: 0,
                energyConsumed: 0
            });
        }
    };

    const sessionEventsMutation = useMutation(
        ({
            robotId,
            startingTimestamp,
            endingTimestamp
        }: {
            robotId: string;
            startingTimestamp: number;
            endingTimestamp: number;
        }) => getSessionEventsFn(robotId, startingTimestamp, endingTimestamp),
        {
            onSuccess: (data: SessionsInRangeResponse) => {
                if (data.sessions.length === 0) {
                    setSessionEvents([]);
                    setAnalysisData({
                        distanceTravelled: 0,
                        operationTime: 0,
                        energyConsumed: 0
                    });
                } else {
                    const events = data.sessions.map((session) => ({
                        sessionId: session.sessionId,
                        title: session.name,
                        start: new Date(session.timestamp),
                        end: new Date(session.sessionEndTimestamp),
                        resource: session
                    }));
                    setSessionEvents(events);
                    setAnalysisData({
                        distanceTravelled: data.totals.distanceTravelled,
                        operationTime: data.totals.totalOperationTime,
                        energyConsumed: data.totals.totalEnergyConsumed
                    });
                }
            },
            onError: (error: any) => errorLogger(error)
        }
    );

    const maintenanceDataMutation = useMutation({
        mutationFn: ({
            robotId,
            startingTimestamp,
            endingTimestamp
        }: {
            robotId: string;
            startingTimestamp: number;
            endingTimestamp: number;
        }) => getMaintenanceData(robotId, startingTimestamp, endingTimestamp),
        onSuccess: (maintenanceData: { timestamp: string; _id: string }[]) => {
            if (maintenanceData.length === 0) {
                setMaintenanceEvents([]);
            }
            const events = maintenanceData.map((data) => ({
                sessionId: new Date(data.timestamp).getTime(),
                title: "Maintenance",
                start: new Date(data.timestamp),
                end: new Date(data.timestamp)
            }));
            setMaintenanceEvents(events);
        },
        onError: (err) => console.log(err)
    });

    const nissanEventsMutation = useMutation({
        mutationFn: ({
            deviceId,
            startingTimestamp,
            endingTimestamp
        }: {
            deviceId: string;
            startingTimestamp: number;
            endingTimestamp: number;
        }) => getNissanSessions(deviceId, startingTimestamp, endingTimestamp),
        onSuccess: (data: SensorData[]) => {
            if (data.length === 0) {
                setSessionEvents([]);
                setAnalysisData({
                    distanceTravelled: 0,
                    operationTime: 0,
                    energyConsumed: 0
                });
            } else {
                const events = data.map((data) => ({
                    sessionId: data.metadata.sessionId,
                    title: dayjs(data.timestamp).format("hh:mm a"),
                    start: new Date(data.timestamp),
                    end: new Date(data.timestamp),
                    resource: data?.sessionInfo ?? {
                        name: "Nissan",
                        distanceTravelled: 0,
                        operationTime: 0,
                        energyConsumed: 0,
                        sessionEndTimestamp: new Date(data.timestamp),
                        videos: []
                    }
                }));
                setSessionEvents(events);
                calculateAnalysisData(events, dateRange);
            }
        },
        onError: (error: any) => errorLogger(error)
    });

    useEffect(() => {
        if (startingTimestamp && endingTimestamp) {
            if (robot.fleet?.name.toLowerCase().includes("nissan")) {
                nissanEventsMutation.mutate({
                    deviceId: robot.id,
                    startingTimestamp,
                    endingTimestamp
                });
            } else {
                sessionEventsMutation.mutate({
                    robotId: robot.id,
                    startingTimestamp,
                    endingTimestamp
                });
            }

            maintenanceDataMutation.mutate({
                robotId: robot.id,
                startingTimestamp,
                endingTimestamp
            });
        }
    }, [robot.fleet?.name, robot, startingTimestamp, endingTimestamp]);

    useEffect(() => {
        if (
            dateRange &&
            sessionEvents.length > 0 &&
            robot.fleet?.name.toLowerCase().includes("nissan")
        ) {
            calculateAnalysisData(sessionEvents, dateRange);
        }
    }, [dateRange]);

    const rangeChangeHandler = (
        range:
            | Date[]
            | {
                  start: Date;
                  end: Date;
              },
        view: View | undefined
    ) => {
        if (typeof range === "object" && "start" in range && "end" in range) {
            // Range set to month
            setStartingTimestamp(dayjs(range.start).valueOf());
            setEndingTimestamp(dayjs(range.end).valueOf());
            setDateRange({
                start: dayjs(range.start).valueOf(),
                end: dayjs(range.end).valueOf()
            });
        } else {
            if (range.length > 1) {
                // Range set to week
                setDateRange({
                    start: dayjs(range[0]).valueOf(),
                    end: dayjs(range[range.length - 1])
                        .add(1, "day")
                        .valueOf()
                });
            } else {
                // Range set to day
                setDateRange({
                    start: dayjs(range[0]).valueOf(),
                    end: dayjs(range[0]).add(1, "days").valueOf()
                });
            }
        }
    };

    return (
        <section className="flex h-full flex-col overflow-y-auto">
            <CalendarSessionMetrics
                distanceTravelled={analysisData?.distanceTravelled}
                operationTime={analysisData?.operationTime}
                energyConsumed={analysisData?.energyConsumed}
                className="my-6 md:my-8"
            />
            <CalendarView
                onDoubleClickEvent={onDoubleClickEvent}
                events={[...sessionEvents, ...maintenanceEvents]}
                onRangeChange={rangeChangeHandler}
            />
        </section>
    );
};

export default RobotCalendar;
