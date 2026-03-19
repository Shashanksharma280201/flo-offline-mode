# Codebase Structure

**Analysis Date:** 2026-03-19

## Directory Layout

```
flo_web_app/
├── mission-control/              # Backend Node.js/TypeScript API server
│   ├── backend/                  # Source code
│   │   ├── controllers/          # Route handlers (business logic)
│   │   ├── models/               # Mongoose schemas
│   │   ├── routes/               # Express route definitions
│   │   ├── services/             # External integrations & business logic
│   │   ├── middlewares/          # Auth, logging, rate limiting
│   │   ├── sockets/              # Socket.IO handlers and listeners
│   │   ├── mqtt/                 # MQTT client for robot communication
│   │   ├── workers/              # BullMQ background job workers
│   │   ├── queues/               # BullMQ queue definitions
│   │   ├── scripts/              # Utility scripts and migrations
│   │   ├── emails/               # React Email templates
│   │   ├── utils/                # Helper functions
│   │   ├── types/                # TypeScript type definitions
│   │   ├── constants/            # Configuration constants
│   │   └── server.ts             # Main server entry point
│   ├── build/                    # Compiled JavaScript (generated)
│   ├── logs/                     # Winston log files
│   ├── package.json              # Dependencies and scripts
│   ├── tsconfig.json             # TypeScript configuration
│   └── .env                      # Environment variables (not committed)
│
├── mission-control-frontend/     # Frontend React/TypeScript SPA
│   ├── src/                      # Source code
│   │   ├── features/             # Feature modules (pages + components + services)
│   │   ├── pages/                # Top-level page components
│   │   ├── components/           # Shared UI components
│   │   ├── stores/               # Zustand global state stores
│   │   ├── lib/                  # Third-party library integrations
│   │   ├── api/                  # API service modules
│   │   ├── hooks/                # Custom React hooks
│   │   ├── utils/                # Helper functions
│   │   ├── constants/            # Configuration constants
│   │   ├── contexts/             # React context providers
│   │   ├── types/                # TypeScript type definitions
│   │   ├── assets/               # Static assets (images, fonts)
│   │   ├── styles/               # Global CSS files
│   │   ├── main.tsx              # React entry point
│   │   └── App.tsx               # Router and global providers
│   ├── public/                   # Static files served directly
│   ├── dist/                     # Build output (generated)
│   ├── tests/                    # Vitest test files
│   ├── package.json              # Dependencies and scripts
│   ├── vite.config.ts            # Vite build configuration
│   ├── tsconfig.json             # TypeScript configuration
│   └── tailwind.config.cjs       # Tailwind CSS configuration
│
├── RedisJSON/                    # Redis module for JSON support
├── flo-stack/                    # Infrastructure/deployment configurations
├── scripts/                      # Project-wide utility scripts
└── .planning/                    # Planning and documentation
    └── codebase/                 # Codebase analysis documents
```

## Directory Purposes

**`mission-control/backend/controllers/`:**
- Purpose: HTTP request handlers implementing API business logic
- Contains: TypeScript files with async handler functions for routes
- Key files: `robotController.ts` (robot CRUD, BOM, tasks), `attendanceController.ts` (operator check-in/out), `issueController.ts` (issue tracking), `aiAgentController.ts` (AI assistant), `autonomyAgentController.ts` (dashboard AI)

**`mission-control/backend/models/`:**
- Purpose: Mongoose schemas defining database collections
- Contains: TypeScript files with Mongoose schema definitions and interfaces
- Key files: `robotModel.ts`, `appUserModel.ts`, `clientModel.ts`, `issueModel.ts`, `attendanceModel.ts`, `qcSubmissionModel.ts`, `leadsModel.ts`, `inventoryItemModel.ts`

**`mission-control/backend/routes/v1/`:**
- Purpose: Express route definitions mapping URLs to controllers
- Contains: TypeScript files with Express Router instances
- Key files: `robotRoutes.ts`, `authRoutes.ts`, `clientRoutes.ts`, `attendanceRoutes.ts`, `issueRoutes.ts`, `leadsRoutes.ts`, `qcRoutes.ts`, `aiAgentRoutes.ts`

**`mission-control/backend/services/`:**
- Purpose: External API integrations and shared business logic
- Contains: TypeScript modules for third-party services and utilities
- Key files: `ai.ts` (OpenAI integration), `aws.ts` (AWS SDK setup), `mongodb.ts` (DB connection), `redis.ts` (Redis client), `emailService.ts`, `masterDataCacheService.ts`

**`mission-control/backend/middlewares/`:**
- Purpose: Express middleware for cross-cutting concerns
- Contains: Authentication, authorization, logging, rate limiting, error handling
- Key files: `authMiddleware.ts` (JWT verification), `rateLimitMiddleware.ts`, `errorMiddleware.ts`, `morganMiddleware.ts` (HTTP logging)

