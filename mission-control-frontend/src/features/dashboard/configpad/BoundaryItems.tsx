import { useBoundaryStore } from "@/stores/boundaryStore";
import {
    MdArrowForward,
    MdArrowUpward,
    MdClose,
    MdDelete,
    MdPlayArrow,
    MdSave,
    MdStart,
    MdStop
} from "react-icons/md";
import * as XLSX from "xlsx";
import { useShallow } from "zustand/react/shallow";
import { toast } from "react-toastify";
import { generatePathFn } from "../pathMapService";
import { Point2, Station } from "@/data/types";
import { useMutation } from "react-query";
import { useMissionsStore } from "@/stores/missionsStore";
import { utmToLatLng } from "@/util/geoUtils";
import { useState } from "react";
import { errorLogger } from "@/util/errorLogger";
import SmIconButton from "@/components/ui/SmIconButton";
import { MapObstaclesSection } from "./ObstacleItems";
import { Vector2 } from "three";
import { useR3fStore } from "@/stores/r3fStore";

const BoundaryItems = () => {
    const boundaries = useMissionsStore(
        (state) => state.pathMap?.boundaries || []
    );

    return (
        <>
            <MapBoundarySection />
            {boundaries.length ? (
                <>
                    <MapObstaclesSection />
                    <GeneratePathButton />
                    {/* <DownloadBoundaryAndObstaclesButton /> */}
                </>
            ) : null}
        </>
    );
};
export default BoundaryItems;

const MapBoundarySection = () => {
    const [isPathMapping, isLocalized] = useMissionsStore(
        useShallow((state) => [state.isPathMapping, state.isLocalized])
    );
    const addBoundary = useMissionsStore((state) => state.addBoundary);
    const [
        setIsBoundaryMapping,
        clearBoundary,
        boundaryGps,
        boundaryUtm,
        isMappingBoundary
    ] = useBoundaryStore((state) => [
        state.setIsMappingBoundary,
        state.clearBoundary,
        state.boundaryGps,
        state.boundaryUtm,
        state.isMappingBoundary
    ]);
    const isNearStart = useBoundaryStore((state) => state.isBoundaryNearStart);
    const [stopMappingClicked, setStopMappingClicked] = useState(false);

    const startBoundaryMappingHandler = () => {
        if (!isLocalized) {
            toast.error("Bot is not localized");
            return;
        }
        if (isPathMapping) {
            toast.error("Path mapping in progress");
            return;
        }
        setIsBoundaryMapping(true);
    };

    const stopBoundaryMappingHandler = () => {
        if (boundaryGps.length > 2) {
            setIsBoundaryMapping(false);
            addBoundary(boundaryUtm, boundaryGps);
            clearBoundary();
            setStopMappingClicked(false);
        } else {
            toast.error("Too few points to create boundary");
        }
    };

    const cancelBoundaryMappingHandler = () => {
        setIsBoundaryMapping(false);
        setStopMappingClicked(false);
        clearBoundary();
    };

    const stopMappingClickHandler = () => {
        if (boundaryGps.length == 0) {
            toast.error("No boundary drawn");
            return;
        }
        if (!isNearStart) {
            toast.error("Boundary should be closed");
            return;
        }
        if (boundaryGps.length < 2) {
            toast.error("Too few points to create boundary");
            return;
        }
        setStopMappingClicked(true);
    };

    return (
        <>
            <div className="flex items-center justify-between">
                <span>Map boundary</span>
                <div className="flex gap-2">
                    {!isMappingBoundary ? (
                        <SmIconButton
                            name={"Start"}
                            className={"bg-primary700"}
                            onClick={startBoundaryMappingHandler}
                        >
                            <MdStart className="h-4 w-4 text-white" />
                        </SmIconButton>
                    ) : (
                        <>
                            {stopMappingClicked ? (
                                <SmIconButton
                                    name={"Save"}
                                    className={"bg-primary700"}
                                    onClick={stopBoundaryMappingHandler}
                                >
                                    <MdSave className="h-4 w-4 text-white" />
                                </SmIconButton>
                            ) : (
                                <SmIconButton
                                    name={"Stop"}
                                    className={"bg-primary700"}
                                    onClick={stopMappingClickHandler}
                                >
                                    <MdStop className="h-4 w-4 text-white" />
                                </SmIconButton>
                            )}
                            <SmIconButton
                                name={"Cancel"}
                                className={"bg-red-500"}
                                onClick={cancelBoundaryMappingHandler}
                            >
                                <MdClose className="h-4 w-4 text-white" />
                            </SmIconButton>
                        </>
                    )}
                </div>
            </div>
            <DeleteBoundaryButton />
        </>
    );
};

