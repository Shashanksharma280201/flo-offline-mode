import { Queue } from "bullmq";
import { createRedisInstance } from "../services/redis";
import { NotificationJob } from "../workers/pushNotificationWorker";

export const pushNotificationQueue = new Queue<NotificationJob, any>(
  "pushNotification",
  {
    connection: createRedisInstance()
  }
);
