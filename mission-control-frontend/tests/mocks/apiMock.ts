import { vi } from 'vitest';
import { PathMap, Station, Paths, Boundary, Obstacle } from '../../src/data/types';

// Mock API responses
export const mockPathMaps: PathMap[] = [];

// Create mock API functions
export const createMockPathMapApi = () => {
    let pathMaps = [...mockPathMaps];
    let idCounter = 1;

    const createPathMapFn = vi.fn(async (
        name: string,
        owner: string,
        frame: string,
        lidarMapName?: string
    ): Promise<{ createdPathMap: PathMap }> => {
        const newPathMap: PathMap = {
            id: `pathmap-${idCounter++}`,
            name,
            owner,
            frame,
            lidarMapName: lidarMapName || null,
            stations: [],
            paths: {},
            boundaries: [],
            obstacles: [],
            missions: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        pathMaps.push(newPathMap);
        return { createdPathMap: newPathMap };
    });

    const fetchPathMaps = vi.fn(async (): Promise<PathMap[]> => {
        return pathMaps;
    });

    const fetchPathMapById = vi.fn(async (id: string): Promise<PathMap> => {
        const pathMap = pathMaps.find(pm => pm.id === id);
        if (!pathMap) {
            throw new Error(`PathMap with id ${id} not found`);
        }
        return pathMap;
    });

    const updatePathMapFn = vi.fn(async (
        paths: Paths,
        stations: Station[],
        pathMapId: string
    ): Promise<PathMap> => {
        const pathMap = pathMaps.find(pm => pm.id === pathMapId);
        if (!pathMap) {
            throw new Error(`PathMap with id ${pathMapId} not found`);
        }

        pathMap.paths = paths;
        pathMap.stations = stations;
        pathMap.updatedAt = new Date().toISOString();

        return pathMap;
    });

    const deletePathMapFn = vi.fn(async (pathMapId: string): Promise<void> => {
        pathMaps = pathMaps.filter(pm => pm.id !== pathMapId);
    });

    const addBoundaryFn = vi.fn(async (
        boundaries: Boundary[],
        obstacles: Obstacle[],
        pathMapId: string
    ): Promise<PathMap> => {
        const pathMap = pathMaps.find(pm => pm.id === pathMapId);
        if (!pathMap) {
            throw new Error(`PathMap with id ${pathMapId} not found`);
        }

        pathMap.boundaries = boundaries;
        pathMap.obstacles = obstacles;
        pathMap.updatedAt = new Date().toISOString();

        return pathMap;
    });

    const reset = () => {
        pathMaps = [];
        idCounter = 1;
    };

    return {
        createPathMapFn,
        fetchPathMaps,
        fetchPathMapById,
        updatePathMapFn,
        deletePathMapFn,
        addBoundaryFn,
        reset,
        getPathMaps: () => pathMaps
    };
};
