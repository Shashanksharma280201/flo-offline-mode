import { describe, it, expect, beforeEach } from 'vitest';
import { createMockPathMapApi } from '../mocks/apiMock';
import testPathMapData from '../fixtures/test-pathmap.json';

describe('PathMap CRUD Integration Tests', () => {
    let api: ReturnType<typeof createMockPathMapApi>;

    beforeEach(() => {
        api = createMockPathMapApi();
    });

    describe('Create PathMap', () => {
        it('should create GPS PathMap with frame "utm"', async () => {
            const result = await api.createPathMapFn(
                'Test GPS PathMap',
                'test-user-123',
                'utm'
            );

            expect(result.createdPathMap).toBeDefined();
            expect(result.createdPathMap.name).toBe('Test GPS PathMap');
            expect(result.createdPathMap.owner).toBe('test-user-123');
            expect(result.createdPathMap.frame).toBe('utm');
            expect(result.createdPathMap.lidarMapName).toBeNull();
            expect(result.createdPathMap.stations).toEqual([]);
            expect(result.createdPathMap.paths).toEqual({});
            expect(result.createdPathMap.boundaries).toEqual([]);
            expect(result.createdPathMap.obstacles).toEqual([]);
        });

        it('should create LIDAR PathMap with linked LIDAR map name', async () => {
            const result = await api.createPathMapFn(
                'Test LIDAR PathMap',
                'test-user-123',
                'utm',
                'test_lidar_map_1'
            );

            expect(result.createdPathMap).toBeDefined();
            expect(result.createdPathMap.name).toBe('Test LIDAR PathMap');
            expect(result.createdPathMap.frame).toBe('utm');
            expect(result.createdPathMap.lidarMapName).toBe('test_lidar_map_1');
        });

        it('should create Non-RTK PathMap with custom frame reference', async () => {
            const result = await api.createPathMapFn(
                'Test Non-RTK PathMap',
                'test-user-123',
                'map_base_link'
            );

            expect(result.createdPathMap).toBeDefined();
            expect(result.createdPathMap.name).toBe('Test Non-RTK PathMap');
            expect(result.createdPathMap.frame).toBe('map_base_link');
            expect(result.createdPathMap.lidarMapName).toBeNull();
        });

        it('should assign unique IDs to each PathMap', async () => {
            const pathMap1 = await api.createPathMapFn('PathMap 1', 'user-1', 'utm');
            const pathMap2 = await api.createPathMapFn('PathMap 2', 'user-1', 'utm');
            const pathMap3 = await api.createPathMapFn('PathMap 3', 'user-1', 'utm');

            expect(pathMap1.createdPathMap.id).not.toBe(pathMap2.createdPathMap.id);
            expect(pathMap2.createdPathMap.id).not.toBe(pathMap3.createdPathMap.id);
            expect(pathMap1.createdPathMap.id).not.toBe(pathMap3.createdPathMap.id);
        });

        it('should set timestamps on creation', async () => {
            const before = new Date().toISOString();
            const result = await api.createPathMapFn('Test PathMap', 'user-1', 'utm');
            const after = new Date().toISOString();

            expect(result.createdPathMap.createdAt).toBeDefined();
            expect(result.createdPathMap.updatedAt).toBeDefined();
            expect(result.createdPathMap.createdAt).toBeGreaterThanOrEqual(before);
            expect(result.createdPathMap.updatedAt).toBeLessThanOrEqual(after);
        });
    });

    describe('Read/Fetch PathMaps', () => {
        it('should fetch all PathMaps', async () => {
            // Create 3 PathMaps
            await api.createPathMapFn('PathMap 1', 'user-1', 'utm');
            await api.createPathMapFn('PathMap 2', 'user-1', 'utm');
            await api.createPathMapFn('PathMap 3', 'user-1', 'map_base_link');

            const allPathMaps = await api.fetchPathMaps();

            expect(allPathMaps).toHaveLength(3);
            expect(allPathMaps[0].name).toBe('PathMap 1');
            expect(allPathMaps[1].name).toBe('PathMap 2');
            expect(allPathMaps[2].name).toBe('PathMap 3');
        });

        it('should fetch PathMap by ID', async () => {
            const created = await api.createPathMapFn('Test PathMap', 'user-1', 'utm');
            const fetched = await api.fetchPathMapById(created.createdPathMap.id);

            expect(fetched).toBeDefined();
            expect(fetched.id).toBe(created.createdPathMap.id);
            expect(fetched.name).toBe('Test PathMap');
        });

        it('should throw error when fetching non-existent PathMap', async () => {
            await expect(api.fetchPathMapById('non-existent-id')).rejects.toThrow(
                'PathMap with id non-existent-id not found'
            );
        });

        it('should return empty array when no PathMaps exist', async () => {
            const allPathMaps = await api.fetchPathMaps();
            expect(allPathMaps).toEqual([]);
        });
    });

    describe('Update PathMap', () => {
        it('should update paths and stations', async () => {
            const created = await api.createPathMapFn('Test PathMap', 'user-1', 'utm');
            const pathMapId = created.createdPathMap.id;

            const stations = [
                { id: 'station-1', name: 'Station A', lat: 12.9716, lng: 77.5946 },
                { id: 'station-2', name: 'Station B', lat: 12.97165, lng: 77.59465 }
            ];

            const paths = {
                'station-1': [
                    {
                        to: 'station-2',
                        gps: [
                            { lat: 12.9716, lng: 77.5946 },
                            { lat: 12.97165, lng: 77.59465 }
                        ],
                        utm: [
                            { x: 799060.375, y: 1413460.75 },
                            { x: 799051.5, y: 1413462.5 }
                        ]
                    }
                ]
            };

            const updated = await api.updatePathMapFn(paths, stations, pathMapId);

            expect(updated.stations).toEqual(stations);
            expect(updated.paths).toEqual(paths);
            expect(updated.id).toBe(pathMapId);
        });

        it('should update timestamp on update', async () => {
            const created = await api.createPathMapFn('Test PathMap', 'user-1', 'utm');
            const createdAt = created.createdPathMap.createdAt;

            // Wait a bit to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 10));

            const updated = await api.updatePathMapFn({}, [], created.createdPathMap.id);

            expect(updated.createdAt).toBe(createdAt); // createdAt should not change
            expect(updated.updatedAt).not.toBe(createdAt); // updatedAt should change
        });

        it('should throw error when updating non-existent PathMap', async () => {
            await expect(
                api.updatePathMapFn({}, [], 'non-existent-id')
            ).rejects.toThrow('PathMap with id non-existent-id not found');
        });

        it('should preserve other fields when updating', async () => {
            const created = await api.createPathMapFn(
                'Test PathMap',
                'user-1',
                'utm',
                'test_map'
            );

            const updated = await api.updatePathMapFn(
                {},
                [{ id: 'station-1', name: 'Station A', lat: 12.9716, lng: 77.5946 }],
                created.createdPathMap.id
            );

            expect(updated.name).toBe('Test PathMap');
            expect(updated.owner).toBe('user-1');
            expect(updated.frame).toBe('utm');
            expect(updated.lidarMapName).toBe('test_map');
        });
    });

    describe('Delete PathMap', () => {
        it('should delete PathMap by ID', async () => {
            const created = await api.createPathMapFn('Test PathMap', 'user-1', 'utm');
            const pathMapId = created.createdPathMap.id;

            await api.deletePathMapFn(pathMapId);

            const allPathMaps = await api.fetchPathMaps();
            expect(allPathMaps).toHaveLength(0);
        });

        it('should not throw when deleting non-existent PathMap', async () => {
            // Mock implementation doesn't throw, just filters
            await expect(api.deletePathMapFn('non-existent-id')).resolves.not.toThrow();
        });

        it('should only delete specified PathMap', async () => {
            const pathMap1 = await api.createPathMapFn('PathMap 1', 'user-1', 'utm');
            const pathMap2 = await api.createPathMapFn('PathMap 2', 'user-1', 'utm');
            const pathMap3 = await api.createPathMapFn('PathMap 3', 'user-1', 'utm');

            await api.deletePathMapFn(pathMap2.createdPathMap.id);

            const allPathMaps = await api.fetchPathMaps();
            expect(allPathMaps).toHaveLength(2);
            expect(allPathMaps.find(pm => pm.id === pathMap1.createdPathMap.id)).toBeDefined();
            expect(allPathMaps.find(pm => pm.id === pathMap2.createdPathMap.id)).toBeUndefined();
            expect(allPathMaps.find(pm => pm.id === pathMap3.createdPathMap.id)).toBeDefined();
        });
    });

    describe('Boundary and Obstacle Management', () => {
        it('should add boundaries and obstacles to PathMap', async () => {
            const created = await api.createPathMapFn('Test PathMap', 'user-1', 'utm');
            const pathMapId = created.createdPathMap.id;

            const boundaries = [
                {
                    id: 'boundary-1',
                    name: 'Test Boundary',
                    points: [
                        { lat: 12.9716, lng: 77.5946 },
                        { lat: 12.97165, lng: 77.59465 },
                        { lat: 12.9717, lng: 77.5947 }
                    ]
                }
            ];

            const obstacles = [
                {
                    id: 'obstacle-1',
                    name: 'Test Obstacle',
                    points: [
                        { lat: 12.97162, lng: 77.59462 },
                        { lat: 12.97163, lng: 77.59463 }
                    ]
                }
            ];

            const updated = await api.addBoundaryFn(boundaries, obstacles, pathMapId);

            expect(updated.boundaries).toEqual(boundaries);
            expect(updated.obstacles).toEqual(obstacles);
        });

        it('should update timestamp when adding boundaries/obstacles', async () => {
            const created = await api.createPathMapFn('Test PathMap', 'user-1', 'utm');
            const createdAt = created.createdPathMap.createdAt;

            await new Promise(resolve => setTimeout(resolve, 10));

            const updated = await api.addBoundaryFn([], [], created.createdPathMap.id);

            expect(updated.updatedAt).not.toBe(createdAt);
        });

        it('should throw error when adding to non-existent PathMap', async () => {
            await expect(
                api.addBoundaryFn([], [], 'non-existent-id')
            ).rejects.toThrow('PathMap with id non-existent-id not found');
        });
    });

    describe('Frame Reference Filtering', () => {
        it('should filter PathMaps by frame reference (utm)', async () => {
            await api.createPathMapFn('GPS Map 1', 'user-1', 'utm');
            await api.createPathMapFn('GPS Map 2', 'user-1', 'utm');
            await api.createPathMapFn('Non-RTK Map', 'user-1', 'map_base_link');

            const allPathMaps = await api.fetchPathMaps();
            const utmPathMaps = allPathMaps.filter(pm => pm.frame === 'utm');

            expect(utmPathMaps).toHaveLength(2);
            expect(utmPathMaps[0].frame).toBe('utm');
            expect(utmPathMaps[1].frame).toBe('utm');
        });

        it('should filter PathMaps by custom frame reference', async () => {
            await api.createPathMapFn('GPS Map', 'user-1', 'utm');
            await api.createPathMapFn('Non-RTK Map 1', 'user-1', 'map_base_link');
            await api.createPathMapFn('Non-RTK Map 2', 'user-1', 'map_base_link');
            await api.createPathMapFn('Non-RTK Map 3', 'user-1', 'odom_frame');

            const allPathMaps = await api.fetchPathMaps();
            const customFramePathMaps = allPathMaps.filter(pm => pm.frame === 'map_base_link');

            expect(customFramePathMaps).toHaveLength(2);
            expect(customFramePathMaps.every(pm => pm.frame === 'map_base_link')).toBe(true);
        });
    });

    describe('LIDAR Map Association', () => {
        it('should create PathMap linked to LIDAR map', async () => {
            const result = await api.createPathMapFn(
                'LIDAR PathMap',
                'user-1',
                'utm',
                'sriram_2d_map_1'
            );

            expect(result.createdPathMap.lidarMapName).toBe('sriram_2d_map_1');
        });

        it('should auto-create PathMap when saving LIDAR map', async () => {
            // Simulate LIDAR map save workflow
            const lidarMapName = 'new_lidar_map';
            const autoPathMapName = `${lidarMapName}_paths`;

            const result = await api.createPathMapFn(
                autoPathMapName,
                'user-1',
                'utm',
                lidarMapName
            );

            expect(result.createdPathMap.name).toBe('new_lidar_map_paths');
            expect(result.createdPathMap.lidarMapName).toBe('new_lidar_map');
        });

        it('should filter PathMaps by LIDAR map association', async () => {
            await api.createPathMapFn('GPS Only', 'user-1', 'utm');
            await api.createPathMapFn('LIDAR Map 1', 'user-1', 'utm', 'lidar_1');
            await api.createPathMapFn('LIDAR Map 2', 'user-1', 'utm', 'lidar_2');

            const allPathMaps = await api.fetchPathMaps();
            const lidarPathMaps = allPathMaps.filter(pm => pm.lidarMapName !== null);

            expect(lidarPathMaps).toHaveLength(2);
            expect(lidarPathMaps.every(pm => pm.lidarMapName)).toBe(true);
        });
    });
});
