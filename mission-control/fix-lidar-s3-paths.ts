import mongoose from "mongoose";
import LidarMap from "./backend/models/lidarMapModel.js";
import dotenv from "dotenv";

dotenv.config();

async function fixS3Paths() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.DB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/mission-control";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Find all LIDAR maps
    const maps = await LidarMap.find({});
    console.log(`\nFound ${maps.length} LIDAR maps`);

    let updatedCount = 0;

    for (const map of maps) {
      // Check if s3FolderPath starts with "lidar-maps/"
      if (map.s3FolderPath.startsWith("lidar-maps/")) {
        const oldPath = map.s3FolderPath;
        // Remove "lidar-maps/" prefix
        const newPath = map.s3FolderPath.replace("lidar-maps/", "");

        console.log(`\n🔧 Updating ${map.name}:`);
        console.log(`   Old: ${oldPath}`);
        console.log(`   New: ${newPath}`);

        map.s3FolderPath = newPath;
        await map.save();
        updatedCount++;
      } else {
        console.log(`\n✅ ${map.name} - already correct: ${map.s3FolderPath}`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 UPDATE SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total maps:     ${maps.length}`);
    console.log(`Updated:        ${updatedCount}`);
    console.log(`Already correct: ${maps.length - updatedCount}`);
    console.log("=".repeat(60));

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

fixS3Paths()
  .then(() => {
    console.log("\n✅ Fix completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fix failed:", error);
    process.exit(1);
  });
