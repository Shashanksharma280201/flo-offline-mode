# Project Research Summary

**Project:** flo-offline-mode
**Domain:** Offline-First Robotics Autonomy System with Embedded Database
**Researched:** 2026-03-19
**Confidence:** HIGH

## Executive Summary

Offline-first robotics autonomy systems represent a mature domain with well-established patterns. The recommended approach uses a Docker-containerized Node.js backend with embedded MongoDB, Socket.IO for ROS communication, and a queue-based sync engine with exponential backoff. This architecture enables robots to operate completely autonomous during extended offline periods (days/weeks), then automatically sync accumulated data when connectivity returns.

The core technical challenge is ensuring zero data loss across ungraceful shutdowns, network interruptions, and long offline periods while maintaining schema compatibility between local and cloud systems. Research shows this requires careful container configuration (signal handling, volume management, memory limits), dual-token authentication strategy (short-lived access + long-lived offline tokens), and comprehensive idempotency in sync operations. Edge computing trends in 2026 validate the local-processing approach - Tesla Optimus runs 300M parameter models entirely on-device, proving complex autonomy is viable without cloud dependency.

Critical risks center on Docker container lifecycle management (ungraceful shutdown data corruption), sync engine reliability (duplicate data without idempotency), and resource constraints (MongoDB OOM when cache sizing ignores container limits). These are all preventable with proper initial setup but nearly impossible to retrofit. The key mitigation strategy is building offline-first from day one - never blocking UI on sync completion, implementing proper Docker signal handling, and using named volumes with explicit backup strategies.

## Key Findings

### Recommended Stack

Research strongly converges on an Alpine-based Docker stack with modern Node.js tooling. Node.js 22.13.1-alpine3.23 provides LTS support until April 2027 with native TypeScript capabilities and 36% performance improvements in read workloads. The image size (~150MB) fits well within deployment constraints, and Alpine's musl libc compatibility issues are minimal in 2026 for Node.js workloads.

**Core technologies:**
- **Node.js 22.13.1-alpine3.23**: Runtime base image - Official LTS with native TypeScript support, 36% read performance improvement, 150MB vs 1GB+ standard images
- **MongoDB 8.0.20+ (separate container)**: Primary database - 36% faster reads vs 7.0, must use separate container per Docker best practices, not embedded in app container
- **TypeScript 5.7+**: Type-safe development - Native Node.js 22 support, compile caching API improves startup 60% (122ms to 48ms)
- **Socket.IO 4.8.3**: Real-time ROS bridge - Industry standard for ROS-to-web via rosbridge_suite, handles offline/online transitions automatically
- **BullMQ 5.71.0+ with Redis 7.2-alpine**: Offline sync queue - Redis-backed job queue with offline queue support, requires Redis maxmemory-policy noeviction
- **Mongoose 8.21.1+**: MongoDB ODM - Supports MongoDB 4.0-8.0, active development until Feb 2026, matches cloud stack pattern

**Critical version note:** Research reveals MongoDB must run in a **separate container** from the app, not embedded. This contradicts initial assumptions but aligns with Docker best practices and Kubernetes patterns. The multi-container approach (docker-compose with mongodb, redis, app services) provides better isolation, independent scaling, and data persistence management.

### Expected Features

Feature research identifies clear priorities based on robotics edge computing patterns and offline-first requirements. Table stakes focus on core autonomy without cloud dependency, while differentiators address the unique challenges of extended offline operation.

**Must have (table stakes):**
- **Mission Planning & Execution** - Core autonomy function, reuses cloud patterns, MEDIUM complexity
- **LIDAR Visualization (2D/3D)** - Essential spatial awareness, existing ROSLIB integration, MEDIUM complexity
- **Teleops Control** - Critical safety fallback, Socket.IO WebSocket-based with <250ms latency requirement
- **Local Data Persistence** - Zero data loss core promise, embedded MongoDB + Docker volumes, MEDIUM complexity
- **Data Sync to Cloud (MongoDB + S3)** - Offline data must eventually reach cloud, HIGH complexity but essential
- **Robot Authentication** - JWT authentication reused from cloud stack, LOW complexity
- **Session Data Tracking** - Operational history for debugging/compliance, LOW complexity
- **Robot Status Display** - Real-time connectivity awareness, LOW complexity

