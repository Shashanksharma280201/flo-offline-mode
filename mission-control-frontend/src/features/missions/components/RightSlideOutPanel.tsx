import { memo, useState, useEffect } from "react";
import { useMissionsStore } from "../../../stores/missionsStore";
import { useRobotStore } from "../../../stores/robotStore";
import { MdClose } from "react-icons/md";
import OverviewPanel from "../../robots/robotLaunchPad/OverviewPanel";
import LogsPanel from "../../robots/robotLaunchPad/LogsPanel";

const RightSlideOutPanel = memo(() => {
    const [rightPanelMode, setRightPanelMode] = useMissionsStore((state) => [
        state.rightPanelMode,
        state.setRightPanelMode
    ]);

    const [isAnimating, setIsAnimating] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    const isOpen = rightPanelMode !== null;

    useEffect(() => {
        if (isOpen) {
            // Opening: render immediately and start animation
            setShouldRender(true);
            setTimeout(() => setIsAnimating(true), 10);
        } else {
            // Closing: start animation and unmount after transition
            setIsAnimating(false);
            const timeout = setTimeout(() => setShouldRender(false), 300);
            return () => clearTimeout(timeout);
        }
    }, [isOpen]);

    const handleClose = () => {
        setRightPanelMode(null);
    };

    if (!shouldRender) return null;

    return (
        <>
            {/* Overlay - semi-transparent backdrop */}
            <div
                className={`fixed inset-0 z-30 bg-black transition-opacity duration-300 ${
                    isAnimating ? "bg-opacity-30" : "bg-opacity-0"
                }`}
                onClick={handleClose}
            />

            {/* Slide-out panel - Glassmorphism with spacing */}
            <div
                className={`
                    fixed right-0 top-0 z-40 h-full w-full transform rounded-none
                    bg-gray-900/80 backdrop-blur-xl border-l border-white/10
                    shadow-2xl shadow-black/50 transition-transform duration-300 ease-in-out
                    sm:right-2 sm:top-[7.5%] sm:h-[85%] sm:w-80 sm:rounded-2xl sm:border
                    lg:w-96
                    ${isAnimating ? "translate-x-0" : "translate-x-full sm:translate-x-[calc(100%+0.5rem)]"}
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                    <h2 className="text-xl font-semibold text-white">
                        {rightPanelMode === "overview" && "Overview"}
                        {rightPanelMode === "logs" && "Logs"}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="rounded-full p-2 text-white/60 transition-all hover:bg-white/10 hover:text-white"
                    >
                        <MdClose className="h-6 w-6" />
                    </button>
                </div>

                {/* Content with scrolling */}
                <div className="overflow-y-auto overflow-x-hidden" style={{ height: "calc(100% - 73px)" }}>
                    {rightPanelMode === "overview" && <OverviewPanelWrapper />}
                    {rightPanelMode === "logs" && <LogsPanelWrapper />}
                </div>
            </div>
        </>
    );
});

RightSlideOutPanel.displayName = "RightSlideOutPanel";

// Wrapper for OverviewPanel to provide robot data
const OverviewPanelWrapper = memo(() => {
    const robot = useRobotStore((state) => state.robot);
    return <OverviewPanel robot={robot} />;
});

OverviewPanelWrapper.displayName = "OverviewPanelWrapper";

// Wrapper for LogsPanel to provide logs data
const LogsPanelWrapper = memo(() => {
    const logs = useRobotStore((state) => state.logs);
    return <LogsPanel logs={logs} />;
});

LogsPanelWrapper.displayName = "LogsPanelWrapper";

export default RightSlideOutPanel;