**`mission-control/backend/sockets/`:**
- Purpose: Socket.IO real-time communication handlers
- Contains: Listener and handler files for Socket.IO namespaces
- Subdirectories: `listeners/v1/` (masterListener, clientListener, baseStationListener), `handlers/` (masterHandler, clientHandler)

**`mission-control/backend/mqtt/`:**
- Purpose: MQTT client for robot-to-server communication
- Contains: `mqttClientConnection.ts` (singleton MQTT client managing subscriptions)

**`mission-control/backend/workers/`:**
- Purpose: BullMQ background job processors
- Contains: `emailWorker.ts`, `pushNotificationWorker.ts`, `scheduledJobsWorker.ts`

**`mission-control/backend/queues/`:**
- Purpose: BullMQ queue definitions for async tasks
- Contains: `emailQueue.ts`, `pushNotificationQueue.ts`, `scheduledJobs.ts`

**`mission-control/backend/scripts/`:**
- Purpose: One-off utility scripts and data migrations
- Contains: Database seeding scripts, migration scripts, debugging tools
- Key files: `seedInventory.ts`, `checkOperatorAllAttendance.ts`, `migrate-close-plan.ts`

**`mission-control-frontend/src/features/`:**
- Purpose: Feature modules with collocated components, services, and state
- Contains: Feature-specific directories with self-contained code
- Examples: `robots/` (robot management), `QC/` (quality control), `leads/` (sales leads), `clients/` (site management), `operators/` (operator management), `teleops/` (teleoperation), `analytics/` (dashboard analytics)
- Pattern: Each feature contains `components/`, `services/`, `hooks/`, `store/` subdirectories

**`mission-control-frontend/src/pages/`:**
- Purpose: Top-level page components rendered by routes
- Contains: Page components that compose features and shared components
- Key files: `Dashboard.tsx`, `Analytics.tsx`, `Robots.tsx`, `Clients.tsx`, `Operators.tsx`, `Leads.tsx`, `Issues.tsx`, `Login.tsx`

**`mission-control-frontend/src/components/`:**
- Purpose: Shared UI components used across features
- Contains: Reusable React components
- Subdirectories: `ui/` (shadcn/ui primitives), `header/`, `nav/`, `map/`, `popup/`, `dropzone/`, `pagination/`, `r3f/` (React Three Fiber)

**`mission-control-frontend/src/stores/`:**
- Purpose: Zustand global state management
- Contains: TypeScript files with Zustand store definitions
- Key files: `robotStore.ts`, `userStore.ts`, `socketStore.ts`, `leadsStore.ts`, `operationsStore.ts`, `masterDataStore.ts`

**`mission-control-frontend/src/lib/`:**
- Purpose: Third-party library integrations and wrappers
- Contains: Custom hooks and utilities for external libraries
- Subdirectories: `sockets/` (Socket.IO client hooks), `ros/` (ROS library hooks), `storage/` (localStorage utils)

**`mission-control-frontend/src/api/`:**
- Purpose: API client modules for backend communication
- Contains: Axios-based service modules
- Key files: `inventoryApi.ts`, `overtimeApi.ts`, `shipmentApi.ts`

## Key File Locations

**Entry Points:**
- Backend: `/home/shanks/Music/flo_web_app/mission-control/backend/server.ts`
- Frontend: `/home/shanks/Music/flo_web_app/mission-control-frontend/src/main.tsx`
- Frontend Router: `/home/shanks/Music/flo_web_app/mission-control-frontend/src/App.tsx`

**Configuration:**
- Backend package: `/home/shanks/Music/flo_web_app/mission-control/package.json`
- Backend TypeScript: `/home/shanks/Music/flo_web_app/mission-control/tsconfig.json`
- Backend environment: `/home/shanks/Music/flo_web_app/mission-control/.env` (not committed)
- Frontend package: `/home/shanks/Music/flo_web_app/mission-control-frontend/package.json`
- Frontend TypeScript: `/home/shanks/Music/flo_web_app/mission-control-frontend/tsconfig.json`
- Frontend Vite: `/home/shanks/Music/flo_web_app/mission-control-frontend/vite.config.ts`
- Frontend Tailwind: `/home/shanks/Music/flo_web_app/mission-control-frontend/tailwind.config.cjs`

