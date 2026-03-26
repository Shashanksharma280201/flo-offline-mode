import { mqtt, iot } from "aws-iot-device-sdk-v2";
import { Server, Socket } from "socket.io";
import logger from "../utils/logger";
import robotModel, { Robot } from "../models/robotModel";
import { IUser } from "../models/userModel";
import { redisClient } from "../services/redis";

const decoder = new TextDecoder("utf-8");

/**
 * Normalize MAC address to prevent case-sensitivity and whitespace issues
 * MQTT topics are case-sensitive, so we need consistent formatting
 * @param macAddress - Raw MAC address from database
 * @returns Normalized MAC address (uppercase, trimmed, no colons/dashes)
 */
function normalizeMacAddress(macAddress: string): string {
  if (!macAddress) return macAddress;

  // Remove whitespace, convert to uppercase, remove colons/dashes
  return macAddress
    .trim()
    .toUpperCase()
    .replace(/[:-]/g, '');
}

function convertToDecimal(
  latRaw: string,
  latDirection: string,
  lngRaw: string,
  lngDirection: string
) {
  if (
    latRaw === "0" ||
    lngRaw === "0" ||
    latDirection === "0" ||
    lngDirection === "0"
  ) {
    return {
      lat: null,
      lng: null
    };
  }

  // Latitude conversion
  const latDegrees = parseFloat(latRaw.slice(0, 2)); // First two characters are degrees
  const latMinutes = parseFloat(latRaw.slice(2)) / 60.0; // Remaining characters are minutes converted to decimal degrees
  const latDecimal = latDegrees + latMinutes;

  // Longitude conversion
  const lngSplit = lngRaw.split("."); // Split into degrees and fractional part
  const lngDegrees = parseFloat(lngSplit[0].slice(0, -2)); // All but the last two characters are degrees
  const lngSeconds =
    parseFloat(`${lngSplit[0].slice(-2)}.${lngSplit[1]}`) / 60.0; // Last two characters + fractional part converted to decimal degrees
  const lngDecimal = lngDegrees + lngSeconds;

  return {
    lat: latDirection === "S" ? -latDecimal : latDecimal,
    lng: lngDirection === "W" ? -lngDecimal : lngDecimal
  };
}

