# Master AI Agent - Updates Needed

## Current Status ✅

The Master AI Agent (`aiAgentService.ts`) ALREADY has:
- ✅ **Information retrieval** (search robots, operators, clients)
- ✅ **Command execution** (execute missions, abort missions)
- ✅ **Navigation** (navigate to pages)
- ✅ **Smart disambiguation** for robots, pathmaps, missions
- ✅ 21 function definitions total

## What's Missing ❌

Based on the PAGES_AND_DATA_ANALYSIS.md document, the Master Agent is missing critical filtering and querying capabilities:

### 1. **Issues Management** ❌
**User Query**: "How many open issues are there today?"

**Missing Functions**:
```typescript
listIssues(args: {
  status?: "open" | "resolved" | "in_progress";
  dateFrom?: string;  // ISO date
  dateTo?: string;    // ISO date
  priority?: "critical" | "high" | "medium" | "low";
  clientId?: string;
  robotId?: string;
})

getIssuesByDateRange(args: {
  startDate: string;  // "today", "yesterday", or ISO date
  endDate?: string;
  status?: string;
})

searchIssues(args: {
  query: string;  // Search in title/description
  filters?: {
    status?: string;
    priority?: string;
    dateRange?: { from: string; to: string; }
  }
})
```

**API Endpoint**: `GET /api/v1/issues` (with query params)

---

### 2. **Overtime Management** ❌
**User Query**: "Show me all operators who worked overtime this week"

**Missing Functions**:
```typescript
listOvertimeRequests(args: {
  status?: "approved" | "rejected" | "pending";
  dateFrom?: string;
  dateTo?: string;
  operatorId?: string;
})

getOvertimeByPeriod(args: {
  period: "today" | "week" | "month";
  status?: string;
})
```

**API Endpoint**: `GET /api/v1/overtime` (with query params)

---

### 3. **Sessions/Trips Analytics** ❌
**User Query**: "Total distance traveled by MMR-31 this month"

**Missing Functions**:
```typescript
getRobotSessions(args: {
  robotId: string;
  dateFrom?: string;
  dateTo?: string;
  tripStatus?: "completed" | "active" | "error";
})

getTripStats(args: {
  robotId?: string;
  period: "today" | "week" | "month" | "custom";
  dateFrom?: string;  // For custom
  dateTo?: string;    // For custom
})
```

**API Endpoints**:
- `GET /api/v1/robots/:robotId/sessions`
- Analytics aggregation endpoints

---

### 4. **Inventory Management** ❌
**User Query**: "Which inventory items are low stock?"

**Missing Functions**:
```typescript
listInventory(args: {
  type?: "mechanical" | "electronics";
  lowStock?: boolean;  // Items below minQuantity
  category?: string;
})

searchInventory(args: {
  query: string;  // Search by name
  filters?: {
    type?: string;
    lowStock?: boolean;
  }
})
```

**API Endpoint**: `GET /api/v1/inventory`

---

### 5. **Billing** ❌
**User Query**: "What's the total billing for last month?"

**Missing Functions**:
```typescript
getBillingByPeriod(args: {
  period: "month" | "week" | "custom";
  dateFrom?: string;
  dateTo?: string;
  robotId?: string;
  clientId?: string;
})

getBillingSummary(args: {
  groupBy?: "robot" | "client" | "date";
  dateRange?: { from: string; to: string; }
})
```

**API Endpoint**: `GET /api/v1/billing`

---

### 6. **Materials Management** ❌
**User Query**: "List all materials for autonomous robots"

**Missing Functions**:
```typescript
listMaterials(args: {
  robotType?: "autonomous" | "manual";
  clientId?: string;
})

searchMaterials(args: {
  query: string;
})
```

**API Endpoint**: `GET /api/v1/materials`

---

### 7. **Shipping Management** ❌
**User Query**: "Show recent shipments"

**Missing Functions**:
```typescript
listShipments(args: {
  type?: "robot" | "miscellaneous";
  status?: "in_transit" | "delivered" | "pending";
  dateFrom?: string;
  dateTo?: string;
})
```

**API Endpoint**: `GET /api/v1/shipments`

---

### 8. **Enhanced Date Handling** ❌

