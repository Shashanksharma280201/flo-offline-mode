# Architecture

**Analysis Date:** 2026-03-19

## Pattern Overview

**Overall:** Three-tier Client-Server Architecture with Real-time Communication

**Key Characteristics:**
- Backend: RESTful API with Socket.IO and MQTT for real-time robotics data
- Frontend: Single-page application with React Router and centralized state management
- Database: MongoDB with Redis for caching and real-time session management
- Real-time: Dual-channel communication (WebSockets for clients, MQTT for robots)
- External Integration: AWS IoT, S3, Azure Storage, OpenAI services

## Layers

**Backend API Layer:**
- Purpose: HTTP REST API and real-time communication server
- Location: `/home/shanks/Music/flo_web_app/mission-control/backend`
- Contains: Express routes, controllers, middleware, Socket.IO namespaces, MQTT client
- Depends on: MongoDB, Redis, AWS SDK, Firebase Admin, OpenAI SDK
- Used by: Frontend application, mobile app operators, robot firmware

**Frontend Presentation Layer:**
- Purpose: User interface and client-side application logic
- Location: `/home/shanks/Music/flo_web_app/mission-control-frontend/src`
- Contains: React components, pages, features, UI components
- Depends on: Backend API, Socket.IO client, ROS library (ROSLIB), Google Maps
- Used by: Web browser users (mission control operators, admins)

**Data Persistence Layer:**
- Purpose: Data storage and caching
- Location: MongoDB (primary), Redis (cache/sessions), AWS S3 (media), Azure Blob (media)
- Contains: Mongoose models, schema definitions
- Depends on: MongoDB driver, Redis client, AWS SDK, Azure SDK
- Used by: Backend controllers, services, scheduled workers

**Real-time Communication Layer:**
- Purpose: Bidirectional real-time data streaming
- Location: `/home/shanks/Music/flo_web_app/mission-control/backend/sockets`, `/home/shanks/Music/flo_web_app/mission-control/backend/mqtt`
- Contains: Socket.IO namespaces (master, client, base station), MQTT client connection
- Depends on: Socket.IO, AWS IoT MQTT SDK
- Used by: Frontend (via Socket.IO client), Robots (via MQTT), Base stations (via WebSocket)

**Service Layer:**
- Purpose: Business logic abstraction and external integrations
- Location: `/home/shanks/Music/flo_web_app/mission-control/backend/services`
- Contains: AI services, AWS/Azure services, email, push notifications, cache management
- Depends on: OpenAI, AWS SDK, Azure SDK, Nodemailer, Firebase Admin
- Used by: Controllers, workers, MQTT handlers

**Background Job Layer:**
- Purpose: Asynchronous task processing and scheduled jobs
- Location: `/home/shanks/Music/flo_web_app/mission-control/backend/workers`, `/home/shanks/Music/flo_web_app/mission-control/backend/queues`
- Contains: BullMQ workers (email, push notifications, scheduled jobs)
- Depends on: BullMQ, Redis, emailService, pushNotificationService
- Used by: Controllers (enqueue jobs), scheduled triggers (cron patterns)

## Data Flow

**Robot Status Update Flow:**

1. Robot publishes sensor data to MQTT topic `mmr/publish/{MAC_ADDRESS}`
2. AWS IoT Rule forwards data to Kinesis Firehose (analytics pipeline)
3. MQTT client connection receives data via subscription
4. Data stored in Redis with key `robot:{robotId}` (JSON structure)
5. Socket.IO emits update to connected frontend clients via `/v1/robot/master` namespace
6. Frontend updates Zustand store (`robotStore`) and re-renders UI

**API Request Flow (Robot CRUD):**

1. Frontend calls API via axios: `POST /api/v1/robots/create-with-bom`
2. Express middleware chain: helmet → cors → bodyParser → rate limiter
3. Authentication middleware (`protect`) verifies JWT token from header
4. Authorization middleware (`hasPermission`) checks role-based permissions
5. Route handler forwards to controller: `createRobotWithBOM`
6. Controller validates input, checks inventory, starts MongoDB transaction
7. Transaction creates robot + deducts inventory + updates user
8. Post-transaction: MQTT subscription setup, cache invalidation
9. Response sent to frontend with created robot data

**Real-time Dashboard Data Flow:**

1. Frontend connects to Socket.IO: `io.connect('/v1/client')`
2. Client listener registers handlers for robot events
3. User selects robot → frontend emits `join-room` event with robotId
4. Backend adds socket to room, starts streaming robot data from Redis
5. Periodic updates emit `robot-data` events to room subscribers
6. Frontend updates state and re-renders dashboard components

**Voice Assistant Query Flow:**