const getSensorData = (mqttData: ArrayBuffer) => {
  let decodedData = JSON.parse(decoder.decode(mqttData));

  // Removed verbose logging - this fires on every MQTT packet (hundreds/sec)
  // logger.debug("MQTT sensor data received", { decodedData });
  if (decodedData.data) {
    decodedData = decodedData.data.split(",");

    const { lat, lng } = convertToDecimal(
      `${decodedData[39]}`,
      `${decodedData[40]}`,
      `${decodedData[41]}`,
      `${decodedData[42]}`
    );
    return {
      session: +decodedData[0],
      leftCytronTemp: +decodedData[1],
      rightCytronTemp: +decodedData[2],
      mmrVoltage: +decodedData[3],
      mmrCurrent: +decodedData[4],
      mmrPower: +decodedData[5],
      mmrPeakPower: +decodedData[6],
      throttle: +decodedData[7],
      steering: +decodedData[8],
      actuator: +decodedData[9],
      light: +decodedData[10],
      aImuX: +decodedData[11],
      aImuY: +decodedData[12],
      aImuZ: +decodedData[13],
      gImuX: +decodedData[14],
      gImuY: +decodedData[15],
      gImuZ: +decodedData[16],
      batteryCumiliativeVoltage: +decodedData[17],
      batteryCurrent: +decodedData[18],
      batteryRemainingCapacity: +decodedData[19],
      batteryDesignCapacity: +decodedData[20],
      batteryPercentage: +decodedData[21],
      batteryState: +decodedData[22],
      batteryErrorCode1: +(decodedData[23] || 0),
      batteryErrorCode2: +(decodedData[24] || 0),
      batteryErrorCode3: +(decodedData[25] || 0),
      batteryErrorCode4: +(decodedData[26] || 0),
      batteryErrorCode5: +(decodedData[27] || 0),
      batteryErrorCode6: +(decodedData[28] || 0),
      batteryErrorCode7: +(decodedData[29] || 0),
      batteryErrorCode8: +(decodedData[30] || 0),
      batteryHealth: +decodedData[31],
      batteryCellTemperature: +decodedData[32],
      batteryMaxCellVoltage: +decodedData[33],
      batteryMinCellVoltage: +decodedData[34],
      bmpTemperature: +decodedData[35],
      bmpAltitude: +decodedData[36],
      ggaDataMessageID: decodedData[37],
      ggaDataUtcTime: +decodedData[38],
      ggaDataLatitude: lat,
      ggaDataLatitudeDirection: decodedData[40],
      ggaDataLongitude: lng,
      ggaDataLongitudeDirection: decodedData[42],
      ggaDataGpsQuality: +decodedData[43],
      ggaDataNumSatellites: +decodedData[44],
      ggaDataAltitude: +decodedData[45],
      ggaDataAltitudeUnit: decodedData[46],
      rmcDataMessageID: decodedData[47],
      rmcDataStatus: decodedData[48],
      rmcDataSpeed: +decodedData[49],
      rmcDataTrackAngle: +decodedData[50],
      rmcDataDate: +decodedData[51],
      rmcDataWeight: +decodedData[52],
      rmcDataDistance: +decodedData[53],
    };
  }

  const { lat, lng } = convertToDecimal(
    `${decodedData.ggaLatitude}`,
    `${decodedData.ggaLatitudeDirection}`,
    `${decodedData.ggaLongitude}`,
    `${decodedData.ggaLongitudeDirection}`
  );

  return {
    epochtime: decodedData.epochTime,
    session: +decodedData.session,
    leftCytronTemp: +decodedData.leftCytronTemp,
    rightCytronTemp: +decodedData.rightCytronTemp,
    mmrVoltage: +decodedData.mmrVoltage,
    mmrCurrent: +decodedData.mmrCurrent,
    mmrPower: +decodedData.mmrPower,
    mmrPeakPower: +decodedData.mmrPeakPower,
    throttle: +decodedData.throttle,
    steering: +decodedData.steering,
    actuator: +decodedData.actuator,
    light: +decodedData.light,
    aImuX: +decodedData.accelerationX,
    aImuY: +decodedData.accelerationY,
    aImuZ: +decodedData.accelerationZ,
    gImuX: +decodedData.gyroX,
    gImuY: +decodedData.gyroY,
    gImuZ: +decodedData.gyroZ,
    batteryCumiliativeVoltage: +decodedData.batteryCumulativeVoltage,
    batteryCurrent: +decodedData.batteryCurrent,
    batteryRemainingCapacity: +decodedData.batteryRemainingCapacity,
    batteryDesignCapacity: +decodedData.designCapacity,
    batteryPercentage: +decodedData.batterySoc,
    batteryState: +decodedData.batteryState,
    batteryErrorCode1: +(decodedData.batteryErrorCode1 || 0),
    batteryErrorCode2: +(decodedData.batteryErrorCode2 || 0),
    batteryErrorCode3: +(decodedData.batteryErrorCode3 || 0),
    batteryErrorCode4: +(decodedData.batteryErrorCode4 || 0),
    batteryErrorCode5: +(decodedData.batteryErrorCode5 || 0),
    batteryErrorCode6: +(decodedData.batteryErrorCode6 || 0),
    batteryErrorCode7: +(decodedData.batteryErrorCode7 || 0),
    batteryErrorCode8: +(decodedData.batteryErrorCode8 || 0),
    batteryHealth: +decodedData.batteryHealth,
    batteryCellTemperature: +decodedData.maxBatteryCellTemp,
    batteryMaxCellVoltage: +decodedData.maxBatteryCellVoltage,
    batteryMinCellVoltage: +decodedData.minBatteryCellVoltage,
    bmpTemperature: +decodedData.bmpTemperature,
    bmpAltitude: +decodedData.bmpAltitude,
    ggaDataMessageID: decodedData.ggaMessageId,
    ggaDataUtcTime: +decodedData.ggaUtcTime,
    ggaDataLatitude: lat,
    ggaDataLatitudeDirection: decodedData.ggaLatitudeDirection,
    ggaDataLongitude: lng,
    ggaDataLongitudeDirection: decodedData.ggaLongitudeDirection,
    ggaDataGpsQuality: +decodedData.ggaGpsQuality,
    ggaDataNumSatellites: +decodedData.ggaNumSatellites,
    ggaDataAltitude: +decodedData.ggaAltitude,
    ggaDataAltitudeUnit: decodedData.ggaAltitudeUnit,
    rmcDataMessageID: decodedData.rmcMessageId,
    rmcDataStatus: decodedData.rmcStatus,
    rmcDataSpeed: +decodedData.rmcSpeed,
    rmcDataTrackAngle: +decodedData.rmcTrackAngle,
    rmcDataDate: +decodedData.rmcDate,
    rmcDataWeight: +decodedData.rmcWeight,
    rmcDataDistance: +decodedData.rmcDistance,
  };
};

