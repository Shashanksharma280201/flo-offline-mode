import { Worker } from "bullmq";
import { createRedisInstance } from "../services/redis";
import logger from "../utils/logger";
import { sendPushNotificationToOperator } from "../services/pushNotificationService";

export type NotificationJob = {
  type: "maintenance" | "issue" | "shift-end" | "checkout-reminder" | "auto-checkout";
  body: string;
  robotId: string;
  title: string;
  data?: { [key: string]: string };
};

const pushNotificationWorker = new Worker<NotificationJob, void>(
  "pushNotification",
  async (job) => {
    const { type, title, body, robotId, data } = job.data;
    await sendPushNotificationToOperator({
      title,
      body,
      robotId,
      type,
      data
    });
  },
  { connection: createRedisInstance() }
);

pushNotificationWorker.on("completed", (job) => {
  logger.data(`Push Notification sent successfully for ${job.data.robotId}`);
});

pushNotificationWorker.on("failed", (job, err) => {
  logger.error(
    `Push Notification job ${job?.id} failed with error: ${err.message}`
  );
});
