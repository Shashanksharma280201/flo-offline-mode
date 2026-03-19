# Architecture Research

**Domain:** Offline-First Robotics Autonomy System with Embedded Database
**Researched:** 2026-03-19
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Host Machine (Robot Device)                      │
│  ┌─────────────────┐                                                     │
│  │   ROS Nodes     │  (ROSLIB WebSocket Protocol)                        │
│  │  - Sensors      │                                                     │
│  │  - Navigation   │                                                     │
│  │  - LIDAR        │                                                     │
│  └────────┬────────┘                                                     │
│           │                                                              │
│           │ WebSocket (exposed port)                                     │
│           ↓                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │              Docker Container (flo-offline-mode)                 │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │                   Application Layer                              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │  Socket.IO   │  │     API      │  │     Sync     │           │    │
│  │  │   Server     │  │  Endpoints   │  │    Queue     │           │    │
│  │  │  (WebSocket) │  │  (Express)   │  │   Manager    │           │    │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │    │
│  │         │                 │                 │                    │    │
│  ├─────────┴─────────────────┴─────────────────┴────────────────────┤    │
│  │                   Business Logic Layer                           │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │ Robot Auth   │  │   Mission    │  │ Connectivity │           │    │
│  │  │  (JWT)       │  │  Controller  │  │   Detector   │           │    │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │    │
│  │         │                 │                 │                    │    │
│  ├─────────┴─────────────────┴─────────────────┴────────────────────┤    │
│  │                   Data Access Layer                              │    │
│  │  ┌──────────────────────────────────────────────────────────┐    │    │
│  │  │               Repository Pattern                          │    │    │
│  │  │  (Abstraction between services and storage)               │    │    │
│  │  └────────────────────┬─────────────────────────────────────┘    │    │
│  │                       │                                          │    │
│  ├───────────────────────┴──────────────────────────────────────────┤    │
│  │                   Persistence Layer                              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │  Embedded    │  │   Local      │  │  Sync Queue  │           │    │
│  │  │   MongoDB    │  │  Filesystem  │  │  Collection  │           │    │
│  │  │  (Primary)   │  │  (S3 Mirror) │  │  (Pending)   │           │    │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │    │
│  │         │                 │                 │                    │    │
│  │         ↓                 ↓                 ↓                    │    │
│  │  ┌──────────────────────────────────────────────────────────┐    │    │
│  │  │              Docker Named Volumes                        │    │    │
│  │  │  - mongodb-data (database files)                         │    │    │
│  │  │  - local-storage (LIDAR maps, point clouds)              │    │    │
│  │  │  - sync-queue (operations awaiting upload)               │    │    │
│  │  └──────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│           │                                                              │
│           │ (when network available)                                    │
│           ↓                                                              │
└─────────────────────────────────────────────────────────────────────────┘
            │
            │ HTTPS (authenticated)
            ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         Cloud Infrastructure                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │   MongoDB    │  │      S3      │  │  AWS IoT     │                   │
│  │    Atlas     │  │   (Media)    │  │  (MQTT)      │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Socket.IO Server** | Real-time bidirectional communication with ROS nodes and frontend clients | Socket.IO 4.x with namespaces for robot/client separation, same protocol as cloud mode |
| **ROS Bridge** | Protocol translation between ROS (host) and WebSocket (container) | ROSLIB.js on frontend, native ROS publishers/subscribers on host via WebSocket |
| **Embedded MongoDB** | Primary data store for all autonomy data (missions, sessions, robot state) | MongoDB 6.x embedded in container, matches cloud schema exactly |
| **Local Filesystem** | Temporary storage for large files (LIDAR maps, point clouds) awaiting cloud upload | Node.js fs module writing to mounted volume, organized by session/mission ID |
| **Sync Queue Manager** | Tracks operations pending cloud sync, handles retry logic with exponential backoff | MongoDB collection storing operation metadata, processed by background worker |
| **Connectivity Detector** | Monitors network availability to trigger sync operations | Periodic health checks to cloud endpoints, event-based sync activation |
| **Repository Pattern** | Abstracts data access, enables consistent schema between local and cloud storage | Mongoose models shared between offline container and cloud backend |
| **JWT Authentication** | Validates robot identity for connections (same as cloud mode) | Express middleware, shared secret/key with cloud infrastructure |
| **Mission Controller** | Business logic for mission planning, path calculation, execution tracking | Reused from cloud backend with AWS IoT dependencies removed |
| **API Endpoints** | HTTP REST API for frontend interactions | Express.js routes, controllers from cloud backend adapted for local-only mode |

## Recommended Project Structure

