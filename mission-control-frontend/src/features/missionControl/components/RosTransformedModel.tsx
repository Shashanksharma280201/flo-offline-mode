import { useEffect, useMemo, useRef, lazy } from "react";

import { useRosFns } from "../../../lib/ros/useRosFns";
import { useFrame } from "@react-three/fiber";
import { Euler, Quaternion, Vector3 } from "three";
import SonarWave from "./SonarWave";
import { useRobotConfigStore } from "../../../stores/robotConfigStore";
import BoundaryPath from "./BoundaryPath";
import { useR3fStore } from "../../../stores/r3fStore";
import { useRobotStore } from "../../../stores/robotStore";

const Weeder = lazy(() => import("../models/Weeder"));

const RosTransformedModel = () => {
    const [isRobotConnected, tcpOnly] = useRobotStore((state) => [
        state.isRobotConnected,
        state.tcpOnly
    ]);
    const [position, setPosition, quaternion, setQuaternion] = useR3fStore(
        (state) => [
            state.modelPosition,
            state.setModelPosition,
            state.modelQuarternion,
            state.setModelQuarternion
        ]
    );
    const [isBoundaryMapping, selectedBoundaryMap, addWayPointToBoundary] =
        useRobotConfigStore((state) => [
            state.boundary.isBoundaryMapping,
            state.selectedBoundaryMap,
            state.addWayPointToBoundary
        ]);

    const modelRef = useRef<THREE.Group>(null!);
    const { rosTfClient, rosSubscribe } = useRosFns();

    useEffect(() => {
        const odomSubscriber = rosSubscribe("/odom", "nav_msgs/msg/Odometry", {
            queue_length: 0,
            queue_size: 1,
            throttle_rate: 100
        });
        const pos = new Vector3();
        const quart = new Quaternion();
        if (tcpOnly) {
            odomSubscriber?.subscribe((message: any) => {
                const pose: {
                    position: {
                        x: number;
                        y: number;
                        z: number;
                    };
                    orientation: {
                        x: number;
                        y: number;
                        z: number;
                        w: number;
                    };
                } = message?.pose?.pose;

                pos.setX(pose.position.x);
                pos.setY(-pose.position.z);
                pos.setZ(-pose.position.y);
                setPosition(pos);
                quart.set(
                    pose.orientation.x,
                    -pose.orientation.z,
                    -pose.orientation.y,
                    -pose.orientation.w
                );
                setQuaternion(quart);
            });
        }
        return () => {
            odomSubscriber?.unsubscribe();
        };
    }, [isRobotConnected, tcpOnly]);

    useFrame((state) => {
        if (position) {
            modelRef.current.position.copy(position);
        }
        if (quaternion) {
            modelRef.current.quaternion.copy(quaternion);
        }
        // modelRef.current.position.x =
        //     Math.sin(state.clock.getElapsedTime() * 0.1) * 3;
        // modelRef.current.position.z =
        //     Math.cos(state.clock.getElapsedTime() * 0.1) * 3;
        // modelRef.current.rotation.y = state.clock.getElapsedTime() * 0.1 + 0.53;
        const model = modelRef.current;
        if (isBoundaryMapping) {
            if (
                selectedBoundaryMap.length === 0 ||
                modelRef.current.position.distanceTo(
                    selectedBoundaryMap[selectedBoundaryMap.length - 1]
                        ?.position
                ) > 0.8
            ) {
                addWayPointToBoundary({
                    position: new Vector3(model.position.x, 0, model.position.z)
                });
            }
        }
    });
    return (
        <group>
            <group ref={modelRef}>
                <Weeder
                    rotation-y={Math.PI}
                    position-y={0.54}
                    scale={[0.01, 0.01, 0.01]}
                />
                <SonarWave
                    rotation={useMemo(
                        () => new Euler(0, Math.PI, -Math.PI / 2),
                        []
                    )}
                    position={useMemo(() => new Vector3(0, 0.24, 0), [])}
                    topicName="/sonar/front/center"
                />
                <SonarWave
                    rotation={useMemo(
                        () => new Euler(0, Math.PI, -Math.PI / 2),
                        []
                    )}
                    position={useMemo(() => new Vector3(0, 0.24, 0.2), [])}
                    topicName="/sonar/front/left"
                />
                <SonarWave
                    rotation={useMemo(
                        () => new Euler(0, Math.PI, -Math.PI / 2),
                        []
                    )}
                    position={useMemo(() => new Vector3(0, 0.24, -0.2), [])}
                    topicName="/sonar/front/right"
                />
                <SonarWave
                    rotation={useMemo(
                        () => new Euler(0, Math.PI, Math.PI / 2),
                        []
                    )}
                    position={useMemo(() => new Vector3(-0.5, 0.24, 0), [])}
                    topicName="/sonar/back/center"
                />
                <SonarWave
                    rotation={useMemo(
                        () => new Euler(0, Math.PI, Math.PI / 2),
                        []
                    )}
                    position={useMemo(() => new Vector3(-0.5, 0.24, 0.2), [])}
                    topicName="/sonar/back/left"
                />
                <SonarWave
                    rotation={useMemo(
                        () => new Euler(0, Math.PI, Math.PI / 2),
                        []
                    )}
                    position={useMemo(() => new Vector3(-0.5, 0.24, -0.2), [])}
                    topicName="/sonar/back/right"
                />
            </group>
            <BoundaryPath closed={true} />
        </group>
    );
};
export default RosTransformedModel;
