# AI Agent API Reference
Complete reference of all APIs available in the Flo Mobility Fleet Management System

---

## 1. OPERATOR APIs (People who operate robots)

### GET /api/v1/operators
**Purpose**: Get list of all operators
**Function**: `listOperators()`
**Use When**: "list all operators", "show operators", "get operators"

### POST /api/v1/operators/operator
**Purpose**: Get specific operator details by ID
**Function**: `getOperatorDetails(operatorId)`
**Use When**: "show operator X", "get details of operator Y"

### POST /api/v1/operators/fetchInRange
**Purpose**: Get operators within a geographic range
**Use When**: "find operators near location X"

### GET /api/v1/operators/:clientId/operators
**Purpose**: Get all operators assigned to a specific client/site
**Use When**: "show operators at client X"

### POST /api/v1/operators/operator/robots
**Purpose**: Get all robots assigned to an operator
**Use When**: "which robots are assigned to operator X"

---

## 2. CLIENT/SITE APIs (Physical locations where robots operate)

### GET /api/v1/clients
**Purpose**: Get current user's client details
**Function**: `getClientDetails()`
**Use When**: "show my client", "get my site details"

### GET /api/v1/clients/fetchAll
**Purpose**: Get list of all client sites
**Function**: `listClients(isActive)`
**Use When**: "list all clients", "show all sites", "list active clients"

### GET /api/v1/clients/:clientId
**Purpose**: Get specific client details
**Function**: `getClientDetails(clientId)`
**Use When**: "show client X", "get details of site Y", "what is client Z"

### GET /api/v1/clients/:clientId/operators
**Purpose**: Get all operators assigned to a client
**Use When**: "show operators at client X", "who works at site Y"

### PUT /api/v1/clients/:id/status
**Purpose**: Update client active/inactive status
**Use When**: "activate client X", "deactivate site Y"

**KEY DISTINCTION**:
- CLIENTS = Physical sites/locations where robots operate
- OPERATORS = People who work at those sites and operate robots

---

## 3. ROBOT APIs

### GET /api/v1/robots
**Purpose**: Get list of all robots for current user
**Function**: `listRobots(status, robotType, fleet)`
**Use When**: "list robots", "show all robots", "get idle robots", "find charging robots"

### GET /api/v1/robots/all
**Purpose**: Get ALL robots (admin only)
**Function**: `getAllRobotsForAdmin()`
**Use When**: "show all robots in system" (admin)

### POST /api/v1/robots/robot
**Purpose**: Get specific robot details
**Function**: `getRobotDetails(robotId)`
**Use When**: "show robot MMR-31", "get details of robot 17", "what is the status of robot X"

### POST /api/v1/robots/fetchInRange
**Purpose**: Get robots within geographic range
**Function**: `searchRobots()` for nearby
**Use When**: "find robots near location X"

### POST /api/v1/robots/robot/operators
**Purpose**: Get all operators assigned to a robot
**Use When**: "who operates robot X", "show operators for MMR-31"

### POST /api/v1/robots/set-active-operator
**Purpose**: Set the currently active operator for a robot
**Use When**: "assign operator X to robot Y"

### GET /api/v1/robots/:robotId/manufacturing-data
**Purpose**: Get manufacturing details of a robot
**Use When**: "show manufacturing data for robot X"

### GET /api/v1/robots/:robotId/motor-data
**Purpose**: Get battery and motor specifications
**Use When**: "show battery data for robot X", "get motor specs"

### GET /api/v1/robots/:robotId/tasks
**Purpose**: Get maintenance tasks for a robot
**Use When**: "show tasks for robot X", "what tasks does robot Y have"

---

## 4. PATHMAP & MISSION APIs

### GET /api/v1/pathmaps
**Purpose**: Get list of all pathmaps
**Function**: `listPathMaps(frame)`
**Use When**: "list all pathmaps", "show available maps"

### POST /api/v1/pathmaps
**Purpose**: Get specific pathmap details
**Function**: `getPathMapDetails(pathMapId)`
**Use When**: "show pathmap X", "get details of map Y"

### GET /api/v1/pathmaps/get-missions
**Purpose**: Get all missions across all pathmaps
**Function**: `getMissionsInPathMap(pathMapName)`
**Use When**: "list all missions", "show available missions for pathmap X"

### POST /api/v1/pathmaps/voice-mission
**Purpose**: Execute mission via voice command
**Use When**: AI voice assistant triggers mission execution
**Related Function**: `executeRobotMission(robotId, pathMapName, missionName)`

