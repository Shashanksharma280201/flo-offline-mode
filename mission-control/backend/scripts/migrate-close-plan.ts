import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from mission-control directory
dotenv.config({ path: resolve(__dirname, "../../.env") });

async function migrateClosePlan() {
  try {
    const DB_URI = process.env.DB_URI || process.env.MONGO_URI;
    if (!DB_URI) {
      throw new Error("DB_URI or MONGO_URI environment variable not set");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(DB_URI);
    console.log("Connected to MongoDB");

    // Access leads collection directly
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    const leadsCollection = db.collection("leads");

    // Find all leads with old string closePlan format
    const leads = await leadsCollection.find({}).toArray();
    console.log(`Found ${leads.length} total leads`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const lead of leads) {
      try {
        // Check if closePlan is a string (old format) - includes empty strings
        if (typeof lead.closePlan === "string") {
          const oldClosePlan = lead.closePlan;

          // Update to new object format
          await leadsCollection.updateOne(
            { _id: lead._id },
            {
              $set: {
                closePlan: {
                  description: oldClosePlan.trim(),
                  audioData: "",
                  audioDuration: 0
                }
              }
            }
          );

          console.log(`✓ Migrated lead: ${lead.pocName} (${lead._id}) - "${oldClosePlan.substring(0, 50)}${oldClosePlan.length > 50 ? '...' : ''}"`);
          migratedCount++;
        } else if (lead.closePlan && typeof lead.closePlan === "object") {
          // Already in new format, skip
          skippedCount++;
        } else {
          // No closePlan (null or undefined), skip
          skippedCount++;
        }
      } catch (error) {
        console.error(`✗ Error migrating lead ${lead._id}:`, error);
        errorCount++;
      }
    }

    console.log("\n=== Migration Summary ===");
    console.log(`Total leads: ${leads.length}`);
    console.log(`Migrated: ${migratedCount}`);
    console.log(`Skipped (already migrated or empty): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log("=========================\n");

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrateClosePlan();
