import { IncomingMessage } from "http";
import { Server } from "socket.io";
import WebSocket from "ws";
import logger from "../../../utils/logger";
import baseStationModel from "../../../models/baseStationModel";
import { redisClient } from "../../../services/redis";

export const baseStationListener = (
  wss: WebSocket.Server<typeof WebSocket, typeof IncomingMessage>,
  io: Server
) => {
  wss.on("connection", async (ws, request) => {
    const baseStationData = request.headers["mac-address"] as string;
    const [baseStationMac, latitude, longitude] = baseStationData.split(",");

    const remote = (request.socket as any)?.remoteAddress;
    const usedDefaultLat = !latitude || Number.isNaN(Number(latitude));
    const usedDefaultLng = !longitude || Number.isNaN(Number(longitude));
    

    logger.info(
      // `Base Station ${baseStationMac} connected with IP ${request?.socket?.remoteAddress}`
            `Base Station ${baseStationMac} connected with IP ${remote}; header=${baseStationData}; defaultsUsed={lat:${usedDefaultLat},lng:${usedDefaultLng}}`

    );

    const baseStation = await baseStationModel.findOneAndUpdate(
      { mac: baseStationMac },
      {
        mac: baseStationMac,
        location: {
          lat: Number(latitude) || 12.923650772185463,
          lng: Number(longitude) || 77.64699235191925
        },
        online: false
      },
      {
        upsert: true
      }
    );

    await redisClient
      .multi()
      .json.SET(`station:${baseStationMac}`, `$`, Date.now())
      .expire(`station:${baseStationMac}`, 86400)
      .exec();
      logger.debug(`Redis station timestamp initialized for ${baseStationMac}`);


    io.of("/v1/client").emit(`station:online`, baseStationMac);
    logger.info(`Emitted station:online for ${baseStationMac}`);

    if (!baseStation) {
      logger.data(`New Base Station ${baseStationMac} registered `);
    }

    ws.binaryType = "arraybuffer";

    ws.on("error", (err) => {
      // logger.error(`Websocket error : ${err.message}`);
      logger.error(`Websocket error for ${baseStationMac}: ${err.message}`);
    });
    ws.on("close", (code, reason) => {
      logger.warn(`Websocket closed for ${baseStationMac}; code=${code}; reason=${reason?.toString?.()}`);
    
    });
    let rtcmMessageTimeout: NodeJS.Timeout;

    ws.on("message", async (data, isBinary) => {
      if (data instanceof ArrayBuffer && isBinary) {
        const rtcmData = new Uint8Array(data);

        // clear Timeout if it already exists

        clearTimeout(rtcmMessageTimeout);

        if (baseStationMac) {
          io.of("/v1/robot/master")
            .to(baseStationMac)
            .volatile.emit("robot:rtcm", rtcmData);
        }

         // Update Redis timestamp on each RTCM message to keep basestation online
        await redisClient.json.SET(`station:${baseStationMac}`, `$`, Date.now());
        // logger.debug(`Updated Redis timestamp for ${baseStationMac}`);
        
        rtcmMessageTimeout = setTimeout(async () => {
          const baseStationTimestamp = (await redisClient.json.get(
            `station:${baseStationMac}`
          )) as number;
          const now = Date.now();
          // if (now - baseStationTimestamp >= 10000) {
          const delta = now - (baseStationTimestamp || 0);
          if (delta >= 10000) {
            await redisClient.del(`station:${baseStationMac}`);
            io.of("/v1/client").emit(`station:offline`, baseStationMac);
            // logger.error(`Base Station ${baseStationMac} disconnected`);
            logger.error(`Base Station ${baseStationMac} disconnected due to inactivity; deltaMs=${delta}`);
            ws.terminate();
          }
        }, 10000);
        } else {
        logger.debug(`Non-binary or unexpected message from ${baseStationMac}; isBinary=${isBinary}`);
      }
    });
  });
};
