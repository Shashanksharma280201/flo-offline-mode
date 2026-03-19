# Technology Stack

**Analysis Date:** 2026-03-19

## Languages

**Primary:**
- TypeScript - Backend API (`/mission-control/backend/**/*.ts`) and Frontend (`/mission-control-frontend/src/**/*.tsx`)
- Python 3.10 - Leads enrichment service (`/mission-control/backend/services/horus`)

**Secondary:**
- JavaScript (JSX) - React components in ES2022 format

## Runtime

**Environment:**
- Node.js v22.22.0 (Backend and Frontend)
- Python 3.10.12 (Horus service)

**Package Manager:**
- pnpm v9.0 (mission-control and mission-control-frontend)
- Lockfiles: `pnpm-lock.yaml` present in both subsystems

## Frameworks

**Core:**
- Express.js ^4.18.1 - Backend REST API server (`/mission-control/backend/server.ts`)
- React ^18.3.1 - Frontend UI framework
- Socket.io ^4.7.4 - Real-time bidirectional communication (backend server, frontend client)
- FastAPI 0.115.5 - Python microservice for leads enrichment (Horus)

**Testing:**
- Vitest ^4.0.18 - Frontend test runner with UI and coverage support
- @testing-library/react ^16.3.2 - React component testing
- Happy-dom ^20.5.0 / jsdom ^28.0.0 - DOM simulation for tests

**Build/Dev:**
- Vite ^4.4.9 - Frontend build tool and dev server
- TypeScript ^5.3.3 (backend), ^5.2.2 (frontend) - Type checking and compilation
- tsx ^4.11.0 - TypeScript execution for scripts
- nodemon ^2.0.19 - Backend development auto-reload
- ESBuild (via Vite) - Fast production minification

## Key Dependencies

**Critical:**
- mongoose ^6.6.4 - MongoDB ODM for data modeling (`/mission-control/backend/services/mongodb.ts`)
- redis ^4.5.0 + ioredis ^5.4.1 - Dual Redis clients for caching and pub/sub (`/mission-control/backend/services/redis.ts`)
- aws-iot-device-sdk-v2 ^1.21.1 - MQTT communication with robots via AWS IoT Core (`/mission-control/backend/mqtt/mqttClientConnection.ts`)
- @aws-sdk/client-s3 ^3.388.0 - File storage (operator documents, blog media) to AWS S3
- @azure/storage-blob ^12.26.0 + @azure/identity ^4.7.0 - Azure Blob Storage integration
- firebase-admin ^12.1.0 - Push notifications to mobile operators (`/mission-control/backend/services/pushNotificationService.ts`)
- openai ^4.93.0 - AI-powered voice command parsing and agent features (`/mission-control/backend/services/ai.ts`)

**Infrastructure:**
- bullmq ^5.8.3 - Job queue system with Redis backend (`/mission-control/backend/queues`, `/mission-control/backend/workers`)
- helmet ^6.0.0 - Security headers middleware
- express-rate-limit ^8.2.1 + rate-limit-redis ^4.3.0 - API rate limiting with Redis store
- jsonwebtoken ^8.5.1 - JWT-based authentication
- bcryptjs ^2.4.3 - Password hashing
- nodemailer ^6.9.14 - Email notifications via Gmail OAuth2 (`/mission-control/backend/services/emailService.ts`)
- ws ^8.16.0 - WebSocket server for RTCM data streaming (`/mission-control/backend/sockets/listeners/v1/baseStationListener.ts`)

**Frontend Libraries:**
- @googlemaps/react-wrapper ^1.1.35 + @vis.gl/react-google-maps ^0.9.0 - Google Maps integration
- @react-three/fiber ^8.14.6 + @react-three/drei ^9.77.1 + three ^0.159.0 - 3D visualization
- @radix-ui/* - Headless UI component primitives (accordion, checkbox, dropdown, select, tabs, etc.)
- @tanstack/react-table ^8.21.2 - Advanced data tables
- recharts ^2.8.0 - Chart visualizations
- zustand ^4.1.4 - State management (`/mission-control-frontend/src/stores`)
- react-router-dom ^6.4.3 - Client-side routing
- axios ^1.1.3 - HTTP client for API calls
- socket.io-client ^4.7.4 - Real-time server communication
- roslib ^1.3.0 - ROS bridge for robot control
- react-query ^3.39.2 - Server state management and caching
- tailwindcss ^3.3.3 - Utility-first CSS framework
- framer-motion ^12.29.2 - Animation library
- @tiptap/react ^3.19.0 - Rich text editor

**Python (Horus Service):**
- crawl4ai ^0.4.247 - Web scraping framework
- google-generativeai ^0.8.3 - Google Gemini AI integration
- pymongo ^4.10.1 - MongoDB driver for Python
- slowapi ^0.1.9 - Rate limiting for FastAPI

## Configuration

**Environment:**
- Configuration via `.env` files (present in both mission-control and mission-control-frontend)
- Backend environment template: `/mission-control/.envexample` (DB_URI, JWT_SECRET, AWS keys, Firebase credentials, OpenAI key, Redis host/port, Gmail OAuth2)
- Frontend environment template: `/mission-control-frontend/.envexample` (VITE_MAP_KEY for Google Maps)

**Build:**
- Backend: `tsconfig.json` - ES2022 target, ES modules, outputs to `/mission-control/build`
- Frontend: `vite.config.ts` - ESNext target, proxy to backend on localhost:5000, chunk optimization for vendors
- Frontend TypeScript: `tsconfig.json` - ESNext, path alias `@/*` → `./src/*`
- Linting: `.eslintrc.json` (both subsystems) - Airbnb style with TypeScript, Prettier integration
- Formatting: `.prettierrc.json` (both subsystems)
- Pre-commit hooks: Husky + lint-staged for quality checks

## Platform Requirements

**Development:**
- Node.js v22+ (enforced via pnpm preinstall check)
- pnpm package manager (enforced via `only-allow pnpm`)
- Python 3.10+ for Horus service
- MongoDB connection (DB_URI)
- Redis server (REDIS_HOST:REDIS_PORT)
- AWS credentials for S3 and IoT Core
- Firebase service account for push notifications
- OpenAI API key for AI features
- Google Maps API key for frontend maps

**Production:**
- Linux server (based on nginx proxy configuration in rate limiting setup)
- PM2 or similar process manager (implied by production scripts)
- HTTPS/TLS termination (rate limiting trusts X-Forwarded-For header, trust proxy enabled)
- AWS IoT Core certificates (`thing.cert.pem`, `thing.private.key` in mission-control root)

---

*Stack analysis: 2026-03-19*
