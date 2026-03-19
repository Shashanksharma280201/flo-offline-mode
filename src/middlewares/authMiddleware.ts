import { NextFunction, Request, Response, RequestHandler } from 'express';
import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import robotModel from '../models/Robot.js';

/**
 * JWT payload interface for robot authentication
 * Matches cloud implementation exactly
 */
interface JwtPayloadRobot {
  deviceId: string;
  iat: number;
  exp: number;
}

/**
 * Middleware to protect routes requiring robot authentication
 * Mirrors cloud protectRobot implementation from mission-control/backend/middlewares/authMiddleware.ts
 *
 * Flow:
 * 1. Extract JWT token from Authorization header (Bearer format)
 * 2. Verify token signature using JWT_SECRET
 * 3. Query robotModel.findById(deviceId) to validate robot exists
 * 4. Throw appropriate errors for missing token, expired token, or invalid robot
 */
export const protectRobot: RequestHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token;

    try {
      // Extract token from Authorization header
      if (req.headers.authorization?.startsWith('Bearer')) {
        [, token] = req.headers.authorization.split(' ');
      }

      // No token provided
      if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
      }

      // Verify token and extract deviceId
      const { deviceId } = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as JwtPayloadRobot;

      // Query robot from database
      const robot = await robotModel.findById(deviceId);

      if (!robot) {
        res.status(401);
        throw new Error('No robot found');
      }

      // Attach robot to request object for downstream use
      (req as any).robot = robot;

      next();
    } catch (error: any) {
      // Handle TokenExpiredError specifically
      if (error?.name === 'TokenExpiredError') {
        res.status(401);
        throw new Error('Token Expired, Please log in again');
      }

      // Re-throw other errors (handled by asyncHandler)
      throw error;
    }
  }
);
