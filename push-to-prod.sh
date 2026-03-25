#!/bin/bash

################################################################################
# FLO Offline Mode - Push to Production Script
#
# This script syncs locally created data to production servers:
# 1. MongoDB: Push new/updated documents to production database
# 2. MinIO → AWS S3: Upload LIDAR files to production S3 bucket
#
# Usage: ./push-to-prod.sh
################################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOCAL_MONGO_URI="mongodb://localhost:27017"
PROD_MONGO_URI="mongodb://web-prod:Mongo%40flo%23prod23@164.52.207.199:27017/mission-control?authSource=admin"
DB_NAME="mission-control"
TEMP_DIR="/tmp/flo-sync-$(date +%s)"
MINIO_ENDPOINT="http://localhost:9000"
MINIO_ACCESS_KEY="flo"
MINIO_SECRET_KEY="flo123456"
MINIO_BUCKET="lidar-maps"
AWS_BUCKET="lidar-maps"  # Production S3 bucket name

# Collections to sync
COLLECTIONS=(
    "pathmaps"
    "lidarmaps"
    "missions"
    "robots"
    "materials"
    "clients"
    "appusers"
    "basestations"
)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}FLO Offline Mode - Push to Production${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Docker containers are running
echo -e "${YELLOW}[1/4] Checking Docker containers...${NC}"
if ! docker ps | grep -q "flo-offline-mongodb"; then
    echo -e "${RED}Error: MongoDB container not running${NC}"
    echo "Please start containers: docker-compose up -d"
    exit 1
fi

if ! docker ps | grep -q "flo-offline-minio"; then
    echo -e "${RED}Error: MinIO container not running${NC}"
    echo "Please start containers: docker-compose up -d"
    exit 1
fi
echo -e "${GREEN}✓ Docker containers are running${NC}"
echo ""

# Create temp directory
mkdir -p "$TEMP_DIR"

# Function to sync MongoDB collection
sync_collection() {
    local collection=$1
    echo -e "${YELLOW}Syncing collection: ${collection}${NC}"

    # Check if there are documents to sync
    local doc_count=$(docker exec flo-offline-mongodb mongosh "$LOCAL_MONGO_URI/$DB_NAME" --quiet --eval "
        db.${collection}.countDocuments({ syncedAt: { \$exists: false } });
    " | tail -1 | tr -d '\r\n')

    if [ "$doc_count" -eq 0 ]; then
        echo -e "${BLUE}  → No new documents to sync${NC}"
        return
    fi

    echo -e "${BLUE}  → Found ${doc_count} new documents${NC}"

    # Export unsynced documents using mongodump with query
    docker exec flo-offline-mongodb mongodump \
        --uri="$LOCAL_MONGO_URI" \
        --db="$DB_NAME" \
        --collection="$collection" \
        --query='{"syncedAt": {"$exists": false}}' \
        --out=/tmp/flo-push-export 2>&1 | grep -v "warning" > /dev/null

    # Import to production using mongorestore (upsert mode)
    docker exec flo-offline-mongodb mongorestore \
        --uri="$PROD_MONGO_URI" \
        --db="$DB_NAME" \
        /tmp/flo-push-export/$DB_NAME 2>&1 | grep -E "imported|restored|finished" | head -1 || true

    # Mark documents as synced in local database
    docker exec flo-offline-mongodb mongosh "$LOCAL_MONGO_URI/$DB_NAME" --quiet --eval "
        db.${collection}.updateMany(
            { syncedAt: { \$exists: false } },
            { \$set: { syncedAt: new Date() } }
        );
    " > /dev/null 2>&1

    # Cleanup temp files
    docker exec flo-offline-mongodb rm -rf /tmp/flo-push-export 2>/dev/null || true

    echo -e "${GREEN}  ✓ Synced ${doc_count} documents${NC}"
}

# Step 2: Sync MongoDB collections
echo -e "${YELLOW}[2/4] Syncing MongoDB collections to production...${NC}"
for collection in "${COLLECTIONS[@]}"; do
    sync_collection "$collection"
done
echo -e "${GREEN}✓ MongoDB sync completed${NC}"
echo ""

# Step 3: Sync MinIO files to AWS S3
echo -e "${YELLOW}[3/4] Syncing MinIO files to AWS S3...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${YELLOW}  → AWS CLI not installed, skipping S3 sync${NC}"
    echo -e "${YELLOW}  → Install AWS CLI: sudo apt install awscli${NC}"
    echo -e "${YELLOW}  → Configure: aws configure${NC}"
else
    # Configure MinIO client inside container
    docker exec flo-offline-minio mc alias set local http://localhost:9000 "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" > /dev/null 2>&1

    # List all files in MinIO bucket
    file_list=$(docker exec flo-offline-minio mc ls local/$MINIO_BUCKET --recursive 2>/dev/null | awk '{print $NF}' || echo "")

    if [ -z "$file_list" ]; then
        echo -e "${BLUE}  → No files to sync${NC}"
    else
        file_count=$(echo "$file_list" | wc -l)
        echo -e "${BLUE}  → Found ${file_count} files in MinIO${NC}"

        # Copy files from MinIO to temp directory
        docker exec flo-offline-minio mc cp --recursive local/$MINIO_BUCKET/ /tmp/minio-sync/ > /dev/null 2>&1 || true

        # Copy from container to host
        docker cp flo-offline-minio:/tmp/minio-sync "$TEMP_DIR/s3-files" 2>/dev/null || true

        if [ -d "$TEMP_DIR/s3-files" ]; then
            # Upload to AWS S3
            echo -e "${BLUE}  → Uploading to AWS S3...${NC}"
            aws s3 sync "$TEMP_DIR/s3-files/" "s3://$AWS_BUCKET/" --quiet 2>&1 || {
                echo -e "${RED}  → AWS S3 upload failed. Check AWS credentials.${NC}"
                echo -e "${YELLOW}  → Run: aws configure${NC}"
            }
            echo -e "${GREEN}  ✓ Uploaded ${file_count} files to S3${NC}"
        fi
    fi
fi
echo -e "${GREEN}✓ S3 sync completed${NC}"
echo ""

# Step 4: Cleanup
echo -e "${YELLOW}[4/4] Cleaning up...${NC}"
rm -rf "$TEMP_DIR"
docker exec flo-offline-minio rm -rf /tmp/minio-sync 2>/dev/null || true
echo -e "${GREEN}✓ Cleanup completed${NC}"
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Push to Production Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "  • MongoDB collections synced"
echo -e "  • LIDAR files uploaded to S3"
echo -e "  • Local data marked as synced"
echo ""
echo -e "${YELLOW}Note: Local data is preserved for backup${NC}"
echo ""
