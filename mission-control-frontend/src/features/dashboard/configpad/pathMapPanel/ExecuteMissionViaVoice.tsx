import { useMissionsStore } from "@/stores/missionsStore";
import { useEffect, useRef, useState } from "react";
import { useReactMediaRecorder } from "react-media-recorder";
import { useMutation } from "react-query";
import { useShallow } from "zustand/react/shallow";
import { sendVoiceCmdFn, sendTextCmdFn, AutonomyContext } from "../../pathMapService";
import {
    deletePathMapFn,
    deleteMissionFn,
    updatePathMapFn,
    updateMissionFn
} from "../../pathMapService";
import { Mission, PathMap } from "@/data/types";
import { Id, toast } from "react-toastify";
import { errorLogger } from "@/util/errorLogger";
import SmIconButton from "@/components/ui/SmIconButton";
import { MdMic, MdRecordVoiceOver, MdCheck, MdClose } from "react-icons/md";
import Popup from "@/components/popup/Popup";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import { useRosFns } from "@/lib/ros/useRosFns";
import { Message } from "roslib";
import { useRobotStore } from "@/stores/robotStore";
import { useUserStore } from "@/stores/userStore";

// Types for Autonomy Agent response
interface AutonomyAgentResponse {
    success: boolean;
    transcription: string;
    response: string;
    executedFunctions: ExecutedFunction[];
    conversationId: string;
    executionData: any;
    missionControlData: any;
    needsInput: boolean;
    disambiguationData?: DisambiguationData;
    confirmationData?: ConfirmationData;
}

interface ExecutedFunction {
    function: string;
    arguments: any;
    result: any;
}

interface DisambiguationData {
    type: string;
    query: string;
    options: DisambiguationOption[];
    message: string;
    context: any;
}

interface DisambiguationOption {
    number: number;
    name: string;
    id?: string;
    status?: string;
    frame?: string;
}

interface ConfirmationData {
    message: string;
    action: string;
    data: any;
}

