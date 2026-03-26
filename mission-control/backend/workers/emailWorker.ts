import { Worker } from "bullmq";
import { createRedisInstance } from "../services/redis";
import { sendEmail } from "../services/emailService";
import logger from "../utils/logger";

type EmailJob = {
  to: string;
  subject: string;
  text: string;
  body: string;
  cc?: string;
  html?: string;
};

const emailWorker = new Worker<EmailJob, void>(
  "email",
  async (job) => {
    logger.debug(`Recevied a ${job.name} job`);
    const { to, subject, body, cc, html } = job.data;
    await sendEmail(to, subject, body, cc, html);
  },
  { connection: createRedisInstance() }
);

emailWorker.on("completed", (job) => {
  logger.debug(`Email job ${job.id} completed`);
});

emailWorker.on("failed", (job, err) => {
  logger.error(`Email job ${job?.id} failed with error: ${err.message}`);
});
