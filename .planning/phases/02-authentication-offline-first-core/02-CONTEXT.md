# Phase 2: Authentication & Offline-First Core - Context

## Phase Boundary

This phase implements JWT-based authentication and Socket.IO connection management by **mirroring the exact cloud architecture** from `mission-control/backend`. The goal is feature parity with cloud mode, with additions for offline-first operation (dual-token strategy, extended grace periods, unlimited reconnection).

**In Scope:**
- JWT robot authentication (access + refresh tokens)
- Socket.IO robot connection management (`/v1/robot/master` namespace)
- Heartbeat mechanism with Redis state tracking
- Web UI session management (simple Online/Offline states)
- Automatic token refresh (background process)
- Unlimited reconnection with exponential backoff

**Out of Scope:**
- Cloud sync logic (Phase 4)
- Mission planning features (Phase 5-6)
- LIDAR visualization (Phase 6)
- S3 file storage (Phase 7)

## Implementation Decisions

### 1. Architecture Approach: Mirror Cloud Mode Exactly

**Decision**: Reuse existing authentication and Socket.IO patterns from `mission-control/backend` with minimal offline-specific modifications.

**Rationale**: User explicitly requested: *"i need the exact same structure / architecture of the current webapp to offline mode (localhost) just that when the robot is connected to the internet all the data syncs in to the cloud correctly"*

**Canonical References:**
- `../mission-control/backend/middlewares/authMiddleware.ts` - JWT authentication patterns
- `../mission-control/backend/sockets/listeners/v1/masterListener.ts` - Socket.IO connection patterns

### 2. Token Management Strategy (Option B)

**Decision**: Dual-token system with offline grace period
- **Access Token**: 1 hour lifespan
- **Refresh Token**: 90 days lifespan
- **Offline Grace Period**: 30 days (local server validates refresh tokens without cloud connectivity)
- **Auto-Refresh**: Background process refreshes access tokens before expiration (no manual intervention)

**Implementation Pattern** (from `authMiddleware.ts`):
```typescript
// Robot JWT authentication (lines 101-149)
export const protectRobot = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token;
    if (req.headers.authorization?.startsWith("Bearer")) {
      [, token] = req.headers.authorization.split(" ");
      const { deviceId } = jwt.verify(token, process.env.JWT_SECRET) as JwtPayloadRobot;
      const robot = await robotModel.findById(deviceId);
      if (!robot) throw new Error("No robot found");
      next();
    }
    if (error?.name === "TokenExpiredError") {
      res.status(401);
      throw new Error("Token Expired, Please log in again");
    }
  }
);
```

**Offline-First Addition**:
- Refresh token validation checks `lastRefreshedAt` timestamp
- If within 30-day grace period, allow local refresh without cloud validation
- After 30 days offline, require cloud connectivity to refresh

### 3. Socket.IO Reconnection Strategy

**Decision**: Exponential backoff with unlimited retries
- **First 15 seconds**: Aggressive exponential backoff (1s, 2s, 4s, 8s)
- **After 15 seconds**: Steady 30-second intervals forever
- **UI Behavior**: Show "Offline" after 15 seconds (UX feedback), but keep trying in background
- **Server Restart**: Auto-reconnect immediately when server detected

**Implementation Pattern** (from `masterListener.ts`):
```typescript
// JWT auth in handshake (lines 24-48)
masterNamespace.use(async (socket, next) => {
  const token = socket.handshake.auth.token ?? socket.handshake.headers.access_token;
  const { deviceId } = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
  const robot = await robotModel.findById(deviceId).populate("users");
  socket.data.robot = robot;
  next();
});

// Connection event (lines 54-100)
masterNamespace.on("connection", async (socket: Socket) => {
  const connectedRobot = socket.data.robot!;
  await redisClient.json.SET(`robot:${connectedRobot.id}`, "$", {
    id: connectedRobot.id,
    status: "Active",
    lastConnectionOn: Date.now(),
    url: {},
    connectedClients: {}
  });
  socket.join(connectedRobot.id);
  emitToallConnectedClients("robot:status", { [socket.data.robot.id]: "Active" });
});

// Disconnect with ping timeout handling (lines 122-176)
socket.on("disconnect", async (reason, details) => {
  if (reason === "ping timeout") {
    const timeDiff = Date.now() - robot.lastConnectionOn;
    if (timeDiff >= 85000) { // 60s + 25s grace period
      await disconnectRobot(reason, details);
    } else {
      logger.info(`${connectedRobot.name} reconnected in ${timeDiff / 1000}s`);
    }
  }
});
```

**Offline-First Addition**:
- Client-side reconnection config: `{ reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 1000, reconnectionDelayMax: 30000, randomizationFactor: 0.5 }`
- No maximum retry limit (keep trying forever)

### 4. UI State Management

**Decision**: Simple 2-state system (Online/Offline) matching existing cloud system
- **Online (Green)**: Robot connected via Socket.IO
- **Offline (Red)**: Robot disconnected or connection failed
- **Startup Behavior**: Conservative - start as "Offline" until connection established