export class MqttClientConnection {
  private static instance: mqtt.MqttClientConnection;

  private static io: Server;

  static rooms: {
    [macId: string]: {
      robot: Robot;
      isOnline: boolean;
      timeoutId?: NodeJS.Timeout;
      lastStatusUpdate?: number;
      users: Socket[];
    };
  } = {};

  static reverseLookup: { [socketId: string]: string } = {};

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  private static createConnection() {
    const configBuilder =
      iot.AwsIotMqttConnectionConfigBuilder.new_mtls_builder_from_path(
        "./thing.cert.pem",
        "./thing.private.key"
      );

    configBuilder.with_client_id(
      "mission-control-backend-production"
    );
    configBuilder.with_endpoint(
      "a2vswiofdpntiu-ats.iot.ap-south-1.amazonaws.com"
    );

    const config = configBuilder
      .with_keep_alive_seconds(10)
      .with_clean_session(true)  // Force fresh session on each restart to ensure callbacks work
      .build();

    const client = new mqtt.MqttClient();
    const connection = client.new_connection(config);

    return connection;
  }

  static setIOServer(io: Server) {
    this.io = io;
  }

  static async init() {
    const robots = await robotModel
      .find({ macAddress: { $exists: true } })
      .populate({ path: "users", select: "email" })
      .select("id name macAddress users");

    logger.info(`Initializing MQTT subscriptions for ${robots.length} robots with MAC addresses`);

    // Use for...of to properly await each subscription
    for (const robot of robots) {
      if (robot.macAddress) {
        try {
          await this.beginStream(robot.macAddress, robot);
        } catch (err) {
          logger.error(`Failed to initialize MQTT stream for robot ${robot.name} (${robot.macAddress})`, err);
          // Continue with other robots even if one fails
        }
      }
    }

    logger.info(`MQTT initialization complete. ${Object.keys(this.rooms).length} robots subscribed successfully.`);
  }

  /**
   * Re-subscribe to all MQTT topics after connection resume
   * Called when AWS IoT Core resumes the session - subscriptions exist at broker level
   * but callbacks need to be re-registered in the client
   */
  static async resubscribeAll() {
    const roomKeys = Object.keys(this.rooms);
    logger.info(`Re-subscribing to ${roomKeys.length} MQTT topics after connection resume`);

    for (const macId of roomKeys) {
      const room = this.rooms[macId];
      if (!room) continue;

      const topic = `mmr/publish/${macId}`;

      try {
        // CRITICAL FIX: Unsubscribe first, then resubscribe with fresh callback
        // AWS IoT SDK may not replace callbacks if topic is already subscribed
        try {
          await this.instance.unsubscribe(topic);
          logger.debug(`Unsubscribed from ${topic} before re-subscribing`);
        } catch (unsubErr) {
          // Ignore unsubscribe errors - topic may not be subscribed
          logger.debug(`Could not unsubscribe from ${topic} (may not be subscribed): ${unsubErr}`);
        }

        // Re-subscribe with fresh callback
        await this.instance.subscribe(
          topic,
          mqtt.QoS.AtLeastOnce,
          async (_, payload) => {
            try {
              logger.debug(`MQTT callback invoked for ${room.robot.name} (${macId})`, {
                payloadSize: payload?.byteLength,
                roomExists: !!this.rooms[macId]
              });

              const currentRoom = this.rooms[macId];

              if (!currentRoom) {
                logger.error(`MQTT callback fired but room not found for ${room.robot.name} (${macId})`);
                return;
              }

              await this.setRobotStatus(macId);

              if (currentRoom && currentRoom.users.length > 0) {
                const sensorData = getSensorData(payload);

                currentRoom.users.forEach((ws) => {
                  ws.emit("robot:subscribe", {
                    payload: sensorData
                  });
                });
              }
            } catch (callbackErr) {
              logger.error(`Error in MQTT callback for ${room.robot.name} (${macId})`, callbackErr);
            }
          }
        );

        logger.debug(`Re-subscribed to ${topic} for robot ${room.robot.name}`);
      } catch (err) {
        logger.error(`Failed to re-subscribe to ${topic} for robot ${room.robot.name}`, err);
      }
    }

    logger.info(`Re-subscription complete for ${roomKeys.length} robots`);
  }

