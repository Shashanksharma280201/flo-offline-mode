import { Request, Response } from "express";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import userModel, { IUser } from "../models/userModel";
import robotModel, { Robot } from "../models/robotModel";
import appUserModel from "../models/appUserModel";
import clientModel from "../models/clientModel";
import { s3Client } from "../services/aws";
import { redisClient } from "../services/redis";
import pathMapModel, { PathMap } from "../models/pathMapModel";
import { MqttClientConnection } from "../mqtt/mqttClientConnection";
import { DEFAULT_CUSTOM_PERMISSIONS, ALL_PERMISSIONS } from "../utils/roles";
import logger from "../utils/logger";

// Helper validation functions
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" };
  }
  return { valid: true };
};

const validatePermissions = (permissions: string[]): boolean => {
  return permissions.every(permission => ALL_PERMISSIONS.includes(permission as any));
};

const sanitizeName = (name: string): string => {
  return name.trim().replace(/\s+/g, ' ').substring(0, 100);
};

/**
 * Get user details
 * @access Private
 * @param req - Request with userId in JSON
 * @param res - Response
 * @returns user details
 *
 *
 */
export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const { id }: { id: string } = req.body;
  if (!id) {
    res.status(400);
    throw new Error("Missing required request parameter.");
  }
  const user = await userModel.findById(id).select("-password");
  if (!user) {
    res.status(404);
    throw new Error("No user found for Id");
  }
  res.status(200).json(user);
});

/**
 * Change role of a user
 * @access Private
 * @param req - Request with email and role in JSON
 * @param res - Response
 * @returns updated user details
 *
 *
 */
export const roleHandler = asyncHandler(async (req: Request, res: Response) => {
  const { email, role }: { email: string; role: string } = req.body;
  if (!email || !role) {
    res.status(400);
    throw new Error("Missing required request parameter.");
  }
  const user = await userModel.findOne({ email }).select("-password");

  // only admins can change the role which is handled by middleware additional validations are handled here
  if (user?.id === req?.user?.id) {
    res.status(403);
    throw new Error("User cannot change their own role.");
  }
  const updatedUser = await userModel
    .findByIdAndUpdate(user?.id, { role }, { new: true })
    .select("-password");
  if (!updatedUser) {
    res.status(404);
    throw new Error("No user found");
  }
  res.status(200).json(updatedUser);
});

/**
 * Sync user and robot
 * @access Private
 * @returns updated user details
 *
 *
 */
export const syncUserWithRobots = asyncHandler(
  async (req: Request, res: Response) => {
    const users = await userModel.find();
    const robots = await robotModel.find();

    users.forEach(async (user) => {
      user.robots = robots.filter((robot) => {
        if (robot.users) {
          return robot.users.includes(user.id);
        }
        return false;
      }) as Robot[];
      await user.save();
    });

    res.status(200).json({
      message: "Data Synced Successfully"
    });
  }
);
/**
 * Sync user and robot
 * @access Private
 * @returns updated user details
 *
 *
 */
export const syncUserWithPathMaps = asyncHandler(
  async (req: Request, res: Response) => {
    const users = await userModel.find();
    const pathMaps = await pathMapModel.find();

    users.forEach(async (user) => {
      user.pathMaps = pathMaps.filter((pathMap) => {
        if (pathMap.users) {
          return pathMap.users.includes(user.id);
        }
        return false;
      }) as PathMap[];
      await user.save();
    });

    res.status(200).json({
      message: "Data Synced Successfully"
    });
  }
);
/**
 * Sync user and robot
 * @access Private
 * @returns updated user details
 *
 *
 */
export const syncAppUserWithRobots = asyncHandler(
  async (req: Request, res: Response) => {
    const appUsers = await appUserModel.find();
    const robots = await robotModel.find();

    appUsers.forEach(async (appUser) => {
      appUser.robots = robots.filter((robot) => {
        if (robot.appUsers) {
          return robot.appUsers.includes(appUser._id);
        }
        return false;
      }) as Robot[];
      await appUser.save();
    });

    res.status(200).json({
      message: "Data Synced Successfully"
    });
  }
);

/**
 * List robots accessible by a user
 * @access Private
 * @param req - Request
 * @param res - Response
 * @returns robot details along with status
 *
 *
 */

function isNumeric(str: string): boolean {
  return /^\d+$/.test(str);
}