const DeleteBoundaryButton = () => {
    const setClickPosition = useR3fStore((state) => state.setClickPosition);
    const [boundaries, removeBoundary] = useMissionsStore(
        useShallow((state) => [
            state.pathMap?.boundaries || [],
            state.deleteBoundary
        ])
    );
    const [
        boundaryForDeletion,
        isSelectingBoundaryForBoundaryDeletion,
        setBoundaryForDeletion,
        setIsSelectingBoundaryForBoundaryDeletion
    ] = useBoundaryStore(
        useShallow((state) => [
            state.boundaryForDeletion,
            state.isSelectingBoundaryForBoundaryDeletion,
            state.setBoundaryForDeletion,
            state.setIsSelectingBoundaryForBoundaryDeletion
        ])
    );

    const deleteBoundaryHandler = () => {
        setClickPosition(new Vector2(-Number.MIN_VALUE, -Number.MIN_VALUE));
        setIsSelectingBoundaryForBoundaryDeletion(true);
        setBoundaryForDeletion(undefined);
    };

    const confirmDeleteBoundaryHandler = () => {
        if (!boundaryForDeletion) {
            toast.error("No boundary selected");
            return;
        }
        removeBoundary(boundaryForDeletion.id);
        setBoundaryForDeletion(undefined);
        setIsSelectingBoundaryForBoundaryDeletion(false);
    };

    const cancelDeleteBoundaryHandler = () => {
        setIsSelectingBoundaryForBoundaryDeletion(false);
        setBoundaryForDeletion(undefined);
    };

    if (!boundaries.length) return null;

    return (
        <div className="flex items-center justify-between">
            <span>Delete boundary</span>
            {!isSelectingBoundaryForBoundaryDeletion && !boundaryForDeletion ? (
                <div className="flex items-center">
                    <SmIconButton
                        name={"Delete"}
                        className={"bg-red-500"}
                        onClick={deleteBoundaryHandler}
                    >
                        <MdDelete className="h-4 w-4 text-white" />
                    </SmIconButton>
                </div>
            ) : boundaryForDeletion ? (
                <div className="flex gap-2">
                    <div className="flex items-center">
                        <SmIconButton
                            name={"Confirm"}
                            className={"bg-red-500"}
                            onClick={confirmDeleteBoundaryHandler}
                        >
                            <MdDelete className="h-4 w-4 text-white" />
                        </SmIconButton>
                    </div>
                    <div className="flex items-center">
                        <SmIconButton
                            name={"Cancel"}
                            className={"bg-backgroundGray"}
                            onClick={cancelDeleteBoundaryHandler}
                        >
                            <MdClose className="h-4 w-4 text-white" />
                        </SmIconButton>
                    </div>
                </div>
            ) : (
                <div>Select a boundary </div>
            )}
        </div>
    );
};

