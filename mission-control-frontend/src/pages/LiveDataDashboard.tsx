import Header from "@/components/header/Header";
import CircularProgressBar from "@/features/dashboard/CircularProgressBar";
import { ManualMissionMap } from "@/features/dashboard/ManualMissionMap";
import { cn } from "@/lib/utils";
import { useRobotStore } from "@/stores/robotStore";
import React, { memo, useEffect, useState, useRef, useCallback } from "react";
import { MdPowerSettingsNew } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { SensorLiveData } from "@/data/types";
import { useSocketStore } from "@/stores/socketStore";

const decodeBatteryErrorCode = (sensorData: any) => {
    const {
        batteryErrorCode1,
        batteryErrorCode2,
        batteryErrorCode3,
        batteryErrorCode4,
        batteryErrorCode5,
        batteryErrorCode6,
        batteryErrorCode7,
        batteryErrorCode8
    } = sensorData;

    const error1 = batteryErrorCode1.toString(2);
    const error2 = batteryErrorCode2.toString(2);
    const error3 = batteryErrorCode3.toString(2);
    const error4 = batteryErrorCode4.toString(2);
    const error5 = batteryErrorCode5.toString(2);
    const error6 = batteryErrorCode6.toString(2);
    const error7 = batteryErrorCode7.toString(2);

    const errors = [];

    error1[0] == 1 ? errors.push("Cell volt high level 1") : null;
    error1[1] == 1 ? errors.push("Cell volt high level 2") : null;
    error1[2] == 1 ? errors.push("Cell volt low level 1") : null;
    error1[3] == 1 ? errors.push("Cell volt low level 2") : null;
    error1[4] == 1 ? errors.push("Sum volt high level 1") : null;
    error1[5] == 1 ? errors.push("Sum volt high level 2") : null;
    error1[6] == 1 ? errors.push("Sum volt low level 1") : null;
    error1[7] == 1 ? errors.push("Sum volt low level 2") : null;

    error2[0] == 1 ? errors.push("Chg temp high level 1") : null;
    error2[1] == 1 ? errors.push("Chg temp high level 2") : null;
    error2[2] == 1 ? errors.push("Chg temp low level 1") : null;
    error2[3] == 1 ? errors.push("Chg temp low level 2") : null;
    error2[4] == 1 ? errors.push("Dischg temp high level 1") : null;
    error2[5] == 1 ? errors.push("Dischg temp high level 2") : null;
    error2[6] == 1 ? errors.push("Dischg temp low level 1") : null;
    error2[7] == 1 ? errors.push("Dischg temp low level 2") : null;

    error3[0] == 1 ? errors.push("Chg overcurrent level 1") : null;
    error3[1] == 1 ? errors.push("Chg overcurrent level 2") : null;
    error3[2] == 1 ? errors.push("Dischg overcurrent level 1") : null;
    error3[3] == 1 ? errors.push("Dischg overcurrent level 2") : null;
    error3[4] == 1 ? errors.push("SOC high level 1") : null;
    error3[5] == 1 ? errors.push("SOC high level 2") : null;
    error3[6] == 1 ? errors.push("SOC low level 1") : null;
    error3[7] == 1 ? errors.push("SOC low level 2") : null;

    error4[0] == 1 ? errors.push("Diff volt level 1") : null;
    error4[1] == 1 ? errors.push("Diff volt level 2") : null;
    error4[2] == 1 ? errors.push("Diff temp level 1") : null;
    error4[3] == 1 ? errors.push("Diff temp level 2") : null;
    // error4[4] == 1 ? errors.push("Reserved") : null
    // error4[5] == 1 ? errors.push("Reserved") : null
    // error4[6] == 1 ? errors.push("Reserved") : null
    // error4[7] == 1 ? errors.push("Reserved") : null

    error5[0] == 1 ? errors.push("Chg MOS temp high alarm") : null;
    error5[1] == 1 ? errors.push("Dischg MOS temp high alarm") : null;
    error5[2] == 1 ? errors.push("Chg MOS temp sensor err") : null;
    error5[3] == 1 ? errors.push("Dischg MOS temp sensor err") : null;
    error5[4] == 1 ? errors.push("Chg MOS adhesion err") : null;
    error5[5] == 1 ? errors.push("Dischg MOS adhesion err") : null;
    error5[6] == 1 ? errors.push("Chg MOS open circuit err") : null;
    error5[7] == 1 ? errors.push("Discrg MOS open circuit err") : null;

    error6[0] == 1 ? errors.push("AFE collect chip err") : null;
    error6[1] == 1 ? errors.push("Voltage collect dropped") : null;
    error6[2] == 1 ? errors.push("Cell temp sensor err") : null;
    error6[3] == 1 ? errors.push("EEPROM err") : null;
    error6[4] == 1 ? errors.push("RTC err") : null;
    error6[5] == 1 ? errors.push("Precharge failure") : null;
    error6[6] == 1 ? errors.push("Communication failure") : null;
    error6[7] == 1 ? errors.push("Internal communication failure") : null;

    error7[0] == 1 ? errors.push("Current module fault") : null;
    error7[1] == 1 ? errors.push("Sum voltage detect fault") : null;
    error7[2] == 1 ? errors.push("Short circuit protect fault") : null;
    error7[3] == 1 ? errors.push("Low volt forbidden chg fault") : null;
    // error7[4] == 1 ? errors.push("Reserved") : null
    // error7[5] == 1 ? errors.push("Reserved") : null
    // error7[6] == 1 ? errors.push("Reserved") : null
    // error7[7] == 1 ? errors.push("Reserved") : null

    batteryErrorCode8 == 0 ? null : errors.push("Fault code");

    return errors;
};