```
flo-offline-mode/
├── src/
│   ├── server.ts              # Entry point: Express + Socket.IO + MongoDB initialization
│   ├── config/                # Configuration management
│   │   ├── database.ts        # Embedded MongoDB connection with retry logic
│   │   ├── socket.ts          # Socket.IO server setup with namespaces
│   │   └── sync.ts            # Cloud sync configuration (endpoints, auth)
│   ├── controllers/           # Business logic handlers (adapted from cloud)
│   │   ├── missionController.ts
│   │   ├── robotController.ts
│   │   └── sessionController.ts
│   ├── models/                # Mongoose schemas (MUST match cloud exactly)
│   │   ├── Robot.ts
│   │   ├── Mission.ts
│   │   ├── Session.ts
│   │   └── SyncOperation.ts   # Tracks pending cloud uploads
│   ├── repositories/          # Data access abstraction
│   │   ├── BaseRepository.ts  # Generic CRUD with local/cloud awareness
│   │   └── MissionRepository.ts
│   ├── services/              # External integrations and complex logic
│   │   ├── syncService.ts     # Sync queue processing, conflict resolution
│   │   ├── storageService.ts  # Local filesystem management
│   │   └── connectivityService.ts # Network detection
│   ├── sockets/               # Socket.IO event handlers (reused from cloud)
│   │   ├── listeners/
│   │   │   ├── masterListener.ts  # /v1/robot/master namespace
│   │   │   └── clientListener.ts  # /v1/client namespace
│   │   └── emitters/
│   ├── middleware/            # Express middleware
│   │   ├── authMiddleware.ts  # JWT validation (shared with cloud)
│   │   ├── errorMiddleware.ts
│   │   └── offlineGuard.ts    # Blocks cloud-only operations
│   ├── workers/               # Background job processing
│   │   └── syncWorker.ts      # Periodic sync queue processor
│   └── utils/                 # Shared utilities
│       ├── logger.ts          # Winston logger
│       └── conflictResolver.ts # Last-write-wins with timestamp comparison
├── Dockerfile                 # Alpine-based multi-stage build
├── docker-compose.yml         # Container orchestration with health checks
├── package.json               # Dependencies (Node.js 22, TypeScript, pnpm)
└── .dockerignore
```

### Structure Rationale

- **controllers/models/services from cloud:** Reusing existing, battle-tested code from mission-control backend minimizes bugs and ensures schema compatibility. Remove AWS IoT and Redis dependencies, but keep business logic intact.
- **repositories/:** Abstraction layer enables swapping between local-only and cloud-aware data access patterns. During offline mode, all operations target local MongoDB; when online, sync operations target cloud APIs.
- **workers/syncWorker.ts:** Background process runs on interval (e.g., every 30s) to check connectivity and process sync queue. Uses exponential backoff for failed uploads to avoid overwhelming network on reconnection.
- **models/SyncOperation.ts:** Critical for zero data loss requirement. Every local mutation creates a sync operation record with operation type, target entity, payload, retry count, and status (pending/synced/failed).
- **Local filesystem organized by entity:** `/local-storage/missions/{missionId}/lidar/`, `/local-storage/sessions/{sessionId}/pointclouds/` mirrors cloud S3 bucket structure for seamless sync.

## Architectural Patterns

### Pattern 1: Repository Pattern with Offline-First Awareness

**What:** Data access layer that abstracts whether data comes from local storage or cloud, with local storage always being the primary source of truth.

**When to use:** Every database interaction. The repository determines sync requirements and queues cloud operations without blocking local writes.

**Trade-offs:**
- **Pro:** Enables consistent data access patterns, simplifies testing with mock repositories, makes cloud/local distinction transparent to controllers
- **Con:** Adds abstraction overhead, requires careful schema version management between local and cloud

**Example:**
```typescript
// BaseRepository handles offline-first pattern
class MissionRepository extends BaseRepository<Mission> {
  async create(missionData: Partial<Mission>): Promise<Mission> {
    // 1. Write to local MongoDB immediately (fast, always succeeds)
    const mission = await this.model.create(missionData);

    // 2. Queue sync operation for when online (non-blocking)
    await SyncOperation.create({
      type: 'CREATE',
      entity: 'Mission',
      entityId: mission._id,
      payload: mission.toJSON(),
      status: 'pending',
      retryCount: 0,
      createdAt: new Date()
    });

    // 3. Return local copy immediately
    return mission;
  }

  async findById(id: string): Promise<Mission | null> {
    // Always read from local storage (offline-first)
    return this.model.findById(id);
  }
}
```

### Pattern 2: Sync Queue with Exponential Backoff

**What:** Background worker processes a queue of pending cloud operations, using exponential backoff to handle network failures gracefully without overwhelming services on reconnection.

**When to use:** Any system requiring reliable eventual consistency between offline device and cloud backend.

**Trade-offs:**
- **Pro:** Prevents sync storms when many devices reconnect simultaneously, handles transient failures gracefully, preserves operation order for dependent changes
- **Con:** Delays cloud visibility of offline data, requires careful conflict resolution when multiple devices edit same entities offline

