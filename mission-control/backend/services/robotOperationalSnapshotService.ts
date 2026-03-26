import dayjs from "dayjs";
import mongoose from "mongoose";
import attendanceModel from "../models/attendanceModel";
import appDataModel from "../models/appDataModel";
import OvertimeSessionModel from "../models/overtimeSessionModel";
import robotModel from "../models/robotModel";
import logger from "../utils/logger";
import { redisClient } from "./redis";

export interface SnapshotFreshnessInputs {
  attendanceAt?: Date;
  appDataAt?: Date;
  downtimeAt?: Date;
  robotAt?: Date;
}

export interface RobotOperationalSnapshotPayload {
  robotId: string;
  cycleEfficiency: number | null;
  cycleEfficiencyWindow: "current_shift" | "last_closed_shift" | "unknown";
  currentShiftTripCount: number;
  currentShiftRunningTimeMs: number;
  currentShiftIdleTimeMs: number;
  currentShiftDownTimeMs: number;
  staffingCoverageState:
    | "unassigned"
    | "assigned_not_checked_in"
    | "covered"
    | "overtime_risk"
    | "auto_checkout_risk"
    | "unknown";
  maintenanceOverdueDays: number;
  maintenanceState: "ok" | "overdue" | "critical" | "unknown";
  insufficientPartsCount: number;
  bomCompletionStatus: "complete" | "incomplete" | "unknown";
  bomState: "ok" | "incomplete" | "insufficient_parts" | "unknown";
  snapshotAt: Date;
  inputsFreshness: SnapshotFreshnessInputs;
}

type StaffingCoverageState =
  | "unassigned"
  | "assigned_not_checked_in"
  | "covered"
  | "overtime_risk"
  | "auto_checkout_risk"
  | "unknown";

type MaintenanceState = "ok" | "overdue" | "critical" | "unknown";
type BomState = "ok" | "incomplete" | "insufficient_parts" | "unknown";
type OperationalSnapshotSection = "maintenance" | "bom" | "staffing" | "cycle";

type CycleAggregation = {
  tripCount: number;
  runningTimeMs: number;
  idleTimeMs: number;
  downTimeMs: number;
  loadingDurationMs: number;
  unloadingDurationMs: number;
  returnTripDurationMs: number;
  latestTimestamp?: Date;
};

type SnapshotRobotSource = {
  _id: string;
  updatedAt: Date;
  maintenance?: {
    lastMaintenance?: number;
  };
  manufacturingData?: {
    bomCompletionStatus?: string;
    partsConsumed?: Array<{
      inventoryStatus?: string;
      source?: string;
    }>;
  };
  operatorSnapshot?: {
    id?: string;
    checkedInToday?: boolean;
    lastCheckInTime?: Date;
  };
  clientSnapshot?: unknown;
};

const OPERATIONAL_SNAPSHOT_KEY_PREFIX = "robot:operational-snapshot";
export const DEFAULT_OPERATIONAL_SNAPSHOT_MAX_AGE_MS = 5 * 60 * 1000;
const ALL_SNAPSHOT_SECTIONS: OperationalSnapshotSection[] = [
  "maintenance",
  "bom",
  "staffing",
  "cycle"
];
const ROBOT_SNAPSHOT_SOURCE_SELECT =
  "_id updatedAt maintenance manufacturingData operatorSnapshot clientSnapshot";
const MAINTENANCE_OVERDUE_THRESHOLD_DAYS = 4;

/**
 * Build the Redis key for a robot operational snapshot cache entry.
 *
 * @param robotId - Robot identifier.
 * @returns Redis key for the cached operational snapshot.
 */
const getOperationalSnapshotCacheKey = (robotId: string): string =>
  `${OPERATIONAL_SNAPSHOT_KEY_PREFIX}:${robotId}`;

/**
 * Convert stored freshness timestamps back into Dates.
 *
 * @param value - Serialized date string from Redis.
 * @returns Parsed Date when present.
 */