**Should have (competitive differentiators):**
- **Automatic Network Detection** - Seamless offline/online transitions, background polling or event-based detection
- **Conflict Resolution (Last-Write-Wins)** - Prevents data corruption during sync, timestamp-based resolution
- **Point Cloud Compression** - RCPCC algorithm achieves 40-80x compression with minimal quality loss, real-time capable
- **Background Sync Worker** - Non-blocking queue-based sync with BullMQ, progress indicators
- **Sync Status Dashboard** - Visibility into pending queue, builds operator confidence
- **Partial/Incremental Sync** - Delta sync reduces bandwidth by 60-80%, important for large datasets

**Defer (v2+):**
- **Multi-Robot Coordination Offline** - Anti-feature: requires complex distributed consensus, scope creep
- **Mobile App Connectivity in Offline Mode** - Anti-feature: adds client-side offline sync complexity
- **Real-time MQTT (AWS IoT) in Offline Mode** - Anti-feature: AWS IoT requires internet, defeats offline-first purpose

**Key insight:** Point Cloud Compression should be elevated from P3 to P2 priority based on research showing 64-line LiDAR generates >100K points/sweep, and RCPCC compression is production-ready (41ms encoding, 11ms decoding on i7).

### Architecture Approach

The standard architecture uses a layered pattern with clear separation: Application Layer (Socket.IO, Express API, Sync Queue Manager), Business Logic Layer (Auth, Mission Controller, Connectivity Detector), Data Access Layer (Repository Pattern), and Persistence Layer (MongoDB, Local Filesystem, Sync Queue Collection). This maps cleanly to Docker multi-container orchestration with named volumes for data persistence.

**Major components:**
1. **Socket.IO Server** - Real-time bidirectional communication with ROS nodes (host) and frontend clients, uses namespaces for robot/client separation, same protocol as cloud mode
2. **Embedded MongoDB (separate container)** - Primary data store with schema matching cloud exactly, uses Mongoose ODM with shared models, configured with explicit cache limits (25-50% of container memory)
3. **Sync Queue Manager with BullMQ** - Tracks operations pending cloud sync using Redis-backed queue, handles retry logic with exponential backoff, dual configuration (enableOfflineQueue: false for API, true for Worker)
4. **Repository Pattern** - Abstracts data access between local and cloud storage, enables consistent schema, writes locally first then queues sync operations non-blocking
5. **Connectivity Detector** - Monitors network availability via cloud health checks, triggers sync activation event-based, informs UI of online/offline state
6. **Local Filesystem Storage** - Temporary storage for large files (LIDAR maps, point clouds) in Docker volume-mapped directories, organized by session/mission ID, syncs to S3 when online

**Critical architectural decision:** The Repository Pattern with offline-first awareness is essential. Every database write goes to local MongoDB immediately (fast, always succeeds), queues a sync operation (non-blocking), and returns success to user instantly. This pattern must be implemented correctly from Phase 1 - retrofitting is nearly impossible.

**Container strategy:** Multi-stage Dockerfile (builder + production) reduces image from 1GB+ to 150-200MB (70-90% reduction). Three separate containers in docker-compose: mongodb (8.0.20), redis (7.2-alpine), app (Node.js Alpine). Named volumes (mongodb_data, redis_data, app_data) ensure data persistence across container updates.

### Critical Pitfalls

Research identifies 10 critical pitfalls with detailed prevention strategies. Top 5 require immediate attention in early phases:

