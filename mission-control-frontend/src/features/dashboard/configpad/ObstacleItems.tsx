import SmIconButton from "@/components/ui/SmIconButton";
import { useBoundaryStore } from "@/stores/boundaryStore";
import { useMissionsStore } from "@/stores/missionsStore";
import { useR3fStore } from "@/stores/r3fStore";
import { MdClose, MdDelete, MdStart, MdStop } from "react-icons/md";
import { toast } from "react-toastify";
import { Vector2 } from "three";
import { useShallow } from "zustand/react/shallow";

export const MapObstaclesSection = () => {
    const [
        boundaryForObstacleMapping,
        isSelectingBoundaryForObstacleMapping,
        setIsSelectingBoundaryForObstacleMapping
    ] = useBoundaryStore(
        useShallow((state) => [
            state.boundaryForObstacleMapping,
            state.isSelectingBoundaryForObstacleMapping,
            state.setIsSelectingBoundaryForObstacleMapping
        ])
    );
    const setClickPosition = useR3fStore((state) => state.setClickPosition);

    const obstacleMappingClickHandler = () => {
        setClickPosition(new Vector2(-Number.MIN_VALUE, -Number.MIN_VALUE));
        setIsSelectingBoundaryForObstacleMapping(true);
    };

    return (
        <>
            <div className="flex items-center justify-between">
                <span>Map obstacles</span>

                {!isSelectingBoundaryForObstacleMapping &&
                !boundaryForObstacleMapping ? (
                    <SmIconButton
                        name={"Start"}
                        className={"bg-primary700"}
                        onClick={obstacleMappingClickHandler}
                    >
                        <MdStart className="h-4 w-4 text-white" />
                    </SmIconButton>
                ) : !boundaryForObstacleMapping ? (
                    <div>Select a boundary </div>
                ) : (
                    <MapObstaclesButton />
                )}
            </div>
            <DeleteObstacleButton />
        </>
    );
};

const MapObstaclesButton = () => {
    const addObstacleToBoundary = useMissionsStore(
        (state) => state.addObstacle
    );
    const [
        isMappingObstacles,
        setIsMappingObstacles,
        setIsSelectingBoundary,
        isObstacleNearStart,
        boundaryForObstacleMapping,
        clearObstacle,
        obstacleGPS,
        obstacleUtm
    ] = useBoundaryStore(
        useShallow((state) => [
            state.isMappingObstacles,
            state.setIsMappingObstacles,
            state.setIsSelectingBoundaryForObstacleMapping,
            state.isObstacleNearStart,
            state.boundaryForObstacleMapping,
            state.clearObstacle,
            state.obstacleGPS,
            state.obstacleUtm
        ])
    );

    const setClickPosition = useR3fStore((state) => state.setClickPosition);

    const startObstacleMappingHandler = () => {
        setClickPosition(new Vector2(-Number.MIN_VALUE, -Number.MIN_VALUE));
        setIsMappingObstacles(true);
        setIsSelectingBoundary(false);
    };

    const cancelObstacleMappingHandler = () => {
        clearObstacle();
    };

    const stopObstacleMappingHandler = () => {
        if (!isObstacleNearStart) {
            toast.error("Obstacle should be closed");
            return;
        }
        if (!boundaryForObstacleMapping) {
            toast.error("No boundary selected");
            return;
        }
        addObstacleToBoundary(
            obstacleUtm,
            obstacleGPS,
            boundaryForObstacleMapping.id
        );
        clearObstacle();
    };

    return !isMappingObstacles ? (
        <SmIconButton
            name={"Map"}
            className={"bg-purple-500"}
            onClick={startObstacleMappingHandler}
        >
            <MdStart className="h-4 w-4 text-white" />
        </SmIconButton>
    ) : (
        <div className="flex items-center gap-2">
            <SmIconButton
                name={"Stop"}
                className={"bg-primary700"}
                onClick={stopObstacleMappingHandler}
            >
                <MdStop className="h-4 w-4 text-white" />
            </SmIconButton>
            <SmIconButton
                name={"Cancel"}
                className={"bg-red-500"}
                onClick={cancelObstacleMappingHandler}
            >
                <MdClose className="h-4 w-4 text-white" />
            </SmIconButton>
        </div>
    );
};

const DeleteObstacleButton = () => {
    const setClickPosition = useR3fStore((state) => state.setClickPosition);
    const [obstacles, deleteObstacle] = useMissionsStore(
        useShallow((state) => [
            state.pathMap?.obstacles || [],
            state.deleteObstacle
        ])
    );

    const [
        obstacleToDelete,
        isDeletingObstacle,
        setObstacleToDelete,
        setIsDeletingObstacle
    ] = useBoundaryStore(
        useShallow((state) => [
            state.obstacleToDelete,
            state.isDeletingObstacle,
            state.setObstacleToDelete,
            state.setIsDeletingObstacle
        ])
    );

    const deleteObstacleHandler = () => {
        setClickPosition(new Vector2(-Number.MIN_VALUE, -Number.MIN_VALUE));
        setIsDeletingObstacle(true);
    };

    const confirmDeleteObstacleHandler = () => {
        if (!obstacleToDelete) {
            toast.error("No obstacle selected");
            return;
        }
        deleteObstacle(obstacleToDelete.id);
        setObstacleToDelete(undefined);
        setIsDeletingObstacle(false);
    };

    const cancelDeleteObstacleHandler = () => {
        setObstacleToDelete(undefined);
        setIsDeletingObstacle(false);
    };

    if (!obstacles.length) return null;

    return (
        <div className="flex items-center justify-between">
            <span>Delete obstacle</span>
            {!isDeletingObstacle && !obstacleToDelete ? (
                <div className="flex items-center">
                    <SmIconButton
                        name={"Delete"}
                        className={"bg-red-500"}
                        onClick={deleteObstacleHandler}
                    >
                        <MdDelete className="h-4 w-4 text-white" />
                    </SmIconButton>
                </div>
            ) : isDeletingObstacle && obstacleToDelete ? (
                <div className="flex gap-2">
                    <div className="flex items-center">
                        <SmIconButton
                            name={"Confirm"}
                            className={"bg-red-500"}
                            onClick={confirmDeleteObstacleHandler}
                        >
                            <MdDelete className="h-4 w-4 text-white" />
                        </SmIconButton>
                    </div>
                    <div className="flex items-center">
                        <SmIconButton
                            name={"Cancel"}
                            className={"bg-backgroundGray"}
                            onClick={cancelDeleteObstacleHandler}
                        >
                            <MdClose className="h-4 w-4 text-white" />
                        </SmIconButton>
                    </div>
                </div>
            ) : (
                <div>Select an obstacle</div>
            )}
        </div>
    );
};
