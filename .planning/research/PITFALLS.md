# Pitfalls Research

**Domain:** Offline-first robotics autonomy system with Docker, embedded MongoDB, and sync
**Researched:** 2026-03-19
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Docker Container Ungraceful Shutdown Causes Data Corruption

**What goes wrong:**
MongoDB embedded in Docker loses data or corrupts databases when the container is forcibly killed. Docker sends SIGTERM with a 10-second grace period, then SIGKILL. If MongoDB hasn't flushed writes to disk, data is lost. This is especially critical in robotics where sudden power loss or system crashes are common.

**Why it happens:**
- Developers use shell form in Dockerfile CMD/ENTRYPOINT, which doesn't forward signals to MongoDB process
- Default 10-second timeout insufficient for MongoDB to flush buffers during mission execution
- PID 1 in containers has special signal handling behavior that many don't account for
- Docker Desktop/Mac/Windows shuts down without notifying containers during upgrades or manual exits

**How to avoid:**
1. Use exec form in Dockerfile: `CMD ["node", "server.js"]` not `CMD node server.js`
2. Install and use `tini` as init system to properly handle signals to child processes
3. Configure `stop_grace_period: 60s` in docker-compose.yml for MongoDB flush time
4. Implement SIGTERM handler in Node.js to gracefully close MongoDB connections:
```javascript
process.on('SIGTERM', async () => {
  await mongoose.connection.close(false);
  process.exit(0);
});
```
5. Use MongoDB `--shutdown` with proper journal configuration
6. Set Docker volume with `sync` mount option for critical data

**Warning signs:**
- Exit code 137 in logs (SIGKILL)
- MongoDB "unexpected shutdown" messages on restart
- Lost mission data from last 10-60 seconds before shutdown
- Corrupted `WiredTiger.wt` files requiring repair
- Robot status showing "Online" but no session data persisted

**Phase to address:**
Phase 1 (Container Setup) - Must be correct from start, impossible to retrofit without data loss risk

---

### Pitfall 2: Blocking App Until Sync Completes (Offline Mode Unusable)

**What goes wrong:**
Developers implement sync logic that blocks the UI with a loading spinner until `awaitInitialReplication()` resolves. When the robot starts offline (the primary use case), the app never becomes usable because sync never resolves, defeating the entire purpose of offline-first architecture.

**Why it happens:**
- Coming from cloud-first mindset where "load data then show UI" is standard pattern
- Misunderstanding eventual consistency - treating offline mode as exception rather than default
- Not testing actual offline scenarios during development (always online in dev)
- Attempting to apply traditional request/response patterns to sync engines

**How to avoid:**
1. Never await sync completion before rendering UI
2. Show cached/local data immediately, sync status as non-blocking indicator
3. Implement optimistic UI updates that work before sync confirmation
4. Use sync state for informational badges only: "Syncing...", "Synced 5 min ago", "Offline mode"
5. Design UX assuming offline is normal: "Your changes will sync when connected"
6. Write integration tests that run offline-only

**Warning signs:**
- `awaitInitialReplication()` or similar called before app mount
- Loading spinner on app start that never resolves when WiFi is off
- User reports "app won't start without internet"
- Sync state used in conditional rendering: `if (!synced) return <Loading />`
- No local data visible until first successful cloud connection

**Phase to address:**
Phase 2 (Offline-First Core) - Architectural decision that affects every feature built afterward

---

### Pitfall 3: Embedded MongoDB Memory Configuration Ignored (OOM Killer)

**What goes wrong:**
MongoDB running in a Docker container with memory limits (e.g., 2GB) ignores container boundaries and tries to use all system RAM. The Linux OOM killer then terminates MongoDB mid-mission, causing complete data loss for in-flight operations. Robot operators see "Error: Connection refused" with no warning.

**Why it happens:**
- MongoDB's WiredTiger cache defaults to `max(60% of RAM - 1GB, 256MB)` based on *host* RAM, not container limit
- Container memory limits (cgroups) don't automatically configure MongoDB's internal cache
- Alpine-based images have smaller memory footprint but MongoDB still calculates cache from host
- Developers test on machines with 16GB+ RAM, never hitting limits until production deployment on resource-constrained edge devices