1. **Docker Container Ungraceful Shutdown Causes Data Corruption** - MongoDB embedded in Docker loses data when SIGTERM (10s grace) followed by SIGKILL. Prevention: Use exec form in Dockerfile CMD, install tini for signal handling, configure stop_grace_period 60s, implement SIGTERM handler in Node.js to gracefully close MongoDB connections. **Must address in Phase 1 (Container Setup)** - impossible to retrofit without data loss risk.

2. **Blocking App Until Sync Completes (Offline Mode Unusable)** - Developers implement sync that blocks UI with loading spinner until awaitInitialReplication() resolves. When robot starts offline, app never becomes usable. Prevention: Never await sync before rendering UI, show cached/local data immediately, sync status as non-blocking indicator only. **Must address in Phase 2 (Offline-First Core)** - architectural decision affecting every feature.

3. **Embedded MongoDB Memory Configuration Ignored (OOM Killer)** - MongoDB's WiredTiger cache defaults to 60% of host RAM, ignoring container limits. Linux OOM killer terminates MongoDB mid-mission. Prevention: Explicitly set cacheSizeGB to 25-50% of container memory limit in MongoDB config, configure Docker memory limits with buffer room. **Must address in Phase 1 (Container Setup)** - data loss not recoverable.

4. **Sync Queue Without Idempotency (Duplicate Data on Retry)** - Robot loses connection mid-sync, retries create duplicate missions without idempotency keys. Prevention: Generate deterministic idempotency keys (robotId-sessionId-operationId-timestamp), send in headers, server checks cache before processing, use upsert patterns with natural keys. **Must address in Phase 3 (Sync Engine)** - core infrastructure requirement.

5. **Socket.IO Reconnection Exhaustion (Silent Failure)** - Default reconnection config (10-20 retries over ~3 min) exhausts during extended offline (24+ hours), silently gives up. Prevention: Configure reconnectionAttempts: Infinity, implement exponential backoff with jitter, add independent heartbeat monitoring, handle rosbridge known issues (hangs under load, network interface changes). **Must address in Phase 2 (Offline-First Core)** - connection reliability foundational.

**Additional critical pitfalls:**
- **JWT Token Expiration Breaks Offline Mode** - Short-lived tokens expire during offline periods, sync fails with 401. Use dual-token strategy (1h access + 30-90 day offline token).
- **LIDAR Point Cloud File Sync Overwhelms Network** - 5-50GB daily data saturates bandwidth. Implement tiered priority queue (HIGH: mission updates, LOW: large LIDAR), compress to LAZ format (80-90% reduction), throttle bandwidth.
- **Schema Mismatch Between Local and Cloud** - Schema updates break sync bidirectionally. Implement schema versioning in every document, backwards-compatible migrations, optional fields for new additions.

## Implications for Roadmap

Based on research, suggested phase structure follows the dependency graph from architecture research with pitfall prevention as primary driver:

### Phase 1: Container Infrastructure & Data Foundation
**Rationale:** Everything depends on container running successfully with zero data loss guarantee. All three most critical pitfalls (ungraceful shutdown, MongoDB OOM, volume misconfiguration) must be addressed in foundational setup. Can't test other components without working runtime environment.

**Delivers:**
- Multi-stage Dockerfile (Alpine + Node.js 22 + MongoDB 8.0 separate container)
- Docker Compose with mongodb, redis, app services
- Named volume configuration (mongodb_data, redis_data, app_data)
- Graceful shutdown handling (tini, SIGTERM handlers, stop_grace_period 60s)
- MongoDB cache size configuration (25-50% of container memory limit)
- Basic Express server with health check endpoint
- MongoDB connection with retry logic
- Environment variable management

**Avoids:**
- Pitfall #1 (ungraceful shutdown data corruption)
- Pitfall #3 (MongoDB OOM killer)
- Pitfall #10 (Docker volume data loss on update)

**Stack elements:** Node.js 22.13.1-alpine3.23, MongoDB 8.0.20+ (separate container), Redis 7.2-alpine, Docker Compose, TypeScript 5.7+

**Research flag:** Standard patterns - well-documented Docker multi-container setup, skip phase-specific research