export const ExecuteMissionViaVoiceCommands = () => {
    const missionToastIdRef = useRef<Id>(null!);
    const [isOpen, setIsOpen] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [disambiguationDialogOpen, setDisambiguationDialogOpen] = useState(false);
    const [conversationId, setConversationId] = useState<string>("");

    const [
        mission,
        pathMap,
        selectedPathMap,
        isMissionExecuting,
        isPathMapping,
        isMissionPlanning,
        isNonRTKMode,
        isLocalized,
        setIsNonRTKMode,
        setFrameReference,
        setSelectedPathMap,
        setPathMap,
        setSelectedMission,
        setIsMissionExecuting,
        setIsAbortingMission,
        setIsMissionPlanning,
        clearMission,
        addStationToPathMap
    ] = useMissionsStore(
        useShallow((state) => [
            state.mission,
            state.pathMap,
            state.selectedPathMap,
            state.isMissionExecuting,
            state.isPathMapping,
            state.isMissionPlanning,
            state.isNonRTKMode,
            state.isLocalized,
            state.setIsNonRTKMode,
            state.setFrameReference,
            state.setSelectedPathMap,
            state.setPathMap,
            state.setMission,
            state.setIsMissionExecuting,
            state.setIsAbortingMission,
            state.setIsMissionPlanning,
            state.clearMission,
            state.addStationToPathMap
        ])
    );

    const selectedRobot = useRobotStore((state) => state.robot);
    const isRobotConnected = useRobotStore((state) => state.isRobotConnected);
    const setRobot = useRobotStore((state) => state.setRobot);
    const robots = useUserStore((state) => state.robots);
    const { rosServiceCaller, rosPublish, rosSubscribe } = useRosFns();

    // State for agent responses
    const [agentResponse, setAgentResponse] = useState<string>("");
    const [executionData, setExecutionData] = useState<any>(null);
    const [disambiguationData, setDisambiguationData] = useState<DisambiguationData | null>(null);
    const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);

    // Audio recording
    const {
        clearBlobUrl,
        status,
        startRecording,
        stopRecording,
        mediaBlobUrl
    } = useReactMediaRecorder({
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000
        } as any
    });

    // Build context object from current Zustand store state
    const buildContext = (): AutonomyContext => {
        return {
            robotId: selectedRobot?.id as string | undefined,
            robotName: selectedRobot?.name,
            robotType: selectedRobot?.robotType,
            robotStatus: selectedRobot?.status,
            isRobotConnected,
            pathMapId: selectedPathMap?.id || pathMap?.id as string | undefined,
            pathMapName: selectedPathMap?.name || pathMap?.name,
            pathMapFrame: pathMap?.frame,
            missionId: mission?._id as string | undefined,
            missionName: mission?.name,
            isMissionExecuting,
            isPathMapping,
            isMissionPlanning,
            isNonRTKMode,
            isLocalized
        };
    };

    // Text-to-speech helper
    const speakResponse = (message: string) => {
        try {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = 'en-US';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 0.9;
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error("Text-to-speech error:", error);
        }
    };

    const sendVoiceCommandMutation = useMutation({
        mutationFn: ({ audioFile, convId }: { audioFile: File; convId?: string }) =>
            sendVoiceCmdFn(audioFile, convId, buildContext()),
        onSuccess: (data: AutonomyAgentResponse) => {
            console.log("Autonomy Agent response:", data);

            // Store conversation ID for follow-ups
            if (data.conversationId) {
                setConversationId(data.conversationId);
            }

            // Speak the agent's response
            if (data.response) {
                setAgentResponse(data.response);
                speakResponse(data.response);
            }

            // Handle disambiguation
            if (data.needsInput && data.disambiguationData) {
                setDisambiguationData(data.disambiguationData);
                setDisambiguationDialogOpen(true);
                return;
            }

            // Handle confirmation
            if (data.needsInput && data.confirmationData) {
                setConfirmationData(data.confirmationData);
                setConfirmDialogOpen(true);
                return;
            }

            // Handle successful execution
            if (data.executionData && data.executionData.success) {
                handleExecutionData(data.executionData);
            }

            // Handle mission control actions
            if (data.missionControlData) {
                handleMissionControlAction(data.missionControlData);
            }

            // Handle all executed functions for new action types
            if (data.executedFunctions) {
                handleExecutedFunctions(data.executedFunctions);
            }

            // If no input needed and command processed, close dialog
            if (!data.needsInput && data.success) {
                setTimeout(() => {
                    setIsOpen(false);
                }, 2000);
            }
        },
        onError: (error: any) => {
            console.error("Voice command error:", error);
            const errorMsg = error.response?.data?.error || error.message || "Voice command failed";
            toast.error(errorMsg, { autoClose: 5000 });
            speakResponse("Sorry, there was an error processing your command.");
            errorLogger(error);
        }
    });

    // Mutation for text-based disambiguation (sendTextCmdFn)
    const sendTextCommandMutation = useMutation({
        mutationFn: ({ text, convId }: { text: string; convId: string }) =>
            sendTextCmdFn(text, convId, buildContext()),
        onSuccess: (data: AutonomyAgentResponse) => {
            console.log("Text command response:", data);

            if (data.conversationId) {
                setConversationId(data.conversationId);
            }

            if (data.response) {
                setAgentResponse(data.response);
                speakResponse(data.response);
            }

            if (data.needsInput && data.disambiguationData) {
                setDisambiguationData(data.disambiguationData);
                setDisambiguationDialogOpen(true);
                return;
            }

            if (data.needsInput && data.confirmationData) {
                setConfirmationData(data.confirmationData);
                setConfirmDialogOpen(true);
                return;
            }

            if (data.executionData && data.executionData.success) {
                handleExecutionData(data.executionData);
            }

            if (data.missionControlData) {
                handleMissionControlAction(data.missionControlData);
            }

            if (data.executedFunctions) {
                handleExecutedFunctions(data.executedFunctions);
            }

            if (!data.needsInput && data.success) {
                setTimeout(() => setIsOpen(false), 2000);
            }
        },
        onError: (error: any) => {
            console.error("Text command error:", error);
            toast.error(error.response?.data?.error || "Command failed");
            errorLogger(error);
        }
    });

    /**
     * Handle new action types from executedFunctions array
     * This covers actions added in Phase 3 (list, select, recording, planning)
     */
    const handleExecutedFunctions = (executedFunctions: ExecutedFunction[]) => {
        for (const ef of executedFunctions) {
            const result = ef.result;
            if (!result || !result.success) continue;

            switch (result.action) {
                case "select_pathmap":
                    if (result.pathMap) {
                        setSelectedPathMap({ id: result.pathMap.id, name: result.pathMap.name });
                        setPathMap(result.pathMap.fullObject || undefined);
                        toast.success(`PathMap '${result.pathMap.name}' selected`);
                    }
                    break;

                case "select_mission":
                    if (result.mission) {
                        setSelectedMission(result.mission.fullObject || undefined);
                        toast.success(`Mission '${result.mission.name}' selected`);
                    }
                    break;

                case "start_recording":
                    rosServiceCaller(
                        "/start_recording_path",
                        "std_srvs/srv/Trigger",
                        (res: any) => {
                            if (res.success) {
                                toast.success("Path recording started");
                                speakResponse("Path recording started");
                            } else {
                                toast.error("Failed to start recording: " + res.message);
                            }
                        },
                        (err: any) => {
                            toast.error("ROS error starting recording");
                            console.error(err);
                        }
                    );
                    break;

                case "stop_recording":
                    rosServiceCaller(
                        "/stop_recording_path",
                        "std_srvs/srv/Trigger",
                        async (res: any) => {
                            if (res.success) {
                                toast.success("Path recording stopped");
                                speakResponse("Path recording stopped");
                                // Auto-save if pathMap is available
                                if (pathMap && result.pathMapId) {
                                    try {
                                        await updatePathMapFn(
                                            pathMap.paths,
                                            pathMap.stations,
                                            pathMap.id as string
                                        );
                                        toast.success("PathMap saved");
                                    } catch (e) {
                                        console.error("Failed to auto-save pathmap:", e);
                                    }
                                }
                            } else {
                                toast.error("Failed to stop recording: " + res.message);
                            }
                        },
                        (err: any) => {
                            toast.error("ROS error stopping recording");
                            console.error(err);
                        }
                    );
                    break;

                case "start_planning":
                    setIsMissionPlanning(true);
                    toast.success("Mission planning started");
                    speakResponse("Mission planning started");
                    break;

                case "stop_planning":
                    setIsMissionPlanning(false);
                    toast.success("Mission planning stopped");
                    speakResponse("Mission planning stopped");
                    break;

                case "clear_mission":
                    clearMission();
                    toast.success("Mission points cleared");
                    speakResponse("Mission points cleared");
                    break;

                case "save_mission":
                    if (result.missionId && result.pathMapId && mission) {
                        updateMissionFn(result.missionId, result.pathMapId, mission.mission)
                            .then(() => {
                                toast.success(`Mission '${mission.name}' saved`);
                                speakResponse("Mission saved successfully");
                            })
                            .catch((e) => {
                                toast.error("Failed to save mission");
                                console.error(e);
                            });
                    } else {
                        toast.error("Cannot save mission - data missing");
                    }
                    break;

                default:
                    // For list results, the agent's text response handles communication
                    break;
            }
        }
    };

    const handleExecutionData = (data: any) => {
        console.log("Handling execution data:", data);

        // Check if this is a mission execution
        if (data.action === "execute" && data.robot && data.pathMap && data.mission) {
            setExecutionData(data);
            setConfirmDialogOpen(true);
        }
        // Handle other successful operations (pathmap creation, etc.)
        else if (data.success) {
            toast.success(data.message || "Operation completed successfully");
            if (data.nextSteps) {
                speakResponse(data.nextSteps);
            }
        }
    };

    const handleMissionControlAction = (data: any) => {
        console.log("Handling mission control action:", data);

        const { action, robot } = data;

        switch (action) {
            case "abort":
                if (data.requiresConfirmation) {
                    setConfirmationData({
                        message: data.confirmationMessage || `Abort mission on ${robot?.name}?`,
                        action: "abort",
                        data: data
                    });
                    setConfirmDialogOpen(true);
                } else {
                    // Directly abort - publish ROS cancel
                    doAbortMission(robot?.name);
                }
                break;

            case "pause":
                toast.info(`Pausing mission${robot?.name ? ` on ${robot.name}` : ""}...`);
                pauseMission();
                break;

            case "resume":
                toast.info(`Resuming mission${robot?.name ? ` on ${robot.name}` : ""}...`);
                // Use data from response, or fall back to current store state
                resumeMission({
                    pathMap: data.pathMap || pathMap,
                    mission: data.mission || mission
                });
                break;

            case "return":
                if (data.requiresConfirmation) {
                    setConfirmationData({
                        message: data.confirmationMessage,
                        action: "return",
                        data: data
                    });
                    setConfirmDialogOpen(true);
                } else {
                    toast.info(`Sending ${robot?.name} back to station...`);
                    returnToStation({
                        pathMap: data.pathMap || pathMap,
                        mission: data.mission || mission
                    });
                }
                break;

            default:
                if (data.success) {
                    toast.success(data.message);
                } else {
                    toast.error(data.message || "Action failed");
                }
        }
    };

    /**
     * Actually fire the ROS cancel command to abort the mission
     */
    const doAbortMission = (robotName?: string) => {
        try {
            const cancelPublisher = rosPublish(
                "/path_mission/cancel",
                "actionlib_msgs/GoalID"
            );

            if (cancelPublisher) {
                const cancelMsg = new Message({ id: "" }); // Empty ID cancels current goal
                cancelPublisher.publish(cancelMsg);
                setIsAbortingMission(true);
                setIsMissionExecuting(false);
                toast.success(`Mission aborted${robotName ? ` on ${robotName}` : ""}`);
                speakResponse("Mission aborted");
            } else {
                throw new Error("Failed to create abort publisher");
            }
        } catch (error: any) {
            console.error("Error aborting mission:", error);
            toast.error("Failed to abort mission");
            speakResponse("Failed to abort mission");
            errorLogger(error);
        }
    };

    /**
     * Handle disambiguation choice by sending text to backend
     */
    const handleDisambiguationChoice = (choice: string | number) => {
        setDisambiguationDialogOpen(false);

        const choiceText = typeof choice === 'number' ? choice.toString() : choice;
        toast.info(`Selected: ${choiceText}`);
        speakResponse(`Selected ${choiceText}`);

        if (!conversationId) {
            toast.error("No active conversation to continue");
            return;
        }

        // Send the choice as text continuation of conversation
        sendTextCommandMutation.mutate({
            text: choiceText,
            convId: conversationId
        });
    };

    const handleConfirmExecution = async () => {
        setConfirmDialogOpen(false);

        if (!executionData) {
            toast.error("No execution data available");
            return;
        }

        try {
            const { robot, pathMap: execPathMap, mission: execMission } = executionData;

            // Check if we need to switch robots
            if (robot && robot.id !== selectedRobot?.id) {
                // Switch to the requested robot
                setRobot(robot);
                toast.info(`Switched to robot ${robot.name}`, { autoClose: 2000 });
                speakResponse(`Switching to robot ${robot.name}`);

                // Give a moment for the switch to take effect
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Update store
            setSelectedPathMap({ id: execPathMap.id, name: execPathMap.name });
            setPathMap(execPathMap);
            setSelectedMission(execMission);

            // Setup and execute
            await setupForNonRTKMode(execPathMap, execMission);
            executeMissionHandler({ pathMap: execPathMap, mission: execMission });

            speakResponse(`Mission ${execMission.name} started on ${robot?.name || 'robot'}`);
            toast.success(`Mission ${execMission.name} started on ${execPathMap.name}`);
            setIsOpen(false);
            setExecutionData(null);

        } catch (error: any) {
            toast.error(error.message || "Failed to execute mission");
            speakResponse("Mission execution failed");
            errorLogger(error);
        }
    };

    const handleCancelAction = () => {
        setConfirmDialogOpen(false);
        setExecutionData(null);
        setConfirmationData(null);
        toast.info("Action cancelled");
        speakResponse("Action cancelled");
    };

    const recordingHandler = async () => {
        if (status === "recording") {
            stopRecording();
        } else {
            // Reset state for new recording
            setExecutionData(null);
            setDisambiguationData(null);
            setConfirmationData(null);
            setAgentResponse("");
            clearBlobUrl();
            startRecording();
        }
    };

    useEffect(() => {
        const sendAudioIfReady = async () => {
            if (mediaBlobUrl) {
                const response = await fetch(mediaBlobUrl);
                const blob = await response.blob();
                const audioFile = new File([blob], "voice-command.wav", {
                    type: "audio/wav"
                });

                if (!audioFile) {
                    toast.error("Failed to fetch audio file");
                    return;
                }

                sendVoiceCommandMutation.mutate({
                    audioFile,
                    convId: conversationId || undefined
                });
            }
        };
        sendAudioIfReady();
    }, [mediaBlobUrl]);

    const startMissionAction = (payload: any, mission: Mission) => {
        const actionGoalPublisher = rosPublish(
            "/path_mission/goal",
            "mmr/msg/PathMissionActionGoal"
        );
        const actionGoal = new Message(payload);
        if (!actionGoalPublisher) return;

        actionGoalPublisher.publish(actionGoal);

        const feedbackSubscriber = rosSubscribe(
            "/path_mission/feedback",
            "mmr/msg/PathMissionActionFeedback"
        );
        const resultSubscriber = rosSubscribe(
            "/path_mission/result",
            "mmr/msg/PathMissionActionResult"
        );
        setIsMissionExecuting(true);

        feedbackSubscriber?.subscribe((feedback: any) => {
            if (missionToastIdRef.current) {
                toast.update(missionToastIdRef.current, {
                    render: (
                        <div className="flex items-center justify-between">
                            <span>Mission in progress</span>
                            <span>
                                {` ${feedback.number_of_paths_done + 1}/${mission?.mission.length}`}
                            </span>
                        </div>
                    ),
                    isLoading: true
                });
            }
        });

        resultSubscriber?.subscribe((result: any) => {
            if (result) {
                setIsMissionExecuting(false);
                feedbackSubscriber?.unsubscribe();
                resultSubscriber?.unsubscribe();
                actionResult(result);
            }
        });
    };

    const actionResult = (result: any) => {
        console.log("Mission Result", result);
        setIsMissionExecuting(false);
        setIsAbortingMission(false);

        if (missionToastIdRef.current) {
            const message = result.message || (result.success ? "Mission completed" : "Mission failed");

            if (result.success) {
                toast.update(missionToastIdRef.current, {
                    render: message,
                    type: "success",
                    isLoading: false,
                    closeOnClick: true,
                    autoClose: 3000
                });
                speakResponse("Mission completed successfully");
            } else {
                toast.update(missionToastIdRef.current, {
                    render: message,
                    type: "error",
                    isLoading: false,
                    closeOnClick: true,
                    autoClose: 3000
                });
                speakResponse("Mission failed");
            }
        }
    };

    const executeMissionHandler = ({ pathMap, mission }: { pathMap: PathMap; mission: Mission }) => {
        try {
            if (!mission || !pathMap) {
                toast.error("Mission or PathMap missing");
                return;
            }

            const finalMission = mission.mission.map((path) => ({
                points: path.utm
            }));

            const finalLatLngPath = mission.mission.map((path) => ({
                path: path.gps
            }));

            const destStationId = mission.mission[mission.mission.length - 1].destStationId;
            const destStation = pathMap.stations.find((value) => value.id === destStationId);

            if (destStation) {
                const finalPose = {
                    point: {
                        x: destStation.x,
                        y: destStation.y
                    },
                    yaw: destStation.theta
                };

                const missionGoal = {
                    goal_id: `${pathMap.id}-${mission._id}`,
                    paths: finalMission,
                    lat_lng_paths: finalLatLngPath,
                    final_pose: finalPose,
                    frame: pathMap.frame || "utm"
                };

                startMissionAction(missionGoal, mission);
                missionToastIdRef.current = toast.loading("Mission in progress", {
                    position: "bottom-center"
                });
            } else {
                toast.error("Destination station not found");
            }
        } catch (error: any) {
            toast.error(error.message || "Mission execution failed");
            errorLogger(error);
        }
    };

    /**
     * Pause the currently executing mission
     */
    const pauseMission = () => {
        try {
            const cancelPublisher = rosPublish(
                "/path_mission/cancel",
                "actionlib_msgs/GoalID"
            );

            if (cancelPublisher) {
                const cancelMsg = new Message({ id: "" }); // Empty ID cancels current goal
                cancelPublisher.publish(cancelMsg);
                toast.success("Mission paused successfully");
                speakResponse("Mission paused");
                setIsMissionExecuting(false);
            } else {
                throw new Error("Failed to create pause publisher");
            }
        } catch (error: any) {
            console.error("Error pausing mission:", error);
            toast.error("Failed to pause mission");
            speakResponse("Failed to pause mission");
            errorLogger(error);
        }
    };

    /**
     * Resume the paused mission
     */
    const resumeMission = ({ pathMap, mission }: { pathMap?: PathMap; mission?: Mission }) => {
        try {
            if (!pathMap || !mission) {
                toast.error("Cannot resume - mission data missing");
                return;
            }

            // Re-execute the mission
            executeMissionHandler({ pathMap, mission });
            speakResponse("Mission resumed");
        } catch (error: any) {
            console.error("Error resuming mission:", error);
            toast.error("Failed to resume mission");
            speakResponse("Failed to resume mission");
            errorLogger(error);
        }
    };

    /**
     * Send robot back to starting station
     */
    const returnToStation = ({ pathMap, mission }: { pathMap?: PathMap; mission?: Mission }) => {
        try {
            if (!pathMap || !mission) {
                toast.error("Cannot return - pathmap/mission data missing");
                return;
            }

            // Get the starting station
            const startingStationLatLng = mission.mission[0].gps[0];
            const startingStation = pathMap.stations.find(
                (station) =>
                    station.lat === startingStationLatLng.lat &&
                    station.lng === startingStationLatLng.lng
            );

            if (!startingStation) {
                toast.error("Starting station not found");
                return;
            }

            // Create a simple return mission
            const returnMission = {
                paths: [{
                    points: [{
                        x: startingStation.x,
                        y: startingStation.y
                    }]
                }],
                lat_lng_paths: [{
                    path: [{
                        lat: startingStation.lat,
                        lng: startingStation.lng
                    }]
                }],
                final_pose: {
                    point: {
                        x: startingStation.x,
                        y: startingStation.y
                    },
                    yaw: startingStation.theta
                },
                frame: pathMap.frame || "utm"
            };

            const actionGoalPublisher = rosPublish(
                "/path_mission/goal",
                "mmr/msg/PathMissionActionGoal"
            );

            if (actionGoalPublisher) {
                const actionGoal = new Message({ goal_id: `return-to-station-${Date.now()}`, ...returnMission });
                actionGoalPublisher.publish(actionGoal);
                toast.success("Returning to station...");
                speakResponse("Returning to station");
                setIsMissionExecuting(true);
            }
        } catch (error: any) {
            console.error("Error returning to station:", error);
            toast.error("Failed to return to station");
            speakResponse("Failed to return to station");
            errorLogger(error);
        }
    };

    /**
     * Capture robot's current position via ROS service and save as station
     */
    const captureRobotPositionForStation = (
        stationName: string,
        pathMapId: string,
        pathMapFullObject: PathMap
    ) => {
        rosServiceCaller(
            "/get_robot_pose",
            "flo_msgs/srv/GetPose",
            async (result: any) => {
                if (!result || !result.success) {
                    toast.error("Failed to get robot position");
                    return;
                }

                const { x, y, theta, lat, lng } = result.pose || result;

                // Add station to local store
                const newStation = {
                    id: stationName,
                    x: x || 0,
                    y: y || 0,
                    lat: lat || 0,
                    lng: lng || 0,
                    theta: theta || 0
                };

                addStationToPathMap(newStation);

                // Save to server
                try {
                    const updatedStations = [...pathMapFullObject.stations, newStation];
                    await updatePathMapFn(
                        pathMapFullObject.paths,
                        updatedStations,
                        pathMapId
                    );
                    toast.success(`Station '${stationName}' added at current position`);
                    speakResponse(`Station ${stationName} added successfully`);
                } catch (e) {
                    toast.error("Failed to save station to server");
                    console.error(e);
                }
            },
            (error: any) => {
                toast.error("ROS error getting robot pose");
                console.error("get_robot_pose error:", error);
            }
        );
    };

    const setupForNonRTKMode = (pathMap: PathMap, mission: Mission): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (pathMap.frame === "utm") {
                resolve();
                return;
            }

            const startingStationLatLng = mission.mission[0].gps[0];
            const startingStation = pathMap.stations.find(
                (station) =>
                    station.lat === startingStationLatLng.lat &&
                    station.lng === startingStationLatLng.lng
            );

            setFrameReference(pathMap.frame || "odom");

            if (!startingStation) {
                reject(new Error("Starting station not found"));
                return;
            }

            rosServiceCaller(
                "/mmr/experimental/enable",
                "flo_msgs/srv/Enable",
                (result: { message: string; success: boolean }) => {
                    if (result.success) {
                        setIsNonRTKMode(true);
                        rosServiceCaller(
                            "/mmr/experimental/reset_position",
                            "mmr/srv/ResetPosition",
                            () => {
                                rosServiceCaller(
                                    "/mmr/experimental/reset_position",
                                    "mmr/srv/ResetPosition",
                                    (result: { message: string; success: boolean }) => {
                                        if (result.success) {
                                            resolve();
                                        } else {
                                            reject(new Error("Failed to set starting position"));
                                        }
                                    },
                                    (error) => reject(new Error(error.message)),
                                    {
                                        frame_id: pathMap.frame,
                                        lat: startingStation.lat,
                                        lng: startingStation.lng,
                                        yaw: startingStation.theta
                                    }
                                );
                            },
                            (error) => reject(new Error(error.message)),
                            {
                                frame_id: pathMap.frame,
                                lat: startingStation.lat,
                                lng: startingStation.lng,
                                yaw: -5.0
                            }
                        );
                    } else {
                        reject(new Error(result.message || "Failed to enable non-RTK mode"));
                    }
                },
                (error) => reject(new Error(error.message)),
                { enable: true }
            );
        });
    };

    const isProcessing = sendVoiceCommandMutation.isLoading || sendTextCommandMutation.isLoading;

    return (
        <>
            <div className="flex items-center justify-center">
                <SmIconButton
                    isLoading={false}
                    name={status === "recording" ? "Stop" : "Autonomy Agent"}
                    className={cn(
                        "bg-primary700 text-white",
                        status === "recording" && "bg-red-500"
                    )}
                    onClick={() => setIsOpen(true)}
                >
                    <MdRecordVoiceOver className="h-4 w-4 text-white" />
                </SmIconButton>
            </div>

            {/* Recording Dialog */}
            <Popup
                dialogToggle={isOpen}
                onClose={() => {
                    setIsOpen(false);
                    window.speechSynthesis.cancel();
                }}
                title="Autonomy Voice Agent"
                description="Command Executor - Create pathmaps, missions, and control robots"
            >
                <div className="flex flex-col items-center gap-4">
                    {/* Context indicator */}
                    {selectedRobot && (
                        <div className="w-full px-3 py-2 rounded-md bg-primary600/10 border border-primary600/30 text-xs text-gray-400">
                            <span className="font-semibold text-primary400">Active: </span>
                            {selectedRobot.name}
                            {selectedPathMap && ` › ${selectedPathMap.name}`}
                            {mission && ` › ${mission.name}`}
                        </div>
                    )}

                    <Recorder
                        isRecording={status === "recording"}
                        handleRecording={recordingHandler}
                    />
                    {isProcessing && (
                        <div className="flex items-center gap-2">
                            <LoadingSpinner className="h-4 w-4 animate-spin fill-white text-background" />
                            <span className="text-sm text-secondary">Processing...</span>
                        </div>
                    )}

                    {/* Show agent response */}
                    {agentResponse && (
                        <div className="w-full mt-2 p-3 rounded-md bg-primary600/20 border border-primary600">
                            <p className="text-sm text-white">{agentResponse}</p>
                        </div>
                    )}

                    {/* Examples */}
                    <div className="w-full mt-4 p-3 rounded-md bg-backgroundGray/50 border border-border">
                        <p className="text-xs text-gray-400 font-semibold mb-2">Try saying:</p>
                        <ul className="text-xs text-gray-300 space-y-1">
                            <li>• "Send MMR-31 to kitchen in office"</li>
                            <li>• "Create pathmap warehouse in GPS mode"</li>
                            <li>• "Add station named loading dock"</li>
                            <li>• "Pause mission"</li>
                            <li>• "Abort mission"</li>
                            <li>• "Resume mission"</li>
                            <li>• "List all pathmaps"</li>
                        </ul>
                    </div>
                </div>
            </Popup>

            {/* Disambiguation Dialog */}
            <Popup
                dialogToggle={disambiguationDialogOpen}
                onClose={() => setDisambiguationDialogOpen(false)}
                title="Choose Option"
                description={disambiguationData?.message || "Multiple options found"}
            >
                {disambiguationData && (
                    <div className="space-y-3">
                        <div className="max-h-64 overflow-y-auto space-y-2">
                            {disambiguationData.options.map((option) => (
                                <button
                                    key={option.number}
                                    onClick={() => handleDisambiguationChoice(option.name)}
                                    className="w-full flex items-center justify-between p-3 rounded-md border border-border bg-backgroundGray hover:bg-primary600/20 hover:border-primary600 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary600 text-xs font-bold text-white">
                                            {option.number}
                                        </span>
                                        <span className="text-sm font-medium text-white">{option.name}</span>
                                    </div>
                                    {option.status && (
                                        <span className="text-xs text-gray-400">{option.status}</span>
                                    )}
                                    {option.frame && (
                                        <span className="text-xs text-gray-400 uppercase">{option.frame}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                        {sendTextCommandMutation.isLoading && (
                            <div className="flex items-center justify-center gap-2">
                                <LoadingSpinner className="h-4 w-4 animate-spin fill-white text-background" />
                                <span className="text-sm text-secondary">Processing choice...</span>
                            </div>
                        )}
                        <p className="text-xs text-center text-gray-400">
                            Click an option or record a new voice command
                        </p>
                    </div>
                )}
            </Popup>

            {/* Confirmation Dialog */}
            <Popup
                dialogToggle={confirmDialogOpen}
                onClose={handleCancelAction}
                title={confirmationData?.message || "Confirm Mission Execution"}
                description="Review and confirm before proceeding"
            >
                {executionData && executionData.action === "execute" && (
                    <div className="space-y-4">
                        <div className="rounded-md border border-border bg-backgroundGray/30 p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Robot:</span>
                                <span className="font-medium text-white">{executionData.robot.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">PathMap:</span>
                                <span className="font-medium text-white">{executionData.pathMap.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Mission:</span>
                                <span className="font-medium text-white">{executionData.mission.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Frame:</span>
                                <span className="font-medium text-white uppercase">{executionData.pathMap.frame}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleConfirmExecution}
                                className="flex-1 flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                            >
                                <MdCheck className="h-5 w-5" />
                                Execute Mission
                            </button>
                            <button
                                onClick={handleCancelAction}
                                className="flex-1 flex items-center justify-center gap-2 rounded-md border border-red-500 bg-red-500/20 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/30"
                            >
                                <MdClose className="h-5 w-5" />
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {confirmationData && (
                    <div className="space-y-4">
                        <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-4">
                            <p className="text-sm text-yellow-200">{confirmationData.message}</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setConfirmDialogOpen(false);

                                    if (!confirmationData) return;

                                    switch (confirmationData.action) {
                                        case "abort":
                                            doAbortMission(confirmationData.data?.robot?.name);
                                            break;

                                        case "pause":
                                            pauseMission();
                                            break;

                                        case "resume":
                                            resumeMission({
                                                pathMap: confirmationData.data?.pathMap || pathMap,
                                                mission: confirmationData.data?.mission || mission
                                            });
                                            break;

                                        case "return":
                                            returnToStation({
                                                pathMap: confirmationData.data?.pathMap || pathMap,
                                                mission: confirmationData.data?.mission || mission
                                            });
                                            break;

                                        case "delete_pathmap":
                                            if (confirmationData.data?.pathMap?.id) {
                                                deletePathMapFn(confirmationData.data.pathMap.id)
                                                    .then(() => {
                                                        toast.success(`PathMap deleted`);
                                                        speakResponse("PathMap deleted successfully");
                                                        // Clear selection if deleted pathmap was selected
                                                        if (selectedPathMap?.id === confirmationData.data.pathMap.id) {
                                                            setSelectedPathMap(undefined);
                                                            setPathMap(undefined);
                                                        }
                                                    })
                                                    .catch((e) => {
                                                        toast.error("Failed to delete pathmap");
                                                        console.error(e);
                                                    });
                                            } else {
                                                toast.error("PathMap ID missing");
                                            }
                                            break;

                                        case "delete_mission":
                                            if (
                                                confirmationData.data?.mission?.id &&
                                                confirmationData.data?.pathMap?.id
                                            ) {
                                                deleteMissionFn(
                                                    confirmationData.data.mission.id,
                                                    confirmationData.data.pathMap.id
                                                )
                                                    .then(() => {
                                                        toast.success(`Mission deleted`);
                                                        speakResponse("Mission deleted successfully");
                                                        // Clear mission from store if it was selected
                                                        if (mission?._id === confirmationData.data.mission.id) {
                                                            setSelectedMission(undefined);
                                                        }
                                                    })
                                                    .catch((e) => {
                                                        toast.error("Failed to delete mission");
                                                        console.error(e);
                                                    });
                                            } else {
                                                toast.error("Mission or PathMap ID missing");
                                            }
                                            break;

                                        case "add_station":
                                            // Capture robot position for the station
                                            if (
                                                confirmationData.data?.stationName &&
                                                confirmationData.data?.pathMap?.id &&
                                                pathMap
                                            ) {
                                                captureRobotPositionForStation(
                                                    confirmationData.data.stationName,
                                                    confirmationData.data.pathMap.id,
                                                    pathMap
                                                );
                                            } else {
                                                toast.error("Station data missing");
                                            }
                                            break;

                                        default:
                                            toast.success("Action confirmed");
                                            break;
                                    }

                                    setConfirmationData(null);
                                }}
                                className="flex-1 rounded-md bg-yellow-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-yellow-700"
                            >
                                Yes, Continue
                            </button>
                            <button
                                onClick={handleCancelAction}
                                className="flex-1 rounded-md border border-border bg-backgroundGray px-4 py-2.5 text-sm font-semibold text-white hover:bg-backgroundGray/70"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </Popup>
        </>
    );
};

const Recorder = ({
    isRecording,
    handleRecording
}: {
    isRecording: boolean;
    handleRecording: () => void;
}) => {
    const [currentTime, setCurrentTime] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!isRecording) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            setCurrentTime(0);
        } else {
            setCurrentTime(0);
            intervalRef.current = setInterval(() => {
                setCurrentTime((prev) => {
                    if (prev >= 20) {
                        handleRecording();
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRecording, handleRecording]);

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative flex flex-col items-center justify-center">
                {isRecording && (
                    <>
                        <div className="absolute size-14 animate-ping rounded-full border border-primary600" />
                        <div className="absolute size-12 animate-ping rounded-full border border-primary600 animation-delay-200" />
                        <div className="absolute size-8 animate-ping rounded-full border border-primary600 animation-delay-400" />
                    </>
                )}
                <button
                    onClick={handleRecording}
                    className={cn(
                        "z-10 flex h-16 w-16 items-center justify-center rounded-full transition-colors",
                        isRecording ? "bg-red-500 hover:bg-red-600" : "bg-primary600 hover:bg-primary700"
                    )}
                >
                    <MdMic size={32} className="text-white" />
                </button>
            </div>
            <div className="text-center">
                <p className="text-2xl font-mono font-bold text-white">
                    {dayjs.duration(currentTime, "second").format("mm:ss")}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    {isRecording ? "Recording..." : "Click to record"}
                </p>
            </div>
        </div>
    );
};
