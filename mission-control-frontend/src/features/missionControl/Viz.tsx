import {
    Environment,
    GizmoHelper,
    GizmoViewport,
    Grid
} from "@react-three/drei";
import RosTransformedModel from "./components/RosTransformedModel";
import { CubeWithAxes } from "../../components/r3f/shapes/CubeWithAxis";
import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import MissionPlanning from "./components/MissionPlanning";
import MissionPath from "./components/MissionPath";
import { useR3fStore } from "../../stores/r3fStore";

const night = await import("@pmndrs/assets/hdri/night.exr");

const Viz = () => {
    const { camera } = useThree();
    const [
        isOrbitControlsEnabled,
        setIsOrbitControlsEnabled,
        modelPosition,
        modelQuarternion
    ] = useR3fStore((state) => [
        state.isOrbitControlsEnabled,
        state.setIsOrbitControlsEnabled,
        state.modelPosition,
        state.modelQuarternion
    ]);

    return (
        <>
            <OrbitControls
                zoom0={100}
                target={[modelPosition.x, modelPosition.y, modelPosition.z]}
                enableRotate={isOrbitControlsEnabled}
                enablePan={isOrbitControlsEnabled}
                makeDefault
            />

            <Grid
                renderOrder={-1}
                position={[0, 0, 0]}
                infiniteGrid
                cellSize={0.2}
                cellThickness={1}
                sectionSize={1}
                cellColor="#3f3f46"
                sectionColor="#4b5563"
                fadeStrength={5}
            />
            <RosTransformedModel />
            <MissionPlanning />
            <MissionPath />
            <ambientLight color={0x606060} />
            <directionalLight position={[0, 1.75, 1]} />
            <Environment files={night.default} background blur={0.1} />
            <CubeWithAxes />
            {!isOrbitControlsEnabled && (
                <GizmoHelper alignment="top-left">
                    <GizmoViewport />
                </GizmoHelper>
            )}
        </>
    );
};
export default Viz;
