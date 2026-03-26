import { describe, it, expect } from 'vitest';
import { latLngToPixel, mapCoordsToPixel, utmToMapCoords, MapConfig } from '../../src/util/mapGeoref';
import { latLngToUtm } from '../../src/util/geoUtils';
import testCoordinates from '../fixtures/test-coordinates.json';

describe('Coordinate Conversion Tests', () => {
    const mapConfig: MapConfig = testCoordinates.mapConfig as MapConfig;

    describe('latLngToUtm', () => {
        it('should convert GPS coordinates to UTM', () => {
            const testPoint = testCoordinates.testPoints[0];
            const result = latLngToUtm(testPoint.gps.lat, testPoint.gps.lng);

            // Allow for small floating point differences (within 0.1 meters)
            expect(result.easting).toBeCloseTo(testPoint.utm.easting, 1);
            expect(result.northing).toBeCloseTo(testPoint.utm.northing, 1);
        });

        it('should handle multiple GPS points consistently', () => {
            testCoordinates.testPoints.slice(0, 3).forEach((testPoint) => {
                const result = latLngToUtm(testPoint.gps.lat, testPoint.gps.lng);

                expect(result.easting).toBeCloseTo(testPoint.utm.easting, 1);
                expect(result.northing).toBeCloseTo(testPoint.utm.northing, 1);
            });
        });
    });

    describe('utmToMapCoords', () => {
        it('should convert UTM to local map coordinates using affine transform', () => {
            const testPoint = testCoordinates.testPoints[0];
            const result = utmToMapCoords(testPoint.utm.easting, testPoint.utm.northing);

            // Affine transform may have precision differences, allow 0.01 meter tolerance
            expect(result.x).toBeCloseTo(testPoint.mapCoords.x, 2);
            expect(result.y).toBeCloseTo(testPoint.mapCoords.y, 2);
        });

        it('should apply affine transformation correctly for all reference points', () => {
            testCoordinates.testPoints.slice(0, 3).forEach((testPoint) => {
                const result = utmToMapCoords(testPoint.utm.easting, testPoint.utm.northing);

                expect(result.x).toBeCloseTo(testPoint.mapCoords.x, 2);
                expect(result.y).toBeCloseTo(testPoint.mapCoords.y, 2);
            });
        });
    });

    describe('mapCoordsToPixel', () => {
        it('should convert map coordinates to pixel coordinates', () => {
            const testPoint = testCoordinates.testPoints[3]; // Negative coordinates test
            const result = mapCoordsToPixel(
                testPoint.mapCoords.x,
                testPoint.mapCoords.y,
                mapConfig
            );

            expect(result.x).toBeCloseTo(testPoint.expectedPixel.x, 1);
            expect(result.y).toBeCloseTo(testPoint.expectedPixel.y, 1);
        });

        it('should handle origin correctly', () => {
            // Map coordinates at origin (0,0) relative to map origin
            const result = mapCoordsToPixel(
                mapConfig.origin.x,
                mapConfig.origin.y,
                mapConfig
            );

            // Should be at pixel (0, 0)
            expect(result.x).toBeCloseTo(0, 1);
            expect(result.y).toBeCloseTo(0, 1);
        });

        it('should handle positive map coordinates', () => {
            const testPoint = testCoordinates.testPoints[4]; // Large positive coordinates
            const result = mapCoordsToPixel(
                testPoint.mapCoords.x,
                testPoint.mapCoords.y,
                mapConfig
            );

            expect(result.x).toBeCloseTo(testPoint.expectedPixel.x, 1);
            expect(result.y).toBeCloseTo(testPoint.expectedPixel.y, 1);
        });

        it('should use correct resolution (0.05 meters/pixel)', () => {
            // 1 meter offset from origin should be 20 pixels (1 / 0.05 = 20)
            const mapX = mapConfig.origin.x + 1.0;
            const mapY = mapConfig.origin.y;

            const result = mapCoordsToPixel(mapX, mapY, mapConfig);

            expect(result.x).toBeCloseTo(20, 1);
            expect(result.y).toBeCloseTo(0, 1);
        });
    });

    describe('latLngToPixel (complete pipeline)', () => {
        it('should convert GPS coordinates directly to pixel coordinates', () => {
            const testPoint = testCoordinates.testPoints[0];
            const result = latLngToPixel(
                testPoint.gps.lat,
                testPoint.gps.lng,
                mapConfig
            );

            // This is the complete pipeline: GPS -> UTM -> Map -> Pixel
            // Allow larger tolerance due to cumulative floating point errors
            expect(result.x).toBeCloseTo(testPoint.expectedPixel.x, 0);
            expect(result.y).toBeCloseTo(testPoint.expectedPixel.y, 0);
        });

        it('should handle multiple GPS points in complete pipeline', () => {
            testCoordinates.testPoints.slice(0, 3).forEach((testPoint) => {
                const result = latLngToPixel(
                    testPoint.gps.lat,
                    testPoint.gps.lng,
                    mapConfig
                );

                expect(result.x).toBeCloseTo(testPoint.expectedPixel.x, 0);
                expect(result.y).toBeCloseTo(testPoint.expectedPixel.y, 0);
            });
        });

        it('should be consistent when called multiple times', () => {
            const testPoint = testCoordinates.testPoints[0];

            const result1 = latLngToPixel(testPoint.gps.lat, testPoint.gps.lng, mapConfig);
            const result2 = latLngToPixel(testPoint.gps.lat, testPoint.gps.lng, mapConfig);

            expect(result1.x).toBe(result2.x);
            expect(result1.y).toBe(result2.y);
        });
    });

    describe('Edge cases and validation', () => {
        it('should handle coordinates at map boundaries', () => {
            // Test at image edges
            const maxMapX = mapConfig.origin.x + (mapConfig.imageWidth * mapConfig.resolution);
            const maxMapY = mapConfig.origin.y + (mapConfig.imageHeight * mapConfig.resolution);

            const result = mapCoordsToPixel(maxMapX, maxMapY, mapConfig);

            expect(result.x).toBeCloseTo(mapConfig.imageWidth, 1);
            expect(result.y).toBeCloseTo(mapConfig.imageHeight, 1);
        });

        it('should handle coordinates outside map bounds (no clamping)', () => {
            // Coordinates outside the map should still be calculated (not clamped)
            const outsideX = mapConfig.origin.x - 10.0;
            const outsideY = mapConfig.origin.y - 10.0;

            const result = mapCoordsToPixel(outsideX, outsideY, mapConfig);

            // Should be negative pixels
            expect(result.x).toBeLessThan(0);
            expect(result.y).toBeLessThan(0);
        });

        it('should maintain precision for small coordinate changes', () => {
            const baseX = 10.0;
            const baseY = 10.0;
            const smallDelta = 0.05; // 1 pixel worth of movement

            const result1 = mapCoordsToPixel(baseX, baseY, mapConfig);
            const result2 = mapCoordsToPixel(baseX + smallDelta, baseY, mapConfig);

            // Should be exactly 1 pixel difference
            expect(result2.x - result1.x).toBeCloseTo(1.0, 1);
        });
    });

    describe('Path distance calculations', () => {
        it('should validate minimum path distance requirements', () => {
            testCoordinates.pathTestData.forEach((pathTest) => {
                const points = pathTest.points;

                if (points.length < 3) {
                    expect(pathTest.shouldPass).toBe(false);
                    return;
                }

                // Calculate total distance
                let totalDistance = 0;
                for (let i = 1; i < points.length; i++) {
                    const dx = points[i].x - points[i - 1].x;
                    const dy = points[i].y - points[i - 1].y;
                    totalDistance += Math.sqrt(dx * dx + dy * dy);
                }

                expect(totalDistance).toBeCloseTo(pathTest.totalDistance, 1);

                // Validate against 1 meter minimum
                if (totalDistance < 1.0) {
                    expect(pathTest.shouldPass).toBe(false);
                } else {
                    expect(pathTest.shouldPass).toBe(true);
                }
            });
        });
    });
});
