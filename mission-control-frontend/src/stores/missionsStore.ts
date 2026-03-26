import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import {
    Boundary,
    LatLng,
    Mission,
    Obstacle,
    Path,
    PathMap,
    Point2,
    Station
} from "../data/types";
import { Id, toast } from "react-toastify";
import { utmToLatLng } from "../util/geoUtils";

// Enable Map/Set support in Immer
enableMapSet();

// Path edit tracking
interface PathEdit {
    pathId: string;
    pointIndex: number;
    oldPosition: Point2;
    newPosition: Point2;
    timestamp: number;
}

// Path editing metadata
interface PathEditData {
    originalPath: Path;
    editedPoints: Map<number, Point2>; // index -> new position
}

// Real-time drag adjustment state
interface DragAdjustmentState {
    pathId: string;
    draggedPointIndex: number;
    originalPositions: Point2[]; // All original points of the path
    adjustedPositions: Point2[]; // All adjusted points (real-time)
    influenceRadius: number; // Calculated from zoom level
    isValid: boolean; // Are all adjusted points valid?
    invalidPointIndices: number[]; // Indices of points violating boundaries/obstacles
}

type MissionsState = {
    pathMap?: PathMap;
    selectedPathMap?: { id: string; name: string };
    pathToDelete?: Path;
    pathMaps: {
        id: string;
        name: string;
        frame?: string;
        lidarMapName?: string;
    }[];
    mission?: Mission;
    missionToastId?: Id;
    activeMissionId: string;
    frameReference: string;
    //bot position with lat and long
    latLng?: LatLng;
    // bot position in LIDAR map coordinates (meters)
    mapXY?: Point2;
    robotYaw?: number;
    nearbyStation?: Station;
    sourceStation?: Station;
    selectedStation?: Station;
    latLngPath: LatLng[];
    isDeletingPath: boolean;
    isPathMapping: boolean;
    isMissionPlanning: boolean;
    isMissionExecuting: boolean;
    isAbortingMission: boolean;
    isTeleoperating: boolean;
    isLoadingTeleop: boolean;
    isExecutingDifferentMission: boolean;
    isLocalized: boolean;
    isNonRTKMode: boolean;
    isSelectingStationForReset: boolean;
    // LIDAR Mapping state
    isLidarMapping: boolean;
    ndtScore: number | null;
    savedMaps: string[];
    selectedLidarMap: string;
    pcdSavePath: string;
    // Map display type
    mapType: "google" | "lidar";
    lidar2DMapUrl?: string;
    // New UI panel states
    leftPanelMode: "gps" | "lidar" | "odom" | null;
    rightPanelMode: "overview" | "logs" | null;
    // Path editing state
    isEditingPaths: boolean;
    editPointCount: number;
    pathEdits: Map<string, PathEditData>;
    undoStack: PathEdit[];
    currentDragInfo?: {
        pathId: string;
        pointIndex: number;
        originalPos: Point2;
        currentPos: Point2;
    };
    // Rope-like adjustment state
    dragAdjustmentState?: DragAdjustmentState;
    // Unsaved changes tracking
    hasUnsavedChanges: boolean;
};
type MissionsActions = {
    setIsSelectingStationForReset: (
        isSelectingStationForReset: boolean
    ) => void;
    setPathMap: (pathMap?: PathMap) => void;
    setPathMapForMissionRestore: (pathMap?: PathMap) => void;
    setSelectedPathMap: (pathMap?: { id: string; name: string }) => void;
    setPathMaps: (pathMaps: { id: string; name: string }[]) => void;
    setPathMapMissions: (missions: Mission[]) => void;
    setMission: (mission?: Mission) => void;
    setActiveMissionId: (activeMissionId: string) => void;
    setFrameReference: (frameReference: string) => void;
    setMissionToastId: (missionToastId?: Id) => void;
    addPathToMission: (path: Path) => void;
    clearMission: () => void;
    setPathToDelete: (pathToDelete?: Path) => void;
    deletePath: () => void;
    setIsDeletingPath: (isDeletingPath: boolean) => void;
    addStationToPathMap: (station: Station) => void;
    addPathtoPathMap: (
        utmPath: Point2[],
        latLngPath: LatLng[],
        sourceStationId: string,
        destStationId: string
    ) => void;
    setLatLng: (latLng: LatLng) => void;
    setMapXY: (mapXY: Point2) => void;
    setRobotYaw: (robotYaw: number) => void;
    setNearByStation: (nearbyStation?: Station) => void;
    setSourceStation: (sourceStation?: Station) => void;
    setSelectedStation: (selectedStation?: Station) => void;
    setLatLngPath: (latLngPath: LatLng[]) => void;
    clearPathmap: () => void;
    setIsPathMapping: (isPathMapping: boolean) => void;
    setIsMissionExecuting: (isMissionExecuting: boolean) => void;
    setIsAbortingMission: (isAbortingMission: boolean) => void;
    setIsTeleoperating: (isTeleoperating: boolean) => void;
    setIsLoadingTeleop: (isLoadingTeleop: boolean) => void;
    setIsExecutingDifferentMission: (isMissionExecuting: boolean) => void;
    setIsMissionPlanning: (isMissionPlanning: boolean) => void;
    setIsLocalized: (isLocalized: boolean) => void;
    setIsNonRTKMode: (isNonRTKMode: boolean) => void;
    resetMissionsState: () => void;
    addBoundary: (utm: Point2[], gps: LatLng[]) => void;
    addObstacle: (utm: Point2[], gps: LatLng[], boundaryId: string) => void;
    deleteBoundary: (boundaryId: string) => void;
    deleteObstacle: (obstacleId: string) => void;
    // LIDAR Mapping actions
    setIsLidarMapping: (isLidarMapping: boolean) => void;
    setNdtScore: (score: number | null) => void;
    addSavedMap: (mapName: string) => void;
    setSelectedLidarMap: (mapName: string) => void;
    setPcdSavePath: (path: string) => void;
    // Map display actions
    setMapType: (mapType: "google" | "lidar") => void;
    setLidar2DMapUrl: (url: string) => void;
    // New UI panel actions
    setLeftPanelMode: (mode: "gps" | "lidar" | "odom" | null) => void;
    setRightPanelMode: (mode: "overview" | "logs" | null) => void;
    // Path editing actions
    startPathEditing: (pointCount: number) => void;
    stopPathEditing: () => void;
    updatePathPoint: (
        pathId: string,
        pointIndex: number,
        newPosition: Point2
    ) => void;
    setCurrentDragInfo: (info?: {
        pathId: string;
        pointIndex: number;
        originalPos: Point2;
        currentPos: Point2;
    }) => void;
    undoLastEdit: () => void;
    savePathEdits: () => void;
    cancelPathEdits: () => void;
    // Rope-like adjustment actions
    setDragAdjustmentState: (state?: DragAdjustmentState) => void;
    // Unsaved changes actions
    setHasUnsavedChanges: (hasChanges: boolean) => void;
};

