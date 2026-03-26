import { useRef, useState } from "react";
import {
    MdCancel,
    MdDelete,
    MdDone,
    MdPlayArrow,
    MdSave,
    MdStop
} from "react-icons/md";
import SmIconButton from "../../../components/ui/SmIconButton";
import { toast } from "react-toastify";
import { useMutation } from "react-query";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { MdAdd } from "react-icons/md";
import CustomDisclosure from "../../../components/disclosure/CustomDisclosure";
import { useR3fStore } from "../../../stores/r3fStore";
import { errorLogger } from "../../../util/errorLogger";
import useMissionCommands from "../../missionControl/hooks/useMissionCommands";
import useRos2Action from "../../../lib/ros/useRos2Action";
import {
    createMissionFn,
    deleteMissionFn,
    updateMissionFn
} from "../pathMapService";
import { Mission, PathMap } from "../../../data/types";
import { useMissionsStore } from "../../../stores/missionsStore";
import { Vector2 } from "three";
import ComboBox from "@/components/comboBox/ComboBox";
import Popup from "@/components/popup/Popup";
import { useShallow } from "zustand/react/shallow";

const MissionsPanel = () => {
    const [missionName, setMissionName] = useState<string>();
    const createInputRef = useRef<HTMLInputElement>(null);
    const setClickPosition = useR3fStore((state) => state.setClickPosition);
    const { abortMission } = useMissionCommands();

    const [createMissionToggle, setCreateMissionToggle] = useState(false);
    const [
        pathMap,
        mission,
        setMission,
        isMissionExecuting,
        setIsMissionExecuting,
        isAbortingMission,
        setIsAbortingMission,
        isMissionPlanning,
        setIsMissionPlanning,
        setSelectedStation,
        clearMission,
        isExecutingDifferentMission,
        missionToastId,
        setMissionToastId,
        setPathMapMissions,
        isNonRTKMode
    ] = useMissionsStore(
        useShallow((state) => [
            state.pathMap,
            state.mission,
            state.setMission,
            state.isMissionExecuting,
            state.setIsMissionExecuting,
            state.isAbortingMission,
            state.setIsAbortingMission,
            state.isMissionPlanning,
            state.setIsMissionPlanning,
            state.setSelectedStation,
            state.clearMission,
            state.isExecutingDifferentMission,
            state.missionToastId,
            state.setMissionToastId,
            state.setPathMapMissions,
            state.isNonRTKMode
        ])
    );
    const [deleteDialogToggle, setDeleteDialogToggle] = useState(false);

    const { startRosAction: startMissionAction } = useRos2Action(
        "/path_mission",
        "mmr/msg/PathMission",
        (result) => {
            console.log("Mission Result", result);
            // Reset both mission executing and aborting states
            setIsMissionExecuting(false);
            setIsAbortingMission(false);
            if (missionToastId) {
                if (result.success) {
                    toast.update(missionToastId, {
                        render: result.message,
                        type: "success",
                        isLoading: false,
                        closeOnClick: true,
                        autoClose: 3000
                    });
                } else {
                    toast.update(missionToastId, {
                        render: result.message,
                        type: "error",
                        isLoading: false,
                        closeOnClick: true,
                        autoClose: 3000
                    });
                }
            }
        },
        (feedback: { goal_id: string; number_of_paths_done: number }) => {
            if (missionToastId) {
                toast.update(missionToastId, {
                    render: (
                        <div className="flex items-center justify-between">
                            <span>Mission is in progress</span>
                            <span>
                                {` ${feedback.number_of_paths_done + 1}/${
                                    mission?.mission.length
                                }`}
                            </span>
                        </div>
                    ),
                    isLoading: true
                });
            }
        },
        setIsMissionExecuting
    );

    const updateMissionsMutation = useMutation(
        ({ mission, pathMapId }: { mission: Mission; pathMapId: string }) =>
            updateMissionFn(mission._id, pathMapId, mission.mission),
        {
            onSuccess: (data: PathMap, { mission }) => {
                setPathMapMissions(data.missions);
                setMission(mission);
            },
            onError: errorLogger
        }
    );
    const { mutate: deleteMission, isLoading: isDeletingMission } = useMutation(
        async ({
            missionId,
            pathMapId
        }: {
            missionId: string;
            pathMapId: string;
        }) => deleteMissionFn(missionId, pathMapId),
        {
            onSuccess: (data: PathMap) => {
                toast.success("Mission deleted successfully", {
                    pauseOnFocusLoss: false,
                    position: "bottom-right"
                });
                setPathMapMissions(data.missions);
                setMission(undefined);
            },
            onError: errorLogger
        }
    );
    const createMissionMutation = useMutation(
        ({ name, pathMapId }: { name: string; pathMapId: string }) =>
            createMissionFn(name, pathMapId),
        {
            onSuccess: (data: PathMap, { name }) => {
                toast.success("Saved successfully", {
                    pauseOnFocusLoss: false,
                    position: "bottom-right"
                });
                setPathMapMissions(data.missions);
                const availableMission = data.missions.find(
                    (mission) => mission.name === name
                );
                setMission(availableMission);
            },
            onError: errorLogger
        }
    );

    const handleCreateNewMission = () => {
        if (pathMap && missionName) {
            createMissionMutation.mutate({
                name: missionName,
                pathMapId: pathMap.id
            });
        } else {
            toast.error("Please select a path map for the mission");
        }
    };

    const handleSaveMission = () => {
        if (mission && pathMap) {
            updateMissionsMutation.mutate({
                mission,
                pathMapId: pathMap.id
            });
        } else {
            toast.error("No mission selected");
        }
    };

    const handleCreateToggle = () => {
        setCreateMissionToggle((prev) => !prev);
        createInputRef.current?.focus();
    };

    const handleClearMissionPoints = () => {
        clearMission();
        setIsMissionPlanning(false);
        setClickPosition(new Vector2(-Number.MIN_VALUE, -Number.MIN_VALUE));
        setSelectedStation(undefined);
    };

    const startMissionPlanningHandler = () => {
        setClickPosition(new Vector2(-Number.MIN_VALUE, -Number.MIN_VALUE));
        setIsMissionPlanning(true);
    };
    const stopMissionPlanningHandler = () => {
        setIsMissionPlanning(false);
        if (mission && pathMap && mission.mission.length > 0) {
            const destStationId =
                mission.mission[mission.mission.length - 1].destStationId;
            const destStation = pathMap.stations.find(
                (value) => value.id === destStationId
            );
            setSelectedStation(destStation);
        }
        handleSaveMission();
    };

    const executeMissionHandler = () => {
        stopMissionPlanningHandler();
        try {
            if (!isNonRTKMode && pathMap?.frame !== "utm") {
                throw new Error(
                    "Cannot Execute mission for a frame thats not UTM, Please change pathmap and try again"
                );
            }
            if (mission && pathMap) {
                const finalMission = mission.mission.map((path) => {
                    return {
                        points: path.utm
                    };
                });
                const finalLatLngPath = mission.mission.map((path) => {
                    return {
                        path: path.gps
                    };
                });
                console.log(finalMission);
                const destStationId =
                    mission.mission[mission.mission.length - 1].destStationId;
                const destStation = pathMap.stations.find(
                    (value) => value.id === destStationId
                );
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
                        frame: pathMap.frame ? pathMap.frame : "utm"
                    };
                    console.log(missionGoal);
                    startMissionAction(missionGoal);

                    const toastId = toast.loading(`Mission is in Progress`, {
                        position: "bottom-center"
                    });
                    setMissionToastId(toastId);
                } else {
                    toast.error("No Destination station selected");
                }
            } else {
                toast.error("No mission selected");
            }
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const deleteMissionHandler = () => {
        if (mission && pathMap) {
            deleteMission({ missionId: mission._id, pathMapId: pathMap.id });
        } else {
            toast.error("No pathmap or mission selected.");
        }
        setDeleteDialogToggle(false);
    };
    const closeDeleteDialogHandler = () => {
        setDeleteDialogToggle(false);
    };

    // Debug logging for abort button visibility
    console.log("[MISSIONS_PANEL] mission:", mission);
    console.log("[MISSIONS_PANEL] isMissionExecuting:", isMissionExecuting);
    console.log("[MISSIONS_PANEL] isExecutingDifferentMission:", isExecutingDifferentMission);
    console.log("[MISSIONS_PANEL] pathMap:", pathMap);
    console.log("[MISSIONS_PANEL] Abort button should show:", mission && !isExecutingDifferentMission && isMissionExecuting);

    return (
        <>
            <div className="flex flex-col gap-3 border-y border-white/10 bg-gray-900/50 px-3 py-4 text-sm sm:gap-4 sm:px-4 sm:py-5">
                <div className="flex items-center gap-x-2">
                    <span className="font-medium text-white">Selected PathMap:</span>
                    {pathMap ? (
                        <div className="font-semibold text-white">{pathMap.name}</div>
                    ) : (
                        <div className="text-gray-400">No data</div>
                    )}
                </div>
                <div className="flex items-center gap-x-2">
                    <span className="font-medium text-white">Selected Mission:</span>
                    {mission ? (
                        <div className="font-semibold text-white">{mission.name}</div>
                    ) : (
                        <div className="text-gray-400">No mission Selected</div>
                    )}
                </div>
                <div className="flex items-center gap-x-2">
                    <span className="font-medium text-white">No of Paths in Mission:</span>
                    {mission ? (
                        <span
                            className={`font-semibold ${
                                mission.mission.length > 0
                                    ? "text-green-400"
                                    : "text-white"
                            }`}
                        >
                            {mission.mission.length}
                        </span>
                    ) : (
                        <span className="text-gray-400">No Mission Data</span>
                    )}
                </div>
            </div>
            <div className="flex w-full flex-col items-center justify-between">
                {!isMissionExecuting && (
                    <CustomDisclosure name={"Select"} defaultOpen={true}>
                        <ComboBox
                            label="missions"
                            items={pathMap ? pathMap.missions : []}
                            selectedItem={mission}
                            setSelectedItem={setMission}
                            getItemLabel={(mission) =>
                                mission ? mission.name : ""
                            }
                            placeholder="Select Missions"
                            wrapperClassName="bg-backgroundGray"
                            compareItems={(itemOne, itemTwo) =>
                                itemOne?._id === itemTwo?._id
                            }
                            showLabel={false}
                        />

                        {!createMissionToggle ? (
                            <div className="flex w-full items-center justify-between">
                                <span className="rounded-md text-sm">
                                    Create Mission
                                </span>
                                <SmIconButton
                                    name={"Create"}
                                    onClick={handleCreateToggle}
                                >
                                    <MdAdd className="h-4 w-4 text-white" />
                                </SmIconButton>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-x-1">
                                <input
                                    type="text"
                                    className="w-[65%] rounded-md bg-backgroundGray p-3 text-xs text-white placeholder:text-neutral-400 focus:outline-none"
                                    placeholder="Enter Mission Name"
                                    ref={createInputRef}
                                    autoFocus
                                    onBlur={() => {
                                        setTimeout(() => {
                                            setCreateMissionToggle(false);
                                        }, 300);
                                    }}
                                    onChange={(e) =>
                                        setMissionName(e.target.value)
                                    }
                                />
                                <SmIconButton
                                    name={"Submit"}
                                    onClick={handleCreateNewMission}
                                >
                                    {createMissionMutation.isLoading ? (
                                        <LoadingSpinner className="h-3 w-3 animate-spin fill-white text-background" />
                                    ) : (
                                        <MdDone className="text-white" />
                                    )}
                                </SmIconButton>
                            </div>
                        )}
                        {mission && (
                            <div className="flex w-full items-center justify-between">
                                <span className="rounded-md text-sm">
                                    Delete Mission
                                </span>
                                <SmIconButton
                                    isLoading={isDeletingMission}
                                    name={"Delete"}
                                    className="bg-red-500 text-white"
                                    onClick={() => setDeleteDialogToggle(true)}
                                >
                                    <MdDelete className="h-4 w-4 text-white" />
                                </SmIconButton>
                            </div>
                        )}
                    </CustomDisclosure>
                )}

                {/* Show Commands section if mission exists (fetched from robot state on reload) */}
                {mission && !isExecutingDifferentMission && (
                    <CustomDisclosure name={"Commands"} defaultOpen={true}>
                        {isMissionExecuting ? (
                            <div className="flex items-center justify-between">
                                <span>{isAbortingMission ? "Aborting..." : "Abort Mission"}</span>
                                <SmIconButton
                                    name={isAbortingMission ? "Aborting..." : "Abort"}
                                    isLoading={isAbortingMission}
                                    onClick={() => {
                                        if (isAbortingMission || !pathMap) return; // Prevent multiple clicks
                                        console.log(
                                            "Aborting Mission",
                                            `${pathMap.id}-${mission._id}`
                                        );
                                        abortMission(`${pathMap.id}-${mission._id}`);
                                    }}
                                    className={`bg-red-400 ${isAbortingMission ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                    {isAbortingMission ? (
                                        <LoadingSpinner className="h-3 w-3 animate-spin fill-white text-background" />
                                    ) : (
                                        <MdCancel className="text-white" />
                                    )}
                                </SmIconButton>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <span>Execute Mission</span>
                                <SmIconButton
                                    name="Execute"
                                    onClick={executeMissionHandler}
                                >
                                    <MdPlayArrow className="text-white" />
                                </SmIconButton>
                            </div>
                        )}
                    </CustomDisclosure>
                )}
                {mission &&
                    !isExecutingDifferentMission &&
                    !isMissionExecuting && (
                        <CustomDisclosure name={"Paths"} defaultOpen={true}>
                            <div className="flex flex-col gap-6">
                                <div className="flex items-center justify-between">
                                    <span>
                                        {isMissionPlanning
                                            ? "Stop Mission Planning"
                                            : "Start Mission Planning"}
                                    </span>
                                    {isMissionPlanning ? (
                                        <SmIconButton
                                            name="Stop"
                                            onClick={stopMissionPlanningHandler}
                                            className={"bg-red-500"}
                                        >
                                            <MdStop className="text-white" />
                                        </SmIconButton>
                                    ) : (
                                        <SmIconButton
                                            name="Start"
                                            onClick={
                                                startMissionPlanningHandler
                                            }
                                        >
                                            <MdPlayArrow className="text-white" />
                                        </SmIconButton>
                                    )}
                                </div>
                                <div className="flex items-center  justify-between">
                                    <span>Clear Mission</span>
                                    <SmIconButton
                                        name="Clear"
                                        onClick={handleClearMissionPoints}
                                    >
                                        <MdCancel className=" text-white" />
                                    </SmIconButton>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Save Mission</span>
                                    <SmIconButton
                                        name="Save"
                                        onClick={handleSaveMission}
                                    >
                                        {updateMissionsMutation.isLoading ? (
                                            <LoadingSpinner className="h-3 w-3 animate-spin fill-white text-background" />
                                        ) : (
                                            <MdSave className="text-white" />
                                        )}
                                    </SmIconButton>
                                </div>
                            </div>
                        </CustomDisclosure>
                    )}
            </div>
            <Popup
                dialogToggle={deleteDialogToggle}
                onClose={closeDeleteDialogHandler}
                title="Delete Mission"
                description="This action cannot be undone. This will
                                        permanently delete this mission from
                                        your account."
            >
                <div className="flex items-center justify-end gap-2 md:gap-4">
                    <SmIconButton
                        name={"Cancel"}
                        className="border border-backgroundGray bg-transparent font-semibold text-white hover:bg-white/20"
                        onClick={closeDeleteDialogHandler}
                    />
                    <SmIconButton
                        name={"Delete"}
                        className=" border border-red-500 bg-red-500 font-semibold text-white"
                        onClick={deleteMissionHandler}
                    />
                </div>
            </Popup>
        </>
    );
};

export default MissionsPanel;