  static async setRobotStatus(macId: string) {
    const robot = this.rooms[macId];

    if (!robot) {
      logger.error(`setRobotStatus called but room not found for MAC: ${macId}`);
      return;
    }

    const now = Date.now();

    // Throttle Redis updates to once every 10 seconds (reduces writes by 99%)
    const shouldUpdateRedis = !robot.lastStatusUpdate || (now - robot.lastStatusUpdate) > 10000;

    if (!robot.isOnline) {
      // FIX: Only set isOnline AFTER successful Redis write to avoid state inconsistency
      logger.info("Robot becoming active", { robotName: robot.robot.name, macId });

      // Write status to Redis for MQTT robots (only on status change)
      try {
        await redisClient.json.set(
          `robot:${robot.robot.id}`,
          "$.status",
          "Active"
        );
        robot.lastStatusUpdate = now;

        // Only mark as online after successful Redis write
        robot.isOnline = true;
        logger.info("Robot active - Redis updated successfully", { robotName: robot.robot.name, macId });
      } catch (err) {
        logger.error(`Failed to set Active status in Redis for ${robot.robot.id}`, err);
        // Don't set isOnline=true if Redis write failed - maintain state consistency
        return; // Exit early to avoid emitting incorrect status
      }

      this.emitStatusToAllClients(
        {
          [robot.robot.id]: "Active"
        },
        robot.robot
      );
    } else if (shouldUpdateRedis) {
      // Periodically update Redis even when already online (heartbeat)
      try {
        await redisClient.json.set(
          `robot:${robot.robot.id}`,
          "$.status",
          "Active"
        );
        robot.lastStatusUpdate = now;
      } catch (err) {
        logger.error(`Failed to update Active status in Redis for ${robot.robot.id}`, err);
      }
    }

    // Always reset timeout on every MQTT message
    // FIX: Check if timeout exists before clearing
    if (robot.timeoutId) {
      clearTimeout(robot.timeoutId);
    }

    robot.timeoutId = setTimeout(async () => {
      robot.isOnline = false;
      logger.info("Robot offline", { robotName: robot.robot.name, macId });

      // Write offline status to Redis for MQTT robots
      try {
        await redisClient.json.set(
          `robot:${robot.robot.id}`,
          "$.status",
          "Offline"
        );
        robot.lastStatusUpdate = Date.now();
      } catch (err) {
        logger.error(`Failed to set Offline status in Redis for ${robot.robot.id}`, err);
      }

      this.emitStatusToAllClients(
        {
          [robot.robot.id]: "Offline"
        },
        robot.robot
      );
    }, 30_000); // 30 seconds timeout for offline detection (reduced from 1 minute)
  }

