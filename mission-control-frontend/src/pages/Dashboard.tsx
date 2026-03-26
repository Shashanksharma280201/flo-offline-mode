import { useEffect, useRef, useState } from "react";
import { MdDragIndicator, MdSwapVert } from "react-icons/md";
import Teleops from "./Teleops";
import { useUserStore } from "../stores/userStore";
import { ESwapScreenStatus, LatLng, Point2 } from "../data/types";
import { useRobotConfigStore } from "../stores/robotConfigStore";
import Draggable from "react-draggable";
import { useRobotStore } from "../stores/robotStore";
import useVrSub from "../features/teleops/hooks/useVrSub";
import MissionsView from "../features/missions/MissionsView";
import { useMissionsStore } from "../stores/missionsStore";
import { useRosFns } from "../lib/ros/useRosFns";
import { Id, toast } from "react-toastify";
import useVrPub from "../features/teleops/hooks/useVrPub";
import usePathMaps from "@/hooks/usePathMaps";
import LiveDataDashboard from "./LiveDataDashboard";
import { useShallow } from "zustand/react/shallow";
import { getPathMapById } from "../features/dashboard/pathMapService";

const Dashboard = () => {
    const [robotId, isRobotConnected] = useRobotStore((state) => [
        state.robot?.id,
        state.isRobotConnected
    ]);
    const { rosServiceCaller, rosSubscribe } = useRosFns();
    useVrSub(robotId);
    useVrPub(robotId);
    const [swapScreenStatus, setSwapScreenStatus] = useUserStore((state) => [
        state.swapScreenStatus,
        state.setSwapScreenStatus
    ]);

    const nodeRef = useRef(null);
    const [
        isMissionExecuting,
        setIsMissionExecuting,
        setIsAbortingMission,
        setIsExecutingDifferentMission,
        setActiveMissionId,
        missionToastId,
        pathMap,
        setPathMapForMissionRestore,
        mission,
        setMission
    ] = useMissionsStore(
        useShallow((state) => [
            state.isMissionExecuting,
            state.setIsMissionExecuting,
            state.setIsAbortingMission,
            state.setIsExecutingDifferentMission,
            state.setActiveMissionId,
            state.missionToastId,
            state.pathMap,
            state.setPathMapForMissionRestore,
            state.mission,
            state.setMission
        ])
    );
    const [showTeleOpsPanel] = useRobotConfigStore((state) => [
        state.showTeleOpsPanel
    ]);

    const { mutate: fetchPathMaps } = usePathMaps();

    useEffect(() => {
        fetchPathMaps();
    }, []);

    // Clear mission state when robot changes
    useEffect(() => {
        console.log("[MISSION] Robot changed, clearing mission states");
        setIsMissionExecuting(false);
        setIsAbortingMission(false);
        setIsExecutingDifferentMission(false);
        setActiveMissionId("");
        setPathMapForMissionRestore(undefined);
        setMission(undefined);
    }, [robotId]);

    useEffect(() => {
        const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
            event.preventDefault();
        };
        window.addEventListener("beforeunload", beforeUnloadHandler);

        return () => {
            window.removeEventListener("beforeunload", beforeUnloadHandler);
        };
    }, []);

    useEffect(() => {
        let toastId: Id;
        let missionStatusSubscriber: any;
        let missionFeedbackSubscriber: any;

        if (!isRobotConnected) {
            console.log("Robot not connected, skipping mission subscriptions");
            return;
        }

        console.log("Setting up mission status and feedback subscriptions");

        // Always subscribe to mission result - this handles abort and completion
        try {
            missionStatusSubscriber = rosSubscribe(
                "/path_mission/result",
                "mmr/msg/PathMissionActionResult"
            );
            missionFeedbackSubscriber = rosSubscribe(
                "/path_mission/feedback",
                "mmr/msg/PathMissionActionFeedback"
            );

            if (!missionStatusSubscriber || !missionFeedbackSubscriber) {
                console.warn("Failed to create ROS subscribers");
                return;
            }

            // Subscribe immediately to catch mission completion/abort
            missionStatusSubscriber.subscribe((message: any) => {
                console.log("[MISSION] Result received:", message);
                const missionResult = message as {
                    message: string;
                    success: boolean;
                    goal_id: string;
                };

                console.log("[MISSION] Clearing mission execution states");
                // Reset ONLY execution-related states when mission completes or is aborted
                // Keep pathMap and mission so user can see what was executed
                setIsMissionExecuting(false);
                setIsAbortingMission(false);
                setIsExecutingDifferentMission(false);
                setActiveMissionId("");

                // Show toast notification
                toast.success(missionResult.message || "Mission completed", {
                    position: "bottom-center",
                    autoClose: 3000
                });
            });
        } catch (error) {
            console.error("Error setting up ROS subscriptions:", error);
            return;
        }

        const handleSuccess = async (result: {
            message: string;
            success: boolean;
            goal_id: string;
            lat_lng_paths: { path: LatLng[] }[];
            paths: {
                points: Point2[];
            }[];
        }) => {
            console.log("[MISSION] State check result:", result);
            if (result.success) {
                console.log("[MISSION] Active mission detected from robot");
                const [pathMapId, missionId] = result.goal_id.split("-");

                try {
                    // Fetch the pathMap from backend to get full mission data
                    console.log("[MISSION] Fetching pathMap:", pathMapId);
                    const fetchedPathMap = await getPathMapById(pathMapId);

                    // Find the mission within the pathMap
                    const activeMission = fetchedPathMap.missions.find(
                        (m: any) => m._id === missionId
                    );

                    if (!activeMission) {
                        console.warn("[MISSION] Mission not found in pathMap");
                        toast.dismiss(toastId);
                        toast.error("Mission data not found");
                        return;
                    }

                    console.log(
                        "[MISSION] Setting mission state from robot data"
                    );
                    console.log("[MISSION] PathMap ID:", pathMapId);
                    console.log("[MISSION] Mission ID:", missionId);
                    console.log("[MISSION] Mission name:", activeMission.name);

                    // Set all required states for abort button to work
                    // Use setPathMapForMissionRestore to avoid clearing isMissionExecuting
                    setActiveMissionId(missionId);
                    setIsMissionExecuting(true);
                    setIsExecutingDifferentMission(false); // Changed to false - this mission IS the one from this session
                    setIsAbortingMission(false);
                    setPathMapForMissionRestore(fetchedPathMap);
                    setMission(activeMission);

                    console.log(
                        "[MISSION] States set - isMissionExecuting: true, isExecutingDifferentMission: false"
                    );
                    console.log("[MISSION] Mission object:", activeMission);
                    console.log("[MISSION] PathMap object:", fetchedPathMap);

                    toast.dismiss(toastId);
                    toast.info("Mission in progress", {
                        position: "bottom-center",
                        autoClose: 3000
                    });

                    // Subscribe to feedback for progress updates
                    missionFeedbackSubscriber?.subscribe((feedback: any) => {
                        const missionFeedback = feedback as {
                            goal_id: string;
                            number_of_paths_done: number;
                        };
                        console.log("[MISSION] Feedback:", missionFeedback);
                    });
                } catch (error) {
                    console.error("[MISSION] Error fetching pathMap:", error);
                    toast.dismiss(toastId);
                    toast.error("Failed to load mission data");
                }
            } else {
                console.log("[MISSION] No active mission detected");
                toast.dismiss(toastId);
                // Clear any runtime state if no mission is running
                setIsMissionExecuting(false);
                setIsAbortingMission(false);
                setIsExecutingDifferentMission(false);
                setActiveMissionId("");
            }
        };

        const handleError = (error: any) => {
            console.error("Mission state check error:", error);
            if (toastId) {
                toast.update(toastId, {
                    render: error.message || "Failed to check mission state",
                    type: "error",
                    isLoading: false,
                    closeOnClick: true,
                    autoClose: 3000
                });
            } else {
                toast.error(error.message || "Failed to check mission state");
            }
        };
        try {
            if (isRobotConnected) {
                console.log("Robot connected, checking for active missions...");
                toastId = toast.loading(`Checking for active missions`, {
                    position: "bottom-center"
                });
                console.log("Calling /path_mission/get_state service");
                rosServiceCaller(
                    "/path_mission/get_state",
                    "flo_msgs/srv/GetPathMissionState",
                    handleSuccess,
                    handleError,
                    {}
                );
            } else {
                console.log("Robot not connected, skipping mission check");
                throw new Error("Robot is Offline");
            }
        } catch (error) {
            console.error("Exception in mission check:", error);
            handleError(error);
        }

        return () => {
            console.log("Cleaning up mission subscriptions");
            try {
                toast.dismiss(toastId);
                toast.dismiss(missionToastId);
                if (missionFeedbackSubscriber) {
                    missionFeedbackSubscriber.unsubscribe();
                    console.log("Unsubscribed from mission feedback");
                }
                if (missionStatusSubscriber) {
                    missionStatusSubscriber.unsubscribe();
                    console.log("Unsubscribed from mission status");
                }
            } catch (error) {
                console.error("Error during cleanup:", error);
            }
        };
    }, [isRobotConnected]);

    return (
        <>
            {swapScreenStatus === ESwapScreenStatus.TELEOPS ? (
                <Teleops />
            ) : swapScreenStatus === ESwapScreenStatus.LIVEDASHBOARD ? (
                <LiveDataDashboard />
            ) : (
                <div className="relative flex h-[100vh] overflow-hidden">
                    <div className="relative h-[100vh] w-full transition-all duration-300">
                        <div className="flex h-full items-center justify-between">
                            {swapScreenStatus ===
                                ESwapScreenStatus.MISSIONCONTROL &&
                                showTeleOpsPanel && (
                                    <div className="pointer-events-none absolute  left-10  top-10 z-10 h-[90%] w-[95%] border-border text-white">
                                        <Draggable
                                            nodeRef={nodeRef}
                                            handle=".handle"
                                            bounds="parent"
                                        >
                                            <div
                                                ref={nodeRef}
                                                className="pointer-events-auto absolute left-5 top-0  w-[50vw] resize overflow-hidden rounded-md border-2 border-border bg-backgroundGray xs:w-[40vw] sm:w-[20vw] md:w-[18vw]"
                                            >
                                                <div className="flex  items-center justify-between px-2 py-1.5">
                                                    <span className="text-xs  text-white md:text-sm">
                                                        Tele Ops
                                                    </span>
                                                    <span className="flex items-center gap-x-2">
                                                        <MdSwapVert
                                                            onClick={() => {
                                                                setSwapScreenStatus(
                                                                    ESwapScreenStatus.TELEOPS
                                                                );
                                                            }}
                                                            className="cursor-pointer"
                                                        />

                                                        <MdDragIndicator className="handle cursor-move" />
                                                    </span>
                                                </div>
                                                <div className="h-full w-full">
                                                    <Teleops
                                                        floatingWindow={true}
                                                    />
                                                </div>
                                            </div>
                                        </Draggable>
                                    </div>
                                )}

                            <MissionsView mapSearchEnabled />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
export default Dashboard;
