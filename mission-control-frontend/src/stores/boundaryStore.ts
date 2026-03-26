import { Boundary, LatLng, Obstacle, Point2 } from "@/data/types";
import { create } from "zustand";

type BoundaryConfig = {
    safetyMargin: number;
    wheelSeperation: number;
    stepSize: number;
};

type BoundaryStoreState = {
    boundaryConfig: BoundaryConfig;
    isMappingBoundary: boolean;
    isBoundaryNearStart: boolean;
    boundaryGps: LatLng[];
    boundaryUtm: Point2[];
    boundaryForObstacleMapping?: Boundary;
    boundaryForDeletion?: Boundary;
    boundaryForPathGen?: Boundary;
    isSelectingBoundaryForObstacleMapping: boolean;
    isSelectingBoundaryForPathGen: boolean;
    isSelectingBoundaryForBoundaryDeletion: boolean;
    isMappingObstacles: boolean;
    isDeletingObstacle: boolean;
    obstacleToDelete?: Obstacle;
    isObstacleNearStart: boolean;
    obstacleGPS: LatLng[];
    obstacleUtm: Point2[];
};

type BoundaryStoreActions = {
    setBoundaryConfig: (boundaryConfig: BoundaryConfig) => void;
    setIsMappingBoundary: (isMappingBoundary: boolean) => void;
    setIsSelectingBoundaryForObstacleMapping: (
        isSelectingBoundaryForObstacleMapping: boolean
    ) => void;
    setIsSelectingBoundaryForBoundaryDeletion: (
        isSelectingBoundaryForBoundaryDeletion: boolean
    ) => void;
    setIsSelectingBoundaryForPathGen: (
        isSelectingBoundaryForPathGen: boolean
    ) => void;
    setBoundaryForDeletion: (boundaryForDeletion?: Boundary) => void;
    setBoundaryForPathGen: (boundaryForPathGen?: Boundary) => void;
    setBoundaryForObstacleMapping: (
        boundaryForObstacleMapping?: Boundary
    ) => void;
    addPointToBoundary: (point: LatLng, utm: Point2) => void;
    setIsObstacleNearStart: (isObstacleNearStart: boolean) => void;
    addPointToObstacles: (point: LatLng, utm: Point2) => void;
    setIsMappingObstacles: (isMappingObstacles: boolean) => void;
    clearBoundary: () => void;
    setIsNearStart: (isNearStart: boolean) => void;
    setIsDeletingObstacle: (isDeletingObstacle: boolean) => void;
    setObstacleToDelete: (obstacleToDelete?: Obstacle) => void;
    clearObstacle: () => void;
};

const initialState: BoundaryStoreState = {
    boundaryConfig: {
        safetyMargin: 0.5,
        wheelSeperation: 0.62,
        stepSize: 0.5
    },
    boundaryGps: [],
    boundaryUtm: [],
    isBoundaryNearStart: false,
    isMappingBoundary: false,
    isSelectingBoundaryForPathGen: false,
    isSelectingBoundaryForBoundaryDeletion: false,
    isSelectingBoundaryForObstacleMapping: false,
    obstacleGPS: [],
    obstacleUtm: [],
    isMappingObstacles: false,
    isObstacleNearStart: false,
    isDeletingObstacle: false
};

export const useBoundaryStore = create<
    BoundaryStoreState & BoundaryStoreActions
>((set, get) => ({
    ...initialState,
    setBoundaryForPathGen: (boundaryForPathGen) => set({ boundaryForPathGen }),
    setBoundaryForDeletion: (boundaryToDelete) => {
        set({ boundaryForDeletion: boundaryToDelete });
    },
    setIsSelectingBoundaryForPathGen: (isSelectingBoundaryForPathGen) => {
        set({ isSelectingBoundaryForPathGen });
    },
    setIsSelectingBoundaryForBoundaryDeletion: (isDeletingBoundary) => {
        set({ isSelectingBoundaryForBoundaryDeletion: isDeletingBoundary });
    },
    setIsSelectingBoundaryForObstacleMapping: (
        isSelectingBoundaryForObstacleMapping
    ) => {
        set({ isSelectingBoundaryForObstacleMapping });
    },
    setBoundaryForObstacleMapping: (selectedBoundary?: Boundary) =>
        set({ boundaryForObstacleMapping: selectedBoundary }),
    setIsDeletingObstacle: (isDeletingObstacle) => {
        set({ isDeletingObstacle });
    },
    setObstacleToDelete: (obstacleToDelete) => {
        set({ obstacleToDelete });
    },
    setIsMappingObstacles: (isMappingObstacles) => {
        set({ isMappingObstacles });
    },
    setIsObstacleNearStart: (isObstacleNearStart) => {
        set({ isObstacleNearStart });
    },
    setIsNearStart: (isNearStart) => {
        set({ isBoundaryNearStart: isNearStart });
    },

    clearBoundary: () => {
        set({
            boundaryGps: [],
            boundaryUtm: []
        });
    },

    setBoundaryConfig: (boundaryConfig) => {
        set({ boundaryConfig });
    },

    addPointToObstacles: (point, utm) => {
        set((state) => ({
            obstacleGPS: [...state.obstacleGPS, point],
            obstacleUtm: [...state.obstacleUtm, utm]
        }));
    },
    addPointToBoundary: (point, utm) => {
        set((state) => ({
            boundaryGps: [...state.boundaryGps, point],
            boundaryUtm: [...state.boundaryUtm, utm]
        }));
    },
    setIsMappingBoundary: (isMappingBoundary) => {
        set({ isMappingBoundary });
    },
    clearObstacle: () => {
        set({
            isMappingObstacles: false,
            isSelectingBoundaryForObstacleMapping: false,
            boundaryForObstacleMapping: undefined,
            obstacleGPS: [],
            obstacleUtm: []
        });
    }
}));
