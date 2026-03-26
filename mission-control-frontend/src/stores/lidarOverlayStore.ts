import { create } from "zustand";

interface LidarOverlayState {
    // LIDAR map transform state (synced from LidarMap2D)
    offset: { x: number; y: number };
    scale: number;
    canvasSize: { width: number; height: number };

    // Setters
    setOffset: (offset: { x: number; y: number }) => void;
    setScale: (scale: number) => void;
    setCanvasSize: (size: { width: number; height: number }) => void;
}

export const useLidarOverlayStore = create<LidarOverlayState>((set) => ({
    offset: { x: 0, y: 0 },
    scale: 1,
    canvasSize: { width: 0, height: 0 },

    setOffset: (offset) => set({ offset }),
    setScale: (scale) => set({ scale }),
    setCanvasSize: (size) => set({ canvasSize: size })
}));