**How to avoid:**
1. Explicitly set MongoDB cache size when running in containers:
```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 0.5  # Set to 25-50% of container memory limit
```
2. Configure Docker memory limits with buffer room:
```yaml
deploy:
  resources:
    limits:
      memory: 2G  # If MongoDB cache = 0.5GB, total needs ~1.5GB minimum
```
3. Set MongoDB `oom_score_adj` to -500 (less likely to be killed than other processes)
4. Monitor memory usage: `docker stats` should show stable memory consumption
5. Test with stress scenarios: large LIDAR maps + multiple missions + long sessions
6. Use MongoDB's `--verbose` logging to see actual cache allocation on startup

**Warning signs:**
- Container memory usage steadily climbing to limit
- Exit code 137 (OOM killed) in Docker logs
- MongoDB log shows cache size equal to or greater than container memory limit
- `dmesg` shows "Out of memory: Killed process [PID] (mongod)"
- Intermittent connection drops during high memory operations (LIDAR map loading)

**Phase to address:**
Phase 1 (Container Setup) - Must configure before adding data-heavy features

---

### Pitfall 4: Sync Queue Without Idempotency (Duplicate Data on Retry)

**What goes wrong:**
Robot loses connection mid-sync, reconnects, and retries failed operations. Without idempotency, this creates duplicate missions in cloud database, duplicate S3 uploads, and inconsistent state. Operators see "Mission X" listed twice with different IDs, breaking data integrity.

**Why it happens:**
- Implementing "dumb retry" - just re-execute failed requests without tracking completion
- Using timestamps or auto-increment IDs instead of deterministic identifiers
- No idempotency keys for POST requests
- Not checking if operation already succeeded before retrying
- Treating network timeout as failure when server actually processed the request

**How to avoid:**
1. Generate deterministic idempotency keys: `${robotId}-${sessionId}-${operationId}-${timestamp}`
2. Send idempotency key in headers: `Idempotency-Key: robot-123-session-456-mission-create-1234567890`
3. Server checks idempotency key cache (Redis TTL 24h) before processing
4. Return cached response for duplicate requests (201 Created with same mission ID)
5. Use upsert patterns with natural keys: `{robotId, sessionId}` not auto-increment IDs
6. Implement sync queue with status tracking:
```javascript
{
  id: 'uuid',
  operation: 'createMission',
  payload: {...},
  status: 'pending', // pending | in_progress | completed | failed
  idempotencyKey: 'robot-123-...',
  attempts: 0,
  maxAttempts: 5,
  lastAttempt: null
}
```
7. Mark operations completed only after receiving 2xx response + verification
8. Use dead letter queue for operations exceeding max retry attempts

**Warning signs:**
- Duplicate entries in cloud database after network interruptions
- Multiple S3 uploads of the same LIDAR map with different filenames
- Sync queue shows operations retrying indefinitely
- Cloud database has orphaned records with no corresponding local data
- Operators report "I only created one mission but see two in the dashboard"

**Phase to address:**
Phase 3 (Sync Engine) - Core sync infrastructure must have this from day one

---

### Pitfall 5: Socket.IO Reconnection Exhaustion (Silent Failure)

**What goes wrong:**
Robot goes offline for extended period (24+ hours in remote location). Socket.IO exhausts its reconnection attempts (default: 10-20 retries over ~3 minutes) and silently gives up. When internet returns, the robot never reconnects unless operator manually restarts container. No alerts, no automatic recovery - just silent offline mode forever.

**Why it happens:**
- Socket.IO's default reconnection config assumes brief network blips, not sustained offline operation
- After `reconnectionAttempts` limit reached, Socket.IO stops trying with no event emitted
- Developers test brief disconnections (WiFi toggle) but not multi-hour/day offline periods
- No monitoring for "should be online but isn't" state
- RobotWebTools/rosbridge has known issues: hangs under load, crashes on network switches, silent QoS failures

**How to avoid:**
1. Configure unlimited reconnection attempts for offline-first scenarios:
```javascript
const socket = io(url, {
  reconnection: true,
  reconnectionAttempts: Infinity,  // Never give up
  reconnectionDelay: 1000,         // Start at 1s
  reconnectionDelayMax: 60000,     // Max 60s between attempts
  timeout: 20000
});
```
2. Implement exponential backoff with jitter to prevent thundering herd:
```javascript
reconnectionDelay: Math.min(1000 * Math.pow(2, attempts) + Math.random() * 1000, 60000)
```
3. Add heartbeat monitoring independent of Socket.IO:
```javascript
setInterval(async () => {
  if (!socket.connected && navigator.onLine) {
    logger.warn('Socket disconnected but network available - forcing reconnect');
    socket.connect();
  }
}, 30000);
```
4. Listen for reconnection lifecycle events and log/alert:
```javascript
socket.on('reconnect_failed', () => {
  // This should never happen with Infinity attempts, but log anyway
  logger.error('Socket reconnection failed - investigate immediately');
});
```
5. For rosbridge: implement watchdog that restarts rosbridge_server if websocket hangs (known issue after 30min+ operation)
6. Handle network interface changes (WiFi to cellular, AP switching) which rosbridge doesn't handle gracefully
7. Add connection status to UI that's always visible to operators

