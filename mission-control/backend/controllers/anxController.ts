import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/userModel";
import { generateEmailToken } from "../services/jsonWebToken";
import { redisClient } from "../services/redis";
import robotModel from "../models/robotModel";

interface JwtPayload {
  email: string;
  iat: number;
  exp: number;
}

/**
 * Register a user
 * @access Public
 * @param req - Request with userEmail, password and deviceId (phoneNumber of robot) in JSON
 * @param res - Response
 * @returns user and robot details
 *
 *
 */
export const loginANXUser = asyncHandler(async (req, res) => {
  const { email, password, deviceId } = req.body;

  if (!deviceId || !email || !password) {
    res.status(400);
    throw new Error("Missing required request body parameters");
  }

  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    const robot = await robotModel.findById(deviceId);
    if (!robot) {
      res.status(404);
      throw new Error("No robot found");
    }
    if (robot.users?.includes(user.id)) {
      if (robot?.access === true) {
        const token = generateEmailToken(user.email, user.role, user.permissions);

        // caches deviceId with new userToken and gets existing token if already present
        const unauthorizedToken = await redisClient.set(
          `anx:device:${deviceId}`,
          token,
          {
            EX: 2592000,
            GET: true
          }
        );

        // adds the existing token to the blackList
        if (unauthorizedToken) {
          const { exp } = jwt.verify(
            unauthorizedToken,
            process.env.JWT_SECRET as string
          ) as JwtPayload;
          const tokenKey = `bl_${unauthorizedToken}`;
          await redisClient.set(tokenKey, unauthorizedToken);
          redisClient.expireAt(tokenKey, exp);
        }

        res.status(200).json({
          id: user.id,
          name: user.name,
          email: user.email,
          token,
          robot: {
            id: robot?.id,
            name: robot?.name,
            expiry: robot?.expiry
          }
        });
      } else {
        res.status(403);
        throw new Error("Robot is locked");
      }
    } else {
      res.status(403);
      throw new Error("You dont have access to this robot");
    }
  } else {
    res.status(401);
    throw new Error("Invalid credentials");
  }
});

/**
 * Get robot details
 * @access Private
 * @param req - Request with deviceId (phoneNumber of robot) in JSON
 * @param res - Response
 * @returns robot details
 *
 *
 */
export const getMe = asyncHandler(async (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) {
    res.status(400);
    throw new Error("Missing required request body parameters");
  }
  const robot = await robotModel.findById(deviceId);
  if (!robot) {
    res.status(404);
    throw new Error("No Robot found");
  }
  res.status(201).json({
    id: robot.id,
    name: robot.name,
    access: robot.access,
    expiry: robot.expiry
  });
});
