import express, { Express } from "express";
import bodyParser from "body-parser";
import { parse } from "url";
import helmet from "helmet";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { WebSocketServer } from "ws";

import errorHandler from "./middlewares/errorMiddleware";
import morganMiddleware from "./middlewares/morganMiddleware";
import {
  generalLimiter,
  authLimiter,
  attendanceLimiter,
  userBasedLimiter
} from "./middlewares/rateLimitMiddleware";
import logger from "./utils/logger";
import connectDb from "./services/mongodb";
import connectRedis from "./services/redis";
import authRouter from "./routes/v1/authRoutes";
import anxRouter from "./routes/v1/anxRoutes";
import robotRouter from "./routes/v1/robotRoutes";
import userRouter from "./routes/v1/userRoutes";
import sensorRouter from "./routes/v1/sensorRoutes";
import { masterListener } from "./sockets/listeners/v1/masterListener";
import { clientListener } from "./sockets/listeners/v1/clientListener";
import clientRouter from "./routes/v1/clientRoutes";
import fleetRouter from "./routes/v1/fleetRoutes";
import pathMapRouter from "./routes/v1/pathMapRoutes";
import appRouter from "./routes/v1/appRoutes";
import { baseStationListener } from "./sockets/listeners/v1/baseStationListener";
import baseStationRouter from "./routes/v1/baseStationRoutes";
import issueRouter from "./routes/v1/issueRoutes";
import maintenanceRouter from "./routes/v1/maintenanceRoutes";
import attendanceRouter from "./routes/v1/attendanceRoutes";
import materialRouter from "./routes/v1/materialRoutes";
import operatorRouter from "./routes/v1/operatorRoutes";
import leadsRouter from "./routes/v1/leadsRoutes";
import tutorialRouter from "./routes/v1/tutorialRoutes";
import nissanRouter from "./routes/v1/nissanRoutes";
import masterDataRouter from "./routes/v1/masterDataRoutes";
import qcRouter from "./routes/v1/qcRoutes";
import overtimeRouter from "./routes/overtimeRoutes";
import transcriptionRouter from "./routes/v1/transcriptionRoutes";
import inventoryRouter from "./routes/v1/inventoryRoutes";
import shipmentRouter from "./routes/shipmentRoutes";
import billingRouter from "./routes/v1/billingRoutes";
import blogRouter from "./routes/v1/blogRoutes";
import mapRouter from "./routes/v1/mapRoutes";
import lidarMapRouter from "./routes/v1/lidarMapRoutes";
import qcFormRouter from "./routes/v1/qcFormRoutes";
import aiAgentRouter from "./routes/v1/aiAgentRoutes";
import autonomyAgentRouter from "./routes/v1/autonomyAgentRoutes";

import "./workers/emailWorker";
import "./workers/scheduledJobsWorker";
import "./workers/pushNotificationWorker";
import { scheduledJobsQueue } from "./queues/scheduledJobs";
import { MqttClientConnection } from "./mqtt/mqttClientConnection";

dotenv.config();
connectRedis();
connectDb();
const PORT = process.env.PORT ?? 5000;
const app: Express = express();
const httpServer = createServer(app);

// Trust proxy - Required for rate limiting to work correctly behind nginx/load balancer
// This allows express-rate-limit to accurately identify users via X-Forwarded-For header
app.set("trust proxy", 1);

// middlewares
app.use(helmet());
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 100000
  })
);
app.use(morganMiddleware);

// Apply general rate limiting to all API routes (IP-based, lenient for multiple users behind NAT)
// Individual routes can override with stricter limits (auth, attendance)
// NOTE: generalLimiter uses 100 req/15min per IP which allows ~10 users sharing same IP
app.use("/api/", generalLimiter);

