import { useCallback, useEffect, useState } from "react";
import { HiLightningBolt } from "react-icons/hi";
import { toast } from "react-toastify";
import { useRosFns } from "../../../lib/ros/useRosFns";
import { useRobotConfigStore } from "../../../stores/robotConfigStore";
import useBotActions from "../hooks/useBotActions";
import { useRobotStore } from "../../../stores/robotStore";
import { MdRefresh } from "react-icons/md";
import { useJanusStore } from "../../../stores/janusStore";

enum RobotMode {
    "IDLE" = 0,
    "LOCAL TELEOP" = 1,
    "INTERNET TELEOP" = 2,
    "WAYPOINT MISSION" = 3,
    "PATH MISSION" = 4
}

type RobotModeMessage = {
    mode: number;
    trigger: string;
};

const MetricsPanel = () => {
    const [metrics, setMetrics] = useState<{
        pivot?: boolean;
        rfOperated?: boolean;
        contactorStatus?: boolean;
        leftMotorDriverTemp?: number;
        rightMotorDriverTemp?: number;
        battery?: number;
        batteryTemp?: number;
        mode?: number;
    }>();

    const [isTrajectoryEnabled, setIsTrajectoryEnabled] = useState(false);
    const [isOgmEnabled, setIsOgmEnabled] = useState(false);
    const [isBatteryCharging, setIsBatteryCharging] = useState(false);

    const [deckHeight, setDeckHeight] = useState("");
    const [robotFleetType, isRobotConnected] = useRobotStore((state) => [
        state.robot?.fleet?.prefix,
        // state.robot?.fleet?.name,

        state.isRobotConnected
    ]);
    const { rosSubscribe, rosServiceCaller } = useRosFns();
    const { pivotRobot } = useBotActions();
    const [isAvoidObstacle, setIsAvoidObstacle] = useRobotConfigStore(
        (state) => [state.isAvoidObstacle, state.setIsAvoidObstacle]
    );

    useEffect(() => {
        const pivotStateListener = rosSubscribe(
            "/pivot_status",
            "std_msgs/msg/Bool",
            {
                throttle_rate: 200,
                queue_length: 1,
                queue_size: 1
            }
        );
        const rfOperationStateListener = rosSubscribe(
            "/rf_operated",
            "std_msgs/msg/Bool",
            {
                queue_length: 1,
                queue_size: 1
            }
        );
        const contactorStateListener = rosSubscribe(
            "/mmr/contactor/status",
            "std_msgs/msg/Bool",
            {
                queue_length: 1,
                queue_size: 1
            }
        );
        const leftMotorTempListener = rosSubscribe(
            "/cytron/temp/left",
            "sensor_msgs/msg/Temperature",
            {
                throttle_rate: 1000,
                queue_length: 1,
                queue_size: 1
            }
        );
        const rightMotorTempListener = rosSubscribe(
            "/cytron/temp/right",
            "sensor_msgs/msg/Temperature",
            {
                throttle_rate: 1000,
                queue_length: 1,
                queue_size: 1
            }
        );
        const batteryListener = rosSubscribe(
            "/battery",
            "sensor_msgs/msg/BatteryState",
            {
                throttle_rate: 1000,
                queue_length: 1,
                queue_size: 1
            }
        );
        const robotModeListener = rosSubscribe(
            "/mmr/mode/change",
            "mmr/msg/ModeChange",
            {
                queue_length: 1,
                queue_size: 1
            }
        );

        pivotStateListener?.subscribe((message: any) => {
            setMetrics((prevMetrics) => ({
                ...prevMetrics,
                pivot: message?.data
            }));
        });
        rfOperationStateListener?.subscribe((message: any) => {
            setMetrics((prevMetrics) => ({
                ...prevMetrics,
                rfOperated: message.data
            }));
        });
        contactorStateListener?.subscribe((message: any) => {
            setMetrics((prevMetrics) => ({
                ...prevMetrics,
                contactorStatus: message.data
            }));
        });
        leftMotorTempListener?.subscribe((message: any) => {
            if (message) {
                setMetrics((prevMetrics) => ({
                    ...prevMetrics,
                    leftMotorDriverTemp: message.temperature
                }));
            }
        });
        rightMotorTempListener?.subscribe((message: any) => {
            if (message) {
                setMetrics((prevMetrics) => ({
                    ...prevMetrics,
                    rightMotorDriverTemp: message.temperature
                }));
            }
        });
        batteryListener?.subscribe((message: any) => {
            if (message?.percentage) {
                setMetrics((prevMetrics) => ({
                    ...prevMetrics,
                    battery: message.percentage
                }));
            }

            if (message?.power_supply_status == 1) {
                setIsBatteryCharging(true);
            } else {
                setIsBatteryCharging(false);
            }

            if (message.cell_temperature) {
                let sumOfTemp = 0;
                message.cell_temperature.forEach((temp: number) => {
                    sumOfTemp += temp;
                });
                const avgTemp =
                    Math.round(
                        (sumOfTemp / message.cell_temperature.length) * 100
                    ) / 100;

                setMetrics((prevMetrics) => ({
                    ...prevMetrics,
                    batteryTemp: avgTemp
                }));
            }
        });
        robotModeListener?.subscribe((message: any) => {
            const robotMessage = message as RobotModeMessage;
            if (robotMessage.mode.toString()) {
                setMetrics((prevMetrics) => ({
                    ...prevMetrics,
                    mode: robotMessage.mode
                }));
            }
        });

        isAnnotationEnabled();

        return () => {
            pivotStateListener?.unsubscribe();
            contactorStateListener?.unsubscribe();
            rfOperationStateListener?.unsubscribe();
            leftMotorTempListener?.unsubscribe();
            rightMotorTempListener?.unsubscribe();
            batteryListener?.unsubscribe();
            robotModeListener?.unsubscribe();
            setMetrics(undefined);
        };
    }, [isRobotConnected]);

    const enableTrajectoryVisualization = () => {
        rosServiceCaller(
            "/annotate/cmd_vel",
            "flo_msgs/srv/Enable",
            (result: { message: string; success: boolean }) => {
                if (result.success) {
                    setIsTrajectoryEnabled(true);
                } else {
                    toast.error(result.message);
                }
            },
            (error) => {
                console.log(error);
            },
            {
                enable: true
            }
        );
    };

    const disableTrajectoryVisualization = () => {
        rosServiceCaller(
            "/annotate/cmd_vel",
            "flo_msgs/srv/Enable",
            (result: { message: string; success: boolean }) => {
                if (result.success) {
                    setIsTrajectoryEnabled(false);
                } else {
                    toast.error(result.message);
                }
            },
            (error) => {
                console.log(error);
            },
            {
                enable: false
            }
        );
    };

    const enableOccupancyGridMapVisualization = () => {
        rosServiceCaller(
            "/annotate/ogm",
            "flo_msgs/srv/Enable",
            (result: { message: string; success: boolean }) => {
                if (result.success) {
                    console.log("Enable ogm", result.message);
                    setIsOgmEnabled(true);
                } else {
                    toast.error(result.message);
                }
            },
            (error) => {
                console.log(error);
            },
            {
                enable: true
            }
        );
    };

    const disableOccupancyGridMapVisualization = () => {
        rosServiceCaller(
            "/annotate/ogm",
            "flo_msgs/srv/Enable",
            (result: { message: string; success: boolean }) => {
                if (result.success) {
                    console.log("Disable ogm", result.message);
                    setIsOgmEnabled(false);
                } else {
                    toast.error(result.message);
                }
            },
            (error) => {
                console.log(error);
            },
            {
                enable: false
            }
        );
    };

    const isAnnotationEnabled = () => {
        rosServiceCaller(
            "/annotate/status",
            "flo_msgs/srv/GetAnnotationStatus",
            (result: { trajectory: boolean; ogm: boolean; path: boolean }) => {
                console.log(result);
                setIsOgmEnabled(result.ogm);
                setIsTrajectoryEnabled(result.trajectory);
            },
            (error) => {
                console.log(error);
            }
        );
    };

    const obstacleAvoidanceHandler = () => {
        setIsAvoidObstacle(!isAvoidObstacle);
    };

    const pivotStateHandler = useCallback(() => {
        if (metrics?.pivot) {
            pivotRobot({
                data: false
            });
        } else {
            pivotRobot({
                data: true
            });
        }
    }, [metrics?.pivot]);

    return (
        <div className="flex flex-col gap-y-1 bg-transparent px-2 py-1.5 text-xs text-white md:text-sm sm:px-3 sm:py-2">
            <div className="mb-1 border-b border-white/20 py-1 text-sm font-medium text-white sm:text-base">General</div>

            <div className="flex items-center ">
                <span className="w-[50%] whitespace-nowrap  text-left text-neutral-400">
                    Mode
                </span>
                <span className="mx-1">{": "}</span>

                <span className="whitespace-nowrap">
                    {metrics?.mode?.toString()
                        ? RobotMode[metrics.mode]
                        : "No data"}
                </span>
            </div>
            {/* Obstacle Avoidance - stashed for now
             <div className="flex items-center">
                <span className="no-scrollbar w-[50%] overflow-x-scroll whitespace-nowrap text-neutral-400">
                    Obstacle Avoidance
                </span>
                <span className="mx-1">{": "}</span>

                <div className="flex flex-1 items-center justify-between  gap-x-2">
                    <span>{isAvoidObstacle ? "Active" : "Inactive"}</span>
                    <span> 
                        <button
                            onClick={obstacleAvoidanceHandler}
                            className="flex w-16 cursor-pointer items-center justify-center rounded-md bg-primary700 px-2 py-1  text-xs font-semibold   hover:scale-[98%] "
                        >
                            Toggle
                        </button>
                    </span>
                </div>
            </div> */}
            <div className="flex items-center">
                <span className="w-[50%] whitespace-nowrap  text-left text-neutral-400">
                    Battery
                </span>
                <span className="mx-1">{": "}</span>

                <span className="whitespace-nowrap">
                    {metrics?.battery?.toString()
                        ? metrics?.battery?.toFixed(2) + "%"
                        : "No data"}
                </span>
                {isBatteryCharging && (
                    <HiLightningBolt
                        size={10}
                        className="mx-1 animate-pulse"
                        color="white"
                    />
                )}
            </div>
            <div className="flex items-center ">
                <span className="w-[50%] whitespace-nowrap  text-left text-neutral-400">
                    Battery Temperature
                </span>
                <span className="mx-1">{": "}</span>

                <span className="whitespace-nowrap">
                    {metrics?.batteryTemp?.toString()
                        ? metrics?.batteryTemp?.toString() + "°C"
                        : "No data"}
                </span>
            </div>

            {robotFleetType === "MMR" ? (
                <>
                    <div className="mb-1 border-b border-white/20 py-1 text-sm font-medium text-white sm:text-base">
                        Material Movement
                    </div>
                    {/* Pivot- Stashed for now 
                    <div className="flex items-center overflow-hidden">
                        <span className="no-scrollbar w-[50%] overflow-x-scroll whitespace-nowrap text-neutral-400">
                            Pivot
                        </span>
                        <span className="mx-1">{": "}</span>
                        <div className="flex flex-1 items-center justify-between  gap-x-2">
                            <span>
                                {metrics?.pivot ? "Active" : "Inactive"}
                            </span>
                            <span>
                                <button
                                    onClick={pivotStateHandler}
                                    className="flex w-16 cursor-pointer items-center justify-center rounded-md bg-primary700 px-2 py-1 text-center  text-xs font-semibold   hover:scale-[98%] "
                                >
                                    Toggle
                                </button>
                            </span>
                        </div>
                    </div> */}
                    <div className="flex items-center ">
                        <span className="w-[50%] whitespace-nowrap text-left text-neutral-400">
                            Left Motor Temp
                        </span>
                        <span className="mx-1">{": "}</span>

                        <span className="whitespace-nowrap">
                            {metrics?.leftMotorDriverTemp?.toString()
                                ? metrics?.leftMotorDriverTemp?.toString() +
                                  "°C"
                                : "No data"}
                        </span>
                    </div>
                    <div className="flex items-center ">
                        <span className="w-[50%] whitespace-nowrap  text-left text-neutral-400">
                            Right Motor Temp
                        </span>
                        <span className="mx-1">{": "}</span>

                        <span className="whitespace-nowrap">
                            {metrics?.rightMotorDriverTemp?.toString()
                                ? metrics?.rightMotorDriverTemp?.toString() +
                                  "°C"
                                : "No data"}
                        </span>
                    </div>
                    <div className="flex items-center overflow-hidden">
                        <span className="w-[50%] whitespace-nowrap text-neutral-400 ">
                            Contactor Status
                        </span>
                        <span className="mx-1">{": "}</span>
                        <div className="flex flex-1 items-center justify-between  gap-x-2">
                            <span>
                                {metrics?.contactorStatus
                                    ? "Active"
                                    : "Inactive"}
                            </span>
                        </div>
                    </div>
                    {/* Rf Operated- Stashed for now
                    <div className="flex items-center overflow-hidden">
                        <span className="w-[50%] whitespace-nowrap text-neutral-400 ">
                            Rf operated
                        </span>
                        <span className="mx-1">{": "}</span>
                        <div className="flex flex-1 items-center justify-between  gap-x-2">
                            <span>
                                {metrics?.rfOperated ? "Active" : "Inactive"}
                            </span>
                        </div>
                    </div> */}

                    <div className="mb-1 border-b border-white/20 py-1 text-sm font-medium text-white sm:text-base">
                        Visualize
                    </div>
                    <div className="flex items-center overflow-hidden">
                        <span className="no-scrollbar w-[50%] overflow-x-scroll whitespace-nowrap text-neutral-400">
                            Trajectory
                        </span>
                        <div className="flex flex-1 items-center justify-between  gap-x-2">
                            <span>
                                {!isTrajectoryEnabled ? (
                                    <button
                                        onClick={enableTrajectoryVisualization}
                                        className="flex w-16 cursor-pointer items-center justify-center rounded-md bg-primary700 px-2 py-1 text-center  text-xs font-semibold   hover:scale-[98%] "
                                    >
                                        Enable
                                    </button>
                                ) : (
                                    <button
                                        onClick={disableTrajectoryVisualization}
                                        className="bg- flex w-16 cursor-pointer items-center justify-center rounded-md bg-red-500 px-2 py-1 text-center  text-xs font-semibold   hover:scale-[98%] "
                                    >
                                        Disable
                                    </button>
                                )}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center overflow-hidden">
                        <span className="no-scrollbar w-[50%] overflow-x-scroll whitespace-nowrap text-neutral-400">
                            Obstacle map
                        </span>
                        <div className="flex flex-1 items-center justify-between gap-x-2">
                            <span>
                                {!isOgmEnabled ? (
                                    <button
                                        onClick={
                                            enableOccupancyGridMapVisualization
                                        }
                                        className="flex w-16 cursor-pointer items-center justify-center rounded-md bg-primary700 px-2 py-1 text-center  text-xs font-semibold   hover:scale-[98%] "
                                    >
                                        Enable
                                    </button>
                                ) : (
                                    <button
                                        onClick={
                                            disableOccupancyGridMapVisualization
                                        }
                                        className="bg- flex w-16 cursor-pointer items-center justify-center  rounded-md bg-red-500 px-2 py-1 text-center  text-xs font-semibold   hover:scale-[98%] "
                                    >
                                        Disable
                                    </button>
                                )}
                            </span>
                        </div>
                    </div>
                    <div className="mb-1 border-b border-white/20 py-1 text-sm font-medium text-white sm:text-base">
                        Actions
                    </div>
                    {/* {robotFleetType !== "MMR" && <BladeHandler />} */}
                    <StreamingHandler />
                </>
            ) : (
                // <></>
                <>
                    <div className="mb-1 border-b border-white/20 py-1 text-sm font-medium text-white sm:text-base">
                        Material Movement
                    </div>
                    <div className="flex items-center ">
                        <span className="w-[50%] whitespace-nowrap text-left text-neutral-400">
                            Left Motor Temp
                        </span>
                        <span className="mx-1">{": "}</span>

                        <span className="whitespace-nowrap">
                            {metrics?.leftMotorDriverTemp?.toString()
                                ? metrics?.leftMotorDriverTemp?.toString() +
                                  "°C"
                                : "No data"}
                        </span>
                    </div>
                    <div className="flex items-center ">
                        <span className="w-[50%] whitespace-nowrap  text-left text-neutral-400">
                            Right Motor Temp
                        </span>
                        <span className="mx-1">{": "}</span>

                        <span className="whitespace-nowrap">
                            {metrics?.rightMotorDriverTemp?.toString()
                                ? metrics?.rightMotorDriverTemp?.toString() +
                                  "°C"
                                : "No data"}
                        </span>
                    </div>
                    <div className="flex items-center overflow-hidden">
                        <span className="w-[50%] whitespace-nowrap text-neutral-400 ">
                            Contactor Status
                        </span>
                        <span className="mx-1">{": "}</span>
                        <div className="flex flex-1 items-center justify-between  gap-x-2">
                            <span>
                                {metrics?.contactorStatus
                                    ? "Active"
                                    : "Inactive"}
                            </span>
                        </div>
                    </div>

                    <div className="mb-1 border-b border-white/20 py-1 text-sm font-medium text-white sm:text-base">
                        Visualize
                    </div>
                    <div className="flex items-center overflow-hidden">
                        <span className="no-scrollbar w-[50%] overflow-x-scroll whitespace-nowrap text-neutral-400">
                            Trajectory
                        </span>
                        <div className="flex flex-1 items-center justify-between  gap-x-2">
                            <span>
                                {!isTrajectoryEnabled ? (
                                    <button
                                        onClick={enableTrajectoryVisualization}
                                        className="flex w-16 cursor-pointer items-center justify-center rounded-md bg-primary700 px-2 py-1 text-center  text-xs font-semibold   hover:scale-[98%] "
                                    >
                                        Enable
                                    </button>
                                ) : (
                                    <button
                                        onClick={disableTrajectoryVisualization}
                                        className="bg- flex w-16 cursor-pointer items-center justify-center rounded-md bg-red-500 px-2 py-1 text-center  text-xs font-semibold   hover:scale-[98%] "
                                    >
                                        Disable
                                    </button>
                                )}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center overflow-hidden">
                        <span className="no-scrollbar w-[50%] overflow-x-scroll whitespace-nowrap text-neutral-400">
                            Obstacle map
                        </span>
                        <div className="flex flex-1 items-center justify-between gap-x-2">
                            <span>
                                {!isOgmEnabled ? (
                                    <button
                                        onClick={
                                            enableOccupancyGridMapVisualization
                                        }
                                        className="flex w-16 cursor-pointer items-center justify-center rounded-md bg-primary700 px-2 py-1 text-center  text-xs font-semibold   hover:scale-[98%] "
                                    >
                                        Enable
                                    </button>
                                ) : (
                                    <button
                                        onClick={
                                            disableOccupancyGridMapVisualization
                                        }
                                        className="bg- flex w-16 cursor-pointer items-center justify-center  rounded-md bg-red-500 px-2 py-1 text-center  text-xs font-semibold   hover:scale-[98%] "
                                    >
                                        Disable
                                    </button>
                                )}
                            </span>
                        </div>
                    </div>
                    <div className="mb-1 border-b border-white/20 py-1 text-sm font-medium text-white sm:text-base">
                        Actions
                    </div>
                    <BladeHandler />
                    <StreamingHandler />
                </>
            )}
        </div>
    );
};

