import { memo, useState } from "react";
import { useMissionsStore } from "../../../stores/missionsStore";
import { MdGpsFixed, MdRadar, MdSpeed, MdChevronRight, MdChevronLeft } from "react-icons/md";

const LeftSideTabs = memo(() => {
    const [isOpen, setIsOpen] = useState(false);
    const [leftPanelMode, setLeftPanelMode] = useMissionsStore((state) => [
        state.leftPanelMode,
        state.setLeftPanelMode
    ]);

    const handleTabClick = (mode: "gps" | "lidar" | "odom") => {
        // Toggle: if clicking the same tab, close it
        if (leftPanelMode === mode) {
            setLeftPanelMode(null);
        } else {
            setLeftPanelMode(mode);
        }
    };

    const tabs = [
        { mode: "gps" as const, label: "GPS", icon: MdGpsFixed },
        { mode: "lidar" as const, label: "Lidar", icon: MdRadar },
        { mode: "odom" as const, label: "Odom", icon: MdSpeed }
    ];

    return (
        <>
            {/* Mobile: Collapsible sidebar with arrow button */}
            <div className="fixed left-0 top-1/2 z-20 -translate-y-1/2 sm:hidden">
                {/* Arrow button - always visible */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute left-0 top-1/2 z-30 flex h-16 w-8 -translate-y-1/2 items-center justify-center rounded-r-xl bg-gray-900/80 backdrop-blur-xl border-r border-t border-b border-white/10 shadow-lg shadow-black/50 transition-all duration-300 hover:bg-gray-900/90"
                >
                    {isOpen ? (
                        <MdChevronLeft className="h-6 w-6 text-white" />
                    ) : (
                        <MdChevronRight className="h-6 w-6 text-white" />
                    )}
                </button>

                {/* Sidebar - slides in/out */}
                <div
                    className={`flex flex-col gap-2 rounded-r-2xl bg-gray-900/80 backdrop-blur-xl border-r border-t border-b border-white/10 p-2 shadow-2xl shadow-black/50 transition-transform duration-300 ${
                        isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                    style={{ marginLeft: "32px" }}
                >
                    {tabs.map(({ mode, label, icon: Icon }) => {
                        const isActive = leftPanelMode === mode;

                        return (
                            <button
                                key={mode}
                                onClick={() => {
                                    handleTabClick(mode);
                                    setIsOpen(false);
                                }}
                                className={`
                                    group relative flex h-12 w-12 flex-col items-center justify-center rounded-xl
                                    transition-all duration-300
                                    ${
                                        isActive
                                            ? "bg-blue-500/20 shadow-lg shadow-blue-500/30"
                                            : "hover:bg-white/10"
                                    }
                                `}
                                title={label}
                            >
                                <Icon
                                    className={`h-5 w-5 transition-colors duration-200 ${
                                        isActive ? "text-blue-400" : "text-white/80 group-hover:text-white"
                                    }`}
                                />
                                <span
                                    className={`mt-0.5 text-[8px] font-medium transition-colors duration-200 ${
                                        isActive ? "text-blue-400" : "text-white/60 group-hover:text-white/80"
                                    }`}
                                >
                                    {label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tablet and Desktop: Always visible sidebar */}
            <div className="fixed left-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 rounded-2xl bg-gray-900/80 backdrop-blur-xl border border-white/10 p-3 shadow-2xl shadow-black/50 sm:flex lg:gap-4 lg:p-4">
                {tabs.map(({ mode, label, icon: Icon }) => {
                    const isActive = leftPanelMode === mode;

                    return (
                        <button
                            key={mode}
                            onClick={() => handleTabClick(mode)}
                            className={`
                                group relative flex h-16 w-16 flex-col items-center justify-center rounded-xl
                                transition-all duration-300
                                lg:h-20 lg:w-20
                                ${
                                    isActive
                                        ? "bg-blue-500/20 shadow-lg shadow-blue-500/30"
                                        : "hover:bg-white/10"
                                }
                            `}
                            title={label}
                        >
                            <Icon
                                className={`h-7 w-7 transition-colors duration-200 lg:h-8 lg:w-8 ${
                                    isActive ? "text-blue-400" : "text-white/80 group-hover:text-white"
                                }`}
                            />
                            <span
                                className={`mt-1 text-[10px] font-medium transition-colors duration-200 lg:text-xs ${
                                    isActive ? "text-blue-400" : "text-white/60 group-hover:text-white/80"
                                }`}
                            >
                                {label}
                            </span>

                            {/* Active indicator */}
                            {isActive && (
                                <div className="absolute -right-4 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full bg-blue-400 shadow-lg shadow-blue-500/50 lg:h-10" />
                            )}
                        </button>
                    );
                })}
            </div>
        </>
    );
});

LeftSideTabs.displayName = "LeftSideTabs";

export default LeftSideTabs;
