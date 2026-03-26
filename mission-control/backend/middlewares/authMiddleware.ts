import { NextFunction, Request, Response } from "express";
import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";

import logger from "../utils/logger";

import User from "../models/userModel";
import AppUserModel from "../models/appUserModel";
import { redisClient } from "../services/redis";
import robotModel from "../models/robotModel";
import { checkPermission } from "../utils/roles";

interface JwtPayload {
  email: string;
  iat: number;
  exp: number;
}
interface JwtPayloadRobot {
  deviceId: string;
  iat: number;
  exp: number;
}
interface JwtAppPayload {
  userId: string;
  iat: number;
  exp: number;
}

interface JwtOptionalPayload {
  userId?: string;
  email?: string;
  iat: number;
  exp: number;
}
/**
 * MiddleWare that handles user's JWT token authentication
 * @param req - Request
 * @param res - Response
 * @param next - To run or execute the code after all the middleware function is finished.
 *
 *
 */
const protect = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      try {
        // Get token from header
        [, token] = req.headers.authorization.split(" ");

        // Verify token
        const { email } = jwt.verify(
          token,
          process.env.JWT_SECRET as string
        ) as JwtPayload;

        // Get user from the token
        const user = await User.findOne({ email }).select("-password");
        if (!user) {
          throw new Error("No valid user found");
        }

        // Forward the now authenticated user
        req.user = user;

        next();
      } catch (error: any) {
        if (error?.name === "TokenExpiredError") {
          res.status(401);
          throw new Error("Token Expired, Please log in again");
        }
        logger.error(
          `Not authorized ${error.message ? `:${error.message}` : ""}`
        );
        res.status(401);
        throw new Error(
          `Not authorized ${error.message ? `:${error.message}` : ""}`
        );
      }
    }

    if (!token) {
      res.status(401);
      throw new Error("Not authorized, no token");
    }
  }
);

/**
 * MiddleWare that handles robot's JWT token authentication
 * @param req - Request
 * @param res - Response
 * @param next - To run or execute the code after all the middleware function is finished.
 *
 *
 */
export const protectRobot = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      try {
        // Get token from header
        [, token] = req.headers.authorization.split(" ");

        // Verify token
        const { deviceId } = jwt.verify(
          token,
          process.env.JWT_SECRET as string
        ) as JwtPayloadRobot;
        if (!deviceId) {
          throw new Error("Invalid Token");
        }

        // Get robot from the token
        const robot = await robotModel.findById(deviceId);
        if (!robot) {
          throw new Error("No robot found");
        }

        next();
      } catch (error: any) {
        if (error?.name === "TokenExpiredError") {
          res.status(401);
          throw new Error("Token Expired, Please log in again");
        }
        logger.error(
          `Not authorized ${error.message ? `:${error.message}` : ""}`
        );
        res.status(401);
        throw new Error(
          `Not authorized ${error.message ? `:${error.message}` : ""}`
        );
      }
    }

    if (!token) {
      res.status(401);
      throw new Error("Not authorized, no token");
    }
  }
);

/**
 * MiddleWare that handles ANX JWT token authentication and rejects black listed users
 * @param req - Request
 * @param res - Response
 * @param next - To run or execute the code after all the middleware function is finished.
 *
 *
 */
export const protectAnx = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      try {
        // Get token from header
        [, token] = req.headers.authorization.split(" ");

        // token provided?
        if (token === null) {
          res.status(401);
          throw new Error("Not authorized, no token");
        }

        // token in deny list?
        const inDenyList = await redisClient.get(`bl_${token}`);
        if (inDenyList) {
          res.status(403);
          throw new Error("Not Authorized, Token Rejected");
        }

        // Verify token
        const { email } = jwt.verify(
          token,
          process.env.JWT_SECRET as string
        ) as JwtPayload;

        // Get user from the token
        req.user = await User.findOne({ email }).select("-password");

        next();
      } catch (error: any) {
        if (error?.name === "TokenExpiredError") {
          res.status(401);
          throw new Error("Token Expired, Please log in again");
        }
        logger.error(
          `Not authorized ${error.message ? `:${error.message}` : ""}`
        );
        res.status(401);
        throw new Error(error?.message);
      }
    }

    if (!token) {
      res.status(401);
      throw new Error("Not authorized, no token");
    }
  }
);