### Phase 2: Authentication & Offline-First Core
**Rationale:** Authentication blocks all API endpoints and Socket.IO connections. Offline-first architecture must be established before building features - "never block on sync" is architectural decision affecting every subsequent component. Addresses critical pitfalls #2, #5, #6 which are impossible to retrofit.

**Delivers:**
- JWT authentication middleware (dual-token strategy: 1h access + 90 day offline)
- Robot authentication endpoint with device credentials
- Token validation in Socket.IO handshake
- Socket.IO server with unlimited reconnection (reconnectionAttempts: Infinity)
- Exponential backoff with jitter for reconnection
- Independent heartbeat monitoring
- Connectivity detection service (network health checks)
- Offline-first UI patterns (show local data immediately, non-blocking sync status)

**Avoids:**
- Pitfall #2 (blocking app until sync completes)
- Pitfall #5 (Socket.IO reconnection exhaustion)
- Pitfall #6 (JWT token expiration offline)

**Features addressed:** Robot Authentication, Robot Status Display (online/offline awareness)

**Research flag:** Needs research for dual-token implementation patterns - limited documentation on offline-first JWT strategies

### Phase 3: Data Layer with Repository Pattern
**Rationale:** Repository pattern must be established before business logic. Provides abstraction enabling local-first writes with automatic sync queueing. All controllers and sync logic depend on data access layer.

**Delivers:**
- Mongoose models matching cloud schema exactly (Robot, Mission, Session, SyncOperation)
- Schema versioning in every document (schemaVersion field)
- BaseRepository with CRUD operations (create writes local + queues sync)
- Entity-specific repositories (MissionRepository, SessionRepository)
- Backwards-compatible migration logic
- Database initialization scripts

**Avoids:**
- Pitfall #8 (schema mismatch between local and cloud)

**Architecture component:** Repository Pattern, Schema Version Parity

**Research flag:** Standard patterns - Mongoose + MongoDB well-documented, skip research

### Phase 4: Sync Engine with Idempotency & Conflict Resolution
**Rationale:** Critical for zero data loss requirement. Must implement idempotency from day one - retrofitting is nearly impossible. Conflict resolution strategy must be defined before sync implementation. High complexity justifies dedicated phase.

**Delivers:**
- BullMQ queue configuration (enableOfflineQueue: false for API, true for Worker)
- SyncOperation model and repository (tracks pending operations with status)
- Sync worker with exponential backoff retry logic
- Idempotency key generation (robotId-sessionId-operationId-timestamp)
- Idempotency validation on server (24h cache in Redis)
- Conflict resolution (Last-Write-Wins with timestamps for metadata, local wins for telemetry)
- Cloud API client with authentication
- Dead letter queue for max retry exceeded
- Background job scheduler (cron or BullMQ repeatable jobs)

**Avoids:**
- Pitfall #4 (sync without idempotency duplicates data)
- Pitfall #9 (undefined conflict resolution loses data)

**Features addressed:** Data Sync to Cloud (MongoDB), Conflict Resolution, Automatic Network Detection

**Stack elements:** BullMQ 5.71.0+, Redis 7.2-alpine, ioredis 5.4.1+

**Research flag:** Needs research for conflict resolution edge cases and CRDT patterns if Last-Write-Wins proves insufficient

### Phase 5: Core Controllers & REST API
**Rationale:** Provides business logic for frontend. Independent of Socket.IO real-time (Phase 6) and file sync (Phase 7), enables parallel development. Reuses cloud backend controllers with AWS IoT dependencies removed.

**Delivers:**
- Mission controller (create, update, list, execute) ported from cloud
- Robot controller (status, configuration)
- Session controller (start, stop, data recording)
- Express routes for REST API
- Error handling middleware
- Offline guard middleware (blocks cloud-only operations)

**Features addressed:** Mission Planning & Execution, Session Data Tracking

**Architecture component:** Mission Controller, API Endpoints

**Research flag:** Standard patterns - Express + controller architecture well-established, skip research

