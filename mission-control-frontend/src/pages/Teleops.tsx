import { useEffect, useRef, useState } from "react";
import {
    MdCancel,
    MdDragIndicator,
    MdOutlineWebAsset,
    MdOutlineWebAssetOff,
    MdPlayArrow,
    MdSlowMotionVideo,
    MdStop,
    MdSwapVert,
    MdVideocam,
    MdVideogameAsset,
    MdVideogameAssetOff
} from "react-icons/md";
import { TbRobot, TbRobotOff } from "react-icons/tb";
import Draggable from "react-draggable";
import { useRobotStore } from "../stores/robotStore";
import { FaRobot } from "react-icons/fa";
import RobotLaunchPad from "../features/robots/robotLaunchPad/RobotLaunchPad";
import { useUserStore } from "../stores/userStore";
import { ESwapScreenStatus } from "../data/types";
import SonarIndicator from "../features/teleops/components/SonarIndicator";
import JoystickPublisher from "../features/teleops/components/JoystickPublisher";
import MetricsPanel from "../features/teleops/components/MetricsPanel";
import SmIconButton from "../components/ui/SmIconButton";
import useMissionCommands from "../features/missionControl/hooks/useMissionCommands";
import Janus from "janus-gateway";
import { useTeleStore } from "../stores/teleStore";
import { useJanusStore } from "../stores/janusStore";
import { useMissionsStore } from "../stores/missionsStore";
import MissionsView from "../features/missions/MissionsView";
import { useRosFns } from "../lib/ros/useRosFns";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { useShallow } from "zustand/react/shallow";

type TeleopsProps = {
    floatingWindow?: boolean;
};

/**
 *
 * This page will display all the teleops operations to remotely control an edge
 *
 */