const initialState: MissionsState = {
    isSelectingStationForReset: false,
    pathMaps: [],
    latLngPath: [],
    pathToDelete: undefined,
    activeMissionId: "",
    frameReference: "",
    selectedPathMap: undefined,
    isPathMapping: false,
    isDeletingPath: false,
    isMissionExecuting: false,
    isAbortingMission: false,
    isTeleoperating: false,
    isExecutingDifferentMission: false,
    isMissionPlanning: false,
    isLocalized: false,
    isLoadingTeleop: false,
    isNonRTKMode: false,
    // LIDAR Mapping initial state
    isLidarMapping: false,
    ndtScore: null,
    savedMaps: [],
    selectedLidarMap: "",
    pcdSavePath: "",
    // Map display initial state
    mapType: "google",
    lidar2DMapUrl: undefined,
    // New UI panel initial states
    leftPanelMode: null,
    rightPanelMode: null,
    // Path editing initial state
    isEditingPaths: false,
    editPointCount: 30,
    pathEdits: new Map(),
    undoStack: [],
    currentDragInfo: undefined,
    dragAdjustmentState: undefined,
    hasUnsavedChanges: false
};

export const useMissionsStore = create<MissionsState & MissionsActions>()(
    devtools(
        immer((set, get) => ({
            ...initialState,
            setIsSelectingStationForReset: (
                isSelectingStationForReset: boolean
            ) => set({ isSelectingStationForReset }),
            addBoundary: (utm, gps) => {
                const pathMap = get().pathMap;
                if (!pathMap) {
                    toast.error("No pathmap selected");
                    return;
                }
                const now = Date.now().toString();
                const boundary: Boundary = {
                    id: now,
                    utm: utm,
                    gps: gps
                };
                const updatedPathMap = {
                    ...pathMap,
                    boundaries: [...(pathMap.boundaries || []), boundary]
                };
                set({ pathMap: updatedPathMap });
            },
            addObstacle: (utm, gps, boundaryId) => {
                const pathMap = get().pathMap;
                if (!pathMap) {
                    toast.error("No pathmap selected");
                    return;
                }
                const obstacle: Obstacle = {
                    id: Date.now().toString(),
                    boundaryId,
                    utm: utm,
                    gps: gps
                };
                const updatedPathMap = {
                    ...pathMap,
                    obstacles: [...(pathMap.obstacles || []), obstacle]
                };
                set({ pathMap: updatedPathMap });
            },
            deleteBoundary: (boundaryId) => {
                const pathMap = get().pathMap;
                if (!pathMap) {
                    toast.error("No pathmap selected");
                    return;
                }
                const { boundaries, obstacles } = pathMap;

                const obstacleExists = obstacles.find(
                    (obstacle) => obstacle.boundaryId === boundaryId
                );
                if (obstacleExists) {
                    toast.error("Boundary contains obstacles");
                    return;
                }

                const updatedBoundaries = boundaries.filter(
                    (item) => item.id !== boundaryId
                );

                set({ pathMap: { ...pathMap, boundaries: updatedBoundaries } });
            },
            deleteObstacle: (obstacleId) => {
                const pathMap = get().pathMap;
                if (!pathMap) {
                    toast.error("No pathmap selected");
                    return;
                }
                const { obstacles } = pathMap;
                const updatedObstacles = obstacles.filter(
                    (obstacle) => obstacle.id !== obstacleId
                );
                const updatedPathMap = {
                    ...pathMap,
                    obstacles: updatedObstacles
                };
                set({ pathMap: updatedPathMap });
            },
            clearPathmap: () => {
                if (get().pathMap) {
                    set((state) => ({ pathMap: state.pathMap?.paths }));
                }
            },
            setIsDeletingPath: (isDeletingPath) => {
                set({ isDeletingPath });
            },
            setPathToDelete: (pathToDelete?: Path) => {
                set({ pathToDelete });
            },
            deletePath: () => {
                const pathToDelete = get().pathToDelete;
                if (!pathToDelete) {
                    toast.error("No path selected to delete");
                    return;
                }

                const pathMap = get().pathMap;
                if (!pathMap) {
                    toast.error("No pathmap selected");
                    return;
                }

                // Check if the path is used in a mission
                // const pathUsedInMission = pathMap.missions.find((mission) =>
                //     mission.mission.find((path) => path.id === pathToDelete.id)
                // );

                // if (pathUsedInMission) {
                //     toast.error("Path is used in a mission");
                //     return;
                // }

                // Get the first path segment
                const first = pathMap.paths[pathToDelete.destStationId];
                if (!first) {
                    toast.error("Path is not in the pathmap");
                    return;
                }

                // Find the source station
                const sourceStation = first.find(
                    (path) => path.id === pathToDelete.id
                )?.destStationId;

                if (!sourceStation) {
                    toast.error("Source station not found");
                    return;
                }

                // Get the second path segment
                const second = pathMap.paths[sourceStation];
                if (!second) {
                    toast.error("Path is not in the pathmap");
                    return;
                }

                // Create updated path segments
                const updatedFirst = first.filter(
                    (path) => path.id !== pathToDelete.id
                );
                const updatedSecond = second.filter(
                    (path) => path.id !== pathToDelete.id
                );

                // Create a new paths object with the updated segments
                const updatedPaths = {
                    ...pathMap.paths,
                    [pathToDelete.destStationId]: updatedFirst,
                    [sourceStation]: updatedSecond
                };

                let stations = pathMap.stations;
                if (updatedFirst.length === 0) {
                    delete updatedPaths[pathToDelete.destStationId];
                    stations = stations.filter(
                        (station) => station.id !== pathToDelete.destStationId
                    );
                }

                if (updatedSecond.length === 0) {
                    delete updatedPaths[sourceStation];
                    stations = stations.filter(
                        (station) => station.id !== sourceStation
                    );
                }

                // Create a new pathMap object with the updated paths
                const updatedPathMap = {
                    ...pathMap,
                    paths: updatedPaths,
                    stations
                };

                set({
                    pathMap: updatedPathMap,
                    isDeletingPath: false,
                    pathToDelete: undefined
                });
            },
            setPathMap: (pathMap) => {
                set({
                    pathMap,
                    latLngPath: [],
                    sourceStation: undefined,
                    nearbyStation: undefined,
                    selectedStation: undefined,
                    isPathMapping: false,
                    isMissionPlanning: false,
                    isMissionExecuting: false,
                    isTeleoperating: false,
                    isDeletingPath: false,
                    pathToDelete: undefined,
                    hasUnsavedChanges: false // ✅ FIX: Clear unsaved changes when loading new pathmap
                });

                if (get().mission && pathMap) {
                    const availableMission = pathMap.missions.find(
                        (pathMapMission) =>
                            pathMapMission._id === get().mission?._id
                    );
                    if (!availableMission) {
                        set({ mission: undefined });
                    }
                }
            },
            setPathMapForMissionRestore: (pathMap) => {
                // Set pathMap without resetting mission execution states
                // Used when restoring mission state from robot on page reload
                set({ pathMap });
            },
            setSelectedPathMap: (selectedPathMap) => {
                set({
                    selectedPathMap,
                    latLngPath: [],
                    sourceStation: undefined,
                    nearbyStation: undefined,
                    selectedStation: undefined,
                    isPathMapping: false,
                    isMissionPlanning: false,
                    isMissionExecuting: false,
                    isTeleoperating: false,
                    isDeletingPath: false,
                    pathToDelete: undefined
                });
            },
            setPathMaps: (pathMaps) => {
                set({ pathMaps });
            },
            setPathMapMissions: (missions) => {
                set((state) => {
                    if (state.pathMap) {
                        state.pathMap.missions = missions;
                    }
                });
            },
            setMission: (mission) => {
                set({ mission });
            },
            setActiveMissionId: (activeMissionId) => {
                set({ activeMissionId });
            },
            setFrameReference: (frameReference) => {
                set({ frameReference });
            },
            setMissionToastId: (missionToastId) => {
                set({ missionToastId });
            },
            addPathToMission: (path: Path) => {
                set((state) => {
                    if (state.mission) {
                        state.mission.mission = [
                            ...state.mission.mission,
                            path
                        ];
                    } else {
                        toast.error("No mission selected");
                    }
                });
            },
            clearMission: () => {
                set((state) => {
                    if (state.mission) {
                        state.mission.mission = [];
                    } else {
                        toast.error("No mission selected");
                    }
                });
            },
            setLatLng: (latLng: LatLng) => {
                set({ latLng });
            },
            setMapXY: (mapXY: Point2) => {
                set({ mapXY });
            },
            setRobotYaw: (robotYaw: number) => {
                set({ robotYaw });
            },
            setNearByStation: (nearbyStation) => {
                set({ nearbyStation });
            },
            setLatLngPath: (latLngPath: LatLng[]) => {
                set({ latLngPath });
            },
            addStationToPathMap: (station) => {
                set((state) => {
                    if (state.pathMap) {
                        state.pathMap.stations = [
                            ...state.pathMap.stations,
                            station
                        ];
                        // ✅ FIX: Mark unsaved changes
                        state.hasUnsavedChanges = true;
                    } else {
                        toast.error("Pathmap not selected");
                    }
                });
            },
            addPathtoPathMap: (
                utmPath,
                latLngPath,
                sourceStationId,
                destStationId
            ) => {
                if (!utmPath || utmPath.length < 3) {
                    console.log(
                        "Skipping path: too few points",
                        utmPath,
                        sourceStationId,
                        destStationId
                    );
                    return;
                }

                if (utmPath && utmPath.length >= 2) {
                    const totalDist = utmPath.reduce((sum, point, idx, arr) => {
                        if (idx === 0) return 0;
                        const prev = arr[idx - 1];
                        const dx = point.x - prev.x;
                        const dy = point.y - prev.y;
                        return sum + Math.sqrt(dx * dx + dy * dy);
                    }, 0);
                    if (totalDist < 1.0) {
                        console.log(
                            "Skipping path: robot did not move enough",
                            totalDist
                        );
                        return;
                    }
                }
                set((state) => {
                    const pathMap = state.pathMap;
                    if (pathMap) {
                        if (!pathMap.paths) {
                            pathMap.paths = {};
                        }
                        if (!pathMap.paths[sourceStationId]) {
                            pathMap.paths[sourceStationId] = [];
                        }
                        if (!pathMap.paths[destStationId]) {
                            pathMap.paths[destStationId] = [];
                        }

                        const isDuplicate = pathMap.paths[sourceStationId].some(
                            (p) =>
                                p.destStationId === destStationId &&
                                p.utm.length === utmPath.length
                        );
                        if (isDuplicate) {
                            console.log(
                                "Skipping duplicate path",
                                sourceStationId,
                                destStationId
                            );
                            return;
                        }

                        const reversedUtmPath = utmPath.slice().reverse();
                        const reversedLatLngPath = latLngPath.slice().reverse();

                        console.log(
                            "Before adding, paths:",
                            JSON.stringify(pathMap.paths, null, 2)
                        );

                        pathMap.paths[sourceStationId] = [
                            ...pathMap.paths[sourceStationId],
                            {
                                id: Date.now().toString(),
                                utm: utmPath,
                                gps: latLngPath,
                                destStationId
                            }
                        ];

                        pathMap.paths[destStationId] = [
                            ...pathMap.paths[destStationId],
                            {
                                id: Date.now().toString(),
                                utm: reversedUtmPath,
                                gps: reversedLatLngPath,
                                destStationId: sourceStationId
                            }
                        ];

                        console.log(
                            "After adding, paths:",
                            JSON.stringify(pathMap.paths, null, 2)
                        );

                        state.pathMap = pathMap;
                        // ✅ FIX: Mark unsaved changes
                        state.hasUnsavedChanges = true;
                    } else {
                        toast.error("Pathmap not selected");
                    }
                });
            },
            setSourceStation: (sourceStation?: Station) => {
                set({ sourceStation });
            },
            setSelectedStation: (selectedStation?: Station) => {
                set({ selectedStation });
            },

            setIsPathMapping: (isPathMapping: boolean) => {
                set({ isMissionPlanning: false });
                set({ isPathMapping });
            },
            setIsMissionPlanning: (isMissionPlanning) => {
                set({ isPathMapping: false });
                set({ isMissionPlanning });
            },
            setIsMissionExecuting: (isMissionExecuting) => {
                set({ isMissionExecuting });
            },
            setIsAbortingMission: (isAbortingMission) => {
                set({ isAbortingMission });
            },
            setIsTeleoperating: (isTeleoperating) => {
                set({ isTeleoperating });
            },
            setIsLoadingTeleop: (isLoadingTeleop) => {
                set({ isLoadingTeleop });
            },
            setIsExecutingDifferentMission: (isExecutingDifferentMission) => {
                set({ isExecutingDifferentMission });
            },
            setIsLocalized: (isLocalized) => {
                set({ isLocalized });
            },
            setIsNonRTKMode: (isNonRTKMode) => {
                set({ isNonRTKMode });
            },
            resetMissionsState: () => {
                set({
                    pathMaps: [],
                    latLngPath: [],
                    pathMap: undefined,
                    selectedPathMap: undefined
                });
            },
            // LIDAR Mapping action implementations
            setIsLidarMapping: (isLidarMapping) => {
                set({ isLidarMapping });
            },
            setNdtScore: (ndtScore) => {
                set({ ndtScore });
            },
            addSavedMap: (mapName) => {
                set((state) => ({
                    savedMaps: [...state.savedMaps, mapName]
                }));
            },
            setSelectedLidarMap: (selectedLidarMap) => {
                set({ selectedLidarMap });
            },
            setPcdSavePath: (pcdSavePath) => {
                set({ pcdSavePath });
            },
            // Map display action implementations
            setMapType: (mapType) => {
                set({ mapType });
            },
            setLidar2DMapUrl: (lidar2DMapUrl) => {
                set({ lidar2DMapUrl });
            },
            // New UI panel action implementations
            setLeftPanelMode: (leftPanelMode) => {
                set({ leftPanelMode });
            },
            setRightPanelMode: (rightPanelMode) => {
                set({ rightPanelMode });
            },
            // Path editing action implementations
            startPathEditing: (pointCount) => {
                const pathMap = get().pathMap;
                if (!pathMap) {
                    toast.error("No pathmap selected");
                    return;
                }

                // Initialize path edits map with original paths
                const pathEdits = new Map<string, PathEditData>();
                Object.values(pathMap.paths).forEach((pathArray) => {
                    pathArray.forEach((path) => {
                        pathEdits.set(path.id, {
                            originalPath: path,
                            editedPoints: new Map()
                        });
                    });
                });

                set({
                    isEditingPaths: true,
                    editPointCount: pointCount,
                    pathEdits,
                    undoStack: []
                });

                toast.success(`Path editing enabled with ${pointCount} points`);
            },
            stopPathEditing: () => {
                set({
                    isEditingPaths: false,
                    pathEdits: new Map(),
                    undoStack: [],
                    currentDragInfo: undefined
                });
            },
            updatePathPoint: (pathId, pointIndex, newPosition) => {
                set((state) => {
                    const editData = state.pathEdits.get(pathId);
                    if (!editData) return;

                    const oldPosition = editData.originalPath.utm[pointIndex];

                    // Add to undo stack
                    state.undoStack.push({
                        pathId,
                        pointIndex,
                        oldPosition,
                        newPosition,
                        timestamp: Date.now()
                    });

                    // Update edited points
                    editData.editedPoints.set(pointIndex, newPosition);
                });
            },
            setCurrentDragInfo: (info) => {
                set({ currentDragInfo: info });
            },
            undoLastEdit: () => {
                set((state) => {
                    if (state.undoStack.length === 0) {
                        toast.info("Nothing to undo");
                        return;
                    }

                    const lastEdit = state.undoStack.pop()!;
                    const editData = state.pathEdits.get(lastEdit.pathId);

                    if (editData) {
                        editData.editedPoints.delete(lastEdit.pointIndex);
                        toast.success("Edit undone");
                    }
                });
            },
            savePathEdits: () => {
                set((state) => {
                    const pathMap = state.pathMap;
                    if (!pathMap) {
                        toast.error("No pathmap to save");
                        return;
                    }

                    // Track updated paths by ID
                    const updatedPaths = new Map<string, Path>();

                    // Apply all edits to pathmap
                    state.pathEdits.forEach((editData, pathId) => {
                        if (editData.editedPoints.size === 0) return;

                        // Find the path in pathMap
                        Object.values(pathMap.paths).forEach((pathArray) => {
                            const pathIndex = pathArray.findIndex(
                                (p) => p.id === pathId
                            );
                            if (pathIndex !== -1) {
                                const path = pathArray[pathIndex];
                                const newUtmPath = [...path.utm];

                                // Apply edited points
                                editData.editedPoints.forEach(
                                    (newPos, index) => {
                                        newUtmPath[index] = newPos;
                                    }
                                );

                                // Convert UTM to GPS for Three.js rendering
                                const newGpsPath = newUtmPath.map((utmPoint) =>
                                    utmToLatLng(utmPoint.x, utmPoint.y)
                                );

                                const updatedPath = {
                                    ...path,
                                    utm: newUtmPath,
                                    gps: newGpsPath
                                };

                                pathArray[pathIndex] = updatedPath;

                                // Track for mission updates
                                updatedPaths.set(pathId, updatedPath);
                            }
                        });
                    });

                    // Update all missions that use edited paths
                    let missionUpdateCount = 0;
                    pathMap.missions.forEach((mission) => {
                        mission.mission.forEach(
                            (missionPath, missionPathIndex) => {
                                const updatedPath = updatedPaths.get(
                                    missionPath.id
                                );
                                if (updatedPath) {
                                    // Replace mission's path with updated version
                                    mission.mission[missionPathIndex] =
                                        updatedPath;
                                    missionUpdateCount++;
                                }
                            }
                        );
                    });

                    // Clear editing state
                    state.isEditingPaths = false;
                    state.pathEdits = new Map();
                    state.undoStack = [];
                    state.currentDragInfo = undefined;

                    if (missionUpdateCount > 0) {
                        toast.success(
                            `Path edits saved! Updated ${missionUpdateCount} path(s) in missions.`
                        );
                    } else {
                        toast.success("Path edits saved to pathmap");
                    }
                });
            },
            cancelPathEdits: () => {
                set({
                    isEditingPaths: false,
                    pathEdits: new Map(),
                    undoStack: [],
                    currentDragInfo: undefined,
                    dragAdjustmentState: undefined
                });
                toast.info("Path editing cancelled");
            },
            // Rope-like adjustment action implementations
            setDragAdjustmentState: (dragAdjustmentState) => {
                set({ dragAdjustmentState });
            },
            // Unsaved changes action implementations
            setHasUnsavedChanges: (hasUnsavedChanges) => {
                set({ hasUnsavedChanges });
            }
        }))
    )
);
