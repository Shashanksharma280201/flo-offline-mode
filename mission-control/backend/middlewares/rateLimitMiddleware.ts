import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import RedisStore from "rate-limit-redis";
import { redisClient } from "../services/redis";
import logger from "../utils/logger";

/**
 * Helper function to create Redis store with proper connection handling
 * This prevents "Client is closed" and "Socket already opened" errors
 */
const createRedisStore = (prefix: string) => {
  return new RedisStore({
    sendCommand: async (...args: string[]) => {
      // Wait for Redis to be ready (don't try to connect, just wait)
      // The main server.ts handles the actual connection
      let retries = 0;
      while (!redisClient.isReady && retries < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }

      if (!redisClient.isReady) {
        throw new Error('Redis client not ready after 5 seconds');
      }

      return redisClient.sendCommand(args);
    },
    prefix,
  });
};

/**
 * General API rate limiter
 *
 * PRODUCTION SETTINGS - Handles multiple users behind same IP (NAT/office networks)
 * With 10-20 users from same IP:
 * - Each user makes ~50-100 requests per session
 * - Total needed: 20 users × 100 = 2000 requests per 15min
 *
 * Set to 3000 to provide buffer for retries and peak usage
 *
 * USES REDIS STORE for:
 * - Consistent counting across server restarts
 * - No race conditions in concurrent requests
 * - Accurate enforcement under high load
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 6000, // Generous limit to handle multiple users behind same NAT/proxy
  store: createRedisStore("rl:general:"),
  message: {
    error: "Too many requests from this network, please try again after 15 minutes"
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}, path: ${req.path}`);
    res.status(429).json({
      error: "Too many requests from this network, please try again after 15 minutes"
    });
  }
});

/**
 * Authentication rate limiter
 * Stricter limits for login/auth endpoints to prevent brute force
 * Limits to 20 requests per 15 minutes per IP
 *
 * CHANGED FROM 10 to 20 because:
 * - Office/NAT scenarios: 10 employees behind same IP
 * - Each employee might retry login 1-2 times
 * - 20 requests provides reasonable buffer
 *
 * REMOVED skipSuccessfulRequests for:
 * - Predictable behavior in concurrent scenarios
 * - Consistent rate limiting enforcement
 * - Better load testing accuracy
 *
 * USES REDIS STORE for:
 * - Atomic increment operations (no race conditions)
 * - Consistent counting under concurrent load
 * - Accurate threshold enforcement
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 80, // Increased from 10 to handle NAT/office scenarios
  store: createRedisStore("rl:auth:"),
  message: {
    error:
      "Too many authentication attempts from this IP, please try again after 15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // REMOVED: skipSuccessfulRequests for predictable behavior
  handler: (req: Request, res: Response) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}, path: ${req.path}`);
    res.status(429).json({
      error:
        "Too many authentication attempts from this IP, please try again after 15 minutes"
    });
  }
});

/**
 * Strict rate limiter for sensitive operations
 * Very strict limits for operations like password reset, etc.
 * Limits to 5 requests per hour per IP
 *
 * USES REDIS STORE for accurate enforcement
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 75, // Limit each IP to 5 requests per windowMs
  store: createRedisStore("rl:strict:"),
  message: {
    error: "Too many requests for this operation, please try again after 1 hour"
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(
      `Strict rate limit exceeded for IP: ${req.ip}, path: ${req.path}`
    );
    res.status(429).json({
      error: "Too many requests for this operation, please try again after 1 hour"
    });
  }
});

/**
 * Attendance rate limiter
 *
 * PRODUCTION SETTINGS - Multiple operators checking in/out from same location
 * With 50 operators at one site (worst case):
 * - Each operator: check-in + check-out = 2 requests/day
 * - Plus retries/failures: ~5 requests per operator per hour
 * - Total: 50 operators × 5 = 250 requests/hour
 *
 * Set to 500 to provide generous buffer
 *
 * KEPT skipSuccessfulRequests = true because:
 * - Attendance is high-volume, legitimate use case
 * - Only want to block malicious/failed attempts
 * - Successful check-ins should not consume quota
 *
 * USES REDIS STORE for accurate concurrent counting
 */
export const attendanceLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Generous limit for sites with many operators
  store: createRedisStore("rl:attendance:"),
  message: {
    error: "Too many attendance requests, please try again later"
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful check-ins against limit
  handler: (req: Request, res: Response) => {
    logger.warn(
      `Attendance rate limit exceeded for IP: ${req.ip}, path: ${req.path}`
    );
    res.status(429).json({
      error: "Too many attendance requests, please try again later"
    });
  }
});

/**
 * User-based rate limiter for authenticated requests
 * Uses userId instead of IP to handle shared office networks/NAT
 * More generous limits since each user gets their own quota
 *
 * Benefits:
 * - 10 users on same IP = 10 × 200 = 2000 total requests possible
 * - Scales properly with team size
 * - Fair distribution of resources
 *
 * USES REDIS STORE for:
 * - Per-user tracking across server instances
 * - Accurate counting for each authenticated user
 */
export const userBasedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 800, // Per USER (not IP), more generous than IP-based limit
  store: createRedisStore("rl:user:"),

  // Use userId from JWT token for rate limiting
  keyGenerator: (req: Request) => {
    // If user is authenticated, use their user ID
    if (req.user && (req.user as any).id) {
      return `user:${(req.user as any).id}`;
    }
    // For unauthenticated requests, don't apply this limiter at all
    // They'll be handled by generalLimiter or authLimiter instead
    return `skip:${Date.now()}`;
  },

  // Skip rate limiting for unauthenticated requests
  skip: (req: Request) => {
    return !req.user || !(req.user as any).id;
  },

  message: {
    error: "Too many requests from this account, please try again after 15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const identifier = req.user
      ? `user ${(req.user as any).id}`
      : `IP ${req.ip}`;
    logger.warn(`User-based rate limit exceeded for ${identifier}, path: ${req.path}`);
    res.status(429).json({
      error: "Too many requests from this account, please try again after 15 minutes"
    });
  }
});
