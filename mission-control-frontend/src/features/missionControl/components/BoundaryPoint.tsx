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

type BoundaryPointProps = {
    position: Vector3;
    index: number;
};

const BoundaryPoint = ({ position, index }: BoundaryPointProps) => {
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const gridPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
    const planeIntersectPoint = useMemo(() => new Vector3(), []);
    const boundaryPointRef = useRef<Mesh>(null!);
    const point = useMemo(() => new Vector3(), []);
    const [boundaryPointProperties, setBoundaryPointProperties] = useState({
        scale: 1,
        opacity: 1,
        color: "#f5d0fe"
    });

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
    const bind = useDrag(({ active, event }) => {
        const threeEvent = event as unknown as ThreeEvent<MouseEvent>;

        if (active) {
            threeEvent.ray.intersectPlane(gridPlane, planeIntersectPoint);
            point.copy(planeIntersectPoint);
            point.setY(0);
            const newBoundaryMap = [...selectedBoundaryMap];
            newBoundaryMap[index] = {
                position: point
            };
            setSelectedBoundaryMap(newBoundaryMap);
            boundaryPointRef.current.position.copy(point);
        }
        setBoundaryPointProperties({
            scale: active ? 1.3 : 1,
            opacity: active ? 0.5 : 1,
            color: active ? "#ff0000" : "#f5d0fe"
        });
        setIsDragging(active);
    });

    return (
        <mesh
            scale={boundaryPointProperties.scale}
            {...(bind() as any)}
            position={position}
            ref={boundaryPointRef}
        >
            <sphereGeometry args={[0.1, 32, 64]} />
            <meshStandardMaterial
                transparent={true}
                opacity={boundaryPointProperties.opacity}
                color={boundaryPointProperties.color}
            />
        </mesh>
    );
};
export default BoundaryPoint;
