import jwt from "jsonwebtoken";
import { Socket, Namespace, Server, DisconnectReason } from "socket.io";
import Redis from "ioredis";
import robotModel, { Robot } from "../../../models/Robot.js";
import { redisConnection } from "../../../config/redis.js";

// Create singleton Redis client for Socket.IO operations
const redisClient = new Redis({
  ...redisConnection,
  // Enable RedisJSON commands
  lazyConnect: false,
});

// Extend Redis type to include json commands
declare module "ioredis" {
  interface RedisCommander<Context> {
    json: {
      SET: (key: string, path: string, value: any, options?: any) => Promise<string | null>;
      GET: (key: string, path?: string) => Promise<any>;
    };
  }
}

/**
 * JWT payload interface for robot authentication
 */
interface JwtPayload {
  deviceId: string;
  iat: number;
  exp: number;
}

/**
 * Redis robot state interface
 */
interface RedisRobotState {
  id: string;
  status: "Active" | "Inactive";
  lastConnectionOn: number; // Unix timestamp in milliseconds
  url: {}; // Empty object (cloud uses for MQTT topics)
  connectedClients: {}; // Empty object (cloud tracks web UI clients)
}

/**
 * Socket.IO namespace listener for robot master connections
 * Mirrors cloud implementation with JWT handshake authentication and Redis state tracking
 *
 * @param masterNamespace - Socket.IO namespace for /v1/robot/master
 * @param io - Socket.IO server instance
 */
export const masterListener = (masterNamespace: Namespace, io: Server) => {
  // JWT authentication in handshake
  masterNamespace.use(async (socket, next) => {
    try {
      // Extract token from auth object or headers
      const token = socket.handshake.auth.token ?? socket.handshake.headers.access_token;

      if (!token) {
        return next(new Error("No token found"));
      }

      // Verify token and extract deviceId
      const { deviceId } = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as JwtPayload;

      // Query robot from database (omit .populate("users") - offline mode has no user population)
      const robot = await robotModel.findById(deviceId);

      if (!robot) {
        return next(new Error("No robot found"));
      }

      // Attach robot to socket data
      socket.data.robot = robot;

      next();
    } catch (err: any) {
      next(new Error(`Robot authentication failed: ${err.message}`));
    }
  });

  // Connection event handler
  masterNamespace.on("connection", async (socket: Socket) => {
    const connectedRobot = socket.data.robot! as Robot;

    console.log(`Master namespace connected: ${connectedRobot.name}`);

    // Store state in Redis using RedisJSON
    await redisClient.json.SET(
      `robot:${connectedRobot._id.toString()}`,
      "$",
      {
        id: connectedRobot._id.toString(),
        status: "Active",
        lastConnectionOn: Date.now(),
        url: {},
        connectedClients: {}
      }
    );

    // Update lastConnectionOn timestamp
    await redisClient.json.SET(
      `robot:${connectedRobot._id.toString()}`,
      "$.lastConnectionOn",
      Date.now()
    );

    // Join room with robot ID
    socket.join(connectedRobot._id.toString());
    console.log(`Robot ${connectedRobot.name} joined room ${connectedRobot._id}`);

    // Disconnect event handler with 30-second detection
    socket.on("disconnect", async (reason: DisconnectReason, details: any) => {
      try {
        // Get robot state from Redis
        const robot = await redisClient.json.GET(
          `robot:${socket.data.robot._id}`
        ) as RedisRobotState | null;

        if (reason === "ping timeout") {
          // Check if robot exists in Redis
          if (!robot) {
            console.error(`Robot state not found in Redis for ${connectedRobot.name}`);
            return;
          }

          // Calculate time difference since last connection
          const timeDiff = Date.now() - robot.lastConnectionOn;

          // If disconnected for 30+ seconds, consider truly disconnected
          if (timeDiff >= 30000) {
            console.log(`${connectedRobot.name} disconnected after ${timeDiff / 1000}s`);
            await redisClient.del(`robot:${socket.data.robot._id}`);
            return;
          }

          // Reconnected within 30 seconds
          console.log(`${connectedRobot.name} reconnected in ${timeDiff / 1000}s`);
        } else {
          // Other disconnect reasons (client disconnect, transport close, etc.)
          console.log(`${connectedRobot.name} disconnected: ${reason}`);
          await redisClient.del(`robot:${socket.data.robot._id}`);
        }
      } catch (err: any) {
        console.error(`Error handling disconnect for ${connectedRobot.name}:`, err.message);
      }
    });
  });
};
