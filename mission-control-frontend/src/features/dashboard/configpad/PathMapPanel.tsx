import { useEffect, useState } from "react";
import {
    MdAdd,
    MdDelete,
    MdDone,
    MdPlayArrow,
    MdPower,
    MdPowerOff,
    MdSave,
    MdStop
} from "react-icons/md";
import SmIconButton from "../../../components/ui/SmIconButton";
import {
    addBoundaryFn,
    createPathMapFn,
    deletePathMapFn,
    updatePathMapFn
} from "../pathMapService";
import { toast } from "react-toastify";
import { useMutation } from "react-query";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import CustomDisclosure from "../../../components/disclosure/CustomDisclosure";
import { errorLogger } from "../../../util/errorLogger";
import { useUserStore } from "../../../stores/userStore";
import { useMissionsStore } from "../../../stores/missionsStore";
import { useRobotStore } from "../../../stores/robotStore";
import {
    Boundary,
    Obstacle,
    PathMap,
    Paths,
    Point2,
    Station
} from "../../../data/types";
import { useRosFns } from "../../../lib/ros/useRosFns";
import usePathMaps from "@/hooks/usePathMaps";
import ComboBox from "@/components/comboBox/ComboBox";
import usePathMap from "@/hooks/usePathMap";
import Popup from "@/components/popup/Popup";
import AddStationButton from "./AddStationButton";
import { useShallow } from "zustand/react/shallow";
import PathMapPanelHeader from "./pathMapPanel/PathMapPanelHeader";
import BoundaryItems from "./BoundaryItems";
import { useBoundaryStore } from "@/stores/boundaryStore";
import DeletePathButton from "./pathMapPanel/DeletePathButton";
import { ResetNonRTKMissionButton } from "./pathMapPanel/ResetNonRTKMissions";
import {
    getAllLidarMaps,
    LidarMap
} from "../../missions/services/lidarMapsService";
import PathEditControls from "./pathMapPanel/PathEditControls";

type PathMapPanelProps = {
    mode: "gps" | "lidar" | "odom";
};

