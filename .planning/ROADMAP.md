# Roadmap: flo-offline-mode

## Overview

This roadmap delivers a production-ready offline-first autonomy system through 7 phases, starting with bulletproof container infrastructure and progressing through authentication, data persistence, sync engine, mission planning with real-time features, and LIDAR visualization. Each phase builds on the previous, with critical architectural decisions (graceful shutdown, dual-token auth, repository pattern, idempotency) addressed early when they're easiest to implement. The journey prioritizes zero data loss and offline-first patterns from day one, ensuring robots can operate for extended periods without internet connectivity, then seamlessly sync accumulated data when online.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Container Infrastructure & Data Foundation** - Multi-container Docker setup with MongoDB 8.0, Redis, graceful shutdown handling
- [ ] **Phase 2: Authentication & Offline-First Core** - JWT robot authentication with dual-token strategy, Socket.IO with unlimited reconnection
- [ ] **Phase 3: Data Layer with Repository Pattern** - Mongoose models matching cloud schema, local-first writes with sync queueing
- [ ] **Phase 4: Sync Engine with Idempotency** - BullMQ job queue, network detection, exponential backoff retry, conflict resolution
- [ ] **Phase 5: Mission Planning & Real-Time Execution** - Mission CRUD, path planning, Socket.IO real-time status updates, execution controls
- [ ] **Phase 6: Robot Connectivity & Teleops** - ROS node integration, heartbeat monitoring, manual controls, sensor data display, session tracking
- [ ] **Phase 7: LIDAR Visualization & File Sync** - 2D/3D map display, local filesystem storage, S3 sync with compression

## Phase Details

### Phase 1: Container Infrastructure & Data Foundation
**Goal**: Dockerized runtime environment with zero data loss on ungraceful shutdown and container restarts
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06
**Success Criteria** (what must be TRUE):
  1. Docker Compose successfully starts all three containers (app, MongoDB 8.0, Redis) with named volumes
  2. Container gracefully handles SIGTERM signals and closes MongoDB connections before shutdown
  3. MongoDB data persists across container restarts without corruption (docker-compose down && up preserves data)
  4. Health check endpoints return 200 OK for all containers when services are ready
  5. Multi-stage Dockerfile produces image under 500MB total size
**Plans**: 5 plans in 2 waves

Plans:
- [x] 01-01-PLAN.md — Docker Compose orchestration with named volumes and health checks
- [x] 01-02-PLAN.md — Multi-stage Dockerfile with tini and security best practices
- [ ] 01-03-PLAN.md — MongoDB and Redis configuration for production reliability
- [ ] 01-04-PLAN.md — Data layer initialization and Redis connection
- [ ] 01-05-PLAN.md — Health checks and server initialization

### Phase 2: Authentication & Offline-First Core
**Goal**: Robots authenticate securely and maintain connectivity during extended offline periods with proper reconnection handling
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. Robot can authenticate using JWT token (same format as cloud mode) and access protected endpoints
  2. Robot maintains valid authentication during 7+ day offline periods without token expiration errors
  3. Socket.IO connection automatically reconnects after network interruption with unlimited retry attempts
  4. Web UI displays current online/offline status and shows local data immediately without waiting for sync
  5. Heartbeat mechanism detects robot disconnect within 30 seconds
**Plans**: 3 plans in 2 waves

Plans:
- [ ] 02-01-PLAN.md — Robot model and JWT authentication with dual-token strategy
- [ ] 02-02-PLAN.md — Socket.IO robot connection management with heartbeat tracking
- [ ] 02-03-PLAN.md — Web UI user authentication and session management

### Phase 3: Data Layer with Repository Pattern
**Goal**: All autonomy data (missions, sessions, robot state) persists locally with automatic sync queueing and schema parity with cloud
**Depends on**: Phase 2
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04
**Success Criteria** (what must be TRUE):
  1. Creating a mission writes to local MongoDB immediately and returns success without waiting for cloud sync
  2. Docker volumes preserve all data when container is stopped and restarted (docker-compose restart test)
  3. MongoDB recovers cleanly from unexpected shutdown (kill -9) without data loss or corruption
  4. All Mongoose models include schemaVersion field and match cloud schema exactly
  5. Repository pattern abstracts data access so controllers don't know about sync implementation
