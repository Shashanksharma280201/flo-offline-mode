import { MathUtils, Vector3 } from "three";
import { LatLngAltitudeLiteral } from "../data/types";
import proj4 from "proj4";

// shorthands for math-functions, makes equations more readable
const { sin, cos, pow, sqrt, atan2, asin, sign } = Math;
const { degToRad, radToDeg, euclideanModulo } = MathUtils;

const EARTH_RADIUS_METERS = 6371008.8;

/**
 * Returns the true bearing (=compass direction) of the point from the origin.
 * @param point
 */
function getTrueBearing(point: Vector3): number {
    return euclideanModulo(90 - radToDeg(atan2(point.y, point.x)), 360);
}

/**
 * Computes the distance in meters between two coordinates using the
 * haversine formula.
 * @param from
 * @param to
 */
export function distanceBetweenLatLng(
    from: google.maps.LatLngLiteral,
    to: google.maps.LatLngLiteral
): number {
    const { lat: latFrom, lng: lngFrom } = from;
    const { lat: latTo, lng: lngTo } = to;

    const dLat = degToRad(latTo - latFrom);
    const dLon = degToRad(lngTo - lngFrom);
    const lat1 = degToRad(latFrom);
    const lat2 = degToRad(latTo);

    const a =
        pow(sin(dLat / 2), 2) + pow(sin(dLon / 2), 2) * cos(lat1) * cos(lat2);

    return (
        Math.round(
            2 * atan2(sqrt(a), sqrt(1 - a)) * EARTH_RADIUS_METERS * 100000
        ) / 100000
    );
}

/**
 * Computes a destination-point from a geographic origin, distance
 * and true bearing.
 * @param origin
 * @param distance
 * @param bearing
 * @param target optional target to write the result to
 */
function destination(
    origin: google.maps.LatLngLiteral,
    distance: number,
    bearing: number,
    target: google.maps.LatLngLiteral = { lat: 0, lng: 0 }
): google.maps.LatLngLiteral {
    const lngOrigin = degToRad(origin.lng);
    const latOrigin = degToRad(origin.lat);

    const bearingRad = degToRad(bearing);
    const radians = distance / EARTH_RADIUS_METERS;

    const latDestination = asin(
        sin(latOrigin) * cos(radians) +
            cos(latOrigin) * sin(radians) * cos(bearingRad)
    );
    const lngDestination =
        lngOrigin +
        atan2(
            sin(bearingRad) * sin(radians) * cos(latOrigin),
            cos(radians) - sin(latOrigin) * sin(latDestination)
        );

    target.lat = radToDeg(latDestination);
    target.lng = radToDeg(lngDestination);

    return target;
}

/**
 * Converts a point given in lat/lng or lat/lng/altitude-format to world-space coordinates.
 * @param point
 * @param reference
 * @param target optional target to write the result to
 */
export function latLngAltToVector3(
    point: LatLngAltitudeLiteral | google.maps.LatLngLiteral,
    reference: LatLngAltitudeLiteral,
    target: Vector3 = new Vector3()
): Vector3 {
    const dx = distanceBetweenLatLng(reference, {
        lng: point.lng,
        lat: reference.lat
    });
    const dy = distanceBetweenLatLng(reference, {
        lng: reference.lng,
        lat: point.lat
    });

    const sx = sign(point.lng - reference.lng);
    const sy = sign(point.lat - reference.lat);

    const { altitude = 0 } = <LatLngAltitudeLiteral>point;

    return target.set(sx * dx, sy * dy, altitude);
}

/**
 * Converts a point given in world-space coordinates into geographic format.
 * @param point
 * @param sceneAnchor
 * @param target optional target to write the result to
 */
export function vector3ToLatLngAlt(
    point: Vector3,
    sceneAnchor: LatLngAltitudeLiteral,
    target: LatLngAltitudeLiteral = { lat: 0, lng: 0, altitude: 0 }
): LatLngAltitudeLiteral {
    const distance = point.length();
    const bearing = getTrueBearing(point);

    destination(sceneAnchor, distance, bearing, target);
    target.altitude = point.z;

    return target;
}

export function distanceBetweenUTM(
    from: { x: number; y: number },
    to: { x: number; y: number }
): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    // Euclidean distance formula
    return Math.sqrt(dx * dx + dy * dy);
}

