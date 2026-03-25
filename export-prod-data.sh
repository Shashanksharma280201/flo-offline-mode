#!/bin/bash

# Export Production MongoDB Data for Offline Mode
# Uses Docker MongoDB container to run mongodump

# Production MongoDB connection
PROD_URI="mongodb://web-prod:Mongo%40flo%23prod23@164.52.207.199:27017/mission-control?authSource=admin"
DB_NAME="mission-control"
OUTPUT_DIR="./prod-backup"

echo "🚀 Starting production data export for offline mode..."
echo "Target: $DB_NAME"
echo "Output: $OUTPUT_DIR"
echo ""
echo "Exporting ESSENTIAL collections only (10 collections):"
echo "  🔴 CRITICAL: users, robots, pathmaps, clients, lidarmaps"
echo "  🟡 IMPORTANT: appusers, fleets, basestations, materials"
echo ""

# Check if MongoDB container is running
if ! docker ps | grep -q flo-offline-mongodb; then
    echo "❌ Error: MongoDB container 'flo-offline-mongodb' is not running"
    echo "Start it with: docker compose up -d mongodb"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Collections to export
COLLECTIONS=(
    "users"
    "robots"
    "pathmaps"
    "clients"
    "lidarmaps"
    "appusers"
    "fleets"
    "basestations"
    "materials"
    "counters"
)

echo "📦 Exporting collections using Docker MongoDB container..."
echo ""

# Export each collection
for collection in "${COLLECTIONS[@]}"; do
    echo "  → Exporting $collection..."
    docker exec flo-offline-mongodb mongodump \
        --uri="$PROD_URI" \
        --db="$DB_NAME" \
        --collection="$collection" \
        --out=/tmp/prod-backup 2>&1 | grep -v "warning" || true

    if [ $? -ne 0 ]; then
        echo "    ⚠️  Failed to export $collection"
    fi
done

echo ""
echo "📥 Copying exported data from container to host..."
docker cp flo-offline-mongodb:/tmp/prod-backup "$OUTPUT_DIR/"
mv "$OUTPUT_DIR/prod-backup/$DB_NAME" "$OUTPUT_DIR/" 2>/dev/null || true
rm -rf "$OUTPUT_DIR/prod-backup" 2>/dev/null || true

# Clean up inside container
docker exec flo-offline-mongodb rm -rf /tmp/prod-backup 2>/dev/null || true

echo ""
echo "✅ Export complete!"
echo ""
echo "📊 Exported collections:"
if [ -d "$OUTPUT_DIR/$DB_NAME" ]; then
    ls -lh "$OUTPUT_DIR/$DB_NAME/" | grep -E "\.bson$" | awk '{print "   ✓", $9}' | sed 's/.bson//'
    echo ""
    echo "💾 Total backup size:"
    du -sh "$OUTPUT_DIR"
else
    echo "   ❌ No data exported - check connection to production database"
fi

echo ""
echo "✨ Next step: Run ./import-to-local.sh to import data into local MongoDB"
