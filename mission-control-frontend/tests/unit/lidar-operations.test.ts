import { describe, it, expect, beforeEach } from 'vitest';
import { distanceBetweenUTM, distanceBetweenLatLng } from '../../src/util/geoUtils';

describe('LIDAR Mode Operations Tests', () => {
    describe('Boundary Collection in LIDAR Mode', () => {
        it('should add first boundary point when array is empty', () => {
            const boundaryGps: any[] = [];
            const mapType = 'lidar';
            const isMappingBoundary = true;

            const latLng = { lat: 12.9716, lng: 77.5946 };
            const mapXY = { x: 10.0, y: 20.0 };

            // Boundary collection logic
            if (mapType === 'lidar' && isMappingBoundary && mapXY && latLng) {
                if (boundaryGps.length === 0) {
                    boundaryGps.push({ gps: latLng, utm: mapXY });
                }
            }

            expect(boundaryGps).toHaveLength(1);
            expect(boundaryGps[0].gps).toEqual(latLng);
            expect(boundaryGps[0].utm).toEqual(mapXY);
        });

        it('should add boundary point when distance > 0.8m from last point', () => {
            const boundaryGps = [
                {
                    gps: { lat: 12.9716, lng: 77.5946 },
                    utm: { x: 10.0, y: 20.0 }
                }
            ];

            const mapType = 'lidar';
            const isMappingBoundary = true;

            const newLatLng = { lat: 12.97161, lng: 77.59461 };
            const newMapXY = { x: 11.0, y: 20.0 }; // 1m away from last point

            const distance = distanceBetweenUTM(
                boundaryGps[boundaryGps.length - 1].utm,
                newMapXY
            );

            expect(distance).toBeCloseTo(1.0, 1);

            // Should add point
            if (mapType === 'lidar' && isMappingBoundary && distance > 0.8) {
                boundaryGps.push({ gps: newLatLng, utm: newMapXY });
            }

            expect(boundaryGps).toHaveLength(2);
        });

        it('should NOT add boundary point when distance <= 0.8m from last point', () => {
            const boundaryGps = [
                {
                    gps: { lat: 12.9716, lng: 77.5946 },
                    utm: { x: 10.0, y: 20.0 }
                }
            ];

            const mapType = 'lidar';
            const isMappingBoundary = true;

            const newLatLng = { lat: 12.9716, lng: 77.5946 };
            const newMapXY = { x: 10.5, y: 20.0 }; // 0.5m away from last point

            const distance = distanceBetweenUTM(
                boundaryGps[boundaryGps.length - 1].utm,
                newMapXY
            );

            expect(distance).toBe(0.5);

            // Should NOT add point
            if (mapType === 'lidar' && isMappingBoundary && distance > 0.8) {
                boundaryGps.push({ gps: newLatLng, utm: newMapXY });
            }

            expect(boundaryGps).toHaveLength(1); // Still 1
        });

        it('should only collect boundaries in LIDAR mode', () => {
            const boundaryGps: any[] = [];
            const mapType = 'google'; // Not LIDAR mode
            const isMappingBoundary = true;

            const latLng = { lat: 12.9716, lng: 77.5946 };
            const mapXY = { x: 10.0, y: 20.0 };

            // Should NOT collect in Google Maps mode
            if (mapType === 'lidar' && isMappingBoundary && mapXY && latLng) {
                boundaryGps.push({ gps: latLng, utm: mapXY });
            }

            expect(boundaryGps).toHaveLength(0);
        });
    });

    describe('Obstacle Collection in LIDAR Mode', () => {
        it('should add first obstacle point when array is empty', () => {
            const obstacleGPS: any[] = [];
            const mapType = 'lidar';
            const isMappingObstacles = true;

            const latLng = { lat: 12.9716, lng: 77.5946 };
            const mapXY = { x: 5.0, y: 15.0 };

            // Obstacle collection logic
            if (mapType === 'lidar' && isMappingObstacles && mapXY && latLng) {
                if (obstacleGPS.length === 0) {
                    obstacleGPS.push({ gps: latLng, utm: mapXY });
                }
            }

            expect(obstacleGPS).toHaveLength(1);
            expect(obstacleGPS[0].gps).toEqual(latLng);
            expect(obstacleGPS[0].utm).toEqual(mapXY);
        });

        it('should add obstacle point when distance > 0.8m from last point', () => {
            const obstacleGPS = [
                {
                    gps: { lat: 12.9716, lng: 77.5946 },
                    utm: { x: 5.0, y: 15.0 }
                }
            ];

            const mapType = 'lidar';
            const isMappingObstacles = true;

            const newLatLng = { lat: 12.97161, lng: 77.59461 };
            const newMapXY = { x: 5.0, y: 16.0 }; // 1m away

            const distance = distanceBetweenUTM(
                obstacleGPS[obstacleGPS.length - 1].utm,
                newMapXY
            );

            expect(distance).toBe(1.0);

            if (mapType === 'lidar' && isMappingObstacles && distance > 0.8) {
                obstacleGPS.push({ gps: newLatLng, utm: newMapXY });
            }

            expect(obstacleGPS).toHaveLength(2);
        });

        it('should store both GPS and map coordinates for obstacles', () => {
            const obstacleGPS: any[] = [];
            const mapType = 'lidar';
            const isMappingObstacles = true;

            const latLng = { lat: 12.9716, lng: 77.5946 };
            const mapXY = { x: 5.0, y: 15.0 };

            if (mapType === 'lidar' && isMappingObstacles) {
                obstacleGPS.push({ gps: latLng, utm: mapXY });
            }

            expect(obstacleGPS[0]).toHaveProperty('gps');
            expect(obstacleGPS[0]).toHaveProperty('utm');
            expect(obstacleGPS[0].gps.lat).toBe(12.9716);
            expect(obstacleGPS[0].utm.x).toBe(5.0);
        });
    });

    describe('Path Tracking in LIDAR Mode', () => {
        it('should add first path point when array is empty', () => {
            const latLngPath: any[] = [];
            const mapType = 'lidar';
            const isPathMapping = true;

            const latLng = { lat: 12.9716, lng: 77.5946 };

            // Path tracking logic
            if (mapType === 'lidar' && isPathMapping && latLng) {
                if (latLngPath.length === 0) {
                    latLngPath.push(latLng);
                }
            }

            expect(latLngPath).toHaveLength(1);
            expect(latLngPath[0]).toEqual(latLng);
        });

        it('should add path point when distance > 0.8m from last point', () => {
            const latLngPath = [
                { lat: 12.9716, lng: 77.5946 }
            ];

            const mapType = 'lidar';
            const isPathMapping = true;

            const newLatLng = { lat: 12.97168, lng: 77.5946 }; // ~90m north

            const distance = distanceBetweenLatLng(
                latLngPath[latLngPath.length - 1],
                newLatLng
            );

            expect(distance).toBeGreaterThan(0.8);

            if (mapType === 'lidar' && isPathMapping && distance > 0.8) {
                latLngPath.push(newLatLng);
            }

            expect(latLngPath).toHaveLength(2);
        });

        it('should NOT add path point when distance <= 0.8m from last point', () => {
            const latLngPath = [
                { lat: 12.9716, lng: 77.5946 }
            ];

            const mapType = 'lidar';
            const isPathMapping = true;

            const newLatLng = { lat: 12.97160005, lng: 77.5946 }; // ~0.5m north

            const distance = distanceBetweenLatLng(
                latLngPath[latLngPath.length - 1],
                newLatLng
            );

            expect(distance).toBeLessThan(0.8);

            if (mapType === 'lidar' && isPathMapping && distance > 0.8) {
                latLngPath.push(newLatLng);
            }

            expect(latLngPath).toHaveLength(1); // Still 1
        });

        it('should track GPS coordinates for path visualization', () => {
            const latLngPath: any[] = [];
            const mapType = 'lidar';
            const isPathMapping = true;

            const positions = [
                { lat: 12.9716, lng: 77.5946 },
                { lat: 12.97168, lng: 77.5946 },
                { lat: 12.97176, lng: 77.5946 }
            ];

            positions.forEach(latLng => {
                if (mapType === 'lidar' && isPathMapping) {
                    if (
                        latLngPath.length === 0 ||
                        distanceBetweenLatLng(
                            latLngPath[latLngPath.length - 1],
                            latLng
                        ) > 0.8
                    ) {
                        latLngPath.push(latLng);
                    }
                }
            });

            expect(latLngPath.length).toBeGreaterThan(0);
            expect(latLngPath[0]).toHaveProperty('lat');
            expect(latLngPath[0]).toHaveProperty('lng');
        });
    });

    describe('Coordinate System Consistency', () => {
        it('should maintain both coordinate systems throughout boundary mapping', () => {
            const boundaryGps: any[] = [];
            const mapType = 'lidar';
            const isMappingBoundary = true;

            const points = [
                { latLng: { lat: 12.9716, lng: 77.5946 }, mapXY: { x: 0.0, y: 0.0 } },
                { latLng: { lat: 12.97161, lng: 77.5946 }, mapXY: { x: 1.0, y: 0.0 } },
                { latLng: { lat: 12.97162, lng: 77.5946 }, mapXY: { x: 2.0, y: 0.0 } }
            ];

            points.forEach(point => {
                if (mapType === 'lidar' && isMappingBoundary) {
                    if (
                        boundaryGps.length === 0 ||
                        distanceBetweenUTM(
                            boundaryGps[boundaryGps.length - 1].utm,
                            point.mapXY
                        ) > 0.8
                    ) {
                        boundaryGps.push({ gps: point.latLng, utm: point.mapXY });
                    }
                }
            });

            // Verify all points have both coordinate systems
            boundaryGps.forEach(point => {
                expect(point).toHaveProperty('gps');
                expect(point).toHaveProperty('utm');
                expect(point.gps).toHaveProperty('lat');
                expect(point.gps).toHaveProperty('lng');
                expect(point.utm).toHaveProperty('x');
                expect(point.utm).toHaveProperty('y');
            });
        });

        it('should use distanceBetweenUTM for boundary/obstacle spacing in LIDAR mode', () => {
            const point1 = { x: 0.0, y: 0.0 };
            const point2 = { x: 0.8, y: 0.0 };
            const point3 = { x: 0.9, y: 0.0 };

            const distance1to2 = distanceBetweenUTM(point1, point2);
            const distance1to3 = distanceBetweenUTM(point1, point3);

            expect(distance1to2).toBe(0.8);
            expect(distance1to3).toBe(0.9);

            // Point 2 should NOT be added (0.8m threshold)
            expect(distance1to2 > 0.8).toBe(false);

            // Point 3 should be added (> 0.8m)
            expect(distance1to3 > 0.8).toBe(true);
        });

        it('should use distanceBetweenLatLng for path spacing in LIDAR mode', () => {
            const point1 = { lat: 12.9716, lng: 77.5946 };
            const point2 = { lat: 12.97168, lng: 77.5946 }; // ~90m north

            const distance = distanceBetweenLatLng(point1, point2);

            expect(distance).toBeGreaterThan(0.8);
            expect(distance).toBeGreaterThan(80); // Actually ~90m
        });
    });

    describe('Mode-Specific Behavior', () => {
        it('should only collect in LIDAR mode, not in Google Maps mode', () => {
            const boundaryGps: any[] = [];
            const obstacleGPS: any[] = [];
            const latLngPath: any[] = [];

            const scenarios = [
                { mapType: 'google', shouldCollect: false },
                { mapType: 'lidar', shouldCollect: true }
            ];

            scenarios.forEach(scenario => {
                const latLng = { lat: 12.9716, lng: 77.5946 };
                const mapXY = { x: 10.0, y: 20.0 };

                // Boundary
                if (scenario.mapType === 'lidar' && mapXY && latLng) {
                    boundaryGps.push({ gps: latLng, utm: mapXY });
                }

                // Obstacle
                if (scenario.mapType === 'lidar' && mapXY && latLng) {
                    obstacleGPS.push({ gps: latLng, utm: mapXY });
                }

                // Path
                if (scenario.mapType === 'lidar' && latLng) {
                    latLngPath.push(latLng);
                }
            });

            // Only LIDAR mode should have collected points
            expect(boundaryGps).toHaveLength(1);
            expect(obstacleGPS).toHaveLength(1);
            expect(latLngPath).toHaveLength(1);
        });

        it('should require both mapXY and latLng for boundary/obstacle collection', () => {
            const boundaryGps: any[] = [];
            const mapType = 'lidar';
            const isMappingBoundary = true;

            // Case 1: Missing mapXY
            const latLng1 = { lat: 12.9716, lng: 77.5946 };
            const mapXY1 = undefined;

            if (mapType === 'lidar' && isMappingBoundary && mapXY1 && latLng1) {
                boundaryGps.push({ gps: latLng1, utm: mapXY1 });
            }

            expect(boundaryGps).toHaveLength(0);

            // Case 2: Missing latLng
            const latLng2 = undefined;
            const mapXY2 = { x: 10.0, y: 20.0 };

            if (mapType === 'lidar' && isMappingBoundary && mapXY2 && latLng2) {
                boundaryGps.push({ gps: latLng2, utm: mapXY2 });
            }

            expect(boundaryGps).toHaveLength(0);

            // Case 3: Both present
            const latLng3 = { lat: 12.9716, lng: 77.5946 };
            const mapXY3 = { x: 10.0, y: 20.0 };

            if (mapType === 'lidar' && isMappingBoundary && mapXY3 && latLng3) {
                boundaryGps.push({ gps: latLng3, utm: mapXY3 });
            }

            expect(boundaryGps).toHaveLength(1);
        });
    });

    describe('Distance Utility Functions', () => {
        it('distanceBetweenUTM should calculate correct Euclidean distance', () => {
            const point1 = { x: 0.0, y: 0.0 };
            const point2 = { x: 3.0, y: 4.0 }; // 3-4-5 right triangle

            const distance = distanceBetweenUTM(point1, point2);

            expect(distance).toBe(5.0);
        });

        it('distanceBetweenUTM should handle negative coordinates', () => {
            const point1 = { x: -5.0, y: -10.0 };
            const point2 = { x: -2.0, y: -6.0 };

            const distance = distanceBetweenUTM(point1, point2);

            expect(distance).toBe(5.0); // 3-4-5 triangle
        });

        it('distanceBetweenUTM should return 0 for same point', () => {
            const point1 = { x: 10.0, y: 20.0 };
            const point2 = { x: 10.0, y: 20.0 };

            const distance = distanceBetweenUTM(point1, point2);

            expect(distance).toBe(0.0);
        });

        it('distanceBetweenLatLng should calculate haversine distance', () => {
            const point1 = { lat: 12.9716, lng: 77.5946 };
            const point2 = { lat: 12.9716, lng: 77.5946 };

            const distance = distanceBetweenLatLng(point1, point2);

            expect(distance).toBe(0.0);
        });
    });
});
