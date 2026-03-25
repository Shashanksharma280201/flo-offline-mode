# FLO OFFLINE MODE - Complete Setup Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Directory Structure](#directory-structure)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Detailed Setup](#detailed-setup)
6. [Running the System](#running-the-system)
7. [Troubleshooting](#troubleshooting)
8. [Architecture](#architecture)

---

## 🎯 Overview

**FLO Offline Mode** enables complete autonomous robot operation without internet connectivity by:
- Running MongoDB locally (Docker)
- Using MinIO for S3-compatible storage (Docker)
- Storing all autonomy data locally (path maps, robots, stations)
- Supporting LIDAR map uploads from robots

**Use Case:** Deploy robots with mission control in remote areas without internet.

---

## 📁 Directory Structure

```
flo-offline-mode/
│
├── 📂 Core Application
│   ├── mission-control/                    # Backend API (Node.js + Express)
│   │   ├── backend/
│   │   │   ├── server.ts                   # Main server (MQTT disabled in offline mode)
│   │   │   ├── services/
│   │   │   │   ├── aws.ts                  # S3 client (MinIO configured)
│   │   │   │   ├── mongodb.ts              # MongoDB connection
│   │   │   │   └── redis.ts                # Redis cache
│   │   │   ├── controllers/
│   │   │   │   ├── pathMapController.ts    # Path map APIs
│   │   │   │   ├── robotController.ts      # Robot management
│   │   │   │   └── lidarMapController.ts   # LIDAR map APIs
│   │   │   └── models/
│   │   │       ├── pathMapModel.ts         # Path map schema
│   │   │       ├── robotModel.ts           # Robot schema
│   │   │       └── lidarMapModel.ts        # LIDAR map schema
│   │   ├── .env                            # Backend configuration
│   │   ├── package.json
│   │   └── node_modules/
│   │
│   └── mission-control-frontend/           # Frontend UI (React + Vite)
│       ├── src/
│       │   ├── pages/
│       │   │   └── Dashboard.tsx           # Main autonomy dashboard
│       │   ├── features/
│       │   │   ├── dashboard/
│       │   │   │   └── configpad/
│       │   │   │       └── PathMapPanel.tsx # Path mapping controls
│       │   │   └── missions/
│       │   │       ├── MissionsView.tsx    # Mission planning
│       │   │       └── MapViz.tsx          # 3D visualization
│       │   └── stores/
│       │       └── missionsStore.ts        # State management
│       ├── package.json
│       └── node_modules/
│
├── 📂 Docker Infrastructure
│   ├── docker-compose.yml                  # Container orchestration
│   └── data/
│       ├── mongodb/                        # MongoDB persistent data
│       └── minio/                          # MinIO S3 storage
│
├── 📂 Data Management
│   ├── prod-backup/                        # Production data dump
│   │   └── mission-control/
│   │       ├── users.bson                  # User accounts
│   │       ├── robots.bson                 # Robot profiles
│   │       ├── pathmaps.bson               # Path maps (17MB)
│   │       ├── clients.bson                # Site locations
│   │       ├── lidarmaps.bson              # LIDAR maps
│   │       ├── appusers.bson               # Mobile operators
│   │       ├── fleets.bson                 # Robot templates
│   │       ├── basestations.bson           # RTK GPS stations
│   │       ├── materials.bson              # Material catalog
│   │       └── counters.bson               # Auto-increment IDs
│   │
│   ├── export-prod-data.sh                 # Download production data
│   └── import-to-local.sh                  # Import to local MongoDB
│
├── 📂 Setup & Testing
│   ├── setup.sh                            # Automated setup script
│   ├── test-connection.js                  # Test MongoDB connection
│   └── test-minio.js                       # Test MinIO S3 connection
│
└── 📂 Documentation
    ├── README.md                           # This file
    ├── SETUP_GUIDE.md                      # Setup.sh usage guide
    ├── MINIO_SETUP_COMPLETE.md             # MinIO configuration details
    ├── DATA_EXPORT_PLAN.md                 # Data export strategy
    ├── COLLECTIONS_LIST.md                 # Database collections reference
    ├── OFFLINE_S3_PLAN_V2.md               # S3 offline architecture
    ├── EXPORT_SUMMARY.txt                  # Export results log
    └── IMPORT_SUCCESS.txt                  # Import results log
```

---

## 🔧 Prerequisites

### System Requirements
- **OS:** Ubuntu 20.04+ / Debian 11+ (recommended)
- **RAM:** 4GB minimum, 8GB recommended
- **Disk:** 50GB free space (for LIDAR maps)
- **Network:** Internet for initial setup only

### Software (Auto-installed by setup.sh)
- Docker 24.0+
- Node.js 18+
- pnpm 8+
- npm 9+
- curl, wget

---

## 🚀 Quick Start

### **Option 1: Automated Setup (Recommended)**

```bash
cd flo-offline-mode
./setup.sh
```

**Then import data:**
```bash
./export-prod-data.sh    # Download production data (needs internet)
./import-to-local.sh      # Import to local MongoDB
```

**Start services:**
```bash
# Terminal 1 - Backend
cd mission-control
pnpm serve

# Terminal 2 - Frontend
cd mission-control-frontend
npm run dev
```

**Access:** http://localhost:3000

---

### **Option 2: Manual Setup**

See [Detailed Setup](#detailed-setup) below.

---

## 📖 Detailed Setup

### **Step 1: Install Dependencies**

#### Install Docker
```bash
# Add Docker repository
curl -fsSL https://get.docker.com | sudo sh

# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in
newgrp docker
```

#### Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Install pnpm
```bash
npm install -g pnpm
```

---

### **Step 2: Setup Docker Containers**

```bash
cd flo-offline-mode

# Start MongoDB + MinIO
docker compose up -d mongodb minio

# Initialize MinIO bucket
docker compose up minio-init

# Verify containers running
docker ps
```

**Expected output:**
```
CONTAINER ID   IMAGE              STATUS                   PORTS
xxx            mongo:6.0          Up 5 minutes             0.0.0.0:27017->27017/tcp
xxx            minio/minio        Up 5 minutes (healthy)   0.0.0.0:9000-9001->9000-9001/tcp
```

---

### **Step 3: Configure Backend**

```bash
cd mission-control

# Verify .env configuration
cat .env | grep -E "DB_URI|AWS_ENDPOINT|OFFLINE_MODE"
```

**Expected output:**
```bash
OFFLINE_MODE=true
DB_URI=mongodb://localhost:27017/mission-control
AWS_ENDPOINT=http://localhost:9000
AWS_ACCESS_KEY=flo
AWS_SECRET_KEY=flo123456
AWS_FORCE_PATH_STYLE=true
```

**Install dependencies:**
```bash
pnpm install
```

---

### **Step 4: Configure Frontend**

```bash
cd mission-control-frontend

# Install dependencies
npm install
```

---

### **Step 5: Import Production Data**

```bash
cd flo-offline-mode

# Export from production (requires internet + credentials)
./export-prod-data.sh

# Import to local MongoDB
./import-to-local.sh
```

**Expected output:**
```
✅ Export complete!
📊 Exported collections (10 total):
   Users: 48
   Robots: 95
   PathMaps: 110
   ...

✅ Import complete!
579 document(s) restored successfully.
```

**Verify data:**
```bash
docker exec flo-offline-mongodb mongosh mission-control --eval "
  print('Users:', db.users.countDocuments());
  print('Robots:', db.robots.countDocuments());
  print('PathMaps:', db.pathmaps.countDocuments());
"
```

---

### **Step 6: Test Connections**

#### Test MongoDB
```bash
node test-connection.js
```

**Expected:**
```
✓ Successfully connected to MongoDB!
✓ Successfully inserted test document!
✅ All tests passed!
```

#### Test MinIO
Access MinIO web UI:
- URL: http://localhost:9001
- Username: `flo`
- Password: `flo123456`

---

## 🏃 Running the System

### **Start Backend**

```bash
cd mission-control
pnpm serve
```

**Expected output:**
```
MongoDB Connected: 127.0.0.1
MQTT connection skipped (offline mode)
Server is running at http://localhost:5000
```

**Backend APIs:**
- Health: http://localhost:5000/api/v1/health
- Robots: http://localhost:5000/api/v1/robots
- PathMaps: http://localhost:5000/api/v1/pathMaps
- LIDAR Maps: http://localhost:5000/api/v1/lidar-maps

---

### **Start Frontend**

```bash
cd mission-control-frontend
npm run dev
```

**Expected output:**
```
VITE v5.x.x ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: http://192.168.x.x:3000/
```

---

### **Access Application**

1. **Open browser:** http://localhost:3000

2. **Login with production credentials:**
   - Email: `contact@flomobility.com`
   - Password: (use production password)

3. **Test autonomy features:**
   - ✅ Dashboard loads
   - ✅ PathMap dropdown shows 110 maps
   - ✅ Select a pathmap
   - ✅ Stations & paths render on map
   - ✅ Robot list shows 95 robots

---

## 🛠️ Troubleshooting

### **MongoDB Connection Failed**

```bash
# Check if container is running
docker ps | grep mongodb

# Check MongoDB logs
docker logs flo-offline-mongodb

# Restart MongoDB
docker compose restart mongodb

# Test connection
docker exec flo-offline-mongodb mongosh --eval "db.version()"
```

---

### **MinIO Not Accessible**

```bash
# Check container health
docker ps | grep minio

# Test MinIO API
curl http://localhost:9000/minio/health/live

# Check MinIO logs
docker logs flo-offline-minio

# Restart MinIO
docker compose restart minio
```

---

### **Backend Port Already in Use**

```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or change port in .env
PORT=5001
```

---

### **Frontend Build Errors**

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

---

### **MQTT Connection Errors (Should be skipped)**

If you see MQTT errors, verify `OFFLINE_MODE=true` in `.env`:

```bash
cd mission-control
grep OFFLINE_MODE .env

# Should output:
OFFLINE_MODE=true
```

---

### **Data Not Loading**

```bash
# Verify data was imported
docker exec flo-offline-mongodb mongosh mission-control --eval "
  db.users.countDocuments()
"

# Should output: 48

# Re-import data if needed
cd flo-offline-mode
./import-to-local.sh
```

---

## 🏗️ Architecture

### **System Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                    OFFLINE ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌────────────────────┐       │
│  │    Frontend      │  HTTP   │     Backend        │       │
│  │  React + Vite    │◄───────►│  Express + Node.js │       │
│  │  Port: 3000      │  API    │  Port: 5000        │       │
│  └──────────────────┘         └──────┬─────────────┘       │
│                                       │                      │
│                         ┌─────────────┴──────────┐          │
│                         │                        │          │
│                  ┌──────▼──────┐         ┌──────▼──────┐   │
│                  │   MongoDB   │         │    MinIO    │   │
│                  │  (Docker)   │         │  (Docker)   │   │
│                  │  Port: 27017│         │  Port: 9000 │   │
│                  │             │         │  Port: 9001 │   │
│                  │  Storage:   │         │             │   │
│                  │  579 docs   │         │  Storage:   │   │
│                  │  17MB data  │         │  S3 files   │   │
│                  └─────────────┘         └─────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Redis (Host System)                      │  │
│  │              Port: 6379                               │  │
│  │              Cache layer                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### **Data Flow**

#### **Autonomy Operations**

```
1. User opens Dashboard
   → Frontend GET /api/v1/pathMaps
   → Backend queries MongoDB
   → Returns 110 path maps

2. User selects path map
   → Frontend GET /api/v1/pathMaps/:id
   → Backend fetches from MongoDB
   → Returns stations & paths
   → Frontend renders on 3D map

3. Robot uploads LIDAR map
   → Robot POST to MinIO:9000 (.pcd files)
   → Robot POST /api/v1/lidar-maps (metadata)
   → Backend saves to MongoDB
   → Frontend can download via presigned URL
```

---

### **Database Collections**

**Critical (Autonomy):**
- `pathmaps` - 110 documents (17MB) - Stations, paths, missions
- `robots` - 95 documents - Robot profiles + MAC addresses
- `users` - 48 documents - Authentication
- `clients` - 84 documents - Site locations
- `lidarmaps` - 0 documents - Indoor navigation (empty in prod)

**Operational:**
- `appusers` - 137 documents - Mobile operators
- `fleets` - 8 documents - Robot templates
- `basestations` - 4 documents - RTK GPS
- `materials` - 90 documents - Material catalog
- `counters` - 3 documents - Auto-increment IDs

---

### **Network Ports**

| Service | Port | Purpose | Access |
|---------|------|---------|--------|
| Frontend | 3000 | React dev server | http://localhost:3000 |
| Backend | 5000 | Express API | http://localhost:5000 |
| MongoDB | 27017 | Database | localhost only |
| MinIO API | 9000 | S3-compatible storage | Robot uploads here |
| MinIO UI | 9001 | Web console | http://localhost:9001 |
| Redis | 6379 | Cache (host system) | localhost only |

---

### **Robot Integration**

**Robot Configuration (ROS Launch File):**

```xml
<!-- S3 Upload Configuration -->
<param name="s3_endpoint" value="DEVICE_IP:9000"/>
<param name="s3_access_key" value="flo"/>
<param name="s3_secret_key" value="flo123456"/>
<param name="s3_bucket" value="lidar-maps"/>
<param name="s3_use_ssl" value="false"/>
```

**Replace `DEVICE_IP` with:**
- Same device: `localhost` or `127.0.0.1`
- Different device: `192.168.1.X` (actual IP)
- Docker network: `minio` (service name)

---

## 📊 Storage Requirements

### **Disk Space**

| Component | Size | Location |
|-----------|------|----------|
| MongoDB data | ~20 MB | `./data/mongodb/` |
| Production backup | ~17 MB | `./prod-backup/` |
| MinIO storage | 0-50 GB | `./data/minio/` |
| Backend node_modules | ~500 MB | `mission-control/node_modules/` |
| Frontend node_modules | ~400 MB | `mission-control-frontend/node_modules/` |
| **Total (no LIDAR)** | **~1 GB** | |
| **With 50 LIDAR maps** | **~10 GB** | |

### **LIDAR Map Sizes**
- 1 map: 60-210 MB (`.pcd` + `.pgm` + `.yaml` + `.json`)
- 10 maps: ~600 MB - 2 GB
- 50 maps: ~3-10 GB

---

## 🔐 Security

### **Credentials**

**MinIO:**
- Username: `flo`
- Password: `flo123456`
- Access: http://localhost:9001

**MongoDB:**
- No authentication (localhost only)
- Port: 27017

**Production MongoDB:**
- Credentials in original `mission-control/.env`
- Only used for data export

### **Network Security**

All services run on `localhost` only:
- ✅ Not accessible from external network
- ✅ Safe for offline operation
- ✅ No internet exposure

For production deployment:
- Change MinIO credentials
- Enable MongoDB authentication
- Configure firewall rules
- Use SSL/TLS

---

## 📝 Maintenance

### **Update Production Data**

```bash
cd flo-offline-mode

# Re-export and import (requires internet)
./export-prod-data.sh
./import-to-local.sh
```

### **Backup Local Data**

```bash
# Backup MongoDB
docker exec flo-offline-mongodb mongodump \
  --db=mission-control \
  --out=/tmp/backup

docker cp flo-offline-mongodb:/tmp/backup ./backup-$(date +%Y%m%d)

# Backup MinIO
cp -r data/minio ./minio-backup-$(date +%Y%m%d)
```

### **Clean Old Data**

```bash
# Stop containers
docker compose down

# Remove data volumes
rm -rf data/mongodb/* data/minio/*

# Restart and re-import
docker compose up -d
./import-to-local.sh
```

---

## 🆘 Support

### **Logs**

```bash
# Backend logs
cd mission-control
pnpm serve

# Frontend logs
cd mission-control-frontend
npm run dev

# Docker logs
docker logs flo-offline-mongodb
docker logs flo-offline-minio
```

### **Common Issues**

1. **Port conflicts** → Change ports in `.env` or `docker-compose.yml`
2. **Permission denied** → `chmod +x *.sh` or run with `sudo`
3. **No internet for setup** → Pre-download on another machine
4. **Containers won't start** → `docker compose down -v && docker compose up -d`

---

## 📄 License

Proprietary - Flo Mobility

---

**Last Updated:** 2026-03-25
**Version:** 1.0.0
**Maintained by:** Flo Mobility Engineering Team
