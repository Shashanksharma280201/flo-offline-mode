# Requirements: flo-offline-mode

**Defined:** 2026-03-19
**Core Value:** Zero data loss during offline operation - all autonomy data must persist locally and sync seamlessly when online

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Container Infrastructure

- [x] **INFRA-01**: Docker Compose multi-container setup (app, MongoDB 8.0, Redis) with named volumes
- [x] **INFRA-02**: Multi-stage Dockerfile using node:22-alpine base image (<500MB total)
- [ ] **INFRA-03**: Graceful shutdown signal handling (SIGTERM) with MongoDB connection cleanup
- [x] **INFRA-04**: MongoDB configured with maxmemory limits and TTL indexes for sensor data
- [x] **INFRA-05**: Redis configured with maxmemory-policy: noeviction for BullMQ
- [x] **INFRA-06**: Health check endpoints for all containers

### Authentication & Authorization

- [ ] **AUTH-01**: JWT-based robot authentication (same tokens as cloud mode)
- [ ] **AUTH-02**: Dual-token strategy for extended offline periods (refresh tokens with offline grace)
- [ ] **AUTH-03**: Robot ID validation on Socket.IO connection handshake
- [ ] **AUTH-04**: Local user session management (web UI access)

### Local Data Persistence

- [ ] **DATA-01**: Mongoose models matching cloud schema exactly (mission, session, robot, map data)
- [ ] **DATA-02**: Repository pattern with local-first writes and automatic sync queueing
- [ ] **DATA-03**: Docker volumes persist across container restarts
- [ ] **DATA-04**: MongoDB crash recovery without data loss

### Robot Connectivity

- [ ] **ROS-01**: Socket.IO server with `/v1/robot/master` namespace (mirrors cloud)
- [ ] **ROS-02**: ROS nodes on host connect via exposed container ports
- [ ] **ROS-03**: Robot status displays "Online" when ROS establishes local connection
- [ ] **ROS-04**: Socket.IO reconnection with unlimited retry attempts and exponential backoff
- [ ] **ROS-05**: Heartbeat mechanism to detect robot disconnect (<30s detection time)

### Mission Planning & Execution

- [ ] **MISSION-01**: User can create missions with waypoints and path constraints
- [ ] **MISSION-02**: Path planning algorithm runs locally (no cloud dependency)
- [ ] **MISSION-03**: Mission execution with real-time status updates via Socket.IO
- [ ] **MISSION-04**: Mission pause/resume/abort controls
- [ ] **MISSION-05**: Mission history and replay functionality

### LIDAR Visualization

- [ ] **LIDAR-01**: 2D LIDAR map display with robot position overlay
- [ ] **LIDAR-02**: 3D point cloud visualization (PCD file support)
- [ ] **LIDAR-03**: LIDAR maps stored locally on filesystem
- [ ] **LIDAR-04**: Point cloud rotation and zoom controls
- [ ] **LIDAR-05**: Map selection and switching UI

### Teleops Control

- [ ] **TELEOPS-01**: Manual robot control via web UI (throttle, steering, actuator)
- [ ] **TELEOPS-02**: Real-time sensor data display (battery, GPS, IMU, temperature)
- [ ] **TELEOPS-03**: Emergency stop functionality
- [ ] **TELEOPS-04**: Control latency <250ms (WebSocket-based)

### Session Tracking

- [ ] **SESSION-01**: Automatic session creation on robot connection
- [ ] **SESSION-02**: Session metadata tracking (duration, distance, battery usage)
- [ ] **SESSION-03**: Session history with filtering and search
- [ ] **SESSION-04**: Session data persists locally and syncs to cloud

### Cloud Sync

- [ ] **SYNC-01**: BullMQ job queue with Redis backend for sync operations
- [ ] **SYNC-02**: Automatic network connectivity detection
- [ ] **SYNC-03**: MongoDB document sync to cloud when online (missions, sessions, robot state)
- [ ] **SYNC-04**: S3 file sync for LIDAR maps and point clouds when online
- [ ] **SYNC-05**: Idempotency keys on all sync operations (prevent duplicates)
- [ ] **SYNC-06**: Exponential backoff retry for failed sync attempts
- [ ] **SYNC-07**: Sync status dashboard showing pending/completed/failed operations
- [ ] **SYNC-08**: Conflict resolution strategy (Last-Write-Wins for single-robot use case)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Performance Optimization

- **PERF-01**: Point cloud compression (RCPCC/LAZ format) for 40-80× size reduction
- **PERF-02**: Incremental sync (delta updates only, not full documents)
- **PERF-03**: Tiered priority queue (critical data syncs before large files)
- **PERF-04**: Bandwidth throttling for background sync

### Advanced Sync

- **SYNC-09**: Partial sync support (resume interrupted uploads)
- **SYNC-10**: Multi-operator conflict resolution with CRDTs
- **SYNC-11**: Bi-directional sync (cloud changes propagate to offline mode)

### Monitoring & Observability

