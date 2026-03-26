import { Mesh } from "three";
import { useRobotConfigStore } from "../../../stores/robotConfigStore";
import { useEffect, useRef } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { ActionWayPoint } from "../../../data/types";
import MissionPoint from "./MissionPoint";

const MissionPlanning = () => {
    const [
        isMissionPlanning,
        actionWayPoints,
        addActionWayPoint,
        selectedActionWayPoint
    ] = useRobotConfigStore((state) => [
        state.isMissionPlanning,
        state.actionWayPoints,
        state.addActionWayPoint,
        state.selectedActionWayPoint
    ]);

    const planeMeshRef = useRef<Mesh>(null!);
    const addMissionActionWayPointHandler = (event: ThreeEvent<MouseEvent>) => {
        if (!isMissionPlanning) {
            return;
        }
        const wayPoint = {
            position: event.point
        };
        const actionWayPoint = {
            wayPoint,
            action: selectedActionWayPoint?.actionWayPoint.action
        };
        addActionWayPoint(actionWayPoint);
    };

    return (
        <>
            <mesh
                onPointerMove={(event) => {
                    // console.log(event);
                }}
                ref={planeMeshRef}
                onClick={addMissionActionWayPointHandler}
                rotation-x={-Math.PI * 0.5}
            >
                <planeGeometry args={[1000, 1000]} />
                <meshStandardMaterial visible={false} />
            </mesh>

            {actionWayPoints &&
                actionWayPoints?.map((actionWayPoint, index) => (
                    <MissionPoint
                        key={index}
                        actionWayPoint={actionWayPoint}
                        index={index}
                    />
                ))}
        </>
    );
};
export default MissionPlanning;
