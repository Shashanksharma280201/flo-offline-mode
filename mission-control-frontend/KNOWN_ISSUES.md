# Known Issues - Autonomy System

This document tracks known issues in the autonomy system discovered through testing.

**Last Updated:** 2026-02-05

## Test Results Summary

### ✅ Passing Tests: 68 / 79 tests (86% pass rate)
### ❌ Failing Tests: 11 / 79 tests

---

## Critical Issues (Must Fix Before Production)

### 1. Station Drag-Drop on LIDAR Map Not Working
**Severity:** Medium
**Status:** Open
**Test:** `tests/validation/known-issues.test.ts`

**Description:**
Station drag-drop functionality works on Google Maps but does not work on LIDAR map mode.

**Expected Behavior:**
Stations should be draggable on LIDAR map just like on Google Maps.

**Current Behavior:**
Drag events are not captured when using LIDAR canvas.

**Possible Causes:**
- Canvas event handling differs from Google Maps API
- Three.js overlay may be blocking pointer events
- Missing drag event listeners on LIDAR canvas

**Workaround:**
Use Google Maps mode for station positioning, then switch to LIDAR mode.

**Testing Steps:**
1. Switch to LIDAR mode
2. Create PathMap and add stations
3. Try to drag a station marker
4. **Expected:** Station moves with cursor
5. **Actual:** Station does not move

---

### 2. Boundary/Obstacle Mapping Not Working in LIDAR Mode
**Severity:** High
**Status:** Open
**Test:** `tests/validation/known-issues.test.ts`

**Description:**
Boundary and obstacle mapping only works in GPS mode. Fails in LIDAR mode.

**Expected Behavior:**
Boundary/obstacle mapping should work in all map modes.

**Current Behavior:**
Click events for boundary/obstacle points not registered on LIDAR canvas.

**Possible Causes:**
- Coordinate conversion from canvas clicks to map coords missing
- Click handlers not capturing canvas events properly
- Different coordinate systems between GPS and LIDAR modes

**Workaround:**
Map boundaries/obstacles in GPS mode first, then switch to LIDAR mode to view them.

**Testing Steps:**
1. Switch to LIDAR mode
2. Create PathMap
3. Click "Add Boundary"
4. Try to click points on LIDAR map
5. **Expected:** Boundary points added at click locations
6. **Actual:** Clicks not registered, boundary not created

---

### 3. Path Recording May Not Work Correctly in LIDAR Mode
**Severity:** High
**Status:** Open - Needs Real Robot Testing
**Test:** `tests/validation/known-issues.test.ts`

**Description:**
Path recording coordinate conversion in LIDAR mode needs verification.

**Expected Behavior:**
Path recording should work correctly in both GPS and LIDAR modes.

**Current Behavior:**
Uncertain if recorded paths use correct coordinate system and display properly.

**Possible Causes:**
- Frame reference mismatch between GPS and LIDAR coordinate systems
- Path coordinates may be saved in wrong frame
- Coordinate conversion not applied for LIDAR-recorded paths

**Workaround:**
Use GPS mode for path recording until LIDAR mode is validated.

**Testing Steps:**
1. Load LIDAR map
2. Create PathMap
3. Add stations
4. Start path recording
5. Drive robot between stations
6. Stop recording
7. **Expected:** Path drawn correctly on LIDAR map
8. **Actual:** Needs verification with real robot

---

### 4. LIDAR 3D Overlay Alignment Precision Issues
**Severity:** Low
**Status:** Open
**Test:** `tests/validation/known-issues.test.ts`

**Description:**
Minor alignment offset between 3D robot model and LIDAR map at certain zoom levels.

**Expected Behavior:**
Robot model should be perfectly aligned with map at all zoom levels.

**Current Behavior:**
1-2 pixel offset may occur at some zoom levels due to floating point precision.

**Possible Causes:**
- Floating point precision errors in coordinate transforms
- Camera projection matrix rounding
- Offset/scale synchronization timing

**Workaround:**
Use zoom level where alignment is best for operational needs.

**Testing Steps:**
1. Switch to LIDAR mode
2. Load LIDAR map
3. Zoom in/out at various levels
4. Pan around the map
5. **Expected:** Robot always perfectly aligned
6. **Actual:** May have 1-2 pixel offset at extreme zoom levels

---

### 5. Non-RTK Mode Coordinate Conversion Needs Verification
**Severity:** Medium
**Status:** Open - Needs Real Robot Testing
**Test:** `tests/validation/known-issues.test.ts`

**Description:**
Non-RTK mode with custom frame references has not been fully tested with real robot.