**Plans**: TBD

Plans:
- [ ] TBD

### Phase 4: Sync Engine with Idempotency
**Goal**: Accumulated offline data automatically syncs to cloud (MongoDB + S3) when connectivity returns, with zero duplicates and automatic retry on failure
**Depends on**: Phase 3
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04, SYNC-05, SYNC-06, SYNC-07, SYNC-08
**Success Criteria** (what must be TRUE):
  1. System automatically detects network connectivity changes and activates sync queue when online
  2. Creating 10 missions while offline then going online results in exactly 10 missions in cloud (no duplicates)
  3. Interrupting sync mid-operation (disconnect during upload) automatically retries with exponential backoff
  4. Sync status dashboard shows pending/completed/failed operations with counts and recent activity
  5. Sync operations include idempotency keys and server validates them to prevent duplicate processing
  6. Last-Write-Wins conflict resolution handles concurrent edits (timestamp-based for metadata, local wins for telemetry)
**Plans**: TBD

Plans:
- [ ] TBD

### Phase 5: Mission Planning & Real-Time Execution
**Goal**: User can create missions, plan paths, execute autonomy workflows, and receive real-time status updates entirely offline
**Depends on**: Phase 4
**Requirements**: MISSION-01, MISSION-02, MISSION-03, MISSION-04, MISSION-05, ROS-01
**Success Criteria** (what must be TRUE):
  1. User can create mission with waypoints and path constraints through web UI
  2. Path planning algorithm runs locally and generates valid robot path without cloud dependency
  3. Executing mission sends commands to robot and displays real-time status updates via Socket.IO
  4. User can pause, resume, or abort running mission with immediate robot response
  5. Mission history displays all past missions with filtering and replay functionality
**Plans**: TBD

Plans:
- [ ] TBD

### Phase 6: Robot Connectivity & Teleops
**Goal**: ROS nodes on host connect to container, enabling manual robot control, sensor monitoring, and session tracking
**Depends on**: Phase 5
**Requirements**: ROS-02, ROS-03, ROS-04, ROS-05, TELEOPS-01, TELEOPS-02, TELEOPS-03, TELEOPS-04, SESSION-01, SESSION-02, SESSION-03, SESSION-04
**Success Criteria** (what must be TRUE):
  1. ROS node on host successfully connects to Socket.IO server via exposed container port
  2. Robot status displays "Online" in web UI when ROS establishes local connection
  3. User can control robot manually (throttle, steering, actuator) with control latency under 250ms
  4. Real-time sensor data (battery, GPS, IMU, temperature) displays in web UI and updates every second
  5. Emergency stop button immediately halts robot motion when clicked
  6. Session automatically creates on robot connection and tracks duration, distance, battery usage
  7. Session history displays past sessions with filtering and search functionality
**Plans**: TBD

Plans:
- [ ] TBD

### Phase 7: LIDAR Visualization & File Sync
**Goal**: LIDAR maps and point clouds display locally with 2D/3D visualization, store on filesystem, and sync to S3 when online
**Depends on**: Phase 6
**Requirements**: LIDAR-01, LIDAR-02, LIDAR-03, LIDAR-04, LIDAR-05
**Success Criteria** (what must be TRUE):
  1. 2D LIDAR map displays in web UI with robot position overlay showing current location
  2. 3D point cloud visualization loads PCD files with rotation and zoom controls
  3. LIDAR maps and point clouds store on local filesystem (Docker volume) and persist across restarts
  4. Map selection UI lists available maps and switches between them
  5. Large LIDAR files (5-50GB) automatically queue for S3 sync when online without blocking UI
  6. File sync uses tiered priority (mission metadata syncs before large point clouds)
**Plans**: TBD

Plans:
- [ ] TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Container Infrastructure & Data Foundation | 2/5 | In Progress | - |
| 2. Authentication & Offline-First Core | 0/3 | Not started | - |
| 3. Data Layer with Repository Pattern | 0/TBD | Not started | - |
| 4. Sync Engine with Idempotency | 0/TBD | Not started | - |
| 5. Mission Planning & Real-Time Execution | 0/TBD | Not started | - |
| 6. Robot Connectivity & Teleops | 0/TBD | Not started | - |
| 7. LIDAR Visualization & File Sync | 0/TBD | Not started | - |
