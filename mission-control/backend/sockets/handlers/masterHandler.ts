import { Server, Socket } from "socket.io";
import { IUser } from "../../models/userModel";
import { redisClient } from "../../services/redis";
import logger from "../../utils/logger";
import robotModel from "../../models/robotModel";

/**
 * Comprises all handlers used by masterListener
 * @param socket - socket object
 * @param io - socket instance
 * @returns Functions
 */
export const masterHandler = (socket: Socket, io: Server) => {
  /**
   * Emits all the edge details to user rooms
   * @param event - any event from edge
   * @param data - data from edge
   */

  const emitToallConnectedClients = (event: string, data: any) => {
    try {
      if (socket.data?.robot?.users) {
        socket.data?.robot?.users.forEach((user: IUser) => {
          io.of("/v1/client").to(user.email).emit(event, {
            id: socket.data?.robot.id,
            data
          });
        });
      }
    } catch (error) {
      logger.error("Error in emitting data to all connected clients");
    }
  };

  /**
   * Stores robot URL received from edge in redis server and to all Emits connected clients
   *
   * @param data - data emitted from robot:url event
   * @param callback - function passed as parameter to wrap the connection response and returns the values to the edge with details when called from edge
   */
  const robotUrlHandler = async (data: any, callback: Function) => {
    try {
      logger.info(`Robot URL: ${data?.rosbridgeUrl}`);
      await redisClient.json.SET(
        `robot:${socket.data.robot.id}`,
        ".url",
        data,
        {
          XX: true
        }
      );
      emitToallConnectedClients("robot:url", data);
      callback({
        result: "success",
        message: `Robot Url for ${socket.data.robot.name} recieved`
      });
    } catch (error) {
      logger.error("Error in setting Robot URL", error);
    }
  };
  /**
   * Stores robot URL received from edge in redis server and to all Emits connected clients
   *
   * @param data - data emitted from robot:url event
   * @param callback - function passed as parameter to wrap the connection response and returns the values to the edge with details when called from edge
   */

  const robotGpsHandler = async (
    data: {
      latitude: number;
      longitude: number;
    },
    callback: Function
  ) => {
    try {
      await robotModel.findByIdAndUpdate(
        socket.data.robot.id,
        {
          $set: {
            "gps.latitude": data.latitude,
            "gps.longitude": data.longitude
          }
        },
        { new: true }
      );
      callback({
        result: "success",
        message: `Robot Location for ${socket.data.robot.name} updated.`
      });
    } catch (error) {
      logger.error("Error in setting Robot Location", error);
    }
  };

  return {
    robotUrlHandler,
    robotGpsHandler
  };
};