export const getRobotsListFromUser = asyncHandler(async (req, res) => {
  const { id } = req.user!;

  const { robots } = (await userModel
    .findById(id)
    .populate({
      path: "robots",
      populate: { path: "fleet" },
      select: "-appUsers -users -access -password"
    })
    .select("robots")) as IUser;

  const robotsWithStatus = MqttClientConnection.fetchRobotStatus();

  if (robots) {
    // gets status of every robot from redis
    const robotPromises = robots.map(async (robot) => {
      const getObjectCommand = new GetObjectCommand({
        Bucket: "flo-robot-data",
        Key: `${robot.id}/image/logo.png`
      });
      const imageUrl = await getSignedUrl(s3Client, getObjectCommand, {
        expiresIn: 3600
      });
      robot.image = imageUrl;

      // For MQTT robots, prioritize in-memory status over Redis
      if (robotsWithStatus[robot.id]) {
        robot.status = robotsWithStatus[robot.id];
      } else {
        // For non-MQTT robots (WebSocket robots), get status from Redis
        const status = (await redisClient.json.get(`robot:${robot.id}`, {
          path: [".status"]
        })) as string;
        robot.status = status || "Offline";
      }
      return robot;
    });

    const updatedRobots = await Promise.all(robotPromises);
    logger.debug("Robots with status from MQTT", { robotsWithStatus });
    logger.debug("Updated robots list", {
      robots: updatedRobots.map((robot) => ({ id: robot.id, name: robot.name, status: robot.status }))
    });


    const numberedBots: [number, Robot][] = [];
    const nonNumberedBots: Robot[] = [];

    updatedRobots.forEach((robot) => {
      const parts = robot.name.split("-");
      const number = parts[1];

      if (isNumeric(number)) {
        numberedBots.push([Number(number), robot]);
      } else {
        nonNumberedBots.push(robot);
      }
    });

    numberedBots.sort((a, b) => a[0] - b[0]);

    const sortedRobots = [
      ...numberedBots.map(([_, robot]) => robot),
      ...nonNumberedBots
    ];

    // Extract nested bomCompletionStatus to top-level for frontend compatibility
    const robotsWithBomStatus = sortedRobots.map((robot) => ({
      ...(robot as any).toObject(),
      bomCompletionStatus: robot.manufacturingData?.bomCompletionStatus
    }));

    res.status(200).json(robotsWithBomStatus);
  } else {
    res.status(400);
    throw new Error("No robots assigned to the requested user");
  }
});

/**
 * List clients accessible by a user
 * @access Private
 * @param req - Request
 * @param res - Response
 * @returns robot details along with status
 *
 *
 */
export const getClientsListFromUser = asyncHandler(async (req, res) => {
  const { id } = req.user!;

  const user = await userModel
    .findById(id)
    .populate({
      path: "clients",
      populate: [
        {
          path: "appUsers",
          select: "id name robots clientId phoneNumber"
        },
        {
          path: "users",
          select: "id name email"
        }
      ]
    })
    .select("clients");

  logger.info("User clients data:", {
    userId: id,
    clientsRaw: user?.clients,
    clientsLength: user?.clients?.length
  });

  const { clients } = user as IUser;

  // Filter out null values (deleted clients) and return
  if (clients && clients.length > 0) {
    const validClients = clients.filter((client) => client !== null);
    logger.info("Valid clients after filtering:", {
      validClientsCount: validClients.length,
      validClients: validClients.map((c) => ({ id: c.id, name: c.name }))
    });
    res.status(200).json(validClients);
  } else {
    logger.warn("No clients found for user", { userId: id });
    res.status(200).json([]);
  }
});

