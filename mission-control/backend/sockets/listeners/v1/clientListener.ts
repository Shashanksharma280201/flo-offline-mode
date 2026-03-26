import jwt from "jsonwebtoken";
import { Namespace, Server, Socket } from "socket.io";
import userModel from "../../../models/userModel";
import { redisClient } from "../../../services/redis";
import logger from "../../../utils/logger";
import {
  clientHandler,
  syncConnectedClientsState
} from "../../handlers/clientHandler";
import { MqttClientConnection } from "../../../mqtt/mqttClientConnection";

interface JwtPayload {
  email: string;
  iat: number;
  exp: number;
}

/**
 * ClientListener for establishing connection between client and server
 * @param clientNamespace - socketNameSpace between client and server
 * @param io - socket instance
 *
 */
export const clientListener = (clientNamespace: Namespace, io: Server) => {
  // MiddleWare to authenticate user
  clientNamespace.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ?? socket.handshake.headers.access_token;
      if (!token) {
        throw new Error("No token found");
      }
      // Verify token
      const { email } = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as JwtPayload;
      if (!email) {
        throw new Error("Invalid Token");
      }
      const user = await userModel
        .findOne({ email })
        .select("-password")
        .populate({ path: "robots", select: "macAddress" });
      if (!user) {
        throw new Error("User does not exist");
      }
      socket.data.user = user;
      next();
    } catch (err: any) {
      logger.error(`${err?.stack ? err?.stack : err?.message}`);
      next(new Error(`Client authentication failed: ${err.message}`));
    }
  });

  /* 
    clientNamespace will emit connection as soon as a connection is established with the server.
  */
  clientNamespace.on("connection", async (socket: Socket) => {
    try {
      logger.info(`Client namespace connected with id ${socket.id}`);
      const {
        getRobotStateHandler,
        userConnectionHandler,
        userDisconnectionHandler,
        updateRobotBaseStationHandler,
        robotSubHandler,
        robotUnsubHandler
      } = clientHandler(socket, io);

      /* 
        Creating a room for all new users.
      */
      socket.join(socket.data.user.email);

      /* 
        Listens to error in client connection.
      */
      socket.on("connect_error", (err: any) => {
        logger.error(`Client namespace connect_error due to ${err.message}`);
      });

      socket.on("robot:subscribe", robotSubHandler);

      socket.on("robot:unsubscribe", robotUnsubHandler);

      /* 
        Event listener that fetches robot state from redis
      */
      socket.on("robot:info", getRobotStateHandler);

      /* 
        Event listener that updates robot base station data 
      */
      socket.on("robot:base-station", updateRobotBaseStationHandler);

      /* 
        Event listener that updates user connection status in redis
      */
      socket.on("user:connect", userConnectionHandler);

      /* 
        Event listener that updates user disconnection status in redis
      */
      socket.on("user:disconnect", userDisconnectionHandler);

      /* 
        Event listener that fires when client connection gets disconnected 
      */
      socket.on("disconnect", async (reason) => {
        logger.error(
          `Client Namespace with id ${socket.id} disconnected due to ${reason}`
        );
        await MqttClientConnection.leaveRoom(socket);

        const robotId = socket.data?.robotId;

        const user = socket.data?.user;

        await redisClient.json.DEL(
          `robot:${robotId}`,
          `$.connectedClients["${user.email}"]`
        );
        await syncConnectedClientsState(robotId, io);
      });
    } catch (error: any) {
      logger.error(error?.stack);
    }
  });
};