### Phase 6: Socket.IO Real-Time & ROS Integration
**Rationale:** Real-time features are value-add but not blocking for basic functionality. Requires authentication (Phase 2) and controllers (Phase 5) to be functional. ROS integration via rosbridge is well-documented pattern.

**Delivers:**
- Socket.IO namespaces (/v1/robot/master, /v1/client)
- Master listener for ROS communication (rosbridge protocol)
- Client listener for frontend dashboard
- Event emitters for real-time updates (mission status, robot telemetry)
- Room management for per-robot data streams
- rosbridge watchdog (handles known hanging issues)
- QoS profile configuration (ROS2 compatibility)

**Features addressed:** Teleops Control, LIDAR Visualization (real-time streaming), Robot Status Display (real-time updates)

**Stack elements:** Socket.IO 4.8.3, ws 8.16.0+, ROSLIB.js (frontend)

**Research flag:** Standard patterns - rosbridge_suite well-documented, Socket.IO established, skip research

### Phase 7: File Storage & S3 Sync with Compression
**Rationale:** Depends on sync queue (Phase 4) to handle S3 uploads. Not blocking for MVP if using simplified file handling initially. Addresses pitfall #7 which becomes critical at scale but manageable in early deployment.

**Delivers:**
- Local filesystem storage service (organized by session/mission ID)
- Multer middleware for file uploads
- File upload endpoints (LIDAR maps, point clouds)
- File reference tracking in session model
- S3 upload integration in sync worker with multipart upload
- Chunked upload with resume capability (track uploaded chunks)
- Point cloud compression (LAZ format, 80-90% reduction)
- Tiered sync priority queue (HIGH: metadata, LOW: large files)
- Bandwidth throttling for large files (1MB/s configurable limit)
- Automatic cleanup of synced files (configurable retention)

**Avoids:**
- Pitfall #7 (LIDAR file sync overwhelms network)

**Features addressed:** Data Sync to Cloud (S3), Point Cloud Compression, Partial/Incremental Sync

**Stack elements:** @aws-sdk/client-s3 3.388.0+, multer, LAZ compression library

**Research flag:** Needs research for LAZ compression libraries in Node.js ecosystem and multipart upload resume patterns

### Phase 8: Monitoring, Logging & Production Hardening
**Rationale:** Nice-to-have for production, but not blocking for core functionality. Can be added iteratively as issues arise during deployment. Provides operational visibility and debugging capabilities.

**Delivers:**
- Winston logger configuration with structured logging
- Log rotation and retention policy
- Sync operation logging (queue depth, retry counts, failures)
- Metrics endpoint (sync queue depth, disk usage, memory usage)
- Docker health check verification
- Volume backup automation scripts
- Alert system for critical errors (optional)
- Performance monitoring (sync duration, file upload speeds)

**Features addressed:** Sync Status Dashboard

**Research flag:** Standard patterns - Winston + monitoring well-established, skip research

### Phase Ordering Rationale

**Critical path (blocking dependencies):** Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 7
This represents the longest dependency chain for core offline-first functionality with zero data loss.

**Parallel work opportunities:**
- Phase 5 (Controllers) and Phase 4 (Sync Engine) can be built simultaneously after Phase 3 completes
- Phase 6 (Socket.IO) and Phase 4 (Sync Engine) are independent once Phase 2/3 complete
- Phase 8 (Monitoring) can be built anytime after Phase 1

**Pitfall-driven ordering:**
- Phases 1-2 must come first to address architectural pitfalls that are impossible to retrofit
- Phase 3 establishes data patterns before any features are built
- Phase 4 must complete before Phase 7 (file sync depends on sync engine)

