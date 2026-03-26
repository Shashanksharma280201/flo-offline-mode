#!/bin/bash

#############################################
# FLO OFFLINE MODE - COMPLETE SETUP SCRIPT
# Installs: Docker, Conda, Node.js, Redis, all dependencies
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
OFFLINE_DIR="$SCRIPT_DIR"
CONDA_ENV_NAME="flo-offline"
CONDA_INSTALL_DIR="$HOME/miniconda3"
REDIS_DIR="$OFFLINE_DIR/RedisJSON"

echo ""
echo "========================================"
echo "  FLO OFFLINE MODE - COMPLETE SETUP"
echo "========================================"
echo ""
log_info "Installation directory: $OFFLINE_DIR"
log_info "Conda environment: $CONDA_ENV_NAME"
echo ""

#############################################
# PHASE 1: SYSTEM CHECKS
#############################################

log_info "Phase 1: System Checks"
echo "----------------------------------------"

check_os() {
    log_info "Checking operating system..."
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
        log_success "Detected: $OS $VER"

        if [[ "$OS" != "ubuntu" && "$OS" != "debian" ]]; then
            log_warning "This script is optimized for Ubuntu/Debian. Other distros may require manual adjustments."
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
        log_error "No internet connection detected. Setup requires internet."
        exit 1
    fi
}

check_os
check_internet

echo ""

#############################################
# PHASE 2: INSTALL DOCKER
#############################################

log_info "Phase 2: Installing Docker"
echo "----------------------------------------"

install_docker() {
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | cut -d ',' -f1)
        log_success "Docker already installed: $DOCKER_VERSION"

        # Check if user is in docker group
        if groups $USER | grep -q '\bdocker\b'; then
            log_success "User is in docker group"
        else
            log_warning "Adding user to docker group..."
            sudo usermod -aG docker $USER
            log_warning "You need to log out and back in for docker group changes to take effect"
        fi
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

    # Start Docker service
    sudo systemctl enable docker
    sudo systemctl start docker

    log_success "Docker installed successfully"
    log_warning "You need to log out and back in for docker group changes to take effect"
}

install_docker

echo ""

#############################################
# PHASE 3: INSTALL CONDA (MINICONDA)
#############################################

log_info "Phase 3: Installing Conda"
echo "----------------------------------------"

install_conda() {
    if command -v conda &> /dev/null; then
        CONDA_VERSION=$(conda --version)
        log_success "Conda already installed: $CONDA_VERSION"
        return 0
    fi

    log_info "Installing Miniconda..."

    # Download Miniconda installer
    MINICONDA_INSTALLER="Miniconda3-latest-Linux-x86_64.sh"
    cd /tmp
    wget https://repo.anaconda.com/miniconda/$MINICONDA_INSTALLER -O miniconda.sh

    # Install Miniconda
    bash miniconda.sh -b -p $CONDA_INSTALL_DIR

    # Initialize conda
    eval "$($CONDA_INSTALL_DIR/bin/conda shell.bash hook)"
    $CONDA_INSTALL_DIR/bin/conda init bash

    # Clean up installer
    rm miniconda.sh

    log_success "Miniconda installed: $CONDA_INSTALL_DIR"
    log_info "Conda initialized in bash. Reloading shell configuration..."

    # Source bashrc to activate conda
    source ~/.bashrc || true
}

install_conda

# Ensure conda is in PATH for this script
export PATH="$CONDA_INSTALL_DIR/bin:$PATH"
eval "$(conda shell.bash hook)" 2>/dev/null || true

# Configure Conda to use only conda-forge (no ToS required)
log_info "Configuring Conda channels..."

# Create/overwrite .condarc to use only conda-forge
cat > ~/.condarc << 'EOF'
channels:
  - conda-forge
channel_priority: strict
auto_activate_base: false
EOF

log_success "Conda configured to use conda-forge channel only"

echo ""

#############################################
# PHASE 4: CREATE CONDA ENVIRONMENT
#############################################

log_info "Phase 4: Creating Conda Environment"
echo "----------------------------------------"