const reviveFreshnessDate = (value?: string): Date | undefined =>
  value ? new Date(value) : undefined;

/**
 * Deserialize a cached operational snapshot payload.
 *
 * @param rawSnapshot - Raw Redis JSON string.
 * @returns Parsed operational snapshot payload.
 */
const deserializeSnapshot = (
  rawSnapshot: string
): RobotOperationalSnapshotPayload => {
  const snapshot = JSON.parse(rawSnapshot) as Omit<
    RobotOperationalSnapshotPayload,
    "snapshotAt" | "inputsFreshness"
  > & {
    snapshotAt: string;
    inputsFreshness?: Record<string, string | undefined>;
  };

  return {
    ...snapshot,
    snapshotAt: new Date(snapshot.snapshotAt),
    inputsFreshness: {
      attendanceAt: reviveFreshnessDate(snapshot.inputsFreshness?.attendanceAt),
      appDataAt: reviveFreshnessDate(snapshot.inputsFreshness?.appDataAt),
      downtimeAt: reviveFreshnessDate(snapshot.inputsFreshness?.downtimeAt),
      robotAt: reviveFreshnessDate(snapshot.inputsFreshness?.robotAt)
    }
  };
};

/**
 * Serialize an operational snapshot payload for Redis storage.
 *
 * @param snapshot - Snapshot payload to persist.
 * @returns JSON string ready for Redis.
 */
const serializeSnapshot = (
  snapshot: RobotOperationalSnapshotPayload
): string => JSON.stringify(snapshot);

/**
 * Check whether a cached operational snapshot should be recomputed.
 *
 * @param snapshot - Cached operational snapshot payload, if present.
 * @param maxAgeMs - Maximum allowed age in milliseconds.
 * @returns True when the snapshot is missing or older than the freshness window.
 */
export const isOperationalSnapshotStale = (
  snapshot?: RobotOperationalSnapshotPayload | null,
  maxAgeMs = DEFAULT_OPERATIONAL_SNAPSHOT_MAX_AGE_MS
): boolean => {
  if (!snapshot) {
    return true;
  }

  return Date.now() - snapshot.snapshotAt.getTime() > maxAgeMs;
};

/**
 * Calculate maintenance state from overdue days and maintenance existence.
 *
 * @param maintenanceOverdueDays - Number of overdue days after grace threshold.
 * @param hasLastMaintenance - Whether the robot has ever been maintained.
 * @returns Derived maintenance state.
 */
const getMaintenanceState = (
  maintenanceOverdueDays: number,
  hasLastMaintenance: boolean
): MaintenanceState => {
  if (!hasLastMaintenance) {
    return "unknown";
  }

  if (maintenanceOverdueDays >= 14) {
    return "critical";
  }

  if (maintenanceOverdueDays > 0) {
    return "overdue";
  }

  return "ok";
};

/**
 * Calculate BOM state from completion state and insufficient Flo parts.
 *
 * @param bomCompletionStatus - Raw BOM completion status.
 * @param insufficientPartsCount - Count of insufficient Flo parts.
 * @returns Derived BOM state.
 */
const getBomState = (
  bomCompletionStatus?: "complete" | "incomplete" | "unknown",
  insufficientPartsCount?: number
): BomState => {
  if ((insufficientPartsCount || 0) > 0) {
    return "insufficient_parts";
  }

  if (bomCompletionStatus === "incomplete") {
    return "incomplete";
  }

  if (bomCompletionStatus === "complete") {
    return "ok";
  }

  return "unknown";
};

/**
 * Derive staffing state directly from the robot snapshot without attendance lookup.
 *
 * @param robot - Robot source document.
 * @returns Base staffing state from assignment/check-in status.
 */
const getBaseStaffingState = (robot: SnapshotRobotSource): StaffingCoverageState => {
  if (!robot.operatorSnapshot?.id) {
    return "unassigned";
  }

  if (robot.operatorSnapshot.checkedInToday) {
    return "covered";
  }

  return "assigned_not_checked_in";
};