  static async beginStream(macId: string, robot: Robot) {
    // Normalize MAC address to prevent case-sensitivity issues
    const normalizedMacId = normalizeMacAddress(macId);

    if (this.rooms[normalizedMacId]) {
      logger.warn(`MQTT room already exists for ${robot.name} (${normalizedMacId}), skipping subscription`);
      return;
    }

    this.rooms[normalizedMacId] = {
      robot,
      isOnline: false,
      users: []
    };

    // Initialize Redis entry for MQTT robot
    try {
      const redisKey = `robot:${robot.id}`;
      const existing = await redisClient.exists(redisKey);

      if (existing) {
        // Key exists, just reset status to Offline for fresh start
        logger.info(`Redis entry already exists for ${robot.name} (${robot.id}), updating status to Offline`);
        await redisClient.json.set(redisKey, "$.status", "Offline");
        await redisClient.json.set(redisKey, "$.lastConnectionOn", Date.now());
      } else {
        // Create new entry
        await redisClient.json.set(
          redisKey,
          "$",
          {
            id: robot.id,
            status: "Offline",
            lastConnectionOn: Date.now(),
            url: {},
            connectedClients: {}
          }
        );
        logger.info(`Created new Redis entry for MQTT robot ${robot.name} (${robot.id})`);
      }
    } catch (err) {
      logger.error(`Failed to initialize Redis entry for ${robot.id}`, err);
    }

    // Subscribe to MQTT topic with error handling and logging
    const topic = `mmr/publish/${normalizedMacId}`;
    logger.info(`Attempting to subscribe to MQTT topic: ${topic} for robot ${robot.name} (${robot.id}) [Original MAC: ${macId}]`);

    try {
      await this.instance.subscribe(
        topic,
        mqtt.QoS.AtLeastOnce,
        async (_, payload) => {
          try {
            // DEBUG: Log callback invocation
            logger.debug(`MQTT callback invoked for ${robot.name} (${normalizedMacId})`, {
              payloadSize: payload?.byteLength,
              roomExists: !!this.rooms[normalizedMacId]
            });

            const room = this.rooms[normalizedMacId];

            if (!room) {
              logger.error(`MQTT callback fired but room not found for ${robot.name} (${normalizedMacId})`);
              return;
            }

            await this.setRobotStatus(normalizedMacId);

            if (room && room.users.length > 0) {
              const sensorData = getSensorData(payload);

              room.users.forEach((ws) => {
                ws.emit("robot:subscribe", {
                  payload: sensorData
                });
              });
            }
          } catch (callbackErr) {
            logger.error(`Error in MQTT callback for ${robot.name} (${normalizedMacId})`, callbackErr);
            // Don't throw - let AWS SDK continue delivering messages
          }
        }
      );
      logger.info(`Successfully subscribed to MQTT topic: ${topic} for robot ${robot.name} (${robot.id})`);
    } catch (err) {
      logger.error(`Failed to subscribe to MQTT topic ${topic} for robot ${robot.name} (${robot.id})`, err);
      // Clean up the room entry if subscription failed
      delete this.rooms[normalizedMacId];
      throw err;
    }
  }

  static joinRoom(macId: string, socket: Socket) {
    const normalizedMacId = normalizeMacAddress(macId);

    // Null safety check - ensure room exists before accessing users array
    if (!this.rooms[normalizedMacId]) {
      logger.error(`Cannot join room - robot not found for MAC: ${normalizedMacId} (original: ${macId})`);
      throw new Error(`Robot room not found for MAC address: ${macId}`);
    }

    const alreadyJoined = this.rooms[normalizedMacId].users.find(
      (ws) => ws.id === socket.id
    );
    if (!alreadyJoined) {
      this.rooms[normalizedMacId].users.push(socket);
    }

    const room = Object.keys(this.rooms).map((key) => ({
      macId: key,
      size: this.rooms[key].users.length
    }));

    logger.debug("User joined room", { macId: normalizedMacId, rooms: room });

    this.reverseLookup[socket.id] = normalizedMacId;
  }

  private static emitStatusToAllClients(data: any, robot: Robot) {
    // FIX: Log warning instead of silent failure
    if (!this.io) {
      logger.warn("Cannot emit robot status - Socket.IO server not initialized", {
        robotId: robot.id,
        robotName: robot.name,
        status: data
      });
      return;
    }

    const status = Object.keys(this.rooms).map((key) => {
      return {
        macId: key,
        robot: this.rooms[key].robot.name,
        status: this.rooms[key].isOnline
      };
    });
    logger.debug("Emitting robot status to clients", { status });

    // FIX: Log warning if robot has no users to notify
    if (!robot.users || robot.users.length === 0) {
      logger.warn("Robot has no users to notify of status change", {
        robotId: robot.id,
        robotName: robot.name,
        status: data
      });
      return;
    }

    robot.users.forEach((user: IUser) => {
      this.io.of("/v1/client").to(user.email).emit("robot:status", {
        id: robot.id,
        data
      });
    });
  }

  static async leaveRoom(socket: Socket) {
    const macId = this.reverseLookup[socket.id];

    if (!this.rooms[macId]) {
      return;
    }

    this.rooms[macId] = {
      ...this.rooms[macId],
      users: this.rooms[macId].users.filter((ws) => ws.id !== socket.id)
    };

    const room = Object.keys(this.rooms).map((key) => ({
      macId: key,
      size: this.rooms[key].users.length
    }));
    logger.debug("User left room", { macId, rooms: room });

    delete this.reverseLookup[socket.id];
  }

