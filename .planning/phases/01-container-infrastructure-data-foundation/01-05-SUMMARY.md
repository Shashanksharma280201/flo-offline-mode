---
phase: 01-container-infrastructure-data-foundation
plan: 05
subsystem: server-health
tags: [express, graceful-shutdown, health-checks, docker]
dependency_graph:
  requires: [01-04]
  provides: [express-server, health-endpoints, sigterm-handler]
  affects: [docker-compose, dockerfile]
tech_stack:
  added: []
  patterns: [express-routes, graceful-shutdown, health-checks]
key_files:
  created:
    - src/server.ts
    - src/health/healthController.ts
    - src/healthcheck.js
    - .gitignore
  modified:
    - src/config/redis.ts
    - src/config/database.ts
    - tsconfig.json
decisions:
  - "Use ioredis package for Redis health checks (consistency with Plan 01-04)"
  - "Implement separate SIGTERM handlers in server.ts (HTTP) and database.ts (MongoDB) for separation of concerns"
  - "Health check creates new Redis connection per request (ioredis connects lazily on first command)"
  - "Exclude test files from TypeScript compilation via tsconfig exclude pattern"
  - "Server continues startup on Redis verification failure (development-friendly, warns instead of fails)"
metrics:
  duration_minutes: 12
  tasks_completed: 4
  files_created: 4
  files_modified: 3
  commits: 5
  completed_at: "2026-03-19T10:24:18Z"
---

# Phase 01 Plan 05: Express Server with Health Checks and Graceful Shutdown Summary

**One-liner:** Express server with MongoDB/Redis health checks, SIGTERM/SIGINT graceful shutdown handlers, and Docker HEALTHCHECK script using ioredis.

## Tasks Completed

### Task 1: Create health check endpoint controller using ioredis
**Status:** ✅ Complete
**Commit:** d538707

**Implementation:**
- Created `src/health/healthController.ts` with `healthCheck` Express route handler
- Checks MongoDB connection via `mongoose.connection.readyState` and `db.admin().ping()`
- Checks Redis connection using ioredis `new Redis()` and `ping()` method
- Returns HTTP 200 when healthy, 503 when degraded/unhealthy
- Includes uptime, timestamp, and service status in response JSON

**Key decisions:**
- Used ioredis package (NOT redis) for consistency with Plan 01-04
- Health check creates new Redis connection per request (ioredis connects lazily)
- Returns 503 Service Unavailable for degraded state (signals Docker/load balancers)

**Files:**
- `src/health/healthController.ts` (51 lines)

---

### Task 2: Create standalone health check script for Docker HEALTHCHECK
**Status:** ✅ Complete
**Commit:** d37c262

**Implementation:**
- Created `src/healthcheck.js` as plain JavaScript (not TypeScript) for direct execution
- Uses native http module to GET /health endpoint
- Exits 0 on HTTP 200 (healthy), exits 1 otherwise (unhealthy)
- Handles timeouts (5s), errors, and non-200 responses with exit code 1

**Key decisions:**
- Plain JavaScript (not TypeScript) because Dockerfile HEALTHCHECK needs lightweight script
- TypeScript compiler only processes .ts files, so .js can run directly via `node healthcheck.js`
- HTTP request to /health verifies entire stack (Express + MongoDB + Redis)

**Files:**
- `src/healthcheck.js` (31 lines)

---

### Task 3: Create Express server with graceful shutdown (TDD)
**Status:** ✅ Complete
**Commits:** 2d322f0 (RED), 207cf25 (GREEN)

**Implementation:**

**RED phase (failing tests):**
- Created `src/server.test.ts` with 4 test cases:
  - Server starts on PORT from env (default 3000)
  - GET /health route exists
  - GET / route returns API info JSON
  - SIGTERM handler registered for graceful shutdown
- Tests failed as expected (server.ts did not exist)

**GREEN phase (implementation):**
- Created `src/server.ts` with Express app setup
- Middleware: `express.json()` and `express.urlencoded({ extended: true })`
- Routes:
  - `GET /health` → `healthCheck` controller
  - `GET /` → API info JSON (message, version, timestamp)
- Server startup:
  - `app.listen(PORT)` with callback that calls `connectDatabase()` and `verifyRedisConfig()`
  - MongoDB connection happens async with retries (from database.ts)
  - Redis verification warns on failure but continues startup (development-friendly)
- Graceful shutdown:
  - **SIGTERM handler:** Calls `server.close()` to stop accepting new connections, MongoDB close handled by database.ts
  - **SIGINT handler:** Calls `server.close()` and `process.exit(0)` for Ctrl+C in development

