import { CatmullRomLine, Line, PivotControls } from "@react-three/drei";
import {
    CatmullRomCurve3,
    ColorRepresentation,
    Mesh,
    Plane,
    Vector3
} from "three";
import { useR3fStore } from "../../../stores/r3fStore";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRobotConfigStore } from "../../../stores/robotConfigStore";
import { useDrag } from "@use-gesture/react";
import { ThreeEvent } from "@react-three/fiber";
import BoundaryPoint from "./BoundaryPoint";

const BoundaryPath = ({
    color,
    closed
}: {
    color?: ColorRepresentation;
    closed?: boolean;
}) => {
    const [positions, setPositions] = useState<THREE.Vector3[]>();
    const [curve, setCurve] = useState<CatmullRomCurve3>();
    const [isDragging, setIsDragging] = useState<boolean>(false);

    const [setIsOrbitControlsEnabled] = useR3fStore((state) => [
        state.setIsOrbitControlsEnabled
    ]);
    const [selectedBoundaryMap, isBoundaryEditing, setSelectedBoundaryMap] =
        useRobotConfigStore((state) => [
            state.selectedBoundaryMap,
            state.boundary.isBoundaryEditing,
            state.setSelectedBoundaryMap
        ]);
    useEffect(() => {
        setIsOrbitControlsEnabled(!isBoundaryEditing);
    }, [isBoundaryEditing]);

    useEffect(() => {
        if (selectedBoundaryMap) {
            const positions = selectedBoundaryMap
                .map(({ position }) => position)
                .filter(
                    (position) => position !== undefined
                ) as THREE.Vector3[];

            setPositions(positions);
            if (positions.length > 1) {
                const curve = new CatmullRomCurve3(
                    positions,
                    closed,
                    "centripetal",
                    0
                );
                setCurve(curve);
            }
        }
    }, [selectedBoundaryMap, selectedBoundaryMap.length, isDragging]);

    return (
        <group>
            {positions &&
                isBoundaryEditing &&
                positions.map((point, index) => {
                    return (
                        <BoundaryPoint
                            key={index}
                            position={point}
                            index={index}
                        />
                    );
                })}
            {positions && positions.length > 1 && (
                <mesh>
                    <tubeGeometry args={[curve, 128, 0.04, 8, closed]} />
                    <meshPhongMaterial
                        wireframe
                        color={color ? color : "#a78bfa"}
                    />
                </mesh>
            )}
        </group>
    );
};
export default BoundaryPath;