/**
 * Aggregate cycle timing data for app sessions matching the provided query.
 *
 * @param match - Mongo match stage for app data aggregation.
 * @returns Aggregated cycle metrics.
 */
const aggregateCycleSessions = async (
  match: Record<string, unknown>
): Promise<CycleAggregation> => {
  const [result] = await appDataModel.aggregate([
    {
      $match: match
    },
    {
      $group: {
        _id: null,
        tripCount: { $sum: 1 },
        runningTimeMs: { $sum: "$tripRunningTime" },
        idleTimeMs: { $sum: "$tripIdleTime" },
        downTimeMs: { $sum: "$totalDownTime" },
        loadingDurationMs: {
          $sum: {
            $max: [
              {
                $subtract: ["$loadingEndTimestamp", "$loadingStartTimestamp"]
              },
              0
            ]
          }
        },
        unloadingDurationMs: {
          $sum: {
            $max: [
              {
                $subtract: [
                  "$unloadingEndTimestamp",
                  "$unloadingStartTimestamp"
                ]
              },
              0
            ]
          }
        },
        returnTripDurationMs: {
          $sum: {
            $max: [
              {
                $subtract: [
                  "$returnTripEndTimestamp",
                  "$returnTripStartTimestamp"
                ]
              },
              0
            ]
          }
        },
        latestTimestamp: { $max: "$timestamp" }
      }
    }
  ]);

  return (
    result || {
      tripCount: 0,
      runningTimeMs: 0,
      idleTimeMs: 0,
      downTimeMs: 0,
      loadingDurationMs: 0,
      unloadingDurationMs: 0,
      returnTripDurationMs: 0
    }
  );
};

/**
 * Calculate cycle efficiency from timing aggregates.
 *
 * @param aggregation - Aggregated app-data timing metrics.
 * @returns Cycle efficiency ratio rounded to four decimals.
 */
const getCycleEfficiency = (aggregation: CycleAggregation) => {
  const denominator =
    aggregation.runningTimeMs +
    aggregation.idleTimeMs +
    aggregation.downTimeMs +
    aggregation.loadingDurationMs +
    aggregation.unloadingDurationMs +
    aggregation.returnTripDurationMs;

  if (denominator <= 0) {
    return null;
  }

  return Number((aggregation.runningTimeMs / denominator).toFixed(4));
};

class RobotOperationalSnapshotService {
  /**
   * Fetch cached operational snapshots for the requested robots.
   *
   * @param robotIds - Robot identifiers to load from Redis.
   * @returns Map keyed by robot ID for every cached snapshot found.
   */
  async getOperationalSnapshots(
    robotIds: string[]
  ): Promise<Map<string, RobotOperationalSnapshotPayload>> {
    const snapshots = new Map<string, RobotOperationalSnapshotPayload>();
    const uniqueRobotIds = [...new Set(robotIds.filter(Boolean))];

    if (uniqueRobotIds.length === 0) {
      return snapshots;
    }

    const cachedValues = await redisClient.mGet(
      uniqueRobotIds.map(getOperationalSnapshotCacheKey)
    );

    cachedValues.forEach((cachedValue) => {
      if (!cachedValue) {
        return;
      }

      const snapshot = deserializeSnapshot(cachedValue);
      snapshots.set(snapshot.robotId, snapshot);
    });

    return snapshots;
  }

  /**
   * Store operational snapshots in Redis.
   *
   * @param snapshots - Snapshot payloads to persist.
   * @returns Promise that resolves when cache writes complete.
   */
  async setOperationalSnapshots(
    snapshots: RobotOperationalSnapshotPayload[]
  ): Promise<void> {
    if (snapshots.length === 0) {
      return;
    }

    await Promise.all(
      snapshots.map((snapshot) =>
        redisClient.set(
          getOperationalSnapshotCacheKey(snapshot.robotId),
          serializeSnapshot(snapshot)
        )
      )
    );
  }