/**
 * MiddleWare that handles Admin user JWT token authentication
 * @param req - Request
 * @param res - Response
 * @param next - To run or execute the code after all the middleware function is finished.
 *
 *
 */
export const protectAdmin = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      try {
        // Get token from header
        [, token] = req.headers.authorization.split(" ");

        // Verify token
        const { email } = jwt.verify(
          token,
          process.env.JWT_SECRET as string
        ) as JwtPayload;

        // Get user from the token
        const user = await User.findOne({ email }).select("-password");
        if (user?.role !== "admin") {
          res.status(401);
          throw new Error(
            "Not authorized, User does not have sufficient access rights"
          );
        }

        // Forward the now authenticated user
        req.user = user;

        next();
      } catch (error: any) {
        logger.error(
          `Not authorized ${error.message ? `:${error.message}` : ""}`
        );
        res.status(401);
        throw new Error(
          "Not authorized, User does not have sufficient access rights"
        );
      }
    }

    if (!token) {
      res.status(401);
      throw new Error("Not authorized, no token");
    }
  }
);

/**
 * MiddleWare that handles app user JWT token authentication
 * @param req - Request
 * @param res - Response
 * @param next - To run or execute the code after all the middleware function is finished.
 *
 *
 */
export const protectApp = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      try {
        // Get token from header
        [, token] = req.headers.authorization.split(" ");

        // Verify token
        const { userId } = jwt.verify(
          token,
          process.env.JWT_SECRET as string
        ) as JwtAppPayload;

        const appUser = await AppUserModel.findById(userId).select("-password");
        if (!appUser) {
          res.status(404);
          throw new Error("No valid data collector found");
        }

        // Forward the now authenticated appUser
        req.user = appUser;

        next();
      } catch (error: any) {
        if (error?.name === "TokenExpiredError") {
          res.status(401);
          throw new Error("Token Expired, Please log in again");
        }
        logger.error(
          `Not authorized ${error.message ? `:${error.message}` : ""}`
        );
        res.status(401);
        throw new Error(
          `Not authorized ${error.message ? `:${error.message}` : ""}`
        );
      }
    }

    if (!token) {
      res.status(401);
      throw new Error("Not authorized, no token");
    }
  }
);

export const protectWebAndApp = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      try {
        // Get token from header
        [, token] = req.headers.authorization.split(" ");

        // Verify token
        const { userId, email } = jwt.verify(
          token,
          process.env.JWT_SECRET as string
        ) as JwtOptionalPayload;

        if (email) {
          // Get user from the token
          const user = await User.findOne({ email }).select("-password");
          if (!user) {
            throw new Error("No valid user found");
          }

          // Forward the now authenticated user
          req.user = user;

          next();
          return;
        }
        if (userId) {
          const operator = await AppUserModel.findById(userId).select(
            "-password"
          );
          if (!operator) {
            res.status(404);
            throw new Error("No valid data collector found");
          }

          // Forward the now authenticated appUser
          req.user = operator;

          next();
          return;
        }
        throw new Error("Unknown token");
      } catch (error: any) {
        if (error?.name === "TokenExpiredError") {
          res.status(401);
          throw new Error("Token Expired, Please log in again");
        }
        logger.error(
          `Not authorized ${error.message ? `:${error.message}` : ""}`
        );
        res.status(401);
        throw new Error(
          `Not authorized ${error.message ? `:${error.message}` : ""}`
        );
      }
    }

    if (!token) {
      res.status(401);
      throw new Error("Not authorized, no token");
    }
  }
);

export const hasPermission = (permission: string) => {
  return asyncHandler((req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Not authorized, no token");
    }

    const { role, permissions } = req.user;

    // Pass custom permissions to checkPermission for granular access control
    const isPermitted = checkPermission(role, permission, permissions);

    if (isPermitted) {
      next();
    } else {
      res.status(401);
      throw new Error("Unauthorized action");
    }
  });
};

export default protect;
