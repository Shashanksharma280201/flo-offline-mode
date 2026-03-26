import { Color, useFrame } from "@react-three/fiber";
import { Station } from "../../../data/types";
import { useEffect, useRef, useState } from "react";
import { useR3fStore } from "../../../stores/r3fStore";
import { useMissionsStore } from "../../../stores/missionsStore";
import { Object3D, Vector2 } from "three";
import { toast } from "react-toastify";
import { useShallow } from "zustand/react/shallow";
import { useRosFns } from "@/lib/ros/useRosFns";

const StationPoint = ({ station }: { station: Station }) => {
    let meshRef = useRef<THREE.Mesh>(null!);
    let materialRef = useRef<THREE.MeshStandardMaterial>(null!);
    const [stationColor, setStationColor] = useState<Color>("#5b21b6");
    const [overlay, clickPosition, setClickPosition] = useR3fStore(
        useShallow((state) => [
            state.overlay,
            state.clickPosition,
            state.setClickPosition
        ])
    );

    const [
        pathMap,
        latLng,
        mapXY,
        mapType,
        nearbyStation,
        setNearByStation,
        selectedStation,
        setSelectedStation,
        isMissionPlanning,
        isSelectingStationForReset,
        setIsSelectingStationForReset
    ] = useMissionsStore(
        useShallow((state) => [
            state.pathMap,
            state.latLng,
            state.mapXY,
            state.mapType,
            state.nearbyStation,
            state.setNearByStation,
            state.selectedStation,
            state.setSelectedStation,
            state.isMissionPlanning,
            state.isSelectingStationForReset,
            state.setIsSelectingStationForReset
        ])
    );
    const { rosServiceCaller } = useRosFns();

    const resetBotPositionHandler = () => {
        if (!pathMap) {
            toast.error("No pathmap selected");
            return;
        }
        if (!pathMap.frame) {
            toast.error("PathMap has no frame associated with it");
            return;
        }
        setIsSelectingStationForReset(false);
        setClickPosition(new Vector2(-Number.MIN_VALUE, -Number.MIN_VALUE));
        rosServiceCaller(
            "/mmr/experimental/reset_position",
            "mmr/srv/ResetPosition",
            (result: { message: string; success: boolean }) => {
                if (result.success) {
                    toast.success(result.success);
                }
            },
            (error) => {
                console.log(error);
                toast.error(error.message);
            },
            {
                frame_id: pathMap.frame,
                lat: station.lat,
                lng: station.lng,
                yaw: station.theta
            }
        );
    };
    useEffect(() => {
        if (overlay && (isSelectingStationForReset || isMissionPlanning)) {
            //raycasting
            const intersections = overlay.raycast(
                clickPosition,
                meshRef.current as unknown as Object3D[],
                {
                    recursive: false
                }
            );

            if (intersections.length > 0) {
                intersections.map((intersectingObject) => {
                    if (
                        intersectingObject.object.uuid === meshRef.current.uuid
                    ) {
                        if (isSelectingStationForReset) {
                            resetBotPositionHandler();
                        }
                        if (isMissionPlanning) {
                            if (selectedStation) {
                                toast.error(
                                    "Start station already set, Clear the mission if you want to select another start station"
                                );
                            } else {
                                console.log("Selecting Station");
                                setSelectedStation(station);
                            }
                        }
                    }
                });
            }
        }
    }, [
        isMissionPlanning,
        overlay,
        clickPosition,
        isSelectingStationForReset,
        station
    ]);

    useEffect(() => {
        if (nearbyStation && nearbyStation.id === station.id) {
            setStationColor("#4ade80");
        } else if (selectedStation && selectedStation.id === station.id) {
            setStationColor("#ef4444");
        } else {
            setStationColor("#5b21b6");
        }
    }, [selectedStation, nearbyStation]);

    const autoSelectRef = useRef(false);
    useEffect(() => {
        if (!isMissionPlanning) {
            autoSelectRef.current = false;
            return;
        }
        if (isMissionPlanning && !autoSelectRef.current) {
            autoSelectRef.current = false;
        }
        if (
            isMissionPlanning &&
            nearbyStation &&
            (!selectedStation || selectedStation.id !== nearbyStation.id) &&
            !autoSelectRef.current
        ) {
            setSelectedStation(nearbyStation);
            autoSelectRef.current = true;
        }
    }, [isMissionPlanning, nearbyStation]);

    useFrame(() => {
        // Google Maps mode (GPS and Odom)
        if (mapType === "google" && overlay) {
            const stationPosition = overlay.latLngAltitudeToVector3({
                lat: station.lat,
                lng: station.lng
            });
            meshRef.current.position.copy(stationPosition);

            if (latLng) {
                const botPosition = overlay.latLngAltitudeToVector3(latLng);
                if (botPosition.distanceTo(stationPosition) < 1) {
                    materialRef.current.opacity = 0.5;

                    // No nearby station or at a different station
                    if (!(nearbyStation && nearbyStation.id === station.id)) {
                        console.log("Entered station", station.id);
                        setNearByStation(station);
                    }
                } else {
                    materialRef.current.opacity = 1;

                    if (nearbyStation && nearbyStation.id === station.id) {
                        console.log("Left station", station.id);
                        setNearByStation(undefined);
                    }
                }
            }

            overlay.requestRedraw();
        }
        // LIDAR mode - proximity detection using x/y coordinates
        else if (mapType === "lidar" && mapXY) {
            // Calculate Euclidean distance between robot and station
            const dx = mapXY.x - station.x;
            const dy = mapXY.y - station.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 1.0) {
                materialRef.current.opacity = 0.5;

                // Enter station proximity
                if (!(nearbyStation && nearbyStation.id === station.id)) {
                    console.log("Entered station", station.id, "distance:", distance.toFixed(2), "m");
                    setNearByStation(station);
                }
            } else {
                materialRef.current.opacity = 1;

                // Leave station proximity
                if (nearbyStation && nearbyStation.id === station.id) {
                    console.log("Left station", station.id, "distance:", distance.toFixed(2), "m");
                    setNearByStation(undefined);
                }
            }
        }
    });

    return (
        <mesh renderOrder={1} ref={meshRef} rotation={[Math.PI * 0.5, 0, 0]}>
            <cylinderGeometry args={[1, 1, 0.8]} />
            <meshStandardMaterial
                color={stationColor}
                transparent
                ref={materialRef}
            />
        </mesh>
    );
};
export default StationPoint;