  /**
   * Load cached operational snapshots and recompute only missing or stale entries.
   *
   * @param robotIds - Robot identifiers to load for master-data assembly.
   * @returns Snapshot payloads keyed by robot ID.
   */
  async getOrComputeOperationalSnapshots(
    robotIds: string[]
  ): Promise<Map<string, RobotOperationalSnapshotPayload>> {
    const uniqueRobotIds = [...new Set(robotIds.filter(Boolean))];

    if (uniqueRobotIds.length === 0) {
      return new Map<string, RobotOperationalSnapshotPayload>();
    }

    const cachedSnapshots = await this.getOperationalSnapshots(uniqueRobotIds);
    const staleOrMissingRobotIds = uniqueRobotIds.filter((robotId) =>
      isOperationalSnapshotStale(cachedSnapshots.get(robotId))
    );

    if (staleOrMissingRobotIds.length === 0) {
      return cachedSnapshots;
    }

    const recomputedSnapshots = await this.recomputeRobots(staleOrMissingRobotIds);
    recomputedSnapshots.forEach((snapshot, robotId) => {
      cachedSnapshots.set(robotId, snapshot);
    });

    return cachedSnapshots;
  }

  /**
   * Recompute operational snapshots from source data for the provided robots.
   *
   * @param robotIds - Robot identifiers to fully recompute.
   * @returns Snapshot payloads keyed by robot ID.
   */
  async recomputeRobots(
    robotIds: string[]
  ): Promise<Map<string, RobotOperationalSnapshotPayload>> {
    const snapshots = new Map<string, RobotOperationalSnapshotPayload>();

    for (const robotId of robotIds) {
      const snapshot = await this.recomputeRobot(robotId);
      if (snapshot) {
        snapshots.set(robotId, snapshot);
      }
    }

    return snapshots;
  }

  /**
   * Recompute operational snapshots for the entire fleet.
   *
   * @returns Snapshot payloads keyed by robot ID.
   */
  async recomputeAllRobots(): Promise<Map<string, RobotOperationalSnapshotPayload>> {
    const robots = await robotModel.find({}).select("_id").lean();
    const robotIds = robots.map((robot) => robot._id.toString());
    const batchSize = 25;
    const snapshots = new Map<string, RobotOperationalSnapshotPayload>();

    for (let index = 0; index < robotIds.length; index += batchSize) {
      const batch = robotIds.slice(index, index + batchSize);
      const batchSnapshots = await this.recomputeRobots(batch);
      batchSnapshots.forEach((snapshot, robotId) => {
        snapshots.set(robotId, snapshot);
      });
    }

    return snapshots;
  }

  /**
   * Refresh specific sections of cached operational snapshots and write back the full JSON blob.
   *
   * @param robotIds - Robot identifiers to update.
   * @param sections - Snapshot sections that should be refreshed from source data.
   * @returns Updated snapshot payloads keyed by robot ID.
   */
  async refreshRobotSnapshots(
    robotIds: string[],
    sections: OperationalSnapshotSection[]
  ): Promise<Map<string, RobotOperationalSnapshotPayload>> {
    const snapshots = new Map<string, RobotOperationalSnapshotPayload>();

    for (const robotId of [...new Set(robotIds.filter(Boolean))]) {
      const snapshot = await this.refreshRobotSnapshot(robotId, sections);
      if (snapshot) {
        snapshots.set(robotId, snapshot);
      }
    }

    return snapshots;
  }

