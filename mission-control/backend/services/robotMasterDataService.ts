import { Billing } from "../models/billingModel";
import OvertimeSessionModel from "../models/overtimeSessionModel";
import attendanceModel from "../models/attendanceModel";
import issueModel from "../models/issueModel";
import QCSubmission from "../models/qcSubmissionModel";
import robotModel from "../models/robotModel";
import Shipment from "../models/shipmentModel";
import { redisClient } from "./redis";
import { robotOperationalSnapshotService } from "./robotOperationalSnapshotService";

type MasterDataQuery = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  client?: string;
  operator?: string;
  fleet?: string;
  access?: string;
  gpsStatus?: string;
};

type FetchRobotMasterDataOptions = {
  page?: number;
  limit?: number;
  filters?: Omit<MasterDataQuery, "page" | "limit">;
};

type RedisRobotState = {
  status?: string;
  lastConnectionOn?: number;
  connectedClients?: Record<string, { name: string; email: string }>;
  connectedClientsCount?: number;
};

type OperationalSnapshotInputsFreshness = {
  attendanceAt?: Date | string;
  appDataAt?: Date | string;
  robotAt?: Date | string;
};

type OperationalSnapshotData = {
  robotId: string;
  staffingCoverageState?:
    | "unassigned"
    | "assigned_not_checked_in"
    | "covered"
    | "overtime_risk"
    | "auto_checkout_risk"
    | "unknown";
  maintenanceOverdueDays?: number;
  maintenanceState?: "ok" | "overdue" | "critical" | "unknown";
  insufficientPartsCount?: number;
  bomCompletionStatus?: "complete" | "incomplete" | "unknown";
  bomState?: "ok" | "incomplete" | "insufficient_parts" | "unknown";
  cycleEfficiency?: number | null;
  cycleEfficiencyWindow?: "current_shift" | "last_closed_shift" | "unknown";
  snapshotAt?: Date | string;
  inputsFreshness?: OperationalSnapshotInputsFreshness;
};

type OperationalSnapshotBulkLoader = (
  robotIds: string[]
) => Promise<
  | Map<string, OperationalSnapshotData>
  | OperationalSnapshotData[]
  | Record<string, OperationalSnapshotData>
>;

type OperationalSnapshotServiceAdapter = {
  getSnapshotsForRobots?: OperationalSnapshotBulkLoader;
  getOperationalSnapshots?: OperationalSnapshotBulkLoader;
  getOperationalSnapshotMap?: OperationalSnapshotBulkLoader;
  getOrComputeSnapshots?: OperationalSnapshotBulkLoader;
  getOrComputeOperationalSnapshots?: OperationalSnapshotBulkLoader;
  recomputeRobot?: (robotId: string) => Promise<OperationalSnapshotData | null>;
};

const getConnectivityFreshnessState = (
  status?: string | null,
  lastConnectionOn?: number | null
) => {
  if (!status && !lastConnectionOn) {
    return "unknown";
  }

  if (status && status.toLowerCase() === "offline") {
    return "offline";
  }

  if (!lastConnectionOn) {
    return "unknown";
  }

  const freshnessSeconds = Math.max(
    0,
    Math.floor((Date.now() - lastConnectionOn) / 1000)
  );

  if (freshnessSeconds <= 30) {
    return "live";
  }

  if (freshnessSeconds <= 120) {
    return "stale";
  }

  return "offline";
};

const getTaskSummary = (tasks: any[] = []) => {
  return tasks.reduce(
    (acc, task) => {
      acc.taskCounts.total += 1;

      switch (task.status) {
        case "Pending":
          acc.taskCounts.pending += 1;
          break;
        case "In Progress":
          acc.taskCounts.inProgress += 1;
          break;
        case "Completed":
          acc.taskCounts.completed += 1;
          break;
        case "Cancelled":
          acc.taskCounts.cancelled += 1;
          break;
        default:
          break;
      }

      if (
        !acc.latestTask ||
        new Date(task.createdDate) > new Date(acc.latestTask.createdDate)
      ) {
        acc.latestTask = task;
      }

      return acc;
    },
    {
      taskCounts: {
        pending: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        total: 0
      },
      latestTask: null as any
    }
  );
};

const getBaseStaffingCoverageState = (robot: any) => {
  if (!robot.operatorSnapshot?.id) {
    return "unassigned";
  }

  if (robot.operatorSnapshot.checkedInToday) {
    return "covered";
  }

  return "assigned_not_checked_in";
};

