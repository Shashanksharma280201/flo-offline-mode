#!/bin/bash

################################################################################
# FLO Offline Mode - LIDAR Maps Push Script
#
# This script uploads LIDAR maps from local MinIO to AWS S3:
# 1. MongoDB metadata (lidarmaps collection - new documents only)
# 2. MinIO files → AWS S3 (all files, without deleting local copies)
#
# Usage: ./sync-lidar-push.sh
#
# Note: Local data is PRESERVED after push (no deletion)
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
TEMP_DIR="/tmp/lidar-push-$(date +%s)"
MINIO_ENDPOINT="http://localhost:9000"
MINIO_ACCESS_KEY="flo"
MINIO_SECRET_KEY="flo123456"
MINIO_BUCKET="lidar-maps"
AWS_BUCKET="lidar-maps"
AWS_REGION="ap-south-1"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}FLO Offline - Push LIDAR Maps${NC}"
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

# Step 2: Push LIDAR metadata to production MongoDB
echo -e "${YELLOW}[2/5] Pushing LIDAR metadata to production...${NC}"

# Check for unsynced LIDAR maps (documents without syncedAt field)
unsynced_count=$(docker exec flo-offline-mongodb mongosh "$LOCAL_MONGO_URI/$DB_NAME" --quiet --eval "
    db.lidarmaps.countDocuments({ syncedAt: { \$exists: false } });
" 2>/dev/null | tail -1 | tr -d '\r\n')

if [ "$unsynced_count" -eq 0 ]; then
    echo -e "${BLUE}  → No new LIDAR maps to sync${NC}"
else
    echo -e "${BLUE}  → Found ${unsynced_count} new LIDAR maps${NC}"

    # Export unsynced documents
    docker exec flo-offline-mongodb mongodump \
        --uri="$LOCAL_MONGO_URI" \
        --db="$DB_NAME" \
        --collection="lidarmaps" \
        --query='{"syncedAt": {"$exists": false}}' \
        --out=/tmp/lidar-push 2>&1 | grep -v "warning" > /dev/null

    # Import to production MongoDB (upsert mode)
    docker exec flo-offline-mongodb mongorestore \
        --uri="$PROD_MONGO_URI" \
        --db="$DB_NAME" \
        --collection="lidarmaps" \
        --mode=upsert \
        /tmp/lidar-push/$DB_NAME/lidarmaps.bson 2>&1 | grep -E "imported|restored" || true

    # Mark documents as synced in local database
    docker exec flo-offline-mongodb mongosh "$LOCAL_MONGO_URI/$DB_NAME" --quiet --eval "
        db.lidarmaps.updateMany(
            { syncedAt: { \$exists: false } },
            { \$set: { syncedAt: new Date() } }
        );
    " > /dev/null 2>&1

    # Cleanup
    docker exec flo-offline-mongodb rm -rf /tmp/lidar-push 2>/dev/null || true

    echo -e "${GREEN}  ✓ Synced ${unsynced_count} LIDAR maps to production${NC}"
fi

echo ""

# Step 3: Check local MinIO files
echo -e "${YELLOW}[3/5] Checking local MinIO files...${NC}"

# Configure MinIO client
docker exec flo-offline-minio mc alias set local http://localhost:9000 "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" > /dev/null 2>&1

# List files in MinIO
local_file_count=$(docker exec flo-offline-minio mc ls local/$MINIO_BUCKET --recursive 2>/dev/null | wc -l || echo "0")

if [ "$local_file_count" -eq 0 ]; then
    echo -e "${YELLOW}  → No files in local MinIO${NC}"
else
    echo -e "${BLUE}  → Found ${local_file_count} files in MinIO${NC}"
fi

echo ""

# Step 4: Upload files to AWS S3
echo -e "${YELLOW}[4/5] Uploading files to AWS S3...${NC}"

if [ "$local_file_count" -eq 0 ]; then
    echo -e "${BLUE}  → No files to upload${NC}"
else
    # Copy files from MinIO to temp directory
    docker exec flo-offline-minio mc cp --recursive local/$MINIO_BUCKET/ /tmp/minio-export/ 2>&1 | grep -v "Waiting" || true

    # Copy from container to host
    docker cp flo-offline-minio:/tmp/minio-export "$TEMP_DIR/s3-upload" 2>/dev/null || true

    if [ -d "$TEMP_DIR/s3-upload" ] && [ "$(ls -A $TEMP_DIR/s3-upload)" ]; then
        # Upload to AWS S3
        echo -e "${BLUE}  → Uploading to S3 bucket: s3://${AWS_BUCKET}${NC}"
        echo -e "${YELLOW}  → This may take a while...${NC}"

        aws s3 sync "$TEMP_DIR/s3-upload/" "s3://$AWS_BUCKET/" \
            --region "$AWS_REGION" \
            --size-only \
            2>&1 | grep -E "upload:|Completed" || true

        # Verify upload
        s3_file_count=$(aws s3 ls "s3://$AWS_BUCKET/" --recursive | wc -l || echo "0")
        echo -e "${GREEN}  ✓ Upload complete - S3 now has ${s3_file_count} files${NC}"
    else
        echo -e "${YELLOW}  → Could not copy files from MinIO${NC}"
    fi

    # Cleanup MinIO temp files
    docker exec flo-offline-minio rm -rf /tmp/minio-export 2>/dev/null || true
fi

echo ""

# Step 5: Cleanup
echo -e "${YELLOW}[5/5] Cleaning up temporary files...${NC}"
rm -rf "$TEMP_DIR"
echo -e "${GREEN}✓ Cleanup completed${NC}"
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}LIDAR Maps Push Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "  • MongoDB metadata synced: ${unsynced_count} new LIDAR maps"
echo -e "  • Local MinIO files: ${local_file_count}"
echo -e "  • AWS S3 files: ${s3_file_count:-$local_file_count}"
echo ""
echo -e "${GREEN}✓ Local data preserved (not deleted)${NC}"
echo ""
echo -e "${YELLOW}Verify upload:${NC}"
echo -e "  AWS S3: https://s3.console.aws.amazon.com/s3/buckets/${AWS_BUCKET}"
echo -e "  MinIO: http://localhost:9001"
echo ""
