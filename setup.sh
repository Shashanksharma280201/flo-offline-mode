#!/bin/bash

#############################################
# FLO OFFLINE MODE SETUP SCRIPT
# Automated setup for offline autonomy system
#############################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OFFLINE_DIR="$SCRIPT_DIR"

#############################################
# PHASE 1: SYSTEM CHECKS
#############################################

check_os() {
    log_info "Checking operating system..."
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
        log_success "Detected: $OS $VER"

        if [[ "$OS" != "ubuntu" && "$OS" != "debian" ]]; then
            log_warning "This script is optimized for Ubuntu/Debian. Other distros may require manual setup."
        fi
    else
        log_error "Cannot detect OS"
        exit 1
    fi
}

check_internet() {
    log_info "Checking internet connection..."
    if ping -c 1 8.8.8.8 &> /dev/null; then
        log_success "Internet connection available"
        return 0
    else
        log_warning "No internet connection. Will skip package installations."
        return 1
    fi
}

#############################################
# PHASE 2: DEPENDENCY INSTALLATION
#############################################

install_docker() {
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | cut -d ',' -f1)
        log_success "Docker already installed: $DOCKER_VERSION"
        return 0
    fi

    log_info "Installing Docker..."

    # Update package index
    sudo apt-get update

    # Install prerequisites
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release

    # Add Docker GPG key
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

    # Setup repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    # Add user to docker group
    sudo usermod -aG docker $USER

    log_success "Docker installed successfully"
    log_warning "You may need to log out and back in for docker group changes to take effect"
}

install_nodejs() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_success "Node.js already installed: $NODE_VERSION"

        # Check if version is >= 18
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d 'v' -f2 | cut -d '.' -f1)
        if [ "$MAJOR_VERSION" -lt 18 ]; then
            log_warning "Node.js version is < 18. Upgrading recommended."
        fi
        return 0
    fi

    log_info "Installing Node.js via NodeSource..."

    # Install Node.js 20.x
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs

    log_success "Node.js installed: $(node --version)"
}

install_pnpm() {
    if command -v pnpm &> /dev/null; then
        PNPM_VERSION=$(pnpm --version)
        log_success "pnpm already installed: $PNPM_VERSION"
        return 0
    fi

    log_info "Installing pnpm..."
    npm install -g pnpm

    log_success "pnpm installed: $(pnpm --version)"
}

install_dependencies() {
    log_info "Installing system dependencies..."

    sudo apt-get update
    sudo apt-get install -y \
        curl \
        wget \
        git \
        build-essential

    log_success "System dependencies installed"
}

#############################################
# PHASE 3: PROJECT SETUP
#############################################

setup_project_structure() {
    log_info "Setting up project structure..."

    cd "$PROJECT_ROOT"

    # Create flo-offline-mode if it doesn't exist
    if [ ! -d "flo-offline-mode" ]; then
        mkdir -p flo-offline-mode
        log_success "Created flo-offline-mode directory"
    else
        log_info "flo-offline-mode directory already exists"
    fi

    # Copy mission-control if not already copied
    if [ ! -d "flo-offline-mode/mission-control" ]; then
        log_info "Copying mission-control to flo-offline-mode..."
        cp -r mission-control flo-offline-mode/
        log_success "mission-control copied"
    else
        log_info "mission-control already exists in flo-offline-mode"
    fi

    # Copy mission-control-frontend if not already copied
    if [ ! -d "flo-offline-mode/mission-control-frontend" ]; then
        log_info "Copying mission-control-frontend to flo-offline-mode..."
        cp -r mission-control-frontend flo-offline-mode/
        log_success "mission-control-frontend copied"
    else
        log_info "mission-control-frontend already exists in flo-offline-mode"
    fi
}

