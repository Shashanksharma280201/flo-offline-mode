# Codebase Concerns

**Analysis Date:** 2026-03-19

## Tech Debt

**LIDAR Map Interaction - Critical Functionality Gap:**
- Issue: Station drag-drop, boundary/obstacle mapping not working in LIDAR mode
- Files: `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/missions/components/LidarMap2D.tsx`, `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/dashboard/configpad/PathMapPanel.tsx`
- Impact: Users must switch to GPS mode for mapping operations, then switch back to LIDAR - awkward workflow breaks user experience
- Fix approach: Add canvas event handling for Three.js overlay, implement coordinate conversion from canvas clicks to map coordinates

**Path Recording in LIDAR Mode - Untested:**
- Issue: Coordinate conversion for path recording in LIDAR mode not verified with real robot
- Files: `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/dashboard/configpad/pathMapPanel/PathMapPanel.tsx`
- Impact: Recorded paths may use wrong coordinate system, causing mission execution failures
- Fix approach: Test with real robot, validate frame reference conversion pipeline

**Non-RTK Mode - Untested:**
- Issue: Custom frame reference handling not tested in real-world scenarios
- Files: `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/dashboard/configpad/PathMapPanel.tsx`
- Impact: Paths might be recorded in UTM but displayed in custom frame, robot may not follow paths accurately
- Fix approach: Real-world validation with actual robot before production deployment

**Missing Admin Middleware on Delete Routes:**
- Issue: Shipment delete endpoint lacks admin authorization check
- Files: `/home/shanks/Music/flo_web_app/mission-control/backend/routes/shipmentRoutes.ts` (line 32)
- Impact: Any authenticated user can delete shipments, potential data loss
- Fix approach: Add admin middleware: `router.route("/:shipmentId").delete(adminMiddleware, deleteShipment)`

**Incomplete AI Agent Implementations:**
- Issue: Multiple TODO comments for missing analytics, trip tracking, operator stats
- Files:
  - `/home/shanks/Music/flo_web_app/mission-control/backend/services/autonomyAgentService.ts` (lines 1428, 105-108)
  - `/home/shanks/Music/flo_web_app/mission-control/backend/services/aiAgentService.ts` (lines 815-818, 1801, 1818)
  - `/home/shanks/Music/flo_web_app/mission-control/backend/services/master-agent/analytics.ts` (lines 128, 379)
- Impact: AI agent returns placeholder data (0 values), incomplete features
- Fix approach: Implement actual analytics queries, connect to real data sources

**Chat History Not Persisted:**
- Issue: AI agent chat history storage/retrieval not implemented
- Files: `/home/shanks/Music/flo_web_app/mission-control/backend/controllers/aiAgentController.ts` (lines 726, 740)
- Impact: No conversation context between sessions, poor user experience
- Fix approach: Implement database storage for conversation history, add retrieval endpoint

**Excessive Console Logging in Production Code:**
- Issue: 504 console.log statements in backend, 316 in frontend
- Files: Throughout codebase
- Impact: Performance degradation, potential information leakage, cluttered logs
- Fix approach: Replace with proper logger (Winston/Pino for backend already configured), use log levels, remove debug logs

**Large Monolithic Files:**
- Issue: Several files exceed 1000 lines
- Files:
  - `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/QC/qcFormTemplate_COMPLETE_200.ts` (1998 lines)
  - `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/dashboard/configpad/PathMapPanel.tsx` (1465 lines)
  - `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/dashboard/configpad/pathMapPanel/ExecuteMissionViaVoice.tsx` (1344 lines)
  - `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/fleet/FleetCreationWizard.tsx` (1305 lines)
- Impact: Hard to maintain, test, and debug; increases merge conflicts
- Fix approach: Extract components/utilities, split by feature/responsibility

**Heavy TypeScript Type Suppression:**
- Issue: Extensive use of `@ts-ignore`, `@ts-nocheck`, and `any` type
  - Backend: 771 occurrences across 118 files
  - Frontend: 35 occurrences across 22 files
- Files: Widespread, especially in models, routes, controllers
- Impact: Type safety compromised, potential runtime errors, loss of IDE support
- Fix approach: Gradually add proper types, enable strict mode incrementally

## Known Bugs

**LIDAR Overlay Alignment Issues:**
- Symptoms: 1-2 pixel offset between 3D robot model and LIDAR map at certain zoom levels
- Files: `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/missions/components/LidarOverlayScene.tsx`
- Trigger: Zooming in/out, especially at extreme zoom levels
- Workaround: Use zoom level where alignment is best for operational needs
- Root cause: Floating point precision errors in coordinate transforms, camera projection matrix rounding

