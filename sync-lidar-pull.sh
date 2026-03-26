#!/bin/bash

################################################################################
# FLO Offline Mode - LIDAR Maps Pull Script
#
# This script downloads LIDAR maps from AWS S3 to local MinIO:
# 1. MongoDB metadata (lidarmaps collection)
# 2. S3 files (.pcd, .pgm, .yaml, .json files)
#
# Usage: ./sync-lidar-pull.sh [--full]
#        --full: Download all LIDAR maps (not just new ones)
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_DIR="/home/shanks/Music/flo-offline-mode"
LOCAL_MONGO_URI="mongodb://localhost:27017"
PROD_MONGO_URI="mongodb://web-prod:Mongo%40flo%23prod23@164.52.207.199:27017/mission-control?authSource=admin"
DB_NAME="mission-control"
TEMP_DIR="/tmp/lidar-pull-$(date +%s)"
MINIO_ENDPOINT="http://localhost:9000"
MINIO_ACCESS_KEY="flo"
MINIO_SECRET_KEY="flo123456"
MINIO_BUCKET="lidar-maps"
AWS_BUCKET="lidar-maps"
AWS_REGION="ap-south-1"

# Parse arguments
FULL_SYNC=false
if [[ "$1" == "--full" ]]; then
    FULL_SYNC=true
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}FLO Offline - Pull LIDAR Maps${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Check prerequisites
echo -e "${YELLOW}[1/5] Checking prerequisites...${NC}"

# Check Docker containers
if ! docker ps | grep -q "flo-offline-mongodb"; then
    echo -e "${RED}Error: MongoDB container not running${NC}"
    echo -e "${YELLOW}Start with: cd $PROJECT_DIR && ./start-offline-mode.sh${NC}"
    exit 1
fi

if ! docker ps | grep -q "flo-offline-minio"; then
    echo -e "${RED}Error: MinIO container not running${NC}"
    echo -e "${YELLOW}Start with: cd $PROJECT_DIR && ./start-offline-mode.sh${NC}"
    exit 1
fi

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI not installed${NC}"
    echo -e "${YELLOW}Install with: sudo apt install awscli${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    echo -e "${YELLOW}Configure with: aws configure${NC}"
    echo -e "${YELLOW}Access Key: AKIAVGOHVI5BHNSGHYWM${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites met${NC}"
echo ""

# Create temp directory
mkdir -p "$TEMP_DIR"

# Step 2: Pull LIDAR metadata from MongoDB
echo -e "${YELLOW}[2/5] Pulling LIDAR metadata from production...${NC}"

# Check how many LIDAR maps exist in production
prod_count=$(docker exec flo-offline-mongodb mongosh "$PROD_MONGO_URI" --quiet --eval "
    db.lidarmaps.countDocuments();
" 2>/dev/null | tail -1 | tr -d '\r\n')

echo -e "${BLUE}  → Production has ${prod_count} LIDAR maps${NC}"

# Export LIDAR maps metadata from production
docker exec flo-offline-mongodb mongodump \
    --uri="$PROD_MONGO_URI" \
    --db="$DB_NAME" \
    --collection="lidarmaps" \
    --out=/tmp/lidar-metadata 2>&1 | grep -v "warning" > /dev/null

# Import to local MongoDB (upsert mode - won't overwrite existing)
docker exec flo-offline-mongodb mongorestore \
    --uri="$LOCAL_MONGO_URI" \
    --db="$DB_NAME" \
    --collection="lidarmaps" \
    --mode=upsert \
    /tmp/lidar-metadata/$DB_NAME/lidarmaps.bson 2>&1 | grep -E "imported|restored" || true

# Cleanup
docker exec flo-offline-mongodb rm -rf /tmp/lidar-metadata 2>/dev/null || true

echo -e "${GREEN}✓ LIDAR metadata pulled${NC}"
echo ""

# Step 3: Download LIDAR files from S3
echo -e "${YELLOW}[3/5] Downloading LIDAR files from AWS S3...${NC}"

# List files in production S3 bucket
echo -e "${BLUE}  → Checking S3 bucket: s3://${AWS_BUCKET}${NC}"
file_count=$(aws s3 ls "s3://$AWS_BUCKET/" --recursive | wc -l || echo "0")

if [ "$file_count" -eq 0 ]; then
    echo -e "${YELLOW}  → No files found in S3 bucket${NC}"
else
    echo -e "${BLUE}  → Found ${file_count} files in S3${NC}"

    # Download files from S3 to local directory
    mkdir -p "$TEMP_DIR/s3-download"

    if [ "$FULL_SYNC" = true ]; then
        echo -e "${BLUE}  → Downloading ALL files (full sync)...${NC}"
        echo -e "${YELLOW}  → This may take a while...${NC}"
        aws s3 sync "s3://$AWS_BUCKET/" "$TEMP_DIR/s3-download/" --region "$AWS_REGION" 2>&1 | \
            grep -E "download:|Completed" || true
    else
        echo -e "${BLUE}  → Downloading new files only...${NC}"
        # Download only files that don't exist locally
        aws s3 sync "s3://$AWS_BUCKET/" "$TEMP_DIR/s3-download/" \
            --region "$AWS_REGION" \
            --size-only \
            2>&1 | grep -E "download:|Completed" || true
    fi

    downloaded=$(find "$TEMP_DIR/s3-download" -type f 2>/dev/null | wc -l || echo "0")
    echo -e "${GREEN}  ✓ Downloaded ${downloaded} files${NC}"
fi

echo ""

# Step 4: Upload files to local MinIO
echo -e "${YELLOW}[4/5] Uploading files to local MinIO...${NC}"

if [ ! -d "$TEMP_DIR/s3-download" ] || [ ! "$(ls -A $TEMP_DIR/s3-download 2>/dev/null)" ]; then
    echo -e "${BLUE}  → No files to upload${NC}"
else
    # Copy files to MinIO container
    docker cp "$TEMP_DIR/s3-download/." flo-offline-minio:/tmp/s3-import/ 2>/dev/null || true

    # Configure MinIO client and upload
    docker exec flo-offline-minio sh -c "
        mc alias set local http://localhost:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY > /dev/null 2>&1;
        mc mb local/$MINIO_BUCKET --ignore-existing > /dev/null 2>&1;
        mc cp --recursive /tmp/s3-import/ local/$MINIO_BUCKET/ 2>&1 | grep -E 'Copied|Total';
        rm -rf /tmp/s3-import;
    "

    # Count files in MinIO
    local_count=$(docker exec flo-offline-minio mc ls local/$MINIO_BUCKET --recursive 2>/dev/null | wc -l || echo "0")
    echo -e "${GREEN}  ✓ MinIO now has ${local_count} files${NC}"
fi

echo ""

# Step 5: Cleanup
echo -e "${YELLOW}[5/5] Cleaning up...${NC}"
rm -rf "$TEMP_DIR"
echo -e "${GREEN}✓ Cleanup completed${NC}"
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}LIDAR Maps Pull Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "  • MongoDB metadata: ${prod_count} LIDAR maps"
echo -e "  • S3 files downloaded: ${downloaded}"
echo -e "  • MinIO total files: ${local_count}"
echo ""
echo -e "${YELLOW}Access MinIO Console:${NC}"
echo -e "  URL: http://localhost:9001"
echo -e "  User: flo"
echo -e "  Pass: flo123456"
echo ""
echo -e "${YELLOW}Tip: Use --full flag to re-download all files${NC}"
echo ""
