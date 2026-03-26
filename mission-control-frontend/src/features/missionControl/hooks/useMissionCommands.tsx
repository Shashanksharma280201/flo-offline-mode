import { toast } from "react-toastify";
import { useRosFns } from "../../../lib/ros/useRosFns";
import { useRobotConfigStore } from "../../../stores/robotConfigStore";
import { Message } from "roslib";
import { useMissionsStore } from "../../../stores/missionsStore";

const useMissionCommands = () => {
    const [setIsMissionExecuting, setIsAbortingMission, setIsTeleoperating, setIsLoadingTeleop] =
        useMissionsStore((state) => [
            state.setIsMissionExecuting,
            state.setIsAbortingMission,
            state.setIsTeleoperating,
            state.setIsLoadingTeleop
        ]);
    const { rosServiceCaller, rosSubscribe } = useRosFns();

    // const pauseMission = () => {
    //     if (!isMissionExecuting) {
    //         return;
    //     }
    //     setIsMissionPaused(true);
    //     rosServiceCaller(
    //         "/mission/pause",
    //         "lm_msgs/srv/MissionPause",
    //         (result) => {
    //             console.log(result);
    //             if (result?.success) {
    //                 toast.info(result.message);
    //             }
    //         },
    //         (error) => {
    //             console.log(error);
    //             toast.error(error);
    //         },
    //         {}
    //     );
    // };

    // const resumeMission = () => {
    //     if (!isMissionExecuting) {
    //         return;
    //     }
    //     if (selectedActionWayPoint && selectedActionWayPoint.index > -1) {
    //         const request = {
    //             resume_mission_point_index: selectedActionWayPoint.index
    //         };
    //         setIsMissionPaused(false);
    //         rosServiceCaller(
    //             "/mission/resume",
    //             "lm_msgs/srv/MissionResume",
    //             (result) => {
    //                 console.log(result);
    //                 if (result?.success) {
    //                     toast.info(result.message);
    //                     setSelectedActionWayPoint(
    //                         { action: { blade: false, deckHeight: 100 } },
    //                         -1
    //                     );
    //                 }
    //             },
    //             (error) => {
    //                 console.log(error);
    //                 toast.error(error);
    //             },
    //             request
    //         );
    //     } else {
    //         toast.info("Please select a waypoint to resume mission.");
    //     }
    // };
    const abortMission = (goal_id?: string) => {
        const request = {
            goal_id: goal_id ? goal_id : "0"
        };

        console.log("Abort mission called with goal_id:", goal_id);
        // Set aborting state to prevent multiple clicks
        setIsAbortingMission(true);

        // Show toast notification that abort is in progress
        toast.info("Aborting mission...", {
            position: "bottom-center",
            autoClose: 2000
        });

        // Try the service call - the service type should be srv not msg
        rosServiceCaller(
            "/path_mission/cancel",
            "mmr/srv/ActionCancel",
            (result) => {
                console.log("Abort service call result:", result);
                // Check if result has success field
                if (result && typeof result === 'object' && 'success' in result) {
                    if (!result.success) {
                        toast.error(result.message || "Failed to abort mission");
                        setIsAbortingMission(false);
                    } else {
                        toast.info("Abort request sent, waiting for mission to stop...", {
                            position: "bottom-center"
                        });
                    }
                } else {
                    // If no success field, assume it worked (some services don't return success)
                    console.log("Abort request sent (no success field in response)");
                    toast.info("Abort request sent, waiting for mission to stop...", {
                        position: "bottom-center"
                    });
                }
                // Keep isAbortingMission true until result arrives from action
            },
            (error) => {
                console.error("Abort service call error:", error);
                const errorMessage = typeof error === "string"
                    ? error
                    : error?.message || "Failed to send abort request";
                toast.error(errorMessage);
                // Reset aborting state on error
                setIsAbortingMission(false);
            },
            request
        );
    };
    const startTeleSession = () => {
        const request = {
            book: true,
            trigger: "web"
        };
        setIsLoadingTeleop(true);
        rosServiceCaller(
            "mmr_conductor/book_internet_teleop_session",
            "flo_msgs/srv/BookteleopSession",
            (result) => {
                setIsLoadingTeleop(false);
                console.log(result);
                if (result.success) {
                    setIsTeleoperating(true);
                } else {
                    toast.error(result.message);
                }
            },
            (error) => {
                setIsLoadingTeleop(false);
                console.log(error);
                toast.error(error);
            },
            request
        );
    };
    const stopTeleSession = () => {
        const request = {
            book: false,
            trigger: "web"
        };
        setIsLoadingTeleop(true);
        rosServiceCaller(
            "mmr_conductor/book_internet_teleop_session",
            "flo_msgs/srv/BookteleopSession",
            (result) => {
                setIsLoadingTeleop(false);
                console.log(result);
                if (result.success) {
                    setIsTeleoperating(false);
                } else {
                    setIsTeleoperating(false);
                    toast.error(result.message);
                }
            },
            (error) => {
                setIsLoadingTeleop(false);
                console.log(error);
                toast.error(error);
            },
            request
        );
    };

    return {
        abortMission,
        startTeleSession,
        stopTeleSession
    };
};
export default useMissionCommands;
