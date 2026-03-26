# AI Agent Manual Testing Guide

## Prerequisites
- Backend server running on `http://localhost:5000`
- Valid JWT token in Authorization header
- Test audio files OR text queries

## Testing Approach

Since we can't easily test voice in automated tests, we'll verify the AI agent by:
1. **Checking console logs** - The AI agent logs all function calls and decisions
2. **Testing with text transcriptions** - Simulate what the AI would receive after Whisper transcription
3. **Verifying API responses** - Check that correct functions are called with correct parameters

---

## Test Categories

### 1. OPERATOR QUERIES

#### Test: List All Operators
```bash
# What user says: "list all operators"
# Expected AI behavior:
# - Calls: listOperators()
# - Returns: List of operators with names and phone numbers
```

**Check Console Logs For:**
```
[AI Agent] Function: listOperators
[AI Agent] Result: { success: true, count: X, operators: [...] }
```

#### Test: Show Operators Page
```bash
# What user says: "show operators"
# Expected AI behavior:
# - Calls: listOperators() + navigateToPage("operators")
# - Returns: List of operators AND navigation to /operators page
```

---

### 2. CLIENT QUERIES (Physical Sites)

#### Test: List All Clients
```bash
# What user says: "list all clients"
# Expected AI behavior:
# - Calls: listClients()
# - Returns: List of client sites
```

#### Test: List Active Clients Only
```bash
# What user says: "list all active clients"
# Expected AI behavior:
# - Calls: listClients({ isActive: true })
# - Returns: Only active client sites
```

**Verify AI Understands Entity Type:**
- "list all sites" → Should call `listClients()` (sites = physical locations)
- "list all workers" → Should call `listOperators()` (workers = people)

---

### 3. ROBOT QUERIES (Smart Name Matching)

#### Test: List All Robots
```bash
# What user says: "list all robots"
# Expected AI behavior:
# - Calls: listRobots()
# - Returns: List of all robots
```

#### Test: List Idle Robots
```bash
# What user says: "list idle robots"
# Expected AI behavior:
# - Calls: listRobots({ status: "idle" })
# - Returns: Only robots with status="idle"
```

#### Test: Robot Name Variations (CRITICAL - Smart Matching)
```bash
# Test 1: "show robot MMR-31"
Expected: searchRobots("MMR-31") → Finds MMR-31

# Test 2: "show robot MMR 31" (with space)
Expected: searchRobots("MMR 31") → Normalizes to "mmr-31" → Finds MMR-31

# Test 3: "show robot 31" (just number)
Expected: searchRobots("31") → Normalizes to "mmr-31" → Finds MMR-31

# Test 4: "what is the status of robot 31"
Expected: searchRobots("31") + getRobotDetails() → Finds MMR-31 and returns status
```

**Check Console Logs For:**
```
[AI Agent] Searching robots with query: "MMR 31"
[AI Agent] Normalized variations: ["mmr-31", "mmr31"]
[AI Agent] Found 1 robots
[AI Agent] Robot IDs: ["MMR-31"]
```

---

### 4. MISSION EXECUTION (Smart Matching - CRITICAL)

#### Test: Mission with Exact Names
```bash
# What user says: "send MMR-31 to the kitchen in the office"
# Expected AI behavior:
# - Calls: executeRobotMission({ robotId: "MMR-31", pathMapName: "office", missionName: "kitchen" })
# - Smart normalization:
#   - Robot: "MMR-31" → ["mmr-31", "mmr31"] → Finds MMR-31
#   - PathMap: "office" → ["office", "office-1", "office 1"] → Finds office-1
#   - Mission: "kitchen" → ["kitchen", "the kitchen"] → Finds kitchen
# - Validates robot is autonomous
# - Returns: Mission execution data
```

