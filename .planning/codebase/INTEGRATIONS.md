# External Integrations

**Analysis Date:** 2026-03-19

## APIs & External Services

**Cloud Platforms:**
- AWS IoT Core - MQTT broker for real-time robot telemetry
  - SDK/Client: `aws-iot-device-sdk-v2` ^1.21.1
  - Auth: Certificate-based (thing.cert.pem, thing.private.key)
  - Endpoint: `a2vswiofdpntiu-ats.iot.ap-south-1.amazonaws.com`
  - Implementation: `/mission-control/backend/mqtt/mqttClientConnection.ts`
  - Topics: `mmr/publish/{macAddress}` for sensor data streaming

**Artificial Intelligence:**
- OpenAI API - GPT models for voice command parsing and AI agent features
  - SDK/Client: `openai` ^4.93.0
  - Auth: `OPENAI_SECRET_KEY` env var
  - Implementation: `/mission-control/backend/services/ai.ts`
  - Use cases: Mission/pathmap extraction from voice commands, transcription analysis, AI-powered analytics

- Google Gemini AI - Lead enrichment and web scraping intelligence
  - SDK/Client: `google-generativeai` ^0.8.3
  - Auth: Google API credentials
  - Implementation: `/mission-control/backend/services/horus` (Python FastAPI service)
  - Use cases: Company research, LinkedIn/Twitter/website scraping for sales leads

**Maps & Geolocation:**
- Google Maps Platform - Frontend map visualization and geocoding
  - SDK/Client: `@googlemaps/react-wrapper` ^1.1.35, `@vis.gl/react-google-maps` ^0.9.0
  - Auth: `VITE_MAP_KEY` env var
  - Implementation: `/mission-control-frontend/src/App.tsx` (APIProvider)
  - Use cases: Robot location tracking, route visualization, fleet management UI

**Email:**
- Gmail OAuth2 SMTP - Transactional email notifications
  - SDK/Client: `nodemailer` ^6.9.14
  - Auth: `GMAIL_SERVICE_CLIENT`, `GMAIL_PRIVATE_KEY` env vars
  - Implementation: `/mission-control/backend/services/emailService.ts`
  - Sender: admin@flomobility.co.in
  - Use cases: Maintenance reminders, system alerts, operator notifications

**Push Notifications:**
- Firebase Cloud Messaging - Mobile push notifications to operators
  - SDK/Client: `firebase-admin` ^12.1.0
  - Auth: `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_PROJECT_ID` env vars
  - Implementation: `/mission-control/backend/services/pushNotificationService.ts`
  - Use cases: Issue alerts, maintenance due notifications, shift-end reminders, auto-checkout warnings

**Robotics Middleware:**
- ROS Bridge - WebSocket connection to Robot Operating System
  - SDK/Client: `roslib` ^1.3.0 (frontend)
  - Protocol: WebSocket to robot's rosbridge server
  - Implementation: Frontend robot control features
  - Use cases: Real-time robot control, mission execution, teleoperation

## Data Storage

**Databases:**
- MongoDB - Primary application database
  - Connection: `DB_URI` env var
  - Client: `mongoose` ^6.6.4
  - Implementation: `/mission-control/backend/services/mongodb.ts`
  - Usage: Robots, users, clients, fleets, sensors, issues, maintenance, attendance, leads, inventory, billing, QC, overtime, blog posts

- Redis - Caching and real-time state management
  - Connection: `REDIS_HOST`, `REDIS_PORT` env vars
  - Clients: `redis` ^4.5.0 (JSON operations) + `ioredis` ^5.4.1 (BullMQ)
  - Implementation: `/mission-control/backend/services/redis.ts`
  - Usage: Robot status cache, job queues (BullMQ), rate limiting, session data

**File Storage:**
- AWS S3 - Object storage for documents and media
  - SDK/Client: `@aws-sdk/client-s3` ^3.388.0, `@aws-sdk/s3-request-presigner` ^3.388.0
  - Auth: `AWS_ACCESS_KEY`, `AWS_SECRET_KEY` env vars
  - Region: ap-south-1 (Mumbai)
  - Buckets: `flo-operator-details` (operator documents, blog media)
  - Implementation: `/mission-control/backend/utils/s3Upload.ts`, `/mission-control/backend/utils/blogMedia.ts`
  - Usage: Operator PAN/Aadhar/profile images, blog post images, lidar maps

- Azure Blob Storage - Alternative cloud storage
  - SDK/Client: `@azure/storage-blob` ^12.26.0, `@azure/identity` ^4.7.0
  - Auth: Azure credentials via DefaultAzureCredential
  - Implementation: Backend services
  - Usage: Lidar map storage (alternative to S3)

**Caching:**
- Redis (dual-purpose) - In-memory caching and pub/sub
  - TTL-based robot status caching
  - Rate limiter storage via `rate-limit-redis`
  - BullMQ job queue backend

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
  - Implementation: JWT signing/verification with `jsonwebtoken` ^8.5.1
  - Secret: `JWT_SECRET` env var
  - Password hashing: `bcryptjs` ^2.4.3
  - Token storage: Frontend stores JWT, passes via Authorization header

