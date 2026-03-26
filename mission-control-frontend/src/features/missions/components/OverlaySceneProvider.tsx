import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { ThreeJSOverlayView } from "@googlemaps/three";
import { useR3fStore } from "../../../stores/r3fStore";

const OverlaySceneProvider = () => {
    const { scene } = useThree();
    const overlay = useR3fStore((state) => state.overlay);

    useEffect(() => {
        if (overlay) {
            console.log("Adding scene");
            overlay?.scene.add(scene);
        }

        return () => {
            if (overlay && scene) {
                overlay.scene.remove(scene);
            }
        };
    }, [overlay, scene]);
    return null;
};
export default OverlaySceneProvider;
