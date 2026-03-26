import { memo, useState } from "react";
import {
    MdCancel,
    MdOutlineWebAsset,
    MdOutlineWebAssetOff,
    MdPlayArrow,
    MdStop,
    MdVideocam,
    MdVideogameAsset,
    MdVideogameAssetOff,
    MdSlowMotionVideo,
    Md3DRotation
} from "react-icons/md";
import { TbRobot, TbRobotOff } from "react-icons/tb";
import { useRobotStore } from "../../../stores/robotStore";
import { useMissionsStore } from "../../../stores/missionsStore";
import { useTeleStore } from "../../../stores/teleStore";
import { useJanusStore } from "../../../stores/janusStore";
import useMissionCommands from "../../missionControl/hooks/useMissionCommands";
import SmIconButton from "../../../components/ui/SmIconButton";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { ExecuteMissionViaVoiceCommands } from "../../dashboard/configpad/pathMapPanel/ExecuteMissionViaVoice";

type TeleopsNavbarProps = {
    showVideoPanel: boolean;
    setShowVideoPanel: (show: boolean) => void;
    showMetrics: boolean;
    setShowMetrics: (show: boolean) => void;
    isGamepadEnabled: boolean;
    setIsGamepadEnabled: (enabled: boolean) => void;
    showMissionPlanner: boolean;
    setShowMissionPlanner: (show: boolean) => void;
    show3DMap?: boolean;
    setShow3DMap?: (show: boolean) => void;
};

