import express, { Request, Response, Express } from 'express';
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { connectDatabase } from './config/database.js';
import { verifyRedisConfig } from './config/redis.js';
import { healthCheck } from './health/healthController.js';
import { masterListener } from "./sockets/listeners/v1/masterListener.js";

const PORT = process.env.PORT || 3000;
const app: Express = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', healthCheck);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'FLO Offline Mode API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Create HTTP server from Express app
const httpServer = createServer(app);

// Initialize Socket.IO server with 30-second disconnect detection
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*", // Allow all origins in offline mode (local network only)
    methods: ["GET", "POST"]
  },
  pingTimeout: 20000, // 20 seconds (reduced from cloud's 60s)
  pingInterval: 10000, // 10 seconds (reduced from cloud's 25s)
  connectTimeout: 45000 // 45 seconds for initial connection
});

// API Routes - mount application routes here
// (Stable insertion marker for Plan 02-03 Task 3)

// Register Socket.IO namespaces
const masterNamespace = io.of("/v1/robot/master");
masterListener(masterNamespace, io);

console.log("[Socket.IO] Initialized /v1/robot/master namespace");

// Start HTTP server (replaces old app.listen)
const server = httpServer.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);

  // Connect to MongoDB (existing code from Phase 1)
  await connectDatabase();

  // Verify Redis config (existing code from Phase 1)
  try {
    await verifyRedisConfig();
  } catch (error) {
    console.warn(`Redis verification failed: ${error}`);
  }

  console.log('All systems ready');
});

// Graceful shutdown on SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed');
    // MongoDB close handled by database.ts SIGTERM handler
  });
});

// Also handle SIGINT for development (Ctrl+C)
process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');

  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