**Example:**
```typescript
// Sync worker runs every 30 seconds
class SyncWorker {
  async processSyncQueue() {
    // Only run if network available
    if (!await this.connectivityService.isOnline()) {
      return;
    }

    // Get pending operations in creation order
    const operations = await SyncOperation.find({
      status: 'pending',
      retryCount: { $lt: MAX_RETRIES }
    }).sort({ createdAt: 1 }).limit(50);

    for (const op of operations) {
      try {
        // Attempt cloud sync
        await this.syncToCloud(op);
        op.status = 'synced';
        op.syncedAt = new Date();
        await op.save();
      } catch (error) {
        // Exponential backoff: 2^retryCount seconds
        const backoffMs = Math.pow(2, op.retryCount) * 1000;
        const jitter = Math.random() * 1000; // Prevent thundering herd

        op.retryCount += 1;
        op.nextRetryAt = new Date(Date.now() + backoffMs + jitter);
        await op.save();

        // Circuit breaker: stop processing if too many failures
        if (op.retryCount >= MAX_RETRIES) {
          logger.error(`Sync operation ${op._id} exceeded max retries`);
          op.status = 'failed';
          await op.save();
        }
      }
    }
  }
}
```

### Pattern 3: Schema Version Parity

**What:** Local MongoDB schema must exactly match cloud MongoDB schema to enable seamless sync. Both environments use identical Mongoose models.

**When to use:** Always. Schema drift between local and cloud causes sync failures and data corruption.

**Trade-offs:**
- **Pro:** Eliminates transformation logic during sync, simplifies reasoning about data structures, enables code reuse between cloud and offline systems
- **Con:** Schema changes require updating both cloud backend and offline container, version mismatches can cause hard-to-debug sync issues

**Example:**
```typescript
// Shared Mongoose model used in both cloud backend and offline container
// Located in: shared-models package or duplicated exactly
const MissionSchema = new Schema({
  robotId: { type: Schema.Types.ObjectId, ref: 'Robot', required: true },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'failed'],
    default: 'pending'
  },
  waypoints: [{
    lat: Number,
    lng: Number,
    order: Number
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  // Sync metadata (offline-mode only, ignored by cloud)
  _localOnly: { type: Boolean, default: false }
});

// Model used identically in both environments
export const Mission = model('Mission', MissionSchema);
```

### Pattern 4: Last-Write-Wins Conflict Resolution

**What:** When the same entity is modified both offline and in cloud (e.g., multiple operators editing mission while robot offline), the most recent timestamp determines the winning version.

**When to use:** Single-robot, single-operator scenarios where conflicts are rare. Appropriate for flo-offline-mode's use case (one robot per container instance).

**Trade-offs:**
- **Pro:** Simple to implement, predictable behavior, works well for timestamp-based data like sensor readings
- **Con:** Can lose data if users make conflicting edits, requires accurate time synchronization between devices

**Example:**
```typescript
async syncMissionToCloud(localMission: Mission, syncOp: SyncOperation) {
  try {
    // Fetch current cloud version
    const cloudMission = await cloudAPI.getMission(localMission._id);

    if (!cloudMission) {
      // Create new mission in cloud
      await cloudAPI.createMission(localMission);
      return;
    }

    // Compare timestamps (last-write-wins)
    if (localMission.updatedAt > cloudMission.updatedAt) {
      // Local version is newer, push to cloud
      await cloudAPI.updateMission(localMission._id, localMission);
      logger.info(`Cloud updated with local changes for mission ${localMission._id}`);
    } else {
      // Cloud version is newer, pull to local
      await Mission.findByIdAndUpdate(localMission._id, cloudMission);
      logger.info(`Local updated with cloud changes for mission ${localMission._id}`);

      // Mark sync op as resolved (no upload needed)
      syncOp.status = 'resolved';
    }
  } catch (error) {
    throw new Error(`Sync failed: ${error.message}`);
  }
}
```

## Data Flow

### Request Flow (Mission Creation - Offline Mode)

```
[Frontend: Create Mission Button]
    ↓
[POST /api/v1/missions/create] → Express Router
    ↓
[authMiddleware: Verify JWT] → Valid token
    ↓
[missionController.create] → Business logic validation
    ↓
[MissionRepository.create] → Write to local MongoDB
    │
    ├─ [MongoDB: missions collection] → Mission saved (< 10ms)
    │
    └─ [MongoDB: syncOperations collection] → Queue cloud upload
    ↓
[Response: Mission object] → Frontend receives mission immediately
    ↓
[Socket.IO emit: 'mission-created'] → Real-time update to connected clients
```

**Key characteristic:** Frontend receives success response immediately from local write. Cloud sync happens asynchronously in background, transparent to user.

### Sync Flow (Background Worker - Online Mode)

```
[SyncWorker: 30-second interval]
    ↓
[ConnectivityService.isOnline()] → Ping cloud health endpoint
    ↓ (online)
[SyncOperation.find({ status: 'pending' })] → Get queued operations
    ↓
For each operation:
    ↓
[Fetch cloud version] → Check for conflicts
    ↓
[Compare timestamps] → Last-write-wins logic
    │
    ├─ Local newer → [PUT /cloud-api/missions/:id] → Update cloud
    │
    └─ Cloud newer → [Mission.findByIdAndUpdate] → Update local
    ↓
[SyncOperation.update({ status: 'synced' })] → Mark complete
    ↓
[Socket.IO emit: 'sync-status'] → Notify frontend of sync progress
```