1. User speaks to voice assistant (Autonomy Agent or Master Agent)
2. Frontend sends audio/text to OpenAI Realtime API or Assistants API
3. OpenAI returns assistant response with function calls
4. Frontend executes function tools (e.g., fetchRobots, navigateTo)
5. Results returned to OpenAI for context
6. OpenAI generates natural language response
7. Response spoken back to user via text-to-speech

**Scheduled Job Flow (Auto-checkout):**

1. BullMQ scheduled job triggers at pattern `0 0 * * * *` (hourly)
2. Worker executes job: `checkExpiredOvertimeWorker`
3. Queries MongoDB for operators exceeding shift + 2h grace period
4. Creates attendance checkout records with auto-checkout flag
5. Sends push notifications to affected operators
6. Updates operator check-in status in database

**State Management:**
- Backend: Redis for real-time robot state, MongoDB for persistent state
- Frontend: Zustand stores for global state, React Query for server state caching

## Key Abstractions

**Robot:**
- Purpose: Central entity representing autonomous/manual material-moving robots
- Examples: `/home/shanks/Music/flo_web_app/mission-control/backend/models/robotModel.ts`
- Pattern: Mongoose schema with embedded subdocuments (manufacturingData, motorData, tasks)
- Key fields: `macAddress` (MQTT identity), `activeOperator`, `fleetSnapshot`, `clientSnapshot`, `operatorSnapshot` (denormalized data for performance)

**AppUser (Operator):**
- Purpose: Mobile app users who operate robots on-site
- Examples: `/home/shanks/Music/flo_web_app/mission-control/backend/models/appUserModel.ts`
- Pattern: Mongoose schema with references to robots and clients
- Key fields: `phoneNumber` (auth identity), `clientId`, `isActive`, `checkInTime`

**Client (Site):**
- Purpose: Physical deployment locations where robots operate
- Examples: `/home/shanks/Music/flo_web_app/mission-control/backend/models/clientModel.ts`
- Pattern: Mongoose schema with embedded location and configuration
- Key fields: `location` (LatLng), `operatingHours`, `materials`, `robots`

**Issue:**
- Purpose: Problem tracking for robots (mechanical, electrical, software)
- Examples: `/home/shanks/Music/flo_web_app/mission-control/backend/models/issueModel.ts`
- Pattern: Mongoose schema with status workflow and attachment support
- Key fields: `robot`, `typeOfIssue`, `status`, `raisedBy`, `resolvedBy`, `attachments` (S3 URLs)

**Feature Module:**
- Purpose: Self-contained frontend feature with components, services, hooks, stores
- Examples: `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/robots/`, `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/QC/`, `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/leads/`
- Pattern: Feature folder structure with collocated components, services, state
- Contains: Page components, UI components, API services, custom hooks, Zustand store slices

**Service:**
- Purpose: Encapsulation of external API calls or complex business logic
- Examples: `/home/shanks/Music/flo_web_app/mission-control/backend/services/ai.ts` (OpenAI), `/home/shanks/Music/flo_web_app/mission-control/backend/services/masterDataCacheService.ts` (Redis caching)
- Pattern: Singleton pattern with exported functions or class instances
- Used by: Controllers, workers, MQTT handlers

**Controller:**
- Purpose: HTTP request handlers implementing business logic
- Examples: `/home/shanks/Music/flo_web_app/mission-control/backend/controllers/robotController.ts`
- Pattern: Express async handler with route-specific functions
- Responsibilities: Validation, database operations, response formatting, cache invalidation

**Queue/Worker:**
- Purpose: Asynchronous background job processing
- Examples: `/home/shanks/Music/flo_web_app/mission-control/backend/queues/emailQueue.ts`, `/home/shanks/Music/flo_web_app/mission-control/backend/workers/emailWorker.ts`
- Pattern: BullMQ producer/consumer with Redis-backed job queue
- Used for: Email sending, push notifications, scheduled maintenance checks, daily data resets

## Entry Points

**Backend Server:**
- Location: `/home/shanks/Music/flo_web_app/mission-control/backend/server.ts`
- Triggers: `npm start` or `npm run serve` (development)
- Responsibilities: Express app initialization, middleware setup, route mounting, Socket.IO server creation, MQTT connection, scheduled job registration

**Frontend Application:**
- Location: `/home/shanks/Music/flo_web_app/mission-control-frontend/src/main.tsx`
- Triggers: Browser navigation to application URL
- Responsibilities: React root render, dayjs plugin initialization, mounts `App` component

**Frontend Router:**
- Location: `/home/shanks/Music/flo_web_app/mission-control-frontend/src/App.tsx`
- Triggers: User navigation within SPA
- Responsibilities: Route definition with `createBrowserRouter`, authentication guards, global socket/ROS initialization, voice assistant context

