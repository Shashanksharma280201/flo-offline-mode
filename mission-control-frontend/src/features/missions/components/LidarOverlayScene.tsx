import { useThree, useFrame } from "@react-three/fiber";
import { useEffect } from "react";
import { useLidarOverlayStore } from "../../../stores/lidarOverlayStore";
import * as THREE from "three";

const LidarOverlayScene = () => {
    const { camera, gl } = useThree();
    const { offset, scale, canvasSize } = useLidarOverlayStore((state) => ({
        offset: state.offset,
        scale: state.scale,
        canvasSize: state.canvasSize
    }));

    // Set up orthographic camera matching canvas dimensions
    useEffect(() => {
        if (camera && canvasSize.width > 0 && canvasSize.height > 0) {
            const orthoCamera = camera as THREE.OrthographicCamera;

            // Set camera to match canvas size in pixels
            const halfWidth = canvasSize.width / 2;
            const halfHeight = canvasSize.height / 2;

            orthoCamera.left = -halfWidth;
            orthoCamera.right = halfWidth;
            orthoCamera.top = halfHeight;
            orthoCamera.bottom = -halfHeight;
            orthoCamera.near = -1000;
            orthoCamera.far = 1000;

            // Position camera looking down at XY plane
            orthoCamera.position.set(0, 0, 100);
            orthoCamera.lookAt(0, 0, 0);

            orthoCamera.updateProjectionMatrix();

            console.log('LidarOverlayScene camera setup:', {
                canvasSize,
                frustum: { left: orthoCamera.left, right: orthoCamera.right, top: orthoCamera.top, bottom: orthoCamera.bottom },
                position: orthoCamera.position
            });
        }
    }, [camera, canvasSize]);

    // Sync camera with LIDAR map transformations
    useFrame(() => {
        if (camera && canvasSize.width > 0 && canvasSize.height > 0 && scale > 0) {
            const orthoCamera = camera as THREE.OrthographicCamera;

            // The LIDAR canvas applies: ctx.translate(offset.x, offset.y) then ctx.scale(scale, scale)
            // To match this in Three.js orthographic camera:
            // 1. The frustum size controls zoom (smaller frustum = more zoomed in)
            // 2. Camera position controls pan

            // Calculate frustum based on scale
            const halfWidth = canvasSize.width / (2 * scale);
            const halfHeight = canvasSize.height / (2 * scale);

            orthoCamera.left = -halfWidth;
            orthoCamera.right = halfWidth;
            orthoCamera.top = halfHeight;
            orthoCamera.bottom = -halfHeight;

            // Calculate camera position to match canvas offset
            // Canvas coordinate (0,0) after transform = offset
            // We want world (0,0) to appear at canvas position (offset.x, offset.y)
            // Camera sees center of canvas at its position
            // So camera needs to be at: -(offset - canvasCenter) / scale
            const centerOffsetX = offset.x - canvasSize.width / 2;
            const centerOffsetY = offset.y - canvasSize.height / 2;

            orthoCamera.position.x = -centerOffsetX / scale;
            orthoCamera.position.y = centerOffsetY / scale; // Y is inverted in canvas vs Three.js

            orthoCamera.updateProjectionMatrix();
        }
    });

    // Make canvas transparent
    useEffect(() => {
        if (gl) {
            gl.setClearColor(0x000000, 0); // Transparent background
        }
    }, [gl]);

    return null;
};

export default LidarOverlayScene;