  /**
   * Refresh staffing and cycle sections for every robot associated with an operator.
   *
   * @param operatorId - Operator whose assigned robots should be updated.
   * @param reason - Human-readable reason for logging.
   * @returns Updated snapshot payloads keyed by robot ID.
   */
  async refreshOperatorSnapshots(
    operatorId: string,
    reason: string
  ): Promise<Map<string, RobotOperationalSnapshotPayload>> {
    const operatorObjectId = new mongoose.Types.ObjectId(operatorId);
    const robots = await robotModel
      .find({
        $or: [
          { activeOperator: operatorObjectId },
          { "operatorSnapshot.id": operatorId },
          { appUsers: operatorObjectId }
        ]
      })
      .select("_id")
      .lean();

    if (robots.length === 0) {
      logger.info(
        `[RobotOperationalSnapshot] No robots found for operator ${operatorId} after ${reason}`
      );
      return new Map<string, RobotOperationalSnapshotPayload>();
    }

    return this.refreshRobotSnapshots(
      robots.map((robot) => robot._id.toString()),
      ["staffing", "cycle"]
    );
  }

  /**
   * Compute the operational snapshot payload for a single robot.
   *
   * @param robotId - Robot identifier to evaluate.
   * @returns Computed operational snapshot payload or null when the robot is missing.
   */
  async computeRobotSnapshot(
    robotId: string
  ): Promise<RobotOperationalSnapshotPayload | null> {
    const robot = await this.getRobotSnapshotSource(robotId);

    if (!robot) {
      return null;
    }

    const now = new Date();
    const maintenanceOverdueDays = this.getMaintenanceOverdueDays(robot);
    const maintenanceState = getMaintenanceState(
      maintenanceOverdueDays,
      Boolean(robot.maintenance?.lastMaintenance)
    );
    const insufficientPartsCount = this.getInsufficientPartsCount(robot);
    const bomCompletionStatus = this.getBomCompletionStatus(robot);
    const bomState = getBomState(bomCompletionStatus, insufficientPartsCount);
    const staffing = await this.getStaffingCoverageState(robot);
    const cycle = await this.getCycleMetrics(robotId, robot);

    return {
      robotId,
      cycleEfficiency: cycle.cycleEfficiency,
      cycleEfficiencyWindow: cycle.cycleEfficiencyWindow,
      currentShiftTripCount: cycle.currentShiftTripCount,
      currentShiftRunningTimeMs: cycle.currentShiftRunningTimeMs,
      currentShiftIdleTimeMs: cycle.currentShiftIdleTimeMs,
      currentShiftDownTimeMs: cycle.currentShiftDownTimeMs,
      staffingCoverageState: staffing.staffingCoverageState,
      maintenanceOverdueDays,
      maintenanceState,
      insufficientPartsCount,
      bomCompletionStatus,
      bomState,
      snapshotAt: now,
      inputsFreshness: {
        attendanceAt: staffing.attendanceAt,
        appDataAt: cycle.appDataAt,
        robotAt: robot.updatedAt
      }
    };
  }

  /**
   * Fully recompute and persist a single robot snapshot.
   *
   * @param robotId - Robot identifier to refresh.
   * @returns Persisted snapshot payload or null when the robot is missing.
   */
  async recomputeRobot(
    robotId: string
  ): Promise<RobotOperationalSnapshotPayload | null> {
    const snapshot = await this.computeRobotSnapshot(robotId);

    if (!snapshot) {
      return null;
    }

    await this.setOperationalSnapshots([snapshot]);

    return snapshot;
  }

