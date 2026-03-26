# Automatic Checkout Plan
## Force Checkout for Operators Who Exceed Shift Duration + 2 Hours

### Current Problem
- Operators sometimes forget to check out after their shift ends
- Unclosed check-in sessions block new check-ins
- No automatic mechanism to close stale sessions
- Manual intervention required to fix stuck states

### Business Requirement
**"If operator's shift is over and operator has not checked out for more than 2 hours, report that and force checkout that operator"**

---

## Proposed Solution

### Option 1: Scheduled Job (Recommended)
Create a scheduled job that runs every hour to detect and auto-checkout overdue operators.

#### Implementation Steps:

**1. Create New Scheduled Job**
- File: `backend/jobs/autoCheckoutJob.ts`
- Uses existing queue infrastructure (similar to `checkExpiredOvertimeJob`)
- Runs every 1 hour (configurable)

**2. Detection Logic**
```typescript
For each active check-in:
  Calculate: shiftEndTime = checkInTime + shiftDuration + grace period (2 hours)
  If currentTime > shiftEndTime:
    - Mark as "overdue"
    - Create forced check-out entry
    - Send notification email to admin
    - Send push notification to operator (optional)
```

**3. Shift Duration Calculation**
- **Regular shifts**: Use `client.operatingHours` (typically 8 hours)
- **Overtime shifts**: Use `overtimeApprovedDuration` from request

**4. Grace Period**
- **2 hours** after expected shift end time
- Configurable via environment variable: `AUTO_CHECKOUT_GRACE_HOURS=2`

**5. What Gets Created**
```typescript
// For regular shifts: Create check-out entry
await attendanceModel.create({
  metadata: {
    operatorId,
    clientId,
    entryType: "checkOut"
  },
  startingTimestamp: autoCheckoutTime,
  location: lastKnownLocation || clientLocation, // Fallback to client site
  isAutoCheckout: true, // NEW FLAG to mark forced checkouts
  autoCheckoutReason: "Exceeded shift duration + 2 hour grace period"
});

// For overtime shifts: Update check-in record
checkInEntry.overtimeEndTime = new Date(autoCheckoutTime);
checkInEntry.isAutoCheckout = true;
checkInEntry.autoCheckoutReason = "Exceeded approved duration + 2 hour grace period";
await checkInEntry.save();
```

**6. Notification System**
- **Email to Admin**: Alert that operator was force-checked-out
  - Subject: "Auto Checkout - {operatorName} at {clientName}"
  - Body: Include shift details, expected vs actual duration, reason
- **Push Notification to Operator** (Optional): Inform them they were auto-checked-out
- **Logging**: Detailed logs for audit trail

---

### Option 2: Real-time Checker (Alternative)
Monitor during each check-in attempt and auto-close previous unclosed sessions.

#### Implementation:
- Add logic to `handleOperatorCheckIn` controller (lines 400-435)
- When detecting unclosed previous check-in:
  - Instead of throwing error, auto-close it if > 2 hours overdue
  - Then proceed with new check-in

#### Pros:
- No scheduled job needed
- Fixes issue immediately when operator tries to check in

#### Cons:
- Only triggers when operator attempts new check-in
- Doesn't fix issue if operator never checks in again
- Less proactive than scheduled job

---

### Option 3: Hybrid Approach (Best)
Combine both options:
1. **Scheduled job**: Runs every hour to clean up overdue sessions
2. **Check-in validation**: Also checks and auto-closes during new check-in attempts

---

## Detailed Implementation Plan (Option 1 - Scheduled Job)

### Phase 1: Database Schema Updates

**1. Add new fields to `attendanceModel.ts`:**
```typescript
interface AttendanceData {
  // ... existing fields ...
  isAutoCheckout?: boolean;
  autoCheckoutReason?: string;
  autoCheckoutTime?: Date;
}
```

**2. Update schema:**
```typescript
const attendanceSchema = new Schema({
  // ... existing fields ...
  isAutoCheckout: {
    type: Boolean,
    default: false
  },
  autoCheckoutReason: {
    type: String
  },
  autoCheckoutTime: {
    type: Date
  }
});
```

---

### Phase 2: Create Auto-Checkout Job

**File**: `backend/jobs/autoCheckoutJob.ts`

**Responsibilities:**
1. Find all unclosed check-ins (both regular and overtime)
2. Calculate if they're overdue (shift duration + 2 hours passed)
3. Auto-create check-out for overdue sessions
4. Send notification emails
5. Update robot snapshots (set `checkedInToday` to false)
6. Invalidate master data cache

