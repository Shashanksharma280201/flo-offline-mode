# Robot Master Data Optimization

## Issue

**Error:** `429 Too Many Requests` on the Robot Master Data page

**Root Cause:** The `getRobotsMasterData` API endpoint was making approximately **204 database queries** per page load for 100 robots:

| Query Type | Count |
|------------|-------|
| MongoDB find with 3 nested populates | 1 |
| Trip count queries (per robot) | 100 |
| Open issues count queries (per robot) | 100 |
| Attendance check-in batch query | 1 |
| Redis status queries (per robot) | 100 |
| **Total** | **~204 queries** |

This excessive querying triggered rate limiting on the production server.

---

## Solution

**Approach:** Denormalization with pre-stored snapshot data

Instead of querying multiple collections at runtime, we now store computed/related data directly on the Robot document and update it when events occur.

### New Fields Added to Robot Model

```typescript
// Snapshot fields (updated on assignment)
operatorSnapshot?: {
  id: string;
  name: string;
  phoneNumber: string;
  checkedInToday: boolean;
  lastCheckInTime?: Date;
}

clientSnapshot?: {
  id: string;
  name: string;
  location?: { lat: number; lng: number };
  operatingHours?: number;
}

fleetSnapshot?: {
  id: string;
  name: string;
  prefix: string;
}

// Pre-computed counts
openIssuesCount: number;      // Updated on issue raise/close
yesterdayTripCount: number;   // Updated daily via scheduled job
```

### Query Reduction

| Metric | Before | After |
|--------|--------|-------|
| Queries per page load | ~204 | 2 |
| Query reduction | - | **99%** |

After optimization:
- **1 MongoDB query** (no populates - uses snapshot fields)
- **1 batched Redis call** (for real-time robot status)

---

## How Data Stays Updated

### Event-Driven Updates

| Data | When Updated | Controller |
|------|--------------|------------|
| `operatorSnapshot` | Operator assigned to robot | `setActiveOperator` |
| `clientSnapshot` | Operator assigned to robot | `setActiveOperator` |
| `fleetSnapshot` | Fleet assigned to robot | `updateRobot` |
| `openIssuesCount` | Issue raised | `raiseRobotIssue` (+1) |
| `openIssuesCount` | Issue closed | `closeRobotIssue` (-1) |
| `checkedInToday` | Operator checks in | `handleOperatorCheckIn` |

### Scheduled Job (Automatic Daily)

A scheduled job runs at **midnight IST** every day:

- Resets `checkedInToday` to `false` for all robots
- Resets `isActive` to `false` for all operators
- Calculates and stores `yesterdayTripCount` for each robot

This job is registered in `server.ts` and runs automatically.

---

## Files Modified

1. **`backend/models/robotModel.ts`**
   - Added snapshot types and schema fields

2. **`backend/controllers/robotController.ts`**
   - `updateRobot`: Updates `fleetSnapshot`
   - `removeAppUserFromRobot`: Clears snapshots when active operator removed
   - `setActiveOperator`: Updates `operatorSnapshot` and `clientSnapshot`
   - `getRobotsMasterData`: Simplified to use pre-stored snapshot data

3. **`backend/controllers/issueController.ts`**
   - `raiseRobotIssue`: Increments `openIssuesCount`
   - `closeRobotIssue`: Decrements `openIssuesCount`

4. **`backend/controllers/attendanceController.ts`**
   - `handleOperatorCheckIn`: Updates `checkedInToday` and `lastCheckInTime`

5. **`backend/workers/scheduledJobsWorker.ts`**
   - Added `dailyRobotDataReset` job

6. **`backend/server.ts`**
   - Added scheduled job registration for `daily-robot-data-reset`

7. **`backend/scripts/backfillRobotSnapshots.ts`** (NEW)
   - One-time migration script for existing robots

---

## Deployment Steps

### Step 1: Deploy Code Changes

Deploy the updated code to your server.

### Step 2: Run Backfill Script (One-Time Only)

This script populates the new snapshot fields for existing robots in the database.

**Command:**

```bash
cd /path/to/mission-control

MONGO_URI="your-mongodb-connection-string" npx tsx backend/scripts/backfillRobotSnapshots.ts
```

**Example:**

```bash
MONGO_URI="mongodb://user:password@host:27017/mission-control?authSource=admin" npx tsx backend/scripts/backfillRobotSnapshots.ts
```

**Expected Output:**

```
Connecting to MongoDB...
Connected to MongoDB successfully

Found 79 robots to process

Progress: 50/79 robots processed (50 updated, 0 errors)

========================================
BACKFILL COMPLETE
========================================
Total robots processed: 79
Successfully updated: 79
Errors: 0
========================================

Disconnected from MongoDB
```

### Step 3: Verify

1. Check the Robot Master Data page loads without 429 errors
2. Verify operator, client, and fleet data displays correctly
3. Check server logs at midnight IST to confirm scheduled job runs

---

## Troubleshooting

### Backfill Script Errors

If you see errors like `Schema hasn't been registered for model "Client"`:
- Ensure you're using the latest version of the script
- The script imports `clientModel` to register the schema

### Data Not Showing After Backfill

If snapshot data is empty after backfill:
- Verify the robot has an assigned operator (`activeOperator` or `appUsers`)
- Verify the operator has a client assigned (`clientId`)
- Run the backfill script again if needed

### Scheduled Job Not Running

Check server logs for:
- `daily-robot-data-reset` job registration on startup
- Job execution logs at midnight IST

---

## Notes

- The backfill script is **run only once** after deployment
- All subsequent updates happen **automatically** through event handlers and the scheduled job
- Redis status queries remain real-time (not cached) as robot status changes frequently

---

*Document created: November 2024*
*Related to: 429 Rate Limit Error Fix on Robot Master Data Page*
