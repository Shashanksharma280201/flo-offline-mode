import dotenv from "dotenv";
import { createClient } from "redis";
import { Redis, RedisOptions } from "ioredis";
import logger from "../utils/logger";

const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null
};

export const createRedisInstance = () => new Redis(redisConfig);

dotenv.config();
const redisHost =
  process.env.REDIS_HOST && process.env.REDIS_PORT
    ? `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
    : undefined;
const url = redisHost ? `redis://${redisHost}` : undefined;
export const redisClient = createClient({
  url
});

/*
    redisClient will emit error when an established Redis server connection has any errors in connecting.
*/
redisClient.on("error", (error) => {
  logger.error("Redis Client Error", error);
});

/*
    redisClient will emit connect as soon as the stream is connected to the server.
*/
redisClient.on("connect", () => {
  logger.info(`Redis connected `);
});

/*
     redisClient will emit reconnect as soon as the stream is trying to reconnect to the server.
*/
redisClient.on("reconnecting", () => {
  logger.warn("Reconnecting Redis...");
});

/*
    redisClient will emit end when an established Redis server connection has closed.
*/
redisClient.on("end", () => {
  logger.warn("Redis connection closed");
});

/*
    redisClient will emit warning when an established Redis server connection has any warning
*/
redisClient.on("warning", (warning) => {
  logger.warn(`Warning with redis: ${warning}`);
});

// If the Node process ends, close the Redis connection
process.on("SIGINT", () => {
  // Closing the mongoose connection
  try {
    redisClient.quit();
  } catch (error: any) {
    logger.error(error);
  }
  logger.info("Closing Redis Connection");
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error: any) {
    logger.error(error);
    process.exit(1);
  }
};

export default connectRedis;