**Coordinate Conversion Test Failures:**
- Symptoms: 7 tests failing in coordinate conversion suite
- Files: `/home/shanks/Music/flo_web_app/mission-control-frontend/tests/unit/coordinate-conversion.test.ts`
- Trigger: Running test suite
- Workaround: None - test data needs adjustment
- Root cause: Test fixtures use expected values that don't match actual GPS→UTM→Map pipeline precision

**Path Recording Test Failures:**
- Symptoms: 2 tests failing due to deprecated done() callback, precision mismatch
- Files: `/home/shanks/Music/flo_web_app/mission-control-frontend/tests/integration/path-recording.test.ts`
- Trigger: Running integration tests
- Workaround: None - tests need refactoring
- Root cause: Tests use old async patterns, distance calculation precision issues

## Security Considerations

**Vendor Credentials Stored as Plaintext:**
- Risk: Database breach exposes vendor login credentials
- Files: `/home/shanks/Music/flo_web_app/mission-control/backend/models/inventoryItemModel.ts` (line 93)
- Current mitigation: None - plaintext storage with TODO comment
- Recommendations:
  - Encrypt credentials at rest using AES-256
  - Use environment variable for encryption key
  - Consider vault service (HashiCorp Vault, AWS Secrets Manager)

**No Backend Test Coverage:**
- Risk: Undetected regressions, security vulnerabilities
- Files: `/home/shanks/Music/flo_web_app/mission-control/backend` (0 test files found)
- Current mitigation: None
- Recommendations:
  - Add unit tests for controllers and services
  - Add integration tests for API endpoints
  - Add authentication/authorization tests
  - Target minimum 60% coverage

**Sensitive Data in Logs:**
- Risk: Console.log statements may leak passwords, tokens, API keys
- Files: 326 occurrences of password/secret/token/credential keywords in backend
- Current mitigation: None - no sanitization
- Recommendations:
  - Audit all logging statements
  - Sanitize sensitive fields before logging
  - Use structured logging with allowlist
  - Implement log masking

**Missing Admin Authorization:**
- Risk: Unauthorized deletions, data manipulation
- Files: `/home/shanks/Music/flo_web_app/mission-control/backend/routes/shipmentRoutes.ts` (line 32)
- Current mitigation: Basic authentication only
- Recommendations: Implement role-based access control (RBAC) for destructive operations

## Performance Bottlenecks

**Multi-Client Analytics Data Fetching:**
- Problem: Sequential fetching of sensor data for multiple robots
- Files: `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/analytics/components/AnalyticsFilter.tsx` (lines 163-226)
- Cause: Batching implemented (5 robots at a time) but still slow for large fleets
- Improvement path:
  - Backend aggregation endpoint
  - Server-side data pre-processing
  - Caching layer (Redis)
  - Progressive loading with loading indicators

**Excessive Debug Logging in Production:**
- Problem: Console.log calls on every data fetch, filter change
- Files:
  - `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/analytics/components/AnalyticsFilter.tsx` (lines 495-508)
  - Many other files throughout both codebases
- Cause: Debug statements left in production code
- Improvement path: Use environment-based logging, remove debug logs, use profiler instead

**Large QC Form Template in Memory:**
- Problem: 2000-line template loaded entirely in memory
- Files: `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/QC/qcFormTemplate_COMPLETE_200.ts`
- Cause: Monolithic template definition (300 questions)
- Improvement path:
  - Lazy load tabs/categories
  - Split into separate files
  - Store in database, fetch on-demand
  - Implement pagination for questions

## Fragile Areas

**ROS WebSocket Connection Handling:**
- Files:
  - `/home/shanks/Music/flo_web_app/mission-control-frontend/src/lib/ros/useRos.ts`
  - `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/teleops/hooks/useVrPub.ts`
  - `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/teleops/hooks/useVrSub.ts`
- Why fragile: Complex connection lifecycle, no reconnection strategy visible
- Safe modification: Add connection state management, implement reconnection backoff, add error boundaries
- Test coverage: Likely minimal (no test files for teleops hooks)

**Socket.IO Event Handlers:**
- Files:
  - `/home/shanks/Music/flo_web_app/mission-control/backend/sockets/handlers/masterHandler.ts`
  - `/home/shanks/Music/flo_web_app/mission-control/backend/sockets/handlers/clientHandler.ts`
  - `/home/shanks/Music/flo_web_app/mission-control/backend/sockets/listeners/v1/masterListener.ts`
  - `/home/shanks/Music/flo_web_app/mission-control/backend/sockets/listeners/v1/clientListener.ts`
- Why fragile: Heavy use of `any` type, unclear error handling
- Safe modification: Add typed event schemas, add error boundaries, add logging
- Test coverage: None detected

