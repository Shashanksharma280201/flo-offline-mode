---
phase: 01-container-infrastructure-data-foundation
plan: 03
subsystem: container-infrastructure
tags: [mongodb, redis, configuration, memory-management, OOM-prevention]
dependency_graph:
  requires: [docker-compose.yml, docker/mongod.conf placeholder]
  provides: [mongodb-wiredtiger-config, redis-noeviction-config, resource-monitoring-docs]
  affects: [mongodb-service, redis-service]
tech_stack:
  added: []
  patterns: [WiredTiger cache sizing, Redis noeviction policy, TTL index documentation]
key_files:
  created:
    - docker/redis.conf
    - docker/CONTAINER_RESOURCES.md
  modified:
    - docker/mongod.conf
decisions:
  - "MongoDB WiredTiger cache set to 0.5GB (50% of available memory, not total container memory)"
  - "Redis maxmemory-policy: noeviction to prevent BullMQ job queue corruption"
  - "Redis maxmemory: 256mb conservative limit for edge device job queue metadata"
  - "AOF persistence enabled for Redis job queue durability across container restarts"
metrics:
  duration_minutes: 6
  tasks_completed: 3
  files_created: 2
  files_modified: 1
  commits: 2
  deviations: 1
  completed_date: 2026-03-19
---

# Phase 01 Plan 03: MongoDB and Redis Memory Configuration Summary

**One-liner:** MongoDB WiredTiger cache configured to 0.5GB and Redis maxmemory-policy set to noeviction to prevent OOM killer and BullMQ job loss on edge devices.

## What Was Built

This plan configured critical memory management settings for MongoDB and Redis to prevent data loss in offline-first edge device deployments:

1. **MongoDB WiredTiger Cache Configuration** - Set explicit cacheSizeGB to 0.5 (512MB) to prevent OOM killer termination. MongoDB defaults to 60% of host RAM, ignoring container cgroups limits, which causes termination on resource-constrained edge devices.

2. **Redis noeviction Policy** - Created redis.conf with maxmemory-policy: noeviction to prevent BullMQ job queue corruption. Default eviction policies (volatile-lru, allkeys-lru) silently drop job keys under memory pressure, causing sync failures.

3. **Resource Monitoring Documentation** - Documented cache calculation rationale, production resource limits, monitoring commands, and warning signs for OOM/eviction issues.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Created missing docker/ directory**
- **Found during:** Task 1 execution
- **Issue:** docker/ directory didn't exist, blocking file creation
- **Fix:** Created directory with `mkdir -p docker/`
- **Files modified:** N/A
- **Commit:** Not committed separately (directory created as part of task flow)

**Note on Task 1:** The mongod.conf file was already fully configured in Plan 01-01 (commit fe8714d). No changes were needed for Task 1, so no commit was created. The file verification confirmed it already contained the required WiredTiger cache settings.

## Tasks Completed

### Task 1: Configure MongoDB WiredTiger cache size to prevent OOM killer
- **Status:** Verified (already configured in Plan 01-01)
- **Files:** docker/mongod.conf
- **Verification:** Confirmed cacheSizeGB: 0.5 and authorization: enabled
- **Commit:** N/A (no changes needed)

### Task 2: Create Redis configuration file with noeviction policy
- **Status:** Complete
- **Files:** docker/redis.conf (created)
- **Key changes:**
  - maxmemory-policy: noeviction (BullMQ requirement)
  - maxmemory: 256mb (conservative edge device limit)
  - appendonly: yes (AOF for job queue durability)
  - RDB snapshots configured for point-in-time backups
- **Verification:** Confirmed maxmemory-policy noeviction and appendonly yes
- **Commit:** 9c10bea

### Task 3: Document container resource limits and monitoring strategy
- **Status:** Complete
- **Files:** docker/CONTAINER_RESOURCES.md (created)
- **Key changes:**
  - MongoDB WiredTiger cache calculation documented (0.5GB for 2GB container)
  - Redis memory limit rationale (256MB for job queue metadata)
  - Recommended production resource limits (3.5GB RAM, 3.5 CPUs)
  - Monitoring commands for docker stats and config verification
  - Warning signs for OOM killer and Redis key eviction
- **Verification:** File exists with required content
- **Commit:** b98d0f6

## Configuration Details

### MongoDB WiredTiger Cache Calculation

**Formula:**
```
Container Memory Limit: 2GB
- MongoDB overhead: 500MB (server processes, connections, buffers)
- OS/other containers: 500MB
= Available for cache: 1GB
Set cacheSizeGB: 0.5 (50% of available, NOT total container memory)
```

