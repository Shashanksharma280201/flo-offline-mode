import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ArrowHelper, Vector3 } from "three";
import { useR3fStore } from "../../../stores/r3fStore";
import { VectorMapOptions } from "../../../constants/map";

export const CubeWithAxes = () => {
    const meshRef = useRef<THREE.Mesh>(null!);
    const overlay = useR3fStore((state) => state.overlay);
    const xAxisRef = useRef(
        new ArrowHelper(new Vector3(1, 0, 0), new Vector3(), 2, 0xff0000)
    );
    const yAxisRef = useRef(
        new ArrowHelper(new Vector3(0, 1, 0), new Vector3(), 2, 0x00ff00)
    );
    const zAxisRef = useRef(
        new ArrowHelper(new Vector3(0, 0, 1), new Vector3(), 2, 0x0000ff)
    );

    useFrame((state, delta) => {
        if (meshRef.current && overlay) {
            overlay.latLngAltitudeToVector3(
                VectorMapOptions.center,
                meshRef.current.position
            );
            meshRef.current.translateZ(1.5);
            xAxisRef.current.position.copy(meshRef.current.position);
            yAxisRef.current.position.copy(meshRef.current.position);
            zAxisRef.current.position.copy(meshRef.current.position);
        }
    });

    return (
        <>
            <mesh ref={meshRef}>
                <boxGeometry args={[0.01, 0.01, 0.01]} />
                <meshStandardMaterial opacity={0} transparent />
            </mesh>
            <primitive object={xAxisRef.current} />
            <primitive object={yAxisRef.current} />
            <primitive object={zAxisRef.current} />
        </>
    );
};
