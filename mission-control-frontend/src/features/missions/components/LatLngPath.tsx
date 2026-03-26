import { useFrame } from "@react-three/fiber";
import { LatLng, Path, Point2 } from "../../../data/types";
import { useEffect, useRef, useState } from "react";
import { useMissionsStore } from "../../../stores/missionsStore";
import { CatmullRomCurve3 } from "three";
import { useR3fStore } from "../../../stores/r3fStore";

import { Line2, LineGeometry } from "three-stdlib";

type LatLngPathProps = {
    path: LatLng[];
};

const LatLngPath = ({ path }: LatLngPathProps) => {
    let meshRef = useRef<Line2>(null!);
    let materialRef = useRef<THREE.MeshStandardMaterial>(null!);
    const [curve, setCurve] = useState<CatmullRomCurve3>();
    const [overlay] = useR3fStore((state) => [state.overlay]);
    useEffect(() => {
        if (overlay) {
            const positions = path.map((latLng) => {
                return overlay.latLngAltitudeToVector3(latLng);
            });
            const curve = new CatmullRomCurve3(positions);
            setCurve(curve);
        }
        return () => {
            setCurve(undefined);
        };
    }, [path]);

    useFrame(() => {
        if (overlay) {
            overlay.requestRedraw();
        }
    });
    return (
        <>
            {path && path.length > 1 && curve && curve.points.length > 1 && (
                <mesh ref={meshRef} position-z={-0.5}>
                    <tubeGeometry args={[curve, 2048, 0.15, 8, closed]} />
                    <meshStandardMaterial
                        opacity={0.2}
                        color={"#5b21b6"}
                        ref={materialRef}
                        transparent
                        depthTest={true}
                    />
                </mesh>
            )}
        </>
    );
};
export default LatLngPath;
