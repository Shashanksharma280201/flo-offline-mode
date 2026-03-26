/**
 * Immediate unassigned robot report trigger.
 *
 * This test bypasses the cron schedule and queues the email immediately using
 * only robot id/name pairs supplied in this file.
 *
 * Run with:
 * `npx tsx backend/tests/test-unassigned-robot-report.ts`
 */

import { queueUnassignedRobotsReportEmail } from "../workers/scheduledJobsWorker";

type TestRobotInfo = {
  _id: string;
  name: string;
};

/**
 * Queues the unassigned robot report email immediately with static robot data.
 * @returns Promise that resolves when the email job is queued
 */
async function run(): Promise<void> {
  const robots: TestRobotInfo[] = [
    { _id: "TEST-ROBOT-URL-ae6637ca", name: "MMR-101" },
    { _id: "TEST-ROBOT-URL-491767b6", name: "MMR-202" }
  ];

  await queueUnassignedRobotsReportEmail(robots);
  console.log(
    `Queued immediate unassigned robot report for ${robots.length} robots`
  );
}

void run().catch((error) => {
  console.error("Failed to queue immediate unassigned robot report");
  console.error(error);
  process.exit(1);
});
