import { Queue } from "bullmq";
import { createRedisInstance } from "../services/redis";

export const emailQueue = new Queue("email", {
  connection: createRedisInstance()
});
