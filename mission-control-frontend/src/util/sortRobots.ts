import { RobotType } from "@/data/types";

/**
 * Natural sort function that handles numeric values within strings
 * Example: "MMR-1", "MMR-2", "MMR-10" will be sorted correctly (not "MMR-1", "MMR-10", "MMR-2")
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns Comparison result for sorting
 */
export const naturalSort = (a: string, b: string): number => {
    return a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: "base"
    });
};

/**
 * Sorts robots by their names using natural sorting
 * This ensures robots like MMR-1, MMR-2, MMR-10 are sorted numerically
 *
 * @param a - First robot
 * @param b - Second robot
 * @returns Comparison result for sorting
 */
export const sortRobotsByName = (a: RobotType, b: RobotType): number => {
    return naturalSort(a.name, b.name);
};
