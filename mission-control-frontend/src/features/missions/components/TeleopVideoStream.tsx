import { memo, useRef, useEffect } from "react";
import Janus from "janus-gateway";
import Draggable from "react-draggable";
import { MdDragIndicator, MdSwapVert } from "react-icons/md";
import { useTeleStore } from "../../../stores/teleStore";
import { useMissionsStore } from "../../../stores/missionsStore";
import { useRobotStore } from "../../../stores/robotStore";
import { useUserStore } from "../../../stores/userStore";
import { useRosFns } from "../../../lib/ros/useRosFns";
import { toast } from "react-toastify";
import { ESwapScreenStatus } from "../../../data/types";
import JoystickPublisher from "../../teleops/components/JoystickPublisher";
import SonarIndicator from "../../teleops/components/SonarIndicator";
import MetricsPanel from "../../teleops/components/MetricsPanel";
import MissionsView from "../MissionsView";

type TeleopVideoStreamProps = {
    isGamepadEnabled: boolean;
    showMetrics: boolean;
    showMissionPlanner: boolean;
};

const TeleopVideoStream = memo(({
    isGamepadEnabled,
    showMetrics,
    showMissionPlanner
}: TeleopVideoStreamProps) => {
    const videoRef = useRef<HTMLVideoElement>(null!);
    const metricsPanelRef = useRef(null);
    const missionPanelRef = useRef(null);

    const [streams] = useTeleStore((state) => [state.streams]);
    const [isTeleoperating, setIsTeleoperating] = useMissionsStore((state) => [
        state.isTeleoperating,
        state.setIsTeleoperating
    ]);
    const [isRobotConnected] = useRobotStore((state) => [state.isRobotConnected]);
    const setSwapScreenStatus = useUserStore((state) => state.setSwapScreenStatus);

    const { rosSubscribe } = useRosFns();

    // Attach video stream
    useEffect(() => {
        if (streams["0"] && videoRef.current) {
            Janus.attachMediaStream(videoRef.current, streams["0"]);
        }
    }, [streams]);

    // Listen for robot mode changes (auto-stop teleop)
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
        <div className="relative h-full w-full bg-black">
            {/* Sonar Indicators */}
            <SonarIndicator />

            {/* Draggable Metrics Panel */}
            {showMetrics && (
                <Draggable
                    nodeRef={metricsPanelRef}
                    handle=".metricsHandle"
                    bounds="parent"
                >
                    <div
                        ref={metricsPanelRef}
                        className="pointer-events-auto absolute right-5 top-20 z-50 w-[80vw] rounded-md border-2 border-border bg-backgroundGray xs:w-[60vw] sm:w-[35vw] md:w-[35vw] lg:w-[25vw] xl:w-[20vw]"
                    >
                        <div className="metricsHandle flex cursor-move items-center justify-between px-2 py-1.5">
                            <span className="text-xs text-white md:text-sm">
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

            {/* Draggable Mission Control Panel */}
            {showMissionPlanner && (
                <Draggable
                    nodeRef={missionPanelRef}
                    handle=".missionHandle"
                    bounds="parent"
                >
                    <div
                        ref={missionPanelRef}
                        className="pointer-events-auto absolute left-5 top-16 z-20 w-[50vw] resize overflow-hidden rounded-md bg-blue-900/30 xs:w-[40vw] sm:w-[20vw] md:w-[18vw]"
                    >
                        <div className="missionHandle flex cursor-move items-center justify-between px-2 py-1.5">
                            <span className="text-xs text-white md:text-sm">
                                Mission Control
                            </span>
                            <span className="z-30 flex items-center gap-x-2">
                                <MdSwapVert
                                    onTouchStart={() => {
                                        setSwapScreenStatus(ESwapScreenStatus.MISSIONCONTROL);
                                    }}
                                    onClick={() => {
                                        setSwapScreenStatus(ESwapScreenStatus.MISSIONCONTROL);
                                    }}
                                    className="cursor-pointer"
                                />
                                <MdDragIndicator className="missionHandle cursor-move" />
                            </span>
                        </div>
                        <div className="flex h-full w-full rounded-b-md">
                            <div className="flex h-full w-full">
                                <MissionsView />
                            </div>
                        </div>
                    </div>
                </Draggable>
            )}

            {/* Video Stream */}
            <video
                className="-z-50 h-full w-full bg-black object-contain"
                ref={videoRef}
                autoPlay
                muted
            />

            {/* Joystick Overlay (only when teleoperating) */}
            {isTeleoperating && (
                <JoystickPublisher isGamepadEnabled={isGamepadEnabled} />
            )}

            {/* No Stream Placeholder */}
            {!streams["0"] && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className="mb-4 text-6xl text-gray-600">📹</div>
                        <p className="text-lg text-gray-400">No video stream available</p>
                        <p className="mt-2 text-sm text-gray-500">
                            Start teleoperation to begin streaming
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
});

TeleopVideoStream.displayName = "TeleopVideoStream";

export default TeleopVideoStream;
