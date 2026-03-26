import { useFrame } from "@react-three/fiber";
import { Path } from "../../../data/types";
import { useEffect, useRef, useState } from "react";
import { useMissionsStore } from "../../../stores/missionsStore";
import { CatmullRomCurve3, Object3D } from "three";
import { useR3fStore } from "../../../stores/r3fStore";

import { Line2 } from "three-stdlib";
import { useShallow } from "zustand/react/shallow";

type PathBetweenStationsProps = {
    path: Path;
};

const PathBetweenStations = ({ path }: PathBetweenStationsProps) => {
    let meshRef = useRef<Line2>(null!);
    let materialRef = useRef<THREE.MeshStandardMaterial>(null!);
    const [curve, setCurve] = useState<CatmullRomCurve3>();
    const [overlay, clickPosition, mousePosition] = useR3fStore((state) => [
        state.overlay,
        state.clickPosition,
        state.mousePosition
    ]);
    const [
        setSelectedStation,
        isMissionPlanning,
        isDeletingPath,
        pathToDelete,
        setPathToDelete,
        addPathToMission,
        stations,
        missions
    ] = useMissionsStore(
        useShallow((state) => [
            state.setSelectedStation,
            state.isMissionPlanning,
            state.isDeletingPath,
            state.pathToDelete,
            state.setPathToDelete,
            state.addPathToMission,
            state.pathMap?.stations,
            state.pathMap?.missions
        ])
    );
    useEffect(() => {
        if (overlay) {
            const positions = path.gps.map((latLng) => {
                return overlay.latLngAltitudeToVector3(latLng);
            });
            const curve = new CatmullRomCurve3(
                positions,
                false,
                "centripetal",
                0.5
            );
            setCurve(curve);
        }
        return () => {
            setCurve(undefined);
        };
    }, [path]);

    useEffect(() => {
        if (
            overlay &&
            (isMissionPlanning || isDeletingPath) &&
            meshRef.current
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
                if (isDeletingPath) {
                    setPathToDelete(path);
                } else {
                    addPathToMission(path);

                    if (stations) {
                        const station = stations.find(
                            (value) => value.id === path.destStationId
                        );
                        setSelectedStation(station);
                        console.log("Selecting Path", station?.id);
                    }
                }
            }
        }
    }, [clickPosition, isMissionPlanning, isDeletingPath, pathToDelete]);

    useEffect(() => {
        if (
            overlay &&
            (isMissionPlanning || isDeletingPath) &&
            meshRef.current
        ) {
            const intersections = overlay.raycast(
                mousePosition,
                meshRef.current as unknown as Object3D[],
                {
                    recursive: false
                }
            );

            if (
                intersections.length > 0 &&
                intersections[0].object.uuid === meshRef.current.uuid
            ) {
                meshRef.current.material.opacity = 1;
            } else {
                meshRef.current.material.opacity = 0.2;
            }
        }
    }, [mousePosition, isMissionPlanning, isDeletingPath, pathToDelete]);

    useFrame(() => {
        if (overlay && meshRef.current && missions) {
            overlay.requestRedraw();
        }
    });

    return (
        <>
            {path && path.gps.length > 1 && curve && (
                <mesh ref={meshRef} position-z={-0.5}>
                    <tubeGeometry args={[curve, 2048, 0.15, 8, closed]} />
                    <meshStandardMaterial
                        opacity={0.2}
                        color={
                            pathToDelete?.id === path.id ? "#ef4444" : "#5b21b6"
                        }
                        ref={materialRef}
                        transparent
                        depthTest={true}
                    />
                </mesh>
            )}
        </>
    );
};
export default PathBetweenStations;