**Feature dependency insights:**
- Mission Planning requires Robot Authentication (Phase 2), Local Data Persistence (Phase 3)
- LIDAR Visualization requires Local Data Persistence (Phase 3), real-time streaming (Phase 6)
- Data Sync requires Local Persistence (Phase 3), Automatic Network Detection (Phase 4)
- Conflict Resolution requires Data Sync (Phase 4), must be designed before implementation

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (Authentication):** Dual-token JWT strategy for offline-first - limited documentation, may need custom implementation patterns
- **Phase 4 (Sync Engine):** Advanced conflict resolution beyond Last-Write-Wins - CRDT patterns for operational transformation if needed
- **Phase 7 (File Storage):** LAZ compression library compatibility with Node.js 22, multipart upload resume patterns

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Container):** Docker multi-container with compose - well-documented official patterns
- **Phase 3 (Data Layer):** Mongoose + MongoDB - established ORM patterns
- **Phase 5 (Controllers):** Express REST API - standard web framework patterns
- **Phase 6 (Socket.IO):** rosbridge_suite - mature ROS integration
- **Phase 8 (Monitoring):** Winston logging - standard Node.js observability

**Overall assessment:** 3 of 8 phases need targeted research (38%), rest can use established patterns. This is favorable ratio indicating well-trodden domain with good documentation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All core technologies have official Docker images, LTS support, and verified performance benchmarks. MongoDB 8.0 vs 7.0 improvements measured at 36% read performance. Alpine image sizes confirmed at 150MB. Only minor concern is Alpine's removal of MongoDB from repos (requires manual binary install), but workaround well-documented. |
| Features | MEDIUM | Table stakes features align with industry standard robotics platforms (mission planning, LIDAR viz, teleops). Differentiators validated by recent research (RCPCC compression ICRA 2025, LWW conflict resolution standard). Uncertainty around exact compression ratios in production and conflict frequency in multi-operator scenarios. MVP definition solid but v1.x prioritization may shift based on early user feedback. |
| Architecture | HIGH | Repository pattern, sync queue with exponential backoff, and Last-Write-Wins are established offline-first patterns with extensive documentation. Docker multi-container approach validated by MongoDB Kubernetes patterns and official best practices. ROS integration via rosbridge_suite has 8+ years production history. Main concern is rosbridge known issues (hanging under load) but workarounds documented. |
| Pitfalls | HIGH | All 10 critical pitfalls sourced from combination of official documentation (Docker, MongoDB), production issue reports (rosbridge GitHub issues, Socket.IO bugs), and domain expert blogs (2025-2026 articles). Docker ungraceful shutdown and MongoDB OOM patterns confirmed across multiple sources. Confidence in prevention strategies validated by recovery cost assessment (CRITICAL to MEDIUM costs when addressed proactively). |

**Overall confidence:** HIGH

Research benefited from:
- Official documentation for all core technologies (Node.js, MongoDB, Docker, Socket.IO)
- Recent 2025-2026 articles on offline-first patterns and edge computing trends
- Production issue reports from existing ROS/robotics deployments
- Academic research (ICRA 2025 for compression, multiple surveys on edge robotics)
- Access to cloud system codebase (CONCERNS.md provided real-world pitfall examples)

### Gaps to Address

Despite high overall confidence, several areas require validation during implementation:

- **LAZ compression in Node.js ecosystem** - RCPCC algorithm benchmarks are from C++ implementation. Need to verify Node.js binding performance or identify pure-JS alternative with acceptable compression ratios. May need to defer Point Cloud Compression to Phase 8 if bindings unavailable.

- **MongoDB binary installation on Alpine** - Alpine removed MongoDB from official repos due to SSPL licensing. Multi-stage build with official MongoDB tarballs is documented workaround, but adds complexity to Dockerfile. Consider Debian-slim base if Alpine proves problematic (trades 150MB for 200MB image but gains apt ecosystem).

- **Conflict resolution frequency in production** - Last-Write-Wins assumes conflicts are rare (single robot, single operator majority of time). Need validation during early deployment. If multi-operator editing becomes common, may need Phase 4.5 to implement operational transformation or CRDT for specific data types.

- **rosbridge stability at scale** - Known issues with hanging under load and network interface changes are documented, but workarounds are service-specific. May need dedicated testing phase or consider alternative ROS-web bridge (roslibrust, rosbridge2 alternatives) if issues prove intractable.