**Check Console Logs For:**
```
[AI Agent] Executing mission: { robotId: "MMR-31", pathMapName: "office", missionName: "kitchen" }
[AI Agent] Robot search variations: ["mmr-31", "mmr31"]
[AI Agent] Found robot: MMR-31 (MMR-31)
[AI Agent] PathMap search variations: ["office", "office-1", "office 1", "office1"]
[AI Agent] Found pathmap: office-1
[AI Agent] Mission search variations: ["kitchen", "the kitchen"]
[AI Agent] Found mission "kitchen" using variation: "kitchen"
[AI Agent] Mission execution ready: { robot: "MMR-31", pathMap: "office-1", mission: "kitchen" }
```

#### Test: Mission with Name Variations (CRITICAL)
```bash
# What user says: "send robot 31 to kitchen in office 1"
# Expected AI behavior:
# - Calls: executeRobotMission({ robotId: "robot 31", pathMapName: "office 1", missionName: "kitchen" })
# - Smart normalization:
#   - Robot: "robot 31" → ["mmr-31", "mmr31"] → Finds MMR-31
#   - PathMap: "office 1" → ["office 1", "office-1", "office1"] → Finds office-1
#   - Mission: "kitchen" → ["kitchen"] → Finds kitchen
```

#### Test: Abort Mission
```bash
# What user says: "abort mission on robot 31"
# Expected AI behavior:
# - Calls: abortRobotMission({ robotId: "robot 31" })
# - Smart robot search: "robot 31" → Finds MMR-31
```

---

### 5. ANALYTICS QUERIES

#### Test: Top Performers
```bash
# What user says: "which robot has most trips"
# Expected AI behavior:
# - Calls: getTopPerformers({ type: "robots", metric: "trips" })
```

#### Test: Top 5 Operators
```bash
# What user says: "show top 5 operators"
# Expected AI behavior:
# - Calls: getTopPerformers({ type: "operators", metric: "trips", limit: 5 })
```

---

### 6. NAVIGATION COMMANDS

#### Test: Navigate to Dashboard
```bash
# What user says: "show dashboard"
# Expected AI behavior:
# - Calls: navigateToPage({ page: "dashboard" })
# - Returns: { navigate: true, path: "/dashboard" }
```

#### Test: Navigate to Leads
```bash
# What user says: "show leads"
# Expected AI behavior:
# - Calls: navigateToPage({ page: "leads" })
# - Returns: { navigate: true, path: "/leads" }
```

#### Test: All Navigation Pages
```bash
Test these commands:
- "show dashboard" → /dashboard
- "show leads" → /leads
- "show analytics" → /analytics
- "show inventory" → /inventory
- "show qc submissions" → /qc-submissions
- "show master data" → /master-data
- "show operators" → /operators
- "show clients" → /clients
- "show robots" → /robots
```

---

### 7. ENTITY DISAMBIGUATION

#### Test: Clients vs Operators
```bash
# What user says: "list all sites"
# Expected: Should call listClients() (sites = physical locations)

# What user says: "list all workers"
# Expected: Should call listOperators() (workers = people)

# What user says: "list all machines"
# Expected: Should call listRobots() (machines = robots)
```

---

## How to Monitor Tests

### 1. Watch Console Logs
```bash
# In one terminal, watch backend logs:
cd /home/shanks/Music/flo_web_app/mission-control
npm run dev

# Watch for logs like:
# [AI Agent] Searching robots with query: ...
# [AI Agent] Normalized variations: ...
# [AI Agent] Found X robots
```

### 2. Check Response Structure
Every AI agent response should include:
```json
{
  "success": true,
  "transcription": "list all operators",
  "response": "I found 15 operators...",
  "executedFunctions": [
    {
      "function": "listOperators",
      "arguments": {},
      "result": { "success": true, "count": 15, "operators": [...] }
    }
  ],
  "navigation": null,
  "dataHighlights": {},
  "missionExecution": null,
  "conversationId": "conv_..."
}
```

---

## Success Criteria

