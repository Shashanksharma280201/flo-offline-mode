#!/bin/bash

################################################################################
# FLO Offline Mode - Pull from Production Script
#
# This script syncs production data to local offline database:
# 1. MongoDB: Pull new documents from production (created after last pull)
# 2. AWS S3 → MinIO: Download LIDAR files (optional)
#
# Usage: ./pull-from-prod.sh [--with-s3]
#        --with-s3: Also download S3 files (can be large)
#
# Note: This does NOT overwrite local modifications, only adds new data
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
TEMP_DIR="/tmp/flo-pull-$(date +%s)"
MINIO_ENDPOINT="http://localhost:9000"
MINIO_ACCESS_KEY="flo"
MINIO_SECRET_KEY="flo123456"
MINIO_BUCKET="lidar-maps"
AWS_BUCKET="lidar-maps"
LAST_PULL_FILE="/home/shanks/Music/flo_web_app/flo-offline-mode/.last-pull-timestamp"

# Parse arguments
SYNC_S3=false
if [[ "$1" == "--with-s3" ]]; then
    SYNC_S3=true
fi

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
    "users"
    "fleets"
    "counters"
)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}FLO Offline Mode - Pull from Production${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Docker containers are running
echo -e "${YELLOW}[1/5] Checking Docker containers...${NC}"
if ! docker ps | grep -q "flo-offline-mongodb"; then
    echo -e "${RED}Error: MongoDB container not running${NC}"
    echo "Please start containers: docker-compose up -d"
    exit 1
fi
echo -e "${GREEN}✓ Docker containers are running${NC}"
echo ""

# Create temp directory
mkdir -p "$TEMP_DIR"

# Get last pull timestamp
if [ -f "$LAST_PULL_FILE" ]; then
    LAST_PULL=$(cat "$LAST_PULL_FILE")
    echo -e "${BLUE}Last pull: $(date -d @$LAST_PULL 2>/dev/null || echo 'Unknown')${NC}"
else
    LAST_PULL=0
    echo -e "${YELLOW}First time pull - will sync all data${NC}"
fi
echo ""

# Function to pull collection
pull_collection() {
    local collection=$1
    echo -e "${YELLOW}Pulling collection: ${collection}${NC}"

    # Export documents created after last pull from production
    if [ "$LAST_PULL" -eq 0 ]; then
        # First pull - get all documents
        docker exec flo-offline-mongodb mongodump \
            --uri="$PROD_MONGO_URI" \
            --db="$DB_NAME" \
            --collection="$collection" \
            --out=/tmp/prod-pull 2>&1 | grep -v "warning" || true
    else
        # Incremental pull - only new documents
        docker exec flo-offline-mongodb mongodump \
            --uri="$PROD_MONGO_URI" \
            --db="$DB_NAME" \
            --collection="$collection" \
            --query="{\"createdAt\": {\"\$gte\": {\"\$date\": $(($LAST_PULL * 1000))}}}" \
            --out=/tmp/prod-pull 2>&1 | grep -v "warning" || true
    fi

    # Copy from container to host
    docker cp flo-offline-mongodb:/tmp/prod-pull/$DB_NAME/$collection.bson "$TEMP_DIR/" 2>/dev/null || {
        echo -e "${BLUE}  → No new documents${NC}"
        return
    }

    # Check if file has content
    if [ ! -s "$TEMP_DIR/$collection.bson" ]; then
        echo -e "${BLUE}  → No new documents${NC}"
        return
    fi

    # Copy back to container for restore
    docker cp "$TEMP_DIR/$collection.bson" flo-offline-mongodb:/tmp/restore-collection.bson

    # Import to local database (upsert mode - won't overwrite existing)
    docker exec flo-offline-mongodb mongorestore \
        --uri="$LOCAL_MONGO_URI" \
        --db="$DB_NAME" \
        --collection="$collection" \
        /tmp/restore-collection.bson 2>&1 | grep -E "imported|restored" || true

    echo -e "${GREEN}  ✓ Pulled collection${NC}"
}

# Step 2: Pull MongoDB collections
echo -e "${YELLOW}[2/5] Pulling MongoDB collections from production...${NC}"
for collection in "${COLLECTIONS[@]}"; do
    pull_collection "$collection"
done
echo -e "${GREEN}✓ MongoDB pull completed${NC}"
echo ""

# Step 3: Pull S3 files (optional)
if [ "$SYNC_S3" = true ]; then
    echo -e "${YELLOW}[3/5] Pulling S3 files from AWS...${NC}"

    if ! command -v aws &> /dev/null; then
        echo -e "${RED}  → AWS CLI not installed${NC}"
        echo -e "${YELLOW}  → Install: sudo apt install awscli${NC}"
    else
        echo -e "${BLUE}  → Downloading files from S3...${NC}"
        mkdir -p "$TEMP_DIR/s3-download"

        # Download from S3
        aws s3 sync "s3://$AWS_BUCKET/" "$TEMP_DIR/s3-download/" --quiet 2>&1 || {
            echo -e "${RED}  → AWS S3 download failed${NC}"
            echo -e "${YELLOW}  → Check AWS credentials: aws configure${NC}"
        }

        # Upload to MinIO
        if [ -d "$TEMP_DIR/s3-download" ] && [ "$(ls -A $TEMP_DIR/s3-download)" ]; then
            file_count=$(find "$TEMP_DIR/s3-download" -type f | wc -l)
            echo -e "${BLUE}  → Downloaded ${file_count} files${NC}"

            # Copy to MinIO container
            docker cp "$TEMP_DIR/s3-download/." flo-offline-minio:/tmp/s3-import/

            # Configure MinIO client and upload
            docker exec flo-offline-minio sh -c "
                mc alias set local http://localhost:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY > /dev/null 2>&1;
                mc cp --recursive /tmp/s3-import/ local/$MINIO_BUCKET/ > /dev/null 2>&1;
                rm -rf /tmp/s3-import;
            "

            echo -e "${GREEN}  ✓ Uploaded ${file_count} files to MinIO${NC}"
        else
            echo -e "${BLUE}  → No new files to download${NC}"
        fi
    fi
    echo -e "${GREEN}✓ S3 pull completed${NC}"
    echo ""
else
    echo -e "${YELLOW}[3/5] Skipping S3 files (use --with-s3 to include)${NC}"
    echo ""
fi

# Step 4: Update last pull timestamp
echo -e "${YELLOW}[4/5] Updating pull timestamp...${NC}"
date +%s > "$LAST_PULL_FILE"
echo -e "${GREEN}✓ Timestamp updated${NC}"
echo ""

# Step 5: Cleanup
echo -e "${YELLOW}[5/5] Cleaning up...${NC}"
rm -rf "$TEMP_DIR"
docker exec flo-offline-mongodb rm -rf /tmp/prod-pull /tmp/restore-collection.bson 2>/dev/null || true
echo -e "${GREEN}✓ Cleanup completed${NC}"
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Pull from Production Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "  • MongoDB collections pulled"
if [ "$SYNC_S3" = true ]; then
    echo -e "  • S3 files downloaded to MinIO"
fi
echo -e "  • Local modifications preserved"
echo ""
echo -e "${YELLOW}Note: To pull S3 files next time, use: ./pull-from-prod.sh --with-s3${NC}"
echo ""