create_conda_env() {
    log_info "Checking for existing conda environment: $CONDA_ENV_NAME"

    if conda env list | grep -q "^$CONDA_ENV_NAME "; then
        log_warning "Conda environment '$CONDA_ENV_NAME' already exists"
        read -p "Remove and recreate? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Removing existing environment..."
            conda env remove -n $CONDA_ENV_NAME -y
        else
            log_info "Using existing environment"
            conda activate $CONDA_ENV_NAME
            return 0
        fi
    fi

    log_info "Creating conda environment with Python 3.11 and Node.js 20..."
    log_warning "Build tools (gcc, rust, cargo) will be installed via system packages..."

    conda create -n $CONDA_ENV_NAME -y --override-channels -c conda-forge \
        python=3.11 \
        nodejs=20 \
        npm

    log_success "Conda environment '$CONDA_ENV_NAME' created"

    # Activate environment
    conda activate $CONDA_ENV_NAME
    log_success "Conda environment activated"
}

create_conda_env

echo ""

#############################################
# PHASE 5: INSTALL NODE.JS TOOLS
#############################################

log_info "Phase 5: Installing Node.js Tools"
echo "----------------------------------------"

install_node_tools() {
    log_info "Installing pnpm globally..."
    npm install -g pnpm

    log_success "Node.js version: $(node --version)"
    log_success "npm version: $(npm --version)"
    log_success "pnpm version: $(pnpm --version)"
}

install_node_tools

echo ""

#############################################
# PHASE 6: INSTALL SYSTEM DEPENDENCIES
#############################################

log_info "Phase 6: Installing System Dependencies"
echo "----------------------------------------"

install_system_deps() {
    log_info "Installing system packages..."

    sudo apt-get update
    sudo apt-get install -y \
        curl \
        wget \
        git \
        build-essential \
        tmux \
        jq \
        awscli \
        pkg-config \
        libssl-dev \
        clang

    # Install Rust and Cargo via rustup
    if ! command -v cargo &> /dev/null; then
        log_info "Installing Rust and Cargo..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source $HOME/.cargo/env
        log_success "Rust and Cargo installed"
    else
        log_success "Rust and Cargo already installed"
    fi

    log_success "System dependencies installed"
}

install_system_deps

echo ""

#############################################
# PHASE 7: BUILD REDIS WITH REDISJSON
#############################################

log_info "Phase 7: Building Redis with RedisJSON"
echo "----------------------------------------"

build_redis() {
    if [ -f "$REDIS_DIR/target/release/librejson.so" ]; then
        log_info "RedisJSON already built"
        return 0
    fi

    log_info "Cloning RedisJSON repository..."

    if [ ! -d "$REDIS_DIR" ]; then
        cd "$OFFLINE_DIR"
        git clone https://github.com/RedisJSON/RedisJSON.git
        cd "$REDIS_DIR"
    else
        cd "$REDIS_DIR"
    fi

    log_info "Building RedisJSON module (this may take 5-10 minutes)..."
    cargo build --release

    if [ -f "target/release/librejson.so" ]; then
        log_success "RedisJSON module built successfully"
        log_info "Module location: $REDIS_DIR/target/release/librejson.so"
    else
        log_error "Failed to build RedisJSON module"
        exit 1
    fi
}

build_redis

echo ""

#############################################
# PHASE 8: SETUP DOCKER CONTAINERS
#############################################

log_info "Phase 8: Setting up Docker Containers"
echo "----------------------------------------"

