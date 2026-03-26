import axios from "axios";
import { getAuthHeader } from "../../auth/authService";

const API_URL = "/api/v1/lidar-maps";

export interface GeorefPoint {
    point_id: number;
    timestamp: number;
    map_x: number;
    map_y: number;
    map_z: number;
    map_yaw: number;
    utm_x: number;
    utm_y: number;
    utm_z: number;
    utm_yaw: number;
}

export interface MapMetadata {
    resolution: number;
    origin: number[];
    negate: number;
    occupied_thresh: number;
    free_thresh: number;
    mode: string;
}

export interface LidarMap {
    id: string;
    name: string;
    s3FolderPath: string;
    map3dFileName: string;
    map2dPgmFileName: string;
    map2dYamlFileName: string;
    georefFileName: string;
    mapMetadata?: MapMetadata;
    georefPoints?: GeorefPoint[];
    status: "ready" | "mapping" | "failed";
    robotId?: string;
    fileSize?: number;
    createdAt: string;
    updatedAt: string;
}

export interface PresignedUrls {
    map2dPgm: string;
    map2dYaml: string;
    map3d: string;
    georef: string;
}

/**
 * Fetches all LIDAR maps
 * @returns List of all LIDAR maps with status "ready"
 */
export const getAllLidarMaps = async (): Promise<{ success: boolean; data: LidarMap[] }> => {
    const response = await axios.get(API_URL, {
        headers: getAuthHeader()
    });
    return response.data;
};

/**
 * Fetches a single LIDAR map by ID
 * @param id - LIDAR map ID
 * @returns LIDAR map data
 */
export const getLidarMapById = async (id: string): Promise<{ success: boolean; data: LidarMap }> => {
    const response = await axios.get(`${API_URL}/${id}`, {
        headers: getAuthHeader()
    });
    return response.data;
};

/**
 * Fetches a single LIDAR map by name
 * @param name - LIDAR map name
 * @returns LIDAR map data
 */
export const getLidarMapByName = async (name: string): Promise<{ success: boolean; data: LidarMap }> => {
    const response = await axios.get(`${API_URL}/name/${name}`, {
        headers: getAuthHeader()
    });
    return response.data;
};

/**
 * Gets pre-signed URLs for all files in a LIDAR map
 * @param id - LIDAR map ID
 * @returns Object containing pre-signed URLs for all files
 */
export const getAllPresignedUrls = async (
    id: string
): Promise<{ success: boolean; data: { urls: PresignedUrls; expiresIn: number } }> => {
    const response = await axios.get(`${API_URL}/${id}/all-presigned-urls`, {
        headers: getAuthHeader()
    });
    return response.data;
};

/**
 * Gets a pre-signed URL for a specific file
 * @param id - LIDAR map ID
 * @param fileName - File name to get URL for
 * @returns Pre-signed URL data
 */
export const getPresignedUrl = async (
    id: string,
    fileName: string
): Promise<{ success: boolean; data: { presignedUrl: string; expiresIn: number; fileName: string } }> => {
    const response = await axios.post(
        `${API_URL}/${id}/presigned-url`,
        { fileName },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

/**
 * Loads 2D map image from S3 using pre-signed URL
 * @param id - LIDAR map ID
 * @returns Blob of the image
 */
export const load2DMapImage = async (id: string): Promise<Blob> => {
    const urlsResponse = await getAllPresignedUrls(id);
    const pgmUrl = urlsResponse.data.urls.map2dPgm;

    const response = await axios.get(pgmUrl, {
        responseType: "blob"
    });

    return response.data;
};

/**
 * Loads map metadata from S3 using pre-signed URL
 * @param id - LIDAR map ID
 * @returns Map metadata
 */
export const loadMapMetadata = async (id: string): Promise<MapMetadata> => {
    const urlsResponse = await getAllPresignedUrls(id);
    const yamlUrl = urlsResponse.data.urls.map2dYaml;

    const response = await axios.get(yamlUrl, {
        responseType: "text"
    });

    // Parse YAML content
    const yamlContent = response.data;
    const resolutionMatch = yamlContent.match(/resolution:\s*([0-9.]+)/);
    const originMatch = yamlContent.match(/origin:\s*\[([-0-9., ]+)\]/);
    const negateMatch = yamlContent.match(/negate:\s*([0-9]+)/);
    const occupiedMatch = yamlContent.match(/occupied_thresh:\s*([0-9.]+)/);
    const freeMatch = yamlContent.match(/free_thresh:\s*([0-9.]+)/);
    const modeMatch = yamlContent.match(/mode:\s*(\w+)/);

    return {
        resolution: resolutionMatch ? parseFloat(resolutionMatch[1]) : 0.05,
        origin: originMatch ? originMatch[1].split(",").map((s: string) => parseFloat(s.trim())) : [0, 0, 0],
        negate: negateMatch ? parseInt(negateMatch[1]) : 0,
        occupied_thresh: occupiedMatch ? parseFloat(occupiedMatch[1]) : 0.65,
        free_thresh: freeMatch ? parseFloat(freeMatch[1]) : 0.25,
        mode: modeMatch ? modeMatch[1] : "trinary"
    };
};

/**
 * Loads georef points from S3 using pre-signed URL
 * @param id - LIDAR map ID
 * @returns Array of georef points
 */
export const loadGeorefPoints = async (id: string): Promise<GeorefPoint[]> => {
    const urlsResponse = await getAllPresignedUrls(id);
    const georefUrl = urlsResponse.data.urls.georef;

    const response = await axios.get(georefUrl);

    return response.data.reference_points || [];
};
