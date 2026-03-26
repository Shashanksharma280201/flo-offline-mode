import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import QCFormTemplate from "../models/qcFormTemplateModel";
import User from "../models/userModel";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "../.env") });

const seedQCTemplate = async () => {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/flo-mission-control";
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB");

        // Find an admin user (robotics@flomobility.com)
        const adminUser = await User.findOne({ email: "robotics@flomobility.com" });
        if (!adminUser) {
            console.error("Admin user robotics@flomobility.com not found. Please create this user first.");
            process.exit(1);
        }

        // Check if template already exists
        const existingTemplate = await QCFormTemplate.findOne({ isActive: true });
        if (existingTemplate) {
            console.log("Active QC template already exists. Deactivating it...");
            existingTemplate.isActive = false;
            await existingTemplate.save();
        }

        // Create the comprehensive QC form template
        const qcTemplate = new QCFormTemplate({
            name: "MMR Quality Control & Configuration Checklist",
            version: "1.0",
            isActive: true,
            createdBy: adminUser._id,
            headerFields: [
                {
                    fieldId: "factory_address",
                    fieldName: "Factory Address",
                    fieldType: "text",
                    required: true,
                    order: 1
                },
                {
                    fieldId: "inspection_date",
                    fieldName: "Inspection Date",
                    fieldType: "date",
                    required: true,
                    order: 2
                },
                {
                    fieldId: "vendor_name",
                    fieldName: "Vendor Name",
                    fieldType: "text",
                    required: true,
                    order: 3
                },
                {
                    fieldId: "mmr_serial_number",
                    fieldName: "MMR Serial Number",
                    fieldType: "text",
                    required: true,
                    order: 4
                },
                {
                    fieldId: "configuration_type",
                    fieldName: "Configuration Type",
                    fieldType: "dropdown",
                    options: ["Standard", "Custom", "Prototype"],
                    required: true,
                    order: 5
                }
            ],
            tabs: [
                {
                    tabId: "manufacturing_checks",
                    tabName: "Manufacturing Checks",
                    order: 1,
                    categories: [
                        {
                            categoryId: "structural_assembly",
                            categoryName: "Structural Assembly",
                            order: 1,
                            questions: [
                                {
                                    questionId: 1,
                                    questionText: "Frame welding quality - no cracks, proper alignment",
                                    order: 1
                                },
                                {
                                    questionId: 2,
                                    questionText: "All structural bolts torqued to specification",
                                    order: 2
                                },
                                {
                                    questionId: 3,
                                    questionText: "Chassis level and square within tolerance",
                                    order: 3
                                },
                                {
                                    questionId: 4,
                                    questionText: "Protective coatings applied properly",
                                    order: 4
                                },
                                {
                                    questionId: 5,
                                    questionText: "Weight distribution verified",
                                    order: 5
                                }
                            ]
                        },
                        {
                            categoryId: "electrical_systems",
                            categoryName: "Electrical Systems",
                            order: 2,
                            questions: [
                                {
                                    questionId: 6,
                                    questionText: "Main power supply connections secure",
                                    order: 1
                                },
                                {
                                    questionId: 7,
                                    questionText: "Battery mounting and connections verified",
                                    order: 2
                                },
                                {
                                    questionId: 8,
                                    questionText: "All wire harnesses properly routed and secured",
                                    order: 3
                                },
                                {
                                    questionId: 9,
                                    questionText: "Circuit breakers and fuses rated correctly",
                                    order: 4
                                },
                                {
                                    questionId: 10,
                                    questionText: "Emergency stop system functional",
                                    order: 5
                                },
                                {
                                    questionId: 11,
                                    questionText: "Ground connections verified",
                                    order: 6
                                },
                                {
                                    questionId: 12,
                                    questionText: "Control panel LEDs and displays working",
                                    order: 7
                                },
                                {
                                    questionId: 13,
                                    questionText: "Cable strain relief properly installed",
                                    order: 8
                                }
                            ]
                        },
                        {
                            categoryId: "motor_drive_system",
                            categoryName: "Motor & Drive System",
                            order: 3,
                            questions: [
                                {
                                    questionId: 14,
                                    questionText: "Motor mounting bolts torqued correctly",
                                    order: 1
                                },
                                {
                                    questionId: 15,
                                    questionText: "Motor alignment within specification",
                                    order: 2
                                },
                                {
                                    questionId: 16,
                                    questionText: "Drive belts/chains tensioned properly",
                                    order: 3
                                },
                                {
                                    questionId: 17,
                                    questionText: "Gearbox oil level correct",
                                    order: 4
                                },
                                {
                                    questionId: 18,
                                    questionText: "Encoder/feedback sensors aligned",
                                    order: 5
                                },
                                {
                                    questionId: 19,
                                    questionText: "Motor cooling system operational",
                                    order: 6
                                },
                                {
                                    questionId: 20,
                                    questionText: "Drive wheels/tracks properly installed",
                                    order: 7
                                }
                            ]
                        },
                        {
                            categoryId: "hydraulic_pneumatic",
                            categoryName: "Hydraulic/Pneumatic Systems",
                            order: 4,
                            questions: [
                                {
                                    questionId: 21,
                                    questionText: "Hydraulic fluid level and quality checked",
                                    order: 1
                                },
                                {
                                    questionId: 22,
                                    questionText: "All hydraulic fittings torqued and leak-free",
                                    order: 2
                                },
                                {
                                    questionId: 23,
                                    questionText: "Pressure relief valves set correctly",
                                    order: 3
                                },
                                {
                                    questionId: 24,
                                    questionText: "Cylinder rods free of damage",
                                    order: 4
                                },
                                {
                                    questionId: 25,
                                    questionText: "Air compressor functional (if applicable)",
                                    order: 5
                                },
                                {
                                    questionId: 26,
                                    questionText: "Pneumatic pressure regulators calibrated",
                                    order: 6
                                }
                            ]
                        },
                        {
                            categoryId: "sensors_safety",
                            categoryName: "Sensors & Safety Devices",
                            order: 5,
                            questions: [
                                {
                                    questionId: 27,
                                    questionText: "Proximity sensors calibrated and responding",
                                    order: 1
                                },
                                {
                                    questionId: 28,
                                    questionText: "Limit switches functional",
                                    order: 2
                                },
                                {
                                    questionId: 29,
                                    questionText: "LiDAR/vision systems properly mounted",
                                    order: 3
                                },
                                {
                                    questionId: 30,
                                    questionText: "IMU sensor calibrated",
                                    order: 4
                                },
                                {
                                    questionId: 31,
                                    questionText: "Safety light curtains/scanners functional",
                                    order: 5
                                },
                                {
                                    questionId: 32,
                                    questionText: "Bumper sensors responding correctly",
                                    order: 6
                                },
                                {
                                    questionId: 33,
                                    questionText: "Temperature sensors reading accurately",
                                    order: 7
                                }
                            ]
                        },
                        {
                            categoryId: "communication_network",
                            categoryName: "Communication & Network",
                            order: 6,
                            questions: [
                                {
                                    questionId: 34,
                                    questionText: "Ethernet connections verified",
                                    order: 1
                                },
                                {
                                    questionId: 35,
                                    questionText: "WiFi/wireless connectivity tested",
                                    order: 2
                                },
                                {
                                    questionId: 36,
                                    questionText: "CAN bus communication functional",
                                    order: 3
                                },
                                {
                                    questionId: 37,
                                    questionText: "IP address configuration correct",
                                    order: 4
                                },
                                {
                                    questionId: 38,
                                    questionText: "Firewall settings applied",
                                    order: 5
                                }
                            ]
                        },
                        {
                            categoryId: "software_firmware",
                            categoryName: "Software & Firmware",
                            order: 7,
                            questions: [
                                {
                                    questionId: 39,
                                    questionText: "Operating system version verified",
                                    order: 1
                                },
                                {
                                    questionId: 40,
                                    questionText: "Control software installed and licensed",
                                    order: 2
                                },
                                {
                                    questionId: 41,
                                    questionText: "PLC/controller firmware up to date",
                                    order: 3
                                },
                                {
                                    questionId: 42,
                                    questionText: "Configuration files loaded correctly",
                                    order: 4
                                },
                                {
                                    questionId: 43,
                                    questionText: "Diagnostic tools functional",
                                    order: 5
                                }
                            ]
                        },
                        {
                            categoryId: "mechanical_components",
                            categoryName: "Mechanical Components",
                            order: 8,
                            questions: [
                                {
                                    questionId: 44,
                                    questionText: "Bearings lubricated properly",
                                    order: 1
                                },
                                {
                                    questionId: 45,
                                    questionText: "Joint clearances within tolerance",
                                    order: 2
                                },
                                {
                                    questionId: 46,
                                    questionText: "Guard panels and covers secured",
                                    order: 3
                                },
                                {
                                    questionId: 47,
                                    questionText: "Fastener locking mechanisms in place",
                                    order: 4
                                },
                                {
                                    questionId: 48,
                                    questionText: "Wear plates/pads installed",
                                    order: 5
                                }
                            ]
                        }
                    ]
                },
                {
                    tabId: "final_checks",
                    tabName: "Final Checks & Commissioning",
                    order: 2,
                    categories: [
                        {
                            categoryId: "functional_testing",
                            categoryName: "Functional Testing",
                            order: 1,
                            questions: [
                                {
                                    questionId: 49,
                                    questionText: "Power-on self-test completed successfully",
                                    order: 1
                                },
                                {
                                    questionId: 50,
                                    questionText: "All motion axes move smoothly",
                                    order: 2
                                },
                                {
                                    questionId: 51,
                                    questionText: "Emergency stop tested from all locations",
                                    order: 3
                                },
                                {
                                    questionId: 52,
                                    questionText: "Automatic/manual mode switching verified",
                                    order: 4
                                },
                                {
                                    questionId: 53,
                                    questionText: "Navigation system accuracy tested",
                                    order: 5
                                },
                                {
                                    questionId: 54,
                                    questionText: "Obstacle detection functional",
                                    order: 6
                                },
                                {
                                    questionId: 55,
                                    questionText: "Load handling tested at max capacity",
                                    order: 7
                                }
                            ]
                        },
                        {
                            categoryId: "performance_validation",
                            categoryName: "Performance Validation",
                            order: 2,
                            questions: [
                                {
                                    questionId: 56,
                                    questionText: "Speed performance meets specification",
                                    order: 1
                                },
                                {
                                    questionId: 57,
                                    questionText: "Acceleration/deceleration rates verified",
                                    order: 2
                                },
                                {
                                    questionId: 58,
                                    questionText: "Positioning accuracy within tolerance",
                                    order: 3
                                },
                                {
                                    questionId: 59,
                                    questionText: "Repeatability tested",
                                    order: 4
                                },
                                {
                                    questionId: 60,
                                    questionText: "Battery runtime meets specification",
                                    order: 5
                                },
                                {
                                    questionId: 61,
                                    questionText: "Noise levels acceptable",
                                    order: 6
                                }
                            ]
                        },
                        {
                            categoryId: "safety_validation",
                            categoryName: "Safety Validation",
                            order: 3,
                            questions: [
                                {
                                    questionId: 62,
                                    questionText: "Safety scanner zones configured correctly",
                                    order: 1
                                },
                                {
                                    questionId: 63,
                                    questionText: "Collision avoidance tested",
                                    order: 2
                                },
                                {
                                    questionId: 64,
                                    questionText: "Warning lights and alarms functional",
                                    order: 3
                                },
                                {
                                    questionId: 65,
                                    questionText: "Safety labels and markings applied",
                                    order: 4
                                },
                                {
                                    questionId: 66,
                                    questionText: "Pinch point guards in place",
                                    order: 5
                                },
                                {
                                    questionId: 67,
                                    questionText: "Fall arrest systems tested (if applicable)",
                                    order: 6
                                }
                            ]
                        },
                        {
                            categoryId: "connectivity_integration",
                            categoryName: "Connectivity & Integration",
                            order: 4,
                            questions: [
                                {
                                    questionId: 68,
                                    questionText: "Connection to fleet management system verified",
                                    order: 1
                                },
                                {
                                    questionId: 69,
                                    questionText: "Remote monitoring functional",
                                    order: 2
                                },
                                {
                                    questionId: 70,
                                    questionText: "Data logging operational",
                                    order: 3
                                },
                                {
                                    questionId: 71,
                                    questionText: "OTA update capability tested",
                                    order: 4
                                },
                                {
                                    questionId: 72,
                                    questionText: "API integration verified",
                                    order: 5
                                }
                            ]
                        },
                        {
                            categoryId: "environmental_testing",
                            categoryName: "Environmental Testing",
                            order: 5,
                            questions: [
                                {
                                    questionId: 73,
                                    questionText: "Operating temperature range verified",
                                    order: 1
                                },
                                {
                                    questionId: 74,
                                    questionText: "Dust/water ingress protection tested",
                                    order: 2
                                },
                                {
                                    questionId: 75,
                                    questionText: "Vibration resistance confirmed",
                                    order: 3
                                },
                                {
                                    questionId: 76,
                                    questionText: "EMI/EMC compliance verified",
                                    order: 4
                                }
                            ]
                        },
                        {
                            categoryId: "documentation_compliance",
                            categoryName: "Documentation & Compliance",
                            order: 6,
                            questions: [
                                {
                                    questionId: 77,
                                    questionText: "User manual included and complete",
                                    order: 1
                                },
                                {
                                    questionId: 78,
                                    questionText: "Maintenance manual provided",
                                    order: 2
                                },
                                {
                                    questionId: 79,
                                    questionText: "Wiring diagrams accurate and updated",
                                    order: 3
                                },
                                {
                                    questionId: 80,
                                    questionText: "Parts list and BOM verified",
                                    order: 4
                                },
                                {
                                    questionId: 81,
                                    questionText: "CE/UL/safety certifications obtained",
                                    order: 5
                                },
                                {
                                    questionId: 82,
                                    questionText: "Quality inspection records complete",
                                    order: 6
                                }
                            ]
                        },
                        {
                            categoryId: "calibration_tuning",
                            categoryName: "Calibration & Tuning",
                            order: 7,
                            questions: [
                                {
                                    questionId: 83,
                                    questionText: "PID parameters tuned optimally",
                                    order: 1
                                },
                                {
                                    questionId: 84,
                                    questionText: "Sensor calibration certificates on file",
                                    order: 2
                                },
                                {
                                    questionId: 85,
                                    questionText: "Odometry calibrated",
                                    order: 3
                                },
                                {
                                    questionId: 86,
                                    questionText: "Vision system alignment verified",
                                    order: 4
                                },
                                {
                                    questionId: 87,
                                    questionText: "Force/torque sensors calibrated",
                                    order: 5
                                }
                            ]
                        },
                        {
                            categoryId: "quality_cosmetic",
                            categoryName: "Quality & Cosmetic",
                            order: 8,
                            questions: [
                                {
                                    questionId: 88,
                                    questionText: "Paint/coating finish acceptable",
                                    order: 1
                                },
                                {
                                    questionId: 89,
                                    questionText: "No visible scratches or dents",
                                    order: 2
                                },
                                {
                                    questionId: 90,
                                    questionText: "Decals and branding applied correctly",
                                    order: 3
                                },
                                {
                                    questionId: 91,
                                    questionText: "Clean and free of debris",
                                    order: 4
                                },
                                {
                                    questionId: 92,
                                    questionText: "Serial number plate affixed",
                                    order: 5
                                }
                            ]
                        },
                        {
                            categoryId: "battery_charging",
                            categoryName: "Battery & Charging",
                            order: 9,
                            questions: [
                                {
                                    questionId: 93,
                                    questionText: "Battery health report acceptable",
                                    order: 1
                                },
                                {
                                    questionId: 94,
                                    questionText: "Charging station compatibility verified",
                                    order: 2
                                },
                                {
                                    questionId: 95,
                                    questionText: "Auto-docking functional",
                                    order: 3
                                },
                                {
                                    questionId: 96,
                                    questionText: "Charge level indicators working",
                                    order: 4
                                },
                                {
                                    questionId: 97,
                                    questionText: "Low battery warning functional",
                                    order: 5
                                }
                            ]
                        },
                        {
                            categoryId: "final_sign_off",
                            categoryName: "Final Sign-off Items",
                            order: 10,
                            questions: [
                                {
                                    questionId: 98,
                                    questionText: "All previous QC issues resolved",
                                    order: 1
                                },
                                {
                                    questionId: 99,
                                    questionText: "Customer-specific requirements met",
                                    order: 2
                                },
                                {
                                    questionId: 100,
                                    questionText: "Spare parts kit included",
                                    order: 3
                                },
                                {
                                    questionId: 101,
                                    questionText: "Training materials provided",
                                    order: 4
                                },
                                {
                                    questionId: 102,
                                    questionText: "Warranty documentation completed",
                                    order: 5
                                },
                                {
                                    questionId: 103,
                                    questionText: "Shipping preparation complete",
                                    order: 6
                                },
                                {
                                    questionId: 104,
                                    questionText: "Final photographs taken",
                                    order: 7
                                },
                                {
                                    questionId: 105,
                                    questionText: "Customer acceptance obtained",
                                    order: 8
                                }
                            ]
                        }
                    ]
                }
            ],
            signOffFields: [
                {
                    fieldId: "inspector_name",
                    fieldName: "Inspector Name",
                    fieldType: "text",
                    required: true,
                    order: 1
                },
                {
                    fieldId: "inspector_signature",
                    fieldName: "Inspector Signature",
                    fieldType: "signature",
                    required: true,
                    order: 2
                },
                {
                    fieldId: "supervisor_name",
                    fieldName: "Supervisor Name",
                    fieldType: "text",
                    required: true,
                    order: 3
                },
                {
                    fieldId: "supervisor_signature",
                    fieldName: "Supervisor Signature",
                    fieldType: "signature",
                    required: true,
                    order: 4
                },
                {
                    fieldId: "final_notes",
                    fieldName: "Final Notes & Observations",
                    fieldType: "textarea",
                    required: false,
                    order: 5
                }
            ]
        });

        await qcTemplate.save();
        console.log("✅ QC Form Template created successfully!");
        console.log(`Template ID: ${qcTemplate._id}`);
        console.log(`Total Questions: ${qcTemplate.totalQuestions}`);
        console.log(`Template Name: ${qcTemplate.name}`);
        console.log(`Version: ${qcTemplate.version}`);

    } catch (error) {
        console.error("Error seeding QC template:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    }
};

// Run the seed function
seedQCTemplate();
