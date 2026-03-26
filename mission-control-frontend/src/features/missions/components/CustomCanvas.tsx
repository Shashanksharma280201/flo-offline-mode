import * as THREE from "three";
import { ReconcilerRoot, createRoot, events, extend } from "@react-three/fiber";
import { ReactNode, useEffect, useRef } from "react";
extend(THREE);

const CustomCanvas = ({ children }: { children: ReactNode }) => {
    const rootRef = useRef<ReconcilerRoot<HTMLCanvasElement> | null>();

    const createCustomCanvas = () => {
        const canvas = document.querySelector("canvas");
        if (!rootRef.current) {
            rootRef.current = canvas && createRoot(canvas);
        }
        const gl = canvas && canvas.getContext("webgl2");
        console.log(gl);
        if (gl && rootRef.current) {
            rootRef.current.configure({
                events,
                gl: {
                    ...gl,
                    autoClear: false,
                    autoClearDepth: false,
                    outputColorSpace: THREE.SRGBColorSpace
                },
                shadows: true
            });

            rootRef.current.render(children);
        } else {
            setTimeout(createCustomCanvas, 1000);
        }
    };

    useEffect(() => {
        createCustomCanvas();
    }, [children]);

    return null;
};
export default CustomCanvas;