**Retry flow on failure:**
```
[Cloud API call fails]
    ↓
[Calculate backoff: 2^retryCount * 1000ms + jitter]
    ↓
[SyncOperation.update({ retryCount++, nextRetryAt })]
    ↓
[Continue to next operation] → Avoid blocking queue
```

### ROS Integration Flow (Real-time Robot Data)

```
[ROS Node: Publishes /lidar_scan topic]
    ↓
[ROSLIB.js on Host] → WebSocket connection to container
    ↓
[Socket.IO Server: /v1/robot/master namespace]
    ↓
[masterListener.on('lidar-data')] → Event handler
    ↓
[Redis in cloud mode / MongoDB in offline mode] → Store latest sensor state
    │
    └─ [sessionController.recordLidarFrame] → Persist to session
    ↓
[Socket.IO emit to room: 'robot-data'] → Stream to frontend clients
    ↓
[Frontend: Update LIDAR visualization] → Real-time 3D rendering
```

**Offline adaptation:** Cloud mode uses Redis for real-time state (ephemeral, fast). Offline mode uses MongoDB with TTL indexes to auto-expire old sensor readings, preventing database bloat during long offline sessions.

### File Upload Flow (LIDAR Maps)

```
[Frontend: Upload LIDAR map file]
    ↓
[POST /api/v1/sessions/:id/upload-map] → Multipart form data
    ↓
[multer middleware] → Parse file from request
    ↓
[storageService.saveLocal] → Write to /local-storage/sessions/{id}/maps/
    │
    └─ [Docker volume: local-storage] → File persisted
    ↓
[Session.update({ mapFile: localPath })] → Store file reference in MongoDB
    ↓
[SyncOperation.create({ type: 'UPLOAD_FILE', filePath })] → Queue S3 upload
    ↓
[Response: { success: true, localPath }] → Frontend shows upload complete
```

**Background S3 sync:**
```
[SyncWorker detects UPLOAD_FILE operation]
    ↓
[fs.createReadStream(localPath)] → Read file from volume
    ↓
[S3.upload({ Bucket, Key, Body: stream })] → Upload to cloud storage
    ↓
[Session.update({ mapFile: s3Url })] → Update reference to S3 URL
    ↓
[SyncOperation.update({ status: 'synced' })] → Mark complete
    ↓
[Optional: fs.unlink(localPath)] → Delete local copy to save space
```

### State Management

**Backend State (Offline Mode):**
- **MongoDB:** Persistent state for missions, sessions, robot configuration, sync queue
- **In-Memory:** Current Socket.IO connections, active rooms, temporary sensor buffers
- **Docker Volumes:** Long-term file storage (LIDAR maps, point clouds)

**Frontend State (Unchanged from Cloud):**
- **Zustand stores:** Global state for robot status, active missions, user session
- **React Query:** Server state caching with automatic stale-while-revalidate
- **Local Storage:** JWT tokens, user preferences, offline indicators

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **1 robot (MVP)** | Single Docker container with embedded MongoDB on robot's compute device. No special considerations needed. |
| **1-10 robots per site** | Each robot runs independent container instance. Containers sync to shared cloud MongoDB. Consider Redis on cloud for aggregated dashboard views. |
| **10-100 robots per site** | Add edge gateway server at site to aggregate robot data before cloud sync. Reduces cloud API calls and bandwidth. Embedded MongoDB still viable per robot. |
| **100+ robots distributed** | Migrate to MongoDB replica set for cloud backend. Consider message queue (RabbitMQ/Kafka) for sync operations instead of polling pattern. Offline containers remain single-instance embedded MongoDB. |

### Scaling Priorities

1. **First bottleneck (50+ robots):** Sync queue processing becomes slow due to sequential polling pattern. **Fix:** Implement webhook-based sync triggers when robots reconnect (push model) instead of periodic polling (pull model).

2. **Second bottleneck (200+ robots):** Cloud MongoDB write throughput saturated during mass reconnection events (e.g., site-wide network outage recovery). **Fix:** Implement rate limiting on sync worker, batch sync operations, use sharded MongoDB cluster.

3. **Disk space on robot device:** Long offline sessions accumulate large LIDAR files. **Fix:** Implement automatic cleanup of synced files, compress point clouds before storage, configurable retention policy.

**For flo-offline-mode v1:** Scale considerations are premature. Single-robot, embedded architecture is optimal. Revisit when deploying > 10 simultaneous robots per site.

## Anti-Patterns

### Anti-Pattern 1: Running MongoDB as Separate Container

**What people do:** Use Docker Compose with separate `mongo:6-alpine` service container communicating with Node.js app container via Docker network.