  /**
   * Refresh the requested snapshot sections from source data and write the full JSON payload back to Redis.
   *
   * @param robotId - Robot identifier to update.
   * @param sections - Snapshot sections that should be recalculated.
   * @returns Updated snapshot payload or null when the robot is missing.
   */
  async refreshRobotSnapshot(
    robotId: string,
    sections: OperationalSnapshotSection[]
  ): Promise<RobotOperationalSnapshotPayload | null> {
    const normalizedSections = [...new Set(sections)].filter(
      (section): section is OperationalSnapshotSection =>
        ALL_SNAPSHOT_SECTIONS.includes(section)
    );

    if (normalizedSections.length === 0) {
      return this.recomputeRobot(robotId);
    }

    const robot = await this.getRobotSnapshotSource(robotId);

    if (!robot) {
      return null;
    }

    const cachedSnapshots = await this.getOperationalSnapshots([robotId]);
    const cachedSnapshot = cachedSnapshots.get(robotId);

    if (!cachedSnapshot) {
      return this.computeAndPersistSnapshot(robotId);
    }

    const nextSnapshot: RobotOperationalSnapshotPayload = {
      ...cachedSnapshot,
      snapshotAt: new Date(),
      inputsFreshness: {
        ...cachedSnapshot.inputsFreshness,
        robotAt: robot.updatedAt
      }
    };

    if (normalizedSections.includes("maintenance")) {
      const maintenanceOverdueDays = this.getMaintenanceOverdueDays(robot);
      nextSnapshot.maintenanceOverdueDays = maintenanceOverdueDays;
      nextSnapshot.maintenanceState = getMaintenanceState(
        maintenanceOverdueDays,
        Boolean(robot.maintenance?.lastMaintenance)
      );
    }

    if (normalizedSections.includes("bom")) {
      const insufficientPartsCount = this.getInsufficientPartsCount(robot);
      const bomCompletionStatus = this.getBomCompletionStatus(robot);
      nextSnapshot.insufficientPartsCount = insufficientPartsCount;
      nextSnapshot.bomCompletionStatus = bomCompletionStatus;
      nextSnapshot.bomState = getBomState(
        bomCompletionStatus,
        insufficientPartsCount
      );
    }

    if (normalizedSections.includes("staffing")) {
      const staffing = await this.getStaffingCoverageState(robot);
      nextSnapshot.staffingCoverageState = staffing.staffingCoverageState;
      nextSnapshot.inputsFreshness.attendanceAt = staffing.attendanceAt;
    }

    if (normalizedSections.includes("cycle")) {
      const cycle = await this.getCycleMetrics(robotId, robot);
      nextSnapshot.cycleEfficiency = cycle.cycleEfficiency;
      nextSnapshot.cycleEfficiencyWindow = cycle.cycleEfficiencyWindow;
      nextSnapshot.currentShiftTripCount = cycle.currentShiftTripCount;
      nextSnapshot.currentShiftRunningTimeMs = cycle.currentShiftRunningTimeMs;
      nextSnapshot.currentShiftIdleTimeMs = cycle.currentShiftIdleTimeMs;
      nextSnapshot.currentShiftDownTimeMs = cycle.currentShiftDownTimeMs;
      nextSnapshot.inputsFreshness.appDataAt = cycle.appDataAt;
    }

    await this.setOperationalSnapshots([nextSnapshot]);

    return nextSnapshot;
  }

  /**
   * Load the robot fields required for operational snapshot derivation.
   *
   * @param robotId - Robot identifier to load.
   * @returns Minimal robot source document for snapshot calculation.
   */
  private async getRobotSnapshotSource(
    robotId: string
  ): Promise<SnapshotRobotSource | null> {
    return robotModel
      .findById(robotId)
      .select(ROBOT_SNAPSHOT_SOURCE_SELECT)
      .lean<SnapshotRobotSource>();
  }

  /**
   * Compute and persist a full snapshot for a robot.
   *
   * @param robotId - Robot identifier to refresh.
   * @returns Persisted snapshot payload or null when the robot is missing.
   */
  private async computeAndPersistSnapshot(
    robotId: string
  ): Promise<RobotOperationalSnapshotPayload | null> {
    const snapshot = await this.computeRobotSnapshot(robotId);

    if (!snapshot) {
      return null;
    }

    await this.setOperationalSnapshots([snapshot]);

    return snapshot;
  }

  /**
   * Calculate maintenance overdue days after the maintenance grace period.
   *
   * @param robot - Robot source document.
   * @returns Count of overdue days, never below zero.
   */
  private getMaintenanceOverdueDays(robot: SnapshotRobotSource) {
    const lastMaintenance = robot.maintenance?.lastMaintenance;

    if (!lastMaintenance) {
      return 0;
    }

    const daysSinceMaintenance = Math.floor(
      (Date.now() - lastMaintenance) / 86400000
    );

    return Math.max(
      0,
      daysSinceMaintenance - MAINTENANCE_OVERDUE_THRESHOLD_DAYS
    );
  }