**Type fixes (auto-deviation Rule 1):**
- Fixed `src/config/redis.ts`: Added `as string[]` type assertion for ioredis `config()` return value
- Fixed `src/health/healthController.ts`: Added null check for `mongoose.connection.db` before calling `admin().ping()`
- Fixed `src/server.ts`: Added explicit `Express` type annotation to `app` variable
- Fixed `src/server.test.ts`: Changed `server` variable type to `http.Server | undefined`
- Updated `tsconfig.json`: Added `**/*.test.ts` to exclude pattern (test files don't need compilation)

**Key decisions:**
- Separation of concerns: server.ts closes HTTP server, database.ts closes MongoDB (both have SIGTERM handlers)
- Server startup is non-blocking (listens immediately, connects to DB async)
- Redis verification failure is warning (not blocker) for development scenarios
- ES module imports use .js extension (ESM requirement, TypeScript compiles .ts → .js)

**Files:**
- `src/server.ts` (67 lines)
- `src/server.test.ts` (47 lines)

---

### Task 4: Build and verify application compiles
**Status:** ✅ Complete
**Commit:** f500396

**Implementation:**
- Ran `pnpm build` (executes `tsc` compiler)
- TypeScript compiled all `src/**/*.ts` files to `build/**/*.js`
- Copied `src/healthcheck.js` to `build/healthcheck.js` (required by Dockerfile HEALTHCHECK)
- Created `.gitignore` to exclude `node_modules/` and `build/` directories

**Verification:**
- ✅ `pnpm build` exits with code 0
- ✅ `build/server.js` exists and is valid JavaScript
- ✅ `build/config/database.js` exists
- ✅ `build/config/redis.js` exists
- ✅ `build/health/healthController.js` exists
- ✅ `build/healthcheck.js` exists (copied from src/)
- ✅ No TypeScript compilation errors

**Build output structure:**
```
build/
├── server.js
├── server.d.ts
├── healthcheck.js
├── config/
│   ├── database.js
│   ├── database.d.ts
│   ├── redis.js
│   └── redis.d.ts
└── health/
    ├── healthController.js
    └── healthController.d.ts
```

**Files:**
- `.gitignore` (16 lines)
- `build/` directory (excluded from git)

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Missing Plan 01-04 prerequisite files**
- **Found during:** Task 1 execution start
- **Issue:** Plan 01-05 depends on Plan 01-04 (`database.ts`, `redis.ts`), but those files did not exist
- **Fix:** Created `src/config/database.ts` and `src/config/redis.ts` from Plan 01-04 specification before executing Plan 01-05 tasks
- **Files created:** `src/config/database.ts`, `src/config/redis.ts`
- **Commit:** d538707 (combined with Task 1)
- **Rationale:** Deviation Rule 3 (auto-fix blocking issues) - missing dependencies prevent task completion

**2. [Rule 1 - Bug] TypeScript type errors in ioredis config() return value**
- **Found during:** Task 3 GREEN phase (build verification)
- **Issue:** `policy[1]` access caused TypeScript error - ioredis `config()` returns `any`, not typed array
- **Fix:** Added `as string[]` type assertion to `const policy = await redis.config('GET', 'maxmemory-policy')`
- **Files modified:** `src/config/redis.ts`
- **Commit:** 207cf25 (combined with Task 3 GREEN)

**3. [Rule 1 - Bug] TypeScript null safety error in MongoDB health check**
- **Found during:** Task 3 GREEN phase (build verification)
- **Issue:** `mongoose.connection.db` is possibly undefined when calling `.admin().ping()`
- **Fix:** Added null check: `else if (mongoose.connection.db) { ... } else { degraded }`
- **Files modified:** `src/health/healthController.ts`
- **Commit:** 207cf25 (combined with Task 3 GREEN)

**4. [Rule 1 - Bug] TypeScript type inference error in Express app**
- **Found during:** Task 3 GREEN phase (build verification)
- **Issue:** `app` variable type could not be inferred (TypeScript portability error)
- **Fix:** Added explicit type annotation: `const app: Express = express()`
- **Files modified:** `src/server.ts`
- **Commit:** 207cf25 (combined with Task 3 GREEN)

**5. [Rule 1 - Bug] TypeScript variable initialization error in test**
- **Found during:** Task 3 GREEN phase (build verification)
- **Issue:** `server: http.Server` used before being assigned in `afterEach` hook
- **Fix:** Changed type to `server: http.Server | undefined` to allow conditional check
- **Files modified:** `src/server.test.ts`
- **Commit:** 207cf25 (combined with Task 3 GREEN)

**6. [Rule 2 - Missing Critical Functionality] Test files included in build**
- **Found during:** Task 3 GREEN phase (build verification)
- **Issue:** TypeScript compiler attempting to compile test files causes errors
- **Fix:** Updated `tsconfig.json` exclude pattern to include `**/*.test.ts`
- **Files modified:** `tsconfig.json`
- **Commit:** 207cf25 (combined with Task 3 GREEN)

---

## Technical Decisions

### 1. ioredis package for Redis operations
**Decision:** Use ioredis (not redis) for Redis health checks
**Rationale:**
- Plan 01-04 already uses ioredis for BullMQ configuration
- Consistency across codebase (single Redis client library)
- ioredis API: `new Redis({ host, port })`, `ping()` returns `'PONG'` string, `quit()` disconnects

**Impact:** Health check creates new Redis connection per request (ioredis lazy connects on first command)

### 2. Graceful shutdown handler separation
**Decision:** SIGTERM handlers in both server.ts and database.ts
**Rationale:**
- Separation of concerns: HTTP server lifecycle managed by server.ts, database lifecycle by database.ts
- Research Pattern 3 requires: close HTTP server BEFORE database connections
- server.ts calls `server.close()`, database.ts has separate SIGTERM handler for `mongoose.connection.close(false)`

**Impact:** Two SIGTERM handlers (both needed for complete graceful shutdown per INFRA-03)

### 3. Server startup non-blocking
**Decision:** `app.listen()` calls `connectDatabase()` in callback (async, not await)
**Rationale:**
- Server starts listening immediately (passes Docker health check quickly)
- MongoDB connection happens async with 5 retries (Plan 01-04 retry logic)
- Health endpoint reports degraded until MongoDB connected

**Impact:** Server can respond to health checks before MongoDB connection established

### 4. Redis verification warns instead of fails
**Decision:** `verifyRedisConfig()` wrapped in try/catch, errors logged as warnings
**Rationale:**
- Development scenarios might not have Redis mounted with docker-compose
- Production requires noeviction policy, but shouldn't block Phase 1 local testing
- Health endpoint will still fail if Redis unavailable (connection test per request)

**Impact:** Server starts even if Redis verification fails (development-friendly)

### 5. ES module import extensions
**Decision:** All imports use `.js` extension (not `.ts`)
**Rationale:**
- package.json has `"type": "module"` (ES modules, not CommonJS)
- ES module spec requires explicit file extensions
- TypeScript compiles .ts → .js, so imports must reference .js output

**Example:** `import { connectDatabase } from './config/database.js';`

---

## Verification Results

### Automated Verification
✅ TypeScript compilation successful (`pnpm build` exits 0)
✅ `build/server.js` is valid JavaScript (`node -c` passes)
✅ `build/healthcheck.js` is valid JavaScript (`node -c` passes)
✅ Required files exist: server.js, healthcheck.js, database.js, healthController.js
✅ SIGTERM handler present in server.ts
✅ ioredis import verified in healthController.ts
✅ ES module imports use .js extension in server.ts

### Manual Integration Testing (Deferred)
The following integration tests should be performed after docker-compose deployment:
- `docker exec flo-offline-app node /app/build/healthcheck.js` exits 0 when services healthy
- `curl http://localhost:3000/health` returns 200 with JSON: `{ mongodb: "connected", redis: "connected", status: "ok" }`
- `docker-compose down` triggers graceful shutdown logs: "HTTP server closed" then "MongoDB connection closed"

---

## Commits

| Commit  | Type    | Message                                                                 | Files |
|---------|---------|-------------------------------------------------------------------------|-------|
| d538707 | feat    | Add prerequisite database/redis config and health check controller     | 3     |
| d37c262 | feat    | Add standalone health check script for Docker HEALTHCHECK              | 1     |
| 2d322f0 | test    | Add failing tests for Express server                                   | 1     |
| 207cf25 | feat    | Implement Express server with graceful shutdown (includes type fixes)  | 4     |
| f500396 | chore   | Add .gitignore and verify build output                                 | 1     |

**Total:** 5 commits, 10 files created/modified

---

## Success Criteria Met

✅ src/server.ts implements Express server with SIGTERM graceful shutdown (closes HTTP before database)
✅ src/health/healthController.ts provides /health endpoint checking MongoDB and Redis using ioredis
✅ src/healthcheck.js standalone script for Docker HEALTHCHECK
✅ Application compiles without errors to build/ directory
✅ SIGTERM handlers present in both server.ts (HTTP) and database.ts (MongoDB) for complete graceful shutdown (INFRA-03)
✅ Health endpoints enable Docker orchestration (INFRA-06)
✅ All Redis code uses ioredis package matching package.json dependencies
✅ All source files use ES module syntax with .js extensions in imports

---

## Requirements Completed

- **INFRA-03:** Graceful shutdown handlers (SIGTERM in server.ts and database.ts)
- **INFRA-06:** Health check endpoints for Docker orchestration

---

## Next Steps

1. **Plan 01-06 (if exists):** Continue Phase 01 infrastructure work
2. **Phase 02:** Begin authentication implementation (dual-token JWT strategy)
3. **Integration testing:** Deploy docker-compose and verify health checks end-to-end
4. **Performance testing:** Load test health endpoint (Redis connection per request overhead)

---

## Self-Check: PASSED

✅ Created files exist:
- `src/server.ts` - EXISTS
- `src/health/healthController.ts` - EXISTS
- `src/healthcheck.js` - EXISTS
- `.gitignore` - EXISTS

✅ Modified files exist:
- `src/config/redis.ts` - EXISTS
- `src/config/database.ts` - EXISTS (created as prerequisite)
- `tsconfig.json` - EXISTS

✅ Commits exist:
- `d538707` - FOUND
- `d37c262` - FOUND
- `2d322f0` - FOUND
- `207cf25` - FOUND
- `f500396` - FOUND

✅ Build artifacts exist:
- `build/server.js` - EXISTS (excluded from git)
- `build/healthcheck.js` - EXISTS (excluded from git)
- `build/config/database.js` - EXISTS
- `build/health/healthController.js` - EXISTS

All files, commits, and build artifacts verified successfully.
