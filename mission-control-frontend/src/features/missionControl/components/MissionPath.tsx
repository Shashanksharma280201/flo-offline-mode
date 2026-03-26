import { useEffect, useState } from "react";
import { useRobotConfigStore } from "../../../stores/robotConfigStore";
import { Line } from "@react-three/drei";

const MissionPath = () => {
    const [positions, setPositions] = useState<THREE.Vector3[]>();

    const [actionWayPoints] = useRobotConfigStore((state) => [
        state.actionWayPoints
    ]);
    useEffect(() => {
        if (actionWayPoints) {
            const positions = actionWayPoints
                .map(({ wayPoint }) => wayPoint?.position)
                .filter(
                    (position) => position !== undefined
                ) as THREE.Vector3[];

            setPositions(positions);
        }
    }, [actionWayPoints, actionWayPoints?.length]);

    return (
        <>
            {positions && positions.length > 1 && (
                <Line
                    forceSinglePass={false}
                    points={positions}
                    lineWidth={2}
                    color={"#f59e0b"}
                />
            )}
        </>
    );
};

export default MissionPath;