const StreamingHandler = () => {
    // const [isStreaming, setIsStreaming] = useState(false);
    // const [isLoading, setIsLoading] = useState(false);
    // const { rosServiceCaller } = useRosFns();
    // const isStreamingButtonEnabled = useRobotConfigStore(
    //     (state) => state.isStreamingButtonEnabled
    // );

    // const toggleStreamingHandler = () => {
    //     rosServiceCaller(
    //         "/streaming/enable",
    //         "flo_msgs/srv/Enable",
    //         (result) => {
    //             console.log("stream enabled cb", result);
    //             checkStreamingStatus();
    //         },
    //         (error) => {
    //             console.log("stream enabled error", error);
    //         },
    //         {
    //             enable: !isStreaming
    //         }
    //     );
    // };

    // const checkStreamingStatus = () => {
    //     if (isLoading) return;
    //     setIsLoading(true);
    //     rosServiceCaller(
    //         "/streaming/status",
    //         "mmr/srv/StreamingStatus",
    //         (result: { streaming: boolean }) => {
    //             setIsLoading(false);
    //             setIsStreaming(result.streaming);
    //             console.log("stream status cb", result);
    //         },
    //         (error) => {
    //             setIsLoading(false);
    //             console.log("stream status error", error);
    //         }
    //     );
    // };

    const [isStreaming, setIsStreaming] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { rosServiceCaller } = useRosFns();

    const checkStreamingStatus = () => {
        setIsLoading(true);
        rosServiceCaller(
            "/streaming/status",
            "mmr/srv/StreamingStatus",
            (result) => {
                setIsStreaming(result.streaming);
                setIsLoading(false);
            },
            (error) => {
                setIsLoading(false);
                toast.error("Not connected to Robot");
            }
        );
    };

    // const toggleStreamingHandler = () => {
    //     setIsLoading(true);
    //     rosServiceCaller(
    //         "/streaming/enable",
    //         "flo_msgs/srv/Enable",
    //         () => checkStreamingStatus(),
    //         (error) => {
    //             setIsLoading(false);
    //             toast.error("Not connected to Robot");
    //         },
    //         { enable: !isStreaming }
    //     );
    // };

    const enableStreaming = () => {
        setIsLoading(true);
        rosServiceCaller(
            "/streaming/enable",
            "flo_msgs/srv/Enable",
            (result) => {
                // console.log("Streaming enabled:", result);
                // checkStreamingStatus();
                setIsStreaming(true);
                setIsLoading(false);
                toast.success("Streaming enabled");
                // Restart Janus subscriber to establish fresh connection
                useJanusStore.setState((state) => ({
                    restartSubscriber: !state.restartSubscriber
                }));
            },
            (error) => {
                setIsLoading(false);
                toast.error("Failed to enable streaming");
            },
            { enable: true }
        );
    };

    const disableStreaming = () => {
        setIsLoading(true);
        rosServiceCaller(
            "/streaming/enable",
            "flo_msgs/srv/Enable",
            (result) => {
                console.log("Streaming disabled:", result);
                checkStreamingStatus();
            },
            (error) => {
                setIsLoading(false);
                toast.error("Failed to disable streaming");
            },
            { enable: false }
        );
    };

    const toggleStreamingHandler = () => {
        if (isStreaming) {
            disableStreaming();
        } else {
            enableStreaming();
        }
    };

    useEffect(() => {
        checkStreamingStatus();
    }, []);

    return (
        <div className="flex items-center overflow-hidden">
            <span className="no-scrollbar w-[50%] overflow-x-scroll whitespace-nowrap text-neutral-400">
                Streaming
            </span>
            <div className="flex flex-1 items-center  gap-x-2">
                <button
                    onClick={toggleStreamingHandler}
                    // className="flex w-16 cursor-pointer  items-center justify-center rounded-md bg-primary700 px-2 py-1 text-center  text-xs font-semibold   hover:scale-[98%] "
                    className={`flex w-16 cursor-pointer items-center justify-center rounded-md px-2 py-1 text-center text-xs font-semibold hover:scale-[98%] ${
                        isStreaming
                            ? "bg-red-500 hover:bg-red-600"
                            : "hover:bg-primary800 bg-primary700"
                    }`}
                    disabled={isLoading}
                >
                    {/* {isStreaming ? "Enable" : "Disable"} */}
                    {isStreaming ? "Disable" : "Enable"}
                </button>
                <button
                    className="hover:scale-95"
                    onClick={checkStreamingStatus}
                    disabled={isLoading}
                >
                    <MdRefresh className={isLoading ? "animate-spin" : ""} />
                </button>
            </div>
        </div>
    );
};