**Warning signs:**
- Robot appears offline in dashboard despite having internet connectivity
- Socket.IO events: `reconnect_failed` or no reconnection events after long offline period
- Docker logs show no reconnection attempts despite network availability
- Operators report "I have to restart the container to get it back online"
- ROS topics publishing but no data appearing in UI (rosbridge hung)

**Phase to address:**
Phase 2 (Offline-First Core) - Connection reliability is foundational

---

### Pitfall 6: JWT Token Expiration Breaks Offline Mode

**What goes wrong:**
Robot authenticates with 15-minute JWT token, goes offline for hours/days. When attempting to sync after reconnecting, token is expired. Sync fails with 401 Unauthorized. All offline work remains unsynced because robot can't re-authenticate without manual intervention.

**Why it happens:**
- Using short-lived tokens designed for cloud-first apps (security best practice for always-online systems)
- No refresh token mechanism for offline scenarios
- Token validation on every sync request without offline grace period
- Not distinguishing between "token expired but robot is legitimate" vs "token expired and may be compromised"

**How to avoid:**
1. Use dual-token strategy for offline-capable robots:
   - **Access token**: 1 hour expiry for online operations
   - **Offline token**: 30-90 day expiry stored securely, used only for sync after extended offline
2. Implement automatic token refresh before expiration when online:
```javascript
if (isOnline && tokenExpiresIn < 10 * 60 * 1000) { // 10 min before expiry
  await refreshToken();
}
```
3. Store refresh token in Docker volume (encrypted at rest):
```javascript
{
  accessToken: 'eyJ...',        // 1 hour
  refreshToken: 'eyJ...',       // 30 days
  offlineToken: 'eyJ...',       // 90 days, only for sync
  expiresAt: 1234567890
}
```
4. Server-side: Accept offline tokens for sync endpoints only:
```javascript
if (endpoint === '/sync' && tokenType === 'offline') {
  // Allow even if slightly expired if robot was offline
  if (tokenExpiredBy < 24 * 60 * 60 * 1000) { // 24h grace
    validateAndRefresh();
  }
}
```
5. Implement robot device credentials (not user credentials) for autonomous sync
6. Use asymmetric signing (RS256) with long-lived robot identity verification

**Warning signs:**
- 401 errors in sync logs after robot returns online
- Sync queue stuck in "pending" state with authentication errors
- Robot requires manual re-login after extended offline periods
- Security alerts about expired tokens on legitimate sync attempts
- Offline data never syncs without operator intervention

**Phase to address:**
Phase 2 (Offline-First Core) - Authentication strategy affects all subsequent features

---

### Pitfall 7: LIDAR Point Cloud File Sync Overwhelms Network/Storage

**What goes wrong:**
Robot records 2D/3D LIDAR maps during offline operation. A single day generates 5-50GB of point cloud data. When reconnecting, sync queue tries to upload all files simultaneously, saturating upload bandwidth for hours, blocking mission-critical updates, and filling S3 buckets faster than budgeted.

**Why it happens:**
- Treating file sync like database sync (small JSON payloads)
- No prioritization: treating 100KB mission JSON same as 5GB LIDAR file
- No bandwidth throttling or upload scheduling
- Not compressing point cloud data before sync
- No differential/incremental sync for map updates

**How to avoid:**
1. Implement tiered sync priority queue:
```javascript
{
  HIGH: ['mission_updates', 'robot_status', 'session_metadata'],    // Sync immediately
  MEDIUM: ['small_lidar_maps'],                                      // < 10MB, sync within 1h
  LOW: ['large_lidar_maps', 'point_clouds'],                         // > 10MB, sync in background
  ARCHIVE: ['historical_maps']                                       // Sync only on explicit request
}
```
2. Compress point cloud files before upload:
   - PCD files: Use lzf or zlib compression (50-70% reduction)
   - Convert to LAZ format (compressed LAS): 80-90% size reduction