// API Routes
// Apply stricter rate limiting to auth routes
app.use("/api/v1", authRouter);
app.use("/api/v1/anx", anxRouter);
app.use("/api/v1/app", appRouter);
app.use("/api/v1/robots", robotRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/pathMaps", pathMapRouter);
app.use("/api/v1/materials", materialRouter);
app.use("/api/v1/sensors", sensorRouter);
app.use("/api/v1/clients", clientRouter);
app.use("/api/v1/fleets", fleetRouter);
app.use("/api/v1/base-stations", baseStationRouter);
app.use("/api/v1/issues", issueRouter);
app.use("/api/v1/operators", operatorRouter);
// Apply dedicated attendance rate limiter (more lenient than general limiter)
app.use("/api/v1/attendance", attendanceLimiter, attendanceRouter);
app.use("/api/v1/maintenance", maintenanceRouter);
app.use("/api/v1/leads", leadsRouter);
app.use("/api/v1/tutorials", tutorialRouter);
app.use("/api/v1/nissan", nissanRouter);
app.use("/api/v1/masterdata", masterDataRouter);
app.use("/api/v1/qc", qcRouter);
app.use("/api/v1/overtime", overtimeRouter);
app.use("/api/v1/transcription", transcriptionRouter);
app.use("/api/v1/inventory", inventoryRouter);
app.use("/api/v1/shipments", shipmentRouter);
app.use("/api/v1/billing", billingRouter);
app.use("/api/v1/blog", blogRouter);
app.use("/api/v1/maps", mapRouter);
app.use("/api/v1/lidar-maps", lidarMapRouter);
app.use("/api/v1/qc/templates", qcFormRouter);
app.use("/api/v1/ai-agent", aiAgentRouter);
app.use("/api/v1/autonomy-agent", autonomyAgentRouter);
app.use(errorHandler);

// Socket Initialization and NameSpaces
const io = new Server(httpServer, {
  pingInterval: 25000,
  pingTimeout: 60000
});
MqttClientConnection.setIOServer(io);
const masterNamespace = io.of("/v1/robot/master");
masterListener(masterNamespace, io);
const clientNamespace = io.of("/v1/client");
clientListener(clientNamespace, io);

// Websocket server to transmit RTCM data
const wss = new WebSocketServer({ noServer: true });
baseStationListener(wss, io);

httpServer.on("upgrade", (request, socket, head) => {
  const remote = (request.socket as any)?.remoteAddress;
  const macHeader = request.headers?.["mac-address"] as string | undefined;
  if (request.url) {
    const { pathname } = parse(request.url);
    logger.info(
      `WS upgrade attempt: path=${pathname}, remote=${remote}, mac-address=${
        macHeader ?? "<missing>"
      }`
    );
    if (pathname === "/ntrip") {
      if (!macHeader) {
        logger.warn("WS /ntrip upgrade missing mac-address header");
      }
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      logger.warn(`WS upgrade rejected for unexpected path: ${pathname}`);
    }
  } else {
    logger.error(
      `Invalid URL for trying to connect to a valid websocket server: ${request.url}`
    );
  }
});

// Skip MQTT connection in offline mode
if (process.env.OFFLINE_MODE !== "true") {
  try {
    await MqttClientConnection.connect();
  } catch (error) {
    logger.error(`MQTT connect error, ${error}`);
  }
} else {
  logger.info("MQTT connection skipped (offline mode)");
}

process.on("exit", async () => {
  if (process.env.OFFLINE_MODE !== "true") {
    try {
      await MqttClientConnection.disconnect();
    } catch (error) {
      logger.error(`MQTT disconnect error: ${error}`);
    }
  }
});

httpServer.listen(PORT, () => {
  if (process.env.NODE_ENV === "development")
    logger.info(`Server is running at http://localhost:${PORT}`);
  else logger.info(`Server is running on port ${PORT}`);
});

process.on("SIGINT", () => {
  logger.info("Caught Interrupt Signal, Exiting!");
  process.exit(1);
});

try {
  await scheduledJobsQueue.add(
    "email",
    {
      type: "maintenance-check"
    },
    {
      repeat: {
        pattern: "0 0 19 * * *",
        tz: "Asia/Kolkata" // 7:00 PM IST
      },
      removeOnFail: true,
      removeOnComplete: true
    }
  );
  await scheduledJobsQueue.add(
    "push-notification",
    {
      type: "maintenance-due"
    },
    {
      repeat: {
        pattern: "0 45 7 * * *",
        tz: "Asia/Kolkata" // 7:45 AM IST
      },
      removeOnFail: true,
      removeOnComplete: true
    }
  );
  await scheduledJobsQueue.add(
    "update-leads",
    {
      type: "leads-daily-update"
    },
    {
      repeat: {
        pattern: "0 59 23 * * *",
        tz: "Asia/Kolkata" // 11:59 PM IST
      },
      removeOnFail: true,
      removeOnComplete: true
    }
  );
  await scheduledJobsQueue.add(
    "generate-site-utilization-report",
    {
      type: "generate-site-utilization-report"
    },
    {
      repeat: {
        pattern: "0 59 23 * * *",
        tz: "Asia/Kolkata" // 11:59 PM IST
      },
      removeOnFail: true,
      removeOnComplete: true
    }
  );
  await scheduledJobsQueue.add(
    "remind-next-step",
    {
      type: "remind-next-step"
    },
    {
      repeat: {
        pattern: "0 0 0 * * *",
        tz: "Asia/Kolkata" // Midnight IST
      },
      removeOnFail: true,
      removeOnComplete: true
    }
  );
  await scheduledJobsQueue.add(
    "daily-robot-data-reset",
    {
      type: "daily-robot-data-reset"
    },
    {
      repeat: {
        pattern: "0 0 0 * * *",
        tz: "Asia/Kolkata" // Midnight IST - resets checkedInToday and calculates yesterdayTripCount
      },
      removeOnFail: true,
      removeOnComplete: true
    }
  );
  await scheduledJobsQueue.add(
    "check-expired-overtime",
    {
      type: "check-expired-overtime"
    },
    {
      repeat: {
        pattern: "0 */10 * * * *",
        tz: "Asia/Kolkata" // Every 10 minutes - check for expired overtime approvals
      },
      removeOnFail: true,
      removeOnComplete: true
    }
  );
  await scheduledJobsQueue.add(
    "auto-checkout",
    {
      type: "auto-checkout"
    },
    {
      repeat: {
        pattern: "0 0 * * * *",
        tz: "Asia/Kolkata" // Every hour - auto checkout operators who exceeded shift + 2h grace
      },
      removeOnFail: true,
      removeOnComplete: true
    }
  );
  await scheduledJobsQueue.add(
    "unassigned-robot-sweep",
    {
      type: "unassigned-robot-sweep"
    },
    {
      repeat: {
        pattern: "0 0 9 * * *",
        tz: "Asia/Kolkata" // 9:00 AM IST
      },
      removeOnFail: true,
      removeOnComplete: true
    }
  );
} catch (error) {
  if (error instanceof Error) {
    logger.error(`Error scheduling jobs: ${error.message}`);
  } else {
    logger.error(`Error scheduling jobs: ${JSON.stringify(error)}`);
  }
}