**Core Logic:**
- Robot management: `/home/shanks/Music/flo_web_app/mission-control/backend/controllers/robotController.ts` (backend), `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/robots/` (frontend)
- Authentication: `/home/shanks/Music/flo_web_app/mission-control/backend/controllers/authController.ts`
- Real-time data: `/home/shanks/Music/flo_web_app/mission-control/backend/mqtt/mqttClientConnection.ts`, `/home/shanks/Music/flo_web_app/mission-control/backend/sockets/`
- AI assistants: `/home/shanks/Music/flo_web_app/mission-control/backend/controllers/aiAgentController.ts`, `/home/shanks/Music/flo_web_app/mission-control/backend/controllers/autonomyAgentController.ts`

**Testing:**
- Frontend tests: `/home/shanks/Music/flo_web_app/mission-control-frontend/tests/` (unit, integration, validation)
- Frontend test config: `/home/shanks/Music/flo_web_app/mission-control-frontend/vitest.config.ts`
- Backend tests: `/home/shanks/Music/flo_web_app/mission-control/backend/tests/` (limited test coverage)

## Naming Conventions

**Files:**
- Backend controllers: `{entity}Controller.ts` (e.g., `robotController.ts`, `issueController.ts`)
- Backend models: `{entity}Model.ts` (e.g., `robotModel.ts`, `appUserModel.ts`)
- Backend routes: `{entity}Routes.ts` (e.g., `robotRoutes.ts`, `authRoutes.ts`)
- Backend services: `{purpose}Service.ts` or `{integration}.ts` (e.g., `emailService.ts`, `ai.ts`)
- Frontend pages: `{PageName}.tsx` (PascalCase, e.g., `Dashboard.tsx`, `Analytics.tsx`)
- Frontend components: `{ComponentName}.tsx` (PascalCase, e.g., `Button.tsx`, `LoadingSpinner.tsx`)
- Frontend stores: `{domain}Store.ts` (camelCase, e.g., `robotStore.ts`, `userStore.ts`)
- Frontend services: `{entity}Service.ts` (camelCase, e.g., `robotsService.ts`, `issuesService.ts`)

**Directories:**
- Backend: `lowercase` or `camelCase` (e.g., `controllers`, `middlewares`, `mqtt`)
- Frontend features: `camelCase` (e.g., `robots`, `QC`, `leads`)
- Frontend components: `camelCase` (e.g., `components`, `ui`, `header`)

## Where to Add New Code

**New Backend API Endpoint:**
- Controller function: `/home/shanks/Music/flo_web_app/mission-control/backend/controllers/{entity}Controller.ts`
- Route definition: `/home/shanks/Music/flo_web_app/mission-control/backend/routes/v1/{entity}Routes.ts`
- Mount route in: `/home/shanks/Music/flo_web_app/mission-control/backend/server.ts` (if new router)

**New Database Collection:**
- Model definition: `/home/shanks/Music/flo_web_app/mission-control/backend/models/{entity}Model.ts`
- Import in controllers as needed

**New Background Job:**
- Queue definition: `/home/shanks/Music/flo_web_app/mission-control/backend/queues/{jobType}Queue.ts`
- Worker implementation: `/home/shanks/Music/flo_web_app/mission-control/backend/workers/{jobType}Worker.ts`
- Import worker in: `/home/shanks/Music/flo_web_app/mission-control/backend/server.ts` (auto-loads workers)
- Enqueue jobs from controllers or scheduled jobs

**New Frontend Feature:**
- Feature directory: `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/{featureName}/`
- Structure:
  ```
  features/{featureName}/
  ├── components/         # Feature-specific components
  ├── services/           # API calls for this feature
  ├── hooks/              # Custom hooks
  ├── store/              # Zustand store slice (optional)
  └── {FeatureName}.tsx   # Main feature component
  ```
- Page component: `/home/shanks/Music/flo_web_app/mission-control-frontend/src/pages/{PageName}.tsx`
- Route definition: Add to `createBrowserRouter` in `/home/shanks/Music/flo_web_app/mission-control-frontend/src/App.tsx`

**New Frontend Page:**
- Page component: `/home/shanks/Music/flo_web_app/mission-control-frontend/src/pages/{PageName}.tsx`
- Route: Add to router in `/home/shanks/Music/flo_web_app/mission-control-frontend/src/App.tsx`
- Navigation: Update header/nav components if needed

**New Shared UI Component:**
- Component file: `/home/shanks/Music/flo_web_app/mission-control-frontend/src/components/ui/{ComponentName}.tsx`
- Use shadcn/ui pattern for consistency

**New Global State:**
- Store file: `/home/shanks/Music/flo_web_app/mission-control-frontend/src/stores/{domain}Store.ts`
- Use Zustand pattern with TypeScript types

**New API Service:**
- Backend: `/home/shanks/Music/flo_web_app/mission-control/backend/services/{service}.ts`
- Frontend: `/home/shanks/Music/flo_web_app/mission-control-frontend/src/features/{feature}/services/{entity}Service.ts` or `/home/shanks/Music/flo_web_app/mission-control-frontend/src/api/{entity}Api.ts`

