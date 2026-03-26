import { useFrame } from "@react-three/fiber";
import { LatLng } from "../../../data/types";
import { useEffect, useRef, useState } from "react";
import { useMissionsStore } from "../../../stores/missionsStore";
import { CatmullRomCurve3, MeshStandardMaterial } from "three";
import { useR3fStore } from "../../../stores/r3fStore";
import { Line2 } from "three-stdlib";

const MissionPath = () => {
    const meshRef = useRef<Line2>(null!);
    const materialRef = useRef<MeshStandardMaterial>(null!);

    const [curves, setCurves] = useState<CatmullRomCurve3[]>();
    const overlay = useR3fStore((state) => state.overlay);
    const mission = useMissionsStore((state) => state.mission);

    useEffect(() => {
        if (overlay && mission && mission.mission.length > 0) {
            const allCurves: CatmullRomCurve3[] = [];
            const uniqueLatLng: {
                [id: string]: LatLng[];
            } = {};

            mission.mission.forEach((path) => {
                uniqueLatLng[path.id] = path.gps;
            });
            Object.values(uniqueLatLng).forEach((latLngArr) => {
                const positions = latLngArr.map((latLng) => {
                    return overlay.latLngAltitudeToVector3(latLng);
                });
                const curve = new CatmullRomCurve3(
                    positions,
                    false,
                    "catmullrom",
                    0.5
                );
                allCurves.push(curve);
            });

            setCurves(allCurves);
        }
        return () => {
            setCurves([]);
        };
    }, [mission]);

    useFrame(() => {
        if (overlay && meshRef.current) {
            overlay.requestRedraw();
        }
    });
    return (
        <>
            {mission &&
                mission.mission.length > 0 &&
                curves &&
                curves.map((curve, index) => (
                    <mesh key={index} ref={meshRef}>
                        <tubeGeometry args={[curve, 2048, 0.15, 8, closed]} />
                        <meshStandardMaterial
                            opacity={1}
                            color={"#5b21b6"}
                            ref={materialRef}
                            depthTest={true}
                        />
                    </mesh>
                ))}
        </>
    );
};
export default MissionPath;
