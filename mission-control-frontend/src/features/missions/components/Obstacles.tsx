import { Obstacle as ObstacleType } from "@/data/types";
import { useBoundaryStore } from "@/stores/boundaryStore";
import { useMissionsStore } from "@/stores/missionsStore";
import { useR3fStore } from "@/stores/r3fStore";
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { CatmullRomCurve3, Object3D, Vector3 } from "three";
import { Line2 } from "three-stdlib";
import { useShallow } from "zustand/react/shallow";

const Obstacles = () => {
    return (
        <>
            <MappingObstacle />
            <ObstacleNearStart />
            <AllObstacles />
        </>
    );
};

export default Obstacles;

const MappingObstacle = () => {
    const overlay = useR3fStore((state) => state.overlay);
    const [points, setPoints] = useState<Vector3[]>([]);

    const [obstacleGPS, isObstacleNearStart] = useBoundaryStore((state) => [
        state.obstacleGPS,
        state.isObstacleNearStart
    ]);

    useEffect(() => {
        if (overlay) {
            const positions = obstacleGPS.map((latLng) =>
                overlay.latLngAltitudeToVector3(latLng)
            );
            setPoints(positions);
        }
    }, [overlay, obstacleGPS]);

    return points.length > 0 ? (
        <Line
            points={points}
            color={isObstacleNearStart ? "#4ade80" : "#5b21b6"}
            lineWidth={0.01}
            transparent
            opacity={1}
        />
    ) : null;
};

const ObstacleNearStart = () => {
    const latLng = useMissionsStore((state) => state.latLng);
    const overlay = useR3fStore((state) => state.overlay);

    const [obstacleGPS, isMappingObstacles, setIsObstacleNearStart] =
        useBoundaryStore((state) => [
            state.obstacleGPS,
            state.isMappingObstacles,
            state.setIsObstacleNearStart
        ]);

    useFrame(() => {
        if (!isMappingObstacles) return;
        if (overlay && latLng) {
            const botPosition = overlay.latLngAltitudeToVector3(latLng);
            if (obstacleGPS.length > 0) {
                const startPosition = overlay.latLngAltitudeToVector3(
                    obstacleGPS[0]
                );

                const distanceFromStart = botPosition.distanceTo(startPosition);

                if (distanceFromStart < 1.5 && obstacleGPS.length > 5) {
                    setIsObstacleNearStart(true);
                } else {
                    setIsObstacleNearStart(false);
                }
            }
        }
    });
    return null;
};

const AllObstacles = () => {
    const obstacles = useMissionsStore(
        (state) => state.pathMap?.obstacles || []
    );

    return obstacles.map((obstacle) => (
        <Obstacle key={obstacle.id} obstacle={obstacle} />
    ));
};

const Obstacle = ({ obstacle }: { obstacle: ObstacleType }) => {
    const materialRef = useRef<THREE.MeshStandardMaterial>(null!);
    const meshRef = useRef<Line2>(null!);

    const [obstacleToDelete, isDeletingObstacle, setObstacleToDelete] =
        useBoundaryStore(
            useShallow((state) => [
                state.obstacleToDelete,
                state.isDeletingObstacle,
                state.setObstacleToDelete
            ])
        );

    const [overlay, clickPosition] = useR3fStore(
        useShallow((state) => [state.overlay, state.clickPosition])
    );
    const [curve, setCurve] = useState<CatmullRomCurve3>();

    useEffect(() => {
        if (overlay) {
            const positions = obstacle.gps.map((latLng) =>
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
        if (overlay && isDeletingObstacle && !obstacleToDelete) {
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
                if (isDeletingObstacle) {
                    setObstacleToDelete(obstacle);
                }
            }
        }
    }, [clickPosition, isDeletingObstacle, obstacleToDelete]);

    return (
        <mesh ref={meshRef} position-z={-0.5}>
            <tubeGeometry args={[curve, 2048, 0.15, 8, closed]} />
            <meshStandardMaterial
                opacity={0.2}
                color={
                    obstacleToDelete?.id === obstacle.id ? "#ef4444" : "#000000"
                }
                ref={materialRef}
                transparent
                depthTest={true}
            />
        </mesh>
    );
};
