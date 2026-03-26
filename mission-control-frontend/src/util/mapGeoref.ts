import { latLngToUtm } from "./geoUtils";

// Reference points from georef_points.json
const referencePoints = [
    { map_x: -0.002923191, map_y: -0.000016787, utm_x: 799060.375, utm_y: 1413460.75 },
    { map_x: 8.656360626, map_y: 3.815798044, utm_x: 799051.5, utm_y: 1413462.5 },
    { map_x: 17.257387161, map_y: 8.831051826, utm_x: 799041.5, utm_y: 1413463.375 },
    { map_x: 25.626321793, map_y: 14.230302811, utm_x: 799031.4375, utm_y: 1413463.75 },
    { map_x: 40.954322815, map_y: 23.324380875, utm_x: 799013.6875, utm_y: 1413464.875 },
    { map_x: 49.111412048, map_y: 28.954713821, utm_x: 799003.8125, utm_y: 1413464.875 },
    { map_x: 57.547939301, map_y: 34.175098419, utm_x: 798993.9375, utm_y: 1413465.375 },
    { map_x: 66.019744873, map_y: 39.380386353, utm_x: 798983.75, utm_y: 1413465.875 },
    { map_x: 74.822113037, map_y: 43.901348114, utm_x: 798974.125, utm_y: 1413467.125 },
    { map_x: 83.558792114, map_y: 48.412055969, utm_x: 798964.1875, utm_y: 1413468.375 }
];

// Map configuration from dlio_map_2d.yaml
export interface MapConfig {
    resolution: number; // meters per pixel
    origin: { x: number; y: number }; // meters
    imageWidth: number;
    imageHeight: number;
}

// Affine transformation parameters
// Computed using least squares fit from reference points
interface AffineTransform {
    a: number;
    b: number;
    c: number;
    d: number;
    tx: number;
    ty: number;
}

/**
 * Compute affine transformation from UTM to local map coordinates
 * using least squares fit on reference points.
 *
 * Transform: [map_x, map_y] = [a*utm_x + b*utm_y + tx, c*utm_x + d*utm_y + ty]
 */
function computeAffineTransform(): AffineTransform {
    const n = referencePoints.length;

    // Build matrices for least squares: A * params = B
    let sumUtmX = 0, sumUtmY = 0, sumUtmX2 = 0, sumUtmY2 = 0, sumUtmXY = 0;
    let sumMapX = 0, sumMapY = 0;
    let sumUtmXMapX = 0, sumUtmYMapX = 0;
    let sumUtmXMapY = 0, sumUtmYMapY = 0;

    for (const pt of referencePoints) {
        sumUtmX += pt.utm_x;
        sumUtmY += pt.utm_y;
        sumUtmX2 += pt.utm_x * pt.utm_x;
        sumUtmY2 += pt.utm_y * pt.utm_y;
        sumUtmXY += pt.utm_x * pt.utm_y;
        sumMapX += pt.map_x;
        sumMapY += pt.map_y;
        sumUtmXMapX += pt.utm_x * pt.map_x;
        sumUtmYMapX += pt.utm_y * pt.map_x;
        sumUtmXMapY += pt.utm_x * pt.map_y;
        sumUtmYMapY += pt.utm_y * pt.map_y;
    }

    // Solve for X direction (map_x = a*utm_x + b*utm_y + tx)
    const denominator = n * (sumUtmX2 * sumUtmY2 - sumUtmXY * sumUtmXY) -
                       sumUtmX * (sumUtmX * sumUtmY2 - sumUtmY * sumUtmXY) +
                       sumUtmY * (sumUtmX * sumUtmXY - sumUtmY * sumUtmX2);

    const a = (n * (sumUtmXMapX * sumUtmY2 - sumUtmYMapX * sumUtmXY) -
              sumUtmX * (sumMapX * sumUtmY2 - sumUtmY * sumUtmYMapX) +
              sumUtmY * (sumMapX * sumUtmXY - sumUtmY * sumUtmXMapX)) / denominator;

    const b = (n * (sumUtmX2 * sumUtmYMapX - sumUtmXY * sumUtmXMapX) -
              sumUtmX * (sumUtmX * sumUtmYMapX - sumUtmY * sumUtmXMapX) +
              sumUtmY * (sumUtmX * sumUtmXMapX - sumMapX * sumUtmX2)) / denominator;

    const tx = (sumMapX - a * sumUtmX - b * sumUtmY) / n;

    // Solve for Y direction (map_y = c*utm_x + d*utm_y + ty)
    const c = (n * (sumUtmXMapY * sumUtmY2 - sumUtmYMapY * sumUtmXY) -
              sumUtmX * (sumMapY * sumUtmY2 - sumUtmY * sumUtmYMapY) +
              sumUtmY * (sumMapY * sumUtmXY - sumUtmY * sumUtmXMapY)) / denominator;

    const d = (n * (sumUtmX2 * sumUtmYMapY - sumUtmXY * sumUtmXMapY) -
              sumUtmX * (sumUtmX * sumUtmYMapY - sumUtmY * sumUtmXMapY) +
              sumUtmY * (sumUtmX * sumUtmXMapY - sumMapY * sumUtmX2)) / denominator;

    const ty = (sumMapY - c * sumUtmX - d * sumUtmY) / n;

    return { a, b, c, d, tx, ty };
}

// Pre-compute the affine transformation
const affineTransform = computeAffineTransform();

/**
 * Convert UTM coordinates to local map coordinates (meters)
 */
export function utmToMapCoords(utmX: number, utmY: number): { x: number; y: number } {
    const { a, b, c, d, tx, ty } = affineTransform;
    return {
        x: a * utmX + b * utmY + tx,
        y: c * utmX + d * utmY + ty
    };
}

/**
 * Convert local map coordinates (meters) to pixel coordinates
 */
export function mapCoordsToPixel(
    mapX: number,
    mapY: number,
    mapConfig: MapConfig
): { x: number; y: number } {
    // Map coordinates are in meters from the origin
    // Pixel coordinates: (mapX - origin.x) / resolution
    const pixelX = (mapX - mapConfig.origin.x) / mapConfig.resolution;
    const pixelY = (mapY - mapConfig.origin.y) / mapConfig.resolution;

    return { x: pixelX, y: pixelY };
}

/**
 * Convert lat/lng to pixel coordinates on the LIDAR map
 */
export function latLngToPixel(
    lat: number,
    lng: number,
    mapConfig: MapConfig
): { x: number; y: number } {
    // Step 1: Convert lat/lng to UTM
    const { easting, northing } = latLngToUtm(lat, lng);

    // Step 2: Convert UTM to local map coordinates
    const mapCoords = utmToMapCoords(easting, northing);

    // Step 3: Convert local map coordinates to pixel coordinates
    return mapCoordsToPixel(mapCoords.x, mapCoords.y, mapConfig);
}
