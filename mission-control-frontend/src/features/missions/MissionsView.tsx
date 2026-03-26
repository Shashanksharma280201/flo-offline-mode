import { Suspense, memo, useState } from "react";
import SafeCanvas from "./components/SafeCanvas";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import GoogleMap from "./components/GoogleMap";
import LidarMap2D from "./components/LidarMap2D";
import MapTypeToggle from "./components/MapTypeToggle";
import LeftSideTabs from "./components/LeftSideTabs";
import LeftSlideOutPanel from "./components/LeftSlideOutPanel";
import RightSideTabs from "./components/RightSideTabs";
import RightSlideOutPanel from "./components/RightSlideOutPanel";
import OverlaySceneProvider from "./components/OverlaySceneProvider";
import LidarOverlayScene from "./components/LidarOverlayScene";
import MapViz from "./MapViz";
import LidarMapViz from "./components/LidarMapViz";
import TeleopsNavbar from "./components/TeleopsNavbar";
import DraggableVideoPanel from "./components/DraggableVideoPanel";
import DraggableMetricsPanel from "./components/DraggableMetricsPanel";
import DraggableMissionPanel from "./components/DraggableMissionPanel";
import Draggable3DPointCloudPanel from "./components/Draggable3DPointCloudPanel";
import JoystickPublisher from "../teleops/components/JoystickPublisher";
import SonarIndicator from "../teleops/components/SonarIndicator";
import { useMissionsStore } from "../../stores/missionsStore";

const MissionsView = ({ mapSearchEnabled }: { mapSearchEnabled?: boolean }) => {
    const mapType = useMissionsStore((state) => state.mapType);
    const [isTeleoperating] = useMissionsStore((state) => [state.isTeleoperating]);

    // Overlay panel control states
    const [showVideoPanel, setShowVideoPanel] = useState(false);
    const [showMetrics, setShowMetrics] = useState(false);
    const [isGamepadEnabled, setIsGamepadEnabled] = useState(false);
    const [showMissionPlanner, setShowMissionPlanner] = useState(false);
    const [show3DMap, setShow3DMap] = useState(false);

    return (
        <div
            className={`relative flex h-full w-full grow flex-col bg-slate-700/60 transition ease-in-out lg:w-[75%]`}
        >
            <Suspense
                fallback={
                    <div className="flex h-full min-h-[20vh] w-full flex-col items-center justify-center gap-8">
                        Loading environment...
                        <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-background" />
                    </div>
                }
            >
                {/* Top Navbar */}
                <TeleopsNavbar
                    showVideoPanel={showVideoPanel}
                    setShowVideoPanel={setShowVideoPanel}
                    showMetrics={showMetrics}
                    setShowMetrics={setShowMetrics}
                    isGamepadEnabled={isGamepadEnabled}
                    setIsGamepadEnabled={setIsGamepadEnabled}
                    showMissionPlanner={showMissionPlanner}
                    setShowMissionPlanner={setShowMissionPlanner}
                    show3DMap={mapType === "lidar" ? show3DMap : undefined}
                    setShow3DMap={mapType === "lidar" ? setShow3DMap : undefined}
                />

                {/* Main Content Area */}
                <div className="relative h-full flex-1">
                    {/* Left Side Tabs */}
                    <LeftSideTabs />

                    {/* Left Slide-Out Panel */}
                    <LeftSlideOutPanel />

                    {/* Right Side Tabs */}
                    <RightSideTabs />

                    {/* Right Slide-Out Panel */}
                    <RightSlideOutPanel />

                    {/* Map - ALWAYS VISIBLE */}
                    <div className="flex h-full w-full items-center justify-center p-1 sm:p-4">
                        <div className="relative h-full w-[95%] overflow-hidden rounded-2xl sm:w-[90%] sm:rounded-3xl">
                            {mapType === "google" ? (
                                <GoogleMap searchEnabled={mapSearchEnabled} />
                            ) : (
                                <LidarMap2D />
                            )}
                            {/* Map Type Toggle - overlay inside map */}
                            <MapTypeToggle />
                        </div>
                    </div>

                    {/* Three.js Canvas overlay - for both Google Maps and LIDAR */}
                    {mapType === "google" && (
                        <div className="h-[0.2vh]">
                            <SafeCanvas
                                fallback={
                                    <div className="text-xs text-yellow-400">
                                        3D overlay disabled (WebGL unavailable)
                                    </div>
                                }
                            >
                                <OverlaySceneProvider />
                                <MapViz />
                            </SafeCanvas>
                        </div>
                    )}

                    {mapType === "lidar" && (
                        <div className="pointer-events-none absolute inset-0">
                            <div className="pointer-events-none relative h-full w-full">
                                <div className="pointer-events-none absolute left-[2.5%] top-0 h-full w-[95%] sm:left-[5%] sm:w-[90%]">
                                    <SafeCanvas
                                        orthographic
                                        camera={{
                                            position: [0, 0, 100],
                                            near: -1000,
                                            far: 1000
                                        }}
                                        style={{ pointerEvents: 'none' }}
                                        fallback={
                                            <div className="text-xs text-yellow-400">
                                                LIDAR 3D overlay disabled (WebGL unavailable)
                                            </div>
                                        }
                                    >
                                        <LidarOverlayScene />
                                        <LidarMapViz />
                                    </SafeCanvas>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sonar Indicators - overlay on map */}
                    {isTeleoperating && <SonarIndicator />}

                    {/* Joystick Publisher - overlay on map */}
                    {isTeleoperating && (
                        <JoystickPublisher isGamepadEnabled={isGamepadEnabled} />
                    )}

                    {/* Draggable Video Panel - overlay on map */}
                    {showVideoPanel && (
                        <DraggableVideoPanel onClose={() => setShowVideoPanel(false)} />
                    )}

                    {/* Draggable Metrics Panel - overlay on map */}
                    {showMetrics && (
                        <DraggableMetricsPanel onClose={() => setShowMetrics(false)} />
                    )}

                    {/* Draggable Mission Control Panel - overlay on map */}
                    {showMissionPlanner && (
                        <DraggableMissionPanel onClose={() => setShowMissionPlanner(false)} />
                    )}

                    {/* Draggable 3D Point Cloud Panel - overlay on map, LIDAR mode only */}
                    {mapType === "lidar" && show3DMap && (
                        <Draggable3DPointCloudPanel onClose={() => setShow3DMap(false)} />
                    )}
                </div>
            </Suspense>
        </div>
    );
};
export default memo(MissionsView);