**Why critical:** MongoDB defaults to `max(60% of host RAM - 1GB, 256MB)` based on HOST memory, not container limits. On a 64GB host with 2GB container limit, MongoDB would try to allocate 37GB and be killed by OOM killer.

### Redis Memory Configuration

**Settings:**
- maxmemory: 256mb
- maxmemory-policy: noeviction

**Rationale:**
- BullMQ job queue metadata is small (mission records, sync status)
- 256MB provides headroom for thousands of queued operations
- noeviction prevents key loss under memory pressure (Redis returns errors instead of evicting)
- BullMQ can handle errors but cannot recover from evicted keys

### TTL Index Pattern

TTL indexes for auto-expiring sensor data are a MongoDB feature, not a config file setting. Documented for Phase 3 implementation:

```typescript
// Example: SensorReadingSchema (Phase 3)
const SensorReadingSchema = new Schema({
  robotId: { type: String, required: true },
  sensorData: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now }
});

// TTL index: auto-delete documents older than 3600 seconds (1 hour)
SensorReadingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });
```

## Integration with Docker Compose

**MongoDB service** (from Plan 01-01):
- Mounts docker/mongod.conf to /etc/mongo/mongod.conf:ro
- Uses `command: --config /etc/mongo/mongod.conf`
- Has stop_grace_period: 60s for graceful shutdown

**Redis service** (from Plan 01-01):
- Currently uses command-line args: `redis-server --maxmemory 256mb --maxmemory-policy noeviction`
- docker/redis.conf created for future use if command becomes too long
- To use config file: mount as volume and change command to `redis-server /etc/redis/redis.conf`

## Verification

All plan verification checks passed:

1. ✅ MongoDB config has cacheSizeGB: 0.5
2. ✅ Redis config has maxmemory-policy: noeviction
3. ✅ CONTAINER_RESOURCES.md documentation exists

**Integration tests (planned for after Plan 04):**
- Start containers: `docker-compose up -d`
- Check MongoDB cache: `docker exec flo-offline-mongodb mongosh --eval "db.serverStatus().wiredTiger.cache"`
- Check Redis policy: `docker exec flo-offline-redis redis-cli CONFIG GET maxmemory-policy`

## Production Deployment Recommendations

### Recommended Resource Limits (docker-compose.yml)

```yaml
services:
  mongodb:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2.0'

  redis:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  app:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
```

**Total:** 3.5GB RAM, 3.5 CPUs max
**Minimum device:** 4GB RAM, 4 CPU cores recommended

### Monitoring Commands

**Check memory usage:**
```bash
docker stats
docker stats flo-offline-mongodb --no-stream --format "table {{.Container}}\t{{.MemUsage}}\t{{.MemPerc}}"
```

**Verify configuration applied:**
```bash
# MongoDB cache size (should show 0.5GB = 536870912 bytes)
docker exec flo-offline-mongodb mongosh --eval "db.serverStatus().wiredTiger.cache['maximum bytes configured']"

# Redis eviction policy (should show noeviction)
docker exec flo-offline-redis redis-cli CONFIG GET maxmemory-policy
```

### Warning Signs

**MongoDB OOM:**
- Exit code 137 in `docker ps -a`
- "Out of memory: Killed process" in `dmesg`
- MongoDB log shows cache size > container memory

**Redis Key Eviction:**
- `docker exec flo-offline-redis redis-cli INFO stats | grep evicted_keys` shows > 0
- BullMQ jobs disappearing from queue
- Sync operations failing silently

## Self-Check

Verifying all claims from this summary:

**Created files:**
- ✅ /home/shanks/Music/flo_web_app/docker/redis.conf
- ✅ /home/shanks/Music/flo_web_app/docker/CONTAINER_RESOURCES.md

**Modified files:**
- ✅ /home/shanks/Music/flo_web_app/docker/mongod.conf (already configured in Plan 01-01)

**Commits:**
- ✅ 9c10bea: feat(01-03): create Redis configuration with noeviction policy
- ✅ b98d0f6: docs(01-03): document container resource configuration and monitoring

**Configuration verification:**
- ✅ mongod.conf contains cacheSizeGB: 0.5
- ✅ mongod.conf contains authorization: enabled
- ✅ redis.conf contains maxmemory-policy noeviction
- ✅ redis.conf contains appendonly yes

## Self-Check: PASSED

All files exist, all commits verified, all configuration settings confirmed.
