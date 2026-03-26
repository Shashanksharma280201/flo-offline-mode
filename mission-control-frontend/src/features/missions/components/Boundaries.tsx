import { Boundary as BoundaryType } from "@/data/types";
import { useBoundaryStore } from "@/stores/boundaryStore";
import { useMissionsStore } from "@/stores/missionsStore";
import { useR3fStore } from "@/stores/r3fStore";
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { CatmullRomCurve3, Mesh, Object3D, Vector3 } from "three";
import { useShallow } from "zustand/react/shallow";

const Boundaries = () => {
    return (
        <>
            <MappingBoundary />
            <BoundaryNearStart />
            <AllBoundaries />
        </>
    );
};

export default Boundaries;

const MappingBoundary = () => {
    const [points, setPoints] = useState<Vector3[]>([]);
    const overlay = useR3fStore((state) => state.overlay);

    const [boundaryGPS, isNearStart] = useBoundaryStore(
        useShallow((state) => [state.boundaryGps, state.isBoundaryNearStart])
    );

    useEffect(() => {
        if (overlay) {
            const positions = boundaryGPS.map((latLng) =>
                overlay.latLngAltitudeToVector3(latLng)
            );
            setPoints(positions);
        }
    }, [overlay, boundaryGPS]);

    return points.length > 0 ? (
        <Line
            points={points}
            color={isNearStart ? "#4ade80" : "#5b21b6"}
            lineWidth={0.01}
            transparent
            opacity={1}
        />
    ) : null;
};

const BoundaryNearStart = () => {
    const latLng = useMissionsStore((state) => state.latLng);
    const overlay = useR3fStore((state) => state.overlay);

    const [isMappingBoundary, gpsBoundary, setIsNearStart] = useBoundaryStore(
        useShallow((state) => [
            state.isMappingBoundary,
            state.boundaryGps,
            state.setIsNearStart
        ])
    );

    useFrame(() => {
        if (!isMappingBoundary) return;
        if (overlay && latLng) {
            const botPosition = overlay.latLngAltitudeToVector3(latLng);
            if (gpsBoundary.length > 0) {
                const startPosition = overlay.latLngAltitudeToVector3(
                    gpsBoundary[0]
                );

                const distanceFromStart = botPosition.distanceTo(startPosition);

                if (distanceFromStart < 2 && gpsBoundary.length > 5) {
                    setIsNearStart(true);
                } else {
                    setIsNearStart(false);
                }
            }
        }
    });

    return null;
};

const AllBoundaries = () => {
    const boundaries = useMissionsStore(
        (state) => state.pathMap?.boundaries || []
    );

    return boundaries.map((boundary) => (
        <Boundary key={boundary.id} boundary={boundary} />
    ));
};

const Boundary = ({ boundary }: { boundary: BoundaryType }) => {
    const materialRef = useRef<THREE.MeshStandardMaterial>(null!);
    const meshRef = useRef<Mesh>(null!);
    const [
        isMappingBoundary,
        boundaryForObstacleMapping,
        boundaryForDeletion,
        boundaryForPathGen,
        isSelectingBoundaryForPathGen,
        isSelectingBoundaryForObstacleMapping,
        isSelectingBoundaryForBoundaryDeletion,
        setBoundaryForDeletion,
        setBoundaryForObstacleMapping,
        setBoundaryForPathGen
    ] = useBoundaryStore(
        useShallow((state) => [
            state.isMappingBoundary,
            state.boundaryForObstacleMapping,
            state.boundaryForDeletion,
            state.boundaryForPathGen,
            state.isSelectingBoundaryForPathGen,
            state.isSelectingBoundaryForObstacleMapping,
            state.isSelectingBoundaryForBoundaryDeletion,
            state.setBoundaryForDeletion,
            state.setBoundaryForObstacleMapping,
            state.setBoundaryForPathGen
        ])
    );
    const [overlay, clickPosition] = useR3fStore(
        useShallow((state) => [state.overlay, state.clickPosition])
    );
    const [curve, setCurve] = useState<CatmullRomCurve3>();

    useEffect(() => {
        if (overlay) {
            const positions = boundary.gps.map((latLng) =>
                overlay.latLngAltitudeToVector3(latLng)
            );
            const curve = new CatmullRomCurve3(
                positions,
                false,
                "centripetal",
                0.5
            );
            setCurve(curve);
        }
    }, [overlay]);

    useEffect(() => {
        if (
            overlay &&
            !isMappingBoundary &&
            (isSelectingBoundaryForBoundaryDeletion ||
                isSelectingBoundaryForObstacleMapping ||
                isSelectingBoundaryForPathGen)
        ) {
            const intersections = overlay.raycast(
                clickPosition,
                meshRef.current as unknown as Object3D[],
                {
                    recursive: false
                }
            );

            if (
                intersections.length > 0 &&
                intersections[0].object.uuid === meshRef.current.uuid
            ) {
                if (isSelectingBoundaryForBoundaryDeletion) {
                    setBoundaryForDeletion(boundary);
                    console.log(
                        isSelectingBoundaryForBoundaryDeletion,
                        boundaryForDeletion
                    );
                } else if (isSelectingBoundaryForObstacleMapping) {
                    setBoundaryForObstacleMapping(boundary);
                } else {
                    setBoundaryForPathGen(boundary);
                }
            }
        }
    }, [
        overlay,
        clickPosition,
        isMappingBoundary,
        isSelectingBoundaryForObstacleMapping,
        isSelectingBoundaryForBoundaryDeletion,
        isSelectingBoundaryForPathGen
    ]);

    return (
        <mesh ref={meshRef} position-z={-0.5}>
            <tubeGeometry args={[curve, 2048, 0.15, 8, closed]} />
            <meshStandardMaterial
                opacity={0.2}
                color={
                    boundaryForDeletion?.id === boundary.id
                        ? "#ef4444"
                        : boundaryForObstacleMapping?.id === boundary.id ||
                            boundaryForPathGen?.id === boundary.id
                          ? "#4ade80"
                          : "#000000"
                }
                ref={materialRef}
                transparent
                depthTest={true}
            />
        </mesh>
    );
};
