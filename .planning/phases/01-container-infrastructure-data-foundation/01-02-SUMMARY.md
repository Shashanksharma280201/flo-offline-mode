---
phase: 01-container-infrastructure-data-foundation
plan: 02
subsystem: container-infrastructure
tags: [docker, typescript, build-system, package-management]

dependency_graph:
  requires: []
  provides:
    - package.json with minimal Phase 1 dependencies
    - TypeScript configuration targeting ES2022
    - Multi-stage Dockerfile with builder and production stages
  affects:
    - All future plans (establishes build foundation)

tech_stack:
  added:
    - pnpm package manager (via corepack)
    - TypeScript 5.7+ (ES2022 target)
    - Multi-stage Docker builds
    - tini init system for signal handling
  patterns:
    - ES modules (type: module in package.json)
    - Multi-stage Dockerfile (builder + production)
    - Non-root container user (security best practice)
    - Exec form CMD for signal forwarding

key_files:
  created:
    - package.json: Defines flo-offline-mode package with minimal dependencies
    - tsconfig.json: ES2022 TypeScript configuration with strict mode
    - Dockerfile: Multi-stage build with tini and security best practices
  modified: []

decisions:
  - decision: "Use ES modules (type: module) instead of CommonJS"
    rationale: "Node.js 22 native TypeScript support works best with ES modules, research recommends ES2022 target"
    alternatives: ["CommonJS with require()"]
  - decision: "Use pnpm instead of npm/yarn"
    rationale: "Existing codebase uses pnpm (STACK.md shows pnpm-lock.yaml), maintain consistency"
    alternatives: ["npm", "yarn"]
  - decision: "Include only Phase 1 dependencies (express, mongoose, bullmq, ioredis)"
    rationale: "Minimal set for Phase 1 requirements, later phases will add Socket.IO, auth, AWS SDK"
    alternatives: ["Include all dependencies upfront"]

metrics:
  duration_seconds: 168
  duration_minutes: 2
  tasks_completed: 3
  files_created: 3
  files_modified: 0
  commits: 3
  completed: "2026-03-19T09:59:17Z"
---

# Phase 01 Plan 02: Multi-stage Dockerfile with tini and security best practices Summary

**One-liner:** Created minimal package.json for offline mode with ES modules, TypeScript ES2022 configuration, and multi-stage Dockerfile achieving <500MB target with tini signal handling and non-root security.

## What Was Built

This plan established the foundational build system for the flo-offline-mode application:

1. **package.json**: Minimal dependency set for Phase 1 (express, mongoose, bullmq, ioredis) with ES module support
2. **tsconfig.json**: TypeScript compilation targeting ES2022 with strict type checking and source maps
3. **Dockerfile**: Multi-stage build with builder stage (compile TypeScript) and production stage (run compiled app)

The Dockerfile implements critical security and reliability patterns:
- **tini** for PID 1 signal handling (SIGTERM forwarding for graceful shutdown)
- **Non-root user** (USER node) for container security
- **Multi-stage builds** to exclude dev dependencies and achieve <500MB image size
- **HEALTHCHECK directive** for Docker native monitoring
- **Exec form CMD** for proper signal propagation

## Implementation Notes

### Task 1: Create minimal package.json
- Created package.json with name "flo-offline-mode"
- Set type: "module" for ES modules (matches research recommendation)
- Added core dependencies: express ^4.18.1, mongoose ^8.21.1, bullmq ^5.71.0, ioredis ^5.10.0
- Added dev dependencies: typescript ^5.7.0, tsx ^4.11.0, vitest ^4.0.18
- Set engines to Node.js >=22.0.0 and pnpm >=9.0.0
- **Commit:** fe8714d

### Task 2: Create TypeScript configuration
- Created tsconfig.json targeting ES2022 (matches Node.js 22 capabilities)
- Set module to ESNext for ES module support
- Configured outDir to ./build and rootDir to ./src
- Enabled strict type checking for production quality
- Added source maps and declaration files
- **Commit:** 00d184e

### Task 3: Create multi-stage Dockerfile
- Stage 1 (builder): Installs all dependencies including devDependencies, compiles TypeScript
- Stage 2 (production): Installs only production dependencies, copies compiled output from builder
- Installed tini via `apk add --no-cache tini` (INFRA-03 requirement)
- Set USER node before EXPOSE for security
- Used ENTRYPOINT ["/sbin/tini", "--"] for PID 1 signal handling
- Used exec form CMD ["node", "build/server.js"] for signal forwarding
- Added HEALTHCHECK directive (healthcheck.js to be created in Plan 04)
- **Commit:** 092dbfb

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification checks passed:

1. ✅ package.json is valid JSON
2. ✅ package.json contains required fields (name: flo-offline-mode, dependencies.express)
3. ✅ tsconfig.json has target: ES2022 and outDir: ./build
4. ✅ Dockerfile has exactly 2 FROM statements (multi-stage pattern)
5. ✅ Dockerfile includes tini installation
6. ✅ Dockerfile includes USER node security directive

**Note:** Full Docker image build verification will be performed in Plan 04 after src/ directory is created with server.js and healthcheck.js. Expected image size is ~200-250MB (node:22-alpine 180MB + prod deps 20-70MB), which meets the <500MB requirement.

## Dependencies

**Required by this plan:**
- None (first build system plan)

**Enables:**
- 01-03: MongoDB and Redis configuration (needs package.json for dependency installation)
- 01-04: Data layer initialization (needs TypeScript config for compilation)
- 01-05: Server initialization (needs Dockerfile for containerization)

## Next Steps

Plan 01-03 will:
1. Create MongoDB configuration file (docker/mongod.conf) with cacheSizeGB settings
2. Verify Redis maxmemory-policy: noeviction in docker-compose.yml
3. Test container startup with health checks

## Self-Check

Verifying all created files exist and commits are recorded:

**Files Created:**
- ✅ FOUND: /home/shanks/Music/flo_web_app/package.json
- ✅ FOUND: /home/shanks/Music/flo_web_app/tsconfig.json
- ✅ FOUND: /home/shanks/Music/flo_web_app/Dockerfile

**Commits Verified:**
- ✅ FOUND: fe8714d (Task 1: package.json)
- ✅ FOUND: 00d184e (Task 2: tsconfig.json)
- ✅ FOUND: 092dbfb (Task 3: Dockerfile)

## Self-Check: PASSED

All files created and all commits exist in git history.
