import express, { Request, Response, Express } from 'express';
import { connectDatabase } from './config/database.js';
import { verifyRedisConfig } from './config/redis.js';
import { healthCheck } from './health/healthController.js';

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

// Server startup
const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  // Connect to MongoDB
  await connectDatabase();

  // Verify Redis configuration
  try {
    await verifyRedisConfig();
  } catch (error) {
    console.error('Redis verification failed, but continuing startup:', error);
  }

  console.log('All systems ready');
});

// Graceful shutdown on SIGTERM
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');

  // 1. Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed');
  });

  // 2. MongoDB connection will be closed by database.ts SIGTERM handler
  // No need to duplicate here - database.ts already has it

  // Note: database.ts SIGTERM handler will exit process after MongoDB close
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
