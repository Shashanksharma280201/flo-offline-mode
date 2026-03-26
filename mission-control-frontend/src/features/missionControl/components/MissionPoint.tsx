import { ThreeEvent } from "@react-three/fiber";
import { useRobotConfigStore } from "../../../stores/robotConfigStore";
import { ActionWayPoint } from "../../../data/types";
import { useEffect, useRef, useState } from "react";

type MissionPointProps = {
    actionWayPoint: ActionWayPoint;
    index: number;
};

const MissionPoint = ({ actionWayPoint, index }: MissionPointProps) => {
    let meshRef = useRef<THREE.Mesh>(null!);
    const [color, setColor] = useState("#ffffff");
    const [
        isMissionPlanning,
        actionWayPoints,
        setActionWayPoints,
        selectedActionWayPoint,
        setSelectedActionWayPoint
    ] = useRobotConfigStore((state) => [
        state.isMissionPlanning,
        state.actionWayPoints,
        state.setActionWayPoints,
        state.selectedActionWayPoint,
        state.setSelectedActionWayPoint
    ]);
    const removeMissionActionWayPointHandler = (
        event: ThreeEvent<MouseEvent>,
        index: number
    ) => {
        console.log(index, event);
        actionWayPoints?.splice(index, 1);
        setActionWayPoints(actionWayPoints);
    };
    const selectMissionActionWayPointHandler = (
        event: ThreeEvent<MouseEvent>,
        actionWayPoint: ActionWayPoint,
        index: number
    ) => {
        setSelectedActionWayPoint(actionWayPoint, index);
    };

    useEffect(() => {
        if (actionWayPoint === selectedActionWayPoint?.actionWayPoint) {
            setColor("#00ff00");
        } else {
            setColor("#ffffff");
        }
    }, [selectedActionWayPoint]);
    return (
        <mesh
            onClick={(event) => {
                selectMissionActionWayPointHandler(
                    event,
                    actionWayPoint,
                    index
                );
            }}
            onContextMenu={(event) => {
                removeMissionActionWayPointHandler(event, index);
            }}
            key={index}
            ref={meshRef}
            position={actionWayPoint.wayPoint?.position}
            quaternion={actionWayPoint.wayPoint?.rotation}
        >
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial color={color} />
        </mesh>
    );
};
export default MissionPoint;