**Why it's wrong:** Violates single-container portability requirement. Adds deployment complexity (health checks, startup order dependencies, network configuration). Defeats purpose of "download one image, run one command" simplicity for robotics field deployments.

**Do this instead:** Embed MongoDB process within same container as Node.js app. Use supervisor/PM2 to manage both processes. MongoDB data directory mounts to Docker volume for persistence across container restarts.

```dockerfile
# Correct: Single container with embedded MongoDB
FROM node:20-alpine

# Install MongoDB (if available in Alpine repos, otherwise use multi-stage build)
RUN apk add --no-cache mongodb mongodb-tools

# Copy application
COPY . /app
WORKDIR /app
RUN pnpm install --production

# Supervisor config to run both MongoDB and Node.js
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose ports
EXPOSE 3000 27017

CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
```

**Note:** Alpine Linux removed MongoDB from official repos due to licensing (Server Side Public License). Alternative: Use multi-stage build to compile MongoDB from source, or use pre-built MongoDB binary from official tarballs. Embedded approach remains valid despite Alpine complications.

### Anti-Pattern 2: Sync on Every Local Write (Eager Sync)

**What people do:** Attempt to sync each local database write to cloud immediately when network is available.

**Why it's wrong:**
- Creates sync storms when network reconnects (hundreds of simultaneous API calls)
- Blocks user operations waiting for network responses (defeats offline-first UX)
- No batching opportunity for efficient network usage
- Fails to handle transient network issues (user halfway between WiFi zones)

**Do this instead:** Always write locally first, return success to user immediately. Queue sync operations in background worker that processes batches on interval with exponential backoff retry logic.

```typescript
// WRONG: Eager sync blocks user
async createMission(data) {
  const mission = await Mission.create(data);

  if (await isOnline()) {
    await cloudAPI.createMission(mission); // BLOCKS! Fails if network flaky!
  }

  return mission;
}

// CORRECT: Queue and return immediately
async createMission(data) {
  const mission = await Mission.create(data);

  // Non-blocking queue operation
  await SyncOperation.create({
    type: 'CREATE',
    entity: 'Mission',
    payload: mission,
    status: 'pending'
  });

  return mission; // User sees success instantly
}
```

### Anti-Pattern 3: Using Redis for Offline Persistence

**What people do:** Port cloud architecture's Redis caching layer directly to offline container for robot state storage.

**Why it's wrong:**
- Redis is in-memory, data lost on container restart (violates zero data loss requirement)
- Redis persistence (RDB/AOF) adds complexity without benefit over MongoDB
- Running both Redis and MongoDB in single container wastes resources
- Cloud Redis usage is for speed across network; local MongoDB is already fast enough (<10ms writes)

**Do this instead:** Use MongoDB for all persistent state in offline mode. For ephemeral session state (current Socket.IO connections, temporary buffers), use in-memory JavaScript objects or Maps. Docker volume persistence covers crash recovery.

```typescript
// WRONG: Redis in offline container
const redis = new Redis({ host: 'localhost' });
await redis.set(`robot:${robotId}`, JSON.stringify(robotState)); // Lost on restart!

// CORRECT: MongoDB with TTL for sensor streams
await RobotState.create({
  robotId,
  sensorData,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 60 * 60 * 1000) // Auto-delete after 1 hour
});

// TTL index in schema
RobotStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

### Anti-Pattern 4: Schema Divergence Between Local and Cloud

**What people do:** Create "simplified" offline schema to reduce storage, then transform during sync.

**Why it's wrong:**
- Transformation logic is error-prone, creates bugs during sync
- Schema mismatches cause sync failures that are hard to debug
- Violates single source of truth principle
- Makes code reuse between cloud and offline impossible

**Do this instead:** Use identical Mongoose models in both cloud backend and offline container. Share models via npm package or direct code duplication (ensure versioning). Accept minor storage overhead for schema parity.

```typescript
// WRONG: Different schemas
// Cloud: Mission has waypoints array
// Offline: Mission has waypointsCount number (saving space)
// Result: Sync breaks, data lost

// CORRECT: Identical schema, shared import
import { Mission } from '@flo/shared-models'; // Same in both environments