/**
 * Create a new user (Admin only)
 * @access Private (Admin with change_users permission)
 * @param req - Request with name, email, password, role, permissions, robots, clients, operators in JSON
 * @param res - Response
 * @returns created user details
 */
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    email,
    password,
    role,
    permissions,
    robots,
    clients,
    operators
  }: {
    name: string;
    email: string;
    password: string;
    role: "admin" | "custom";
    permissions?: string[];
    robots?: string[];
    clients?: string[];
    operators?: string[];
  } = req.body;

  // Sanitize inputs
  const sanitizedName = name ? sanitizeName(name) : "";
  const sanitizedEmail = email ? email.trim().toLowerCase() : "";

  // Validation
  if (!sanitizedName || !sanitizedEmail || !password || !role) {
    res.status(400);
    throw new Error("Missing required fields: name, email, password, role");
  }

  // Validate email format
  if (!validateEmail(sanitizedEmail)) {
    res.status(400);
    throw new Error("Invalid email format");
  }

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    res.status(400);
    throw new Error(passwordValidation.message || "Invalid password");
  }

  // Validate permissions for custom role
  if (role === "custom" && permissions && permissions.length > 0) {
    if (!validatePermissions(permissions)) {
      res.status(400);
      throw new Error("Invalid permissions provided");
    }
  }

  // Check if user already exists
  const userExists = await userModel.findOne({ email: sanitizedEmail });
  if (userExists) {
    res.status(400);
    throw new Error("User with this email already exists");
  }

  // Validate robots if provided
  if (robots && robots.length > 0) {
    const robotCount = await robotModel.countDocuments({ _id: { $in: robots } });
    if (robotCount !== robots.length) {
      res.status(400);
      throw new Error("One or more robot IDs are invalid");
    }
  }

  // Validate clients if provided
  if (clients && clients.length > 0) {
    const clientCount = await clientModel.countDocuments({ _id: { $in: clients } });
    if (clientCount !== clients.length) {
      res.status(400);
      throw new Error("One or more client IDs are invalid");
    }
  }

  // Validate operators if provided
  if (operators && operators.length > 0) {
    const operatorCount = await appUserModel.countDocuments({ _id: { $in: operators } });
    if (operatorCount !== operators.length) {
      res.status(400);
      throw new Error("One or more operator IDs are invalid");
    }
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Determine permissions
  let finalPermissions: string[] = [];
  if (role === "admin") {
    // Admin gets all permissions (handled in roles.ts)
    finalPermissions = [];
  } else if (role === "custom") {
    // Use provided permissions or default to basic user permissions
    finalPermissions = permissions && permissions.length > 0
      ? permissions
      : [...DEFAULT_CUSTOM_PERMISSIONS];
  }

  // Create user
  const user = await userModel.create({
    name: sanitizedName,
    email: sanitizedEmail,
    password: hashedPassword,
    role,
    permissions: finalPermissions,
    robots: robots || [],
    clients: clients || [],
    operators: operators || []
  });

  if (user) {
    // Add user to robots (bidirectional relationship)
    if (robots && robots.length > 0) {
      await robotModel.updateMany(
        { _id: { $in: robots } },
        { $addToSet: { users: user.id } }
      );
    }

    logger.info(`User created: ${user.email} (${user.role}) by admin`);

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      robots: user.robots,
      clients: user.clients,
      operators: user.operators,
      message: "User created successfully"
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

/**
 * Get all users
 * @access Private (Admin with change_users permission)
 * @param req - Request
 * @param res - Response
 * @returns List of all users
 */
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await userModel
    .find({})
    .select("-password") // Don't send passwords
    .populate("clients", "name")
    .populate("operators", "name phoneNumber");

  // Convert to plain objects with id field (not _id)
  const usersData = users.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    robots: user.robots,
    clients: user.clients,
    operators: user.operators,
    notificationPreferance: user.notificationPreferance,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }));

  res.status(200).json({
    users: usersData,
    totalUsers: usersData.length
  });
});

/**
 * Get single user by ID for editing
 * @access Private (Admin with change_users permission)
 * @param req - Request with userId in params
 * @param res - Response
 * @returns User details
 */
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const user = await userModel
    .findById(userId)
    .select("-password");
    // Don't populate clients/operators - return IDs only for assignment form

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Convert to plain object with id field
  const userData = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    robots: user.robots,
    clients: user.clients,
    operators: user.operators,
    notificationPreferance: user.notificationPreferance
  };

  res.status(200).json(userData);
});