setup_docker_compose() {
    log_info "Setting up docker-compose.yml..."

    cd "$OFFLINE_DIR"

    # Check if docker-compose.yml already exists
    if [ -f "docker-compose.yml" ]; then
        log_info "docker-compose.yml already exists"
        return 0
    fi

    # Create docker-compose.yml
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # MongoDB - Local database
  mongodb:
    image: mongo:6.0
    container_name: flo-offline-mongodb
    ports:
      - "27017:27017"
    volumes:
      - ./data/mongodb:/data/db
    environment:
      - MONGO_INITDB_DATABASE=mission-control
    restart: unless-stopped
    networks:
      - flo-network

  # MinIO - S3-compatible object storage for LIDAR maps
  minio:
    image: minio/minio:latest
    container_name: flo-offline-minio
    ports:
      - "9000:9000"  # S3 API
      - "9001:9001"  # Web Console UI
    environment:
      MINIO_ROOT_USER: flo
      MINIO_ROOT_PASSWORD: flo123456
    volumes:
      - ./data/minio:/data
    command: server /data --console-address ":9001"
    restart: unless-stopped
    networks:
      - flo-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  # MinIO Client - Initialize bucket on startup
  minio-init:
    image: minio/mc:latest
    container_name: flo-offline-minio-init
    depends_on:
      - minio
    networks:
      - flo-network
    entrypoint: >
      /bin/sh -c "
      sleep 10;
      echo 'Setting up MinIO...';
      mc alias set local http://minio:9000 flo flo123456;
      mc mb local/lidar-maps --ignore-existing;
      mc anonymous set download local/lidar-maps;
      echo 'MinIO setup complete!';
      "
    restart: "no"

networks:
  flo-network:
    driver: bridge
EOF

    log_success "docker-compose.yml created"
}

setup_backend_config() {
    log_info "Configuring backend for offline mode..."

    cd "$OFFLINE_DIR/mission-control"

    # Backup original .env
    if [ -f ".env" ] && [ ! -f ".env.backup" ]; then
        cp .env .env.backup
        log_info "Original .env backed up to .env.backup"
    fi

    # Update .env file
    if grep -q "OFFLINE_MODE" .env; then
        log_info ".env already configured for offline mode"
    else
        # Add offline mode flag
        sed -i '1s/^/OFFLINE_MODE=true\n/' .env

        # Update MongoDB URI
        sed -i 's|^DB_URI.*|DB_URI=mongodb://localhost:27017/mission-control|' .env

        # Add MinIO configuration
        if ! grep -q "AWS_ENDPOINT" .env; then
            cat >> .env << 'EOF'

# MinIO Configuration (Offline S3)
AWS_ENDPOINT=http://localhost:9000
AWS_ACCESS_KEY=flo
AWS_SECRET_KEY=flo123456
AWS_REGION=us-east-1
AWS_BUCKET=lidar-maps
AWS_FORCE_PATH_STYLE=true
EOF
        fi

        log_success "Backend .env configured"
    fi

    # Update server.ts for offline mode (skip MQTT)
    if ! grep -q "OFFLINE_MODE" backend/server.ts; then
        log_info "Updating server.ts to skip MQTT in offline mode..."

        # This will be done manually or via sed/patch
        log_warning "Please verify server.ts has MQTT offline mode checks"
    fi
}

setup_backend_dependencies() {
    log_info "Installing backend dependencies..."

    cd "$OFFLINE_DIR/mission-control"

    if [ -d "node_modules" ]; then
        log_info "node_modules already exists, skipping install"
    else
        pnpm install
        log_success "Backend dependencies installed"
    fi
}

setup_frontend_dependencies() {
    log_info "Installing frontend dependencies..."

    cd "$OFFLINE_DIR/mission-control-frontend"

    if [ -d "node_modules" ]; then
        log_info "node_modules already exists, skipping install"
    else
        npm install
        log_success "Frontend dependencies installed"
    fi
}

#############################################
# PHASE 4: DOCKER CONTAINERS
#############################################

start_docker_containers() {
    log_info "Starting Docker containers..."

    cd "$OFFLINE_DIR"

    # Pull images first
    log_info "Pulling Docker images..."
    docker compose pull

    # Start containers
    docker compose up -d mongodb minio

    # Wait for containers to be healthy
    log_info "Waiting for containers to start..."
    sleep 10

    # Initialize MinIO bucket
    docker compose up minio-init

    log_success "Docker containers started"
}

