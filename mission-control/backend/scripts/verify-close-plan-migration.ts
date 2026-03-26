import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from mission-control directory
dotenv.config({ path: resolve(__dirname, "../../.env") });

async function verifyMigration() {
  try {
    const DB_URI = process.env.DB_URI || process.env.MONGO_URI;
    if (!DB_URI) {
      throw new Error("DB_URI or MONGO_URI environment variable not set");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(DB_URI);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    const leadsCollection = db.collection("leads");

    // Find leads with closePlan
    const leadsWithPlan = await leadsCollection
      .find({ closePlan: { $exists: true, $ne: null } })
      .limit(10)
      .toArray();

    console.log(`\nFound ${leadsWithPlan.length} leads with closePlan`);
    console.log("\n=== Sample Leads ===");

    for (const lead of leadsWithPlan) {
      console.log(`\nLead: ${lead.pocName} (${lead._id})`);
      console.log(`Type: ${typeof lead.closePlan}`);

      if (typeof lead.closePlan === "string") {
        console.log(`❌ STILL STRING: "${lead.closePlan}"`);
      } else if (typeof lead.closePlan === "object") {
        console.log(`✅ OBJECT FORMAT:`);
        console.log(`   description: "${lead.closePlan.description || '(empty)'}"`);
        console.log(`   audioData: ${lead.closePlan.audioData ? 'YES' : 'NO'}`);
        console.log(`   audioDuration: ${lead.closePlan.audioDuration || 0}`);
      }
    }

    // Count statistics
    const totalLeads = await leadsCollection.countDocuments({});
    const leadsWithPlanCount = await leadsCollection.countDocuments({
      closePlan: { $exists: true, $ne: null }
    });
    const leadsWithStringPlan = await leadsCollection.countDocuments({
      closePlan: { $type: "string" }
    });
    const leadsWithObjectPlan = await leadsCollection.countDocuments({
      closePlan: { $type: "object" }
    });

    console.log("\n=== Statistics ===");
    console.log(`Total leads: ${totalLeads}`);
    console.log(`Leads with closePlan: ${leadsWithPlanCount}`);
    console.log(`String format (OLD): ${leadsWithStringPlan}`);
    console.log(`Object format (NEW): ${leadsWithObjectPlan}`);

    if (leadsWithStringPlan > 0) {
      console.log("\n❌ WARNING: Some leads still have string format!");
    } else {
      console.log("\n✅ All leads migrated successfully!");
    }

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("Verification failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

verifyMigration();