// Both cloud and offline use this model
const mission = await Mission.create({
  robotId,
  waypoints: [...], // Exact same structure
  status: 'pending'
});
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Cloud MongoDB Atlas** | REST API over HTTPS with API key authentication | Sync worker POSTs to custom sync endpoint on cloud backend, not direct MongoDB connection. Cloud backend handles write to Atlas. |
| **AWS S3** | AWS SDK v3 with IAM credentials from environment variables | Use pre-signed URLs for uploads when available to avoid embedding AWS credentials in container. Otherwise, use limited-scope IAM role. |
| **Cloud Backend API** | JWT-based authentication, same tokens as cloud mode | Robot authenticates once at startup, receives JWT valid for 24h. Sync operations include JWT in Authorization header. |
| **ROS on Host Machine** | WebSocket protocol (ROSLIB.js standard) via exposed container port | Host ROS nodes connect to `ws://localhost:3000/socket.io` exposed from container. No changes to existing ROS code required. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Socket.IO Server ↔ Controllers** | Event-driven: Socket events invoke controller methods | Controllers emit Socket.IO events for real-time updates. Same pattern as cloud backend, code reusable. |
| **Controllers ↔ Repositories** | Direct method calls (synchronous/async) | Repositories abstract storage location. Controllers don't know if data is local-only or synced. |
| **Repositories ↔ MongoDB** | Mongoose ORM with async/await | All database operations wrapped in try-catch, errors propagated to error middleware. |
| **Sync Worker ↔ Cloud API** | HTTP REST calls with axios, retry logic built-in | Separate process/thread for sync to avoid blocking main Express server. Uses Bull queue for job scheduling in future iterations. |
| **Local Filesystem ↔ Storage Service** | Node.js fs module with promises (fs/promises) | Storage service maintains index of local files in MongoDB, tracks sync status per file. |
| **Connectivity Service ↔ All Services** | Event emitter pattern: emits 'online'/'offline' events | Services subscribe to connectivity changes to trigger sync (online) or queue operations (offline). |

## Docker Container Architecture

### Multi-Stage Build Strategy

**Stage 1: Builder**
- Base: `node:20-alpine`
- Purpose: Install dependencies, compile TypeScript
- Result: Compiled JavaScript in `/dist`

**Stage 2: MongoDB Builder (if needed)**
- Base: `alpine:3.18`
- Purpose: Download pre-built MongoDB binary from official tarball (Alpine repos lack MongoDB)
- Result: MongoDB binaries extracted to `/mongodb`

**Stage 3: Runtime**
- Base: `node:20-alpine`
- Purpose: Minimal production image with Node.js app + MongoDB
- Size target: < 500MB total
- Components:
  - Node.js runtime (included in base)
  - Compiled application from Stage 1
  - MongoDB binaries from Stage 2
  - Process supervisor (PM2 or supervisord)

### Container Health Checks

