#!/bin/bash

# Import Production Data to Local MongoDB
# Imports the exported data into the local Docker MongoDB container

LOCAL_URI="mongodb://localhost:27017"
DB_NAME="mission-control"
BACKUP_DIR="./prod-backup"

echo "🚀 Starting data import to local MongoDB..."
echo "Source: $BACKUP_DIR"
echo "Target: $LOCAL_URI"
echo ""

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR/$DB_NAME" ]; then
    echo "❌ Error: Backup directory not found at $BACKUP_DIR/$DB_NAME"
    echo "Please run ./export-prod-data.sh first"
    exit 1
fi

# Check if MongoDB container is running
if ! docker ps | grep -q flo-offline-mongodb; then
    echo "❌ Error: MongoDB container 'flo-offline-mongodb' is not running"
    echo "Start it with: docker compose up -d mongodb"
    exit 1
fi

echo "📥 Importing data into local MongoDB..."
echo ""

# Use docker exec to run mongorestore inside the container
docker cp "$BACKUP_DIR/$DB_NAME" flo-offline-mongodb:/tmp/restore-data

docker exec flo-offline-mongodb mongorestore \
    --uri="$LOCAL_URI" \
    --db="$DB_NAME" \
    --dir=/tmp/restore-data \
    --drop

echo ""
echo "✅ Import complete!"
echo ""
echo "Verifying data..."
docker exec flo-offline-mongodb mongosh "$DB_NAME" --eval "
    print('Users:', db.users.countDocuments());
    print('Robots:', db.robots.countDocuments());
    print('PathMaps:', db.pathmaps.countDocuments());
    print('Clients:', db.clients.countDocuments());
    print('LidarMaps:', db.lidarmaps.countDocuments());
    print('AppUsers:', db.appusers.countDocuments());
    print('Fleets:', db.fleets.countDocuments());
"

echo ""
echo "🎉 Ready to test! Start the backend with 'pnpm serve' in mission-control/"