#############################################
# PHASE 5: DATA IMPORT
#############################################

import_production_data() {
    log_info "Setting up data import scripts..."

    cd "$OFFLINE_DIR"

    # Check if scripts exist
    if [ ! -f "export-prod-data.sh" ] || [ ! -f "import-to-local.sh" ]; then
        log_error "Data import scripts not found"
        log_info "Please ensure export-prod-data.sh and import-to-local.sh exist"
        return 1
    fi

    # Make scripts executable
    chmod +x export-prod-data.sh import-to-local.sh

    log_info "Data import scripts ready"
    log_warning "Run './export-prod-data.sh' to download production data (requires internet)"
    log_warning "Then run './import-to-local.sh' to import into local MongoDB"
}

#############################################
# PHASE 6: VERIFICATION
#############################################

verify_setup() {
    log_info "Verifying setup..."

    local errors=0

    # Check Docker
    if ! docker ps | grep -q flo-offline-mongodb; then
        log_error "MongoDB container not running"
        errors=$((errors+1))
    else
        log_success "MongoDB container running"
    fi

    if ! docker ps | grep -q flo-offline-minio; then
        log_error "MinIO container not running"
        errors=$((errors+1))
    else
        log_success "MinIO container running"
    fi

    # Check MinIO health
    if curl -sf http://localhost:9000/minio/health/live > /dev/null; then
        log_success "MinIO is healthy"
    else
        log_error "MinIO health check failed"
        errors=$((errors+1))
    fi

    # Check project structure
    if [ -d "$OFFLINE_DIR/mission-control" ]; then
        log_success "Backend directory exists"
    else
        log_error "Backend directory missing"
        errors=$((errors+1))
    fi

    if [ -d "$OFFLINE_DIR/mission-control-frontend" ]; then
        log_success "Frontend directory exists"
    else
        log_error "Frontend directory missing"
        errors=$((errors+1))
    fi

    return $errors
}

#############################################
# MAIN EXECUTION
#############################################

main() {
    echo ""
    echo "========================================"
    echo "  FLO OFFLINE MODE SETUP"
    echo "========================================"
    echo ""

    # Phase 1: System checks
    check_os
    HAS_INTERNET=0
    check_internet && HAS_INTERNET=1 || HAS_INTERNET=0

    # Phase 2: Install dependencies (if internet available)
    if [ $HAS_INTERNET -eq 1 ]; then
        install_dependencies
        install_docker
        install_nodejs
        install_pnpm
    else
        log_warning "Skipping dependency installation (no internet)"
    fi

    # Phase 3: Project setup
    setup_project_structure
    setup_docker_compose
    setup_backend_config

    if [ $HAS_INTERNET -eq 1 ]; then
        setup_backend_dependencies
        setup_frontend_dependencies
    else
        log_warning "Skipping npm/pnpm install (no internet)"
    fi

    # Phase 4: Docker containers
    start_docker_containers

    # Phase 5: Data import setup
    import_production_data

    # Phase 6: Verification
    echo ""
    log_info "Running verification checks..."
    if verify_setup; then
        echo ""
        echo "========================================"
        log_success "SETUP COMPLETE!"
        echo "========================================"
        echo ""
        echo "Next steps:"
        echo ""
        echo "1. Import production data:"
        echo "   cd $OFFLINE_DIR"
        echo "   ./export-prod-data.sh    # Download from production (requires internet)"
        echo "   ./import-to-local.sh      # Import to local MongoDB"
        echo ""
        echo "2. Start backend:"
        echo "   cd mission-control"
        echo "   pnpm serve"
        echo ""
        echo "3. Start frontend:"
        echo "   cd mission-control-frontend"
        echo "   npm run dev"
        echo ""
        echo "4. Access application:"
        echo "   http://localhost:3000"
        echo ""
        echo "5. MinIO Web UI:"
        echo "   http://localhost:9001"
        echo "   User: flo / Pass: flo123456"
        echo ""
    else
        log_error "Setup verification failed. Please check errors above."
        exit 1
    fi
}

# Run main function
main "$@"