const PathMapPanel = ({ mode }: PathMapPanelProps) => {
    const [
        pathMap,
        selectedPathMap,
        setSelectedPathMap,
        setPathMap,
        pathMaps,
        isPathMapping,
        setIsPathMapMapping,
        nearbyStation,
        sourceStation,
        setSourceStation,
        latLngPath,
        addPathtoPathMap,
        setLatLngPath,
        activeMissionId,
        setMission,
        isMissionExecuting,
        isNonRTKMode,
        setIsNonRTKMode,
        frameReference,
        setFrameReference,
        isLidarMapping,
        setIsLidarMapping,
        ndtScore,
        setNdtScore,
        savedMaps,
        addSavedMap,
        selectedLidarMap,
        setSelectedLidarMap,
        pcdSavePath,
        setPcdSavePath,
        hasUnsavedChanges,
        setHasUnsavedChanges
    ] = useMissionsStore(
        useShallow((state) => [
            state.pathMap,
            state.selectedPathMap,
            state.setSelectedPathMap,
            state.setPathMap,
            state.pathMaps,
            state.isPathMapping,
            state.setIsPathMapping,
            state.nearbyStation,
            state.sourceStation,
            state.setSourceStation,
            state.latLngPath,
            state.addPathtoPathMap,
            state.setLatLngPath,
            state.activeMissionId,
            state.setMission,
            state.isMissionExecuting,
            state.isNonRTKMode,
            state.setIsNonRTKMode,
            state.frameReference,
            state.setFrameReference,
            state.isLidarMapping,
            state.setIsLidarMapping,
            state.ndtScore,
            state.setNdtScore,
            state.savedMaps,
            state.addSavedMap,
            state.selectedLidarMap,
            state.setSelectedLidarMap,
            state.pcdSavePath,
            state.setPcdSavePath,
            state.hasUnsavedChanges,
            state.setHasUnsavedChanges
        ])
    );

    const { rosServiceCaller, rosSubscribe } = useRosFns();
    const [newPathMap, setNewPathMap] = useState("");
    const [newLidarPathMap, setNewLidarPathMap] = useState("");
    const [lastAutoSave, setLastAutoSave] = useState<number>(0);
    const [autoSaveInProgress, setAutoSaveInProgress] = useState(false);

    // State for LIDAR maps from backend
    const [lidarMaps, setLidarMaps] = useState<LidarMap[]>([]);
    const [isLoadingLidarMaps, setIsLoadingLidarMaps] = useState(false);
    const [selectedLidarMapItem, setSelectedLidarMapItem] = useState<
        LidarMap | undefined
    >(undefined);

    const user = useUserStore((state) => state.user);
    const isBoundaryMapping = useBoundaryStore(
        (state) => state.isMappingBoundary
    );
    const isRobotConnected = useRobotStore((state) => state.isRobotConnected);
    const [createPathMapToggle, setCreatePathMapToggle] = useState(false);
    const [createLidarPathMapToggle, setCreateLidarPathMapToggle] =
        useState(false);
    const [deleteDialogToggle, setDeleteDialogToggle] = useState(false);
    const [frameDialogToggle, setFrameDialogToggle] = useState(false);
    const [unsavedChangesDialogToggle, setUnsavedChangesDialogToggle] =
        useState(false);
    const [pendingPathMapSelection, setPendingPathMapSelection] = useState<
        { id: string; name: string } | undefined
    >(undefined);

    const [nonRtkModeServiceLoading, setNonRtkModeServiceLoading] =
        useState(false);

    const { mutate: fetchPathMaps, isLoading: isPathMapsLoading } =
        usePathMaps();
    const { mutate: fetchPathMapById, isLoading: isPathMapLoading } =
        usePathMap({
            onSuccess: (data: PathMap) => {
                if (activeMissionId !== "") {
                    const mission = data.missions.find(
                        (mission) => mission._id === activeMissionId
                    );

                    if (mission) {
                        setMission(mission);
                    } else {
                        toast.error(
                            `No mission found in database for the currently active mission`
                        );
                    }
                }
            },
            onError: (error) => {
                toast.error(
                    `Unable to load currently active mission ${error.message}`
                );
            }
        });
    const { mutate: updatePathMap, isLoading } = useMutation(
        async ({
            paths,
            stations,
            pathMapId,
            boundaries,
            obstacles
        }: {
            paths: Paths;
            stations: Station[];
            pathMapId: string;
            boundaries?: Boundary[];
            obstacles?: Obstacle[];
        }) =>
            updatePathMapFn(paths, stations, pathMapId, boundaries, obstacles),
        {
            onSuccess: async (data: PathMap) => {
                toast.success("Saved successfully", {
                    pauseOnFocusLoss: false,
                    position: "bottom-right"
                });
                setPathMap(data);
            },
            onError: (error: any) => errorLogger(error)
        }
    );

    const addBoundaryMutation = useMutation({
        mutationFn: ({
            boundaries,
            obstacles,
            pathMapId
        }: {
            boundaries: Boundary[];
            obstacles: Obstacle[];
            pathMapId: string;
        }) => addBoundaryFn(boundaries, obstacles, pathMapId),
        onSuccess: (data) => {
            console.log(data);
        },
        onError: (error: any) => errorLogger(error)
    });

    const { mutate: createPathMap, isLoading: isCreatingPathMap } = useMutation(
        async ({
            name,
            owner,
            frame
        }: {
            name: string;
            owner: string;
            frame: string;
        }) => createPathMapFn(name, owner, frame),
        {
            onSuccess: async (data: { createdPathMap: PathMap }) => {
                toast.success("Saved successfully", {
                    pauseOnFocusLoss: false,
                    position: "bottom-right"
                });
                setNewPathMap("");
                setPathMap(data.createdPathMap);
                setSelectedPathMap({
                    id: data.createdPathMap.id,
                    name: data.createdPathMap.name
                });
                fetchPathMaps();
            },
            onError: (error: any) => errorLogger(error)
        }
    );

    const { mutate: createLidarPathMap, isLoading: isCreatingLidarPathMap } =
        useMutation(
            async ({
                name,
                owner,
                frame,
                lidarMapName
            }: {
                name: string;
                owner: string;
                frame: string;
                lidarMapName: string;
            }) => createPathMapFn(name, owner, frame, lidarMapName),
            {
                onSuccess: async (data: { createdPathMap: PathMap }) => {
                    toast.success("PathMap created and linked to LiDAR map", {
                        pauseOnFocusLoss: false,
                        position: "bottom-right"
                    });
                    setNewLidarPathMap("");
                    setPathMap(data.createdPathMap);
                    setSelectedPathMap({
                        id: data.createdPathMap.id,
                        name: data.createdPathMap.name
                    });
                    fetchPathMaps();
                },
                onError: (error: any) => errorLogger(error)
            }
        );

    const { mutate: deletePathMap, isLoading: isDeletingPathMap } = useMutation(
        async ({ pathMapId }: { pathMapId: string }) =>
            deletePathMapFn(pathMapId),
        {
            onSuccess: async (data, { pathMapId }) => {
                toast.success("Path map deleted successfully", {
                    pauseOnFocusLoss: false,
                    position: "bottom-right"
                });
                if (pathMap?.id === pathMapId) {
                    setPathMap(undefined);
                }
                if (selectedPathMap?.id === pathMapId) {
                    setSelectedPathMap(undefined);
                }
                fetchPathMaps();
            },
            onError: (error: any) => errorLogger(error)
        }
    );

    // Load pathmap data when selection changes
    // Do NOT reload if actively mapping OR if there are unsaved changes - prevents loss of unsaved data
    useEffect(() => {
        if (selectedPathMap?.id && !isPathMapping && !hasUnsavedChanges) {
            fetchPathMapById(selectedPathMap.id);
        }
    }, [selectedPathMap?.id, fetchPathMapById, isPathMapping, hasUnsavedChanges]);

    // Fetch LIDAR maps when in LIDAR mode
    useEffect(() => {
        if (mode === "lidar") {
            const fetchLidarMaps = async () => {
                setIsLoadingLidarMaps(true);
                try {
                    const response = await getAllLidarMaps();
                    if (response.success && response.data) {
                        setLidarMaps(response.data);
                        // Restore previously selected map from store
                        if (selectedLidarMap) {
                            const previouslySelected = response.data.find(
                                (map) => map.name === selectedLidarMap
                            );
                            if (previouslySelected) {
                                setSelectedLidarMapItem(previouslySelected);
                            }
                        }
                    } else {
                        toast.error("Failed to load LIDAR maps");
                    }
                } catch (error) {
                    console.error("Error fetching LIDAR maps:", error);
                    toast.error("Failed to load LIDAR maps");
                } finally {
                    setIsLoadingLidarMaps(false);
                }
            };

            fetchLidarMaps();
        }
    }, [mode, selectedLidarMap]);

    // Auto-save stations and paths every 30 seconds
    useEffect(() => {
        if (!pathMap || !pathMap.id || pathMap.stations.length === 0) {
            return;
        }

        // Don't auto-save if currently mapping or executing mission
        if (
            isPathMapping ||
            isMissionExecuting ||
            isLoading ||
            autoSaveInProgress
        ) {
            return;
        }

        const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
        const now = Date.now();

        // Check if enough time has passed since last auto-save
        if (now - lastAutoSave < AUTO_SAVE_INTERVAL) {
            return;
        }

        const autoSaveTimer = setTimeout(async () => {
            setAutoSaveInProgress(true);
            try {
                await updatePathMapFn(
                    pathMap.paths,
                    pathMap.stations,
                    pathMap.id
                );
                setLastAutoSave(Date.now());
                toast.success("Auto-saved", {
                    pauseOnFocusLoss: false,
                    position: "bottom-right",
                    autoClose: 2000
                });
            } catch (error: any) {
                console.error("Auto-save failed:", error);
                toast.error("Auto-save failed. Please save manually.", {
                    pauseOnFocusLoss: false,
                    position: "bottom-right"
                });
            } finally {
                setAutoSaveInProgress(false);
            }
        }, AUTO_SAVE_INTERVAL);

        return () => clearTimeout(autoSaveTimer);
    }, [
        pathMap,
        isPathMapping,
        isMissionExecuting,
        isLoading,
        autoSaveInProgress,
        lastAutoSave
    ]);

    // Warn user before leaving page with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                event.preventDefault();
                // Modern browsers require returnValue to be set
                event.returnValue = "You have unsaved changes. Are you sure you want to leave?";
                return event.returnValue;
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [hasUnsavedChanges]);

    const handleStartMapping = () => {
        if (isBoundaryMapping) {
            toast.error("Boundary mapping in progress");
            return;
        }
        if (isPathMapping) {
            toast.error("Already recording a path");
            return;
        }
        if (nearbyStation) {
            setSourceStation(nearbyStation);
            console.log("Trying to start mapping");

            // ✅ FIX: First, forcefully stop any existing recording to clear stale state
            rosServiceCaller(
                "/stop_recording_path",
                "flo_msgs/srv/StopRecordingPath",
                (stopResult) => {
                    console.log("Cleared any existing recording state:", stopResult);

                    // Now start fresh recording
                    rosServiceCaller(
                        "/start_recording_path",
                        "flo_msgs/srv/StartRecordingPath",
                        (result: { message: string; success: boolean }) => {
                            if (result.success) {
                                console.log("start mapping");
                                setIsPathMapMapping(true);
                                toast.success("Started recording path");
                            } else {
                                setIsPathMapMapping(false);
                                setSourceStation(undefined);
                                toast.error(result.message);
                            }
                        },
                        (error) => {
                            console.log(error);
                            setIsPathMapMapping(false);
                            setSourceStation(undefined);
                            toast.error("Failed to start recording");
                        },
                        {
                            frame: mode === "lidar" ? "map_ndt" : (pathMap?.frame ?? "utm")
                        }
                    );
                },
                (error) => {
                    // If stop fails, still try to start (maybe nothing was recording)
                    console.log("No existing recording to stop:", error);

                    rosServiceCaller(
                        "/start_recording_path",
                        "flo_msgs/srv/StartRecordingPath",
                        (result: { message: string; success: boolean }) => {
                            if (result.success) {
                                console.log("start mapping");
                                setIsPathMapMapping(true);
                                toast.success("Started recording path");
                            } else {
                                setIsPathMapMapping(false);
                                setSourceStation(undefined);
                                toast.error(result.message);
                            }
                        },
                        (error) => {
                            console.log(error);
                            setIsPathMapMapping(false);
                            setSourceStation(undefined);
                            toast.error("Failed to start recording");
                        },
                        {
                            frame: mode === "lidar" ? "map_ndt" : (pathMap?.frame ?? "utm")
                        }
                    );
                }
            );
        } else {
            toast.error("Bot should be near a station");
        }
    };
    const handleStopMapping = () => {
        console.log("Trying to stop mapping");

        if (!nearbyStation) {
            toast.error("Bot should be near a station to stop mapping");
            return;
        }
        if (!sourceStation || !nearbyStation) {
            toast.error("Source or destination station not set");
            return;
        }
        rosServiceCaller(
            "/stop_recording_path",
            "flo_msgs/srv/StopRecordingPath",
            (result: {
                message: string;
                success: boolean;
                path: { points: Point2[] };
            }) => {
                if (result.success) {
                    const utmPath = result.path.points;
                    if (!utmPath || utmPath.length < 3) {
                        toast.error(
                            `Path too short (${utmPath?.length || 0} points), not saving.`
                        );
                        setIsPathMapMapping(false);
                        setSourceStation(undefined);
                        setLatLngPath([]);
                    } else {
                        // Minimum total path length check (1 meter)
                        const totalDist = utmPath.reduce(
                            (sum, point, idx, arr) => {
                                if (idx === 0) return 0;
                                const prev = arr[idx - 1];
                                const dx = point.x - prev.x;
                                const dy = point.y - prev.y;
                                return sum + Math.sqrt(dx * dx + dy * dy);
                            },
                            0
                        );
                        if (totalDist < 1.0) {
                            toast.error(
                                `Robot did not move enough (${totalDist.toFixed(2)}m), not saving path.`
                            );
                            setIsPathMapMapping(false);
                            setSourceStation(undefined);
                            setLatLngPath([]);
                        } else {
                            // ✅ FIX: Add path to state and show success message
                            addPathtoPathMap(
                                utmPath,
                                latLngPath,
                                sourceStation.id,
                                nearbyStation.id
                            );

                            // ✅ FIX: Show persistent notification with unsaved changes warning
                            toast.success(
                                `Path recorded (${utmPath.length} points, ${totalDist.toFixed(1)}m). Click "Save Map" to persist to database.`,
                                {
                                    autoClose: 8000,
                                    position: "bottom-right"
                                }
                            );

                            // ✅ FIX: Only stop mapping, don't clear latLngPath yet (keeps visualization)
                            setIsPathMapMapping(false);
                            setSourceStation(undefined);
                            // DON'T clear latLngPath here - keep path visible until save
                        }
                    }
                } else {
                    toast.error(result.message);
                    setIsPathMapMapping(false);
                    setSourceStation(undefined);
                    setLatLngPath([]);
                }
            },
            (error) => {
                toast.error("Failed to stop mapping");
                setIsPathMapMapping(false);
                setSourceStation(undefined);
                setLatLngPath([]);
            }
        );
    };
    const handleSaveMapping = () => {
        if (pathMap && pathMap.stations.length > 0) {
            // Save everything atomically in one transaction
            updatePathMap({
                paths: pathMap.paths,
                stations: pathMap.stations,
                pathMapId: pathMap.id,
                boundaries:
                    pathMap.boundaries.length > 0
                        ? pathMap.boundaries
                        : undefined,
                obstacles:
                    pathMap.obstacles.length > 0 ? pathMap.obstacles : undefined
            });

            // ✅ FIX: Clear latLngPath after save to remove the visualization
            setLatLngPath([]);

            // ✅ FIX: Clear unsaved changes flag
            setHasUnsavedChanges(false);
        }
    };

    const pathMapCreationHandler = () => {
        if (newPathMap.length === 0) {
            toast.error("Please enter a name for the pathmap");
            return;
        }
        if (!user?.id) {
            toast.error("User not logged in");
            return;
        }

        if (mode === "lidar") {
            createPathMap({
                name: newPathMap,
                owner: user.id,
                frame: "map_ndt"
            });
        } else if (!isNonRTKMode) {
            createPathMap({
                name: newPathMap,
                owner: user.id,
                frame: "utm"
            });
        } else if (frameReference && isNonRTKMode) {
            createPathMap({
                name: newPathMap,
                owner: user.id,
                frame: frameReference
            });
        } else {
            toast.error("Frame of reference not set");
        }
    };

    const deletePathMapHandler = () => {
        if (pathMap) {
            deletePathMap({ pathMapId: pathMap.id });
        } else {
            toast.error("No pathmap selected.");
        }
        setDeleteDialogToggle(false);
    };
    const frameReferenceHandler = () => {
        setNonRtkModeServiceLoading(true);
        rosServiceCaller(
            "/mmr/experimental/enable",
            "flo_msgs/srv/Enable",
            (result: { message: string; success: boolean }) => {
                if (result.success) {
                    useMissionsStore.getState().resetMissionsState();
                    setIsNonRTKMode(true);
                    setFrameDialogToggle(false);
                    // setPathMap(undefined);
                    // setSelectedPathMap(undefined);
                    fetchPathMaps(); // fetch pathmaps for the new frame
                }
                setNonRtkModeServiceLoading(false);
            },
            (error) => {
                console.log(error);
                toast.error(error.message);
                setNonRtkModeServiceLoading(false);
            },
            { enable: true }
        );
    };

    // Handler for enabling ODOM frame with one click
    const enableOdomFrameHandler = () => {
        setFrameReference("odom");
        setNonRtkModeServiceLoading(true);
        rosServiceCaller(
            "/mmr/experimental/enable",
            "flo_msgs/srv/Enable",
            (result: { message: string; success: boolean }) => {
                if (result.success) {
                    useMissionsStore.getState().resetMissionsState();
                    setIsNonRTKMode(true);
                    fetchPathMaps(); // fetch pathmaps for odom frame
                    toast.success("ODOM frame enabled", {
                        pauseOnFocusLoss: false,
                        position: "bottom-right",
                        autoClose: 2000
                    });
                } else {
                    toast.error(result.message || "Failed to enable ODOM mode");
                }
                setNonRtkModeServiceLoading(false);
            },
            (error) => {
                console.log(error);
                toast.error(`Failed to enable ODOM mode: ${error.message}`);
                setNonRtkModeServiceLoading(false);
            },
            { enable: true }
        );
    };
    const disableNonRTKModeHandler = () => {
        setNonRtkModeServiceLoading(true);
        rosServiceCaller(
            "/mmr/experimental/enable",
            "flo_msgs/srv/Enable",
            (result: { message: string; success: boolean }) => {
                if (result.success) {
                    useMissionsStore.getState().resetMissionsState();
                    setIsNonRTKMode(false);
                    // setPathMap(undefined);
                    // setSelectedPathMap(undefined);
                    fetchPathMaps(); // fetch pathmaps for the new frame
                }
                setNonRtkModeServiceLoading(false);
            },
            (error) => {
                console.log(error);
                toast.error(error.message);
                setNonRtkModeServiceLoading(false);
            },
            { enable: false }
        );
    };

    const closeDeleteDialogHandler = () => {
        setDeleteDialogToggle(false);
    };
    const closeFrameDialogHandler = () => {
        setFrameReference("");
        setFrameDialogToggle(false);
    };

    // Handler for pathmap switching with unsaved changes check
    const handlePathMapSelection = (
        newPathMap: { id: string; name: string } | undefined
    ) => {
        if (hasUnsavedChanges && newPathMap?.id !== selectedPathMap?.id) {
            // Store the pending selection and show confirmation dialog
            setPendingPathMapSelection(newPathMap);
            setUnsavedChangesDialogToggle(true);
        } else {
            // No unsaved changes, proceed with selection
            setSelectedPathMap(newPathMap);
        }
    };

    // Handler for confirming pathmap switch (discard unsaved changes)
    const confirmPathMapSwitch = () => {
        if (pendingPathMapSelection) {
            setSelectedPathMap(pendingPathMapSelection);
            setHasUnsavedChanges(false);
            setPendingPathMapSelection(undefined);
        }
        setUnsavedChangesDialogToggle(false);
    };

    // Handler for canceling pathmap switch (keep current pathmap)
    const cancelPathMapSwitch = () => {
        setPendingPathMapSelection(undefined);
        setUnsavedChangesDialogToggle(false);
    };

    // LIDAR Mapping Handlers
    const handleLocalize = () => {
        rosServiceCaller(
            "/set_initial_pose_from_gps",
            "std_srvs/srv/Trigger",
            (result: { success: boolean; message: string }) => {
                if (result.success) {
                    toast.success("Localized from GPS");
                } else {
                    toast.error(result.message);
                }
            },
            (error) => {
                toast.error(`Localization failed: ${error.message}`);
            },
            {}
        );
    };

    const handleStartLidarMapping = () => {
        rosServiceCaller(
            "/start_mapping",
            "direct_lidar_inertial_odometry/srv/Enable",
            (result: { success: boolean; message: string }) => {
                if (result.success) {
                    setIsLidarMapping(true);
                    toast.success("LIDAR mapping started");
                } else {
                    toast.error(result.message);
                }
            },
            (error) => {
                toast.error(`Failed to start mapping: ${error.message}`);
            },
            { enable: true }
        );
    };

    const handleStopAndSavePCD = () => {
        if (!pcdSavePath || pcdSavePath.trim() === "") {
            toast.error("Please enter a map name");
            return;
        }

        if (!user?.id) {
            toast.error("User not logged in");
            return;
        }

        rosServiceCaller(
            "/stop_mapping",
            "direct_lidar_inertial_odometry/srv/SavePCD",
            (result: { success: boolean; message: string }) => {
                if (result.success) {
                    setIsLidarMapping(false);
                    addSavedMap(pcdSavePath);
                    toast.success(`LiDAR map saved: ${pcdSavePath}`);

                    // Auto-create PathMap linked to this LiDAR map
                    const pathMapName = `${pcdSavePath}_paths`;
                    createLidarPathMap({
                        name: pathMapName,
                        owner: user.id,
                        frame: "map_ndt",
                        lidarMapName: pcdSavePath
                    });

                    setPcdSavePath("");
                } else {
                    toast.error(result.message);
                }
            },
            (error) => {
                toast.error(`Failed to save PCD: ${error.message}`);
            },
            { leaf_size: 0.05, save_path: pcdSavePath }
        );
    };

    const handleLoadMap = () => {
        // Use selectedLidarMapItem if available, otherwise fall back to selectedLidarMap (from savedMaps)
        const mapToLoad = selectedLidarMapItem?.name || selectedLidarMap;

        if (!mapToLoad) {
            toast.error("Please select a LiDAR map to load");
            return;
        }

        rosServiceCaller(
            "/load_map",
            "pcl_localization_ros2/srv/LoadMap",
            (result: { success: boolean; message: string }) => {
                if (result.success) {
                    toast.success(`LiDAR map loaded: ${mapToLoad}`);
                    // Update the store if using the new dropdown
                    if (selectedLidarMapItem) {
                        setSelectedLidarMap(selectedLidarMapItem.name);
                    }
                } else {
                    toast.error(result.message);
                }
            },
            (error) => {
                toast.error(`Failed to load map: ${error.message}`);
            },
            { map_name: mapToLoad }
        );
    };

    return (
        <>
            <div className="w-full">
                <PathMapPanelHeader mode={mode} />

                <div className="flex w-full flex-col items-center justify-between">
                    {!isMissionExecuting && (
                        <>
                            <CustomDisclosure name="Select" defaultOpen={true}>
                                {/* ODOM Frame Selection - Only show in ODOM mode */}
                                {mode === "odom" && (
                                    <>
                                        {!isNonRTKMode || frameReference !== "odom" ? (
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm">Enable ODOM Frame</span>
                                                <SmIconButton
                                                    isLoading={nonRtkModeServiceLoading}
                                                    name={"Enable ODOM"}
                                                    className="bg-blue-500 hover:bg-blue-600 text-white"
                                                    onClick={enableOdomFrameHandler}
                                                >
                                                    <MdPower className="h-4 w-4 text-white" />
                                                </SmIconButton>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between rounded-md bg-blue-500/20 p-3 border border-blue-500/30">
                                                <div className="flex items-center gap-x-2">
                                                    <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"></div>
                                                    <span className="text-sm font-semibold text-blue-400">ODOM Frame Active</span>
                                                </div>
                                                <SmIconButton
                                                    isLoading={nonRtkModeServiceLoading}
                                                    name={"Disable"}
                                                    className="bg-red-500 hover:bg-red-600 text-white"
                                                    onClick={disableNonRTKModeHandler}
                                                >
                                                    <MdPowerOff className="h-4 w-4 text-white" />
                                                </SmIconButton>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* LIDAR Map Loading - Only show in LIDAR mode */}
                                {mode === "lidar" && (
                                    <>
                                        <div className="flex flex-col gap-y-2">
                                            <div className="flex items-center justify-between gap-x-2">
                                                <div className="flex-1">
                                                    <ComboBox
                                                        label="LIDAR Maps"
                                                        showLabel={false}
                                                        items={lidarMaps}
                                                        selectedItem={
                                                            selectedLidarMapItem
                                                        }
                                                        setSelectedItem={(
                                                            item
                                                        ) => {
                                                            setSelectedLidarMapItem(
                                                                item
                                                            );
                                                            // Update the store so LidarMap2D component can load it
                                                            if (item) {
                                                                setSelectedLidarMap(
                                                                    item.name
                                                                );
                                                            }
                                                        }}
                                                        getItemLabel={(
                                                            lidarMap
                                                        ) =>
                                                            lidarMap
                                                                ? lidarMap.name
                                                                : ""
                                                        }
                                                        placeholder="Load LIDAR Map..."
                                                        isLoading={
                                                            isLoadingLidarMaps
                                                        }
                                                        isItemLoading={false}
                                                        wrapperClassName="bg-backgroundGray"
                                                    />
                                                </div>
                                                <SmIconButton
                                                    name="Load"
                                                    className="bg-primary700"
                                                    onClick={handleLoadMap}
                                                >
                                                    <MdPlayArrow className="h-4 w-4 text-white" />
                                                </SmIconButton>
                                            </div>
                                        </div>

                                        {!createLidarPathMapToggle && (
                                            <div className="flex w-full items-center justify-between">
                                                <span className="rounded-md text-sm">
                                                    Create Lidar 3D Map
                                                </span>
                                                <SmIconButton
                                                    isLoading={
                                                        isCreatingLidarPathMap
                                                    }
                                                    name={"Create"}
                                                    className="bg-primary700 text-white"
                                                    onClick={() =>
                                                        setCreateLidarPathMapToggle(
                                                            true
                                                        )
                                                    }
                                                >
                                                    <MdAdd className="h-4 w-4 text-white" />
                                                </SmIconButton>
                                            </div>
                                        )}

                                        {createLidarPathMapToggle && (
                                            <div className="flex items-center justify-between gap-x-2">
                                                <input
                                                    type="text"
                                                    className="w-full rounded-md bg-backgroundGray p-3 text-xs text-white placeholder:text-neutral-400 focus:outline-none"
                                                    placeholder="PathMap Name"
                                                    autoFocus
                                                    onChange={(e) =>
                                                        setNewPathMap(
                                                            e.target.value
                                                        )
                                                    }
                                                    onBlur={() => {
                                                        setTimeout(() => {
                                                            setCreateLidarPathMapToggle(
                                                                false
                                                            );
                                                        }, 300);
                                                    }}
                                                    value={newPathMap}
                                                />
                                                <SmIconButton
                                                    name={"Submit"}
                                                    className="bg-primary700 text-white"
                                                    onClick={
                                                        pathMapCreationHandler
                                                    }
                                                >
                                                    {isLoading ? (
                                                        <LoadingSpinner className="h-3 w-3 animate-spin fill-white text-background" />
                                                    ) : (
                                                        <MdDone className="h-4 w-4 text-white" />
                                                    )}
                                                </SmIconButton>
                                            </div>
                                        )}

                                        {/* LIDAR PathMaps - Only show pathmaps linked to LIDAR maps */}
                                        <ComboBox
                                            label="LIDAR Path maps"
                                            showLabel={false}
                                            items={pathMaps.filter(
                                                (pathmap) =>
                                                    pathmap.lidarMapName
                                            )}
                                            selectedItem={selectedPathMap}
                                            setSelectedItem={handlePathMapSelection}
                                            getItemLabel={(pathMap) =>
                                                pathMap ? pathMap.name : ""
                                            }
                                            placeholder="Select LIDAR PathMap"
                                            isLoading={isPathMapsLoading}
                                            isItemLoading={isPathMapLoading}
                                            wrapperClassName="bg-backgroundGray"
                                        />
                                    </>
                                )}

                                {mode !== "lidar" && !isNonRTKMode ? (
                                    <ComboBox
                                        label="Path maps"
                                        showLabel={false}
                                        items={pathMaps.filter(
                                            (pathmap) =>
                                                pathmap.frame === "utm" &&
                                                !pathmap.lidarMapName
                                        )}
                                        selectedItem={selectedPathMap}
                                        setSelectedItem={handlePathMapSelection}
                                        getItemLabel={(pathMap) =>
                                            pathMap ? pathMap.name : ""
                                        }
                                        placeholder="Select PathMap"
                                        isLoading={isPathMapsLoading}
                                        isItemLoading={isPathMapLoading}
                                        wrapperClassName="bg-backgroundGray"
                                    />
                                ) : (
                                    <ComboBox
                                        label="Path maps"
                                        showLabel={false}
                                        items={pathMaps.filter(
                                            (pathmap) =>
                                                pathmap.frame ===
                                                    frameReference &&
                                                !pathmap.lidarMapName
                                        )}
                                        selectedItem={selectedPathMap}
                                        setSelectedItem={handlePathMapSelection}
                                        getItemLabel={(pathMap) =>
                                            pathMap ? pathMap.name : ""
                                        }
                                        placeholder="Select PathMap"
                                        isLoading={isPathMapsLoading}
                                        isItemLoading={isPathMapLoading}
                                        wrapperClassName="bg-backgroundGray"
                                    />
                                )}

                                {!createPathMapToggle && (
                                    <div className="flex w-full items-center justify-between">
                                        <span className="rounded-md text-sm">
                                            Create PathMap
                                        </span>
                                        <SmIconButton
                                            isLoading={isCreatingPathMap}
                                            name={"Create"}
                                            className="bg-primary700 text-white"
                                            onClick={() =>
                                                setCreatePathMapToggle(true)
                                            }
                                        >
                                            <MdAdd className="h-4 w-4 text-white" />
                                        </SmIconButton>
                                    </div>
                                )}

                                {createPathMapToggle && (
                                    <div className="flex items-center justify-between gap-x-2">
                                        <input
                                            type="text"
                                            className="w-full rounded-md bg-backgroundGray p-3 text-xs text-white placeholder:text-neutral-400 focus:outline-none"
                                            placeholder="PathMap Name"
                                            autoFocus
                                            onChange={(e) =>
                                                setNewPathMap(e.target.value)
                                            }
                                            onBlur={() => {
                                                setTimeout(() => {
                                                    setCreatePathMapToggle(
                                                        false
                                                    );
                                                }, 300);
                                            }}
                                            value={newPathMap}
                                        />
                                        <SmIconButton
                                            name={"Submit"}
                                            className="bg-primary700 text-white"
                                            onClick={pathMapCreationHandler}
                                        >
                                            {isLoading ? (
                                                <LoadingSpinner className="h-3 w-3 animate-spin fill-white text-background" />
                                            ) : (
                                                <MdDone className="h-4 w-4 text-white" />
                                            )}
                                        </SmIconButton>
                                    </div>
                                )}

                                {pathMap &&
                                    selectedPathMap?.name !==
                                        "Currently Active PathMap" && (
                                        <div className="flex w-full items-center justify-between">
                                            <span className="rounded-md text-sm">
                                                Delete PathMap
                                            </span>
                                            <SmIconButton
                                                isLoading={isDeletingPathMap}
                                                name={"Delete"}
                                                className="bg-red-500 text-white"
                                                onClick={() =>
                                                    setDeleteDialogToggle(true)
                                                }
                                            >
                                                <MdDelete className="h-4 w-4 text-white" />
                                            </SmIconButton>
                                        </div>
                                    )}
                            </CustomDisclosure>
                            <CustomDisclosure
                                name="Controls"
                                defaultOpen={true}
                            >
                                {pathMap && (
                                    <>
                                        <BoundaryItems />
                                        <AddStationButton />
                                        {!isPathMapping ? (
                                            <div className="flex items-center justify-between">
                                                <span>Start Mapping</span>
                                                <SmIconButton
                                                    name={"Start"}
                                                    className={"bg-primary700"}
                                                    onClick={handleStartMapping}
                                                >
                                                    <MdPlayArrow className="h-4 w-4 text-white" />
                                                </SmIconButton>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span>Stop Mapping</span>
                                                <SmIconButton
                                                    name={"Stop"}
                                                    className={"bg-red-500"}
                                                    onClick={handleStopMapping}
                                                >
                                                    <MdStop className="h-4 w-4 text-white" />
                                                </SmIconButton>
                                            </div>
                                        )}
                                        <DeletePathButton />
                                        {/* Path Editing - Only show in GPS mode */}
                                        {mode === "gps" && <PathEditControls />}
                                        {!isPathMapping &&
                                            pathMap &&
                                            pathMap.stations.length > 0 && (
                                                <>
                                                    <div className="flex items-center justify-between">
                                                        <span className="flex items-center gap-x-2">
                                                            Save Map
                                                            {hasUnsavedChanges && (
                                                                <span className="animate-pulse text-xs font-semibold text-yellow-400">
                                                                    •
                                                                </span>
                                                            )}
                                                        </span>
                                                        <SmIconButton
                                                            name="Save"
                                                            onClick={
                                                                handleSaveMapping
                                                            }
                                                            className={
                                                                hasUnsavedChanges
                                                                    ? "animate-pulse bg-yellow-500 hover:bg-yellow-600"
                                                                    : ""
                                                            }
                                                        >
                                                            {isLoading ? (
                                                                <LoadingSpinner className="h-3 w-3 animate-spin fill-white text-background" />
                                                            ) : (
                                                                <MdSave className="text-white" />
                                                            )}
                                                        </SmIconButton>
                                                    </div>
                                                </>
                                            )}
                                    </>
                                )}
                            </CustomDisclosure>

                            {/* LIDAR Mapping - Only show in LIDAR mode */}
                            {mode === "lidar" && (
                                <CustomDisclosure
                                    name="LIDAR Mapping"
                                    defaultOpen={true}
                                >
                                    {pathMap && (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <span>Localize</span>
                                                <SmIconButton
                                                    name="Localize"
                                                    className="bg-primary700"
                                                    onClick={handleLocalize}
                                                >
                                                    <MdPlayArrow className="h-4 w-4 text-white" />
                                                </SmIconButton>
                                            </div>

                                            {!isLidarMapping ? (
                                                <div className="flex items-center justify-between">
                                                    <span>Start Mapping</span>
                                                    <SmIconButton
                                                        name="Start"
                                                        className="bg-primary700"
                                                        onClick={
                                                            handleStartLidarMapping
                                                        }
                                                    >
                                                        <MdPlayArrow className="h-4 w-4 text-white" />
                                                    </SmIconButton>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex flex-col gap-y-2">
                                                        <span className="text-sm">
                                                            Stop and Save PCD
                                                        </span>
                                                        <div className="flex items-center justify-between gap-x-2">
                                                            <input
                                                                type="text"
                                                                className="flex-1 rounded-md bg-backgroundGray p-2 text-xs text-white placeholder:text-neutral-400 focus:outline-none"
                                                                placeholder="Enter map name"
                                                                value={
                                                                    pcdSavePath
                                                                }
                                                                onChange={(e) =>
                                                                    setPcdSavePath(
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                            />
                                                            <SmIconButton
                                                                name="Save"
                                                                className="bg-red-500"
                                                                onClick={
                                                                    handleStopAndSavePCD
                                                                }
                                                            >
                                                                <MdStop className="h-4 w-4 text-white" />
                                                            </SmIconButton>
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {/* <div className="flex flex-col gap-y-2">
                                            <span className="text-sm">
                                                Load Map
                                            </span>
                                            <div className="flex items-center justify-between gap-x-2">
                                                <select
                                                    className="flex-1 rounded-md bg-backgroundGray p-2 text-xs text-white focus:outline-none"
                                                    value={selectedLidarMap}
                                                    onChange={(e) =>
                                                        setSelectedLidarMap(
                                                            e.target.value
                                                        )
                                                    }
                                                >
                                                    <option value="">
                                                        Select map...
                                                    </option>
                                                    {savedMaps.map((map) => (
                                                        <option
                                                            key={map}
                                                            value={map}
                                                        >
                                                            {map}
                                                        </option>
                                                    ))}
                                                </select>
                                                <SmIconButton
                                                    name="Load"
                                                    className="bg-primary700"
                                                    onClick={handleLoadMap}
                                                >
                                                    <MdPlayArrow className="h-4 w-4 text-white" />
                                                </SmIconButton>
                                            </div>
                                        </div> */}
                                        </>
                                    )}
                                </CustomDisclosure>
                            )}

                            {/* Experimental Features - Only show in ODOM mode */}
                            {mode === "odom" && (
                                <CustomDisclosure
                                    name="Experimental Features"
                                    defaultOpen={false}
                                >
                                    {isNonRTKMode && (
                                        <div className="flex items-center gap-x-2 text-sm">
                                            <span>{`Frame Reference:`}</span>
                                            {frameReference && (
                                                <span>{frameReference}</span>
                                            )}
                                        </div>
                                    )}
                                    {!isNonRTKMode ? (
                                        <div className="flex items-center justify-between">
                                            <span>Non RTK Mode</span>
                                            <SmIconButton
                                                name={"Enable"}
                                                className={"bg-primary700"}
                                                onClick={() =>
                                                    setFrameDialogToggle(true)
                                                }
                                            >
                                                <MdPower className="h-4 w-4 text-white" />
                                            </SmIconButton>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <span>Non RTK Mode</span>
                                            <SmIconButton
                                                name={"Disable"}
                                                className={"bg-red-500"}
                                                onClick={
                                                    disableNonRTKModeHandler
                                                }
                                            >
                                                <MdPowerOff className="h-4 w-4 text-white" />
                                            </SmIconButton>
                                        </div>
                                    )}
                                    <ResetNonRTKMissionButton />
                                </CustomDisclosure>
                            )}
                        </>
                    )}
                </div>
            </div>
            <Popup
                dialogToggle={deleteDialogToggle}
                onClose={closeDeleteDialogHandler}
                title="Delete Mission"
                description="This action cannot be undone. This will
        permanently delete this pathmap from
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
                        onClick={deletePathMapHandler}
                    />
                </div>
            </Popup>
            <Popup
                title="Frame of Reference"
                description="Enter the frame of reference for the bot to enable Non RTK Mode. Note this value cannot be changed once set."
                dialogToggle={frameDialogToggle}
                onClose={closeFrameDialogHandler}
            >
                <div className="flex items-center justify-end gap-2 md:gap-4">
                    <input
                        type="text"
                        className="w-full rounded-md bg-backgroundGray p-3 text-xs text-white placeholder:text-neutral-400 focus:outline-none"
                        placeholder="Enter Frame of Reference"
                        autoFocus
                        onChange={(e) => setFrameReference(e.target.value)}
                        value={frameReference}
                    ></input>

                    {!nonRtkModeServiceLoading ? (
                        <SmIconButton
                            name="Enable"
                            className=" border border-green-500 bg-green-500 font-semibold text-white"
                            onClick={frameReferenceHandler}
                        />
                    ) : (
                        <LoadingSpinner className="h-4 w-4 animate-spin fill-white text-background" />
                    )}
                </div>
            </Popup>
            <Popup
                dialogToggle={unsavedChangesDialogToggle}
                onClose={cancelPathMapSwitch}
                title="Unsaved Changes"
                description="You have unsaved changes in the current PathMap. Switching will discard these changes. Do you want to continue?"
            >
                <div className="flex items-center justify-end gap-2 md:gap-4">
                    <SmIconButton
                        name={"Cancel"}
                        className="border border-backgroundGray bg-transparent font-semibold text-white hover:bg-white/20"
                        onClick={cancelPathMapSwitch}
                    />
                    <SmIconButton
                        name={"Discard & Switch"}
                        className="border border-yellow-500 bg-yellow-500 font-semibold text-white"
                        onClick={confirmPathMapSwitch}
                    />
                </div>
            </Popup>
        </>
    );
};

export default PathMapPanel;