/**
 * Update user
 * @access Private (Admin with change_users permission)
 * @param req - Request with userId in params and update data in body
 * @param res - Response
 * @returns Updated user details
 */
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const {
    name,
    email,
    password,
    role,
    permissions,
    robots,
    clients,
    operators
  }: {
    name?: string;
    email?: string;
    password?: string;
    role?: "admin" | "custom";
    permissions?: string[];
    robots?: string[];
    clients?: string[];
    operators?: string[];
  } = req.body;

  const user = await userModel.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Sanitize inputs
  const sanitizedName = name ? sanitizeName(name) : undefined;
  const sanitizedEmail = email ? email.trim().toLowerCase() : undefined;

  // Validate email format if being changed
  if (sanitizedEmail && sanitizedEmail !== user.email) {
    if (!validateEmail(sanitizedEmail)) {
      res.status(400);
      throw new Error("Invalid email format");
    }
    const emailExists = await userModel.findOne({ email: sanitizedEmail });
    if (emailExists) {
      res.status(400);
      throw new Error("Email already in use by another user");
    }
  }

  // Validate password strength if being changed
  if (password) {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      res.status(400);
      throw new Error(passwordValidation.message || "Invalid password");
    }
  }

  // Validate permissions if being changed
  if (permissions && permissions.length > 0) {
    if (!validatePermissions(permissions)) {
      res.status(400);
      throw new Error("Invalid permissions provided");
    }
  }

  // Validate robots if provided
  if (robots && robots.length > 0) {
    const robotCount = await robotModel.countDocuments({ _id: { $in: robots } });
    if (robotCount !== robots.length) {
      res.status(400);
      throw new Error("One or more robot IDs are invalid");
    }
  }

  // Validate clients if provided
  if (clients && clients.length > 0) {
    const clientCount = await clientModel.countDocuments({ _id: { $in: clients } });
    if (clientCount !== clients.length) {
      res.status(400);
      throw new Error("One or more client IDs are invalid");
    }
  }

  // Validate operators if provided
  if (operators && operators.length > 0) {
    const operatorCount = await appUserModel.countDocuments({ _id: { $in: operators } });
    if (operatorCount !== operators.length) {
      res.status(400);
      throw new Error("One or more operator IDs are invalid");
    }
  }

  // Hash password if provided
  let hashedPassword: string | undefined;
  if (password) {
    const salt = await bcrypt.genSalt(10);
    hashedPassword = await bcrypt.hash(password, salt);
  }

  // Handle robot assignment changes (bidirectional update)
  if (robots !== undefined) {
    // Convert Robot objects to string IDs for comparison
    const oldRobots = (user.robots || []) as unknown as string[];
    const newRobots = robots;

    // Remove user from old robots that are no longer assigned
    const robotsToRemove = oldRobots.filter((r) => !newRobots.includes(r));
    if (robotsToRemove.length > 0) {
      await robotModel.updateMany(
        { _id: { $in: robotsToRemove } },
        { $pull: { users: user.id } }
      );
    }

    // Add user to new robots
    const robotsToAdd = newRobots.filter((r) => !oldRobots.includes(r));
    if (robotsToAdd.length > 0) {
      await robotModel.updateMany(
        { _id: { $in: robotsToAdd } },
        { $addToSet: { users: user.id } }
      );
    }
  }

  // Update user
  const updatedUser = await userModel.findByIdAndUpdate(
    userId,
    {
      ...(sanitizedName && { name: sanitizedName }),
      ...(sanitizedEmail && { email: sanitizedEmail }),
      ...(hashedPassword && { password: hashedPassword }),
      ...(role && { role }),
      ...(permissions !== undefined && { permissions }),
      ...(robots !== undefined && { robots }),
      ...(clients !== undefined && { clients }),
      ...(operators !== undefined && { operators })
    },
    { new: true }
  ).select("-password");

  logger.info(`User updated: ${updatedUser?.email} by admin`);

  res.status(200).json({
    ...updatedUser?.toObject(),
    message: "User updated successfully"
  });
});

/**
 * Delete user
 * @access Private (Admin with change_users permission)
 * @param req - Request with userId in params
 * @param res - Response
 * @returns Success message
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  // Prevent self-deletion
  if (req.user && req.user.id === userId) {
    res.status(403);
    throw new Error("You cannot delete your own account");
  }

  const user = await userModel.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Remove user from all assigned robots
  if (user.robots && user.robots.length > 0) {
    await robotModel.updateMany(
      { _id: { $in: user.robots } },
      { $pull: { users: user.id } }
    );
  }

  // Delete user
  await userModel.findByIdAndDelete(userId);

  logger.info(`User deleted: ${user.email} by admin ${req.user?.email || 'unknown'}`);

  res.status(200).json({
    message: "User deleted successfully"
  });
});
