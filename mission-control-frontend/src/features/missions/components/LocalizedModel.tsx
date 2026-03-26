import { useEffect, useMemo, useRef, lazy, memo, useState } from "react";

import { useRosFns } from "../../../lib/ros/useRosFns";
import { useFrame } from "@react-three/fiber";
import { Euler } from "three";
import { useRobotStore } from "../../../stores/robotStore";
import { useR3fStore } from "../../../stores/r3fStore";
import { useMissionsStore } from "../../../stores/missionsStore";
import { distanceBetweenLatLng } from "../../../util/geoUtils";
import { CubeWithAxes } from "../../../components/r3f/shapes/CubeWithAxis";
import { useBoundaryStore } from "@/stores/boundaryStore";
import { Point2 } from "@/data/types";

const Weeder = lazy(() => import("../models/RobotModel"));

const LocalizedModel = () => {
    const [
        latLng,
        setLatLng,
        robotYaw,
        setRobotYaw,
        isPathMapping,
        latlngPath,
        setLatLngPath
    ] = useMissionsStore((state) => [
        state.latLng,
        state.setLatLng,
        state.robotYaw,
        state.setRobotYaw,
        state.isPathMapping,
        state.latLngPath,
        state.setLatLngPath
    ]);
    const [isRobotConnected, tcpOnly] = useRobotStore((state) => [
        state.isRobotConnected,
        state.tcpOnly
    ]);
    const [
        isMappingObstacles,
        isMappingBoundary,
        boundaryGps,
        obstacleGPS,
        addPointToBoundary,
        addPointToObstacles
    ] = useBoundaryStore((state) => [
        state.isMappingObstacles,
        state.isMappingBoundary,
        state.boundaryGps,
        state.obstacleGPS,
        state.addPointToBoundary,
        state.addPointToObstacles
    ]);

    const modelRef = useRef<THREE.Group>(null!);
    const { rosSubscribe } = useRosFns();
    const eulerConst = useMemo(() => new Euler(), []);

    const [utmPoint, setUtmPoint] = useState<Point2>();

    useEffect(() => {
        const gpsSubscriber = rosSubscribe(
            "/mmr/meta_pose",
            "mmr/msg/RobotMetaPose",
            {
                queue_length: 0,
                queue_size: 1
            }
        );
        if (tcpOnly) {
            gpsSubscriber?.subscribe((message) => {
                const robotPose = message as {
                    latitude: number;
                    longitude: number;
                    pose: {
                        point: {
                            x: number;
                            y: number;
                        };
                        yaw: number;
                    };
                };

                const latLng = {
                    lat: robotPose.latitude,
                    lng: robotPose.longitude
                };
                setRobotYaw(robotPose.pose.yaw);
                setLatLng(latLng);
                setUtmPoint(robotPose.pose.point);
            });
        }
        return () => {
            gpsSubscriber?.unsubscribe();
        };
    }, [isRobotConnected, tcpOnly]);

    useEffect(() => {
        if (robotYaw) {
            eulerConst.set(0, 0, robotYaw);
        }
    }, [robotYaw]);

    useFrame((state) => {
        const overlay = useR3fStore.getState().overlay;
        if (overlay) {
            if (latLng) {
                const boxPosition = overlay.latLngAltitudeToVector3(latLng);
                modelRef.current.position.copy(boxPosition);

                if (isMappingBoundary && utmPoint && latLng) {
                    if (
                        boundaryGps.length === 0 ||
                        distanceBetweenLatLng(
                            latLng,
                            boundaryGps[boundaryGps.length - 1]
                        ) > 0.8
                    ) {
                        addPointToBoundary(latLng, utmPoint);
                    }
                }

                if (isMappingObstacles && utmPoint && latLng) {
                    if (
                        obstacleGPS.length === 0 ||
                        distanceBetweenLatLng(
                            latLng,
                            obstacleGPS[obstacleGPS.length - 1]
                        ) > 0.8
                    ) {
                        addPointToObstacles(latLng, utmPoint);
                    }
                }

                if (isPathMapping && latLng) {
                    if (
                        latlngPath.length === 0 ||
                        distanceBetweenLatLng(
                            latLng,
                            latlngPath[latlngPath.length - 1]
                        ) > 0.8
                    ) {
                        setLatLngPath([...latlngPath, latLng]);
                    }
                }
            }
            modelRef.current.setRotationFromEuler(eulerConst);
            overlay.requestRedraw();
        }
    });
    return (
        <group renderOrder={5} ref={modelRef}>
            <CubeWithAxes position-y={1} />
            <Weeder
                rotation-x={Math.PI * 0.5}
                position-z={2.5}
                rotation-y={Math.PI}
                scale={[0.05, 0.05, 0.05]}
            />
        </group>
    );
};
export default memo(LocalizedModel);