const BladeHandler = () => {
    const { rosServiceCaller } = useRosFns();

    const enableBladeHandler = () => {
        console.log("enable blade");
        rosServiceCaller(
            "/blade/enable",
            "flo_msgs/srv/Enable",
            (result) => {
                console.log(result);
                toast.success("Blade enabled");
            },
            (error) => {
                console.log(error);
            },
            { enable: true }
        );
    };

    const disableBladeHandler = () => {
        console.log("disable blade");
        rosServiceCaller(
            "/blade/enable",
            "flo_msgs/srv/Enable",
            (result) => {
                console.log(result);
                toast.success("Blade disabled");
            },
            (error) => {
                console.log(error);
            },
            { enable: false }
        );
    };
    return (
        <>
            <div className="flex items-center overflow-hidden">
                <span className="no-scrollbar w-[50%] overflow-x-scroll whitespace-nowrap text-neutral-400">
                    Switch blade
                </span>
                <div className="flex flex-1 items-center justify-between gap-x-2">
                    <button
                        onClick={enableBladeHandler}
                        className="flex w-16 cursor-pointer items-center justify-center rounded-md bg-primary700 px-2 py-1 text-center  text-xs font-semibold   hover:scale-[98%] "
                    >
                        Enable
                    </button>
                </div>
            </div>
            <div className="flex items-center overflow-hidden">
                <span className="no-scrollbar w-[50%] overflow-x-scroll whitespace-nowrap text-neutral-400">
                    Switch blade
                </span>
                <div className="flex flex-1 items-center justify-between gap-x-2">
                    <button
                        onClick={disableBladeHandler}
                        className="flex w-16 cursor-pointer items-center justify-center rounded-md bg-red-500 px-2 py-1 text-center  text-xs font-semibold   hover:scale-[98%] "
                    >
                        Disable
                    </button>
                </div>
            </div>
        </>
    );
};

export default MetricsPanel;