const getMaintenanceOverdueDays = (robot: any) => {
  const lastMaintenance = robot.maintenance?.lastMaintenance;

  if (!lastMaintenance) {
    return 0;
  }

  const daysSinceMaintenance = Math.floor(
    (Date.now() - lastMaintenance) / 86400000
  );

  return Math.max(0, daysSinceMaintenance - 4);
};

const getInsufficientPartsCount = (robot: any) => {
  const partsConsumed = robot.manufacturingData?.partsConsumed || [];

  return partsConsumed.filter(
    (part: any) =>
      part?.inventoryStatus === "insufficient" && part?.source === "Flo"
  ).length;
};

const getMaintenanceState = (
  maintenanceOverdueDays?: number,
  hasLastMaintenance?: boolean
) => {
  if (!hasLastMaintenance) {
    return "unknown";
  }

  if ((maintenanceOverdueDays ?? 0) >= 14) {
    return "critical";
  }

  if ((maintenanceOverdueDays ?? 0) > 0) {
    return "overdue";
  }

  return "ok";
};

const getBomState = (
  bomCompletionStatus?: string,
  insufficientPartsCount?: number
) => {
  if ((insufficientPartsCount ?? 0) > 0) {
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

const toIsoString = (value?: Date | string | null): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
};

/**
 * Normalizes varying operational snapshot loader responses into a robotId map.
 */
const normalizeOperationalSnapshotResult = (
  result:
    | Map<string, OperationalSnapshotData>
    | OperationalSnapshotData[]
    | Record<string, OperationalSnapshotData>
): Map<string, OperationalSnapshotData> => {
  if (result instanceof Map) {
    return result;
  }

  const snapshotMap = new Map<string, OperationalSnapshotData>();
  if (Array.isArray(result)) {
    result.forEach((snapshot) => {
      if (snapshot?.robotId) {
        snapshotMap.set(snapshot.robotId, snapshot);
      }
    });

    return snapshotMap;
  }

  Object.entries(result).forEach(([robotId, snapshot]) => {
    if (snapshot) {
      snapshotMap.set(snapshot.robotId || robotId, snapshot);
    }
  });

  return snapshotMap;
};

/**
 * Loads operational snapshots through the public service APIs exposed by the
 * operational snapshot service. Falls back to per-robot recomputation if a
 * bulk loader is not available yet.
 */
const loadOperationalSnapshots = async (
  robotIds: string[]
): Promise<Map<string, OperationalSnapshotData>> => {
  const snapshotService =
    robotOperationalSnapshotService as unknown as OperationalSnapshotServiceAdapter;

  const bulkLoaders: Array<OperationalSnapshotBulkLoader | undefined> = [
    snapshotService.getOrComputeOperationalSnapshots,
    snapshotService.getOrComputeSnapshots,
    snapshotService.getOperationalSnapshotMap,
    snapshotService.getOperationalSnapshots,
    snapshotService.getSnapshotsForRobots
  ];

  for (const loader of bulkLoaders) {
    if (!loader) {
      continue;
    }

    const result = await loader.call(robotOperationalSnapshotService, robotIds);
    return normalizeOperationalSnapshotResult(result);
  }

  const snapshotMap = new Map<string, OperationalSnapshotData>();

  if (!snapshotService.recomputeRobot) {
    return snapshotMap;
  }

  const snapshots = await Promise.all(
    robotIds.map((robotId) => snapshotService.recomputeRobot!(robotId))
  );

  snapshots.forEach((snapshot) => {
    if (snapshot?.robotId) {
      snapshotMap.set(snapshot.robotId, snapshot);
    }
  });

  return snapshotMap;
};

class RobotMasterDataService {
  async fetchRobotMasterData(
    queryOrOptions: MasterDataQuery | FetchRobotMasterDataOptions = {}
  ): Promise<{
    robots: any[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    if ("filters" in queryOrOptions) {
      const { page, limit, filters } = queryOrOptions;
      return this.getRobotMasterData({
        page,
        limit,
        ...filters
      });
    }

    return this.getRobotMasterData(queryOrOptions);
  }

  async getRobotMasterData(query: MasterDataQuery = {}): Promise<{
    robots: any[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const filter = this.buildFilter(query);
    const skip = (page - 1) * limit;

    const [total, robots] = await Promise.all([
      robotModel.countDocuments(filter),
      robotModel
        .find(filter)
        .select(
          "_id name robotType status desc macAddress access expiry gps maintenance manufacturingData motorData tasks createdAt updatedAt " +
            "operatorSnapshot clientSnapshot fleetSnapshot openIssuesCount yesterdayTripCount"
        )
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const rows = await this.buildRows(robots);

    return {
      robots: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async fetchAllRobotMasterData(): Promise<any[]> {
    return this.getAllRobotMasterData();
  }

  async getAllRobotMasterData(): Promise<any[]> {
    const robots = await robotModel
      .find({})
      .select(
        "_id name robotType status desc macAddress access expiry gps maintenance manufacturingData motorData tasks createdAt updatedAt " +
          "operatorSnapshot clientSnapshot fleetSnapshot openIssuesCount yesterdayTripCount"
      )
      .sort({ name: 1 })
      .lean();

    return this.buildRows(robots);
  }

  private buildFilter(query: MasterDataQuery): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (query.status) {
      filter.status = query.status;
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: "i" } },
        { _id: { $regex: query.search, $options: "i" } }
      ];
    }

    if (query.client) {
      filter["clientSnapshot.name"] = query.client;
    }

    if (query.operator) {
      filter["operatorSnapshot.name"] = query.operator;
    }

    if (query.fleet) {
      filter["fleetSnapshot.name"] = query.fleet;
    }

    if (query.access) {
      filter.access = query.access === "Enabled";
    }

    if (query.gpsStatus === "Has GPS") {
      filter.gps = { $exists: true, $ne: null };
    }

    if (query.gpsStatus === "No GPS") {
      filter.$or = [{ gps: { $exists: false } }, { gps: null }];
    }

    return filter;
  }

  private async buildRows(robots: any[]): Promise<any[]> {
    const robotIds = robots.map((robot) => robot._id.toString());

    const [
      issueTypeBreakdown,
      latestQCMap,
      shippingMap,
      billingMap,
      liveStateMap,
      operationalSnapshotMap,
      staffingRiskMap
    ] = await Promise.all([
      this.getIssueTypeBreakdown(robotIds),
      this.getLatestQCMap(robotIds),
      this.getShipmentMap(robotIds),
      this.getBillingMap(robotIds),
      this.getLiveStateMap(robotIds),
      this.getOperationalSnapshotMap(robotIds),
      this.getStaffingRiskMap(robots)
    ]);

    return robots.map((robot) => {
      const robotId = robot._id.toString();
      const { taskCounts, latestTask } = getTaskSummary(robot.tasks || []);
      const liveState = liveStateMap.get(robotId);
      const snapshot = operationalSnapshotMap.get(robotId);
      const connectedClientsCount =
        liveState?.connectedClientsCount ||
        Object.keys(liveState?.connectedClients || {}).length ||
        0;
      const lastConnectionOn = liveState?.lastConnectionOn;
      const connectivityFreshnessSeconds = lastConnectionOn
        ? Math.max(0, Math.floor((Date.now() - lastConnectionOn) / 1000))
        : undefined;
      const connectivityFreshnessState = getConnectivityFreshnessState(
        liveState?.status || robot.status,
        lastConnectionOn
      );
      const checkedInToday = robot.operatorSnapshot?.checkedInToday || false;
      const lastCheckInTime = robot.operatorSnapshot?.lastCheckInTime || null;
      const baseMaintenanceOverdueDays = getMaintenanceOverdueDays(robot);
      const baseInsufficientPartsCount = getInsufficientPartsCount(robot);
      const baseBomCompletionStatus =
        robot.manufacturingData?.bomCompletionStatus;
      const baseMaintenanceState = getMaintenanceState(
        baseMaintenanceOverdueDays,
        Boolean(robot.maintenance?.lastMaintenance)
      );
      const baseBomState = getBomState(
        baseBomCompletionStatus,
        baseInsufficientPartsCount
      );

      return {
        id: robotId,
        robotType: robot.robotType,
        name: robot.name,
        status: liveState?.status || robot.status,
        desc: robot.desc,
        macAddress: robot.macAddress,
        access: robot.access,
        expiry: robot.expiry,
        gps: robot.gps,
        maintenance: robot.maintenance,
        manufacturingData: robot.manufacturingData,
        motorData: robot.motorData,
        createdAt: robot.createdAt,
        updatedAt: robot.updatedAt,
        fleet: robot.fleetSnapshot || null,
        operator: robot.operatorSnapshot
          ? {
              id: robot.operatorSnapshot.id,
              name: robot.operatorSnapshot.name,
              phoneNumber: robot.operatorSnapshot.phoneNumber,
              clientId: robot.clientSnapshot
            }
          : null,
        client: robot.clientSnapshot || null,
        taskCounts,
        latestTask: latestTask
          ? {
              title: latestTask.title,
              status: latestTask.status,
              createdDate: latestTask.createdDate
            }
          : null,
        yesterdayTripCount: robot.yesterdayTripCount || 0,
        openIssuesCount: robot.openIssuesCount || 0,
        issueTypeBreakdown: issueTypeBreakdown.get(robotId) || {
          mechanical: 0,
          electrical: 0,
          other: 0
        },
        latestQC: latestQCMap.get(robotId) || null,
        billing: billingMap.get(robotId) || null,
        shipping: shippingMap.get(robotId) || null,
        lastConnectionOn,
        connectedClientsCount,
        connectivityFreshnessSeconds,
        connectivityFreshnessState,
        checkedInToday,
        lastCheckInTime,
        staffingCoverageState:
          staffingRiskMap.get(robotId) ||
          snapshot?.staffingCoverageState ||
          getBaseStaffingCoverageState(robot),
        maintenanceOverdueDays:
          snapshot?.maintenanceOverdueDays ?? baseMaintenanceOverdueDays,
        maintenanceState: snapshot?.maintenanceState || baseMaintenanceState,
        insufficientPartsCount:
          snapshot?.insufficientPartsCount ?? baseInsufficientPartsCount,
        bomCompletionStatus:
          snapshot?.bomCompletionStatus || baseBomCompletionStatus || "unknown",
        bomState: snapshot?.bomState || baseBomState,
        cycleEfficiency: snapshot?.cycleEfficiency ?? null,
        cycleEfficiencyWindow: snapshot?.cycleEfficiencyWindow || "unknown",
        metricFreshness: {
          connectivity: lastConnectionOn
            ? new Date(lastConnectionOn).toISOString()
            : undefined,
          staffing:
            toIsoString(snapshot?.inputsFreshness?.attendanceAt) ||
            (lastCheckInTime
              ? new Date(lastCheckInTime).toISOString()
              : undefined),
          maintenance:
            toIsoString(snapshot?.snapshotAt) ||
            new Date(robot.updatedAt).toISOString(),
          bom:
            toIsoString(snapshot?.snapshotAt) ||
            new Date(robot.updatedAt).toISOString(),
          cycleEfficiency: toIsoString(snapshot?.snapshotAt) || undefined
        }
      };
    });
  }

  private async getIssueTypeBreakdown(robotIds: string[]) {
    const breakdownMap = new Map<
      string,
      { mechanical: number; electrical: number; other: number }
    >();

    if (robotIds.length === 0) {
      return breakdownMap;
    }

    const issuesData = await issueModel.aggregate([
      {
        $match: {
          robot: {
            $in: robotIds
          },
          status: "open"
        }
      },
      {
        $group: {
          _id: {
            robotId: "$robot",
            type: "$typeOfIssue"
          },
          count: { $sum: 1 }
        }
      }
    ]);

    issuesData.forEach((item: any) => {
      const robotId = item._id.robotId.toString();

      if (!breakdownMap.has(robotId)) {
        breakdownMap.set(robotId, {
          mechanical: 0,
          electrical: 0,
          other: 0
        });
      }

      const breakdown = breakdownMap.get(robotId)!;

      if (item._id.type === "mechanical") {
        breakdown.mechanical = item.count;
      } else if (item._id.type === "electrical") {
        breakdown.electrical = item.count;
      } else {
        breakdown.other = item.count;
      }
    });

    return breakdownMap;
  }

  private async getLatestQCMap(robotIds: string[]) {
    const latestQCMap = new Map<string, any>();

    if (robotIds.length === 0) {
      return latestQCMap;
    }

    const latestQCSubmissions = await QCSubmission.aggregate([
      {
        $match: {
          robotId: { $in: robotIds },
          status: { $in: ["draft", "submitted", "approved"] }
        }
      },
      {
        $sort: {
          createdAt: -1
        }
      },
      {
        $group: {
          _id: "$robotId",
          latestQC: { $first: "$$ROOT" }
        }
      }
    ]);

    latestQCSubmissions.forEach((item: any) => {
      const qc = item.latestQC;
      const counts = qc.answers.reduce(
        (acc: any, answer: any) => {
          if (answer.status !== null) {
            acc.answered += 1;
          }
          if (answer.status === "passed") {
            acc.passed += 1;
          } else if (answer.status === "repaired") {
            acc.repaired += 1;
          } else if (answer.status === "replaced") {
            acc.replaced += 1;
          }
          return acc;
        },
        { passed: 0, repaired: 0, replaced: 0, answered: 0 }
      );
      const resolvedCount = counts.passed + counts.repaired + counts.replaced;

      latestQCMap.set(item._id, {
        id: qc._id.toString(),
        status: qc.status,
        submittedAt: qc.submittedAt || qc.createdAt,
        completionPercentage: qc.completionPercentage,
        passRate:
          counts.answered > 0
            ? Math.round((resolvedCount / counts.answered) * 100)
            : 0,
        passedCount: counts.passed,
        repairedCount: counts.repaired,
        replacedCount: counts.replaced,
        answeredQuestions: counts.answered,
        totalQuestions: qc.totalQuestions
      });
    });

    return latestQCMap;
  }

  private async getShipmentMap(robotIds: string[]) {
    const shippingMap = new Map<string, any>();

    if (robotIds.length === 0) {
      return shippingMap;
    }

    const shipmentData = await Shipment.aggregate([
      { $unwind: "$robots" },
      {
        $match: {
          "robots.robotId": { $in: robotIds }
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$robots.robotId",
          latestShipment: { $first: "$$ROOT" }
        }
      },
      {
        $project: {
          _id: 1,
          status: "$latestShipment.status"
        }
      }
    ]);

    shipmentData.forEach((item: any) => {
      shippingMap.set(item._id, {
        status: item.status
      });
    });

    return shippingMap;
  }

  private async getBillingMap(robotIds: string[]) {
    const billingMap = new Map<string, any>();

    if (robotIds.length === 0) {
      return billingMap;
    }

    const billingRecords = await Billing.aggregate([
      { $match: { robotId: { $in: robotIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$robotId",
          latestBilling: { $first: "$$ROOT" }
        }
      },
      {
        $lookup: {
          from: "clients",
          localField: "latestBilling.clientId",
          foreignField: "_id",
          as: "client"
        }
      },
      {
        $unwind: {
          path: "$client",
          preserveNullAndEmptyArrays: true
        }
      }
    ]);

    billingRecords.forEach((record: any) => {
      if (record.latestBilling) {
        billingMap.set(record._id, {
          clientName: record.client?.name || "Unknown",
          amount: record.latestBilling.amount,
          status: record.latestBilling.status
        });
      }
    });

    return billingMap;
  }

  private async getLiveStateMap(
    robotIds: string[]
  ): Promise<Map<string, RedisRobotState>> {
    const liveStateMap = new Map<string, RedisRobotState>();

    await Promise.all(
      robotIds.map(async (robotId) => {
        try {
          const state = (await redisClient.json.get(
            `robot:${robotId}`
          )) as RedisRobotState | null;

          if (state) {
            liveStateMap.set(robotId, state);
          }
        } catch (error) {
          // Ignore Redis misses and allow graceful fallback.
        }
      })
    );

    return liveStateMap;
  }

  private async getOperationalSnapshotMap(
    robotIds: string[]
  ): Promise<Map<string, OperationalSnapshotData>> {
    if (robotIds.length === 0) {
      return new Map<string, OperationalSnapshotData>();
    }

    return loadOperationalSnapshots(robotIds);
  }

  private async getStaffingRiskMap(robots: any[]) {
    const staffingRiskMap = new Map<string, string>();
    const operatorToRobotIds = new Map<string, string[]>();
    const operatorIds = robots
      .filter((robot) => robot.operatorSnapshot?.id)
      .map((robot) => {
        const operatorId = robot.operatorSnapshot.id.toString();
        const existingRobotIds = operatorToRobotIds.get(operatorId) || [];
        operatorToRobotIds.set(operatorId, [
          ...existingRobotIds,
          robot._id.toString()
        ]);
        return operatorId;
      });

    if (operatorIds.length === 0) {
      return staffingRiskMap;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [activeOvertimeSessions, autoCheckoutEntries] = await Promise.all([
      OvertimeSessionModel.find({
        operatorId: { $in: operatorIds },
        status: "active"
      })
        .select("operatorId")
        .lean(),
      attendanceModel
        .find({
          "metadata.operatorId": { $in: operatorIds },
          autoCheckedOut: true,
          startingTimestamp: { $gte: todayStart }
        })
        .select("metadata.operatorId")
        .sort({ startingTimestamp: -1 })
        .lean()
    ]);

    activeOvertimeSessions.forEach((session) => {
      const robotIds = operatorToRobotIds.get(session.operatorId) || [];
      robotIds.forEach((robotId) => {
        staffingRiskMap.set(robotId, "overtime_risk");
      });
    });

    autoCheckoutEntries.forEach((entry) => {
      const robotIds = operatorToRobotIds.get(entry.metadata.operatorId) || [];
      robotIds.forEach((robotId) => {
        if (!staffingRiskMap.has(robotId)) {
          staffingRiskMap.set(robotId, "auto_checkout_risk");
        }
      });
    });

    return staffingRiskMap;
  }
}

export const robotMasterDataService = new RobotMasterDataService();
