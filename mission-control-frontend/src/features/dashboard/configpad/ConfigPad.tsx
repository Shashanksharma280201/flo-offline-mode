import { useState, useEffect } from "react";
import { MdClose } from "react-icons/md";
import { ILocation } from "../../../data/types/locationTypes";
import { useRobotConfigStore } from "../../../stores/robotConfigStore";
import BoundaryPanel from "./BoundaryPanel";
import MissionsPanel from "./MissionsPanel";
import PathMapPanel from "./PathMapPanel";
import { useCallback } from "react";
import { useRosFns } from "../../../lib/ros/useRosFns";
import { useJanusStore } from "../../../stores/janusStore";

type ConfigPadPropTypes = {
    onCloseConfigPad: () => void;
    mode: "gps" | "lidar" | "odom";
};

const ConfigPad = ({ onCloseConfigPad, mode }: ConfigPadPropTypes) => {
    const [
        tabs,
        selectedTab,
        setSelectedTab
    ] = useRobotConfigStore((state) => [
        state.tabs,
        state.selectedTab,
        state.setSelectedTab
    ]);

    return (
        <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden text-sm text-white">
            {/* Header with glassmorphism */}
            <div className="sticky top-0 z-10 mt-1 flex items-center justify-between border-b border-white/10 bg-gray-900/90 px-3 py-2.5 backdrop-blur-sm sm:px-5 sm:py-3">
                <div className="text-base font-semibold text-white sm:text-lg">Config Pad</div>
                <button
                    onClick={() => {
                        onCloseConfigPad();
                    }}
                    className="rounded-full p-1.5 text-white/60 transition-all hover:bg-white/10 hover:text-white"
                >
                    <MdClose className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
            </div>

            {/* Tabs with glassmorphism */}
            <div className="sticky top-[49px] z-10 flex w-full items-center justify-between border-b border-white/10 bg-gray-900/80 backdrop-blur-sm sm:top-[57px]">
                <div className="no-scrollbar flex w-full justify-between overflow-x-auto text-xs sm:text-sm">
                    {tabs.map((tab, index) => {
                        return (
                            <button
                                key={index}
                                value={tab}
                                onClick={(event) => setSelectedTab(tab)}
                                className={`relative h-full w-1/2 flex-none px-3 py-2 font-medium transition-colors sm:px-5 sm:py-3 ${
                                    selectedTab === tab
                                        ? "text-white"
                                        : "text-gray-400 hover:text-gray-200"
                                }`}
                            >
                                {tab}
                                {selectedTab === tab && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 shadow-lg shadow-blue-500/50" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            {selectedTab === "Path Maps" ? <PathMapPanel mode={mode} /> : <MissionsPanel />}
        </div>
    );
};
export default ConfigPad;