const Teleops = ({ floatingWindow = false }: TeleopsProps) => {
    const [showMissionPlannerPanel, setShowMissionPlannerPanel] =
        useState(true);
    const [isGamepadEnabled, setIsGamepadEnabled] = useState(false);
    const [showMetrics, setShowMetrics] = useState(false);
    const [showLaunchPad, setShowLaunchPad] = useState(false);
    const setSwapScreenStatus = useUserStore(
        (state) => state.setSwapScreenStatus
    );
    const [streams, streamBitrates] = useTeleStore((state) => [
        state.streams,
        state.streamBitrates
    ]);
    const { rosSubscribe } = useRosFns();
    const { abortMission, startTeleSession, stopTeleSession } =
        useMissionCommands();
    const [tcpOnly, setTcpOnly, isRobotConnected] = useRobotStore((state) => [
        state.tcpOnly,
        state.setTcpOnly,
        state.isRobotConnected
    ]);
    const [isJanusFeedSubscriber, isJanusDataPeerActive] = useJanusStore(
        (state) => [state.isJanusFeedSubscriber, state.isJanusDataPeerActive]
    );

    const [
        isMissionExecuting,
        isTeleoperating,
        setIsTeleoperating,
        isLoadingTeleop,
        pathMap,
        mission
    ] = useMissionsStore(
        useShallow((state) => [
            state.isMissionExecuting,
            state.isTeleoperating,
            state.setIsTeleoperating,
            state.isLoadingTeleop,
            state.pathMap,
            state.mission
        ])
    );
    const videoRef1 = useRef<HTMLVideoElement>(null!);
    const missionPanelRef = useRef(null);
    const metricsPanelRef = useRef(null);

    const missionPlannerPanelHandler = () => {
        setShowMissionPlannerPanel((prev) => !prev);
    };

    /**
     * Displays metrics
     */
    const metricsHandler = () => {
        setShowMetrics((prev) => !prev);
    };

    /**
     * Use gamepad
     */
    const gamepadHandler = () => {
        setIsGamepadEnabled((prev) => !prev);
    };

    /**
     *  Opens Launch Pad Window
     */
    const launchPadHandler = () => {
        setShowLaunchPad((prev) => !prev);
    };

    /**
     * Closes Launch Pad window
     */
    const closeLaunchPadHandler = () => {
        setShowLaunchPad(false);
    };

    /**
     * Listens to data from edge
     */

    useEffect(() => {
        if (streams["0"]) {
            Janus.attachMediaStream(videoRef1.current, streams["0"]);
        }
    }, [streams]);

    useEffect(() => {
        const robotModeListener = rosSubscribe(
            "/mmr/mode/change",
            "mmr/msg/ModeChange",
            {
                queue_length: 1,
                queue_size: 1
            }
        );
        if (isTeleoperating) {
            robotModeListener?.subscribe((message: any) => {
                if (message.mode !== 2 && message.trigger === "system") {
                    toast.warn("Teleop session ended due to inactivity.", {
                        position: "top-right",
                        autoClose: false,
                        hideProgressBar: true,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                        progress: undefined,
                        theme: "colored"
                    });
                    robotModeListener.unsubscribe();
                    setIsTeleoperating(false);
                } else if (message.mode !== 2 && message.trigger === "local") {
                    toast.warn("Local Teleoperation has taken control", {
                        position: "top-right",
                        autoClose: false,
                        hideProgressBar: true,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                        progress: undefined,
                        theme: "colored"
                    });
                    robotModeListener.unsubscribe();
                    setIsTeleoperating(false);
                }
            });
        }

        return () => {
            robotModeListener?.unsubscribe();
        };
    }, [isTeleoperating, isRobotConnected]);

    return (
        <>
            <div
                className={`text-md flex h-[100%] flex-col overflow-hidden bg-background text-white transition-transform  duration-200`}
            >
                {!floatingWindow ? (
                    <>
                        <SonarIndicator />
                        {showLaunchPad ? (
                            <RobotLaunchPad
                                onCloseLaunchPad={closeLaunchPadHandler}
                            />
                        ) : (
                            <></>
                        )}
                        <div
                            className={`relative h-[100vh] ${
                                showLaunchPad ? "w-[75vw]" : "w-full"
                            } `}
                        >
                            {showMetrics && (
                                <Draggable
                                    nodeRef={metricsPanelRef}
                                    handle=".metricsHandle"
                                    bounds="parent"
                                >
                                    <div
                                        ref={metricsPanelRef}
                                        className=" pointer-events-auto absolute right-5 top-72 z-50  w-[80vw] rounded-md border-2 border-border bg-backgroundGray xs:w-[60vw] sm:w-[35vw] md:w-[35vw] lg:w-[25vw] xl:w-[20vw]"
                                    >
                                        <div className="metricsHandle  flex cursor-move   items-center justify-between px-2 py-1.5">
                                            <span className="text-xs  text-white md:text-sm">
                                                Metrics Panel
                                            </span>
                                            <span className="flex items-center gap-x-2">
                                                <MdDragIndicator className="metricsHandle cursor-move" />
                                            </span>
                                        </div>
                                        <div className="h-full w-full rounded-b-md">
                                            <MetricsPanel />
                                        </div>
                                    </div>
                                </Draggable>
                            )}

                            {showMissionPlannerPanel && (
                                <Draggable
                                    nodeRef={missionPanelRef}
                                    handle=".missionHandle"
                                    bounds="parent"
                                >
                                    <div
                                        ref={missionPanelRef}
                                        className=" pointer-events-auto absolute left-5 top-16 z-20 w-[50vw] resize overflow-hidden rounded-md  bg-blue-900/30 xs:w-[40vw] sm:w-[20vw] md:w-[18vw]"
                                    >
                                        <div className="missionHandle  flex cursor-move   items-center justify-between px-2 py-1.5">
                                            <span className="text-xs  text-white md:text-sm">
                                                Mission Control
                                            </span>
                                            <span className="z-30 flex items-center gap-x-2">
                                                <MdSwapVert
                                                    onTouchStart={() => {
                                                        setSwapScreenStatus(
                                                            ESwapScreenStatus.MISSIONCONTROL
                                                        );
                                                    }}
                                                    onClick={() => {
                                                        setSwapScreenStatus(
                                                            ESwapScreenStatus.MISSIONCONTROL
                                                        );
                                                    }}
                                                    className="cursor-pointer"
                                                />
                                                <MdDragIndicator className="missionHandle cursor-move" />
                                            </span>
                                        </div>
                                        <div className="flex h-full w-full rounded-b-md ">
                                            <div className="flex h-full w-full">
                                                <MissionsView />
                                            </div>
                                        </div>
                                    </div>
                                </Draggable>
                            )}

                            <video
                                className="-z-50 h-full w-full bg-black"
                                ref={videoRef1}
                                autoPlay
                                muted
                            ></video>

                            {isTeleoperating && (
                                <JoystickPublisher
                                    isGamepadEnabled={isGamepadEnabled}
                                />
                            )}
                        </div>
                        <header
                            className={`fixed top-0 bg-gray-800 bg-opacity-50 px-5 py-4 transition-all duration-300  ${
                                showLaunchPad ? "md:w-[75vw]" : "w-full"
                            }`}
                        >
                            <div className="flex items-center justify-end text-white">
                                <div className="flex items-center gap-x-2">
                                    {isMissionExecuting ? (
                                        <>
                                            <div className="flex w-full items-center justify-between">
                                                <SmIconButton
                                                    name="Abort Mission"
                                                    onClick={() => {
                                                        if (
                                                            mission &&
                                                            pathMap
                                                        ) {
                                                            abortMission(
                                                                `${pathMap.id}-${mission._id}`
                                                            );
                                                        } else {
                                                            abortMission();
                                                        }
                                                    }}
                                                    className="whitespace-nowrap bg-red-400"
                                                >
                                                    <MdCancel className="text-white" />
                                                </SmIconButton>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {!isTeleoperating ? (
                                                <button
                                                    onClick={() => {
                                                        startTeleSession();
                                                    }}
                                                    className={`flex items-center gap-x-2 rounded-md border border-primary700 bg-primary700 p-2 font-semibold text-white hover:scale-95 md:px-3`}
                                                >
                                                    <span className="hidden  text-xs md:block">
                                                        Start Teleoperation
                                                    </span>
                                                    {isLoadingTeleop ? (
                                                        <LoadingSpinner className="h-3 w-3 animate-spin fill-white text-background" />
                                                    ) : (
                                                        <MdPlayArrow />
                                                    )}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        stopTeleSession();
                                                    }}
                                                    className={`flex items-center gap-x-2 rounded-md border border-red-400 bg-red-400 p-2 font-semibold text-white hover:scale-95 md:px-3`}
                                                >
                                                    <span className="hidden  text-xs md:block">
                                                        Stop Teleoperation
                                                    </span>
                                                    {isLoadingTeleop ? (
                                                        <LoadingSpinner className="h-3 w-3 animate-spin fill-white text-background" />
                                                    ) : (
                                                        <MdStop />
                                                    )}
                                                </button>
                                            )}
                                        </>
                                    )}
                                    {isJanusFeedSubscriber &&
                                    streamBitrates["0"] ? (
                                        <div
                                            className={`flex items-center justify-between gap-x-2 rounded-md border text-white `}
                                        >
                                            <div className="flex items-center gap-x-2">
                                                <span className="flex min-w-[6rem] items-center justify-center  whitespace-nowrap px-2 py-2 text-xs">
                                                    {streamBitrates["0"]}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <></>
                                    )}
                                    {isJanusFeedSubscriber ? (
                                        <div
                                            onClick={() => {
                                                setTcpOnly(!tcpOnly);
                                            }}
                                            className={`flex cursor-pointer items-center justify-between gap-x-2 rounded-md border px-2 py-2 text-white `}
                                        >
                                            <div className=" flex items-center gap-x-2">
                                                <MdVideocam className="text-primary700" />
                                                <span className="whitespace-nowrap text-xs">
                                                    {`${
                                                        tcpOnly ? "TCP" : "UDP"
                                                    }`}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => {
                                                setTcpOnly(!tcpOnly);
                                            }}
                                            className={`flex cursor-pointer items-center gap-x-2 rounded-md border px-2 py-2 text-white `}
                                        >
                                            <MdVideocam className="text-red-500" />
                                            <span className="whitespace-nowrap text-xs">
                                                {`${tcpOnly ? "TCP" : "UDP"}`}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex">
                                        <div className="group relative">
                                            {showMetrics ? (
                                                <button
                                                    className={` flex items-center gap-x-2  rounded-l-md border-b border-l-[0.25px] border-t px-2 py-2 text-white `}
                                                    onClick={metricsHandler}
                                                >
                                                    <MdOutlineWebAsset />
                                                </button>
                                            ) : (
                                                <button
                                                    className={` flex items-center gap-x-2  rounded-l-md border-b border-l-[0.25px] border-t px-2  py-2 `}
                                                    onClick={metricsHandler}
                                                >
                                                    <MdOutlineWebAssetOff />
                                                </button>
                                            )}
                                            <span className="invisible absolute mt-1 whitespace-nowrap rounded-md bg-backgroundGray px-2 py-2  text-xs group-hover:visible">
                                                Metrics Panel
                                            </span>
                                        </div>

                                        <div className="group relative">
                                            {isGamepadEnabled ? (
                                                <button
                                                    className={`flex items-center gap-x-2  border-b border-l-[0.25px] border-t px-2 py-2  `}
                                                    onClick={gamepadHandler}
                                                >
                                                    <MdVideogameAsset
                                                        className={`${
                                                            tcpOnly
                                                                ? isRobotConnected
                                                                    ? "text-green-400"
                                                                    : "text-red-400"
                                                                : isJanusDataPeerActive
                                                                  ? "text-green-400"
                                                                  : "text-red-400"
                                                        }`}
                                                    />
                                                </button>
                                            ) : (
                                                <button
                                                    className={`flex items-center gap-x-2  border-b border-l-[0.25px] border-t px-2 py-2`}
                                                    onClick={gamepadHandler}
                                                >
                                                    <MdVideogameAssetOff />
                                                </button>
                                            )}
                                            <span className="invisible absolute mt-1 whitespace-nowrap rounded-md bg-backgroundGray px-2 py-2  text-xs group-hover:visible">
                                                Joystick Panel
                                            </span>
                                        </div>
                                        <div className="group relative">
                                            {showMissionPlannerPanel ? (
                                                <button
                                                    className={`flex items-center gap-x-2 rounded-r-md border-b border-l-[0.25px] border-r border-t px-2 py-2 `}
                                                    onClick={
                                                        missionPlannerPanelHandler
                                                    }
                                                >
                                                    <TbRobot />
                                                </button>
                                            ) : (
                                                <button
                                                    className={`flex items-center gap-x-2 rounded-r-md border-b border-l-[0.25px] border-r border-t px-2 py-2 `}
                                                    onClick={
                                                        missionPlannerPanelHandler
                                                    }
                                                >
                                                    <TbRobotOff />
                                                </button>
                                            )}
                                            <span className="invisible absolute mt-1 whitespace-nowrap rounded-md bg-backgroundGray px-2 py-2  text-xs group-hover:visible">
                                                Mission Panel
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={launchPadHandler}
                                        className={`flex items-center gap-x-2 rounded-md border p-2 font-medium text-white hover:border-primary700 hover:bg-primary700 md:px-3 ${
                                            showLaunchPad
                                                ? "border-primary700 bg-primary700"
                                                : ""
                                        }`}
                                    >
                                        <span className="hidden  text-xs md:block">
                                            Launchpad
                                        </span>
                                        <FaRobot />
                                    </button>
                                </div>
                            </div>
                        </header>
                    </>
                ) : (
                    <div className="h-full w-full">
                        <video
                            className=" h-full w-full bg-black"
                            ref={videoRef1}
                            autoPlay
                            muted
                        ></video>
                    </div>
                )}
            </div>
        </>
    );
};
export default Teleops;