### ✅ PASS Criteria:
1. **Correct Function Calls**: AI calls the right function for each query
2. **Smart Name Matching**: "robot 31" finds "MMR-31", "office 1" finds "office-1"
3. **Entity Disambiguation**: AI distinguishes clients (sites) from operators (people)
4. **Navigation Works**: Navigation commands return correct paths
5. **Mission Execution**: Full mission execution with validation and smart matching
6. **Helpful Errors**: When something isn't found, AI provides suggestions

### ❌ FAIL Criteria:
1. AI doesn't call any functions (just responds with text)
2. AI calls wrong functions (e.g., listOperators when user asks for clients)
3. Smart matching fails (can't find "MMR-31" when given "robot 31")
4. No navigation data returned when user says "show X"
5. Generic error messages without suggestions

---

## Quick Test Checklist

- [ ] List operators works
- [ ] List clients works (not confused with operators)
- [ ] List robots works
- [ ] Robot "MMR-31" can be found with "robot 31"
- [ ] Robot "MMR-31" can be found with "31"
- [ ] Mission execution: "send MMR-31 to kitchen in office" works
- [ ] Mission execution: "send robot 31 to kitchen" works with smart matching
- [ ] Pathmap "office-1" can be found with "office" or "office 1"
- [ ] Mission "kitchen" can be found with "the kitchen"
- [ ] Navigate to dashboard works
- [ ] Navigate to leads works
- [ ] Navigate to all pages works
- [ ] Top performers query works
- [ ] Entity disambiguation: "sites" → clients, "workers" → operators

---

## Example Test Flow

1. **Start Backend**:
   ```bash
   cd /home/shanks/Music/flo_web_app/mission-control
   npm run dev
   ```

2. **Watch Logs** in terminal

3. **Use AI Voice Assistant** in frontend and say:
   - "list all operators"
   - "list all active clients"
   - "show robot 31"
   - "send robot 31 to kitchen in office"
   - "show dashboard"

4. **Verify** in console logs that:
   - Correct functions are called
   - Smart matching works (see normalized variations)
   - Results are returned
   - Navigation paths are correct

---

## Debugging Tips

If tests fail:

1. **Check Console Logs** for exact function calls and parameters
2. **Verify Smart Matching** - Look for "Normalized variations:" in logs
3. **Check AI System Prompt** - Is it giving clear instructions?
4. **Test with Simpler Queries** - Start with "list all robots" before complex missions
5. **Verify Database** - Do robots/pathmaps/missions exist in DB?

---

## Expected Console Output Example

When user says: **"send robot 31 to kitchen in office"**

```
Step 1: Transcribing audio...
Transcription: send robot 31 to kitchen in office

Step 2: Processing with AI...
Initial AI response: { hasToolCalls: true, toolCalls: [...] }

Step 3: Executing function calls...
Calling function: executeRobotMission { robotId: "robot 31", pathMapName: "office", missionName: "kitchen" }

[AI Agent] Executing mission: { robotId: "robot 31", pathMapName: "office", missionName: "kitchen" }
[AI Agent] Robot search variations: ["mmr-31", "mmr31"]
[AI Agent] Found robot: MMR-31 (MMR-31)
[AI Agent] PathMap search variations: ["office", "office-1", "office 1", "office1"]
[AI Agent] Found pathmap: office-1
[AI Agent] Mission search variations: ["kitchen", "the kitchen"]
[AI Agent] Found mission "kitchen" using variation: "kitchen"
[AI Agent] Mission execution ready: { robot: "MMR-31", pathMap: "office-1", mission: "kitchen" }

Function result: {
  success: true,
  action: "execute_mission",
  robot: { id: "MMR-31", name: "MMR-31", robotType: "autonomous" },
  pathMap: { id: "...", name: "office-1", frame: "utm" },
  mission: { id: "...", name: "kitchen", pathsCount: 5 },
  message: "Mission \"kitchen\" in \"office-1\" is ready to execute on MMR-31"
}

Step 4: Extracting navigation and highlights...
Step 5: Sending response
```

**✅ This is a PASS** - All steps completed successfully with smart matching!
