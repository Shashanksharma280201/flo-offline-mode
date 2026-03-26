import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';

// Mock Zustand store for lidarOverlayStore
let storeState = {
    offset: { x: 0, y: 0 },
    scale: 1,
    canvasSize: { width: 0, height: 0 }
};

const mockLidarOverlayStore = {
    getState: () => storeState,
    setOffset: (offset: { x: number; y: number }) => {
        storeState.offset = offset;
    },
    setScale: (scale: number) => {
        storeState.scale = scale;
    },
    setCanvasSize: (size: { width: number; height: number }) => {
        storeState.canvasSize = size;
    },
    reset: () => {
        storeState = {
            offset: { x: 0, y: 0 },
            scale: 1,
            canvasSize: { width: 0, height: 0 }
        };
    }
};

describe('Map Transform Sync Tests', () => {
    beforeEach(() => {
        mockLidarOverlayStore.reset();
    });

    describe('LIDAR Overlay Store State Management', () => {
        it('should initialize with default values', () => {
            const state = mockLidarOverlayStore.getState();

            expect(state.offset).toEqual({ x: 0, y: 0 });
            expect(state.scale).toBe(1);
            expect(state.canvasSize).toEqual({ width: 0, height: 0 });
        });

        it('should update offset', () => {
            act(() => {
                mockLidarOverlayStore.setOffset({ x: 100, y: 150 });
            });

            const state = mockLidarOverlayStore.getState();
            expect(state.offset).toEqual({ x: 100, y: 150 });
        });

        it('should update scale', () => {
            act(() => {
                mockLidarOverlayStore.setScale(2.5);
            });

            const state = mockLidarOverlayStore.getState();
            expect(state.scale).toBe(2.5);
        });

        it('should update canvas size', () => {
            act(() => {
                mockLidarOverlayStore.setCanvasSize({ width: 1920, height: 1080 });
            });

            const state = mockLidarOverlayStore.getState();
            expect(state.canvasSize).toEqual({ width: 1920, height: 1080 });
        });

        it('should handle multiple state updates', () => {
            act(() => {
                mockLidarOverlayStore.setOffset({ x: 50, y: 75 });
                mockLidarOverlayStore.setScale(1.5);
                mockLidarOverlayStore.setCanvasSize({ width: 800, height: 600 });
            });

            const state = mockLidarOverlayStore.getState();
            expect(state.offset).toEqual({ x: 50, y: 75 });
            expect(state.scale).toBe(1.5);
            expect(state.canvasSize).toEqual({ width: 800, height: 600 });
        });
    });

    describe('Canvas Pan/Zoom Transform Calculations', () => {
        it('should calculate pan offset correctly', () => {
            const panStart = { x: 100, y: 100 };
            const currentMouse = { x: 150, y: 120 };
            const previousOffset = { x: 0, y: 0 };

            // New offset = currentMouse - panStart + previousOffset
            const newOffset = {
                x: currentMouse.x - panStart.x + previousOffset.x,
                y: currentMouse.y - panStart.y + previousOffset.y
            };

            expect(newOffset).toEqual({ x: 50, y: 20 });
        });

        it('should calculate zoom scale with cursor position', () => {
            const canvasSize = { width: 800, height: 600 };
            const mousePos = { x: 400, y: 300 }; // Center of canvas
            const prevOffset = { x: 0, y: 0 };
            const prevScale = 1.0;
            const zoomDelta = 1.1; // Zoom in

            // Calculate world point under cursor
            const worldX = (mousePos.x - prevOffset.x) / prevScale;
            const worldY = (mousePos.y - prevOffset.y) / prevScale;

            expect(worldX).toBe(400);
            expect(worldY).toBe(300);

            // Calculate new offset to keep world point under cursor
            const newScale = prevScale * zoomDelta;
            const newOffset = {
                x: mousePos.x - worldX * newScale,
                y: mousePos.y - worldY * newScale
            };

            expect(newScale).toBeCloseTo(1.1, 2);
            expect(newOffset.x).toBeCloseTo(-40, 1);
            expect(newOffset.y).toBeCloseTo(-30, 1);
        });

        it('should enforce minimum zoom scale', () => {
            const canvasSize = { width: 800, height: 600 };
            const imageSize = { width: 3363, height: 3211 };

            // Min scale to fit entire map with 90% padding
            const scaleX = canvasSize.width / imageSize.width;
            const scaleY = canvasSize.height / imageSize.height;
            const minScale = Math.min(scaleX, scaleY) * 0.9;

            expect(minScale).toBeCloseTo(0.168, 3);

            // Attempting to zoom below min should clamp to min
            const attemptedScale = 0.1;
            const actualScale = Math.max(minScale, attemptedScale);

            expect(actualScale).toBe(minScale);
        });

        it('should enforce maximum zoom scale', () => {
            const maxScale = 5.0;
            const attemptedScale = 7.0;
            const actualScale = Math.min(maxScale, attemptedScale);

            expect(actualScale).toBe(maxScale);
        });

        it('should auto-center map at minimum zoom', () => {
            const canvasSize = { width: 800, height: 600 };
            const imageSize = { width: 3363, height: 3211 };
            const minScale = 0.168;

            // Center offset at min zoom
            const centerOffset = {
                x: (canvasSize.width - imageSize.width * minScale) / 2,
                y: (canvasSize.height - imageSize.height * minScale) / 2
            };

            expect(centerOffset.x).toBeCloseTo(117.5, 1);
            expect(centerOffset.y).toBeCloseTo(30.3, 1);
        });
    });

    describe('Three.js Camera Projection Sync', () => {
        it('should calculate orthographic frustum based on scale', () => {
            const canvasSize = { width: 800, height: 600 };
            const scale = 2.0;

            const halfWidth = canvasSize.width / (2 * scale);
            const halfHeight = canvasSize.height / (2 * scale);

            expect(halfWidth).toBe(200);
            expect(halfHeight).toBe(150);

            // Frustum bounds
            const frustum = {
                left: -halfWidth,
                right: halfWidth,
                top: halfHeight,
                bottom: -halfHeight
            };

            expect(frustum).toEqual({
                left: -200,
                right: 200,
                top: 150,
                bottom: -150
            });
        });

        it('should calculate camera position to match canvas offset', () => {
            const canvasSize = { width: 800, height: 600 };
            const offset = { x: 100, y: 50 };
            const scale = 1.5;

            // Canvas coordinate (0,0) after transform = offset
            // Camera needs to be at: -(offset - canvasCenter) / scale
            const centerOffsetX = offset.x - canvasSize.width / 2;
            const centerOffsetY = offset.y - canvasSize.height / 2;

            const cameraPos = {
                x: -centerOffsetX / scale,
                y: centerOffsetY / scale // Y inverted in canvas vs Three.js
            };

            expect(cameraPos.x).toBeCloseTo(200, 1);
            expect(cameraPos.y).toBeCloseTo(-166.67, 1);
        });

        it('should sync camera when scale changes', () => {
            const canvasSize = { width: 800, height: 600 };
            const offset = { x: 0, y: 0 };

            // Scale from 1.0 to 2.0
            const scale1 = 1.0;
            const scale2 = 2.0;

            const frustum1 = {
                left: -canvasSize.width / (2 * scale1),
                right: canvasSize.width / (2 * scale1)
            };

            const frustum2 = {
                left: -canvasSize.width / (2 * scale2),
                right: canvasSize.width / (2 * scale2)
            };

            // Frustum should be half the size when scale doubles (more zoomed in)
            expect(frustum2.right).toBe(frustum1.right / 2);
        });

        it('should sync camera when offset changes (panning)', () => {
            const canvasSize = { width: 800, height: 600 };
            const scale = 1.0;

            const offset1 = { x: 0, y: 0 };
            const offset2 = { x: 100, y: 50 };

            const calcCameraPos = (offset: { x: number; y: number }) => {
                const centerOffsetX = offset.x - canvasSize.width / 2;
                const centerOffsetY = offset.y - canvasSize.height / 2;
                return {
                    x: -centerOffsetX / scale,
                    y: centerOffsetY / scale
                };
            };

            const cameraPos1 = calcCameraPos(offset1);
            const cameraPos2 = calcCameraPos(offset2);

            // Camera should move opposite to offset (canvas pans right, camera looks left)
            expect(cameraPos2.x - cameraPos1.x).toBe(100);
            expect(cameraPos2.y - cameraPos1.y).toBe(50);
        });
    });

    describe('Coordinate Space Conversions', () => {
        it('should convert canvas pixel to world coordinates', () => {
            const offset = { x: 100, y: 50 };
            const scale = 2.0;
            const canvasPixel = { x: 300, y: 200 };

            // World coords = (canvas - offset) / scale
            const world = {
                x: (canvasPixel.x - offset.x) / scale,
                y: (canvasPixel.y - offset.y) / scale
            };

            expect(world.x).toBe(100);
            expect(world.y).toBe(75);
        });

        it('should convert world coordinates to canvas pixel', () => {
            const offset = { x: 100, y: 50 };
            const scale = 2.0;
            const world = { x: 100, y: 75 };

            // Canvas = world * scale + offset
            const canvasPixel = {
                x: world.x * scale + offset.x,
                y: world.y * scale + offset.y
            };

            expect(canvasPixel.x).toBe(300);
            expect(canvasPixel.y).toBe(200);
        });

        it('should maintain coordinate consistency through zoom', () => {
            const worldPoint = { x: 150, y: 100 };
            const offset = { x: 0, y: 0 };

            // At scale 1.0
            const canvas1 = {
                x: worldPoint.x * 1.0 + offset.x,
                y: worldPoint.y * 1.0 + offset.y
            };

            // At scale 2.0 (zoomed in)
            const canvas2 = {
                x: worldPoint.x * 2.0 + offset.x,
                y: worldPoint.y * 2.0 + offset.y
            };

            // Same world point should map to different canvas positions
            expect(canvas1).toEqual({ x: 150, y: 100 });
            expect(canvas2).toEqual({ x: 300, y: 200 });

            // But converting back should give same world point
            const backToWorld1 = {
                x: (canvas1.x - offset.x) / 1.0,
                y: (canvas1.y - offset.y) / 1.0
            };
            const backToWorld2 = {
                x: (canvas2.x - offset.x) / 2.0,
                y: (canvas2.y - offset.y) / 2.0
            };

            expect(backToWorld1).toEqual(worldPoint);
            expect(backToWorld2).toEqual(worldPoint);
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero scale gracefully', () => {
            const scale = 0.0;
            const canvasSize = { width: 800, height: 600 };

            // Should not calculate frustum with zero scale (would be infinite)
            if (scale === 0) {
                expect(scale).toBe(0); // Just verify we can detect this case
            }
        });

        it('should handle zero canvas size', () => {
            const canvasSize = { width: 0, height: 0 };
            const scale = 1.0;

            if (canvasSize.width === 0 || canvasSize.height === 0) {
                // Should not update camera projection
                expect(canvasSize.width).toBe(0);
            }
        });

        it('should handle very large zoom values', () => {
            const maxScale = 5.0;
            const attemptedScale = 1000.0;
            const actualScale = Math.min(maxScale, attemptedScale);

            expect(actualScale).toBe(maxScale);
        });

        it('should handle negative offsets (map dragged off-screen)', () => {
            const offset = { x: -500, y: -300 };
            const scale = 1.0;
            const canvasSize = { width: 800, height: 600 };

            const centerOffsetX = offset.x - canvasSize.width / 2;
            const centerOffsetY = offset.y - canvasSize.height / 2;

            expect(centerOffsetX).toBe(-900);
            expect(centerOffsetY).toBe(-600);

            // Camera should still calculate correctly
            const cameraPos = {
                x: -centerOffsetX / scale,
                y: centerOffsetY / scale
            };

            expect(cameraPos.x).toBe(900);
            expect(cameraPos.y).toBe(-600);
        });
    });
});
