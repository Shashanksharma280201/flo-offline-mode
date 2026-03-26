import { memo, useRef, useEffect, useState } from "react";
import Draggable from "react-draggable";
import { MdClose, MdDragIndicator, MdFullscreen, MdFullscreenExit } from "react-icons/md";
import Janus from "janus-gateway";
import { useTeleStore } from "../../../stores/teleStore";
import { useMissionsStore } from "../../../stores/missionsStore";
import { useRobotStore } from "../../../stores/robotStore";
import { useRosFns } from "../../../lib/ros/useRosFns";
import { toast } from "react-toastify";

type DraggableVideoPanelProps = {
    onClose: () => void;
};

const DraggableVideoPanel = memo(({ onClose }: DraggableVideoPanelProps) => {
    const videoRef = useRef<HTMLVideoElement>(null!);
    const panelRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [panelSize, setPanelSize] = useState(() => ({
        width: Math.min(640, window.innerWidth * 0.9),
        height: Math.min(480, window.innerHeight * 0.5)
    }));

    const [streams] = useTeleStore((state) => [state.streams]);
    const [isTeleoperating, setIsTeleoperating] = useMissionsStore((state) => [
        state.isTeleoperating,
        state.setIsTeleoperating
    ]);
    const [isRobotConnected] = useRobotStore((state) => [state.isRobotConnected]);

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

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
        if (!isFullscreen) {
            setPanelSize({ width: window.innerWidth * 0.9, height: window.innerHeight * 0.8 });
        } else {
            setPanelSize({ width: 640, height: 480 });
        }
    };

    const handleResize = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = panelSize.width;
        const startHeight = panelSize.height;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth + (moveEvent.clientX - startX);
            const newHeight = startHeight + (moveEvent.clientY - startY);

            setPanelSize({
                width: Math.max(320, Math.min(newWidth, window.innerWidth * 0.95)),
                height: Math.max(240, Math.min(newHeight, window.innerHeight * 0.9))
            });
        };

        const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    return (
        <Draggable
            nodeRef={panelRef}
            handle=".videoHandle"
            bounds="parent"
            disabled={isFullscreen}
        >
            <div
                ref={panelRef}
                className={`pointer-events-auto absolute z-40 overflow-hidden rounded-2xl border border-white/10 bg-gray-900/80 backdrop-blur-xl shadow-2xl shadow-black/50 ${
                    isFullscreen ? "left-[2%] top-[2%] sm:left-[5%] sm:top-[5%]" : "left-[5%] top-[5%] sm:left-[10%] sm:top-[10%]"
                }`}
                style={{
                    width: `${panelSize.width}px`,
                    height: `${panelSize.height}px`
                }}
            >
                {/* Header with drag handle - Glassmorphic */}
                <div className="videoHandle flex cursor-move items-center justify-between border-b border-white/10 bg-gray-900/90 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-3">
                    <div className="flex items-center gap-2">
                        <MdDragIndicator className="h-4 w-4 text-white/60 sm:h-5 sm:w-5" />
                        <span className="text-xs font-medium text-white sm:text-sm">Video Feed</span>
                        {streams["0"] && (
                            <span className="text-[10px] text-green-400 sm:text-xs">● Live</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                        <button
                            onClick={toggleFullscreen}
                            className="rounded-lg p-1 text-white/60 transition-all hover:bg-white/10 hover:text-white sm:p-1.5"
                            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                        >
                            {isFullscreen ? (
                                <MdFullscreenExit className="h-4 w-4 sm:h-5 sm:w-5" />
                            ) : (
                                <MdFullscreen className="h-4 w-4 sm:h-5 sm:w-5" />
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-1 text-white/60 transition-all hover:bg-white/10 hover:text-white sm:p-1.5"
                            title="Close"
                        >
                            <MdClose className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                    </div>
                </div>

                {/* Video content */}
                <div className="relative h-[calc(100%-40px)] w-full bg-black/90 sm:h-[calc(100%-48px)]">
                    <video
                        className="h-full w-full bg-black object-contain"
                        ref={videoRef}
                        autoPlay
                        muted
                    />

                    {/* No Stream Placeholder */}
                    {!streams["0"] && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
                            <div className="text-center">
                                <div className="mb-4 text-3xl text-white/40 sm:text-4xl">📹</div>
                                <p className="text-xs text-white/60 sm:text-sm">No video stream</p>
                                <p className="mt-1 text-[10px] text-white/40 sm:text-xs">
                                    Start teleoperation to begin
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Resize handle */}
                    {!isFullscreen && (
                        <div
                            onMouseDown={handleResize}
                            className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize sm:h-5 sm:w-5"
                            style={{
                                background: "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.2) 50%)"
                            }}
                        />
                    )}
                </div>
            </div>
        </Draggable>
    );
});

DraggableVideoPanel.displayName = "DraggableVideoPanel";

export default DraggableVideoPanel;