- **Dual-token JWT implementation** - Pattern exists in OAuth2 (access + refresh tokens) but adapting for offline-first robotics (90-day offline token with grace period) is less documented. May need security review to ensure token storage and rotation meets best practices without compromising offline capability.

**Mitigation strategy:** Flag these as "validation needed" during phase planning. Allocate buffer time in relevant phases (Phase 2 for JWT, Phase 4 for conflict resolution, Phase 7 for compression). Consider spike tasks to de-risk before committing to phase implementation.

## Sources

### Primary Sources (HIGH confidence)

**Official Documentation & Docker Hub:**
- Node.js Docker Hub (https://hub.docker.com/_/node) - node:22.13.1-alpine3.23 verified 150MB, LTS until April 2027
- MongoDB Docker Hub (https://hub.docker.com/_/mongo) - mongo:8.0.20 performance benchmarks, 36% read improvement
- BullMQ Official Docs (https://docs.bullmq.io/patterns/failing-fast-when-redis-is-down) - enableOfflineQueue pattern
- Socket.IO Official Docs (https://socket.io/docs/v3/client-offline-behavior/) - reconnection behavior
- MongoDB Production Notes (https://www.mongodb.com/docs/manual/administration/production-notes/) - cache sizing, memory limits
- Docker Official Documentation (2026) - volume management, multi-stage builds, signal handling

**Academic Research:**
- Real-Time LiDAR Point Cloud Compression (ArXiv 2502.06123, ICRA 2025) - RCPCC algorithm 40-80x compression, 41ms encoding
- Network Latency in Teleoperation (PMC, 2024) - <250ms latency requirement for effective operation
- Edge Computing in Robotics: A Survey (MDPI 2025) - edge processing trends, Tesla Optimus on-device models

**ROS Ecosystem:**
- warehouse_ros GitHub (moveit/warehouse_ros) - MongoDB with ROS official package
- rosbridge_suite Issues (GitHub #425) - known hanging issues under load, network change handling

### Secondary Sources (MEDIUM confidence)

**Technical Blogs & Industry Analysis (2025-2026):**
- "Robotics Trends 2026: What's Hot" (RoboCloud Hub) - edge computing adoption, local processing validation
- "Offline-First Done Right: Sync Patterns" (DevelopersVoice, 2025) - Last-Write-Wins, queue-based backoff
- "Docker Graceful Shutdown" (OneUptime blog, 2026-01-16) - SIGTERM handling, tini usage
- "Docker Volume Management Best Practices" (DevOps Training Institute, 2025) - named volumes, lifecycle
- "Docker Compose Service Dependencies" (BetterLink, 2025-12-17) - healthchecks, startup order

**Offline-First Patterns:**
- RxDB: Downsides of Offline First (https://rxdb.info/downsides-of-offline-first.html) - blocking on sync anti-pattern
- Building an offline realtime sync engine (GitHub Gist pesterhazy) - idempotency, conflict resolution patterns
- Offline-first frontend apps 2025 (LogRocket, 2025-01-15) - IndexedDB patterns (browser-focused but principles apply)

**Security & Authentication:**
- JWT Token Lifecycle Management (SkyCloak.io) - refresh token patterns
- Better Session Management (1Password/Passage) - dual-token strategies

### Tertiary Sources (LOW confidence, needs validation)

- "5 critical components for offline-first strategy" (Medium, Jan 2026) - general principles, not domain-specific
- "Top 10 robot fleet management software 2026" (Standard Bots) - competitor analysis, feature expectations
- Alpine musl libc compatibility (Docker docs) - mentioned as potential issue but no 2026 Node.js 22 reports found

**Internal Sources:**
- `.planning/codebase/CONCERNS.md` - actual production issues from cloud system (Socket.IO reconnection, rosbridge stability, JWT expiration)

---
*Research completed: 2026-03-19*
*Ready for roadmap: yes*
