import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
    IBoundary,
    ILocation,
    ActionWayPoint,
    IBoundaryState
} from "../data/types";
import { dbToThreeJs } from "../util/cordinatesConverter";

type RobotConfigState = {
    tabs: string[];
    selectedTab?: string;
    location: ILocation | undefined;
    boundary: IBoundaryState;
    selectedBoundaryMap: IBoundary[];
    selectedMissionName: string | undefined;
    actionWayPoints: ActionWayPoint[] | undefined;
    isMissionPlanning: boolean;
    selectedActionWayPoint:
        | { actionWayPoint: ActionWayPoint; index: number }
        | undefined;
    isMissionExecuting: boolean;
    isMissionPaused: boolean;
    showTeleOpsPanel: boolean;
    isAvoidObstacle: boolean;
    swapCamera: boolean;
};

type RobotConfigActions = {
    setSelectedTab: (selectedTab: string) => void;
    setLocation: (Location: ILocation | undefined) => void;
    setSelectedBoundaryMap: (boundaryMap: IBoundary[]) => void;
    addWayPointToBoundary: (boundary: IBoundary) => void;
    setIsBoundaryMapping: (flag: boolean) => void;
    setIsBoundaryEditing: (flag: boolean) => void;
    setSelectedMissionName: (missionName: string | undefined) => void;
    addActionWayPoint: (actionWayPoint: ActionWayPoint | undefined) => void;
    setActionWayPoints: (actionWayPoints: ActionWayPoint[] | undefined) => void;
    clearActionWayPoints: () => void;
    setIsMissionExecuting: (isMissionExecuting: boolean) => void;
    setIsMissionPaused: (isMissionPaused: boolean) => void;
    setIsMissionPlanning: (isMissionPlanning: boolean) => void;
    setSelectedActionWayPoint: (
        actionWayPoint: ActionWayPoint,
        index: number
    ) => void;
    setShowTeleOpsPanel: (showTeleOpsPanel: boolean) => void;
    setIsAvoidObstacle: (isAvoidObstacle: boolean) => void;
    setSwapCamera: (swapCamera: boolean) => void;
};

const initialState: RobotConfigState = {
    tabs: ["Path Maps", "Missions"],
    location: undefined,
    boundary: { isBoundaryMapping: false, isBoundaryEditing: false },
    selectedBoundaryMap: [],
    isMissionPaused: false,
    isMissionExecuting: false,
    selectedMissionName: undefined,
    isMissionPlanning: false,
    selectedActionWayPoint: {
        index: -1,
        actionWayPoint: {
            action: { blade: false, deckHeight: 100 }
        }
    },
    actionWayPoints: [],
    swapCamera: false,
    showTeleOpsPanel: false,
    isAvoidObstacle: true,
};

// define the store
export const useRobotConfigStore = create<
    RobotConfigState & RobotConfigActions
>()(
    devtools(
        immer((set, get) => ({
            ...initialState,
            selectedTab: initialState.tabs[0],
            setSelectedTab: (selectedTab: string) => {
                set({ selectedTab });
            },
            // Boundary related actions
            setLocation: (newLocation) => {
                set({
                    location: newLocation,
                    boundary: {
                        isBoundaryMapping: false,
                        isBoundaryEditing: false
                    },
                    actionWayPoints: [],
                    selectedMissionName: undefined
                });
                if (newLocation && newLocation.boundaryMap) {
                    const boundaryMapVectors = newLocation.boundaryMap.map(
                        (val) => {
                            const pos = dbToThreeJs(val.position);
                            return { position: pos.vecPos };
                        }
                    ) as IBoundary[];
                    if (boundaryMapVectors) {
                        get().setSelectedBoundaryMap(boundaryMapVectors);
                    }
                }
            },
            setSelectedBoundaryMap: (newBoundary) => {
                set({ selectedBoundaryMap: newBoundary });
            },
            addWayPointToBoundary: (boundary) => {
                const newBoundaryMap = get().selectedBoundaryMap;
                newBoundaryMap.push(boundary);

                set({
                    selectedBoundaryMap: newBoundaryMap
                });
            },
            setIsBoundaryMapping: (flag) => {
                const prevBoundary = get().boundary;
                set({ boundary: { ...prevBoundary, isBoundaryMapping: flag } });
            },
            setIsBoundaryEditing: (flag) => {
                const prevBoundary = get().boundary;
                set({ boundary: { ...prevBoundary, isBoundaryEditing: flag } });
            },

            // Missions related actions
            setSelectedMissionName: (newMissionName) => {
                set({ selectedMissionName: newMissionName });
            },
            setIsMissionPlanning: (isMissionPlanning: boolean) => {
                set({
                    isMissionPlanning
                });
            },
            setSelectedActionWayPoint: (actionWayPoint, index) => {
                set({ selectedActionWayPoint: { actionWayPoint, index } });
            },
            addActionWayPoint: (actionWayPoint) => {
                const newActionWayPoints = get().actionWayPoints;
                if (actionWayPoint && newActionWayPoints) {
                    newActionWayPoints.push(actionWayPoint);
                }
                set({
                    actionWayPoints: newActionWayPoints
                });
            },
            setActionWayPoints: (actionWayPoints) => {
                set({ actionWayPoints });
            },
            clearActionWayPoints: () => {
                set({
                    actionWayPoints: []
                });
            },
            setSwapCamera: (swapCamera) => {
                set({ swapCamera });
            },
            setShowTeleOpsPanel: (showTeleOpsPanel) => {
                set({ showTeleOpsPanel });
            },
            setIsAvoidObstacle: (isAvoidObstacle) => {
                set({ isAvoidObstacle });
            },
            setIsMissionPaused: (isMissionPaused) => {
                set({ isMissionPaused });
            },
            setIsMissionExecuting: (isMissionExecuting) => {
                set({ isMissionExecuting });
            },
        }))
    )
);