**Pseudocode:**
```typescript
export const autoCheckoutJob = async () => {
  const AUTO_CHECKOUT_GRACE_HOURS = Number(process.env.AUTO_CHECKOUT_GRACE_HOURS) || 2;
  const now = Date.now();

  // Find all unclosed regular check-ins
  const unclosedRegularCheckIns = await attendanceModel.find({
    "metadata.entryType": "checkIn",
    isOvertimeSession: { $ne: true },
    // No corresponding check-out exists
  });

  for (const checkIn of unclosedRegularCheckIns) {
    // Get client to determine shift duration
    const client = await clientModel.findById(checkIn.metadata.clientId);
    const shiftHours = client?.operatingHours || 8;

    const checkInTime = checkIn.startingTimestamp;
    const expectedCheckOutTime = checkInTime + (shiftHours * 60 * 60 * 1000);
    const graceDeadline = expectedCheckOutTime + (AUTO_CHECKOUT_GRACE_HOURS * 60 * 60 * 1000);

    if (now > graceDeadline) {
      // Check if check-out already exists (race condition check)
      const existingCheckOut = await attendanceModel.findOne({
        "metadata.operatorId": checkIn.metadata.operatorId,
        "metadata.clientId": checkIn.metadata.clientId,
        "metadata.entryType": "checkOut",
        startingTimestamp: { $gte: checkInTime }
      });

      if (!existingCheckOut) {
        // Create forced check-out
        await createAutoCheckout(checkIn, graceDeadline);

        // Send notifications
        await sendAutoCheckoutNotification(checkIn, graceDeadline);
      }
    }
  }

  // Find all unclosed overtime check-ins
  const unclosedOvertimeCheckIns = await attendanceModel.find({
    "metadata.entryType": "checkIn",
    isOvertimeSession: true,
    overtimeEndTime: { $exists: false }
  });

  for (const checkIn of unclosedOvertimeCheckIns) {
    const approvedHours = checkIn.overtimeApprovedDuration || 2;
    const checkInTime = new Date(checkIn.overtimeStartTime || checkIn.startingTimestamp).getTime();
    const expectedCheckOutTime = checkInTime + (approvedHours * 60 * 60 * 1000);
    const graceDeadline = expectedCheckOutTime + (AUTO_CHECKOUT_GRACE_HOURS * 60 * 60 * 1000);

    if (now > graceDeadline) {
      // Update overtime check-in with auto-checkout
      checkIn.overtimeEndTime = new Date(graceDeadline);
      checkIn.isAutoCheckout = true;
      checkIn.autoCheckoutReason = `Exceeded approved duration (${approvedHours}h) + ${AUTO_CHECKOUT_GRACE_HOURS}h grace period`;
      checkIn.autoCheckoutTime = new Date(graceDeadline);
      await checkIn.save();

      // Send notifications
      await sendAutoCheckoutNotification(checkIn, graceDeadline);
    }
  }
};
```

---

### Phase 3: Register Job in Queue System

**File**: `backend/queues/scheduledJobs.ts` (or similar)

```typescript
import { autoCheckoutQueue } from "./autoCheckoutQueue";

// Schedule auto-checkout job to run every hour
await autoCheckoutQueue.add(
  "auto-checkout",
  {},
  {
    repeat: {
      every: 60 * 60 * 1000 // 1 hour
    }
  }
);
```

---

### Phase 4: Notification Templates

**Email Template** (`backend/emails/autoCheckoutEmail.ts`):

```typescript
Subject: Auto Checkout - {operatorName} at {clientName}

Body:
Automatic Checkout Alert

Operator: {operatorName}
Client: {clientName}
Session Type: {Regular/Overtime}

Check-in Time: {checkInTime}
Expected Checkout: {expectedCheckoutTime}
Auto Checkout Time: {autoCheckoutTime}
Overtime by: {overtimeHours} hours

Shift Duration: {actualHours} hours ({expectedHours}h shift + {graceHours}h grace)

Reason: Operator did not check out within grace period.

This operator has been automatically checked out.
```

---

### Phase 5: Mobile App Handling

**1. Display Auto-Checkout Info**
- When fetching attendance history, show if checkout was automatic
- UI indicator: "Auto checked-out" badge or icon
- Show reason in details view

**2. State Recovery**
- `stateRecoveryService` should handle auto-checkouts correctly
- Ensure local state syncs with server after auto-checkout

