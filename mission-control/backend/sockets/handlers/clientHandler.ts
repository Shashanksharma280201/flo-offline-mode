import { Server, Socket } from "socket.io";
import { redisClient } from "../../services/redis";
import logger from "../../utils/logger";
import robotModel from "../../models/robotModel";
import { MqttClientConnection } from "../../mqtt/mqttClientConnection";

export type RedisRobotState = {
  id: string;
  status: string;
  url: any;
  location: any;
  iotCoreSubscriptions: number;
  lastConnectionOn: number;
  connectedClientsCount?: number;
  connectedClients: {
    [x: string]: {
      name: string;
      email: string;
    };
  };
};

/**
 * Recompute the connected client count for a robot and broadcast the updated
 * client list to all remaining connected viewers for that robot.
 *
 * @param robotId - Robot whose connected client list changed
 * @param io - Socket.io server instance used for fanout
 * @returns Latest robot state after the count update, if present
 */
export const syncConnectedClientsState = async (
  robotId: string | undefined,
  io: Server
): Promise<RedisRobotState | null> => {
  if (!robotId) {
    return null;
  }

  const robotState = (await redisClient.json.get(
    `robot:${robotId}`
  )) as RedisRobotState | null;

  if (!robotState) {
    return null;
  }

  const connectedClients = robotState.connectedClients || {};
  const connectedClientsCount = Object.keys(connectedClients).length;

  await redisClient.json.SET(
    `robot:${robotId}`,
    "$.connectedClientsCount",
    connectedClientsCount
  );

  Object.keys(connectedClients).forEach((email) => {
    io.of("/v1/client")
      .to(email)
      .emit("robot:clients", {
        id: robotId,
        connectedClients,
        connectedClientsCount
      });
  });

  return {
    ...robotState,
    connectedClients,
    connectedClientsCount
  };
};

/**
 * Comprises all handlers used by clientListener
 * @param socket - socket object
 * @param io - socket instance
 * @returns Functions
 */

export const clientHandler = (socket: Socket, io: Server) => {
  /**
   * Gets robot state from redis server
   *
   * @param data - robot id emitted from robot:info event
   * @param callback- function passed as parameter to wrap the state of robot and returns the values to the client end with robot details when called from client side
   *
   */
  const getRobotStateHandler = async (data: any, callback: Function) => {
    socket.data.robotId = data?.id;
    const response = await redisClient.json.get(`robot:${data?.id}`);
    if (!response) {
      callback({
        result: "failure",
        message: "Robot state data not found"
      });
      return;
    }
    callback({
      result: "success",
      message: "Robot state data fetched successfully",
      data: response
    });
  };

  const robotSubHandler = async (
    data: { macId: string },
    callback: Function
  ) => {
    const { macId } = data;
    try {
      MqttClientConnection.joinRoom(macId, socket);
      callback({
        result: "success",
        macId
      });
    } catch (error) {
      callback({
        result: "failure",
        macId
      });
      logger.error(`Unable to subscribe to macId: ${macId}`, error);
    }
  };

  const robotUnsubHandler = async (
    data: { macId: string },
    callback: Function
  ) => {
    const { macId } = data;

    try {
      await MqttClientConnection.leaveRoom(socket);

      callback({
        result: "success",
        macId
      });
    } catch (error) {
      callback({
        result: "failure",
        macId
      });
      logger.error(`Unable to unsubscribe from mqtt for id ${macId}`, error);
    }
  };

  /**
   * Updates Robot's base station data
   *
   * @param data - base station data
   * @param callback- Handles acknowledgement of data
   *
   */
  const updateRobotBaseStationHandler = async (
    data: {
      robotId: string;
      prevBaseStationId: string;
      baseStationId: string;
    },
    callback: Function
  ) => {
    logger.info(
      `Robot base station update requested: robotId=${data.robotId}, prev=${data.prevBaseStationId}, next=${data.baseStationId}`
    );
    const updatedRobot = await robotModel.findByIdAndUpdate(
      data.robotId,
      {
        $set: {
          "gps.baseStationId": data.baseStationId
        }
      },
      { new: true }
    );
    if (updatedRobot) {
      logger.info(
        `Robot base station update success: robotId=${data.robotId}, baseStationId=${data.baseStationId}`
      );
      callback({
        result: "success",
        message: "Robot base station data updated successfully",
        data: data.baseStationId
      });
     } else {
      logger.error(
        `Robot base station update FAILED: robotId=${data.robotId}, baseStationId=${data.baseStationId}`
      );
      callback({
        result: "failure",
        message: "Cannot Update robot base station data"
      });
    }
    io.of("/v1/robot/master")
      .to(data.robotId)
      .socketsLeave(data.prevBaseStationId);
    io.of("/v1/robot/master").to(data.robotId).socketsJoin(data.baseStationId);
  };

  /**
   * Appends userEmails to the requested robotId in redis server
   * @param data - robot id emitted from robot:info event
   * @param callback - function passed as parameter to wrap the connection response and returns the values to the client end with robot details when called from client side
   *
   */
  const userConnectionHandler = async (data: any, callback: Function) => {
    try {
      const response = await redisClient.json.SET(
        `robot:${data.id}`,
        `$.connectedClients["${data.email}"]`,
        { name: data.name, email: data.email },
        {
          XX: true
        }
      );
      logger.info(`User connection response ${response}`);
      if (response) {
        callback({
          result: "success",
          message: "User connection status updated"
        });
      }
      await syncConnectedClientsState(data.id, io);
    } catch (error) {
      logger.error("Unable to update user connection", error);
    }
  };

  /**
   * Removes userEmail from the requested robotId in redis server
   * @param data
   * @param callback
   */
  const userDisconnectionHandler = async (data: any, callback: Function) => {
    try {
      const response = await redisClient.json.DEL(
        `robot:${data?.id}`,
        `$.connectedClients["${data.email}"]`
      );
      logger.info(`User Disconnection response ${response}`);
      if (response) {
        callback({
          result: "success",
          message: "User Disconnection status updated"
        });
      }
      await syncConnectedClientsState(data.id, io);
    } catch (error) {
      logger.error("Unable to update user Disconnection", error);
    }
  };

  return {
    getRobotStateHandler,
    userConnectionHandler,
    userDisconnectionHandler,
    updateRobotBaseStationHandler,
    robotSubHandler,
    robotUnsubHandler
  };
};