**MISSION EXECUTION**:
When user says "send robot X to kitchen" or "execute mission Y on robot Z":
1. Use `searchRobots()` to find the robot
2. Use `listPathMaps()` to find available pathmaps
3. Use `getMissionsInPathMap()` to validate mission exists
4. Use `executeRobotMission()` to execute

---

## 5. FLEET APIs

### GET /api/v1/fleet
**Purpose**: Get all fleet types
**Function**: `getFleetOverview(fleet)`
**Use When**: "show all fleets", "list fleet types"

### GET /api/v1/fleet/:id/robots
**Purpose**: Get all robots in a specific fleet
**Function**: `getRobotsByStatus()` filtered by fleet
**Use When**: "show robots in fleet X", "list MMR fleet robots"

### GET /api/v1/fleet/:id/maintenance
**Purpose**: Get maintenance steps for a fleet type
**Use When**: "show maintenance steps for fleet X"

### GET /api/v1/fleet/:id/parts-requirement
**Purpose**: Get parts consumption requirements for fleet
**Use When**: "what parts does fleet X need"

---

## 6. ATTENDANCE APIs

### POST /api/v1/attendance/fetch
**Purpose**: Get attendance records
**Use When**: "show attendance for operator X", "get today's attendance"

### POST /api/v1/attendance/fetchAll
**Purpose**: Get all attendance records (with filters)
**Use When**: "show all attendance today", "list attendance for client X"

### POST /api/v1/attendance/current-status
**Purpose**: Get current check-in status of operator
**Use When**: "is operator X checked in", "show attendance status"

### POST /api/v1/attendance/client
**Purpose**: Get attendance data for specific clients
**Use When**: "show attendance at client X", "get site Y attendance"

### POST /api/v1/attendance/leaves/requests/fetch
**Purpose**: Get leave requests
**Use When**: "show pending leave requests", "list leaves for operator X"

---

## 7. QC (Quality Check) APIs

### POST /api/v1/qc/submissions
**Purpose**: Create new QC submission
**Use When**: Operator starts quality check for robot

### GET /api/v1/qc/submissions/robot/:robotId
**Purpose**: Get latest QC submission for a robot
**Function**: Can be used for "show latest QC for robot X"
**Use When**: "what is the QC status of robot Y"

### GET /api/v1/qc/submissions/robot/:robotId/history
**Purpose**: Get QC history for a robot
**Use When**: "show QC history for robot X", "list all quality checks"

### GET /api/v1/qc/robot/:robotId/template
**Purpose**: Get QC template for specific robot based on fleet
**Use When**: "what QC checks are required for robot X"

---

## 8. INVENTORY APIs

### GET /api/v1/inventory
**Purpose**: Get inventory items
**Use When**: "show inventory", "list parts", "what parts do we have"

### POST /api/v1/inventory/usage
**Purpose**: Record part usage/consumption
**Use When**: "log part usage", "record inventory consumption"

---

## 9. SHIPMENT & LOGISTICS APIs

### GET /api/v1/shipments
**Purpose**: Get shipment records
**Use When**: "show shipments", "list deliveries"

### POST /api/v1/shipments/create
**Purpose**: Create new shipment
**Use When**: "create shipment for robot X"

---

## 10. ANALYTICS & REPORTING APIs

### POST /api/v1/analytics/trips
**Purpose**: Get trip analytics and statistics
**Function**: `getTripAnalytics(period, robotId, operatorId)`
**Use When**: "show trip stats", "how many trips today", "get analytics for robot X"

### POST /api/v1/analytics/top-performers
**Purpose**: Get top performing robots or operators
**Function**: `getTopPerformers(type, metric, period, limit)`
**Use When**: "which robot has most trips", "top 5 operators", "best performing robots"

---

## 11. MAINTENANCE APIs

### GET /api/v1/maintenance
**Purpose**: Get maintenance records
**Use When**: "show maintenance history", "list upcoming maintenance"

### POST /api/v1/maintenance/schedule
**Purpose**: Schedule maintenance for robot
**Use When**: "schedule maintenance for robot X"

---

## 12. AI AGENT APIs

### POST /api/v1/ai-agent/command
**Purpose**: Process voice command through OpenAI
**Input**: Audio file (WAV)
**Output**: Transcription + AI response + function execution results + navigation
**Use When**: User speaks into voice assistant

### GET /api/v1/ai-agent/history
**Purpose**: Get conversation history (future feature)

