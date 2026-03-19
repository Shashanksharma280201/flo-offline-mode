# flo-offline-mode

## What This Is

A Dockerized offline-first autonomy system for robots that mirrors the cloud mission-control functionality locally. When robots operate without internet connectivity, flo-offline-mode runs on the same device as the robot's ROS software, enabling full autonomy features (mission planning, LIDAR visualization, teleops control, session tracking) with local data persistence that automatically syncs to cloud (MongoDB + S3) when connectivity returns.

## Core Value

**Zero data loss during offline operation.** Whether the robot loses connection or is deliberately run offline, all autonomy data must persist locally and sync seamlessly when online, ensuring continuous operation without dependence on cloud infrastructure.

## Requirements

### Validated

**Validated in Phase 1: Container Infrastructure & Data Foundation**
- [x] Docker container runs with optimized Alpine base image (~300-500MB total size)
- [x] Docker volumes persist data across container restarts
- [x] No data loss on unexpected robot shutdown

### Active

- [ ] ROS nodes on host machine connect to container via Socket.IO on exposed ports
- [ ] Robot authentication via JWT (same as cloud mode)
- [ ] Robot status shows "Online" when ROS establishes local connection
- [ ] Mission creation and execution with path planning (full feature parity with cloud)
- [ ] LIDAR map visualization (2D + 3D point clouds) works offline
- [ ] Teleops control functionality available offline
- [ ] Session data tracking and persistence
- [ ] Local filesystem storage for LIDAR maps and point cloud files
- [ ] Automatic sync queue when internet connectivity detected
- [ ] Data sync to cloud MongoDB when online
- [ ] Data sync to S3 for LIDAR/media files when online

### Out of Scope

- Running ROS inside Docker container — ROS stays on host to avoid dependency conflicts
- Using Anaconda for base image — too large (2-4GB), not needed for Node.js stack
- Real-time MQTT via AWS IoT in offline mode — local Socket.IO only
- Multi-robot coordination offline — single robot per offline instance
- Mobile app connectivity in offline mode — web UI only

## Context

**Existing Infrastructure:**
- Cloud system (`mission-control` backend + `mission-control-frontend`) already implements full autonomy stack
- Robots connect via AWS IoT MQTT (sensor telemetry) + Socket.IO (commands/status)
- Redis caches robot state, MongoDB stores persistent data, S3 stores media/maps
- Frontend uses React, Socket.IO client, ROSLIB for ROS bridge
- Backend uses Express, Socket.IO server, Mongoose, AWS SDK

**Technical Environment:**
- Node.js v22, TypeScript, pnpm for package management
- MongoDB for database, Redis for caching (cloud mode)
- Socket.IO for real-time bidirectional communication
- ROS bridge via ROSLIB (WebSocket protocol)
- Docker deployment with Alpine base for size optimization

**Brownfield Context:**
- Codebase map exists in `.planning/codebase/` with full architecture documentation
- Can reuse: Socket.IO connection patterns, robot authentication, frontend components
- Must adapt: Remove AWS IoT MQTT dependency, embed MongoDB, add sync logic

## Constraints

- **Image Size**: Docker image must stay under 500MB total (Alpine base + dependencies)
- **ROS Compatibility**: Must work with existing ROS nodes on host without modification
- **Connection Protocol**: Must use same Socket.IO WebSocket protocol as cloud for ROS compatibility
- **Data Schema**: Local MongoDB must match cloud schema for seamless sync
- **Network Isolation**: Must function completely offline (no external dependencies after container start)
- **Security**: JWT authentication required for robot connections (same as cloud)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Docker with Alpine base (not Anaconda) | Alpine ~180MB vs Anaconda 2-4GB base; no Python ML libraries needed | ✅ Implemented (Phase 1) |
| ROS on host, connects to container | Avoids ROS/Docker dependency conflicts; existing ROS setup unchanged | — Phase 2 |
| Multi-container (not embedded MongoDB) | Research showed 36% faster reads, easier scaling, production best practice 2025 | ✅ Implemented (Phase 1) |
| Local filesystem for S3 data | Simpler than MinIO; direct file storage with sync to S3 when online | — Phase 4/7 |
| Socket.IO for ROS communication | Reuses existing protocol from cloud mode; no ROS code changes needed | — Phase 5/6 |
| MongoDB 8.0 with WiredTiger cache limits | Prevents OOM killer on edge devices (cacheSizeGB: 0.5) | ✅ Implemented (Phase 1) |
| Redis noeviction policy | Required for BullMQ job queue integrity | ✅ Implemented (Phase 1) |
| Graceful SIGTERM shutdown | Prevents data corruption on container stop (60s grace period) | ✅ Implemented (Phase 1) |

## Current State

**Phase 1 Complete** — Container infrastructure established with zero-data-loss guarantees. Multi-container Docker orchestration (MongoDB 8.0, Redis, Node.js app) running with graceful shutdown handlers, health checks, and production-grade resource configuration.

---
*Last updated: 2026-03-19 after Phase 1 completion*
