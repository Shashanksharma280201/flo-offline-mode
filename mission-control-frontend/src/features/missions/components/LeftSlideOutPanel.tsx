import { memo, useState, useEffect } from "react";
import { useMissionsStore } from "../../../stores/missionsStore";
import { MdClose } from "react-icons/md";
import ConfigPad from "../../dashboard/configpad/ConfigPad";

const LeftSlideOutPanel = memo(() => {
    const [leftPanelMode, setLeftPanelMode] = useMissionsStore((state) => [
        state.leftPanelMode,
        state.setLeftPanelMode
    ]);

    const [isAnimating, setIsAnimating] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    const isOpen = leftPanelMode !== null;

    // Determine the mode to pass to ConfigPad
    const configMode = leftPanelMode === "gps" ? "gps" : leftPanelMode === "lidar" ? "lidar" : leftPanelMode === "odom" ? "odom" : "gps";

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
        setLeftPanelMode(null);
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
                    fixed left-0 top-0 z-40 h-full w-full transform rounded-none
                    bg-gray-900/80 backdrop-blur-xl border-r border-white/10
                    shadow-2xl shadow-black/50 transition-transform duration-300 ease-in-out
                    sm:left-2 sm:top-[7.5%] sm:h-[85%] sm:w-96 sm:rounded-2xl sm:border
                    lg:w-[32rem]
                    ${isAnimating ? "translate-x-0" : "-translate-x-full sm:-translate-x-[calc(100%+0.5rem)]"}
                `}
            >
                {/* Content - ConfigPad with scrolling */}
                <div className="h-full overflow-y-auto overflow-x-hidden rounded-2xl">
                    <ConfigPad onCloseConfigPad={handleClose} mode={configMode} />
                </div>
            </div>
        </>
    );
});

LeftSlideOutPanel.displayName = "LeftSlideOutPanel";

export default LeftSlideOutPanel;
