import mongoose from "mongoose";
import dotenv from "dotenv";
import InventoryItem from "../models/inventoryItemModel";
import { generateInventoryId } from "../services/counterService";
import logger from "../utils/logger";

dotenv.config();

const MONGODB_URI = process.env.DB_URI || process.env.MONGODB_URI || "";

// Mechanical items from INVENTORY.xlsx
const mechanicalItems = [
  "Air Pump",
  "Cell Charger",
  "Rechargeable Cells",
  "Multimeter",

  "14/15 Tubular Spanner",
  "18/19 Spanner",
  "10/11 Spanner",
  "12/13 Spanner",
  "20/22 Spanner",
  "30/32 Spanner",
  "14/15 Spanner",
  "16x17 Ring Spanner",
  "24x24 Combination Spanner",
  "Variable Spanner 6 Inch",

  "Long Nose Plier",
  "Circlip Plier",
  "Chisel",
  "Screw Driver 803",
  "Screw Driver 905 IBT",
  "Hammer",

  "Thread Locker",
  "Copper Washers",
  "Brushes",

  "M3 Allen Key",
  "M4 Allen Key",
  "M5 Allen Key",

  "Hex Bolts",
  "Allen Bolts",

  "Washers 4x4",
  "Washers 2x2",

  "Stopper",

  "Motor Key 4x4",
  "Motor Key 2x2",

  "Hydraulic Cylinder",
  "Hydraulic Actuator",

  "PMDC Motor 350W with Gearbox",
  "PMDC Motor 650W with Gearbox",
  "BLDC Motor 500W with Gearbox",

  "Shaft 4x4",
  "Shaft 2x2",

  "Shaft Key 4x4",
  "Shaft Key 2x2",

  "Tyre 17 Inch",

  "Toggle Clamp 19x4.5x3 cm",
  "Toggle Clamp 11x3x2 cm",

  "Chuck Nut",
  "M40 Washers",

  "Spring Handle 5.5 Inch"
];

// Electronics items from STOCK STATEMENT.xlsx
const electronicsItems = [
  "24V DC Charger",
  "48V DC Charger",
  "Rechargeable Cells",

  "Flysky FS-i6s RF Remote and Receiver",

  "Emergency Push Button",
  "NC Switch",
  "Power Button 19mm",

  "WiFi Router",
  "Router Antenna",

  "Speaker",
  "Speaker 8 Ohm 10W",

  "GPS Antenna",

  "Antenna Connector SMA to UFL",
  "Anderson Connector SB120A",
  "SBS75X Connector",

  "0.5 sqmm Wire Green",
  "0.5 sqmm Wire Blue",
  "0.5 sqmm Wire Red",
  "0.5 sqmm Wire Black",
  "0.5 sqmm Wire Brown",
  "0.5 sqmm Wire Yellow",

  "2.5 sqmm Wire Red",
  "2.5 sqmm Wire Black",

  "10 AWG Wire Red",
  "10 AWG Wire Black",

  "2 Core 0.5 sqmm Cable",
  "2 Core 2.5 sqmm Cable",
  "3 Core 0.5 sqmm Cable",

  "0.5 sqmm Pin Type Lugs",
  "2.5 sqmm Pin Type Lugs",
  "0.5 sqmm Snapon Female Lugs",

  "16 sqmm Ring Type Lugs 8mm Hole",
  "4-6 sqmm Ring Type Lugs 6mm Hole",
  "4-6 sqmm Ring Type Lugs 4mm Hole",

  "PG Gland 13.5",
  "PG Gland 11",
  "PG Gland 7",

  "4 Way Bakelite Terminal Block",
  "2 Way Bakelite Terminal Block",

  "M3x10 Steel Spacer",
  "M2.5x15 Steel Spacer",

  "M3x6 Star Head Screw",
  "M2.5x6 Star Head Screw",
  "M4x10 Allen Head Screw",
  "M4x20 Allen Head Screw",
  "M4 Hex Nut",

  "Heat Sleeve 12mm",
  "Heat Sleeve 6mm",
  "Heat Sleeve 3mm",

  "LGP 18W LED",

  "Glass Fuse",
  "Blade Fuse 10A",
  "Blade Fuse 20A",
  "Blade Fuse 30A",
  "Blade Fuse 40A",

  "Cable Tie 100mm",
  "Cable Tie 150mm",
  "Cable Tie 200mm",
  "Cable Tie 250mm",
  "Cable Tie 300mm",

  "Flexible Pipe 7mm",
  "Flexible Pipe 10mm",
  "Flexible Pipe 15mm",
  "Flexible Pipe 19mm",
  "Flexible Pipe 24mm",

  "Soldering Tin",
  "Stretch Film",

  "Cytron MD30 80A Motor Driver",
  "Cytron MD20 Motor Driver",

  "24V DC Contactor",
  "12V Contactor Coil 100A",

  "24V 105Ah Battery",
  "48V 44.5Ah Battery",

  "Stack Box",

  "Charging Flap Magnets",

  "Steering Encoder",
  "Steering Encoder Magnet",

  "Pressure Sensor Signal Cable",

  "Fuse and Distribution Box 6 Way",

  "VESC 75100 BLDC Controller",
  "VCU 48 Rev3",

  "Mounting Acrylic Sheet",

  "Contactor to Fuse Junction Cable Positive",

  "Warning Light",

  "SD Card",

  "Hall Sensor Connector Male",

  "DC-DC Converter 48V to 12V 10A 120W",

  "Pressure Sensor 5V",
  "Proximity Sensor 5V",

  "MDF Sheet"
];