// Loading Screen Component
const LoadingScreen = ({ isConnecting }: { isConnecting: boolean }) => {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-backgroundGray/10">
            <div className="flex flex-col items-center gap-4">
                {/* Spinner */}
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-primary600"></div>

                {/* Loading text */}
                <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-700">
                        Loading Live Data
                    </h3>
                    <p className="text-sm text-gray-500">
                        {isConnecting
                            ? "Establishing connection..."
                            : "Waiting for first data packet..."}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                        This usually takes 2-5 seconds
                    </p>
                </div>

                {/* Pulsing dots */}
                <div className="flex space-x-1">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-primary600"></div>
                    <div className="animation-delay-200 h-2 w-2 animate-pulse rounded-full bg-primary600"></div>
                    <div className="animation-delay-400 h-2 w-2 animate-pulse rounded-full bg-primary600"></div>
                </div>
            </div>
        </div>
    );
};

const LiveDataDashboard = memo(() => {
    const navigate = useNavigate();
    const clientSocket = useSocketStore((state) => state.clientSocket);
    const selectedRobot = useRobotStore((state) => state.robot);
    const [sensorData, setSensorData] = useState<SensorLiveData>();
    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);

    const getBatteryState = () => {
        switch (sensorData?.batteryState) {
            case 0:
                return "Idle";
            case 1:
                return "Charging";
            case 2:
                return "Discharging";
            default:
                return "Error";
        }
    };

    const getActuatorState = () => {
        switch (sensorData?.actuator) {
            case 0:
                return "Off";
            case 1:
                return "Moving up";
            case -1:
                return "Moving down";
            default:
                return "Error";
        }
    };

    const ignition = sensorData?.session || 0;
    const batteryPercentage = sensorData?.batteryPercentage || 0;
    const leftCytronTemp = sensorData?.leftCytronTemp || 0;
    const rightCytronTemp = sensorData?.rightCytronTemp || 0;
    const speed = (sensorData?.rmcDataSpeed || 0) * 1.852;
    const weight = (sensorData?.rmcDataWeight || 0).toFixed(2) + " kg";
    const distance = (sensorData?.rmcDataDistance || 0).toFixed(2) + " m";

    const batteryCurrent = (sensorData?.batteryCurrent || 0.0).toFixed(1) + "A";
    const batteryState = getBatteryState();
    const batteryMaxCellVoltage =
        (sensorData?.batteryMaxCellVoltage || 0.0).toFixed(1) + "mV";
    const batteryMinCellVoltage =
        (sensorData?.batteryMinCellVoltage || 0.0).toFixed(1) + "mV";

    const throtte = "" + (sensorData?.throttle || 0);
    const steering = "" + (sensorData?.steering || 0);
    const actuator = getActuatorState();
    const light = "" + (sensorData?.light || 0);

    const mmrVoltage = (sensorData?.mmrVoltage || 0.0).toFixed(1) + "V";
    const mmrCurrent = (sensorData?.mmrCurrent || 0.0).toFixed(1) + "A";
    const mmrPower = (sensorData?.mmrPower || 0.0).toFixed(1) + "W";
    const mmrPeakPower = (sensorData?.mmrPeakPower || 0.0).toFixed(1) + "W";

    const bmpTemperature =
        (sensorData?.bmpTemperature || 0.0).toFixed(1) + "°C";
    const bmpAltitude = (sensorData?.bmpAltitude || 0.0).toFixed(1) + "m";

    const errors = sensorData ? decodeBatteryErrorCode(sensorData) : [];

    // Check if ignition is on
    const isIgnitionOn = sensorData?.session === 1;

    useEffect(() => {
        if (!clientSocket || !selectedRobot || !selectedRobot.macAddress) {
            setIsLoading(false);
            return;
        }

        setIsConnecting(true);
        setIsLoading(true);

        // Throttle sensor data updates to maximum 3 per second (333ms)
        let lastUpdateTime = 0;
        let pendingData: SensorLiveData | null = null;
        let throttleTimer: NodeJS.Timeout | null = null;

        const throttledSetSensorData = (data: SensorLiveData) => {
            const now = Date.now();
            const timeSinceLastUpdate = now - lastUpdateTime;

            if (timeSinceLastUpdate >= 333) {
                // More than 333ms since last update, update immediately
                setSensorData(data);
                lastUpdateTime = now;
                pendingData = null;
            } else {
                // Less than 333ms, schedule update for later
                pendingData = data;

                if (!throttleTimer) {
                    throttleTimer = setTimeout(() => {
                        if (pendingData) {
                            setSensorData(pendingData);
                            lastUpdateTime = Date.now();
                            pendingData = null;
                        }
                        throttleTimer = null;
                    }, 333 - timeSinceLastUpdate);
                }
            }
        };

        clientSocket.emit(
            "robot:subscribe",
            { macId: selectedRobot.macAddress },
            (data: { result: string; macId: string }) => {
                console.log("sub callback", data);
                setIsConnecting(false);
            }
        );

        clientSocket.on("robot:subscribe", (data) => {
            throttledSetSensorData(data.payload);

            // Stop loading as soon as we receive any data
            // This ensures data is displayed immediately, even if sensors show zero values
            setIsLoading(false);
        });

        // Set a timeout to stop loading even if no data is received
        const loadingTimeout = setTimeout(() => {
            setIsLoading(false);
            setIsConnecting(false);
        }, 10000); // 10 seconds timeout

        return () => {
            if (throttleTimer) clearTimeout(throttleTimer);
            clearTimeout(loadingTimeout);
            clientSocket.off("robot:subscribe");
            clientSocket.emit(
                "robot:unsubscribe",
                { macId: selectedRobot?.macAddress },
                (data: { result: string; macId: string }) =>
                    console.log("unsub callback", data)
            );
        };
    }, [clientSocket, selectedRobot?.macAddress]);

    // Show loading screen only if ignition is on and we're still loading/connecting
    if (isIgnitionOn && (isLoading || isConnecting)) {
        return (
            <>
                <Header
                    onBack={() => navigate(-1)}
                    title={
                        <div className="flex items-center gap-6">
                            <h2>{selectedRobot?.name || "MMR"}</h2>
                            <MdPowerSettingsNew className="h-6 w-6 text-primary600" />
                        </div>
                    }
                />
                <LoadingScreen isConnecting={isConnecting} />
            </>
        );
    }

    return (
        <>
            <Header
                onBack={() => navigate(-1)}
                title={
                    <div className="flex items-center gap-6">
                        <h2>{selectedRobot?.name || "MMR"}</h2>
                        <MdPowerSettingsNew
                            className={`h-6 w-6 ${ignition ? "text-primary600" : "text-red-500"}`}
                        />
                    </div>
                }
            />
            <main className="mx-auto flex flex-col bg-blue-900/25 p-6 ">
                <div className="grid w-full grid-cols-4 gap-6">
                    <div className="col-span-4 col-start-1 row-start-1 sm:col-span-2 md:col-span-1">
                        <CircularProgressBar
                            percentage={
                                +((leftCytronTemp / 65) * 100).toFixed(0)
                            }
                            value={leftCytronTemp.toFixed(1)}
                            thresholdColor={
                                leftCytronTemp > 55 ? "#FF0000" : undefined
                            }
                            units="°C"
                            title="Left cytron temp"
                        />
                    </div>
                    <div className="col-span-4 row-start-2 sm:col-span-2 sm:col-start-3 sm:row-start-1 md:col-span-1 md:col-start-2">
                        <CircularProgressBar
                            percentage={
                                +((rightCytronTemp / 65) * 100).toFixed(0)
                            }
                            thresholdColor={
                                rightCytronTemp > 55 ? "#FF0000" : undefined
                            }
                            value={rightCytronTemp.toFixed(1)}
                            units="°C"
                            title="Right cytron temp"
                        />
                    </div>
                    <div className="col-span-4 col-start-1 row-start-3 sm:col-span-2 sm:row-start-2 md:col-span-1 md:col-start-3 md:row-start-1">
                        <CircularProgressBar
                            percentage={+((speed / 30) * 100).toFixed(0)}
                            value={speed.toFixed(1)}
                            units="kmph"
                            title="Speed"
                        />
                    </div>
                    <div className="col-span-4 row-start-4 sm:col-span-2 sm:col-start-3 sm:row-start-2 md:col-span-1 md:col-start-4 md:row-start-1">
                        <CircularProgressBar
                            percentage={batteryPercentage}
                            value={batteryPercentage.toFixed(1)}
                            thresholdColor={
                                batteryPercentage < 25 ? "#FF0000" : undefined
                            }
                            units="%"
                            title="Battery"
                        />
                    </div>
                    <div className="col-span-4 row-start-5 sm:col-span-2 sm:col-start-1 sm:row-start-3 md:col-span-2 md:row-start-2">
                        <StatsCard title="Battery">
                            <StatItem stat="Current" value={batteryCurrent} />
                            <StatItem stat="State" value={batteryState} />
                            <StatItem
                                stat="Max cell voltage"
                                value={batteryMaxCellVoltage}
                            />
                            <StatItem
                                stat="Min cell voltage"
                                value={batteryMinCellVoltage}
                            />
                        </StatsCard>
                    </div>
                    <div className="col-span-4 row-start-6 sm:col-span-2 sm:col-start-3 sm:row-start-3 md:col-span-2 md:row-start-3">
                        <StatsCard title="State">
                            <StatItem stat="Throttle" value={throtte} />
                            <StatItem stat="Steering" value={steering} />
                            <StatItem stat="Actuator" value={actuator} />
                            <StatItem stat="Light" value={light} />
                        </StatsCard>
                    </div>
                    <div className="col-span-4 row-start-7 sm:col-span-2 sm:col-start-1 sm:row-start-4 md:col-span-2 md:row-start-4">
                        <StatsCard title="Material movement">
                            <StatItem
                                stat="Voltage"
                                value={mmrVoltage}
                                valueClassname={
                                    sensorData?.mmrVoltage &&
                                    sensorData?.mmrVoltage < 25
                                        ? "text-red-500"
                                        : ""
                                }
                            />
                            <StatItem stat="Current" value={mmrCurrent} />
                            <StatItem stat="Power" value={mmrPower} />
                            <StatItem stat="Peak power" value={mmrPeakPower} />
                            <StatItem stat="Weight" value={weight} />
                            <StatItem stat="Distance" value={distance} />
                        </StatsCard>
                    </div>
                    <div className="col-span-4 row-start-8 sm:col-span-2 sm:col-start-3 sm:row-start-4 md:col-span-2 md:row-start-5">
                        <StatsCard title="Barometer">
                            <StatItem
                                stat="Temperature"
                                value={bmpTemperature}
                            />
                            <StatItem stat="Altitude" value={bmpAltitude} />
                        </StatsCard>
                    </div>
                    <div className="col-span-4 row-start-9 min-h-[350px] sm:col-span-2 sm:col-start-1 sm:row-start-5 md:col-span-2 md:col-start-3 md:row-span-2 md:row-start-2">
                        <ManualMissionMap
                            lat={sensorData?.ggaDataLatitude}
                            lng={sensorData?.ggaDataLongitude}
                        />
                    </div>
                    <div className="col-span-4 row-start-10 min-h-[350px] sm:col-span-2 sm:col-start-3 sm:row-start-5 md:col-span-2 md:col-start-3 md:row-span-2 md:row-start-4">
                        <ErrorList errors={errors} />
                    </div>
                </div>
            </main>
        </>
    );
});

const ErrorList = ({ errors }: { errors: string[] }) => {
    return (
        <StatsCard
            title="Battery Errors"
            className="flex h-[350px] flex-col divide-y divide-background overflow-y-auto rounded-md bg-backgroundGray/30"
        >
            {errors.length ? (
                errors.map((error) => <div key={error}>{error}</div>)
            ) : (
                <div className="">No Errors</div>
            )}
        </StatsCard>
    );
};

const StatsCard = ({
    title,
    children,
    className
}: {
    title: string;
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <div
            className={cn(
                "flex h-full flex-col divide-y divide-background rounded-md bg-backgroundGray/30",
                className
            )}
        >
            <div className="p-2 px-4 text-lg font-medium">{title}</div>
            <div className="flex flex-col gap-2 p-2 px-4">{children}</div>
        </div>
    );
};

const StatItem = ({
    stat,
    value,
    valueClassname
}: {
    stat: string;
    value: string;
    valueClassname?: string;
}) => {
    return (
        <div className="flex w-full">
            <span className="w-[70%]">{stat}</span>
            <span className={cn("w-[30%]", valueClassname)}>: {value}</span>
        </div>
    );
};

export default LiveDataDashboard;