**MQTT Client Connection:**
- Location: `/home/shanks/Music/flo_web_app/mission-control/backend/mqtt/mqttClientConnection.ts`
- Triggers: Server startup (`server.ts` calls `MqttClientConnection.connect()`)
- Responsibilities: AWS IoT MQTT connection, topic subscriptions per robot, room management for Socket.IO forwarding

**Socket.IO Namespaces:**
- Master Namespace: `/home/shanks/Music/flo_web_app/mission-control/backend/sockets/listeners/v1/masterListener.ts` (namespace: `/v1/robot/master`)
- Client Namespace: `/home/shanks/Music/flo_web_app/mission-control/backend/sockets/listeners/v1/clientListener.ts` (namespace: `/v1/client`)
- Base Station Namespace: `/home/shanks/Music/flo_web_app/mission-control/backend/sockets/listeners/v1/baseStationListener.ts` (WebSocket `/ntrip`)
- Triggers: Frontend socket connection or robot/base station connection
- Responsibilities: Event routing, room management, data streaming

**Scheduled Workers:**
- Location: `/home/shanks/Music/flo_web_app/mission-control/backend/workers/scheduledJobsWorker.ts`
- Triggers: Cron patterns defined in `server.ts` (e.g., `0 0 19 * * *` for maintenance check at 7 PM IST)
- Responsibilities: Maintenance due notifications, daily robot data reset, overtime expiration check, auto-checkout

## Error Handling

**Strategy:** Centralized error middleware with async handler wrapper

**Patterns:**
- All controllers wrapped in `express-async-handler` to catch async errors
- Custom error middleware: `/home/shanks/Music/flo_web_app/mission-control/backend/middlewares/errorMiddleware.ts`
- HTTP status codes set explicitly in controllers before throwing errors
- Winston logger for server-side error logging
- Frontend: React error boundaries for component-level errors, toast notifications for API errors

**Backend Error Flow:**
1. Controller throws error (sync or async)
2. `asyncHandler` catches and forwards to Express error middleware
3. Error middleware formats response with status code and message
4. Winston logs error with context (timestamp, level, stack trace)
5. Response sent to client with error message

**Frontend Error Flow:**
1. API call fails with error response
2. Axios interceptor or React Query error handler catches error
3. Toast notification displayed to user via `react-toastify`
4. Error state updated in component or store
5. UI displays fallback or error message

## Cross-Cutting Concerns

**Logging:**
- Backend: Winston logger with file and console transports
- Location: `/home/shanks/Music/flo_web_app/mission-control/backend/utils/logger.ts`
- Morgan HTTP request logging middleware
- Logs stored in `/home/shanks/Music/flo_web_app/mission-control/logs/`

**Validation:**
- Backend: Manual validation in controllers with early returns on invalid input
- Mongoose schema validation for database writes
- Frontend: React Hook Form for client-side form validation

**Authentication:**
- JWT-based authentication for web users, app users, and robots
- Middleware: `/home/shanks/Music/flo_web_app/mission-control/backend/middlewares/authMiddleware.ts`
- Multiple guards: `protect` (web), `protectApp` (mobile), `protectRobot` (firmware), `protectAdmin` (admin-only)
- Token storage: LocalStorage on frontend, HTTP Authorization header for API calls

**Authorization:**
- Role-based access control (RBAC) with permission system
- Roles: admin, manager, technician, viewer
- Permissions: `view_robots`, `change_robots`, `view_issues`, `manage_qc_templates`, etc.
- Middleware: `hasPermission(permission)` checks user role and custom permissions
- Frontend: Route guards with `ProtectedRoute` component

**Rate Limiting:**
- IP-based rate limiting with Redis store
- Location: `/home/shanks/Music/flo_web_app/mission-control/backend/middlewares/rateLimitMiddleware.ts`
- Limiters: `generalLimiter` (100 req/15min), `authLimiter` (stricter for login), `attendanceLimiter` (lenient for check-in)
- Trust proxy enabled for accurate IP detection behind load balancer

**Caching:**
- Redis-based caching for frequently accessed data
- Master data cache service: `/home/shanks/Music/flo_web_app/mission-control/backend/services/masterDataCacheService.ts`
- Cache invalidation on data mutations (robot creation, operator assignment, etc.)
- Frontend: React Query for automatic stale-while-revalidate caching

**Security:**
- Helmet.js for HTTP header security
- CORS enabled for cross-origin requests
- Password hashing with bcryptjs (10 salt rounds)
- JWT tokens with expiration
- Input sanitization with `sanitize-html` for blog content

---

*Architecture analysis: 2026-03-19*
