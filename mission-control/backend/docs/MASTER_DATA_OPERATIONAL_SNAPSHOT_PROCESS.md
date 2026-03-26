# Master Data Operational Snapshot Process

## Purpose

This document explains how operational metrics for Robot Master Data are
assembled, refreshed, and tested.

It covers:

- the Master Data read path
- the Redis-backed operational snapshot cache
- the difference between "active" and "inactive" robots in the current system
- the backend test plan for this process

## Primary API Surfaces

- `GET /api/v1/robots/master-data`
- `GET /api/v1/masterdata/cached`

The frontend currently uses `GET /api/v1/robots/master-data` as the primary
Master Data API.

## Source Layers

Master Data is assembled from four layers:

1. **Durable robot data in MongoDB**
   - robot identity and metadata
   - `maintenance`
   - `manufacturingData`
   - `tasks`
   - embedded snapshots: `operatorSnapshot`, `clientSnapshot`, `fleetSnapshot`

2. **Additional MongoDB read models and aggregates**
   - issue counts and type breakdown
   - latest QC
   - billing
   - shipping

3. **Live connectivity state in Redis**
   - robot online/offline status
   - `lastConnectionOn`
   - connected clients count

4. **Operational snapshot cache in Redis**
   - `staffingCoverageState`
   - `maintenanceOverdueDays`
   - `maintenanceState`
   - `insufficientPartsCount`
   - `bomCompletionStatus`
   - `bomState`
   - `cycleEfficiency`
   - `cycleEfficiencyWindow`
   - operational `metricFreshness` values

## Current Read Flow

1. The Master Data service loads the requested robot rows from MongoDB.
2. It loads live connectivity state from Redis for those robot IDs.
3. It loads cached operational snapshots from Redis for those robot IDs.
4. It checks which operational snapshots are missing, stale, or explicitly
   marked dirty.
5. It recomputes only those robot IDs.
6. It merges the final DTO with field-level fallbacks.

Important:

- paginated Master Data requests compute only the robots returned by that query
- full cached rebuilds still iterate all robots

## Dirtying And Refresh Triggers

Operational snapshots are refreshed or dirtied from these write paths:

- attendance check-in/check-out flows
- overtime check-in/check-out flows
- auto-checkout helper path
- robot create/update flows
- manufacturing/BOM completion flows
- operator-to-robot assignment changes
- active operator changes
- client snapshot source changes
- operator profile snapshot source changes

Write paths follow two patterns:

- **Immediate recompute:** used in attendance/overtime paths where staffing and
  cycle metrics should be fresh immediately
- **Dirty marker:** used in other write paths where the next Master Data read
  can refresh the operational cache

## Fallback Behavior

Master Data must still return a valid row if an operational snapshot is missing.

Required fallbacks:

- `staffingCoverageState`: staffing risk override, then base operator snapshot state
- `maintenanceOverdueDays`: derive from `robot.maintenance.lastMaintenance`
- `maintenanceState`: derive from base maintenance data
- `insufficientPartsCount`: derive from `robot.manufacturingData.partsConsumed`
- `bomCompletionStatus`: derive from `robot.manufacturingData.bomCompletionStatus`
- `bomState`: derive from base BOM data
- `cycleEfficiency`: `null`
- `cycleEfficiencyWindow`: `"unknown"`
- `metricFreshness.maintenance`: `robot.updatedAt`
- `metricFreshness.bom`: `robot.updatedAt`
- `metricFreshness.cycleEfficiency`: `undefined`

## Active vs Inactive Robots

This system does **not** currently gate operational snapshot computation by a
formal "active robot" definition.

Current behavior:

- A robot is recomputed when it is part of the requested Master Data result set,
  or when a write path dirties/recomputes it.
- The system does not first check whether the robot is actively sending live
  data or whether an app user is currently active on it.
- Inactive robots can still receive operational snapshot recomputation.
- Inactive robots usually fall back to lower-information states such as
  `cycleEfficiency = null` or `"unknown"` windows if recent app data is missing.

## Backend Test Plan

### 1. Contract Tests

Verify that `GET /api/v1/robots/master-data` still returns the same top-level
fields for a robot row:

- `staffingCoverageState`
- `maintenanceOverdueDays`
- `maintenanceState`
- `insufficientPartsCount`
- `bomCompletionStatus`
- `bomState`
- `cycleEfficiency`
- `cycleEfficiencyWindow`
- `metricFreshness`
- `fleet`
- `operator`
- `client`

### 2. Cache Hit Tests

Seed a Redis operational snapshot for a robot and verify:

- the Master Data row uses the cached operational values
- `cycleEfficiency` and freshness fields come from the cached snapshot
- no fallback values replace non-stale cached values

### 3. Missing Snapshot Fallback Tests

With no operational snapshot cached, verify:

- the Master Data row is still returned
- maintenance/BOM values are derived from the robot document
- `cycleEfficiency` is `null`
- `cycleEfficiencyWindow` is `"unknown"`

### 4. Dirty Marker Refresh Tests

Mark a robot operational snapshot dirty and verify:

- the next Master Data read recomputes that robot
- the Redis cached value is replaced
- the dirty marker is cleared after successful recompute

### 5. Attendance/Ontime Immediate Refresh Tests

After operator check-in/check-out or overtime check-in/check-out, verify:

- affected robot snapshots are recomputed immediately
- `staffingCoverageState` changes as expected
- `metricFreshness.staffing` is updated

### 6. Robot / BOM / Maintenance Dirtying Tests

After robot update or BOM completion, verify:

- the affected robot is marked dirty
- the next Master Data read refreshes the operational cache
- maintenance/BOM fields reflect the updated state

### 7. Full Cached Rebuild Tests

Call `GET /api/v1/masterdata/cached` or the manual refresh path and verify:

- the cached payload still rebuilds successfully
- it includes all robots
- operational snapshot fields follow the same DTO contract as the paginated API

### 8. Legacy Cron Flag Tests

Verify both modes:

- with the flag enabled, the legacy cron continues to schedule and run
- with the flag disabled, the worker skips the legacy recompute path

### 9. Performance Smoke Tests

Run a smoke test for:

- paginated Master Data with warm operational cache
- paginated Master Data with cold/missing operational cache
- full cached rebuild path

Record:

- total latency
- number of robots recomputed
- cache hit/miss ratio