setup_docker_compose() {
    cd "$OFFLINE_DIR"

    log_info "Creating docker-compose.yml..."

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

start_docker_containers() {
    cd "$OFFLINE_DIR"

    log_info "Starting Docker containers..."

    # Create data directories
    mkdir -p data/mongodb data/minio

    # Pull images
    log_info "Pulling Docker images (this may take a few minutes)..."
    docker compose pull

    # Start containers
    docker compose up -d mongodb minio

    # Wait for containers to start
    log_info "Waiting for containers to start..."
    sleep 10

    # Initialize MinIO bucket
    log_info "Initializing MinIO bucket..."
    docker compose up minio-init

    log_success "Docker containers started"
}

setup_docker_compose
start_docker_containers

echo ""

#############################################
# PHASE 9: CONFIGURE BACKEND
#############################################

log_info "Phase 9: Configuring Backend"
echo "----------------------------------------"

setup_backend() {
    cd "$OFFLINE_DIR/mission-control"

    log_info "Checking backend .env configuration..."

    # Backup original .env
    if [ -f ".env" ] && [ ! -f ".env.backup" ]; then
        cp .env .env.backup
        log_info "Original .env backed up to .env.backup"
    fi

    # Check if .env exists
    if [ ! -f ".env" ]; then
        log_error ".env file not found in mission-control/"
        log_info "Please create .env file first"
        exit 1
    fi

    # Update .env for offline mode
    log_info "Updating .env for offline mode..."

    # Add OFFLINE_MODE if not present
    if ! grep -q "^OFFLINE_MODE" .env; then
        sed -i '1s/^/OFFLINE_MODE=true\n/' .env
    else
        sed -i 's/^OFFLINE_MODE=.*/OFFLINE_MODE=true/' .env
    fi

    # Update MongoDB URI
    sed -i 's|^DB_URI=.*|DB_URI=mongodb://localhost:27017/mission-control|' .env

    # Add MinIO configuration if not present
    if ! grep -q "^AWS_ENDPOINT" .env; then
        cat >> .env << 'ENVEOF'

# MinIO Configuration (Offline S3)
AWS_ENDPOINT=http://localhost:9000
AWS_ACCESS_KEY=flo
AWS_SECRET_KEY=flo123456
AWS_REGION=us-east-1
AWS_BUCKET=lidar-maps
AWS_FORCE_PATH_STYLE=true
ENVEOF
    fi

    log_success "Backend .env configured for offline mode"
}

install_backend_deps() {
    cd "$OFFLINE_DIR/mission-control"

    log_info "Installing backend dependencies with pnpm..."
    log_warning "This may take 5-10 minutes..."

    # Activate conda environment
    eval "$(conda shell.bash hook)"
    conda activate $CONDA_ENV_NAME

    pnpm install

    log_success "Backend dependencies installed"
}

build_backend() {
    cd "$OFFLINE_DIR/mission-control"

    log_info "Building backend TypeScript..."

    # Activate conda environment
    eval "$(conda shell.bash hook)"
    conda activate $CONDA_ENV_NAME

    pnpm run build

    log_success "Backend built successfully"
}

setup_backend
install_backend_deps
build_backend

echo ""

#############################################
# PHASE 10: CONFIGURE FRONTEND
#############################################

log_info "Phase 10: Configuring Frontend"
echo "----------------------------------------"

install_frontend_deps() {
    cd "$OFFLINE_DIR/mission-control-frontend"

    log_info "Installing frontend dependencies with npm..."
    log_warning "This may take 5-10 minutes..."

    # Activate conda environment
    eval "$(conda shell.bash hook)"
    conda activate $CONDA_ENV_NAME

    npm install

    log_success "Frontend dependencies installed"
}

install_frontend_deps

echo ""

#############################################
# PHASE 11: MAKE SCRIPTS EXECUTABLE
#############################################

log_info "Phase 11: Setting Script Permissions"
echo "----------------------------------------"

setup_scripts() {
    cd "$OFFLINE_DIR"

    log_info "Making scripts executable..."

    chmod +x setup.sh
    chmod +x start-offline-mode.sh
    chmod +x install-boot-service.sh
    chmod +x sync-lidar-pull.sh
    chmod +x sync-lidar-push.sh

    if [ -f "export-prod-data.sh" ]; then
        chmod +x export-prod-data.sh
    fi

    if [ -f "import-to-local.sh" ]; then
        chmod +x import-to-local.sh
    fi

    log_success "Script permissions set"
}

setup_scripts

echo ""

#############################################
# PHASE 12: VERIFICATION
#############################################

log_info "Phase 12: Verifying Installation"
echo "----------------------------------------"

verify_setup() {
    local errors=0

    log_info "Checking Docker..."
    if ! docker ps | grep -q flo-offline-mongodb; then
        log_error "MongoDB container not running"
        errors=$((errors+1))
    else
        log_success "✓ MongoDB container running"
    fi

    if ! docker ps | grep -q flo-offline-minio; then
        log_error "MinIO container not running"
        errors=$((errors+1))
    else
        log_success "✓ MinIO container running"
    fi

    log_info "Checking MinIO health..."
    if curl -sf http://localhost:9000/minio/health/live > /dev/null; then
        log_success "✓ MinIO is healthy"
    else
        log_error "MinIO health check failed"
        errors=$((errors+1))
    fi

    log_info "Checking Conda environment..."
    if conda env list | grep -q "^$CONDA_ENV_NAME "; then
        log_success "✓ Conda environment '$CONDA_ENV_NAME' exists"
    else
        log_error "Conda environment not found"
        errors=$((errors+1))
    fi

    log_info "Checking Redis module..."
    if [ -f "$REDIS_DIR/target/release/librejson.so" ]; then
        log_success "✓ RedisJSON module built"
    else
        log_error "RedisJSON module not found"
        errors=$((errors+1))
    fi

    log_info "Checking backend..."
    if [ -d "$OFFLINE_DIR/mission-control/node_modules" ]; then
        log_success "✓ Backend dependencies installed"
    else
        log_error "Backend node_modules missing"
        errors=$((errors+1))
    fi

    if [ -d "$OFFLINE_DIR/mission-control/build" ]; then
        log_success "✓ Backend built"
    else
        log_warning "Backend build directory missing (will build on first run)"
    fi

    log_info "Checking frontend..."
    if [ -d "$OFFLINE_DIR/mission-control-frontend/node_modules" ]; then
        log_success "✓ Frontend dependencies installed"
    else
        log_error "Frontend node_modules missing"
        errors=$((errors+1))
    fi

    return $errors
}

echo ""
if verify_setup; then
    echo ""
    echo "========================================"
    log_success "SETUP COMPLETE!"
    echo "========================================"
    echo ""
    echo "Installation Summary:"
    echo "  • Docker installed and containers running"
    echo "  • Conda environment: $CONDA_ENV_NAME"
    echo "  • Node.js: $(node --version)"
    echo "  • Backend dependencies: installed"
    echo "  • Frontend dependencies: installed"
    echo "  • Redis with RedisJSON: built"
    echo ""
    echo "----------------------------------------"
    echo "NEXT STEPS:"
    echo "----------------------------------------"
    echo ""
    echo "1. ACTIVATE CONDA ENVIRONMENT (in new terminal):"
    echo "   conda activate $CONDA_ENV_NAME"
    echo ""
    echo "2. START REDIS SERVER:"
    echo "   cd $REDIS_DIR"
    echo "   redis-server --loadmodule target/release/librejson.so"
    echo ""
    echo "3. START SERVICES (option A - manual):"
    echo "   # Terminal 1 - Backend"
    echo "   cd $OFFLINE_DIR/mission-control"
    echo "   conda activate $CONDA_ENV_NAME"
    echo "   pnpm serve"
    echo ""
    echo "   # Terminal 2 - Frontend"
    echo "   cd $OFFLINE_DIR/mission-control-frontend"
    echo "   conda activate $CONDA_ENV_NAME"
    echo "   npm run dev"
    echo ""
    echo "3. START SERVICES (option B - tmux):"
    echo "   cd $OFFLINE_DIR"
    echo "   ./start-offline-mode.sh"
    echo ""
    echo "4. ACCESS APPLICATION:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:5000"
    echo "   MinIO UI: http://localhost:9001 (user: flo / pass: flo123456)"
    echo ""
    echo "5. OPTIONAL - Setup auto-start on boot:"
    echo "   sudo ./install-boot-service.sh"
    echo ""
    echo "----------------------------------------"
    echo "DATA SYNCHRONIZATION:"
    echo "----------------------------------------"
    echo ""
    echo "Pull LIDAR maps from AWS S3:"
    echo "  ./sync-lidar-pull.sh"
    echo ""
    echo "Push LIDAR maps to AWS S3:"
    echo "  ./sync-lidar-push.sh"
    echo ""
    echo "----------------------------------------"
    echo "IMPORTANT NOTES:"
    echo "----------------------------------------"
    echo ""
    echo "• You may need to LOG OUT and LOG BACK IN for docker group to take effect"
    echo "• Always activate conda environment before running services:"
    echo "  conda activate $CONDA_ENV_NAME"
    echo "• Redis must be started manually before backend"
    echo ""
else
    log_error "Setup verification failed. Please check errors above."
    exit 1
fi
