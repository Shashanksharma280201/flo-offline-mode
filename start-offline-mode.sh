#!/bin/bash

################################################################################
# FLO Offline Mode - Auto Launch Script with tmux
#
# This script launches the complete FLO offline mode system in a tmux session:
# - Starts Docker containers (MongoDB, MinIO)
# - Launches backend server in one pane
# - Launches frontend dev server in another pane
# - Shows Docker logs in third pane
# - Starts Redis with RedisJSON module in fourth pane
#
# Usage: ./start-offline-mode.sh
#        To attach: tmux attach -t flo-offline
#        To detach: Ctrl+B then D
################################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/shanks/Music/flo-offline-mode"
BACKEND_DIR="$PROJECT_DIR/mission-control"
FRONTEND_DIR="$PROJECT_DIR/mission-control-frontend"
REDIS_DIR="$PROJECT_DIR/RedisJSON"
SESSION_NAME="flo-offline"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}FLO Offline Mode - Auto Launch${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo -e "${RED}Error: tmux is not installed${NC}"
    echo -e "${YELLOW}Install with: sudo apt install tmux${NC}"
    exit 1
fi

# Check if session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo -e "${YELLOW}Session '$SESSION_NAME' already exists${NC}"
    echo -e "${BLUE}Options:${NC}"
    echo -e "  1. Attach to existing session: ${GREEN}tmux attach -t $SESSION_NAME${NC}"
    echo -e "  2. Kill and restart: ${YELLOW}tmux kill-session -t $SESSION_NAME && ./start-offline-mode.sh${NC}"
    exit 0
fi

# Navigate to project directory
cd "$PROJECT_DIR"

echo -e "${YELLOW}[1/5] Starting Docker containers...${NC}"
docker-compose up -d 2>&1 | grep -v "Container" || true

# Wait for containers to be healthy
echo -e "${BLUE}  → Waiting for containers to be ready...${NC}"
sleep 5

# Check if containers are running
if ! docker ps | grep -q "flo-offline-mongodb"; then
    echo -e "${RED}Error: MongoDB container failed to start${NC}"
    exit 1
fi

if ! docker ps | grep -q "flo-offline-minio"; then
    echo -e "${RED}Error: MinIO container failed to start${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker containers started${NC}"
echo ""

# Check if backend node_modules exists
echo -e "${YELLOW}[2/5] Checking backend dependencies...${NC}"
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}  → Installing backend dependencies (this may take a few minutes)...${NC}"
    cd "$BACKEND_DIR" && pnpm install --silent > /dev/null 2>&1
    cd "$PROJECT_DIR"
fi
echo -e "${GREEN}✓ Backend dependencies ready${NC}"
echo ""

# Check if frontend node_modules exists
echo -e "${YELLOW}[3/5] Checking frontend dependencies...${NC}"
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}  → Installing frontend dependencies (this may take a few minutes)...${NC}"
    cd "$FRONTEND_DIR" && pnpm install --silent > /dev/null 2>&1
    cd "$PROJECT_DIR"
fi
echo -e "${GREEN}✓ Frontend dependencies ready${NC}"
echo ""

echo -e "${YELLOW}[4/5] Creating tmux session...${NC}"

# Create new tmux session with backend pane (detached)
tmux new-session -d -s "$SESSION_NAME" -n "flo-offline" -c "$BACKEND_DIR"

# Rename first window
tmux rename-window -t "$SESSION_NAME:0" "flo-offline"

# Split window horizontally (backend on left, right side for other services)
tmux split-window -h -t "$SESSION_NAME:0" -c "$FRONTEND_DIR"

# Split right pane vertically (frontend top, docker logs middle)
tmux split-window -v -t "$SESSION_NAME:0.1" -c "$PROJECT_DIR"

# Split bottom-right pane vertically again (docker logs top, redis bottom)
tmux split-window -v -t "$SESSION_NAME:0.2" -c "$REDIS_DIR"

# Set pane layout (tiled layout for 4 panes)
tmux select-layout -t "$SESSION_NAME:0" tiled

# Send commands to each pane
# Pane 0: Backend
tmux send-keys -t "$SESSION_NAME:0.0" "echo 'Starting backend server...'" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "sleep 3 && pnpm serve" C-m

# Pane 1: Frontend
tmux send-keys -t "$SESSION_NAME:0.1" "echo 'Starting frontend dev server...'" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "sleep 5 && pnpm dev" C-m

# Pane 2: Docker logs
tmux send-keys -t "$SESSION_NAME:0.2" "echo 'Docker container logs:'" C-m
tmux send-keys -t "$SESSION_NAME:0.2" "sleep 1 && docker-compose logs -f" C-m

# Pane 3: Redis with RedisJSON
tmux send-keys -t "$SESSION_NAME:0.3" "echo 'Starting Redis with RedisJSON module...'" C-m
tmux send-keys -t "$SESSION_NAME:0.3" "sleep 2 && redis-server --loadmodule target/release/librejson.so" C-m

# Select backend pane (pane 0)
tmux select-pane -t "$SESSION_NAME:0.0"

echo -e "${GREEN}✓ tmux session created${NC}"
echo ""

echo -e "${YELLOW}[5/5] Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}FLO Offline Mode Started!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}tmux Session Details:${NC}"
echo -e "  Session name: ${GREEN}$SESSION_NAME${NC}"
echo -e "  Pane 0: Backend server       (port 5000)"
echo -e "  Pane 1: Frontend dev server  (port 3002)"
echo -e "  Pane 2: Docker logs          (MongoDB, MinIO)"
echo -e "  Pane 3: Redis with RedisJSON (port 6379)"
echo ""
echo -e "${BLUE}tmux Commands:${NC}"
echo -e "  Attach to session:  ${GREEN}tmux attach -t $SESSION_NAME${NC}"
echo -e "  Detach from session: ${YELLOW}Ctrl+B then D${NC}"
echo -e "  Kill session:       ${RED}tmux kill-session -t $SESSION_NAME${NC}"
echo -e "  List sessions:      ${BLUE}tmux ls${NC}"
echo ""
echo -e "${BLUE}Access URLs:${NC}"
echo -e "  Backend API:     ${GREEN}http://localhost:5000${NC}"
echo -e "  Frontend:        ${GREEN}http://localhost:3002${NC}"
echo -e "  MinIO Console:   ${GREEN}http://localhost:9001${NC} (flo / flo123456)"
echo -e "  Redis:           ${GREEN}localhost:6379${NC}"
echo ""
echo -e "${YELLOW}Tip: Run 'tmux attach -t $SESSION_NAME' to view the running session${NC}"
echo ""