3. Throttle bandwidth for large files:
```javascript
const uploadStream = fs.createReadStream(file)
  .pipe(new ThrottleStream({ rate: 1024 * 1024 })) // 1MB/s max
  .pipe(s3Upload);
```
4. Implement chunked uploads with resume capability:
   - Use S3 multipart upload (5MB chunks)
   - Track uploaded chunks in local DB
   - Resume from last successful chunk on reconnection
5. Use differential sync for map updates:
   - Only upload changed octree nodes, not entire map
   - Implement map versioning with delta compression
6. Schedule bulk uploads during off-hours or operator-defined windows
7. Provide operator control: "Sync now" vs "Sync when on WiFi" vs "Defer sync"

**Warning signs:**
- Network saturation: 100% upload bandwidth usage for extended periods
- Mission updates delayed waiting for large file uploads
- S3 costs 10x higher than projected
- Sync queue shows hundreds of GB in pending uploads
- Operators complain: "Robot is online but dashboard not updating"
- Robot can't upload new data because disk is full from unsyncable files

**Phase to address:**
Phase 4 (Media/File Sync) - After core sync works, before production deployment

---

### Pitfall 8: Schema Mismatch Between Local and Cloud Databases

**What goes wrong:**
Developer updates cloud MongoDB schema (adds field, changes validation). Offline robots still run old schema locally. When syncing, new fields missing from local data cause validation errors. Cloud rejects sync, local data stuck in limbo. Bidirectional: cloud data with new fields can't sync down to old local schema.

**Why it happens:**
- No schema versioning strategy for offline-first systems
- Deploying cloud schema changes without coordinated container updates
- Assuming all robots are always running latest container version
- Not testing sync with mixed schema versions
- Using strict Mongoose validation without migration strategy

**How to avoid:**
1. Implement schema versioning in every document:
```javascript
{
  _id: ObjectId('...'),
  schemaVersion: 2,  // Increment on breaking changes
  missionName: 'Patrol',
  // New field in v2:
  priority: 'high'
}
```
2. Write backwards-compatible migrations in sync logic:
```javascript
function migrateToV2(doc) {
  if (doc.schemaVersion < 2) {
    doc.priority = doc.priority || 'normal';  // Add with default
    doc.schemaVersion = 2;
  }
  return doc;
}
```
3. Server accepts old schema versions and migrates on receive:
```javascript
app.post('/sync/missions', (req, res) => {
  const mission = migrateToV2(req.body);
  await Mission.create(mission);
});
```
4. Use optional fields for new additions (never required immediately):
```javascript
const missionSchema = new Schema({
  missionName: { type: String, required: true },
  priority: { type: String, default: 'normal' }  // Not required
});
```
5. Implement schema negotiation on sync handshake:
```javascript
// Robot sends: "I support schema v1-v2"
// Server responds: "I'll accept v1-v2, please upgrade to v3 when possible"
```
6. Track container versions in cloud, alert when robots run critically outdated versions
7. Test sync with N-1 and N-2 schema versions in CI

