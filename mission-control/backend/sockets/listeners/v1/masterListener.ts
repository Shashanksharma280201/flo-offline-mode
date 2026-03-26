import jwt from "jsonwebtoken";
import { Socket, Namespace, Server, DisconnectReason } from "socket.io";
import robotModel, { Robot } from "../../../models/robotModel";
import logger from "../../../utils/logger";
import { redisClient } from "../../../services/redis";
import { IUser } from "../../../models/userModel";
import { masterHandler } from "../../handlers/masterHandler";
import { RedisRobotState } from "../../handlers/clientHandler";

interface JwtPayload {
  deviceId: string;
  iat: number;
  exp: number;
}

/**
 * MasterListener for establishing connection between edge and server
 * @param masterNamespace - socketNameSpace between edge and server
 * @param io - socket instance
 *
 */
export const masterListener = (masterNamespace: Namespace, io: Server) => {
  // MiddleWare to authenticate edge
  masterNamespace.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ?? socket.handshake.headers.access_token;
      if (!token) {
        next(new Error("No token found"));
      }
      // Verify token
      const { deviceId } = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as JwtPayload;
      if (!deviceId) {
        throw new Error("Invalid Token");
      }
      const robot = await robotModel.findById(deviceId).populate("users");
      if (!robot) {
        throw new Error("No robot found");
      }
      socket.data.robot = robot;
      next();
    } catch (err: any) {
      logger.error(`${err?.stack ? err?.stack : err?.message}`);
      next(new Error(`Robot authentication failed: ${err.message}`));
    }
  });
  try {
    /* 
    masterNamespace will emit connection as soon as a connection a established with the server.
    */
    masterNamespace.on("connection", async (socket: Socket) => {
      const connectedRobot = socket.data.robot! as Robot;
      logger.info(
        `Master namespace for socket ${socket.id} connected with name ${connectedRobot.name}`
      );

      /**
       * io instance will emit robot status to all user's connected with robot
       * @param data
       */
      const emitToallConnectedClients = (event: string, data: any) => {
        if (connectedRobot?.users) {
          connectedRobot?.users.forEach((user: IUser) => {
            io.of("/v1/client").to(user.email).emit(event, {
              id: connectedRobot.id,
              data
            });
          });
        }
      };

      const { robotUrlHandler, robotGpsHandler } = masterHandler(socket, io);

      // creates key for robotID with values of robotDetails
      await redisClient.json.SET(
        `robot:${connectedRobot.id}`,
        "$",
        {
          id: connectedRobot.id,
          status: "Active",
          lastConnectionOn: Date.now(),
          url: {},
          connectedClients: {}
        },
        { NX: true }
      );
      await redisClient.json.SET(
        `robot:${connectedRobot.id}`,
        "$.lastConnectionOn",
        Date.now()
      );

      /* 
        Creating a room for bot's id
      */
      socket.join(connectedRobot.id);

      if (connectedRobot.gps?.baseStationId) {
        /* 
        Creating a room for bot's base station
      */
        socket.join(connectedRobot.gps.baseStationId);
      }

      emitToallConnectedClients("robot:status", {
        [socket.data.robot.id]: "Active"
      });

      /* 
          socket object event on connect_error logs errors
      */
      socket.on("connect_error", async (err) => {
        logger.error(`Master namespace connect_error due to ${err.message}`);
      });

      /* 
          socket object event on disconnect logs errors
      */
      const disconnectRobot = async (
        reason: DisconnectReason,
        details: any
      ) => {
        logger.error(
          `Master Namespace for socket ${socket.id} with id ${
            connectedRobot.name
          } disconnected due to ${reason}: ${JSON.stringify(details)}`
        );

        emitToallConnectedClients("robot:status", {
          [socket.data.robot.id]: "Offline"
        });
        logger.info(`Deleting connection status for ${socket.data.robot.name}`);
        await redisClient.del(`robot:${socket.data.robot.id}`);
      };

      socket.on("disconnect", async (reason, details) => {
        const robot = (await redisClient.json.get(
          `robot:${socket.data.robot.id}`
        )) as RedisRobotState;

        if (reason === "ping timeout") {
          if (!robot) {
            logger.error("Ping timeout but no robot found");
            return;
          }

          if (!robot.lastConnectionOn) {
            logger.error(`No last connection time found for ${robot}`);
            await disconnectRobot(reason, details);
            return;
          }

          const timeDiff = Date.now() - robot.lastConnectionOn;

          // If the last time the robot connected was equal to or more than 60 seconds ago, consider it disconnected
          if (timeDiff >= 60000 + 25000) {
            logger.info(
              `${
                connectedRobot.name
              } will be disconnected due to time diff of ${timeDiff / 1000}s`
            );
            await disconnectRobot(reason, details);
            return;
          }

          logger.info(
            `${connectedRobot.name} reconnected in ${timeDiff / 1000}s`
          );
          return;
        }

        await disconnectRobot(reason, details);
      });

      /* 
           Event Handler for robot:url event
      */
      socket.on("robot:url", robotUrlHandler);
      /* 
          Event Handler for robot:location event
      */
      socket.on("robot:gps", robotGpsHandler);
    });
  } catch (error: any) {
    logger.error(
      `${error.name ? +error.name + error.message : error?.message}`
    );
  }
};