**Authorization:**
- Role-based access control (implied by user model)
- Per-endpoint authentication middleware
- Socket.io authentication via token in connection handshake

## Monitoring & Observability

**Error Tracking:**
- Custom Winston logger
  - Implementation: `/mission-control/backend/utils/logger.ts`
  - Log files: `/mission-control/logs/` directory
  - Levels: info, warn, error, debug

**Logs:**
- Backend: Winston with file and console transports
- Frontend: Console logging
- Request logging: `morgan` ^1.10.0 middleware

## CI/CD & Deployment

**Hosting:**
- Self-hosted (based on environment configuration)
- Domain: mc-dev.flomobility.com (development)
- Proxy: Nginx (implied by trust proxy and X-Forwarded-For handling)

**CI Pipeline:**
- GitHub Actions (`.github` directory present)
- Pre-commit hooks via Husky ^8.0.0
- Lint-staged validation before commits

## Environment Configuration

**Required env vars (Backend):**
- `NODE_ENV` - development/production
- `PORT` - Backend server port (default 5000)
- `DB_URI` - MongoDB connection string
- `REDIS_HOST`, `REDIS_PORT` - Redis server connection
- `JWT_SECRET` - JWT signing secret
- `AWS_ACCESS_KEY`, `AWS_SECRET_KEY` - AWS S3 and IoT credentials
- `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_PROJECT_ID` - FCM push notifications
- `OPENAI_SECRET_KEY` - OpenAI API access
- `GMAIL_SERVICE_CLIENT`, `GMAIL_PRIVATE_KEY` - Gmail OAuth2 SMTP

**Required env vars (Frontend):**
- `VITE_MAP_KEY` - Google Maps API key

**Secrets location:**
- `.env` files (not committed, listed in `.gitignore`)
- AWS IoT certificates (`thing.cert.pem`, `thing.private.key`) - stored in mission-control root, not committed

## Webhooks & Callbacks

**Incoming:**
- WebSocket upgrade endpoint: `/ntrip` - RTCM correction data from base stations
  - Protocol: WebSocket (ws://)
  - Auth: `mac-address` header required
  - Implementation: `/mission-control/backend/sockets/listeners/v1/baseStationListener.ts`

- Socket.io namespaces:
  - `/v1/robot/master` - Robot master connections for telemetry publishing
  - `/v1/client` - Frontend client connections for real-time updates
  - Implementation: `/mission-control/backend/server.ts`

**Outgoing:**
- MQTT Publish: Backend publishes to AWS IoT topics (robot commands)
- Email: Outbound SMTP via Gmail OAuth2
- Push Notifications: FCM topic-based notifications to mobile devices
- Webhooks: None detected

## Job Scheduling

**Background Jobs (BullMQ):**
- Email worker - Processes maintenance check emails
  - Implementation: `/mission-control/backend/workers/emailWorker.ts`
  - Schedule: 7:00 PM IST daily

- Push notification worker - Sends maintenance due alerts
  - Implementation: `/mission-control/backend/workers/pushNotificationWorker.ts`
  - Schedule: 7:45 AM IST daily

- Scheduled jobs worker - Orchestrates recurring tasks
  - Implementation: `/mission-control/backend/workers/scheduledJobsWorker.ts`
  - Tasks: Daily leads update (11:59 PM), site utilization report (11:59 PM), remind-next-step (midnight), daily robot data reset (midnight), expired overtime check (every 10 min), auto-checkout (hourly)

## Proxy Configuration

**Frontend Development Proxy:**
- `/api` → `http://localhost:5000` - Backend REST API
- `/algorithm` → `http://localhost:8000` - Algorithm service (external)
- `/socket.io` → `ws://localhost:5000` - Socket.io WebSocket
- `/horus` → `http://localhost:9000` - Horus Python leads service
- `/ntrip` → `ws://localhost:5000` - RTCM WebSocket

**Implementation:** `/mission-control-frontend/vite.config.ts`

## Third-Party Services Summary

| Service | Purpose | Auth Method | Critical |
|---------|---------|-------------|----------|
| AWS IoT Core | Robot MQTT telemetry | X.509 certificates | Yes |
| MongoDB | Primary database | Connection string | Yes |
| Redis | Cache + job queue | Host/port | Yes |
| AWS S3 | File storage | Access key/secret | Yes |
| Firebase (FCM) | Push notifications | Service account JSON | Yes |
| OpenAI | AI features | API key | No |
| Google Maps | Frontend maps | API key | No |
| Gmail | Email notifications | OAuth2 credentials | No |
| Azure Blob | Alternative storage | Azure identity | No |
| Google Gemini | Leads enrichment | API credentials | No |

---

*Integration audit: 2026-03-19*