**Warning signs:**
- Sync errors: "Validation failed: field X required"
- Missing fields in cloud data synced from old robots
- Sync queue stuck processing old schema documents
- Cloud schema changes followed immediately by sync failures
- Mixed data versions in cloud database (some docs have fields, others don't)

**Phase to address:**
Phase 3 (Sync Engine) - Before first production deployment, impossible to retrofit

---

### Pitfall 9: Conflict Resolution Strategy Not Defined (Data Overwrites)

**What goes wrong:**
Robot offline for 2 days modifying Mission A. Cloud operator also modifies Mission A during that time. Robot reconnects and syncs. Without conflict resolution strategy, either robot changes overwrite cloud (operator loses work) or cloud overwrites robot (offline work lost). Either way, someone's data disappears with no warning.

**Why it happens:**
- Assuming "last write wins" is acceptable (it's not for important data)
- Not using vector clocks, CRDTs, or operational transformation
- No conflict detection in sync logic
- Users don't understand they're working on same data simultaneously
- Not tracking modification timestamps and document versions

**How to avoid:**
1. Choose conflict resolution strategy per data type:

**For mission metadata (name, description):**
- **Last Write Wins (LWW)** with timestamp: `updatedAt` field determines winner
- Safe for non-critical metadata
```javascript
if (cloudDoc.updatedAt > localDoc.updatedAt) {
  // Cloud wins
} else {
  // Local wins
}
```

**For mission waypoints (robot path):**
- **Cloud wins** for active missions (operator override)
- **Local wins** for completed missions (robot knows what it actually did)
- **Reject sync** and alert operator for draft missions edited both sides

**For robot telemetry/session data:**
- **Local always wins** - robot is source of truth
- Cloud is read-only copy

**For user-critical data (station locations, boundaries):**
- **Conflict detection with manual resolution**:
```javascript
if (conflict detected) {
  syncQueue.add({
    type: 'conflict',
    localVersion: {...},
    cloudVersion: {...},
    requiresManualResolution: true
  });
  notifyOperator('Data conflict requires your attention');
}
```

2. Implement version vectors for distributed edits:
```javascript
{
  _id: 'mission-123',
  vectorClock: {
    'robot-abc': 5,  // Robot made 5 edits
    'cloud': 3       // Cloud made 3 edits
  }
}
```

3. Use CRDT for collaborative data types:
   - Station positions: Last-Write-Wins Register
   - Mission execution log: Grow-Only Set
   - Configuration flags: Multi-Value Register with merge

4. Log all conflicts for audit trail:
```javascript
ConflictLog.create({
  documentType: 'Mission',
  documentId: 'mission-123',
  localVersion: {...},
  cloudVersion: {...},
  resolution: 'cloud_wins',
  resolvedAt: new Date(),
  resolvedBy: 'automatic'
});
```

5. UI indicators when working on data that exists in cloud:
   - "Editing while offline - changes will sync when reconnected"
   - "Cloud version exists - conflict possible"

**Warning signs:**
- Operators report: "My changes disappeared after robot synced"
- Robot's recorded path doesn't match what cloud shows
- Duplicate stations with slightly different coordinates (both versions kept)
- Sync succeeds but data looks wrong
- No conflict logs despite knowing both sides modified same document

**Phase to address:**
Phase 3 (Sync Engine) - Must be designed before sync implementation, not retrofitted

---

### Pitfall 10: Docker Volume Not Properly Configured (Data Loss on Update)

**What goes wrong:**
Operator pulls new Docker image with updated code. Runs `docker-compose down && docker-compose up -d`. All local MongoDB data (missions, sessions, LIDAR maps) disappears. Robot loses all offline work. No backups exist because "it's not production, it's local data."

**Why it happens:**
- Using anonymous volumes instead of named volumes
- Not understanding Docker volume lifecycle vs. container lifecycle
- Using bind mounts incorrectly (wrong permissions, wrong path)
- Container data in container filesystem instead of volume
- `docker-compose down -v` removes volumes (catastrophic)

**How to avoid:**
1. Always use named volumes in production:
```yaml
volumes:
  mongodb_data:
    driver: local
  lidar_maps:
    driver: local

services:
  flo-offline:
    volumes:
      - mongodb_data:/data/db          # MongoDB data
      - lidar_maps:/app/storage/maps   # LIDAR files
      # NOT: /data/db or ./data:/data/db (anonymous/bind)
```

2. Document volume management in deployment guide:
```bash
# SAFE: Update container, keep data
docker-compose down
docker-compose pull
docker-compose up -d

# DANGEROUS: Will delete all data
docker-compose down -v  # ⚠️ NEVER USE -v flag
```

3. Implement automated volume backup before updates:
```bash
#!/bin/bash
# Pre-update backup script
docker run --rm \
  -v mongodb_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/mongodb-$(date +%Y%m%d-%H%M%S).tar.gz /data
```

4. Set proper volume permissions in Dockerfile:
```dockerfile
RUN mkdir -p /data/db && chown -R mongodb:mongodb /data/db
VOLUME ["/data/db"]
```

5. Use volume read-only flags where appropriate:
```yaml
volumes:
  - config_data:/etc/app:ro  # Config is read-only
```

6. Separate data volumes by lifecycle:
   - Persistent (never delete): `mongodb_data`, `lidar_maps`
   - Cache (can delete): `npm_cache`, `build_cache`
   - Temporary (auto-clean): `temp_uploads`

7. Test disaster recovery: intentionally delete container, verify data survives

8. Monitor disk usage of volumes:
```bash
docker system df -v  # Show volume sizes
```

**Warning signs:**
- Container restart causes "database empty" errors
- `docker volume ls` shows multiple `flo-offline_mongodb_data_xxxxx` volumes
- LIDAR maps disappear after container updates
- Operators report: "I updated the container and lost all my data"
- Volume list includes unnamed volumes (long hex IDs)

**Phase to address:**
Phase 1 (Container Setup) - Must be correct from start, data loss not recoverable

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip idempotency keys, just retry failed requests | Faster sync implementation (save 2-3 days) | Duplicate data, impossible to debug sync issues, data integrity compromised | **Never** - essential for offline-first |
| Last-Write-Wins for all conflicts | No conflict resolution logic needed | Data loss, user frustration, unpredictable behavior | Only for truly non-critical metadata (logs, telemetry) |
| Sync everything immediately on reconnect | Simple implementation, no queuing | Network saturation, battery drain, high S3 costs | Early MVP with <100MB total offline data |
| Store tokens in localStorage unencrypted | Quick auth implementation | Security vulnerability, token theft risk | Development environment only |
| No schema versioning, require all robots on latest version | Simpler data model | Can't deploy updates without forcing all robots offline | Early development with <5 test robots |
| Anonymous Docker volumes | Easier docker-compose config | Data loss on updates, no migration path | **Never** - data loss not acceptable |
| MongoDB cache = 50% of RAM regardless of container limit | Works in development | OOM killed in production | Development environment with unlimited memory |
| Sync queue without retry limits or DLQ | Simpler queue logic | Infinite retries, memory leaks, stuck operations | Early testing phase only |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| **MongoDB in Docker** | Using default cache size (60% of *host* RAM) | Explicitly set `cacheSizeGB` to 25-50% of *container* limit |
| **Socket.IO reconnection** | Default `reconnectionAttempts: 20` for long offline periods | Set `reconnectionAttempts: Infinity` for offline-first, implement backoff |
| **rosbridge WebSocket** | Assuming stable connection like cloud websocket | Add watchdog for known hanging issues, handle network interface changes |
| **S3 uploads from edge** | Streaming large files with no resume | Use multipart uploads with chunk tracking, implement resume on reconnect |
| **JWT authentication** | Short-lived tokens designed for always-online | Dual-token strategy: short access + long offline token with grace period |
| **Mongoose validation** | Strict required fields without migration strategy | Use defaults, optional fields, schema versioning |
| **Docker SIGTERM** | Shell form CMD that doesn't forward signals | Exec form + tini init + SIGTERM handlers |
| **ROS topics via rosbridge** | QoS mismatch fails silently (ROS2) | Explicitly configure QoS profiles, add subscription verification |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| **Buffered Socket.IO events during offline** | Events queued in memory, massive spike on reconnect | Implement persistent queue, send in batches with delays | >1000 buffered events or >24h offline |
| **Sync queue without pagination** | Loading all pending operations into memory | Lazy-load queue, process in batches of 50-100 | >500 pending sync operations |
| **No LIDAR file compression** | Network saturation, slow sync, high S3 costs | Compress to LAZ format before upload (80% reduction) | >1GB daily LIDAR data |
| **Last-Write-Wins without tombstones** | Deleted items reappear after sync from old device | Implement soft deletes with sync, use tombstone records | Multi-device scenarios |
| **MongoDB working set exceeds cache** | Performance cliff when data > cache size | Monitor working set, alert at 80% cache, configure appropriately | When total data > configured cache size |
| **Sync retry without exponential backoff** | Thundering herd when 10 robots reconnect simultaneously | Exponential backoff + jitter (1s → 2s → 4s... max 60s) | >5 robots syncing simultaneously |
| **No sync bandwidth throttling** | Mission updates delayed waiting for GB uploads | Priority queue + bandwidth limits for large files | When 100MB+ files sync during active operations |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| **Storing long-lived offline tokens same as access tokens** | Leaked offline token = 90-day unauthorized access | Encrypt offline tokens at rest, rotate on every successful sync |
| **No robot device authentication (only user auth)** | Stolen user credentials = impersonate any robot | Implement per-robot device credentials + user credentials (both required) |
| **MongoDB no authentication in container** | Local attacker with Docker access = full database access | Enable MongoDB auth even for embedded instance: `MONGO_INITDB_ROOT_USERNAME` |
| **S3 sync using root AWS credentials** | Leaked credentials = entire AWS account compromised | Use IAM role with minimal permissions: `s3:PutObject` on specific bucket only |
| **No validation of synced data from robot** | Malicious robot sends crafted data, exploits cloud | Validate all synced data server-side, sanitize before database insert |
| **Sync endpoint allows any robot to overwrite any data** | Robot A can overwrite Robot B's data | Enforce robot ID matching: only sync data owned by authenticated robot |
| **JWT tokens in Docker logs** | Logs exposed = credentials leaked | Sanitize logs, never log tokens/secrets, use structured logging |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| **No visible sync status** | Users don't know if offline work will be saved | Always-visible indicator: "Synced 2 min ago" / "Offline - will sync when connected" |
| **Blocking UI during sync** | Can't operate robot while syncing | Background sync with non-blocking progress indicator |
| **No feedback when offline ops queued** | Users uncertain if action was recorded | Immediate optimistic UI update + "Queued for sync" badge |
| **Silent conflict resolution** | Users lose data without knowing why | Show conflict notification: "Your offline changes conflicted with cloud - [View details]" |
| **No way to force sync on-demand** | Users can't trigger sync before planned offline period | "Sync Now" button + sync status: "Last synced: 5m ago, 3 items pending" |
| **No offline mode indicator** | Users attempt operations that require cloud, confusion | Clear mode indicator: "Offline Mode" badge with explanation |
| **Generic error: "Sync failed"** | Users can't troubleshoot or report useful info | Specific errors: "Sync paused: disk full" / "Sync error: expired token - re-login required" |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Offline mode works:** Often missing continuous operation beyond first disconnect — verify robot works offline >24 hours, through multiple network changes
- [ ] **Sync implemented:** Often missing idempotency, retry limits, conflict detection — verify sync after network interruption doesn't duplicate data
- [ ] **Docker container running:** Often missing graceful shutdown, signal handling — verify data persists after `docker stop` (not just restart)
- [ ] **MongoDB embedded:** Often missing cache size config, auth — verify works under container memory limit, survives OOM scenarios
- [ ] **Socket.IO connected:** Often missing reconnection exhaustion handling — verify reconnects after 48+ hours offline
- [ ] **JWT authentication:** Often missing offline token strategy — verify robot can sync after multi-day offline period without re-login
- [ ] **File sync working:** Often missing compression, chunking, resume — verify 5GB LIDAR file upload can pause/resume on network loss
- [ ] **Schema defined:** Often missing versioning, migration — verify sync works with mixed container versions (old robot, new cloud)
- [ ] **Conflict resolution:** Often missing strategy definition — verify simultaneous edits don't silently lose data
- [ ] **Volume configured:** Often missing named volumes, backup — verify container update doesn't lose data

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| **Data lost to OOM killer** | HIGH | 1. Restore from Docker volume backup (if exists), 2. Reduce MongoDB cache size, 3. Increase container memory limit, 4. Extract unsyncable data from logs (partial) |
| **Duplicate sync data** | MEDIUM | 1. Query duplicates by idempotency key or timestamp, 2. Deduplicate via script, 3. Add idempotency to prevent future, 4. Audit data integrity |
| **Schema mismatch breaks sync** | MEDIUM | 1. Deploy backwards-compatible migration, 2. Manually sync stuck documents with transformation, 3. Version schema going forward |
| **Sync queue exhausted reconnection** | LOW | 1. Container restart forces reconnect, 2. Update Socket.IO config, 3. Deploy watchdog for future |
| **JWT token expired, can't sync** | MEDIUM | 1. Operator manually re-authenticates robot, 2. Deploy offline token strategy, 3. Sync queued data |
| **Conflict overwrote important data** | HIGH | 1. Restore from cloud backup (if exists), 2. Check conflict logs for lost version, 3. Manually merge data, 4. Implement conflict detection |
| **Docker volume deleted** | CRITICAL | 1. Data unrecoverable if no backup, 2. Lessons learned meeting, 3. Document volume management, 4. Implement automated backups |
| **LIDAR files failed upload, disk full** | MEDIUM | 1. Clear space by archiving old maps, 2. Implement compression before sync, 3. Prioritize critical data, defer large files |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| **Docker ungraceful shutdown data corruption** | Phase 1: Container Setup | Test: `docker stop` 10 times, verify zero data loss |
| **Blocking app until sync completes** | Phase 2: Offline-First Core | Test: Start app with no network, verify full functionality |
| **Embedded MongoDB memory OOM** | Phase 1: Container Setup | Test: Run container with 1GB limit, verify MongoDB uses <512MB cache |
| **Sync without idempotency** | Phase 3: Sync Engine | Test: Interrupt sync mid-operation, reconnect, verify no duplicates |
| **Socket.IO reconnection exhaustion** | Phase 2: Offline-First Core | Test: Leave offline 48h, reconnect, verify automatic connection |
| **JWT token expiration offline** | Phase 2: Offline-First Core | Test: Go offline 7 days, reconnect, verify sync succeeds without re-login |
| **LIDAR file sync overwhelms network** | Phase 4: Media/File Sync | Test: Generate 10GB data, verify prioritized sync + bandwidth limits |
| **Schema mismatch local/cloud** | Phase 3: Sync Engine | Test: Run N-1 container version, sync to N cloud, verify success |
| **No conflict resolution strategy** | Phase 3: Sync Engine | Test: Edit same mission offline and in cloud, verify defined resolution |
| **Docker volume misconfiguration** | Phase 1: Container Setup | Test: Update container image, verify all data persists |

---

## Sources

**Offline-First Patterns:**
- [RxDB: Downsides of Offline First](https://rxdb.info/downsides-of-offline-first.html) - MEDIUM confidence (official docs, 2025)
- [Building an offline realtime sync engine](https://gist.github.com/pesterhazy/3e039677f2e314cb77ffe3497ebca07b) - MEDIUM confidence (community wisdom, tested patterns)
- [The Complete Guide to Offline-First Architecture in Android](https://www.droidcon.com/2025/12/16/the-complete-guide-to-offline-first-architecture-in-android/) - MEDIUM confidence (recent 2025, domain expert)

**Docker + Embedded Database:**
- [Docker Volume Management Best Practices](https://www.devopstraininginstitute.com/blog/12-best-practices-for-docker-volume-management) - HIGH confidence (industry standard practices)
- [MongoDB in Docker: Production Notes](https://www.mongodb.com/docs/manual/administration/production-notes/) - HIGH confidence (official MongoDB docs)
- [Docker Graceful Shutdown](https://oneuptime.com/blog/post/2026-01-16-docker-graceful-shutdown-signals/) - HIGH confidence (recent 2026, technical deep dive)
- [Embedded Database Challenges](https://www.seltzer.com/assets/publications/Challenges-in-Embedded-Database-System-Administration.html) - MEDIUM confidence (academic research)

**Sync Engine & Conflict Resolution:**
- [CRDTs for Distributed Data](https://crdt.tech/) - HIGH confidence (authoritative CRDT resource)
- [Eventual Consistency and Conflict Resolution](https://www.mydistributed.systems/2022/02/eventual-consistency-part-1.html) - MEDIUM confidence (technical blog series)
- [Queue-Based Exponential Backoff](https://dev.to/andreparis/queue-based-exponential-backoff-a-resilient-retry-pattern-for-distributed-systems-37f3) - MEDIUM confidence (production patterns)

**Socket.IO & rosbridge:**
- [Socket.IO: Client Offline Behavior](https://socket.io/docs/v3/client-offline-behavior/) - HIGH confidence (official docs)
- [rosbridge Issues: Server hanging under load](https://github.com/RobotWebTools/rosbridge_suite/issues/425) - HIGH confidence (known production issues)
- [Socket.IO reconnection issues after network changes](https://github.com/socketio/socket.io/issues/3462) - MEDIUM confidence (reported bugs)

**JWT & Authentication:**
- [JWT Token Lifecycle Management](https://skycloak.io/blog/jwt-token-lifecycle-management-expiration-refresh-revocation-strategies/) - MEDIUM confidence (industry practices)
- [Better Session Management with Refresh Tokens](https://passage.1password.com/post/better-session-management-with-refresh-tokens) - HIGH confidence (1Password security guidance)

**Edge Computing & Robotics:**
- [Edge Computing in Robotics: A Survey](https://www.mdpi.com/2224-2708/14/4/65) - HIGH confidence (2025 academic survey)
- [Data Privacy in Robotics](https://www.mtlc.co/data-privacy-managing-data-in-the-age-of-robotics/) - MEDIUM confidence (industry analysis)

**Known Issues from Codebase:**
- `.planning/codebase/CONCERNS.md` - HIGH confidence (actual production issues from cloud system)

---

*Pitfalls research for: Offline-first robotics autonomy system with Docker + embedded MongoDB*
*Researched: 2026-03-19*