  /**
   * Count insufficient Flo parts for the robot BOM.
   *
   * @param robot - Robot source document.
   * @returns Count of insufficient Flo-sourced parts.
   */
  private getInsufficientPartsCount(robot: SnapshotRobotSource) {
    const partsConsumed = robot.manufacturingData?.partsConsumed || [];

    return partsConsumed.filter(
      (part) =>
        part?.inventoryStatus === "insufficient" && part?.source === "Flo"
    ).length;
  }

  /**
   * Normalize the robot's raw BOM completion status to the public snapshot contract.
   *
   * @param robot - Robot source document.
   * @returns Normalized BOM completion status.
   */
  private getBomCompletionStatus(
    robot: SnapshotRobotSource
  ): "complete" | "incomplete" | "unknown" {
    if (robot.manufacturingData?.bomCompletionStatus === "complete") {
      return "complete";
    }

    if (robot.manufacturingData?.bomCompletionStatus === "incomplete") {
      return "incomplete";
    }

    return "unknown";
  }

  /**
   * Derive staffing coverage state from robot assignment, attendance, and overtime records.
   *
   * @param robot - Robot source document.
   * @returns Staffing coverage state and the attendance freshness timestamp.
   */
  private async getStaffingCoverageState(robot: SnapshotRobotSource) {
    const baseState = getBaseStaffingState(robot);

    if (!robot.operatorSnapshot?.id) {
      return {
        staffingCoverageState: baseState,
        attendanceAt: robot.updatedAt
      };
    }

    const operatorId = robot.operatorSnapshot.id.toString();
    const todayStart = dayjs().startOf("day").toDate();

    const [activeOvertimeSession, latestAutoCheckout] = await Promise.all([
      OvertimeSessionModel.findOne({
        operatorId,
        status: "active"
      })
        .select("updatedAt")
        .sort({ updatedAt: -1 })
        .lean<any>(),
      attendanceModel
        .findOne({
          "metadata.operatorId": operatorId,
          autoCheckedOut: true,
          startingTimestamp: { $gte: todayStart }
        })
        .select("startingTimestamp autoCheckOutTime updatedAt")
        .sort({ startingTimestamp: -1 })
        .lean<any>()
    ]);

    if (activeOvertimeSession) {
      return {
        staffingCoverageState: "overtime_risk" as StaffingCoverageState,
        attendanceAt: activeOvertimeSession.updatedAt
      };
    }

    if (latestAutoCheckout) {
      return {
        staffingCoverageState: "auto_checkout_risk" as StaffingCoverageState,
        attendanceAt:
          latestAutoCheckout.autoCheckOutTime ||
          latestAutoCheckout.updatedAt ||
          latestAutoCheckout.startingTimestamp
      };
    }

    return {
      staffingCoverageState: baseState,
      attendanceAt: robot.operatorSnapshot.lastCheckInTime || robot.updatedAt
    };
  }