Health check configuration in Dockerfile:
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node /app/dist/healthcheck.js || exit 1
```

**Health check script (`healthcheck.js`):**
```javascript
// Check 1: Express server responding
fetch('http://localhost:3000/health')
  .then(res => res.status === 200 ? true : throw new Error())
  // Check 2: MongoDB accepting connections
  .then(() => mongoose.connect('mongodb://localhost:27017/flo_offline'))
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
```

**Docker Compose dependency pattern (if using compose for volumes):**
```yaml
services:
  flo-offline:
    image: flo-offline-mode:latest
    volumes:
      - mongodb-data:/data/db
      - local-storage:/app/storage
      - sync-queue:/app/sync
    healthcheck:
      test: ["CMD", "node", "/app/dist/healthcheck.js"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 40s
    restart: unless-stopped

volumes:
  mongodb-data:
    driver: local
  local-storage:
    driver: local
  sync-queue:
    driver: local
```

### Named Volume Strategy

**Volume 1: mongodb-data**
- Mount: `/data/db` (MongoDB default data directory)
- Purpose: Database files, indexes, journal
- Lifecycle: Persistent across container updates, backed up regularly
- Size estimate: 1-5GB for typical mission data (thousands of missions, sessions)

**Volume 2: local-storage**
- Mount: `/app/storage`
- Purpose: LIDAR maps, point clouds, media files
- Lifecycle: Cleaned up after successful cloud sync (configurable retention)
- Size estimate: 10-50GB depending on session length and file compression

**Volume 3: sync-queue**
- Mount: `/app/sync` (optional, can be in mongodb-data)
- Purpose: Pending sync operation metadata, retry logs
- Lifecycle: Cleared when all operations synced
- Size estimate: < 100MB

**Backup strategy:**
- Daily volume snapshots using `docker run --rm -v mongodb-data:/data -v /host/backup:/backup alpine tar czf /backup/mongodb-$(date +%F).tar.gz /data`
- Upload compressed volumes to S3 when network available
- Retain 7 days of local backups, 30 days in S3

## Deployment Architecture

### Development Workflow

1. **Build container locally:**
   ```bash
   docker build -t flo-offline-mode:dev .
   ```

2. **Run with mounted volumes:**
   ```bash
   docker run -d \
     --name flo-offline-dev \
     -p 3000:3000 \
     -v $(pwd)/data:/data/db \
     -v $(pwd)/storage:/app/storage \
     -e JWT_SECRET=dev-secret \
     -e CLOUD_API_URL=http://localhost:4000 \
     flo-offline-mode:dev
   ```

3. **Verify health:**
   ```bash
   docker inspect --format='{{.State.Health.Status}}' flo-offline-dev
   ```

### Production Workflow (Robot Deployment)

1. **Pre-deployment:**
   - Build container on CI/CD server
   - Push to Docker Hub or private registry
   - Tag with version: `flo-offline-mode:v1.0.0`

2. **On-robot installation:**
   ```bash
   # Pull latest image
   docker pull myregistry/flo-offline-mode:v1.0.0

   # Create named volumes (first time only)
   docker volume create mongodb-data
   docker volume create local-storage

   # Run container with restart policy
   docker run -d \
     --name flo-offline \
     --restart unless-stopped \
     -p 3000:3000 \
     -v mongodb-data:/data/db \
     -v local-storage:/app/storage \
     -e JWT_SECRET=$(cat /robot/secrets/jwt) \
     -e ROBOT_ID=$(cat /robot/config/id) \
     -e CLOUD_API_URL=https://api.flo.example.com \
     myregistry/flo-offline-mode:v1.0.0
   ```

3. **ROS integration (on host):**
   ```bash
   # ROS nodes connect to WebSocket exposed by container
   roslaunch flo_ros_bridge mission_control.launch ws_url:=ws://localhost:3000/socket.io
   ```

4. **Monitoring:**
   ```bash
   # Container logs
   docker logs -f flo-offline

   # Health status
   docker inspect flo-offline | jq '.[].State.Health'

   # Volume usage
   docker system df -v
   ```

### Update Process (Zero-Downtime Goal)

1. **Pull new image:**
   ```bash
   docker pull myregistry/flo-offline-mode:v1.1.0
   ```

2. **Stop old container (brief downtime unavoidable for single-container):**
   ```bash
   docker stop flo-offline
   ```

3. **Backup volumes (optional):**
   ```bash
   docker run --rm -v mongodb-data:/data -v /backup:/backup alpine tar czf /backup/pre-update-$(date +%F).tar.gz /data
   ```

4. **Start new container with same volumes:**
   ```bash
   docker run -d \
     --name flo-offline \
     --restart unless-stopped \
     -p 3000:3000 \
     -v mongodb-data:/data/db \  # Same volumes = data preserved
     -v local-storage:/app/storage \
     -e JWT_SECRET=$(cat /robot/secrets/jwt) \
     -e ROBOT_ID=$(cat /robot/config/id) \
     -e CLOUD_API_URL=https://api.flo.example.com \
     myregistry/flo-offline-mode:v1.1.0
   ```

5. **Verify functionality:**
   ```bash
   curl http://localhost:3000/health
   docker logs flo-offline | grep "Server started"
   ```

**Note:** True zero-downtime requires blue-green deployment with load balancer, which adds complexity inappropriate for single-robot use case. Brief downtime during updates (< 30 seconds) is acceptable for MVP.

## Build Order and Implementation Dependencies

### Phase 1: Core Infrastructure (No dependencies)

**What to build:**
1. Dockerfile with Alpine + Node.js 22 + embedded MongoDB setup
2. Basic Express server with health check endpoint
3. MongoDB connection with retry logic
4. Docker volume configuration in docker-compose.yml
5. Environment variable management (.env template)

**Why first:** Everything depends on container running successfully. Can't test other components without working runtime environment.

**Validation:** `docker run` succeeds, health check passes, MongoDB accepts connections, volumes persist data after container restart.

---

### Phase 2: Authentication & Security (Depends on: Phase 1)

**What to build:**
1. JWT authentication middleware (port from cloud backend)
2. Robot authentication endpoint (`POST /auth/robot`)
3. Token validation in Socket.IO handshake
4. Environment-based secret management

**Why second:** All subsequent API endpoints and Socket.IO connections require authentication. Blocking dependency for Phase 3 and 4.

**Validation:** Robot can authenticate with MAC address, receive JWT, connect to Socket.IO with valid token, rejected with invalid token.

---

### Phase 3: Data Layer with Repository Pattern (Depends on: Phase 1, 2)

**What to build:**
1. Mongoose models matching cloud schema (Robot, Mission, Session, SyncOperation)
2. BaseRepository with CRUD operations
3. Entity-specific repositories (MissionRepository, SessionRepository)
4. Database migration scripts (if needed for schema initialization)

**Why third:** Controllers (Phase 4) and sync logic (Phase 5) depend on data access layer. Repository pattern must be established before business logic.

**Validation:** Can create/read/update/delete entities via repository methods, schema validation works, foreign key relationships enforced.

---

### Phase 4: Core Controllers & API (Depends on: Phase 2, 3)

**What to build:**
1. Mission controller (port from cloud: create, update, list, execute)
2. Robot controller (status, configuration)
3. Session controller (start, stop, LIDAR data recording)
4. Express routes for REST API
5. Error handling middleware

**Why fourth:** Provides business logic for frontend. Independent of Socket.IO (Phase 6) and sync (Phase 5), so can be built in parallel with those phases.

**Validation:** Frontend can create missions, view robot status, start sessions via REST API. All operations write to local MongoDB only (sync in Phase 5).

---

### Phase 5: Sync Queue & Connectivity (Depends on: Phase 3)

**What to build:**
1. SyncOperation model and repository
2. Connectivity service (network health checks to cloud)
3. Sync worker with exponential backoff retry logic
4. Cloud API client (axios with authentication)
5. Conflict resolution logic (last-write-wins)
6. Background job scheduler (cron or Bull)

**Why fifth:** Critical for zero data loss requirement, but doesn't block frontend functionality. Can be built in parallel with Phase 4 and 6.

**Validation:** Operations queue when offline, automatically sync when network returns, retries with backoff on failures, conflict resolution chooses correct version.

---

### Phase 6: Socket.IO Real-Time (Depends on: Phase 2, 4)

**What to build:**
1. Socket.IO server configuration with namespaces
2. Master listener for ROS communication (port from cloud)
3. Client listener for frontend dashboard
4. Event emitters for real-time updates (mission status, robot telemetry)
5. Room management for per-robot data streams

**Why sixth:** Real-time features are value-add but not blocking for basic functionality. Requires authentication (Phase 2) and controllers (Phase 4) to be functional.

**Validation:** ROS nodes can connect via WebSocket, frontend receives real-time robot updates, LIDAR data streams to dashboard, multiple clients can join same robot room.

---

### Phase 7: File Storage & Upload (Depends on: Phase 3, 5)

**What to build:**
1. Local filesystem storage service
2. Multer middleware for file uploads
3. File upload endpoints (LIDAR maps, point clouds)
4. File reference tracking in session model
5. S3 upload integration in sync worker

**Why seventh:** Depends on sync queue (Phase 5) to handle S3 uploads. Not blocking for MVP if using simplified file handling initially.

**Validation:** Can upload LIDAR files, stored in Docker volume, referenced in session, automatically uploaded to S3 when online, local copy cleaned up after sync.

---

### Phase 8: Monitoring & Logging (Depends on: Phase 1)

**What to build:**
1. Winston logger configuration
2. Structured logging for sync operations
3. Log rotation and retention policy
4. Metrics endpoint (sync queue depth, disk usage)
5. Alert system for critical errors (optional)

**Why eighth:** Nice-to-have for production, but not blocking for core functionality. Can be added iteratively as issues arise.

**Validation:** Logs written to Docker volume, old logs rotated, metrics accessible via endpoint, critical errors trigger alerts.

---

### Dependency Graph

```
Phase 1 (Infrastructure)
    ├─> Phase 2 (Authentication)
    │       ├─> Phase 4 (Controllers)
    │       │       └─> Phase 6 (Socket.IO)
    │       └─> Phase 3 (Data Layer)
    │               ├─> Phase 4 (Controllers)
    │               ├─> Phase 5 (Sync Queue)
    │               │       └─> Phase 7 (File Storage)
    │               └─> Phase 7 (File Storage)
    └─> Phase 8 (Monitoring)
```

**Parallel work opportunities:**
- Phase 4 and Phase 5 can be built simultaneously (both depend on Phase 3)
- Phase 6 and Phase 5 can be built simultaneously (independent once Phase 2/3 complete)
- Phase 8 can be built anytime after Phase 1

**Critical path (longest dependency chain):**
Phase 1 → Phase 2 → Phase 3 → Phase 5 → Phase 7
Estimated: 1 week (Infrastructure) + 3 days (Auth) + 1 week (Data Layer) + 2 weeks (Sync Queue) + 1 week (File Storage) = **5-6 weeks for critical path**

## Sources

**Offline-First Architecture (HIGH confidence):**
- Offline-first frontend apps in 2025: IndexedDB and SQLite - LogRocket Blog (2025-01-15)
- The Complete Guide to Offline-First Architecture in Android - droidcon (2025-12-16)
- Offline sync & conflict resolution patterns - Sachith Dassanayake (2026-02-19)

**Docker & MongoDB (HIGH confidence):**
- Docker Compose Service Dependencies with Healthchecks - BetterLink Blog (2025-12-17)
- How to Use Docker Volumes for Persistent Data - OneUpTime (2026-02-02)
- MongoDB Docker Installation - Percona (2025)
- Docker Volume Management - Teguhwin on Medium (2026-03)

**Sync Patterns (HIGH confidence):**
- Queue-Based Exponential Backoff Pattern - DEV Community (2025)
- Retry with backoff pattern - AWS Prescriptive Guidance
- Offline-First Done Right: Sync Patterns - DevelopersVoice (2025)

**ROS Integration (MEDIUM confidence):**
- Rosbridge Suite - RobotWebTools GitHub (ongoing)
- ROS web tutorial - rosbridge server and roslibjs (2024)
- Remotely Control Security Robots - Jiayi Hoffman on Medium (2025-12)

**Best Practices (HIGH confidence):**
- Official Docker documentation (2026)
- MongoDB official documentation (2026)
- Node.js best practices (2025-2026)

---
*Architecture research for: flo-offline-mode (Offline-First Robotics Autonomy System)*
*Researched: 2026-03-19*