### DELETE /api/v1/ai-agent/history
**Purpose**: Clear conversation history (future feature)

---

## QUERY ROUTING LOGIC FOR AI AGENT

### CLIENT vs OPERATOR Disambiguation

When user query contains:
- "site", "location", "client" → Use CLIENT APIs
- "operator", "person", "employee", "worker" → Use OPERATOR APIs
- "active clients" → `listClients({ isActive: true })`
- "active operators" → `listOperators()`

### ROBOT Status Queries

- "idle robots" → `listRobots({ status: "idle" })`
- "charging robots" → `listRobots({ status: "charging" })`
- "active robots" → `listRobots({ status: "active" })`
- "robots in maintenance" → `listRobots({ status: "maintenance" })`
- "all robot statuses" → `getRobotsByStatus()`

### MISSION Queries

- "execute mission X on robot Y" → `executeRobotMission(robotId, pathMapName, missionName)`
- "abort mission on robot X" → `abortRobotMission(robotId)`
- "mission status of robot X" → `getRobotMissionStatus(robotId)`
- "available missions" → `listPathMaps()` + `getMissionsInPathMap()`

### ANALYTICS Queries

- "trip stats" → `getTripAnalytics({ period: "today" })`
- "robot X trips" → `getTripAnalytics({ robotId: "X" })`
- "operator Y performance" → `getTripAnalytics({ operatorId: "Y" })`
- "top performers" → `getTopPerformers({ type: "robots", metric: "trips" })`

### ATTENDANCE Queries

- "attendance today" → `fetchAllAttendance()`
- "is operator X present" → `getCurrentAttendanceStatus({ operatorId: "X" })`
- "attendance at client Y" → `fetchAttendanceDataForClients({ clientId: "Y" })`

### FLEET Queries

- "fleet overview" → `getFleetOverview()`
- "robots in fleet X" → `getFleetOverview({ fleet: "X" })`

---

## NAVIGATION MAPPING

When user asks to "show" or "navigate to" something:

- "show operators" → Navigate to `/operators`
- "show operator X" → Navigate to `/operators/:id`
- "show clients" → Navigate to `/clients`
- "show client X" → Navigate to `/clients/:id`
- "show robots" → Navigate to `/robots`
- "show robot X" → Navigate to `/robots/:id`
- "show leads" → Navigate to `/leads`
- "show lead X" → Navigate to `/leads/:id`
- "show dashboard" → Navigate to `/dashboard`
- "show analytics" → Navigate to `/analytics`
- "show pathmaps" → Navigate to `/pathmaps`
- "show inventory" → Navigate to `/inventory`
- "show qc submissions" → Navigate to `/qc-submissions`
- "show master data" → Navigate to `/master-data`
- "show shipping" → Navigate to `/shipping`

---

## FUNCTION PRIORITY ORDER

When user query is ambiguous, use this priority:

1. **Search/Find** → Use search functions (searchRobots, searchOperators, searchClients)
2. **List** → Use list functions (listRobots, listOperators, listClients)
3. **Details** → Use detail functions (getRobotDetails, getOperatorDetails, getClientDetails)
4. **Navigate** → If user says "show", also call navigateToPage
5. **Execute** → Only for explicit action commands (execute, abort, etc.)

---

## EXAMPLE VOICE COMMAND MAPPINGS

| User Query | API Calls | Functions |
|------------|-----------|-----------|
| "list all active clients" | GET /clients/fetchAll | `listClients({ isActive: true })` |
| "show operators at client X" | GET /clients/:id/operators | `searchClients("X")` + `getClientDetails()` |
| "which robot has most trips" | POST /analytics/top-performers | `getTopPerformers("robots", "trips")` |
| "show robot MMR-31" | POST /robots/robot | `searchRobots("MMR-31")` + `getRobotDetails()` + `navigateToPage("robot_profile")` |
| "list idle robots" | GET /robots | `listRobots({ status: "idle" })` |
| "send robot 17 to kitchen" | POST /pathmaps/voice-mission | `searchRobots("17")` + `executeRobotMission()` |
| "show attendance today" | POST /attendance/fetchAll | `fetchAllAttendance()` |
| "is operator X checked in" | POST /attendance/current-status | `searchOperators("X")` + `getCurrentAttendanceStatus()` |
| "QC status of robot Y" | GET /qc/submissions/robot/:id | `searchRobots("Y")` + `getLatestQCForRobot()` |