const seedInventory = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info("Connected to MongoDB");

    // Check if inventory already has items
    const existingCount = await InventoryItem.countDocuments();
    if (existingCount > 0) {
      logger.warn(
        `Inventory already has ${existingCount} items. Skipping seed.`
      );
      logger.info(
        "If you want to re-seed, please delete existing items first."
      );
      await mongoose.disconnect();
      process.exit(0);
    }

    logger.info("Starting inventory seeding...");

    // Default vendor info for seeded items
    const defaultVendor = {
      name: "Initial Stock",
      orderDate: new Date("2024-01-01"),
      expectedArrivalDate: new Date("2024-01-15"),
      actualArrivalDate: new Date("2024-01-15"),
      notes: "Initial inventory setup"
    };

    // Create a dummy user ID for seeding (you may need to adjust this)
    // In production, use an actual admin user ID
    const dummyUserId = new mongoose.Types.ObjectId();

    // Seed mechanical items
    logger.info(`Seeding ${mechanicalItems.length} mechanical items...`);
    for (const itemName of mechanicalItems) {
      const itemId = await generateInventoryId("mechanical");

      const initialTransaction = {
        type: "add" as const,
        quantity: 0,
        previousQty: 0,
        newQty: 0,
        date: new Date(),
        performedBy: dummyUserId,
        notes: "Initial inventory setup"
      };

      await InventoryItem.create({
        itemId,
        name: itemName,
        category: "mechanical",
        quantity: 0,
        unit: "pieces",
        description: `${itemName} - part of initial inventory`,
        minStockLevel: 5,
        vendor: defaultVendor,
        transactions: [initialTransaction],
        createdBy: dummyUserId
      });

      logger.info(`Created mechanical item: ${itemId} - ${itemName}`);
    }

    // Seed electronics items
    logger.info(`Seeding ${electronicsItems.length} electronics items...`);
    for (const itemName of electronicsItems) {
      const itemId = await generateInventoryId("electronics");

      const initialTransaction = {
        type: "add" as const,
        quantity: 0,
        previousQty: 0,
        newQty: 0,
        date: new Date(),
        performedBy: dummyUserId,
        notes: "Initial inventory setup"
      };

      await InventoryItem.create({
        itemId,
        name: itemName,
        category: "electronics",
        quantity: 0,
        unit: "pieces",
        description: `${itemName} - part of initial inventory`,
        minStockLevel: 5,
        vendor: defaultVendor,
        transactions: [initialTransaction],
        createdBy: dummyUserId
      });

      logger.info(`Created electronics item: ${itemId} - ${itemName}`);
    }

    logger.info("Inventory seeding completed successfully!");
    logger.info(
      `Total items created: ${mechanicalItems.length + electronicsItems.length}`
    );
    logger.info(`Mechanical: ${mechanicalItems.length}`);
    logger.info(`Electronics: ${electronicsItems.length}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error("Error seeding inventory:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedInventory();