const TeleopsNavbar = memo(({
    showVideoPanel,
    setShowVideoPanel,
    showMetrics,
    setShowMetrics,
    isGamepadEnabled,
    setIsGamepadEnabled,
    showMissionPlanner,
    setShowMissionPlanner,
    show3DMap,
    setShow3DMap
}: TeleopsNavbarProps) => {
    const [tcpOnly, setTcpOnly, isRobotConnected] = useRobotStore((state) => [
        state.tcpOnly,
        state.setTcpOnly,
        state.isRobotConnected
    ]);

    const [isMissionExecuting, isTeleoperating, isLoadingTeleop, pathMap, mission] =
        useMissionsStore((state) => [
            state.isMissionExecuting,
            state.isTeleoperating,
            state.isLoadingTeleop,
            state.pathMap,
            state.mission
        ]);

    const [streamBitrates] = useTeleStore((state) => [state.streamBitrates]);

    const [isJanusFeedSubscriber, isJanusDataPeerActive] = useJanusStore((state) => [
        state.isJanusFeedSubscriber,
        state.isJanusDataPeerActive
    ]);

    const { abortMission, startTeleSession, stopTeleSession } = useMissionCommands();

    const videoHandler = () => {
        setShowVideoPanel(!showVideoPanel);
    };

    const metricsHandler = () => {
        setShowMetrics(!showMetrics);
    };

    const gamepadHandler = () => {
        setIsGamepadEnabled(!isGamepadEnabled);
    };

    const missionPlannerHandler = () => {
        setShowMissionPlanner(!showMissionPlanner);
    };

    const map3DHandler = () => {
        if (setShow3DMap && show3DMap !== undefined) {
            setShow3DMap(!show3DMap);
        }
    };

    return (
        <header className="flex w-full items-center justify-center bg-transparent px-2 py-2 sm:px-5 sm:py-4">
            <div className="flex w-full items-center justify-end rounded-xl bg-gray-900/70 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/20 px-2 py-2 text-white sm:w-[95%] sm:rounded-2xl sm:px-5 sm:py-3">
                <div className="flex items-center gap-x-1 sm:gap-x-2">
                    {/* Mission Abort or Start/Stop Teleop */}
                    {isMissionExecuting ? (
                        <SmIconButton
                            name="Abort Mission"
                            onClick={() => {
                                if (mission && pathMap) {
                                    abortMission(`${pathMap.id}-${mission._id}`);
                                } else {
                                    abortMission();
                                }
                            }}
                            className="whitespace-nowrap bg-red-400"
                        >
                            <MdCancel className="text-white" />
                        </SmIconButton>
                    ) : (
                        <>
                            {!isTeleoperating ? (
                                <button
                                    onClick={startTeleSession}
                                    className="flex items-center gap-x-1 rounded-md border border-primary700 bg-primary700 p-1.5 text-xs font-semibold text-white hover:scale-95 sm:gap-x-2 sm:p-2 md:px-3"
                                >
                                    <span className="hidden md:block">
                                        Start Teleoperation
                                    </span>
                                    {isLoadingTeleop ? (
                                        <LoadingSpinner className="h-3 w-3 animate-spin fill-white text-background sm:h-4 sm:w-4" />
                                    ) : (
                                        <MdPlayArrow className="h-4 w-4 sm:h-5 sm:w-5" />
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={stopTeleSession}
                                    className="flex items-center gap-x-1 rounded-md border border-red-400 bg-red-400 p-1.5 text-xs font-semibold text-white hover:scale-95 sm:gap-x-2 sm:p-2 md:px-3"
                                >
                                    <span className="hidden md:block">
                                        Stop Teleoperation
                                    </span>
                                    {isLoadingTeleop ? (
                                        <LoadingSpinner className="h-3 w-3 animate-spin fill-white text-background sm:h-4 sm:w-4" />
                                    ) : (
                                        <MdStop className="h-4 w-4 sm:h-5 sm:w-5" />
                                    )}
                                </button>
                            )}
                        </>
                    )}

                    {/* Autonomy Voice Agent */}
                    <div className="flex items-center scale-75 sm:scale-90 md:scale-100">
                        <ExecuteMissionViaVoiceCommands />
                    </div>

                    {/* Stream Bitrate Display */}
                    {isJanusFeedSubscriber && streamBitrates["0"] && (
                        <div className="hidden items-center justify-between gap-x-2 rounded-md border text-white sm:flex">
                            <span className="flex min-w-[6rem] items-center justify-center whitespace-nowrap px-2 py-1.5 text-xs sm:py-2">
                                {streamBitrates["0"]}
                            </span>
                        </div>
                    )}

                    {/* TCP/UDP Toggle */}
                    {isJanusFeedSubscriber ? (
                        <div
                            onClick={() => setTcpOnly(!tcpOnly)}
                            className="flex cursor-pointer items-center justify-between gap-x-1 rounded-md border px-1.5 py-1.5 text-white sm:gap-x-2 sm:px-2 sm:py-2"
                        >
                            <div className="flex items-center gap-x-1 sm:gap-x-2">
                                <MdVideocam className="text-primary700 h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="whitespace-nowrap text-[10px] sm:text-xs">
                                    {tcpOnly ? "TCP" : "UDP"}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div
                            onClick={() => setTcpOnly(!tcpOnly)}
                            className="flex cursor-pointer items-center gap-x-1 rounded-md border px-1.5 py-1.5 text-white sm:gap-x-2 sm:px-2 sm:py-2"
                        >
                            <MdVideocam className="text-red-500 h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="whitespace-nowrap text-[10px] sm:text-xs">
                                {tcpOnly ? "TCP" : "UDP"}
                            </span>
                        </div>
                    )}

                    {/* Control Toggles Group */}
                    <div className="flex">
                        {/* Video Panel Toggle */}
                        <div className="group relative">
                            {showVideoPanel ? (
                                <button
                                    className="flex items-center gap-x-1 rounded-l-md border-b border-l-[0.25px] border-t px-1.5 py-1.5 text-white sm:px-2 sm:py-2"
                                    onClick={videoHandler}
                                >
                                    <MdSlowMotionVideo className="h-4 w-4 sm:h-5 sm:w-5" />
                                </button>
                            ) : (
                                <button
                                    className="flex items-center gap-x-1 rounded-l-md border-b border-l-[0.25px] border-t px-1.5 py-1.5 sm:px-2 sm:py-2"
                                    onClick={videoHandler}
                                >
                                    <MdSlowMotionVideo className="h-4 w-4 sm:h-5 sm:w-5" />
                                </button>
                            )}
                            <span className="invisible absolute mt-1 whitespace-nowrap rounded-md bg-backgroundGray px-2 py-1.5 text-[10px] group-hover:visible sm:py-2 sm:text-xs">
                                Video Panel
                            </span>
                        </div>

                        {/* Metrics Panel Toggle */}
                        <div className="group relative">
                            {showMetrics ? (
                                <button
                                    className="flex items-center gap-x-1 border-b border-l-[0.25px] border-t px-1.5 py-1.5 text-white sm:px-2 sm:py-2"
                                    onClick={metricsHandler}
                                >
                                    <MdOutlineWebAsset className="h-4 w-4 sm:h-5 sm:w-5" />
                                </button>
                            ) : (
                                <button
                                    className="flex items-center gap-x-1 border-b border-l-[0.25px] border-t px-1.5 py-1.5 sm:px-2 sm:py-2"
                                    onClick={metricsHandler}
                                >
                                    <MdOutlineWebAssetOff className="h-4 w-4 sm:h-5 sm:w-5" />
                                </button>
                            )}
                            <span className="invisible absolute mt-1 whitespace-nowrap rounded-md bg-backgroundGray px-2 py-1.5 text-[10px] group-hover:visible sm:py-2 sm:text-xs">
                                Metrics Panel
                            </span>
                        </div>

                        {/* Gamepad Toggle */}
                        <div className="group relative">
                            {isGamepadEnabled ? (
                                <button
                                    className="flex items-center gap-x-1 border-b border-l-[0.25px] border-t px-1.5 py-1.5 sm:px-2 sm:py-2"
                                    onClick={gamepadHandler}
                                >
                                    <MdVideogameAsset
                                        className={`h-4 w-4 sm:h-5 sm:w-5 ${
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
                                    className="flex items-center gap-x-1 border-b border-l-[0.25px] border-t px-1.5 py-1.5 sm:px-2 sm:py-2"
                                    onClick={gamepadHandler}
                                >
                                    <MdVideogameAssetOff className="h-4 w-4 sm:h-5 sm:w-5" />
                                </button>
                            )}
                            <span className="invisible absolute mt-1 whitespace-nowrap rounded-md bg-backgroundGray px-2 py-1.5 text-[10px] group-hover:visible sm:py-2 sm:text-xs">
                                Joystick Panel
                            </span>
                        </div>

                        {/* 3D Map Toggle - Only show when setShow3DMap is provided */}
                        {setShow3DMap && (
                            <div className="group relative">
                                {show3DMap ? (
                                    <button
                                        className="flex items-center gap-x-1 rounded-r-md border-b border-l-[0.25px] border-r border-t px-1.5 py-1.5 text-white sm:px-2 sm:py-2"
                                        onClick={map3DHandler}
                                    >
                                        <Md3DRotation className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </button>
                                ) : (
                                    <button
                                        className="flex items-center gap-x-1 rounded-r-md border-b border-l-[0.25px] border-r border-t px-1.5 py-1.5 sm:px-2 sm:py-2"
                                        onClick={map3DHandler}
                                    >
                                        <Md3DRotation className="h-4 w-4 opacity-50 sm:h-5 sm:w-5" />
                                    </button>
                                )}
                                <span className="invisible absolute mt-1 whitespace-nowrap rounded-md bg-backgroundGray px-2 py-1.5 text-[10px] group-hover:visible sm:py-2 sm:text-xs">
                                    3D Point Cloud
                                </span>
                            </div>
                        )}

                        {/* Mission Planner Toggle */}
                        {/* <div className="group relative">
                            {showMissionPlanner ? (
                                <button
                                    className="flex items-center gap-x-1 rounded-r-md border-b border-l-[0.25px] border-r border-t px-1.5 py-1.5 sm:px-2 sm:py-2"
                                    onClick={missionPlannerHandler}
                                >
                                    <TbRobot className="h-4 w-4 sm:h-5 sm:w-5" />
                                </button>
                            ) : (
                                <button
                                    className="flex items-center gap-x-1 rounded-r-md border-b border-l-[0.25px] border-r border-t px-1.5 py-1.5 sm:px-2 sm:py-2"
                                    onClick={missionPlannerHandler}
                                >
                                    <TbRobotOff className="h-4 w-4 sm:h-5 sm:w-5" />
                                </button>
                            )}
                            <span className="invisible absolute mt-1 whitespace-nowrap rounded-md bg-backgroundGray px-2 py-1.5 text-[10px] group-hover:visible sm:py-2 sm:text-xs">
                                Mission Panel
                            </span>
                        </div> */}
                    </div>
                </div>
            </div>
        </header>
    );
});

TeleopsNavbar.displayName = "TeleopsNavbar";

export default TeleopsNavbar;