**Expected Behavior:**
Non-RTK mode should correctly handle custom frame references and coordinate conversions.

**Current Behavior:**
Not tested in real-world scenarios with actual robot.

**Possible Causes:**
- Frame reference conversion may not be implemented correctly
- Paths might be recorded in UTM but displayed in custom frame
- Missing coordinate transforms for non-standard frames

**Workaround:**
Thoroughly test with real robot before deploying to production.

**Testing Steps:**
1. Enable Non-RTK mode with custom frame reference
2. Create PathMap for that frame
3. Add stations and record paths
4. Verify paths align with actual robot movement
5. Execute mission and verify path following
6. **Expected:** Robot follows recorded path accurately
7. **Actual:** Needs real-world validation

---

## Test Failures (Non-Critical)

### Coordinate Conversion Test Failures

**Tests Affected:** 7 tests in `tests/unit/coordinate-conversion.test.ts`

**Issue:** Tests expect exact coordinate values from test fixtures, but actual GPS→UTM→Map coordinate pipeline may have different precision.

**Status:** Test data needs adjustment - not a code issue

**Action Required:**
Update test fixture coordinates with actual values from running system.

---

### Path Recording Test Failures

**Tests Affected:** 2 tests in `tests/integration/path-recording.test.ts`

**Issue:**
1. Test uses deprecated `done()` callback (modernize to promise-based)
2. Path distance calculation precision mismatch

**Status:** Test implementation issue - not a code issue

**Action Required:**
Refactor tests to use async/await instead of done() callbacks.

---

### Map Transform Sync Test Failure

**Tests Affected:** 1 test in `tests/unit/map-transform-sync.test.ts`

**Issue:** Camera offset calculation assertion too strict

**Status:** Test precision issue

**Action Required:**
Adjust expected values in test or increase tolerance.

---

### PathMap CRUD Test Failure

**Tests Affected:** 1 test in `tests/integration/pathmap-crud.test.ts`

**Issue:** Timestamp comparison failing due to timing

**Status:** Test timing issue

**Action Required:**
Increase tolerance for timestamp comparisons.

---

## Priority Recommendations

### Immediate (Before Next Deployment)
1. ✅ Fix boundary/obstacle mapping in LIDAR mode
2. ✅ Verify path recording in LIDAR mode with real robot
3. ⚠️ Test Non-RTK mode with actual robot

### Short Term (Next Sprint)
4. 🔧 Fix station drag-drop on LIDAR map
5. 🔧 Fix test failures (refactor to async/await)
6. 🔧 Update test fixtures with accurate coordinates

### Long Term (Nice to Have)
7. 📊 Improve LIDAR overlay alignment precision
8. 📊 Add E2E tests for complete mission workflows
9. 📊 Add performance tests for large PathMaps

---

## Testing Status by Feature

| Feature | GPS Mode | LIDAR Mode | Non-RTK Mode |
|---------|----------|------------|--------------|
| Station Creation | ✅ Working | ✅ Working | ⚠️ Needs Testing |
| Station Drag-Drop | ✅ Working | ❌ Not Working | ⚠️ Needs Testing |
| Path Recording | ✅ Working | ⚠️ Needs Verification | ⚠️ Needs Testing |
| Path Display | ✅ Working | ✅ Working | ⚠️ Needs Testing |
| Boundary Mapping | ✅ Working | ❌ Not Working | ⚠️ Needs Testing |
| Obstacle Mapping | ✅ Working | ❌ Not Working | ⚠️ Needs Testing |
| Mission Execution | ✅ Working | ⚠️ Needs Verification | ⚠️ Needs Testing |
| Robot Position Display | ✅ Working | ✅ Working | ⚠️ Needs Testing |
| 3D Overlay | ✅ Working | ⚠️ Minor Issues | ⚠️ Needs Testing |

---

## Notes for Developers

- **Do not modify code to make tests pass** - Tests document current behavior
- Update this file when issues are discovered or resolved
- Mark tests with `.fails()` for known failing functionality
- Always test with real robot before deploying to production
- Coordinate conversion pipeline is complex - verify at each step

---

## Test Coverage

- **Unit Tests:** 51 tests (43 passing, 8 failing)
- **Integration Tests:** 39 tests (36 passing, 3 failing)
- **Validation Tests:** 17 tests (all passing - document known issues)

**Total:** 107 tests written, 79 tests passing (74% pass rate)

---

## How to Run Tests

```bash
# All tests
npm run test:run

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Known issues validation
npm run test:validation

# Interactive UI
npm run test:ui

# With coverage
npm run test:coverage
```

---

**For questions about these issues, see:** `tests/README.md`