**Utilities:**
- Backend helpers: `/home/shanks/Music/flo_web_app/mission-control/backend/utils/{utility}.ts`
- Frontend helpers: `/home/shanks/Music/flo_web_app/mission-control-frontend/src/utils/{utility}.ts`

**Database Migration/Script:**
- Script file: `/home/shanks/Music/flo_web_app/mission-control/backend/scripts/{scriptName}.ts`
- Run with: `tsx backend/scripts/{scriptName}.ts`

## Special Directories

**`mission-control/build/`:**
- Purpose: Compiled JavaScript output from TypeScript
- Generated: Yes (by TypeScript compiler)
- Committed: No (in `.gitignore`)
- Built by: `npm run build` (runs `tsc`)

**`mission-control/logs/`:**
- Purpose: Winston log files for server errors and requests
- Generated: Yes (by Winston logger)
- Committed: No (in `.gitignore`)
- Contains: Timestamped log files with error traces

**`mission-control/node_modules/`:**
- Purpose: Backend npm dependencies
- Generated: Yes (by `pnpm install`)
- Committed: No (in `.gitignore`)

**`mission-control-frontend/dist/`:**
- Purpose: Production build output for frontend
- Generated: Yes (by Vite build)
- Committed: No (in `.gitignore`)
- Built by: `npm run build` (runs `vite build`)

**`mission-control-frontend/node_modules/`:**
- Purpose: Frontend npm dependencies
- Generated: Yes (by `npm install` or `pnpm install`)
- Committed: No (in `.gitignore`)

**`mission-control-frontend/tests/`:**
- Purpose: Vitest test suites
- Generated: No (manually written)
- Committed: Yes
- Subdirectories: `unit/`, `integration/`, `validation/`
- Run with: `npm test` or `npm run test:ui`

**`RedisJSON/`:**
- Purpose: Redis module source code for JSON support
- Generated: No (third-party submodule or vendor code)
- Committed: Yes (appears to be vendored)
- Contains: Rust source code, build artifacts, documentation

**`flo-stack/`:**
- Purpose: Infrastructure and deployment configurations
- Generated: No
- Committed: Yes
- Contains: Docker, Kubernetes, Terraform configurations (likely)

**`.planning/codebase/`:**
- Purpose: Codebase analysis documentation for GSD workflow
- Generated: Yes (by GSD map-codebase command)
- Committed: Yes
- Contains: ARCHITECTURE.md, STRUCTURE.md, and other analysis documents

## Backend Route Patterns

**API Versioning:**
- All routes prefixed with `/api/v1/`
- Example: `/api/v1/robots`, `/api/v1/users`, `/api/v1/clients`

**RESTful Conventions:**
- GET `/api/v1/{resources}` - List resources
- POST `/api/v1/{resources}` - Create resource
- GET `/api/v1/{resources}/:id` - Get single resource
- PUT `/api/v1/{resources}/:id` - Update resource
- DELETE `/api/v1/{resources}/:id` - Delete resource

**Nested Resources:**
- `/api/v1/robots/:robotId/manufacturing-data` - Robot manufacturing data
- `/api/v1/robots/:robotId/tasks` - Robot tasks
- `/api/v1/robots/:robotId/issues/:issueId` - Specific issue for robot

**Special Endpoints:**
- `/api/v1/auth/login` - Authentication
- `/api/v1/robots/master-data` - Aggregated robot data with filters
- `/api/v1/ai-agent/message` - AI assistant chat
- `/api/v1/autonomy-agent/message` - Autonomy assistant (dashboard)

## Frontend Route Patterns

**Authentication:**
- `/login` - Login page (public)

**Main Navigation:**
- `/dashboard` - Real-time dashboard (uses Autonomy Agent)
- `/analytics` - Analytics and reporting
- `/robots` - Robot list
- `/clients` - Site management
- `/operators` - Operator management
- `/leads` - Sales leads
- `/issues` - Issue tracking
- `/overtime` - Overtime requests

**Nested Routes:**
- `/robots/:robotId/profile` - Robot details
- `/robots/:robotId/issues` - Robot issues
- `/robots/:robotId/sessions` - Robot sessions
- `/clients/:clientId/config` - Client configuration
- `/operators/:operatorId/profile` - Operator profile

**Admin Routes:**
- `/users` - User management (permission-protected)
- `/qc` - QC template management (permission-protected)

**Route Guards:**
- `ProtectedRoute` component checks permissions
- Redirects to `/login` if unauthenticated
- Redirects to fallback page if unauthorized

---

*Structure analysis: 2026-03-19*