**3. Push Notification** (Optional)
```typescript
{
  title: "Automatic Checkout",
  body: "You were automatically checked out from your {shift type} shift at {time}. You exceeded your shift duration by {hours} hours."
}
```

---

### Phase 6: Backend API Changes

**Option 1**: No API changes needed (job runs independently)

**Option 2** (Hybrid): Update check-in validation
```typescript
// In attendanceController.ts, lines 400-435
if (previousCheckIn && !previousCheckOut) {
  // NEW: Check if overdue and auto-close instead of rejecting
  const shiftHours = client?.operatingHours || 8;
  const checkInTime = previousCheckIn.startingTimestamp;
  const graceDeadline = checkInTime + ((shiftHours + AUTO_CHECKOUT_GRACE_HOURS) * 60 * 60 * 1000);

  if (Date.now() > graceDeadline) {
    logger.info(`Auto-closing overdue session for operator ${operatorId}`);
    await createAutoCheckout(previousCheckIn, graceDeadline);
    // Continue with new check-in
  } else {
    // Still within grace period - reject as before
    res.status(400);
    throw new Error("You have not checked out from your previous shift...");
  }
}
```

---

## Configuration

### Environment Variables
```bash
# Auto-checkout settings
AUTO_CHECKOUT_ENABLED=true
AUTO_CHECKOUT_GRACE_HOURS=2
AUTO_CHECKOUT_JOB_INTERVAL=3600000  # 1 hour in ms
AUTO_CHECKOUT_EMAIL_RECIPIENTS=tahir@flomobility.com,contact@flomobility.com
```

---

## Testing Plan

### Unit Tests
1. Test grace period calculation
2. Test auto-checkout for regular shifts
3. Test auto-checkout for overtime shifts
4. Test notification sending
5. Test robot snapshot updates

### Integration Tests
1. Test scheduled job execution
2. Test email delivery
3. Test state recovery after auto-checkout
4. Test concurrent check-in attempts during auto-checkout

### Manual Testing
1. Create test operator with unclosed shift
2. Wait for job to run (or trigger manually)
3. Verify auto-checkout created
4. Verify email sent
5. Verify operator can check in again
6. Check mobile app displays auto-checkout correctly

---

## Migration

### Existing Data
- **No migration needed** - new fields are optional
- Existing attendance records work as before
- Only NEW auto-checkouts will have the flags

### Backward Compatibility
- Mobile app should gracefully handle missing `isAutoCheckout` field
- Web admin panel should display auto-checkout indicator when present

---

## Monitoring & Alerts

### Metrics to Track
1. **Number of auto-checkouts per day** - High numbers indicate systemic issue
2. **Average overtime duration** - How much operators exceed shifts
3. **Operators with frequent auto-checkouts** - Training/discipline needed

### Dashboard (Optional)
- Admin panel showing:
  - Recent auto-checkouts
  - Operators with multiple auto-checkouts
  - Trends over time

---

## Alternative: Simpler Immediate Fix (Manual Script)

For NOW, create a one-time script to fix the current stuck operator:

**File**: `backend/scripts/forceCheckoutOperator.ts`

```typescript
// Usage: npx tsx scripts/forceCheckoutOperator.ts {operatorId} {clientId}
// Forces checkout for operator's unclosed session
```

This can be used immediately while we implement the full automated solution.

---

## Summary

### Recommended Approach
**Hybrid: Scheduled Job + Check-in Validation**

**Benefits:**
✅ Proactive cleanup (scheduled job)
✅ Immediate fix during check-in attempts
✅ Comprehensive notifications
✅ Audit trail with auto-checkout flags
✅ Prevents future stuck states

**Timeline:**
- Phase 1 (Schema): 30 minutes
- Phase 2-3 (Job): 2-3 hours
- Phase 4 (Notifications): 1 hour
- Phase 5 (Mobile): 1-2 hours
- Phase 6 (API): 1 hour
- Testing: 2-3 hours

**Total**: 1 day of development

---

## Questions to Clarify

1. **Grace period**: Confirm 2 hours is acceptable?
2. **Location for auto-checkout**: Use client site location or last known operator location?
3. **Notifications**: Email only, or also push notifications to operator?
4. **Frequency**: Run job every 1 hour, or different interval?
5. **Retroactive**: Should we auto-close ALL existing unclosed sessions on first run?
6. **Admin override**: Should admins be able to disable auto-checkout for specific operators?