  static async removeStream(macId: string) {
    const normalizedMacId = normalizeMacAddress(macId);
    const room = this.rooms[normalizedMacId];
    if (!room) {
      return;
    }

    try {
      if (this.instance) {
        await this.instance.unsubscribe(`mmr/publish/${normalizedMacId}`);
      }
    } catch (error) {
      logger.error(`Failed to unsubscribe from mqtt topic for ${normalizedMacId}`, error);
    }

    room.users.forEach((socket) => {
      delete this.reverseLookup[socket.id];
    });

    delete this.rooms[normalizedMacId];
    logger.info(`Removed MQTT stream for mac ${normalizedMacId}`);
  }

  static async refreshRoomRobot(macId: string, updatedRobot: Robot) {
    const normalizedMacId = normalizeMacAddress(macId);
    const room = this.rooms[normalizedMacId];
    if (!room) {
      logger.warn(`Cannot refresh robot for mac ${normalizedMacId} - room does not exist`);
      return;
    }

    this.rooms[normalizedMacId].robot = updatedRobot;
    logger.info(`Refreshed robot data for mac ${normalizedMacId}`);
  }

  static fetchRobotStatus() {
    const robots = Object.keys(this.rooms).reduce((acc, macId) => {
      const robot = this.rooms[macId];
      if (robot) {
        acc[robot.robot.id] = robot.isOnline ? "Active" : "Offline";
      }

      return acc;
    }, {} as { [robotId: string]: string });

    return robots;
  }

  /**
   * Get diagnostic information about active MQTT subscriptions
   * Useful for debugging subscription issues
   */
  static getActiveSubscriptions() {
    return Object.keys(this.rooms).map((macId) => {
      const room = this.rooms[macId];
      return {
        macAddress: macId,
        robotId: room.robot.id,
        robotName: room.robot.name,
        topic: `mmr/publish/${macId}`,
        isOnline: room.isOnline,
        connectedUsers: room.users.length,
        lastStatusUpdate: room.lastStatusUpdate || null
      };
    });
  }

  static async connect() {
    try {
      if (!this.instance) {
        this.instance = this.createConnection();

        this.instance.on("disconnect", (error?: Error) => {
          logger.error("MQTT Disconnected!", { error });
        });

        this.instance.on("connect", () => {
          logger.info("MQTT Connected successfully!");
        });

        this.instance.on("error", (error) => {
          logger.error("MQTT Connection Error", { error });
        });

        this.instance.on("closed", () => {
          logger.warn("MQTT Connection Closed");
        });

        // FIX: Removed global message handler to avoid double processing
        // The individual subscription callbacks + resubscribeAll() fix is sufficient
        // Keeping this commented for reference in case we need it as a fallback
        /*
        this.instance.on("message", async (topic: string, payload: ArrayBuffer) => {
          try {
            const macMatch = topic.match(/mmr\/publish\/([A-F0-9]+)$/i);
            if (!macMatch) {
              logger.warn(`Received message on unrecognized topic: ${topic}`);
              return;
            }

            const macId = normalizeMacAddress(macMatch[1]);
            const room = this.rooms[macId];

            if (!room) {
              return;
            }

            logger.debug(`Global message handler: MQTT callback for ${room.robot.name} (${macId})`, {
              payloadSize: payload?.byteLength
            });

            await this.setRobotStatus(macId);

            if (room.users.length > 0) {
              const sensorData = getSensorData(payload);
              room.users.forEach((ws) => {
                ws.emit("robot:subscribe", { payload: sensorData });
              });
            }
          } catch (err) {
            logger.error(`Error in global message handler for topic ${topic}`, err);
          }
        });
        */

        this.instance.on("resume", async (returnCode, sessionPresent) => {
          logger.info(
            `MQTT Resume returnCode:${returnCode}, sessionPresent:${sessionPresent}`
          );

          // CRITICAL: With clean_session=true, subscriptions are NOT persisted
          // We must re-subscribe to all topics after resume
          logger.warn("Session resumed - re-subscribing to all topics");
          try {
            await this.resubscribeAll();
            logger.info("Re-subscription after resume completed successfully");
          } catch (err) {
            logger.error("Failed to re-subscribe after resume", err);
          }
        });
      }
      await this.instance.connect();

      await this.init();
    } catch (err) {
      logger.error("Error connecting", err);
    }
  }

  static async disconnect() {
    try {
      await this.instance.disconnect();
      logger.info("MQTT disconnecting...");
    } catch (err) {
      logger.error("Disconnect error", err);
    }
  }
}