**Date Parsing Utility Needed**:
```typescript
// Convert natural language to dates
parseDateQuery(query: string): { from: Date; to: Date } {
  switch (query) {
    case "today":
      return { from: startOfDay(new Date()), to: endOfDay(new Date()) };
    case "yesterday":
      return { from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) };
    case "this week":
      return { from: startOfWeek(new Date()), to: endOfWeek(new Date()) };
    case "last week":
      return { from: startOfWeek(subWeeks(new Date(), 1)), to: endOfWeek(subWeeks(new Date(), 1)) };
    case "this month":
      return { from: startOfMonth(new Date()), to: endOfMonth(new Date()) };
    case "last month":
      return { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) };
  }
}
```

---

## Implementation Plan

### Phase 1: Add Issue Management ✅ Priority
1. Add `issueModel` import
2. Add `listIssues` function definition
3. Add `getIssuesByDateRange` function definition
4. Add `searchIssues` function definition
5. Implement functions in AIAgentFunctions class
6. Add to executeFunctionCall switch statement
7. Test: "How many open issues today?"

### Phase 2: Add Date Utilities
1. Install date-fns if not already: `npm install date-fns`
2. Create `parseDateQuery` utility
3. Use in all time-based queries

### Phase 3: Add Overtime Management
1. Add `overtimeModel` import (or appropriate model)
2. Add function definitions
3. Implement functions
4. Test: "Show overtime requests this week"

### Phase 4: Add Enhanced Analytics
1. Add session/trip querying functions
2. Add distance/stats calculations
3. Test: "Total trips for MMR-31 this month"

### Phase 5: Add Inventory/Materials/Billing/Shipping
1. Add remaining function definitions
2. Implement query logic with filters
3. Test various queries

---

## Frontend Changes Needed

### Remove Agent Type Selector

**File**: `/mission-control-frontend/src/components/UnifiedVoiceAssistant.tsx`

**Changes**:
1. Remove `agentType` state (keep only ONE agent)
2. Remove agent selector buttons in UI
3. Use ONLY `/api/v1/ai-agent/command` endpoint (Master Agent)
4. Keep unified purple/emerald theme (choose one)
5. Update example commands to show BOTH information AND commands:
   ```typescript
   const exampleCommands = [
     "How many open issues today?",  // Information query
     "Send MMR-31 to kitchen",        // Command execution
     "List all robots",                // Information query
     "Navigate to operators page"      // Navigation
   ];
   ```

---

## Testing Checklist

### Information Queries
- [ ] "How many open issues are there today?"
- [ ] "Show me all robots at office client"
- [ ] "Which inventory items are low stock?"
- [ ] "What's total billing for last month?"
- [ ] "List operators who worked overtime this week"
- [ ] "Total distance traveled by MMR-31 this month"

### Command Execution
- [ ] "Send MMR-31 to kitchen"
- [ ] "Abort mission on robot 31"
- [ ] "Pause mission"

### Navigation
- [ ] "Show me all robots" → Navigate to /robots
- [ ] "Open issues page" → Navigate to /issues
- [ ] "Go to analytics" → Navigate to /analytics

### Combined Queries
- [ ] "Show me MMR-31 details and navigate to its page"
- [ ] "How many robots are active right now?"
- [ ] "List all missions in warehouse pathmap"

---

## Success Criteria

✅ User can ask filtering questions:
- "issues created today"
- "overtime requests this week"
- "robots offline right now"

✅ User can execute commands:
- "send robot to station"
- "abort mission"
- "create pathmap"

✅ User can navigate:
- "show me robots"
- "open issues page"
- "go to analytics"

✅ Single voice assistant for everything (no tabs/agent selector)

✅ Voice assistant accessible on ALL pages (already done via App.tsx)

---

## Current Status Summary

### What Works ✅
- Robot search/details/list
- Operator search/details/list
- Client search/details/list
- PathMap list/details
- Mission execution with disambiguation
- Mission abort
- Fleet overview
- Navigation to pages
- Top performers (placeholder)

### What Needs Implementation ❌
1. **Issues** with date filtering
2. **Overtime** queries
3. **Enhanced analytics** with sessions/trips
4. **Inventory** queries (low stock, search)
5. **Billing** summaries by period
6. **Materials** listing
7. **Shipping** tracking
8. **Date parsing utility** for natural language dates

### Frontend ❌
1. Remove agent type selector
2. Use single endpoint
3. Update example commands
4. Choose unified color theme
