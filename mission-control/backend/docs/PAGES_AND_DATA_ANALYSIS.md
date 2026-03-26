# Mission Control Frontend - Pages and Data Analysis

**Generated:** 2026-02-13
**Purpose:** Comprehensive documentation of all pages, routes, data models, API endpoints, filters, and key actions for the Master AI Agent integration.

---

## Table of Contents

1. [Dashboard & Control](#dashboard--control)
2. [Robots Management](#robots-management)
3. [Issues Tracking](#issues-tracking)
4. [Operators Management](#operators-management)
5. [Clients/Sites Management](#clientssites-management)
6. [Fleet Management](#fleet-management)
7. [Sessions & Analytics](#sessions--analytics)
8. [Leads Management](#leads-management)
9. [Overtime Management](#overtime-management)
10. [Inventory Management](#inventory-management)
11. [Materials Management](#materials-management)
12. [Billing Summary](#billing-summary)
13. [Shipping Management](#shipping-management)
14. [Master Data](#master-data)
15. [Data Models Reference](#data-models-reference)
16. [Common Query Patterns](#common-query-patterns)

---

## Dashboard & Control

### Page: Dashboard (Mission Control)
**Route:** `/dashboard`
**Component:** `/src/pages/Dashboard.tsx`

#### Purpose
Real-time robot control center with teleoperations, mission management, and live robot feedback.

#### Data Displayed
- **Robot Status:** Online/offline status, current mission state
- **Active Mission:** Mission name, progress, path execution status
- **Mission Feedback:** Real-time feedback from `/path_mission/feedback` ROS topic
- **Path Maps:** Available path maps for mission execution
- **Teleops Video:** Live video stream from robot (if available)
- **ROS Logs:** Real-time logs from `/rosout` and `/alerts` topics

#### API Endpoints & ROS Services
- **ROS Service:** `/path_mission/get_state` - Check for active missions
- **ROS Topic:** `/path_mission/result` - Mission completion/abort results
- **ROS Topic:** `/path_mission/feedback` - Mission progress feedback
- **ROS Topic:** `/rosout` - General ROS logs
- **ROS Topic:** `/alerts` - Critical robot alerts
- **REST API:** `getPathMapById(pathMapId)` - Fetch path map details

#### Filters/Query Parameters
- None (single robot context selected via global state)

#### Key Actions
- **Connect to Robot:** Establish ROS bridge connection
- **Execute Mission:** Send mission to robot via ROS
- **Abort Mission:** Cancel currently executing mission
- **Toggle Teleops Panel:** Show/hide teleoperations overlay
- **Switch Views:** Toggle between Mission Control / Teleops / Live Data Dashboard

#### Data Models
```typescript
PathMap {
  _id: string
  name: string
  missions: Mission[]
}

Mission {
  _id: string
  name: string
  paths: Path[]
}

MissionFeedback {
  goal_id: string
  number_of_paths_done: number
}
```

---

## Robots Management

### Page: Robots List
**Route:** `/robots`
**Component:** `/src/pages/Robots.tsx`

#### Purpose
Central hub for viewing and managing all robots in the fleet.

#### Data Displayed
- **Robot Cards:** Name, status (Active/Offline), recent issues badge
- **Robot Map View:** Geographic location of all robots (optional toggle)
- **Connection Status:** Real-time online/offline status
- **Issue Indicators:** Visual badge for robots with open issues in past 2 days

#### API Endpoints
- **GET** `/api/v1/users/robots` - Fetch list of robots accessible to user
- Returns `Robot[]` array with status and metadata

#### Filters/Query Parameters
- **Search:** Filter robots by name (client-side regex)
- **Status:** Implicit filtering by online/offline status

#### Key Actions
- **Launch Robot:** Opens robot launchpad (connects to robot)
- **Create Robot:** Add new robot to fleet (if permissions allow)
- **Search Robots:** Filter by name using "/" keyboard shortcut
- **View Map:** Toggle geographic map view of robot locations
- **Navigate to Robot:** Click robot card to view robot details

#### Data Models
```typescript
RobotType {
  id: string
  name: string
  image?: string
  status: "Active" | "Offline" | string
  recentOpenIssuesCount?: number
  client?: ClientData
}
```

---

### Page: Robot Details
**Route:** `/robots/:robotId/profile`
**Component:** `/src/features/robots/robot/Robot.tsx` → `RobotProfile`

#### Purpose
Detailed view of a specific robot with tabs for profile, issues, operators, manufacturing data, tasks, and billing.

#### Sub-Routes
- `/robots/:robotId/profile` - Robot profile and configuration
- `/robots/:robotId/issues` - Robot-specific issues list
- `/robots/:robotId/operators` - Assigned operators
- `/robots/:robotId/manufacturing-data` - Manufacturing/assembly data
- `/robots/:robotId/motor-data` - Motor diagnostics
- `/robots/:robotId/tasks` - Assigned tasks
- `/robots/:robotId/shipping` - Shipping information
- `/robots/:robotId/billing` - Billing history

#### Data Displayed (Profile Tab)
- Robot metadata (name, serial, model, firmware version)
- Client assignment
- Hardware configuration
- Operational statistics

#### API Endpoints
- **GET** `/api/v1/robots/:robotId` - Fetch robot details
- **PUT** `/api/v1/robots/:robotId` - Update robot configuration

---

## Issues Tracking

### Page: Issues
**Route:** `/issues`
**Component:** `/src/pages/Issues.tsx`

#### Purpose
Comprehensive issue tracking and management across all robots and clients.

#### Data Displayed
- **Issue List:** Paginated list of issues with title, robot, client, status, category
- **Issue Status:** Open/Closed
- **Issue Type:** Mechanical, Electrical, Downtime, Observation, Other
- **Issue Subcategories:** Specific problem types (e.g., "Tyre Issue", "Motor Issue")
- **Timestamps:** Raised date, closed date
- **Thread Count:** Number of messages in issue thread
- **Pagination Info:** Current page, total pages, total count

#### API Endpoints
- **POST** `/api/v1/issues/query` - Query issues with filters (paginated)
  ```typescript
  Payload: {
    startingTimestamp?: number
    endingTimestamp?: number
    robotId?: string
    clientId?: string
    searchValue?: string
    issueStatus?: "All" | "Open" | "Closed"
    typeOfIssue?: "All" | "Mechanical" | "Electrical" | "Downtime" | "Observation" | "Other"
    issueSubCategory?: string
    page: number
  }
  ```
- **GET** `/api/v1/issues/export` - Export issues to Excel (no pagination)
- **POST** `/api/v1/issues` - Fetch issues for specific robot
- **GET** `/api/v1/issues/issue/attachments` - Get issue with attachments

#### Filters/Query Parameters
- **Date Range:** Start date to end date (using DatePicker)
- **Status:** All / Open / Closed
- **Robot:** Filter by specific robot (ComboBox)
- **Client:** Filter by specific client (ComboBox)
- **Category:** All / Mechanical / Electrical / Downtime / Observation / Other
- **Subcategory:** Dynamic list based on selected category
- **Search:** Text search on issue title/description
- **Pagination:** Page number

#### Key Actions
- **Filter Issues:** Apply filters to narrow results
- **Search Issues:** Text-based search
- **Export to Excel:** Download filtered issues
- **View Issue Thread:** Click issue to navigate to `/robots/:robotId/issues/:issueId`
- **Navigate Pages:** Use pagination controls

#### Data Models
```typescript
Issue {
  id: string
  title: string
  robotName: string
  robotId: string
  clientName: string
  clientId: string
  status: "Open" | "Closed"
  typeOfIssue: "Mechanical" | "Electrical" | "Downtime" | "Observation" | "Other"
  issueSubCategory?: string
  raisedOnTimestamp: number
  startTimestamp: number
  closeTimestamp?: number
  solution?: string
  issueDescription?: string
  raisedBy?: string
  threadCount: number
}

PaginationInfo {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
}
```

#### Issue Subcategories

**Mechanical:**
- Dumper Hinge Issue
- Tyre Issue
- Shaft Issue
- Motor Issue
- Gearbox Issue
- Bearing Issue
- Stopper Broken
- Braking Issue
- Other Issues

**Electrical:**
- Remote Issue
- Trim Issue
- Power Button Issue
- Emergency Button Issue
- Battery Cut-Off Issue
- Actuator/Hydraulics Issue
- Light Issue
- Pivoting Issue
- Speed Issue
- Other Issues

---

### Page: Issue Thread
**Route:** `/robots/:robotId/issues/:issueId`
**Component:** `/src/features/robots/robot/robotIssues/IssueThread.tsx`

#### Purpose
Detailed view of a specific issue with threaded conversation and attachments.

#### Data Displayed
- Issue title, description, status
- Thread messages with timestamps
- Attached images/videos
- Solution (if closed)

#### API Endpoints
- **GET** `/api/v1/issues/issue/attachments?robotId=X&issueId=Y`
- **POST** `/api/v1/issues/thread` - Add message to thread (with attachments)
- **POST** `/api/v1/issues/issue/close` - Close issue with solution
- **PUT** `/api/v1/issues/:issueId` - Update issue details

#### Key Actions
- **Add Message:** Post message to thread with optional attachments
- **Upload Attachments:** Attach images/videos to messages
- **Close Issue:** Mark issue as resolved with solution
- **Update Issue:** Edit issue title, status, type

---

## Operators Management

### Page: Operators
**Route:** `/operators`
**Component:** `/src/pages/Operators.tsx`

#### Purpose
Manage all operators (robot operators) across clients.

#### Data Displayed
- **Operator List:** Name, client, assigned robots count, active status
- **Operator Status:** Active / Inactive
- **Robot Count:** Number of robots assigned to operator
- **Profile Image:** Operator profile picture (if available)

#### API Endpoints
- **GET** `/api/v1/operators` - Fetch all operators (called via `fetchAllOperators`)
  ```typescript
  Returns: Operator[]
  ```
- **PATCH** `/api/v1/operators/:operatorId/status` - Update operator active status
- **POST** `/api/v1/operators` - Create new operator
- **PUT** `/api/v1/operators/:operatorId` - Update operator details
- **GET** `/api/v1/operators/attendance/all` - Download all attendance (Excel)

#### Filters/Query Parameters
- **Search:** Filter operators by name (client-side)
- **Status:** All / Active / Inactive

#### Key Actions
- **Search Operators:** Filter by name
- **Filter by Status:** Show active, inactive, or all operators
- **Manage Mode:** Toggle edit mode to activate/deactivate operators
- **Activate/Deactivate:** Change operator status
- **Create Operator:** Add new operator
- **Download Attendance:** Export all operator attendance to Excel
- **Navigate to Operator:** Click operator to view `/operators/:operatorId/profile`

#### Data Models
```typescript
Operator {
  id: string
  name: string
  imageUrl?: string
  client?: {
    id: string
    name: string
  }
  robots: number  // Count of assigned robots
  isActive: boolean
}
```

---

### Page: Operator Details
**Route:** `/operators/:operatorId`
**Component:** `/src/features/operators/Operator.tsx`

#### Sub-Routes
- `/operators/:operatorId/profile` - Operator profile details
- `/operators/:operatorId/attendance` - Attendance history
- `/operators/:operatorId/robots` - Assigned robots list

#### Data Displayed
- Operator personal details
- Contact information
- Attendance records
- Assigned robots
- Performance metrics

---

## Clients/Sites Management

### Page: Clients (Sites)
**Route:** `/clients`
**Component:** `/src/pages/Clients.tsx`

#### Purpose
Manage client organizations and deployment sites.

#### Data Displayed
- **Client List:** Name, ID, operators count, materials count
- **Client Status:** Active / Inactive
- **Operator Count:** Number of operators assigned to client
- **Materials Count:** Number of materials assigned to client

#### API Endpoints
- **GET** `/api/v1/clients` - Fetch all clients (via `fetchClients`)
  ```typescript
  Returns: Client[]
  ```
- **PATCH** `/api/v1/clients/:clientId/status` - Update client status
- **POST** `/api/v1/clients` - Create new client
- **PUT** `/api/v1/clients/:clientId` - Update client details

#### Filters/Query Parameters
- **Search:** Filter clients by name (client-side)
- **Status:** All / Active / Inactive

#### Key Actions
- **Search Clients:** Filter by name ("/" keyboard shortcut)
- **Filter by Status:** Show active, inactive, or all clients
- **Manage Mode:** Toggle edit mode to activate/deactivate clients
- **Activate/Deactivate:** Change client status (requires no assigned operators/materials)
- **Create Client:** Add new client
- **Navigate to Client:** Click client to view `/clients/:clientId/config`
- **Keyboard Navigation:** Arrow keys to navigate, Enter to select

#### Data Models
```typescript
Client {
  id: string
  name: string
  operators: number  // Count
  materials: number  // Count
  isActive: boolean
}
```

---

### Page: Client Details
**Route:** `/clients/:clientId`
**Component:** `/src/features/clients/Client.tsx`

#### Sub-Routes
- `/clients/:clientId/config` - Client configuration
- `/clients/:clientId/operators` - Assigned operators
- `/clients/:clientId/materials` - Assigned materials

#### Data Displayed
- Client configuration and settings
- Assigned operators list
- Assigned materials list
- Location information

---

## Fleet Management

### Page: Fleet
**Route:** `/fleet`
**Component:** `/src/pages/Fleet.tsx`

#### Purpose
Manage fleet configurations and maintenance procedures.

#### Data Displayed
- **Fleet List:** Name, prefix, model version
- **Fleet Prefix:** Short identifier code (e.g., "AS", "BR")
- **Model Version:** Hardware version (e.g., "V1", "V2")
- **Maintenance Steps:** Defined maintenance procedures per fleet

#### API Endpoints
- **GET** `/api/v1/fleet` - Fetch all fleets (via `fetchFleetsFn`)
  ```typescript
  Returns: Fleet[]
  ```
- **POST** `/api/v1/fleet` - Create new fleet with maintenance steps
- **PUT** `/api/v1/fleet/:fleetId/metadata` - Update fleet metadata
- **POST** `/api/v1/fleet/maintenance-steps` - Add maintenance step to fleet

#### Filters/Query Parameters
- **Search:** Filter fleets by name (debounced, 300ms)

#### Key Actions
- **Search Fleets:** Filter by name
- **Create Fleet:** Multi-step wizard to create fleet with maintenance procedures
- **Edit Fleet:** Update fleet name, prefix, model version
- **Navigate to Fleet:** Click fleet to view `/fleet/:id` details

#### Data Models
```typescript
Fleet {
  id: string
  name: string
  prefix: string
  modelVersion: string
  maintenanceSteps: {
    step: string
    tag: string
    _id: string
  }[]
}

CreateFleetPayload {
  name: string
  prefix: string
  modelVersion: string
  maintenanceSteps: {
    step: string
    tag: string
  }[]
}
```

---

### Page: Fleet Details
**Route:** `/fleet/:id`
**Component:** `/src/features/fleet/FleetDetails.tsx`

#### Purpose
View and manage detailed fleet information and maintenance procedures.

---

## Sessions & Analytics

### Page: Sessions (Robot Calendar)
**Route:** `/robots/:robotId/sessions`
**Component:** `/src/pages/Sessions.tsx`

#### Purpose
View robot operational sessions, maintenance records, and session analytics.

#### Sub-Routes
- `/robots/:robotId/sessions` - Calendar view of sessions
- `/robots/:robotId/sessions/:sessionId` - Detailed session analysis
- `/robots/:robotId/maintenance/:maintenanceId` - Maintenance record details

#### Data Displayed (Calendar View)
- **Session Calendar:** Calendar showing session dates
- **Session Events:** Visual indicators for operational days
- **Maintenance Events:** Maintenance activity dates
- **Session Summary Stats:** Distance, operation time, energy consumed

#### API Endpoints
- **POST** `/api/v1/app/data/fetchSessionsInRange` - Fetch sessions in date range
  ```typescript
  Payload: {
    robotId?: string
    clientId?: string
    operatorId?: string
    startingTimestamp: number
    endingTimestamp: number
  }
  ```
- **POST** `/api/v1/sensors/fetchProcessedSessionData` - Get aggregated session metrics

#### Filters/Query Parameters
- **Robot Selection:** Choose robot via ComboBox
- **Date Range:** Implicit from calendar selection

#### Key Actions
- **Select Robot:** Choose robot from dropdown
- **View Session:** Double-click calendar event to view session details
- **View Maintenance:** Click maintenance event to view maintenance record

---

### Page: Analytics
**Route:** `/analytics`
**Component:** `/src/pages/Analytics.tsx`

#### Purpose
Comprehensive analytics dashboard with charts and metrics based on robot sensor data and app session data.

#### Data Displayed
- **Summary Cards:** Total distance, operation time, energy consumed
- **Interactive Charts:** Distance, battery, speed, load weight over time
- **Session Analytics:** Per-session breakdown
- **Downtime Analysis:** Downtime events and durations
- **GPS Path Visualization:** Robot paths on map

#### API Endpoints
- **POST** `/api/v1/app/data/fetchSessionsInRange` - Fetch sessions with filters
- **POST** `/api/v1/sensors/fetchProcessedSessionData` - Aggregated session data
- **POST** `/api/v1/sensors/fetchGnssInRange` - GPS data for path visualization
- **GET** `/api/v1/users/robots` - Robots list for filter
- **GET** `/api/v1/users/clients` - Clients list for filter
- **GET** `/api/v1/clients/appUsers` - Operators list for filter
- **POST** `/api/v1/operators/fetchInRange` - Operators active in range
- **POST** `/api/v1/robots/fetchInRange` - Robots active in range

#### Filters/Query Parameters
- **Date Range:** Start and end dates (timestamp range)
- **Client:** Filter by client ID (can select multiple)
- **Robot:** Filter by robot ID
- **Operator:** Filter by operator ID

#### Key Actions
- **Apply Filters:** Select client, robot, operator, date range
- **Download Data:** Export raw data to Excel
- **Generate PDF:** Create PDF report with selected charts
- **Configure PDF:** Select which charts to include in PDF
- **View Charts:** Interactive chart visualization

#### Data Models
```typescript
ProcessedAppData {
  appSessionData: AppSession[]
  downtimeData: DowntimeEvent[]
}

AppSession {
  sessionId: string
  robotId: string
  operatorId: string
  clientId: string
  startTime: number
  endTime: number
  distance: number
  operationTime: number
  energyConsumed: number
}

ProcessedSessionInfo {
  totalDistance: number
  totalOperationTime: number
  totalEnergyConsumed: number
}
```

---

## Leads Management

### Page: Leads
**Route:** `/leads`
**Component:** `/src/pages/Leads.tsx`

#### Purpose
Sales pipeline management for tracking potential customers and deals.

#### Data Displayed
- **Lead List:** Paginated list of sales leads
- **Lead Details:** Company, contact, status, next steps, responses
- **Lead Stage:** Pipeline stage (e.g., Prospect, Qualified, Proposal, etc.)
- **Next Steps:** Planned follow-up actions
- **Response History:** Communication history

#### API Endpoints
- **GET** `/api/v1/leads?{query}` - Fetch leads with filters (paginated)
- **POST** `/api/v1/leads` - Create new lead
- **GET** `/api/v1/leads/:leadId` - Fetch lead details
- **PUT** `/api/v1/leads/:leadId` - Update lead
- **DELETE** `/api/v1/leads/:leadId` - Delete lead
- **POST** `/api/v1/leads/:leadId/responses` - Add response to lead
- **POST** `/api/v1/leads/:leadId/steps` - Add next step to lead
- **POST** `/api/v1/leads/get-weekly-report` - Generate weekly sales report
- **GET** `/api/v1/leads/download` - Download all leads

#### Filters/Query Parameters
- **Search:** Search leads by company, contact, etc. (via query string)
- **Status:** Filter by lead status/stage
- **Pagination:** Page number

#### Key Actions
- **Search Leads:** Text-based search
- **Create Lead:** Add new lead to pipeline
- **Edit Lead:** Update lead information
- **Delete Lead:** Remove lead from system
- **View Details:** Navigate to `/leads/:id` for full details
- **Add Response:** Log communication with lead
- **Add Next Step:** Schedule follow-up action
- **View Analytics:** Navigate to `/leads/analytics` for sales metrics

#### Sub-Routes
- `/leads/` - Leads list
- `/leads/new` - Create new lead
- `/leads/:id` - Lead details
- `/leads/:id/edit` - Edit lead
- `/leads/analytics` - Sales analytics dashboard

---

## Overtime Management

### Page: Overtime
**Route:** `/overtime`
**Component:** `/src/pages/Overtime.tsx`

#### Purpose
Manage operator overtime requests and track overtime hours.

#### Data Displayed (Two Tabs)

**Pending Requests Tab:**
- Overtime request details
- Operator name and client
- Requested duration
- Reason for overtime
- Request timestamp
- Approval/rejection actions

**Overtime History Tab:**
- Historical overtime records
- Approved duration vs actual duration
- Status (Pending/Approved/Rejected)
- Approver information
- Total overtime hours
- Total overtime cost

#### API Endpoints
- **GET** `/api/v1/overtime/admin/pending` - Fetch pending overtime requests
  ```typescript
  Returns: {
    requests: OvertimeRequest[]
    count: number
  }
  ```
- **POST** `/api/v1/overtime/admin/approve/:requestId` - Approve request
- **POST** `/api/v1/overtime/admin/reject/:requestId` - Reject request
- **PATCH** `/api/v1/overtime/admin/update-duration/:requestId` - Update approved duration
- **GET** `/api/v1/overtime/admin/active-sessions` - Fetch active overtime sessions
- **PATCH** `/api/v1/overtime/admin/update-active-session/:sessionId` - Update active session duration
- **GET** `/api/v1/overtime/admin/history` - Fetch overtime history with filters
  ```typescript
  Params: {
    startDate?: string
    endDate?: string
    operatorId?: string
    clientId?: string
    robotId?: string
    status?: string
  }
  ```
- **GET** `/api/v1/overtime/admin/analytics` - Fetch overtime analytics

#### Filters/Query Parameters (History Tab)
- **Date Range:** Start and end dates
- **Operator:** Filter by operator ID
- **Client:** Filter by client ID
- **Robot:** Filter by robot ID
- **Status:** Pending / Approved / Rejected

#### Key Actions
- **Approve Request:** Approve overtime with optional duration adjustment
- **Reject Request:** Reject overtime with reason
- **Update Duration:** Modify approved overtime duration
- **Update Active Session:** Modify duration for ongoing overtime session
- **Filter History:** Apply filters to view specific overtime records
- **View Analytics:** View overtime metrics and trends

#### Data Models
```typescript
OvertimeRequest {
  _id: string
  operatorId: string
  operatorName: string
  clientId: string
  clientName: string
  robotId?: string
  robotName?: string
  requestedAt: string
  requestedDuration: number  // hours
  approvedDuration?: number  // hours
  reason: string
  status: "pending" | "approved" | "rejected"
  approvedBy?: string
  approvedByName?: string
  approvedAt?: string
  rejectedBy?: string
  rejectedByName?: string
  rejectedAt?: string
  rejectionReason?: string
  expiresAt?: string
  overtimeSessionId?: string
}

OvertimeSession {
  session: {
    id: string
    requestId: string
    operatorId: string
    clientId: string
    approvedDuration: number
    checkInTime: number
    isActive: boolean
  }
  operator: { id: string, name: string }
  client: { id: string, name: string }
  elapsedTime: number
  remainingTime: number
}
```

---

## Inventory Management

### Page: Inventory
**Route:** `/inventory`
**Component:** `/src/pages/Inventory.tsx`

#### Purpose
Track spare parts and inventory items across mechanical and electronics categories.

#### Data Displayed
- **Summary Stats:** Total items, mechanical count, electronics count, low stock, out of stock
- **Inventory Table:** Item ID, name, category, quantity, unit, min quantity, status
- **Stock Status:** Color-coded status (normal, low stock, out of stock)
- **Two Tabs:** Mechanical items, Electronics items

#### API Endpoints
- **GET** `/api/v1/inventory/stats` - Fetch inventory statistics
  ```typescript
  Returns: {
    totalItems: number
    mechanical: number
    electronics: number
    lowStock: number
    outOfStock: number
  }
  ```
- **GET** `/api/v1/inventory/items` - Fetch inventory items with filters
  ```typescript
  Params: {
    category: "mechanical" | "electronics"
    search?: string
    stockStatus?: "low-stock" | "out-of-stock"
    limit?: number
  }
  ```
- **POST** `/api/v1/inventory/items` - Create new inventory item
- **PATCH** `/api/v1/inventory/items/:itemId/quantity` - Update item quantity
- **DELETE** `/api/v1/inventory/items/:itemId` - Delete inventory item
- **GET** `/api/v1/inventory/items/all` - Export all items (for Excel download)

#### Filters/Query Parameters
- **Category:** Mechanical / Electronics (tab selection)
- **Search:** Filter by item name or item ID
- **Stock Status:** All / Low Stock / Out of Stock

#### Key Actions
- **Search Items:** Filter by name/ID
- **Filter by Status:** Show all, low stock, or out of stock items
- **Switch Category:** Toggle between Mechanical and Electronics tabs
- **Add Item:** Create new inventory item
- **Update Quantity:** Adjust stock quantity (add/remove/set)
- **Delete Item:** Remove item from inventory
- **Download Inventory:** Export to Excel
  - Download all items
  - Download mechanical only
  - Download electronics only
  - Download low stock items
  - Download out of stock items

#### Data Models
```typescript
InventoryItem {
  itemId: string
  name: string
  category: "mechanical" | "electronics"
  quantity: number
  unit: string
  minimumQuantity: number
  location?: string
  supplier?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

UpdateQuantityPayload {
  type: "add" | "remove" | "set"
  quantity: number
  reason?: string
}
```

---

## Materials Management

### Page: Materials
**Route:** `/materials`
**Component:** `/src/pages/Materials.tsx`

#### Purpose
Manage material types used by robots (e.g., soil types, aggregate types).

#### Data Displayed
- **Material List:** Material name, ID, active status
- **Material Status:** Active / Inactive

#### API Endpoints
- **GET** `/api/v1/materials` - Fetch all materials (via `fetchMaterials`)
  ```typescript
  Returns: Material[]
  ```
- **POST** `/api/v1/materials` - Create materials (batch)
  ```typescript
  Payload: {
    materials: string[]  // Array of material names
  }
  ```
- **PUT** `/api/v1/materials/:materialId` - Update material name
- **PATCH** `/api/v1/materials/:materialId/status` - Update material status

#### Filters/Query Parameters
- **Search:** Filter materials by name (client-side)
- **Status:** All / Active / Inactive

#### Key Actions
- **Search Materials:** Filter by name
- **Filter by Status:** Show active, inactive, or all materials
- **Manage Mode:** Toggle edit mode
- **Create Materials:** Add new materials (comma-separated list)
- **Edit Material:** Update material name
- **Activate/Deactivate:** Change material status

#### Data Models
```typescript
Material {
  id: string
  name: string
  isActive: boolean
}
```

---

## Billing Summary

### Page: Billing Summary
**Route:** `/billing`
**Component:** `/src/pages/BillingSummary.tsx`

#### Purpose
View and manage billing information for all robots across clients.

#### Data Displayed
- **Billing Table:** Robot name, client, amount, start date, end date, status
- **Billing Status Pills:** Color-coded status indicators
  - BILLING (green)
  - PAIDPOC (emerald)
  - SOLD (blue)
  - POC (yellow)
  - WORKORDERPENDING (orange)
  - NOTBILLING (gray)
  - NA (neutral)
- **Sortable Columns:** Click headers to sort
- **Keyboard Navigation:** Navigate rows with arrow keys

#### API Endpoints
- **GET** `/api/v1/billing/summary` - Fetch billing summary with filters
  ```typescript
  Query Params: {
    clientId?: string
    status?: string
    startDate?: string
    endDate?: string
  }
  Returns: {
    data: BillingRecord[]
    metadata: { total: number }
  }
  ```
- **POST** `/api/v1/billing/robot/:robotId` - Create/update billing record
- **GET** `/api/v1/billing/robot/:robotId` - Get robot billing details

#### Filters/Query Parameters
- **Search:** Filter by robot name or client name ("/" keyboard shortcut)
- **Client:** Filter by specific client
- **Status:** Filter by billing status
- **Date Range:** Start and end dates

#### Key Actions
- **Search:** Text-based search with keyboard shortcut
- **Filter by Client:** Select from client dropdown
- **Filter by Status:** Select billing status
- **Filter by Date Range:** Date range picker
- **Reset Filters:** Clear all filters
- **Sort Table:** Click column headers to sort
- **Navigate Rows:** Arrow keys for keyboard navigation
- **View Robot Billing:** Click row to navigate to `/robots/:robotId/billing`
- **Edit Billing:** Click edit icon to open billing modal

#### Data Models
```typescript
BillingRecord {
  _id?: string
  robotId: string
  robotName: string
  clientId: string
  clientName: string
  amount?: number
  startDate?: string
  endDate?: string
  status?: BillingStatus
}

enum BillingStatus {
  BILLING = "BILLING"
  PAIDPOC = "PAIDPOC"
  SOLD = "SOLD"
  POC = "POC"
  WORKORDERPENDING = "WORKORDERPENDING"
  NOTBILLING = "NOTBILLING"
  NA = "NA"
}
```

---

## Shipping Management

### Page: Shipping
**Route:** `/shipping`
**Component:** `/src/pages/Shipping.tsx`

#### Purpose
Track shipments of robots and miscellaneous items.

#### Data Displayed
- **Summary Stats:** Total shipments, robot shipments, miscellaneous, in transit, delivered
- **Shipment Table:** Shipment ID, type, location, robot/item info, status, tracking, dates
- **Two Tabs:** Robot Shipping, Miscellaneous Items
- **Shipment Status:** In Transit (yellow), Delivered (green), Cancelled (red)

#### API Endpoints
- **GET** `/api/v1/shipments/stats` - Fetch shipment statistics
  ```typescript
  Returns: {
    totalShipments: number
    robotShipments: number
    miscellaneousShipments: number
    inTransit: number
    delivered: number
  }
  ```
- **GET** `/api/v1/shipments` - Fetch shipments with filters
  ```typescript
  Params: {
    type: "robot" | "miscellaneous"
    search?: string
    status?: "in-transit" | "delivered" | "cancelled"
    limit?: number
  }
  ```
- **POST** `/api/v1/shipments` - Create new shipment
- **PATCH** `/api/v1/shipments/:shipmentId` - Update shipment
- **DELETE** `/api/v1/shipments/:shipmentId` - Delete shipment

#### Filters/Query Parameters
- **Type:** Robot / Miscellaneous (tab selection)
- **Search:** Filter by shipment ID, location, robot name, or item
- **Status:** All / In Transit / Delivered / Cancelled

#### Key Actions
- **Search Shipments:** Filter by multiple fields
- **Filter by Status:** Show shipments by status
- **Switch Type:** Toggle between Robot and Miscellaneous tabs
- **Create Shipment:** Add new shipment
- **Edit Shipment:** Update shipment details (location, status, tracking)
- **Delete Shipment:** Remove shipment record
- **Pre-fill from URL:** Auto-search based on `?robotName=X&shipmentId=Y` URL params

#### Data Models
```typescript
Shipment {
  shipmentId: string
  type: "robot" | "miscellaneous"
  status: "in-transit" | "delivered" | "cancelled"
  robotId?: string
  robotName?: string
  itemDescription?: string
  fromLocation: string
  toLocation: string
  trackingNumber?: string
  carrier?: string
  shippedDate: string
  estimatedDelivery?: string
  actualDelivery?: string
  notes?: string
  createdAt: string
  updatedAt: string
}
```

---

## Master Data

### Page: Master Data (Robot Master Data)
**Route:** `/master-data`
**Component:** `/src/pages/MasterData.tsx`

#### Purpose
Operational fleet overview that merges durable robot metadata, embedded
assignment snapshots, live connectivity state, and derived operational metrics
into a single table for operations users and exports.

#### Data Displayed
- **Robot Identity:** Name, robot type, status, access, expiry
- **Assignment Snapshots:** Fleet, operator, client
- **Operational Metrics:** Staffing state, maintenance state, BOM state, cycle efficiency
- **Connected State:** Live status, last connection, connected dashboard count
- **Operational Context:** Tasks, issue counts, QC, billing, shipping
- **Freshness Hints:** Per-metric timestamps for connectivity, staffing, maintenance, BOM, cycle efficiency

#### API Endpoints
- **GET** `/api/v1/robots/master-data` - Primary paginated Master Data API used by the frontend
- **GET** `/api/v1/masterdata/cached` - Full cached Master Data payload for cache-oriented consumers and diagnostics
- Implementation details: `backend/controllers/robotController.ts` and `backend/controllers/masterDataController.ts`
- Process details: See `backend/docs/MASTER_DATA_OPERATIONAL_SNAPSHOT_PROCESS.md`

#### Filters/Query Parameters
- **Pagination:** `page`, `limit`
- **Search:** Robot name or ID
- **Status:** Robot status
- **Client:** `clientSnapshot.name`
- **Operator:** `operatorSnapshot.name`
- **Fleet:** `fleetSnapshot.name`
- **Access:** Enabled/Disabled
- **GPS Status:** Has GPS / No GPS

#### Key Actions
- **View Fleet State:** Inspect staffing, maintenance, BOM, and cycle efficiency at a glance
- **Filter Fleet:** Narrow by robot, client, operator, fleet, access, and GPS state
- **Export Master Data:** Download a wide operational report from the frontend
- **Refresh Cached Master Data:** Rebuild the full cached payload when needed
- **Use Fallbacks Safely:** Continue serving rows even when an operational snapshot is missing or stale

---

## Data Models Reference

### Core Entity Models

```typescript
// Robot
RobotType {
  id: string
  name: string
  image?: string
  status: "Active" | "Offline" | string
  recentOpenIssuesCount?: number
  client?: ClientData
}

// Client
Client {
  id: string
  name: string
  operators: number
  materials: number
  isActive: boolean
}

// Operator
Operator {
  id: string
  name: string
  imageUrl?: string
  client?: { id: string, name: string }
  robots: number
  isActive: boolean
}

// Issue
Issue {
  id: string
  title: string
  robotName: string
  robotId: string
  clientName: string
  clientId: string
  status: "Open" | "Closed"
  typeOfIssue: "Mechanical" | "Electrical" | "Downtime" | "Observation" | "Other"
  issueSubCategory?: string
  raisedOnTimestamp: number
  startTimestamp: number
  closeTimestamp?: number
  solution?: string
  issueDescription?: string
  raisedBy?: string
  threadCount: number
}

// Fleet
Fleet {
  id: string
  name: string
  prefix: string
  modelVersion: string
  maintenanceSteps: { step: string, tag: string, _id: string }[]
}

// Session Data
AppSession {
  sessionId: string
  robotId: string
  operatorId: string
  clientId: string
  startTime: number
  endTime: number
  distance: number
  operationTime: number
  energyConsumed: number
}

// Overtime
OvertimeRequest {
  _id: string
  operatorId: string
  operatorName: string
  clientId: string
  clientName: string
  robotId?: string
  robotName?: string
  requestedAt: string
  requestedDuration: number
  approvedDuration?: number
  reason: string
  status: "pending" | "approved" | "rejected"
  approvedBy?: string
  approvedByName?: string
  approvedAt?: string
  rejectedBy?: string
  rejectedByName?: string
  rejectedAt?: string
  rejectionReason?: string
  expiresAt?: string
  overtimeSessionId?: string
}

// Inventory
InventoryItem {
  itemId: string
  name: string
  category: "mechanical" | "electronics"
  quantity: number
  unit: string
  minimumQuantity: number
  location?: string
  supplier?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// Shipment
Shipment {
  shipmentId: string
  type: "robot" | "miscellaneous"
  status: "in-transit" | "delivered" | "cancelled"
  robotId?: string
  robotName?: string
  itemDescription?: string
  fromLocation: string
  toLocation: string
  trackingNumber?: string
  carrier?: string
  shippedDate: string
  estimatedDelivery?: string
  actualDelivery?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// Billing
BillingRecord {
  _id?: string
  robotId: string
  robotName: string
  clientId: string
  clientName: string
  amount?: number
  startDate?: string
  endDate?: string
  status?: BillingStatus
}

// Material
Material {
  id: string
  name: string
  isActive: boolean
}

// Lead
Lead {
  id: string
  companyName: string
  contactName: string
  contactEmail: string
  contactPhone: string
  status: string
  stage: string
  product?: string
  value?: number
  probability?: number
  expectedCloseDate?: string
  nextSteps: NextStep[]
  responses: Response[]
  closePlan?: string
  createdAt: string
  updatedAt: string
}

// Pagination
PaginationInfo {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
}
```

---

## Common Query Patterns

### Example Queries for Master AI Agent

#### 1. Get Open Issues Count Today
```typescript
Endpoint: POST /api/v1/issues/query
Payload: {
  issueStatus: "Open",
  startingTimestamp: todayStartTimestamp,
  endingTimestamp: todayEndTimestamp,
  page: 1
}
Response: { issues: Issue[], metaData: { totalCount: number } }
Answer: metaData.totalCount
```

#### 2. Show All Robots at Client X
```typescript
Endpoint: GET /api/v1/users/robots
Filter: robots.filter(r => r.client?.id === clientId)
Answer: Filtered robot list
```

#### 3. Total Billing for Last Month
```typescript
Endpoint: GET /api/v1/billing/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
Calculate: data.reduce((sum, record) => sum + (record.amount || 0), 0)
Answer: Total billing amount
```

#### 4. Operators with Overtime This Week
```typescript
Endpoint: GET /api/v1/overtime/admin/history
Params: {
  startDate: weekStartDate,
  endDate: weekEndDate,
  status: "approved"
}
Answer: records.map(r => ({ operator: r.operatorName, hours: r.approvedDuration }))
```

#### 5. Low Stock Inventory Items
```typescript
Endpoint: GET /api/v1/inventory/items?stockStatus=low-stock
Answer: List of items with quantity < minimumQuantity
```

#### 6. Robots Offline Right Now
```typescript
Endpoint: GET /api/v1/users/robots
Filter: robots.filter(r => r.status === "Offline")
Answer: Offline robot list with names
```

#### 7. Total Distance Traveled by Robot X This Month
```typescript
Endpoint: POST /api/v1/sensors/fetchProcessedSessionData
Payload: {
  robotId: X,
  startingTimestamp: monthStartTimestamp,
  endingTimestamp: monthEndTimestamp
}
Answer: response.totalDistance
```

#### 8. Pending Overtime Requests
```typescript
Endpoint: GET /api/v1/overtime/admin/pending
Answer: requests.length + " pending requests"
```

#### 9. Active Shipments In Transit
```typescript
Endpoint: GET /api/v1/shipments?status=in-transit
Answer: shipments.length + " shipments in transit"
```

#### 10. Issues by Category This Week
```typescript
Endpoint: POST /api/v1/issues/query
Loop through categories: ["Mechanical", "Electrical", "Downtime", "Observation", "Other"]
Aggregate counts per category
Answer: { Mechanical: X, Electrical: Y, ... }
```

---

## API Base URL

All API endpoints are prefixed with:
```
/api/v1
```

Example:
- Full URL: `https://mission-control.example.com/api/v1/issues/query`
- Relative URL used in code: `/api/v1/issues/query`

---

## Authentication

All API requests require authentication headers obtained via `getAuthHeader()`:
```typescript
headers: {
  Authorization: "Bearer <JWT_TOKEN>"
}
```

---

## Permissions System

Pages and actions are protected by a permission system. Common permissions:
- `view_robots` - View robots page and robot details
- `change_robots` - Create/edit robots
- `view_issues` - View issues
- `view_site_mgmt` - View clients and operators
- `change_site_mgmt` - Create/edit clients and operators
- `view_leads` - View leads pipeline
- `change_fleet` - Manage fleet configurations
- `manage_qc_templates` - Manage QC templates
- `view_tutorials` - Access tutorials
- `change_users` - Manage users

Check permissions with:
```typescript
checkPermission("permission_name")
```

---

## Notes for Master AI Agent

1. **Timestamps:** Most date filters use Unix timestamps (milliseconds since epoch)
2. **Pagination:** Many endpoints return paginated data with `metaData` or `paginationInfo`
3. **Real-time Data:** Dashboard uses ROS bridge for real-time robot communication
4. **Date Ranges:** Analytics and reports typically use `startingTimestamp` and `endingTimestamp`
5. **Status Values:** Most status fields use string enums (e.g., "Open"/"Closed", "Active"/"Offline")
6. **Client-Side Filtering:** Some pages filter data client-side after fetching (e.g., Robots search)
7. **Batch Operations:** Materials can be created in batches (comma-separated)
8. **Export Functions:** Issues, Inventory, Leads support Excel export
9. **Keyboard Shortcuts:** Many pages support "/" for search focus, arrow keys for navigation
10. **Multi-Client Analytics:** Analytics supports aggregating data across multiple clients

---

**Document Version:** 1.0
**Last Updated:** 2026-02-13
**Maintainer:** Mission Control Development Team
