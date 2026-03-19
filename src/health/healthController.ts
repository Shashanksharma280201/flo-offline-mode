import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Redis from 'ioredis';

export async function healthCheck(req: Request, res: Response): Promise<void> {
  const health: any = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'ok',
  };

  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      health.mongodb = 'disconnected';
      health.status = 'degraded';
    } else if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      health.mongodb = 'connected';
    } else {
      health.mongodb = 'disconnected';
      health.status = 'degraded';
    }

    // Check Redis connection using ioredis
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });

    const pong = await redis.ping();
    if (pong !== 'PONG') {
      health.redis = 'unhealthy';
      health.status = 'degraded';
    } else {
      health.redis = 'connected';
    }

    await redis.quit();

    if (health.status === 'degraded') {
      res.status(503).json(health);
      return;
    }

    res.status(200).json(health);
  } catch (error: any) {
    health.status = 'unhealthy';
    health.error = error.message;
    res.status(503).json(health);
  }
}