- **MON-01**: Winston structured logging with file rotation
- **MON-02**: Sync metrics dashboard (queue depth, success rate, latency)
- **MON-03**: Container resource monitoring (CPU, memory, disk usage)
- **MON-04**: Error tracking and alerting

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Multi-robot coordination offline | Single-robot focus; coordination requires central authority |
| Mobile app offline access | Web UI only; mobile adds complexity without clear value |
| AWS IoT MQTT in offline mode | Local Socket.IO sufficient; MQTT is cloud-only feature |
| Anaconda base image | 2-4GB too large; Node.js doesn't need Python ML stack |
| ROS inside Docker container | Dependency conflicts; ROS stays on host as designed |
| Full cloud feature parity | Only autonomy features needed offline; admin/fleet management stays cloud-only |
| Real-time collaboration | Single operator per robot; no concurrent editing needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1: Container Infrastructure & Data Foundation | Complete |
| INFRA-02 | Phase 1: Container Infrastructure & Data Foundation | Complete |
| INFRA-03 | Phase 1: Container Infrastructure & Data Foundation | Pending |
| INFRA-04 | Phase 1: Container Infrastructure & Data Foundation | Complete |
| INFRA-05 | Phase 1: Container Infrastructure & Data Foundation | Complete |
| INFRA-06 | Phase 1: Container Infrastructure & Data Foundation | Complete |
| AUTH-01 | Phase 2: Authentication & Offline-First Core | Pending |
| AUTH-02 | Phase 2: Authentication & Offline-First Core | Pending |
| AUTH-03 | Phase 2: Authentication & Offline-First Core | Pending |
| AUTH-04 | Phase 2: Authentication & Offline-First Core | Pending |
| DATA-01 | Phase 3: Data Layer with Repository Pattern | Pending |
| DATA-02 | Phase 3: Data Layer with Repository Pattern | Pending |
| DATA-03 | Phase 3: Data Layer with Repository Pattern | Pending |
| DATA-04 | Phase 3: Data Layer with Repository Pattern | Pending |
| SYNC-01 | Phase 4: Sync Engine with Idempotency | Pending |
| SYNC-02 | Phase 4: Sync Engine with Idempotency | Pending |
| SYNC-03 | Phase 4: Sync Engine with Idempotency | Pending |
| SYNC-04 | Phase 4: Sync Engine with Idempotency | Pending |
| SYNC-05 | Phase 4: Sync Engine with Idempotency | Pending |
| SYNC-06 | Phase 4: Sync Engine with Idempotency | Pending |
| SYNC-07 | Phase 4: Sync Engine with Idempotency | Pending |
| SYNC-08 | Phase 4: Sync Engine with Idempotency | Pending |
| MISSION-01 | Phase 5: Mission Planning & Real-Time Execution | Pending |
| MISSION-02 | Phase 5: Mission Planning & Real-Time Execution | Pending |
| MISSION-03 | Phase 5: Mission Planning & Real-Time Execution | Pending |
| MISSION-04 | Phase 5: Mission Planning & Real-Time Execution | Pending |
| MISSION-05 | Phase 5: Mission Planning & Real-Time Execution | Pending |
| ROS-01 | Phase 5: Mission Planning & Real-Time Execution | Pending |
| ROS-02 | Phase 6: Robot Connectivity & Teleops | Pending |
| ROS-03 | Phase 6: Robot Connectivity & Teleops | Pending |
| ROS-04 | Phase 6: Robot Connectivity & Teleops | Pending |
| ROS-05 | Phase 6: Robot Connectivity & Teleops | Pending |
| TELEOPS-01 | Phase 6: Robot Connectivity & Teleops | Pending |
| TELEOPS-02 | Phase 6: Robot Connectivity & Teleops | Pending |
| TELEOPS-03 | Phase 6: Robot Connectivity & Teleops | Pending |
| TELEOPS-04 | Phase 6: Robot Connectivity & Teleops | Pending |
| SESSION-01 | Phase 6: Robot Connectivity & Teleops | Pending |
| SESSION-02 | Phase 6: Robot Connectivity & Teleops | Pending |
| SESSION-03 | Phase 6: Robot Connectivity & Teleops | Pending |
| SESSION-04 | Phase 6: Robot Connectivity & Teleops | Pending |
| LIDAR-01 | Phase 7: LIDAR Visualization & File Sync | Pending |
| LIDAR-02 | Phase 7: LIDAR Visualization & File Sync | Pending |
| LIDAR-03 | Phase 7: LIDAR Visualization & File Sync | Pending |
| LIDAR-04 | Phase 7: LIDAR Visualization & File Sync | Pending |
| LIDAR-05 | Phase 7: LIDAR Visualization & File Sync | Pending |

**Coverage:**
- v1 requirements: 43 total
- Mapped to phases: 43
- Unmapped: 0 ✓

**Phase Distribution:**
- Phase 1: 6 requirements (Container Infrastructure)
- Phase 2: 4 requirements (Authentication & Offline-First)
- Phase 3: 4 requirements (Data Layer)
- Phase 4: 8 requirements (Sync Engine)
- Phase 5: 6 requirements (Mission Planning + Socket.IO namespace)
- Phase 6: 13 requirements (Robot Connectivity, Teleops, Sessions)
- Phase 7: 5 requirements (LIDAR Visualization)

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after roadmap creation*
