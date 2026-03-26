import { useEffect, useMemo, useRef, lazy, memo } from "react";
import { useFrame } from "@react-three/fiber";
import { Euler } from "three";
import { useMissionsStore } from "../../../stores/missionsStore";
import { useLidarOverlayStore } from "../../../stores/lidarOverlayStore";
import { useRobotStore } from "../../../stores/robotStore";
import { useBoundaryStore } from "../../../stores/boundaryStore";
import { useRosFns } from "../../../lib/ros/useRosFns";
import { CubeWithAxes } from "../../../components/r3f/shapes/CubeWithAxis";
import { latLngToPixel, MapConfig } from "../../../util/mapGeoref";
import { distanceBetweenLatLng, distanceBetweenUTM } from "../../../util/geoUtils";
import Paths from "./Paths";
import Stations from "./Stations";
import Boundaries from "./Boundaries";
import Obstacles from "./Obstacles";

const Weeder = lazy(() => import("../models/RobotModel"));

// Map configuration matching LidarMap2D
const mapConfig: MapConfig = {
    resolution: 0.05, // 0.05 meters per pixel
    origin: { x: -8.407282, y: -81.081612 }, // meters
    imageWidth: 3363,
    imageHeight: 3211
};

const LocalizedModelLidar = () => {
    const [
        mapXY,
        setMapXY,
        latLng,
        setLatLng,
        robotYaw,
        setRobotYaw,
        mapType,
        isPathMapping,
        latLngPath,
        setLatLngPath
    ] = useMissionsStore((state) => [
        state.mapXY,
        state.setMapXY,
        state.latLng,
        state.setLatLng,
        state.robotYaw,
        state.setRobotYaw,
        state.mapType,
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
        boundaryUtm,
        obstacleGPS,
        obstacleUtm,
        addPointToBoundary,
        addPointToObstacles
    ] = useBoundaryStore((state) => [
        state.isMappingObstacles,
        state.isMappingBoundary,
        state.boundaryGps,
        state.boundaryUtm,
        state.obstacleGPS,
        state.obstacleUtm,
        state.addPointToBoundary,
        state.addPointToObstacles
    ]);
    const canvasSize = useLidarOverlayStore((state) => state.canvasSize);

    // Default test position at LIDAR map origin
    const testMapPosition = { x: 0, y: 0 };
    const displayMapPosition = mapXY || testMapPosition;

    const modelRef = useRef<THREE.Group>(null!);
    const { rosSubscribe } = useRosFns();
    const eulerConst = useMemo(() => new Euler(), []);

    // Subscribe to robot position (GPS + LIDAR map coordinates)
    useEffect(() => {
        const gpsSubscriber = rosSubscribe("/mmr/meta_pose", "mmr/msg/RobotMetaPose", {
            queue_length: 0,
            queue_size: 1
        });

        if (tcpOnly) {
            gpsSubscriber?.subscribe((message) => {
                const robotPose = message as {
                    latitude: number;
                    longitude: number;
                    pose: {
                        point: {
                            x: number;  // LIDAR map_x (meters)
                            y: number;  // LIDAR map_y (meters)
                        };
                        yaw: number;
                    };
                };

                // Store GPS coordinates (for Google Maps)
                const latLng = {
                    lat: robotPose.latitude,
                    lng: robotPose.longitude
                };
                setLatLng(latLng);

                // Store LIDAR map coordinates (for LIDAR map)
                const mapXY = {
                    x: robotPose.pose.point.x,
                    y: robotPose.pose.point.y
                };
                setMapXY(mapXY);

                // Store yaw
                setRobotYaw(robotPose.pose.yaw);
            });
        }
        return () => {
            gpsSubscriber?.unsubscribe();
        };
    }, [isRobotConnected, tcpOnly, rosSubscribe, setLatLng, setMapXY, setRobotYaw]);

    useEffect(() => {
        if (robotYaw) {
            eulerConst.set(0, 0, robotYaw);
        }
    }, [robotYaw, eulerConst]);

    useFrame(() => {
        if (displayMapPosition && modelRef.current && canvasSize.width > 0) {
            // Convert LIDAR map coordinates (meters) to pixel coordinates
            // pixel = (mapCoords - origin) / resolution
            const pixelX = (displayMapPosition.x - mapConfig.origin.x) / mapConfig.resolution;
            const pixelY = (displayMapPosition.y - mapConfig.origin.y) / mapConfig.resolution;

            // Convert pixel coordinates to Three.js world space
            // The LIDAR canvas draws the image at (0,0) in its local coordinate system
            // In Three.js, we position objects in pixel space relative to image origin
            const worldX = pixelX;
            const worldY = -pixelY; // Invert Y axis (canvas Y goes down, Three.js Y goes up)

            modelRef.current.position.set(worldX, worldY, 0);
            modelRef.current.setRotationFromEuler(eulerConst);

            // LIDAR mode operational logic (only when LIDAR map is active)
            if (mapType === "lidar" && mapXY && latLng) {
                // Boundary mapping
                if (isMappingBoundary) {
                    if (
                        boundaryUtm.length === 0 ||
                        distanceBetweenUTM(
                            mapXY,
                            boundaryUtm[boundaryUtm.length - 1]
                        ) > 0.8
                    ) {
                        addPointToBoundary(latLng, mapXY);
                    }
                }

                // Obstacle mapping
                if (isMappingObstacles) {
                    if (
                        obstacleUtm.length === 0 ||
                        distanceBetweenUTM(
                            mapXY,
                            obstacleUtm[obstacleUtm.length - 1]
                        ) > 0.8
                    ) {
                        addPointToObstacles(latLng, mapXY);
                    }
                }

                // Path tracking
                if (isPathMapping) {
                    if (
                        latLngPath.length === 0 ||
                        distanceBetweenLatLng(
                            latLng,
                            latLngPath[latLngPath.length - 1]
                        ) > 0.8
                    ) {
                        setLatLngPath([...latLngPath, latLng]);
                    }
                }
            }

            // Debug logging (only log occasionally to avoid spam)
            if (Math.random() < 0.01) {
                console.log('Robot position:', {
                    mapCoords: displayMapPosition,
                    isTest: !mapXY,
                    pixelPos: { x: pixelX, y: pixelY },
                    worldPos: { x: worldX, y: worldY },
                    canvasSize
                });
            }
        }
    });

    return (
        <group renderOrder={5} ref={modelRef}>
            <CubeWithAxes position-y={1} />
            <Weeder
                rotation-x={Math.PI * 0.5}
                position-z={2.5}
                rotation-y={Math.PI}
                scale={[0.75, 0.75, 0.75]}
            />
        </group>
    );
};

const LidarMapViz = () => {
    return (
        <>
            {/* Test cube at origin to verify Three.js is rendering */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[50, 50, 50]} />
                <meshStandardMaterial color="lime" />
            </mesh>

            <LocalizedModelLidar />
            <ambientLight color={0x606060} intensity={2} />
            <directionalLight position={[0, 1.75, 1]} intensity={1} />
            <Paths />
            <Stations />
            <Boundaries />
            <Obstacles />
        </>
    );
};

export default memo(LidarMapViz);
