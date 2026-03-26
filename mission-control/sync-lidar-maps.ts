import { S3Client, ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";
import mongoose from "mongoose";
import LidarMap from "./backend/models/lidarMapModel.js";
import dotenv from "dotenv";

dotenv.config();

const BUCKET_NAME = "lidar-maps";
const REQUIRED_FILES = ["dlio_map.pcd", "dlio_map_2d.pgm", "dlio_map_2d.yaml", "georef_points.json"];

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_KEY!,
  },
});

interface FolderFiles {
  [key: string]: string[];
}

async function listAllS3Folders(): Promise<string[]> {
  const folders = new Set<string>();

  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Delimiter: "/",
    });

    const response = await s3Client.send(command);

    if (response.CommonPrefixes) {
      for (const prefix of response.CommonPrefixes) {
        if (prefix.Prefix) {
          const folderName = prefix.Prefix.replace(/\/$/, "");
          folders.add(folderName);
        }
      }
    }
  } catch (error) {
    console.error("Error listing S3 folders:", error);
    throw error;
  }

  return Array.from(folders);
}

async function listFilesInFolder(folderName: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `${folderName}/`,
    });

    const response = await s3Client.send(command);

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key) {
          const fileName = obj.Key.replace(`${folderName}/`, "");
          if (fileName) {
            files.push(fileName);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error listing files in folder ${folderName}:`, error);
  }

  return files;
}

async function checkFolderHasRequiredFiles(folderName: string): Promise<boolean> {
  const files = await listFilesInFolder(folderName);
  const hasAllRequired = REQUIRED_FILES.every(reqFile => files.includes(reqFile));
  return hasAllRequired;
}

async function syncLidarMaps() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.DB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/mission-control";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Get all folders in S3
    console.log("\n📂 Scanning S3 bucket...");
    const s3Folders = await listAllS3Folders();
    console.log(`Found ${s3Folders.length} folders in S3 bucket`);

    // Get existing maps in database
    const existingMaps = await LidarMap.find({});
    const existingMapNames = new Set(existingMaps.map(m => m.name));
    console.log(`Found ${existingMaps.length} maps in database`);

    // Check each folder and create missing database entries
    let createdCount = 0;
    let skippedIncomplete = 0;
    let skippedExisting = 0;

    for (const folderName of s3Folders) {
      // Check if already exists in database
      if (existingMapNames.has(folderName)) {
        console.log(`⏭️  Skipping ${folderName} - already exists in database`);
        skippedExisting++;
        continue;
      }

      // Check if folder has all required files
      console.log(`\n🔍 Checking ${folderName}...`);
      const files = await listFilesInFolder(folderName);
      const hasAllRequired = REQUIRED_FILES.every(reqFile => files.includes(reqFile));

      if (!hasAllRequired) {
        const missingFiles = REQUIRED_FILES.filter(reqFile => !files.includes(reqFile));
        console.log(`   ⚠️  Incomplete - missing: ${missingFiles.join(", ")}`);
        skippedIncomplete++;
        continue;
      }

      // Create database entry
      console.log(`   ✅ Complete - creating database entry...`);

      const newMap = new LidarMap({
        name: folderName,
        s3FolderPath: folderName,  // Just the folder name, not bucket/folder
        map3dFileName: "dlio_map.pcd",
        map2dPgmFileName: "dlio_map_2d.pgm",
        map2dYamlFileName: "dlio_map_2d.yaml",
        georefFileName: "georef_points.json",
        status: "ready",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await newMap.save();
      console.log(`   💾 Saved to database`);
      createdCount++;
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 SYNC SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total S3 folders:        ${s3Folders.length}`);
    console.log(`Already in database:     ${skippedExisting}`);
    console.log(`Incomplete (skipped):    ${skippedIncomplete}`);
    console.log(`Newly created:           ${createdCount}`);
    console.log(`Total in database now:   ${existingMaps.length + createdCount}`);
    console.log("=".repeat(60));

  } catch (error) {
    console.error("❌ Error during sync:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

// Run the sync
syncLidarMaps()
  .then(() => {
    console.log("\n✅ Sync completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Sync failed:", error);
    process.exit(1);
  });