**Mission Execution via Voice:**
- Files: `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/dashboard/configpad/pathMapPanel/ExecuteMissionViaVoice.tsx` (1344 lines)
- Why fragile: Complex state management, audio processing, API calls all intertwined
- Safe modification: Extract state logic to custom hook, add error boundaries, break into smaller components
- Test coverage: Unknown - no test files found

**Three.js/R3F Integration with LIDAR:**
- Files:
  - `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/missions/components/LidarOverlayScene.tsx`
  - `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/missions/components/OverlaySceneProvider.tsx`
  - `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/missions/components/CustomCanvas.tsx`
- Why fragile: Coordinate transforms, canvas event handling, overlay synchronization
- Safe modification: Add unit tests for coordinate conversion, add visual regression tests, document transform pipeline
- Test coverage: 11 tests failing from known issues document

## Scaling Limits

**Frontend Test Infrastructure:**
- Current capacity: 823 test files in frontend, but 11 tests failing (14% failure rate per KNOWN_ISSUES.md)
- Limit: Test suite becomes unreliable as codebase grows
- Scaling path:
  - Fix failing tests immediately
  - Set up CI to block on test failures
  - Increase coverage (currently 74% pass rate not acceptable)
  - Add E2E tests for critical workflows

**Backend Test Coverage:**
- Current capacity: 0 test files in backend
- Limit: Cannot safely refactor or add features
- Scaling path:
  - Add Jest/Vitest configuration
  - Start with critical path tests (auth, data mutations)
  - Add API integration tests
  - Target 80% coverage for new code

**Console Logging Volume:**
- Current capacity: 820+ console.log statements across both codebases
- Limit: Log noise makes debugging impossible at scale
- Scaling path:
  - Replace with proper logging framework
  - Use log levels (error, warn, info, debug)
  - Implement log sampling/filtering
  - Set up log aggregation (ELK, Datadog)

## Dependencies at Risk

**None detected** - Standard dependencies appear up-to-date and maintained.

## Missing Critical Features

**Backend Testing Framework:**
- Problem: No test files in `/home/shanks/Music/flo_web_app/mission-control/backend`
- Blocks: Safe refactoring, confidence in changes, CI/CD pipeline
- Priority: High - foundation for code quality

**LIDAR Mode Interactive Features:**
- Problem: Station drag-drop, boundary/obstacle mapping not functional in LIDAR mode
- Blocks: Full LIDAR mode adoption, user workflow optimization
- Priority: High - documented in KNOWN_ISSUES.md as critical

**Non-RTK Mode Validation:**
- Problem: Not tested with real robots
- Blocks: Production deployment for non-RTK clients
- Priority: Medium - needs real-world testing

**AI Agent Chat Persistence:**
- Problem: No storage/retrieval for conversation history
- Blocks: Multi-turn conversations, context retention
- Priority: Medium - degrades UX but not blocking

## Test Coverage Gaps

**Backend Integration Tests:**
- What's not tested: All API endpoints, socket handlers, database operations
- Files: Entire `/home/shanks/Music/flo_web_app/mission-control/backend` directory
- Risk: Breaking changes undetected, security vulnerabilities unnoticed
- Priority: High

**Frontend Integration Tests - LIDAR Mode:**
- What's not tested: Mission execution, boundaries, non-RTK mode (per `/home/shanks/Music/flo_web_app/mission-control-frontend/tests/README.md` lines 282-285)
- Files:
  - `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/missions/components/LidarMap2D.tsx`
  - `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/dashboard/configpad/PathMapPanel.tsx`
- Risk: LIDAR features break unnoticed, regression in critical path
- Priority: High

**Frontend Coordinate Conversion:**
- What's not tested: Accurate GPS→UTM→Map pipeline
- Files: `/home/shanks/Music/flo_web_app/mission-control-frontend/src/util/cordinatesConverter.ts`
- Risk: Robot positioning errors, mission failures (7 failing tests documented)
- Priority: High

**ROS/WebSocket Communication:**
- What's not tested: Connection lifecycle, error recovery, message handling
- Files:
  - `/home/shanks/Music/flo_web_app/mission-control-frontend/src/lib/ros/useRos.ts`
  - `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/teleops/hooks/*`
- Risk: Connection drops unhandled, data loss during teleops
- Priority: Medium

**Voice Assistant Integration:**
- What's not tested: Audio processing, speech recognition, command execution
- Files:
  - `/home/shanks/Music/flo_web_app/mission-control-frontend/src/components/UnifiedVoiceAssistant.tsx`
  - `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/dashboard/configpad/pathMapPanel/ExecuteMissionViaVoice.tsx`
- Risk: Voice commands fail silently, poor accessibility
- Priority: Low

---

*Concerns audit: 2026-03-19*