const utmProjection = "+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs";
const wgs84Projection = "+proj=longlat +datum=WGS84 +no_defs";

export function utmToLatLng(easting: number, northing: number) {
    const [lng, lat] = proj4(utmProjection, wgs84Projection, [
        easting,
        northing
    ]);
    return { lat, lng };
}

export function latLngToUtm(lat: number, lng: number) {
    const [easting, northing] = proj4(wgs84Projection, utmProjection, [
        lng,
        lat
    ]);
    return { easting, northing };
}

/**
 * Check if a point is inside a polygon using ray-casting algorithm
 * @param point - Point to check {x, y}
 * @param polygon - Array of polygon vertices {x, y}
 * @returns true if point is inside polygon
 */
export function isPointInPolygon(
    point: { x: number; y: number },
    polygon: { x: number; y: number }[]
): boolean {
    if (polygon.length < 3) return false;

    let inside = false;
    const x = point.x;
    const y = point.y;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x;
        const yi = polygon[i].y;
        const xj = polygon[j].x;
        const yj = polygon[j].y;

        const intersect =
            yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

        if (intersect) inside = !inside;
    }

    return inside;
}

/**
 * Sample evenly-spaced points along a path
 * @param path - Array of UTM points
 * @param count - Number of points to sample
 * @returns Array of sampled point indices
 */
export function samplePathPoints(
    path: { x: number; y: number }[],
    count: number
): number[] {
    if (path.length <= count) {
        // Return all indices if path has fewer points than requested
        return path.map((_, index) => index);
    }

    const indices: number[] = [];
    const interval = (path.length - 1) / (count - 1);

    for (let i = 0; i < count; i++) {
        const index = Math.round(i * interval);
        indices.push(index);
    }

    return indices;
}

/**
 * Calculate total path length in meters
 * @param path - Array of UTM points
 * @returns Total length in meters
 */
export function calculatePathLength(path: { x: number; y: number }[]): number {
    let totalLength = 0;

    for (let i = 1; i < path.length; i++) {
        totalLength += distanceBetweenUTM(path[i - 1], path[i]);
    }

    return totalLength;
}

/**
 * Calculate influence radius based on map zoom level
 * @param zoomLevel - Google Maps zoom level (13-22)
 * @returns Influence radius in number of points
 */
export function calculateInfluenceRadius(zoomLevel: number): number {
    if (zoomLevel >= 21) {
        // Max zoom in: precise, localized edits
        return 2;
    } else if (zoomLevel >= 19) {
        // High zoom: 3-4 points
        return 3;
    } else if (zoomLevel >= 17) {
        // Medium zoom: 4-5 points
        return 5;
    } else if (zoomLevel >= 15) {
        // Low zoom: 6-7 points
        return 7;
    } else {
        // Max zoom out: smooth, rope-like flow
        return 8;
    }
}

/**
 * Apply Gaussian falloff to calculate influence factor
 * Uses formula: f(d) = e^(-(d²)/(2σ²))
 * where σ = radius / 2
 *
 * @param distance - Distance from dragged point (in point indices)
 * @param radius - Influence radius
 * @returns Influence factor between 0 and 1
 */
export function calculateGaussianFalloff(distance: number, radius: number): number {
    if (distance === 0) return 1.0; // Dragged point has 100% influence
    if (distance > radius) return 0; // Beyond radius has no influence

    const sigma = radius / 2; // Standard deviation
    const exponent = -(distance * distance) / (2 * sigma * sigma);
    const influence = Math.exp(exponent);

    // Ignore very small influences (< 5%)
    return influence < 0.05 ? 0 : influence;
}

/**
 * Apply rope-like adjustment to a path point based on Gaussian falloff
 * @param delta - Movement delta {x, y}
 * @param distance - Distance from dragged point (in indices)
 * @param radius - Influence radius
 * @returns Adjusted delta with Gaussian falloff applied
 */
export function applyGaussianAdjustment(
    delta: { x: number; y: number },
    distance: number,
    radius: number
): { x: number; y: number } {
    const influence = calculateGaussianFalloff(distance, radius);

    return {
        x: delta.x * influence,
        y: delta.y * influence
    };
}