**Rationale**: User chose *"simple same as the current system there is"* - no intermediate states like "Reconnecting" or "Degraded"

### 5. Heartbeat Mechanism

**Decision**: Reuse existing Redis state tracking and ping timeout logic from `masterListener.ts`

**Implementation Pattern**:
- Redis key: `robot:{robotId}` with JSON fields `{id, status, lastConnectionOn, url, connectedClients}`
- Disconnect threshold: 85 seconds (60s ping timeout + 25s grace period)
- Heartbeat update: `lastConnectionOn` timestamp updated on every connection event

## Existing Code Insights

### JWT Token Structure (from `authMiddleware.ts`)

**Robot Token Payload**:
```typescript
interface JwtPayloadRobot {
  deviceId: string;
  iat: number;
  exp: number;
}
```

**User Token Payload**:
```typescript
interface JwtPayload {
  email: string;
  iat: number;
  exp: number;
}
```

**Token Generation** (lines 212-264):
```typescript
export const generateAccessToken = (data: object) =>
  jwt.sign(data, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRY_IN_SECONDS,
  });

export const generateRefreshToken = (data: object) =>
  jwt.sign(data, process.env.REFRESH_TOKEN_SECRET as string, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY_IN_SECONDS,
  });
```

**Environment Variables Needed**:
- `JWT_SECRET` - Access token signing key
- `JWT_EXPIRY_IN_SECONDS` - Access token lifespan (3600 = 1 hour)
- `REFRESH_TOKEN_SECRET` - Refresh token signing key
- `REFRESH_TOKEN_EXPIRY_IN_SECONDS` - Refresh token lifespan (7776000 = 90 days)

### Socket.IO Namespace Pattern (from `masterListener.ts`)

**Namespace**: `/v1/robot/master`

**Authentication Flow**:
1. Client sends JWT in handshake: `socket.handshake.auth.token` or `socket.handshake.headers.access_token`
2. Middleware verifies token and attaches `socket.data.robot`
3. Connection event sets Redis state and joins room
4. Disconnect event clears Redis state (after ping timeout threshold)

**Room Management**:
- Each robot joins a room with `robotId` as the room name
- Enables targeted messaging: `masterNamespace.to(robotId).emit("event", data)`

**Client Emission Pattern** (from `masterListener.ts` lines 102-120):
```typescript
function emitToallConnectedClients(
  event: string,
  data: any,
  connectedRobot: Robot = socket.data.robot
) {
  const clientIds = Object.keys(connectedRobot.connectedClients);
  for (const clientId of clientIds) {
    const clientSocket = connectedRobot.connectedClients[clientId];
    io.of(clientSocket.path).to(clientSocket.socketid).emit(event, data);
  }
}
```

### Redis State Schema (from `masterListener.ts`)

**Robot State Key**: `robot:{robotId}`

**Schema**:
```typescript
{
  id: string;                    // Robot ID
  status: "Active" | "Inactive"; // Connection status
  lastConnectionOn: number;      // Unix timestamp (milliseconds)
  url: {};                       // Empty object (cloud mode uses this for MQTT topics)
  connectedClients: {};          // Map of connected web UI clients
}
```

## Requirements Coverage

This phase addresses:
- **AUTH-01**: Robot authentication via JWT (mirrors `authMiddleware.ts`)
- **AUTH-02**: Dual-token strategy with offline grace period
- **AUTH-03**: Socket.IO connection management (mirrors `masterListener.ts`)
- **AUTH-04**: Web UI session management (simple Online/Offline states)

## Success Criteria

1. Robot connects to offline mode server via Socket.IO with JWT authentication
2. Access tokens refresh automatically before expiration
3. Refresh tokens remain valid for 30 days offline without cloud connectivity
4. Socket.IO reconnects automatically with exponential backoff (unlimited attempts)
5. Web UI shows "Online" when robot connected, "Offline" when disconnected
6. Heartbeat mechanism tracks robot connection state in Redis
7. Zero manual intervention required for token refresh or reconnection

## Files to Create

1. `src/middlewares/authMiddleware.ts` - JWT authentication middleware (mirror cloud patterns)
2. `src/sockets/listeners/v1/masterListener.ts` - Socket.IO robot connection handler (mirror cloud patterns)
3. `src/utils/tokenManager.ts` - Automatic token refresh logic
4. `src/models/Robot.ts` - Robot schema (mirror cloud schema)
5. `src/routes/auth.ts` - Token generation/refresh endpoints
6. `src/controllers/authController.ts` - Authentication logic

## Dependencies Already Installed (Phase 1)

- `jsonwebtoken` - JWT signing and verification
- `socket.io` - Real-time bidirectional communication
- `mongoose` - MongoDB ODM
- `ioredis` - Redis client
- `express` - HTTP server framework

## Next Steps

1. Create RESEARCH.md (optional - most patterns already exist in cloud code)
2. Create executable plans for Phase 2 implementation
3. Execute plans to implement authentication and Socket.IO connection management