  /**
   * Derive cycle metrics from app-data sessions for the robot.
   *
   * @param robotId - Robot identifier to evaluate.
   * @param robot - Robot source document.
   * @returns Cycle metrics and associated app-data freshness timestamp.
   */
  private async getCycleMetrics(robotId: string, robot: SnapshotRobotSource) {
    const currentShiftSince = robot.operatorSnapshot?.checkedInToday
      ? robot.operatorSnapshot?.lastCheckInTime
      : null;

    if (currentShiftSince) {
      const currentShiftAggregation = await aggregateCycleSessions({
        "metadata.robotId": robotId,
        timestamp: { $gte: currentShiftSince }
      });

      if (currentShiftAggregation.tripCount > 0) {
        return {
          cycleEfficiency: getCycleEfficiency(currentShiftAggregation),
          cycleEfficiencyWindow: "current_shift" as const,
          currentShiftTripCount: currentShiftAggregation.tripCount,
          currentShiftRunningTimeMs: currentShiftAggregation.runningTimeMs,
          currentShiftIdleTimeMs: currentShiftAggregation.idleTimeMs,
          currentShiftDownTimeMs: currentShiftAggregation.downTimeMs,
          appDataAt: currentShiftAggregation.latestTimestamp
        };
      }
    }

    const latestAppData = await appDataModel
      .findOne({
        "metadata.robotId": robotId
      })
      .select("metadata.sessionId timestamp")
      .sort({ timestamp: -1 })
      .lean();

    if (!latestAppData?.metadata?.sessionId) {
      return {
        cycleEfficiency: null,
        cycleEfficiencyWindow: "unknown" as const,
        currentShiftTripCount: 0,
        currentShiftRunningTimeMs: 0,
        currentShiftIdleTimeMs: 0,
        currentShiftDownTimeMs: 0,
        appDataAt: undefined
      };
    }

    const lastClosedShiftAggregation = await aggregateCycleSessions({
      "metadata.robotId": robotId,
      "metadata.sessionId": latestAppData.metadata.sessionId
    });

    return {
      cycleEfficiency: getCycleEfficiency(lastClosedShiftAggregation),
      cycleEfficiencyWindow: "last_closed_shift" as const,
      currentShiftTripCount: lastClosedShiftAggregation.tripCount,
      currentShiftRunningTimeMs: lastClosedShiftAggregation.runningTimeMs,
      currentShiftIdleTimeMs: lastClosedShiftAggregation.idleTimeMs,
      currentShiftDownTimeMs: lastClosedShiftAggregation.downTimeMs,
      appDataAt:
        lastClosedShiftAggregation.latestTimestamp || latestAppData.timestamp
    };
  }
}

export const robotOperationalSnapshotService =
  new RobotOperationalSnapshotService();

/**
 * Fully recompute operational snapshots for one robot or the entire fleet.
 *
 * @param robotId - Optional robot identifier. When omitted, recomputes the full fleet.
 * @returns Promise that resolves when recomputation finishes.
 */
export const recomputeRobotOperationalSnapshot = async (robotId?: string) => {
  const startedAt = dayjs();

  if (robotId) {
    await robotOperationalSnapshotService.recomputeRobot(robotId);
    logger.info(
      `[RobotOperationalSnapshot] Recomputed robot ${robotId} in ${dayjs()
        .diff(startedAt, "millisecond")
        .toString()}ms`
    );
    return;
  }

  await robotOperationalSnapshotService.recomputeAllRobots();
  logger.info(
    `[RobotOperationalSnapshot] Recomputed fleet snapshots in ${dayjs()
      .diff(startedAt, "millisecond")
      .toString()}ms`
  );
};

/**
 * Refresh specific operational snapshot sections for the provided robots.
 *
 * @param robotIds - Robot identifiers to update.
 * @param sections - Snapshot sections that should be recalculated.
 * @returns Updated snapshot payloads keyed by robot ID.
 */
export const refreshRobotOperationalSnapshots = async (
  robotIds: string[],
  sections: OperationalSnapshotSection[]
): Promise<Map<string, RobotOperationalSnapshotPayload>> =>
  robotOperationalSnapshotService.refreshRobotSnapshots(robotIds, sections);

/**
 * Refresh staffing and cycle snapshot sections for every robot linked to an operator.
 *
 * @param operatorId - Operator whose related robots should be refreshed.
 * @param reason - Human-readable reason for logging.
 * @returns Updated snapshot payloads keyed by robot ID.
 */
export const refreshOperatorOperationalSnapshots = async (
  operatorId: string,
  reason: string
): Promise<Map<string, RobotOperationalSnapshotPayload>> =>
  robotOperationalSnapshotService.refreshOperatorSnapshots(operatorId, reason);
