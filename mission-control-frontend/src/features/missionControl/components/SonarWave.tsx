import { useEffect, useMemo, useRef, useState } from "react";
import {
    Color,
    ConeGeometry,
    Euler,
    Mesh,
    MeshStandardMaterial,
    Vector3
} from "three";
import { useRosFns } from "../../../lib/ros/useRosFns";
import { useFrame } from "@react-three/fiber";
import { useRobotStore } from "../../../stores/robotStore";
import { SonarMessage } from "../../../data/types";

type SonarWaveProps = {
    rotation: Euler;
    position: Vector3;
    scale?: Vector3;
    topicName: string;
};

const SonarWave = ({
    rotation,
    position,
    topicName,
    scale
}: SonarWaveProps) => {
    const meshRef = useRef<Mesh>(null!);
    const materialRef = useRef<MeshStandardMaterial>(null!);
    const { rosSubscribe } = useRosFns();
    const red = useMemo(() => new Color("red"), []);
    const orange = useMemo(() => new Color("orange"), []);
    const [coneGeometry, setConeGeometry] = useState<THREE.ConeGeometry>();

    const [tcpOnly, range, setSonarData, isRobotConnected] = useRobotStore(
        (state) => [
            state.tcpOnly,
            state.sonarData?.[topicName]?.range,
            state.setSonarData,
            state.isRobotConnected
        ]
    );
    useEffect(() => {
        const sonarListener = rosSubscribe(topicName, "sensor_msgs/msg/Range", {
            queue_size: 1,
            queue_length: 1,
            throttle_rate: 400
        });
        if (tcpOnly) {
            sonarListener?.subscribe((message: any) => {
                const sonarData = message as SonarMessage;
                setSonarData({ topicName: sonarData });
            });
        }
        return () => {
            sonarListener?.unsubscribe();
        };
    }, [tcpOnly]);

    useEffect(() => {
        if (range === 0 || !range) {
            materialRef.current.opacity = 0;
        } else if (range <= 0.5) {
            materialRef.current.color = red;
            materialRef.current.opacity = 0.5;
        } else if (range <= 2) {
            materialRef.current.color = orange;
            materialRef.current.opacity = 0.5;
        } else {
            materialRef.current.opacity = 0;
        }
        const coneGeometry = new ConeGeometry(0.5, range, 32);
        setConeGeometry(coneGeometry);
    }, [range, isRobotConnected]);
    useFrame(() => {
        if (range && range > 0) {
            if (position.x < 0) {
                meshRef.current.position.setX(-(range / 2));
            } else {
                meshRef.current.position.setX(range / 2);
            }
        }
    });

    return (
        <group position={position}>
            <mesh
                geometry={coneGeometry}
                ref={meshRef}
                rotation={rotation}
                position={[0, 0, 0]}
            >
                <meshStandardMaterial ref={materialRef} transparent={true} />
            </mesh>
        </group>
    );
};
export default SonarWave;
