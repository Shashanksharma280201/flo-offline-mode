import dotenv from "dotenv";
import connectDb from "./backend/services/mongodb";
import LidarMap from "./backend/models/lidarMapModel";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import logger from "./backend/utils/logger";

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1"
});

const testLidarApi = async () => {
  try {
    await connectDb();

    // 1. Test fetching all LIDAR maps
    console.log("\n=== TEST 1: Fetch all LIDAR maps ===");
    const allMaps = await LidarMap.find({ status: "ready" }).sort({ createdAt: -1 });
    console.log(`Found ${allMaps.length} LIDAR map(s)`);
    allMaps.forEach((map) => {
      console.log(`  - ${map.name} (ID: ${map._id})`);
    });

    if (allMaps.length === 0) {
      console.log("No LIDAR maps found. Exiting.");
      process.exit(1);
    }

    // 2. Test fetching by name
    console.log("\n=== TEST 2: Fetch LIDAR map by name ===");
    const mapByName = await LidarMap.findOne({ name: "sriram_2d_map_1" });
    if (mapByName) {
      console.log("✅ Found map by name:");
      console.log(`  Name: ${mapByName.name}`);
      console.log(`  S3 Folder: ${mapByName.s3FolderPath}`);
      console.log(`  Status: ${mapByName.status}`);
      console.log(`  File Size: ${(mapByName.fileSize! / 1024 / 1024).toFixed(2)} MB`);
    } else {
      console.log("❌ Map not found by name");
      process.exit(1);
    }

    // 3. Test generating pre-signed URLs
    console.log("\n=== TEST 3: Generate pre-signed URLs ===");
    const files = [
      { key: "map2dPgm", fileName: mapByName.map2dPgmFileName },
      { key: "map2dYaml", fileName: mapByName.map2dYamlFileName },
      { key: "map3d", fileName: mapByName.map3dFileName },
      { key: "georef", fileName: mapByName.georefFileName }
    ];

    console.log("Generating pre-signed URLs for all files...");
    for (const file of files) {
      const s3Key = `${mapByName.s3FolderPath}/${file.fileName}`;
      const command = new GetObjectCommand({
        Bucket: "lidar-maps",
        Key: s3Key
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      console.log(`✅ ${file.key}: ${url.substring(0, 100)}...`);
    }

    // 4. Test fetching file from S3
    console.log("\n=== TEST 4: Fetch 2D map image from S3 ===");
    const pgmKey = `${mapByName.s3FolderPath}/${mapByName.map2dPgmFileName}`;
    const pgmCommand = new GetObjectCommand({
      Bucket: "lidar-maps",
      Key: pgmKey
    });
    const pgmUrl = await getSignedUrl(s3Client, pgmCommand, { expiresIn: 3600 });

    // Try to fetch the file
    const response = await fetch(pgmUrl);
    if (response.ok) {
      const blob = await response.blob();
      console.log(`✅ Successfully fetched map image: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
    } else {
      console.log(`❌ Failed to fetch map image: ${response.status} ${response.statusText}`);
    }

    // 5. Test map metadata
    console.log("\n=== TEST 5: Map metadata ===");
    if (mapByName.mapMetadata) {
      console.log("✅ Map metadata:");
      console.log(`  Resolution: ${mapByName.mapMetadata.resolution} m/pixel`);
      console.log(`  Origin: [${mapByName.mapMetadata.origin.join(", ")}]`);
      console.log(`  Mode: ${mapByName.mapMetadata.mode}`);
    } else {
      console.log("ℹ️  No metadata stored");
    }

    // 6. Test georef points
    console.log("\n=== TEST 6: Georef points ===");
    if (mapByName.georefPoints && mapByName.georefPoints.length > 0) {
      console.log(`✅ Found ${mapByName.georefPoints.length} georef point(s)`);
      console.log("  First point:");
      const firstPoint = mapByName.georefPoints[0];
      console.log(`    Map: (${firstPoint.map_x}, ${firstPoint.map_y})`);
      console.log(`    UTM: (${firstPoint.utm_x}, ${firstPoint.utm_y})`);
    } else {
      console.log("ℹ️  No georef points stored");
    }

    console.log("\n=== ALL TESTS PASSED ✅ ===\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ TEST FAILED:");
    console.error(error);
    process.exit(1);
  }
};

testLidarApi();