const GeneratePathButton = () => {
    const [isPathGenerating, setIsPathGenerating] = useState(false);
    const obstacles = useMissionsStore(
        (state) => state.pathMap?.obstacles || []
    );
    const [generatedClicked, setGeneratedClicked] = useState(false);

    const [
        boundaryConfig,
        boundaryForPathGen,
        setIsSelectingBoundaryForPathGen,
        setBoundaryForPathGen
    ] = useBoundaryStore(
        useShallow((state) => [
            state.boundaryConfig,
            state.boundaryForPathGen,
            state.setIsSelectingBoundaryForPathGen,
            state.setBoundaryForPathGen
        ])
    );

    const generateClickHandler = () => {
        setBoundaryForPathGen(undefined);
        setGeneratedClicked(true);
        setIsSelectingBoundaryForPathGen(true);
    };

    const generateCancelHandler = () => {
        setGeneratedClicked(false);
        setIsSelectingBoundaryForPathGen(false);
        setBoundaryForPathGen(undefined);
    };

    const [addPathtoPathMap, addStationToPathMap] = useMissionsStore(
        useShallow((state) => [
            state.addPathtoPathMap,
            state.addStationToPathMap
        ])
    );

    const generatePathHandler = (direction: "horizontal" | "vertical") => {
        if (!boundaryForPathGen) {
            toast.error("No boundary selected");
            return;
        }

        if (
            !boundaryConfig.safetyMargin ||
            !boundaryConfig.wheelSeperation ||
            !boundaryConfig.stepSize
        ) {
            toast.error("Boundary config not set");
            return;
        }

        setIsPathGenerating(true);
        generatePathMutation.mutate({
            points: boundaryForPathGen.utm,
            direction: direction,
            obstacles: obstacles.map((obstacle) => obstacle.utm),
            wheelSeperation: boundaryConfig.wheelSeperation,
            stepSize: boundaryConfig.stepSize,
            safetyMargin: boundaryConfig.safetyMargin
        });
    };

    const generatePathMutation = useMutation({
        mutationFn: ({
            points,
            direction,
            obstacles,
            wheelSeperation,
            stepSize,
            safetyMargin
        }: {
            points: Point2[];
            direction: "horizontal" | "vertical";
            obstacles: Point2[][];
            wheelSeperation: number;
            stepSize: number;
            safetyMargin: number;
        }) =>
            generatePathFn(
                points,
                direction,
                wheelSeperation,
                stepSize,
                safetyMargin,
                obstacles
            ),
        onSuccess: (data: Point2[]) => {
            console.log("Number of points generated ", data.length);
            const downSampledPoints = data.filter(
                (_, index) => index % 2 === 0
            );
            const utm = data;
            const gps = downSampledPoints.map((point) =>
                utmToLatLng(point.x, point.y)
            );
            const startStation: Station = {
                id: Date.now().toString(),
                lat: gps[0].lat,
                lng: gps[0].lng,
                x: utm[0].x,
                y: utm[0].y,
                theta: 0
            };
            const endStation: Station = {
                id: (Date.now() + 5000).toString(),
                lat: gps[gps.length - 1].lat,
                lng: gps[gps.length - 1].lng,
                x: utm[utm.length - 1].x,
                y: utm[utm.length - 1].y,
                theta: 0
            };
            addStationToPathMap(startStation);
            addStationToPathMap(endStation);
            addPathtoPathMap(utm, gps, startStation.id, endStation.id);
            setIsPathGenerating(false);
            generateCancelHandler();
        },
        onError: (error) => {
            errorLogger(error);
            setIsPathGenerating(false);
            generateCancelHandler();
        }
    });

    return (
        <div className="flex items-center justify-between">
            <span>Generate path</span>

            {generatedClicked ? (
                boundaryForPathGen ? (
                    !isPathGenerating ? (
                        <div className="flex items-center gap-2">
                            <button
                                className="rounded-md bg-primary700 p-2 text-white hover:scale-[98%]"
                                onClick={() =>
                                    generatePathHandler("horizontal")
                                }
                            >
                                <MdArrowForward size={24} />
                            </button>
                            <button
                                className="rounded-md bg-primary700 p-2 text-white hover:scale-[98%]"
                                onClick={() => generatePathHandler("vertical")}
                            >
                                <MdArrowUpward size={24} />
                            </button>
                            <button
                                className="rounded-md bg-red-500 p-2 text-white hover:scale-[98%]"
                                onClick={generateCancelHandler}
                            >
                                <MdClose size={24} />
                            </button>
                        </div>
                    ) : (
                        <div>Generating path....</div>
                    )
                ) : (
                    <div>Select a boundary</div>
                )
            ) : (
                <SmIconButton
                    name={"Start"}
                    className={"bg-primary700"}
                    onClick={generateClickHandler}
                >
                    <MdPlayArrow className="h-4 w-4 text-white" />
                </SmIconButton>
            )}
        </div>
    );
};

const DownloadBoundaryAndObstaclesButton = () => {
    const obstacles = useMissionsStore(
        useShallow((state) => state.pathMap?.obstacles || [])
    );

    const boundaryForPathGen = useBoundaryStore(
        (state) => state.boundaryForPathGen
    );

    const downloadBoundaryDataHandler = () => {
        if (!boundaryForPathGen) return;
        const friendlyBoundary = boundaryForPathGen.utm.map((p, i) => ({
            index: i,
            x: p.x,
            y: p.y
        }));
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(friendlyBoundary);

        worksheet["!cols"] = [];

        XLSX.utils.book_append_sheet(workbook, worksheet, "boundary");
        XLSX.writeFile(workbook, `Boundary.xlsx`, { compression: true });

        obstacles.forEach((obstacle, idx) => {
            const friendlyObstacle = obstacle.utm.map((p, i) => ({
                index: i,
                x: p.x,
                y: p.y
            }));
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(friendlyObstacle);

            worksheet["!cols"] = [];

            XLSX.utils.book_append_sheet(workbook, worksheet, "boundary");
            XLSX.writeFile(workbook, `obstacle_${idx + 1}.xlsx`, {
                compression: true
            });
        });
    };

    return (
        <div className="flex items-center justify-between">
            <span>Get data</span>
            <SmIconButton
                name={"Save"}
                className={"bg-primary700"}
                onClick={downloadBoundaryDataHandler}
            >
                <MdSave className="h-4 w-4 text-white" />
            </SmIconButton>
        </div>
    );
};
