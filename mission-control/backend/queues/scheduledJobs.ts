import { Queue } from "bullmq";
import { createRedisInstance } from "../services/redis";

export type ScheduledJobType =
  | "maintenance-check"
  | "maintenance-due"
  | "generate-site-utilization-report"
  | "issue-pending"
  | "leads-daily-update"
  | "remind-next-step"
  | "daily-robot-data-reset"
  | "check-expired-overtime"
  | "auto-checkout"
  | "unassigned-robot-sweep"
  | "auto-checkout";

export interface ScheduledJobPayload {
  type: ScheduledJobType;
  clientId?: string;
  noOfTrips?: number;
  issueId?: string;
  robotId?: string;
  url?: string;
}

export const scheduledJobsQueue = new Queue("schedule-job", {
  connection: createRedisInstance()
});
