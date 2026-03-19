# Container Resource Configuration

**Last Updated:** 2026-03-19
**Phase:** 1 - Container Infrastructure

## Resource Limits

### Current Configuration (No Explicit Limits)

The docker-compose.yml currently does NOT set memory limits on containers. This is intentional for Phase 1 to allow flexibility during development and testing.

### MongoDB WiredTiger Cache Calculation

**Setting:** cacheSizeGB: 0.5 (in docker/mongod.conf)

**Rationale:**
- Typical edge device: 2-4GB total RAM
- Assumed container limit (future): 2GB
- MongoDB overhead: ~500MB (server processes, connections, internal buffers)
- OS + other containers: ~500MB
- Available for WiredTiger cache: ~1GB
- Safe cache size: 0.5GB (50% of available to prevent OOM killer)

**Why this matters:**
MongoDB WiredTiger defaults to `max(60% of host RAM - 1GB, 256MB)` based on HOST memory, ignoring container cgroups. On a 64GB host with 2GB container limit, MongoDB would try to allocate 37GB and be killed by OOM killer.

### Redis Memory Limit

**Setting:** maxmemory 256mb (in docker/redis.conf)

**Rationale:**
- BullMQ job queue metadata is small (mission records, sync status)
- 256MB provides headroom for thousands of queued operations
- maxmemory-policy: noeviction prevents key loss under memory pressure

### Recommended Production Limits

When deploying to production edge devices, add these limits to docker-compose.yml:

```yaml
services:
  mongodb:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2.0'
        reservations:
          memory: 1G
          cpus: '1.0'

  redis:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'

  app:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'
```

**Total:** 3.5GB RAM, 3.5 CPUs max
**Minimum device:** 4GB RAM, 4 CPU cores recommended

## Monitoring Commands

### Check Current Resource Usage

```bash
# Real-time stats for all containers
docker stats

# Memory usage for MongoDB
docker stats flo-offline-mongodb --no-stream --format "table {{.Container}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Check if MongoDB is respecting cache limit
docker exec flo-offline-mongodb mongosh --eval "db.serverStatus().wiredTiger.cache"
```

### Verify Configuration Applied

```bash
# MongoDB cache size (should show cacheSizeGB: 0.5)
docker exec flo-offline-mongodb mongosh --eval "db.serverStatus().wiredTiger.cache.maximum bytes configured"

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

## Maintenance

**After changing cacheSizeGB:**
Restart MongoDB container to apply: `docker-compose restart mongodb`

**After changing maxmemory:**
Apply without restart: `docker exec flo-offline-redis redis-cli CONFIG SET maxmemory 256mb`

---

*Configuration documented: 2026-03-19*
*Review before production deployment*
