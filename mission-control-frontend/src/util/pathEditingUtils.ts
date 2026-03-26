import { Boundary, Obstacle, Point2 } from "../data/types";
import { isPointInPolygon } from "./geoUtils";

export interface ValidationResult {
    valid: boolean;
    reason?: string;
}

export interface MultiPointValidationResult {
    valid: boolean;
    reason?: string;
    invalidPointIndices: number[];
}

/**
 * Validate if a point can be placed at a given position
 * Checks against boundaries and obstacles
 * @param point - Point to validate
 * @param boundaries - Array of boundary polygons
 * @param obstacles - Array of obstacle polygons
 * @returns Validation result with reason if invalid
 */
export function validatePathPoint(
    point: Point2,
    boundaries: Boundary[],
    obstacles: Obstacle[]
): ValidationResult {
    // Check if inside boundary
    if (boundaries.length > 0) {
        let insideBoundary = false;

        for (const boundary of boundaries) {
            if (isPointInPolygon(point, boundary.utm)) {
                insideBoundary = true;
                break;
            }
        }

        if (!insideBoundary) {
            return { valid: false, reason: "Point outside boundary" };
        }
    }

    // Check if inside any obstacle
    for (const obstacle of obstacles) {
        if (isPointInPolygon(point, obstacle.utm)) {
            return { valid: false, reason: "Point inside obstacle" };
        }
    }

    return { valid: true };
}

/**
 * Validate all adjusted points in a path
 * Used for rope-like adjustment validation
 * @param adjustedPoints - Array of all adjusted path points
 * @param boundaries - Array of boundary polygons
 * @param obstacles - Array of obstacle polygons
 * @returns Validation result with indices of invalid points
 */
export function validateAllPathPoints(
    adjustedPoints: Point2[],
    boundaries: Boundary[],
    obstacles: Obstacle[]
): MultiPointValidationResult {
    const invalidIndices: number[] = [];

    for (let i = 0; i < adjustedPoints.length; i++) {
        const point = adjustedPoints[i];
        const validation = validatePathPoint(point, boundaries, obstacles);

        if (!validation.valid) {
            invalidIndices.push(i);
        }
    }

    if (invalidIndices.length > 0) {
        const plural = invalidIndices.length > 1 ? "points" : "point";
        return {
            valid: false,
            reason: `${invalidIndices.length} ${plural} violate boundary/obstacle constraints`,
            invalidPointIndices: invalidIndices
        };
    }

    return {
        valid: true,
        invalidPointIndices: []
    };
}
