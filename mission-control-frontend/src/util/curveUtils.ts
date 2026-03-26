import { CatmullRomCurve3, Vector3 } from "three";
import { Point2 } from "../data/types";

/**
 * Extract control points from a path for Catmull-Rom curve editing
 * Uses simplified approach: sample N points evenly along the path
 * @param path - Array of UTM points
 * @param controlPointCount - Number of control points to extract (5-10 recommended)
 * @returns Array of sampled control points
 */
export function extractControlPoints(
    path: Point2[],
    controlPointCount: number
): Point2[] {
    if (path.length <= controlPointCount) {
        // If path has fewer points than requested, return all
        return path.map(p => ({ x: p.x, y: p.y }));
    }

    const controlPoints: Point2[] = [];
    const interval = (path.length - 1) / (controlPointCount - 1);

    for (let i = 0; i < controlPointCount; i++) {
        const index = Math.round(i * interval);
        controlPoints.push({ x: path[index].x, y: path[index].y });
    }

    return controlPoints;
}

/**
 * Create a Catmull-Rom curve from 2D UTM control points
 * @param controlPoints - Array of UTM control points
 * @returns CatmullRomCurve3 object
 */
export function createCatmullRomCurve(controlPoints: Point2[]): CatmullRomCurve3 {
    // Convert 2D points to Vector3 (z=0 for 2D path)
    const vectors = controlPoints.map(p => new Vector3(p.x, p.y, 0));

    // Create Catmull-Rom curve with centripetal parameterization
    // centripetal = smoother curves, avoids loops and cusps
    return new CatmullRomCurve3(vectors, false, "centripetal", 0.5);
}

/**
 * Get equally spaced points along a Catmull-Rom curve
 * Uses getPointAt() for equal spacing along arc length
 * @param curve - CatmullRomCurve3 object
 * @param pointCount - Number of points to sample
 * @returns Array of equally spaced UTM points
 */
export function getEquallySpacedPoints(
    curve: CatmullRomCurve3,
    pointCount: number
): Point2[] {
    const points: Point2[] = [];

    for (let i = 0; i < pointCount; i++) {
        // getPointAt uses arc length parameterization for equal spacing
        const t = i / (pointCount - 1);
        const vector = curve.getPointAt(t);
        points.push({ x: vector.x, y: vector.y });
    }

    return points;
}

/**
 * Update a single control point and regenerate curve
 * @param controlPoints - Current control points
 * @param index - Index of control point to update
 * @param newPosition - New position for control point
 * @returns Updated control points array
 */
export function updateControlPoint(
    controlPoints: Point2[],
    index: number,
    newPosition: Point2
): Point2[] {
    const updated = [...controlPoints];
    updated[index] = { x: newPosition.x, y: newPosition.y };
    return updated;
}

/**
 * Calculate curve length in meters
 * @param curve - CatmullRomCurve3 object
 * @returns Length in meters
 */
export function getCurveLength(curve: CatmullRomCurve3): number {
    return curve.getLength();
}
