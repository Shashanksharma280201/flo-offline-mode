// @ts-nocheck

import { QCFormTemplate } from "./types";

/**
 * COMPLETE QC Form Template - ALL 301 Questions
 * Tab 1: Manufacturing - 113 questions from PDF
 * Tab 2: StackBox Setup - 41 questions from CSV
 * Tab 3: Assembly - 60 questions from CSV
 * Tab 4: Final Check - 87 questions from Excel
 */
export const QC_FORM_TEMPLATE: QCFormTemplate = {
    id: "qc-complete-301-v2",
    name: "MMR Quality Control Form - Complete",
    version: "2.0",
    isActive: true,
    totalQuestions: 300,
    headerFields: [
        {
            fieldId: "vendor_name",
            fieldName: "Vendor Name",
            fieldType: "dropdown",
            required: true,
            order: 1,
            options: ["GKX", "Abhirup", "Flomobility"]
        }
    ],
    signOffFields: [
        {
            fieldId: "qc_remarks",
            fieldName: "QC Remarks",
            fieldType: "textarea",
            required: false,
            order: 1
        }
    ],
    tabs: [
        // ==========================================
        // TAB 1: MANUFACTURING (113 Questions)
        // ==========================================
        {
            tabId: "manufacturing",
            tabName: "Manufacturing",
            order: 1,
            categories: [
                {
                    categoryId: "1_dumper_&_hydraulic_qc",
                    categoryName: "1. DUMPER & HYDRAULIC QC",
                    order: 1,
                    questions: [
                        {
                            questionId: 1,
                            questionText:
                                "Welding of Pipes or square Bar to Sheet - Visually inspect all pipe-to-sheet welds. Welds should be solid, with no gaps or weak joints.",
                            order: 1,
                            requiresImage: true
                        },
                        {
                            questionId: 2,
                            questionText:
                                "Welding of Dumping Hinge - Inspect hinge welding and alignment. Hinge must be strongly welded and aligned for smooth dumping motion.",
                            order: 2
                        },
                        {
                            questionId: 3,
                            questionText:
                                "Door Lock Welding & Alignment - Check lock welding and alignment with frame. Locks must be welded firmly and align correctly with door frame.",
                            order: 3
                        },
                        {
                            questionId: 4,
                            questionText:
                                "Door Operation - Open and close all three doors. Smooth movement, no noise, no rubbing or obstruction.",
                            order: 4
                        },
                        {
                            questionId: 5,
                            questionText:
                                "Door Gap Inspection - Measure gaps between all doors. All gaps must be uniform and within defined tolerance range.",
                            order: 5
                        },
                        {
                            questionId: 6,
                            questionText:
                                "Actuator Hinges Welding - Verify the actuator hinges are correctly welded. Weld must be solid, continuous, and aligned.",
                            order: 6
                        },
                        {
                            questionId: 7,
                            questionText:
                                "Actuator Top & Bottom Hinges Angle - Verify weld and 90° angle. Hinges must be welded at correct angle; bolt holes must align.",
                            order: 7
                        },
                        {
                            questionId: 37,
                            questionText:
                                "Hydraulic Actuator (Qty) - Verify count and part identification. Correct count (Qty: 1).",
                            order: 8
                        },
                        {
                            questionId: 38,
                            questionText:
                                "Full Range of Motion (Dumper) - Cycle the dumper mechanism through its full up and down travel 3 times. it should not stuck and have full rotating motion",
                            order: 9
                        }
                    ]
                },
                {
                    categoryId:
                        "2_front_wheel_assembly_mmr_v4_drawing_specific",
                    categoryName:
                        "2. FRONT WHEEL ASSEMBLY (MMR V4 DRAWING SPECIFIC)",
                    order: 2,
                    questions: [
                        {
                            questionId: 8,
                            questionText:
                                "Motor Mount 90° Angles - Measure angle using square tool. All angles should be exactly 90°.",
                            order: 1
                        }
                    ]
                },
                {
                    categoryId: "3_frame_&_chassis_structure",
                    categoryName: "3. FRAME & CHASSIS STRUCTURE",
                    order: 3,
                    questions: [
                        {
                            questionId: 9,
                            questionText:
                                "Chassis Structural Welding - Inspect all structural welds. Proper welding with no misalignment.",
                            order: 1
                        },
                        {
                            questionId: 10,
                            questionText:
                                "Corner Welding (Chassis) - Evaluate all corner joints. Uniform welded corners with strong bonding.",
                            order: 2
                        },
                        {
                            questionId: 11,
                            questionText:
                                "Front Motor Mount Welding - Inspect all weld joints. Welds must be strong and defect-free.",
                            order: 3
                        },
                        {
                            questionId: 12,
                            questionText:
                                "Middle U Channel Length - Measure overall length. check the holes/ slots for wire",
                            order: 4
                        },
                        {
                            questionId: 13,
                            questionText:
                                "U Channel Side 1/2 Assembly - Check integrity and welding of U Channel side 1 and 2. Must be fully welded and dimensionally correct.",
                            order: 5
                        },
                        {
                            questionId: 14,
                            questionText:
                                "L Angle Horizontal Rear Length - Measure length dimension. Length must be 400 mm.",
                            order: 6
                        },
                        {
                            questionId: 15,
                            questionText:
                                "Dumper Sheet Material Thickness - Measure thickness of dumper sheet metal. Must be 1.5 mm.",
                            order: 7
                        },
                        {
                            questionId: 16,
                            questionText:
                                "4mm Light Mount Strip - Check for presence and correct weld position at the top/front structure. Strip must be properly welded, straight, and aligned as per drawing.",
                            order: 8
                        },
                        {
                            questionId: 17,
                            questionText:
                                "Emergency Button Stopper Dimensions - Measure the critical dimensions of the stopper piece. Dimensions must include 63.5, 50, and holes Ø22.5, Ø16.1.",
                            order: 9
                        },
                        {
                            questionId: 18,
                            questionText:
                                'Dumper Hinge Alignment Check - Use Go/No Go Sheet to check hinge alignment. Hinges must align strictly per the "CHASSIS TO DUMPER" sheet.',
                            order: 10
                        },
                        {
                            questionId: 19,
                            questionText:
                                "Rear Hinge Alignment (L/R Symmetry) - Measure distance from hinge center to chassis reference points. Both sides must be equal; hinge should be perfectly aligned.",
                            order: 11
                        },
                        {
                            questionId: 20,
                            questionText:
                                "Back Hinges (Condition Check) - Visually inspect hinge condition and freedom of movement. Hinges must be robust and operate smoothly.",
                            order: 12,
                            requiresImage: true
                        },
                        {
                            questionId: 21,
                            questionText:
                                "Middle C Channel (Condition Check) - Visually inspect for distortion or damage. C-channel must be straight and free of damage.",
                            order: 13,
                            requiresImage: true
                        },
                        {
                            questionId: 22,
                            questionText:
                                "Battery Box Fixing - Physically move/pull battery box to test stability. Battery box must be firmly fixed with no play.",
                            order: 14
                        },
                        {
                            questionId: 23,
                            questionText:
                                "Front Enclosure Tray - Inspect tray welding, angle, and alignment relative to C-channel. Tray must be sturdy, aligned, and welded without distortion.",
                            order: 15
                        },
                        {
                            questionId: 47,
                            questionText:
                                "Back Motor Mount & Gearbox Fitting - Check hole positions & fitment. Holes should align perfectly with gearbox.",
                            order: 16
                        },
                        {
                            questionId: 48,
                            questionText:
                                "Hydraulic Tray Fixed Position Check - Manually rotate/tilt the front pivot part; observe for obstructions. No part should get stuck; tray must remain fixed and stable.",
                            order: 17
                        }
                    ]
                },
                {
                    categoryId: "4_wheels_&_final_assembly",
                    categoryName: "4. WHEELS & FINAL ASSEMBLY",
                    order: 4,
                    questions: [
                        {
                            questionId: 24,
                            questionText:
                                "Emergency Side Guides - Inspect both sides for correct placement and mounting. Side guides must be aligned correctly and welded properly.",
                            order: 1
                        },
                        {
                            questionId: 25,
                            questionText:
                                "Toggle Clamp Support Sheet Positioning - Verify position using measuring scale & visual inspection. Support sheet must match the drawing position and be firmly welded.",
                            order: 2,
                            requiresImage: true
                        },
                        {
                            questionId: 26,
                            questionText:
                                "Antenna Back Plate (Front C-Channel) - Visual inspection for presence + hole position. Antenna plate must be mounted, holes aligned, and not bent.",
                            order: 3,
                            requiresImage: true
                        },
                        {
                            questionId: 27,
                            questionText:
                                "Wire Clamps on Chassis - Check all wire clamp mounting points along chassis frame. All clamps must be present and firmly tightened; no missing clamps.",
                            order: 4
                        }
                    ]
                },
                {
                    categoryId: "5general_manufacturing_&_quality_checks",
                    categoryName: "5.GENERAL MANUFACTURING & QUALITY CHECKS",
                    order: 5,
                    questions: [
                        {
                            questionId: 28,
                            questionText:
                                "Weld Spatter Removal - Visually check frame before finishing/coating. Visually check frame before finishing/coating.",
                            order: 1,
                            requiresImage: true
                        },
                        {
                            questionId: 29,
                            questionText:
                                "Surface Finish: Powder Coating Thickness - check the uniform coating is there - any miss points where pain is not there Coating thickness must be within specified range (e.g., 60-100 microns).",
                            order: 2
                        },
                        {
                            questionId: 30,
                            questionText:
                                "Finish: Curing and Adhesion - check dumper - chassis - battery box Coating must be fully cured with no peeling or flaking.",
                            order: 3
                        },
                        {
                            questionId: 31,
                            questionText:
                                "Surface Finish: Powder Coating Thickness - check the uniform coating is there - any miss points where paint is not there Coating thickness must be within specified range (e.g., 60-100 microns).",
                            order: 4
                        }
                    ]
                },
                {
                    categoryId:
                        "6expanded_quality_and_process_checks_151___200",
                    categoryName:
                        "6.EXPANDED QUALITY AND PROCESS CHECKS (151 - 200)",
                    order: 6,
                    questions: [
                        {
                            questionId: 32,
                            questionText:
                                "Bottom Gusset 1/2 Presence - Verify the presence and welding of Bottom Gusset 1 and 2. Both gussets must be present and fully welded.",
                            order: 1
                        },
                        {
                            questionId: 33,
                            questionText:
                                "L Angle 1/2/3 Presence - Verify the presence and welding of L Angle 1, 2, and 3. All L Angles must be present and correctly welded.",
                            order: 2
                        },
                        {
                            questionId: 34,
                            questionText:
                                "Front Pivot Bearing Holder - Inspect the Front Pivot Bearing Holder component. Must be correctly machined and mounted.",
                            order: 3
                        },
                        {
                            questionId: 35,
                            questionText:
                                "Front Assembly L Channel - Inspect the L Channel used in the front assembly. Must match the specified dimensions.",
                            order: 4
                        },
                        {
                            questionId: 36,
                            questionText:
                                "Wire Clamps on Chassis - Check all wire clamp mounting points along chassis frame. All clamps must be present and firmly tightened; no missing clamps.",
                            order: 5
                        }
                    ]
                },
                {
                    categoryId:
                        "2front_wheel_assembly_mmr_v4_drawing_specific_",
                    categoryName:
                        "2.FRONT WHEEL ASSEMBLY (MMR V4 DRAWING SPECIFIC )",
                    order: 7,
                    questions: [
                        {
                            questionId: 39,
                            questionText:
                                "Part B1:Front Bearing Holder Plate Material - Verify material certification/markings. Material must be MS (Mild Steel), 10mm thickness, Quantity 1.",
                            order: 1
                        },
                        {
                            questionId: 40,
                            questionText:
                                "Part B2: Swivel Plate Dimension (277.5) - Use a caliper to measure the main length dimension. Length must be 277.5 mm.",
                            order: 2
                        },
                        {
                            questionId: 41,
                            questionText:
                                "Pivot Shaft Diameter - Measure the shaft diameter. Shaft must be 30 mm.",
                            order: 3
                        },
                        {
                            questionId: 42,
                            questionText:
                                "M40 Screw Bolt Check - Inspect M40 Screwbolt condition. Check for threading, and correct length.",
                            order: 4
                        },
                        {
                            questionId: 43,
                            questionText:
                                "Pivot Bearing Type - Inspect the bearing type used. Must be Thrust Bearing 51213.",
                            order: 5
                        },
                        {
                            questionId: 44,
                            questionText:
                                "Front Bearing Holder Plate (B1) Width/Height - Measure overall dimensions. Dimensions must be 45 mm x 165 mm.",
                            order: 6
                        },
                        {
                            questionId: 45,
                            questionText:
                                "Gearbox right and Left plate - with shaft hole should match at front gearbox outside gearbox plate and inside gearbox plate are conectric and we can insert the shaft ad gearbox and having no major deflection",
                            order: 7
                        },
                        {
                            questionId: 46,
                            questionText:
                                "Bearing Holder from GB Check - Inspect the Bearing Holder component. Must be present and correctly sized/machined.",
                            order: 8
                        }
                    ]
                },
                {
                    categoryId: "4_machined_parts_qc",
                    categoryName: "4. MACHINED PARTS QC",
                    order: 8,
                    questions: [
                        {
                            questionId: 49,
                            questionText:
                                "M40 Bolt - Visual + thread check. No bending, threads clean, correct length.",
                            order: 1,
                            requiresImage: true
                        },
                        {
                            questionId: 50,
                            questionText:
                                "Wheel Shaft - Check straightness & finish. Shaft must be straight with smooth machining (Hardening/Blackening).",
                            order: 2
                        },
                        {
                            questionId: 51,
                            questionText:
                                "Pivot Shaft - Check diameter & machining accuracy. Shaft should fit perfectly into bearing/pivot housing.",
                            order: 3
                        },
                        {
                            questionId: 52,
                            questionText:
                                "M40 Lock Chuck Nut Fitment - Verify nut fitment with M40 shaft & check machining quality. Nut should thread smoothly with no play; machining must be accurate.",
                            order: 4
                        },
                        {
                            questionId: 53,
                            questionText:
                                "Wheel Shaft Hardening - Verify Wheel Shaft Hardening Blackening must include to protect from rust",
                            order: 5
                        },
                        {
                            questionId: 54,
                            questionText:
                                "Bearing Seating Surface Check - Inspect the surface where bearings seat. Surface must be clean, smooth, and free of defects.",
                            order: 6
                        },
                        {
                            questionId: 55,
                            questionText:
                                "Machined Part Cleanliness - Visually inspect parts before assembly/packaging. Parts must be free of cutting fluid, metal chips, or debris.",
                            order: 7,
                            requiresImage: true
                        },
                        {
                            questionId: 56,
                            questionText:
                                "Pivot Thrust Bearing Rotation - Rotate the pivot section manually and feel for resistance. Thrust bearing should rotate freely without noise or tight spots.",
                            order: 8
                        }
                    ]
                },
                {
                    categoryId: "5_wheels_&_final_assembly",
                    categoryName: "5. WHEELS & FINAL ASSEMBLY",
                    order: 9,
                    questions: [
                        {
                            questionId: 57,
                            questionText:
                                "Wheel Size Verification - Measure wheel diameter. All wheels must be exactly 17 inches. Replace if mismatch.",
                            order: 1
                        },
                        {
                            questionId: 58,
                            questionText:
                                "Tyre Size - Compare all 4 tyres. size must be identical on all tyres.",
                            order: 2
                        },
                        {
                            questionId: 59,
                            questionText:
                                "Tyre Pressure Check - Use a gauge to verify air pressure in all four tires. Pressure must match the specified PSI/Bar.",
                            order: 3
                        },
                        {
                            questionId: 60,
                            questionText:
                                "Lug Nut Seating - Check that all lug nuts are present and fully seated. All nuts present and tightened; wheel hub properly engaged.",
                            order: 4
                        },
                        {
                            questionId: 61,
                            questionText:
                                "Spring-Loaded Handle at Rear - Pull and release handle; check movement and return action. Handle must operate smoothly and return to locked position correctly.",
                            order: 5
                        }
                    ]
                },
                {
                    categoryId: "6_inventory_count_bolts_nuts_hardware",
                    categoryName: "6. INVENTORY COUNT (BOLTS, NUTS, HARDWARE)",
                    order: 10,
                    questions: [
                        {
                            questionId: 62,
                            questionText:
                                "M16 × 50 Hex Bolt - For pillow bearing Correct count and condition.(Qty: 8)",
                            order: 1
                        },
                        {
                            questionId: 63,
                            questionText:
                                "M10 × 30 Hex Bolt - for wheel hub Correct count and condition.(Qty: 16)",
                            order: 2
                        },
                        {
                            questionId: 64,
                            questionText:
                                "M20 × 80 Hex Bolt (Half Thread) - hydraulic actuator Correct count and condition.(Qty: 8)",
                            order: 3
                        },
                        {
                            questionId: 65,
                            questionText:
                                "M12 × 60 Hex Bolt (Half Thread) - Dumper Hinges Correct count and condition.(Qty: 2)",
                            order: 4
                        },
                        {
                            questionId: 66,
                            questionText:
                                "M6 × 12 Allen Bolt - Wheel Shaft Correct count and condition. (Qty: 2)",
                            order: 5
                        },
                        {
                            questionId: 67,
                            questionText:
                                "M6 × 12 Hex Bolt - Wheel Shaft Correct count and condition.(Qty: 2)",
                            order: 6
                        },
                        {
                            questionId: 68,
                            questionText:
                                "M6 × 30 Allen Bolt - Gear Box Correct count and condition. (Qty: 8)",
                            order: 7
                        },
                        {
                            questionId: 69,
                            questionText:
                                "M6 x 10 CSK Allen Bolt - Toggle Clamp Correct count and condition.(Qty: 18)",
                            order: 8
                        },
                        {
                            questionId: 70,
                            questionText:
                                "M16 NYLOCK NUT - For pillow bearing Correct count and condition. (Qty: 8)",
                            order: 9
                        },
                        {
                            questionId: 71,
                            questionText:
                                "M10 NYLOCK NUT - Tyre Correct count and condition.(Qty: 16)",
                            order: 10
                        },
                        {
                            questionId: 72,
                            questionText:
                                "M12 NYLOCK NUT - Dumper Hinges Correct count and condition. (Qty: 2)",
                            order: 11
                        },
                        {
                            questionId: 73,
                            questionText:
                                "M20 NYLOCK NUT - hydraulic actuator Correct count and condition. (Qty: 2)",
                            order: 12
                        },
                        {
                            questionId: 74,
                            questionText:
                                "M6 NORMAL HEX NUT - Gear Box Correct count and condition.(Qty: 8)",
                            order: 13
                        },
                        {
                            questionId: 75,
                            questionText:
                                "30 mm Shaft Circlip - Pivot Shaft Correct count and condition.(Qty: 1)",
                            order: 14
                        },
                        {
                            questionId: 76,
                            questionText:
                                "Philips Screw  - M3X15 - ABS PLATE Correct count and condition.(Qty: 4)",
                            order: 15
                        },
                        {
                            questionId: 77,
                            questionText:
                                "Pop Rivet - Name Plate Correct count and condition.(Qty: 4)",
                            order: 16
                        },
                        {
                            questionId: 78,
                            questionText:
                                "M3 SS Nut - ABS PLATE Correct count and condition.(Qty: 4)",
                            order: 17
                        },
                        {
                            questionId: 79,
                            questionText:
                                "Pillow Block UCP-206 (30mm) -  Correct count and condition.(Qty: 4)",
                            order: 18
                        },
                        {
                            questionId: 80,
                            questionText:
                                "Bearing 6808 -  Correct count and condition.(Qty: 1)",
                            order: 19
                        },
                        {
                            questionId: 81,
                            questionText:
                                "Bearing 6906 -  Correct count and condition.(Qty: 2)",
                            order: 20
                        },
                        {
                            questionId: 82,
                            questionText:
                                "Thrust Bearing 51213 -  Correct count and condition.(Qty: 1)",
                            order: 21
                        },
                        {
                            questionId: 83,
                            questionText:
                                "Motors -  Correct count and condition. (Qty: 4)",
                            order: 22
                        },
                        {
                            questionId: 84,
                            questionText:
                                "17-Inch Wheels -  Correct count and condition. (Qty: 4)",
                            order: 23
                        },
                        {
                            questionId: 85,
                            questionText:
                                "Wheel Shaft -  Correct count and condition.(Qty: 4)",
                            order: 24
                        },
                        {
                            questionId: 86,
                            questionText:
                                "Pivot Shaft -  Correct count and condition.(Qty: 1)",
                            order: 25
                        },
                        {
                            questionId: 87,
                            questionText:
                                "Screw Bolt 40 mm -  Correct count and condition.(Qty: 1)",
                            order: 26
                        },
                        {
                            questionId: 88,
                            questionText:
                                "Wheel Shaft Key -  Correct count and condition.(Qty: 4)",
                            order: 27
                        },
                        {
                            questionId: 89,
                            questionText:
                                "Stainless Steel Carrying Handle -  Correct count and condition.(Qty: 1)",
                            order: 28
                        }
                    ]
                },
                {
                    categoryId: "7_general_manufacturing_&_quality_checks",
                    categoryName: "7. GENERAL MANUFACTURING & QUALITY CHECKS",
                    order: 11,
                    questions: [
                        {
                            questionId: 90,
                            questionText:
                                "Frame Rail Straightness (Lateral) - Use a straight edge along the frame rails. Frame rails must be straight within 0.5mm tolerance.",
                            order: 1
                        },
                        {
                            questionId: 91,
                            questionText:
                                "Frame Rail Straightness (Vertical) - Use a straight edge along the frame rails. Frame rails must be straight within 0.5mm tolerance.",
                            order: 2
                        }
                    ]
                },
                {
                    categoryId: "8_documentation_&_final_checks",
                    categoryName: "8. DOCUMENTATION & FINAL CHECKS",
                    order: 12,
                    questions: [
                        {
                            questionId: 92,
                            questionText:
                                "Serial Number Placement - Check for correct location, legibility, and permanence of the chassis VIN/Serial Number Serial number must be clearly stamped/engraved in the specified location.(just qc )",
                            order: 1
                        },
                        {
                            questionId: 93,
                            questionText:
                                "Gearbox Oil Level - Check/dip gearbox oil level. Oil level must be at the full mark.",
                            order: 2
                        },
                        {
                            questionId: 94,
                            questionText:
                                "Access Panel Fitment - Open and close all maintenance access panels. Panels must fit flush, close securely, and be easily removable/installable.",
                            order: 3
                        },
                        {
                            questionId: 95,
                            questionText:
                                "Shipping Weight Check - Weigh the unit on a calibrated scale. Weight must be within documented range.",
                            order: 4
                        }
                    ]
                },
                {
                    categoryId: "9_expanded_quality_and_process_checks_151_200",
                    categoryName:
                        "9. EXPANDED QUALITY AND PROCESS CHECKS (151-200)",
                    order: 13,
                    questions: [
                        {
                            questionId: 96,
                            questionText:
                                "Pivot Pin Hole Parallelism - Use a bore gauge to check parallelism between the two pivot pin holes. Must be parallel within 0.1mm over the length.",
                            order: 1
                        },
                        {
                            questionId: 97,
                            questionText:
                                "Actuator Mount Centerline - Measure the offset from the main frame centerline. Offset must be within drawing tolerance (e.g., +/- 1mm).",
                            order: 2
                        },
                        {
                            questionId: 98,
                            questionText:
                                "ABS Plate Thickness - Check the thickness of the plate holes must match specification.",
                            order: 3
                        },
                        {
                            questionId: 99,
                            questionText:
                                "Front Enclosure Tray - Check weld quality Rigid",
                            order: 4
                        },
                        {
                            questionId: 100,
                            questionText:
                                "Hydraulic Tray - Attached with fastners position is at right side of chassis",
                            order: 5
                        },
                        {
                            questionId: 101,
                            questionText:
                                "M40 Washers Presence - Verify the presence of M40 Washers. Washers must be present and correctly sized top and bottom",
                            order: 6
                        },
                        {
                            questionId: 102,
                            questionText:
                                "Bearing Cover Presence - Verify the presence of the Bearing Cover. Cover must be present and correctly fitted.",
                            order: 7
                        },
                        {
                            questionId: 103,
                            questionText:
                                "Gusset  Presence - Verify the presence and welding of the Gusset. Gusset must be present and fully welded.",
                            order: 8
                        },
                        {
                            questionId: 104,
                            questionText:
                                "Front Pivot Bearing Assembly - Check the assembly process against the drawing reference. Assembly must be completed as per diagram.",
                            order: 9
                        },
                        {
                            questionId: 105,
                            questionText:
                                "Front Wheel Chassis Assembly - Inspect the final assembled front wheel chassis structure. Structure must be square and defect-free.",
                            order: 10
                        },
                        {
                            questionId: 106,
                            questionText:
                                "L Angle 1/2/3 Presence - Verify the presence and welding of L Angle 1, 2, and 3. All L Angles must be present and correctly welded.",
                            order: 11
                        },
                        {
                            questionId: 107,
                            questionText:
                                "Front Pivot Bearing Holder - Inspect the Front Pivot Bearing Holder component. Must be correctly machined and mounted.",
                            order: 12
                        },
                        {
                            questionId: 108,
                            questionText:
                                "Front Assembly L Channel - Inspect the L Channel used in the front assembly. Inspect the L Channel used in the front assembly.",
                            order: 13
                        },
                        {
                            questionId: 109,
                            questionText:
                                "Side View Assembly Reference - Verify all components shown in the Side View Assembly are present and correctly fitted. All items present and aligned.",
                            order: 14
                        },
                        {
                            questionId: 110,
                            questionText:
                                "Top Motor Mount Assembly - Check the assembly and welding of the Top Motor Mount. Must be sturdy and correctly aligned with motor/gearbox.",
                            order: 15
                        },
                        {
                            questionId: 111,
                            questionText:
                                "Wire Clamps on Chassis - Check all wire clamp mounting points along chassis frame. All clamps must be present and firmly tightened; no missing clamps.",
                            order: 16
                        },
                        {
                            questionId: 112,
                            questionText:
                                "Swivel Mount Assembly - Check the integrity of the Swivel Mount Assembly. Must function smoothly and be securely fastened.",
                            order: 17
                        },
                        {
                            questionId: 113,
                            questionText:
                                "Final Inspection Sign-off - QC Manager final check before dispatch. All points 1-199 verified and unit is compliant.",
                            order: 18
                        }
                    ]
                }
            ]
        },
        // ==========================================
        // TAB 2: STACKBOX SETUP (41 Questions)
        // ==========================================
        {
            tabId: "stackbox_setup",
            tabName: "StackBox Setup",
            order: 2,
            categories: [
                {
                    categoryId: "stackbox_assembly",
                    categoryName: "StackBox Assembly & Setup",
                    order: 1,
                    questions: [
                        {
                            questionId: 201,
                            questionText:
                                "Soldering of vcc and ground on back of cytron md30",
                            order: 1
                        },
                        {
                            questionId: 202,
                            questionText: "Testing of cytron md30 using RPS",
                            order: 2
                        },
                        {
                            questionId: 203,
                            questionText: "Testing of cytron md20 using RPS",
                            order: 3
                        },
                        {
                            questionId: 204,
                            questionText: "Testing of contactor using RPS",
                            order: 4
                        },
                        {
                            questionId: 205,
                            questionText: "Testing of pcb",
                            order: 5
                        },
                        {
                            questionId: 206,
                            questionText:
                                "Mounting of m3*10 spacers using m3*6 screws on mdf (pcb,cytron md20)",
                            order: 6
                        },
                        {
                            questionId: 207,
                            questionText:
                                "Mounting of contactor using m4*10 allen bolt",
                            order: 7
                        },
                        {
                            questionId: 208,
                            questionText:
                                "Mounting of cytron md30 using m3*6 screws on top",
                            order: 8
                        },
                        {
                            questionId: 209,
                            questionText:
                                "Mounting of cytron md20 using m3*6 screws on top",
                            order: 9
                        },
                        {
                            questionId: 210,
                            questionText:
                                "Mounting of pcb in spacers using m3*6 screws on top",
                            order: 10
                        },
                        {
                            questionId: 211,
                            questionText: "Mounting of wifi router on the pcb",
                            order: 11
                        },
                        {
                            questionId: 212,
                            questionText:
                                "Power connection from pcb to router(soldering)",
                            order: 12
                        },
                        {
                            questionId: 213,
                            questionText:
                                "55cm 10 awg red make a power cable from contactor to anderson",
                            order: 13
                        },
                        {
                            questionId: 214,
                            questionText:
                                "Connection using 10 sqmm ring type lugs on contactor end",
                            order: 14
                        },
                        {
                            questionId: 215,
                            questionText:
                                "25cm Connection to power the pcb using 0.5sqmm red on same contactor power cable",
                            order: 15
                        },
                        {
                            questionId: 216,
                            questionText:
                                "Make one more set of  25cm and 15 cm cable to power cytrons using 10awg red",
                            order: 16
                        },
                        {
                            questionId: 217,
                            questionText:
                                "Fix 10sqmm ring type lugs on contactor end on cytron power cable",
                            order: 17
                        },
                        {
                            questionId: 218,
                            questionText:
                                "25cm Connection to pre charger using 0.5sqmm yellow on same cytron power cable",
                            order: 19
                        },
                        {
                            questionId: 219,
                            questionText:
                                "Connectiong power cable from contactor to cyrons (+ve)",
                            order: 20
                        },
                        {
                            questionId: 220,
                            questionText:
                                "65cm of 10 awg black to first md30 cytron (-ve)",
                            order: 21
                        },
                        {
                            questionId: 221,
                            questionText:
                                "(-ve) to power pcb has to be given from -ve of cytron",
                            order: 22
                        },
                        {
                            questionId: 222,
                            questionText:
                                "75cm of 10 awg black to second md30 cytron(-ve)",
                            order: 23
                        },
                        {
                            questionId: 223,
                            questionText:
                                "17cm of 0.5sqmm green using snapon lugs and pin type 0.5mm in other end",
                            order: 24
                        },
                        {
                            questionId: 224,
                            questionText:
                                "Install the snapon lugs on contactor top and other end on pcb",
                            order: 25
                        },
                        {
                            questionId: 225,
                            questionText:
                                "30 cm 0f 2.5sqmm black and red to power cytron md20 from left cytron",
                            order: 26
                        },
                        {
                            questionId: 226,
                            questionText:
                                "Signel connections from pcb to cytrons",
                            order: 27
                        },
                        {
                            questionId: 227,
                            questionText:
                                "connections from cyron md20 to pcb (PWM , DIR , GND)",
                            order: 28
                        },
                        {
                            questionId: 228,
                            questionText:
                                "Drilling of holes in stack using 12sqmm drill bit for Pg7 gland",
                            order: 29
                        },
                        {
                            questionId: 229,
                            questionText:
                                "Drilling of holes in stack using 18sqmm drill bit for pg11 gland",
                            order: 30
                        },
                        {
                            questionId: 230,
                            questionText:
                                "Drilling of holes in stack using 20sqmm drill bit for pg13.5 gland",
                            order: 31
                        },
                        {
                            questionId: 231,
                            questionText:
                                "Fixing of bakelite connector using m4 drill bit and m4*15 and m4 lock nut",
                            order: 32
                        },
                        {
                            questionId: 232,
                            questionText: "Mounting of stack in enclosure",
                            order: 33
                        },
                        {
                            questionId: 233,
                            questionText:
                                "Connection from bakelite connector to cytrons using 2.5smm red and black wire",
                            order: 34
                        },
                        {
                            questionId: 234,
                            questionText: "Fixing of GPS connector on stack",
                            order: 35
                        },
                        {
                            questionId: 235,
                            questionText:
                                "Fixing of power button using 0.5sqmm lugs",
                            order: 36
                        },
                        {
                            questionId: 236,
                            questionText:
                                "Emeregency button connection uding 0.5sqmm yellow wire",
                            order: 37
                        },
                        {
                            questionId: 237,
                            questionText: "Fixing of receiver on the stack",
                            order: 38
                        },
                        {
                            questionId: 238,
                            questionText: "Receiver connections from pcb",
                            order: 39
                        },
                        {
                            questionId: 239,
                            questionText: "Fixing of speaker on the stack",
                            order: 40
                        },
                        {
                            questionId: 240,
                            questionText: "Speaker connection from pcb",
                            order: 41
                        }
                    ]
                }
            ]
        },
        // ==========================================
        // TAB 3: ASSEMBLY (60 Questions)
        // ==========================================
        {
            tabId: "assembly",
            tabName: "Assembly",
            order: 3,
            categories: [
                {
                    categoryId: "assembly_jobcards",
                    categoryName: "Assembly Job Cards",
                    order: 1,
                    questions: [
                        {
                            questionId: 241,
                            questionText: "VISUAL INSPECTION",
                            order: 1
                        },
                        {
                            questionId: 242,
                            questionText: "MOTOR CONDITION",
                            order: 2
                        },
                        {
                            questionId: 243,
                            questionText: "AIR PRESSURE IN TYRES",
                            order: 3
                        },
                        {
                            questionId: 244,
                            questionText: "DUMPER DOOR HANDLES",
                            order: 4
                        },
                        {
                            questionId: 245,
                            questionText: "DUMPER DOOR LOCKS",
                            order: 5
                        },
                        {
                            questionId: 246,
                            questionText: "THRUST BEARING TIGHTENING",
                            order: 6
                        },
                        {
                            questionId: 247,
                            questionText:
                                "6ft. 2C 2.5SQMM CABLE  SOLDERING REAR MOTOR-1",
                            order: 7
                        },
                        {
                            questionId: 248,
                            questionText:
                                "HEAT SINK SLEEVE FOR CABLE OF REAR MOTOR-1",
                            order: 8
                        },
                        {
                            questionId: 249,
                            questionText: "FLEXIBLE PIPE 3ft. FOR REAR MOTOR-1",
                            order: 9
                        },
                        {
                            questionId: 250,
                            questionText:
                                "2.5SQMM PIN LUGS CRIMPING FOR REAR MOTOR-1",
                            order: 10
                        },
                        {
                            questionId: 251,
                            questionText:
                                "6ft. 2C 2.5SQMM CABLE SOLDERING REAR MOTOR-2",
                            order: 11
                        },
                        {
                            questionId: 252,
                            questionText:
                                "HEAT SINK SLEEVE FOR CABLE OF REAR MOTOR-2",
                            order: 12
                        },
                        {
                            questionId: 253,
                            questionText: "FLEXIBLE PIPE 3ft. FOR REAR MOTOR-2",
                            order: 13
                        },
                        {
                            questionId: 254,
                            questionText:
                                "2.5SQMM PIN LUGS CRIMPING FOR REAR MOTOR-2",
                            order: 14
                        },
                        {
                            questionId: 255,
                            questionText:
                                "1.5ft. 2C 2.5SQMM CABLE SOLDERING FORE MOTOR-1",
                            order: 15
                        },
                        {
                            questionId: 256,
                            questionText:
                                "HEAT SINK SLEEVE FOR CABLE OF FORE MOTOR-1",
                            order: 16
                        },
                        {
                            questionId: 257,
                            questionText: "FLEXIBLE PIPE 1ft. FOR FORE MOTOR-1",
                            order: 17
                        },
                        {
                            questionId: 258,
                            questionText:
                                "2.5SQMM PIN LUGS CRIMPING FOR FORE MOTOR-1",
                            order: 18
                        },
                        {
                            questionId: 259,
                            questionText:
                                "1.5ft. 2C 2.5SQMM CABLE SOLDERING FORE MOTOR-2",
                            order: 19
                        },
                        {
                            questionId: 260,
                            questionText:
                                "HEAT SINK SLEEVE FOR CABLE OF FORE MOTOR-2",
                            order: 20
                        },
                        {
                            questionId: 261,
                            questionText: "FLEXIBLE PIPE 3ft. FOR FORE MOTOR-2",
                            order: 21
                        },
                        {
                            questionId: 262,
                            questionText:
                                "2.5SQMM PIN LUGS CRIMPING FOR FORE MOTOR-2",
                            order: 22
                        },
                        {
                            questionId: 263,
                            questionText:
                                "5ft. 2C 2.5SQMM CABLE FOR HYDRAULIC POWER",
                            order: 23
                        },
                        {
                            questionId: 264,
                            questionText:
                                "2.5SQMM PIN LUGS CRIMPING AT HYDRAULIC END",
                            order: 24
                        },
                        {
                            questionId: 265,
                            questionText:
                                "5ft. 2C 0.5SQMM CABLE FOR HYDRAULIC SIGNAL",
                            order: 25
                        },
                        {
                            questionId: 266,
                            questionText:
                                "0.5SQMM PIN LUGS CRIMPING AT HYD. & STACK END",
                            order: 26
                        },
                        {
                            questionId: 267,
                            questionText:
                                "7ft.2C 0.5SQMM CABLE SOLDERING FOR BATTERY CAN",
                            order: 27
                        },
                        {
                            questionId: 268,
                            questionText:
                                "0.5SQMM PIN LUGS CRIMP FOR CAN CABLE OTH. END",
                            order: 28
                        },
                        {
                            questionId: 269,
                            questionText:
                                "2ft. 2C 0.5QMM CABLE SOLDERING FOR LED",
                            order: 29
                        },
                        {
                            questionId: 270,
                            questionText: "LED FIXING TO CHASIS",
                            order: 30
                        },
                        {
                            questionId: 271,
                            questionText: "ACTUATOR FIXING",
                            order: 31
                        },
                        {
                            questionId: 272,
                            questionText: "HYDRAULIC FIXING",
                            order: 32
                        },
                        {
                            questionId: 273,
                            questionText: "MOTOR-1 CONNECTIONS",
                            order: 33
                        },
                        {
                            questionId: 274,
                            questionText: "MOTOR-2 CONNECTIONS",
                            order: 34
                        },
                        {
                            questionId: 275,
                            questionText: "MOTOR-3 CONNECTIONS",
                            order: 35
                        },
                        {
                            questionId: 276,
                            questionText: "MOTOR-4 CONNECTIONS",
                            order: 36
                        },
                        {
                            questionId: 277,
                            questionText: "HYDRAULIC POWER CONECTION",
                            order: 37
                        },
                        {
                            questionId: 278,
                            questionText: "HYDRAULIC SIGNALCONECTION",
                            order: 38
                        },
                        {
                            questionId: 279,
                            questionText: "BATTERY CAN CONECTION",
                            order: 39
                        },
                        {
                            questionId: 280,
                            questionText: "BATTERY INSTALLATION",
                            order: 40
                        },
                        {
                            questionId: 281,
                            questionText: "STACK BOX FITMENT",
                            order: 41
                        },
                        {
                            questionId: 282,
                            questionText: "EMERGENCY PUSH BUTTON FIXING",
                            order: 42
                        },
                        {
                            questionId: 283,
                            questionText: "NC FIXING",
                            order: 43
                        },
                        {
                            questionId: 284,
                            questionText: "NC CONNECTIONS",
                            order: 44
                        },
                        {
                            questionId: 285,
                            questionText: "POWER BUTTON FIXING",
                            order: 45
                        },
                        {
                            questionId: 286,
                            questionText: "POWER BUTTON CONNECTIONS",
                            order: 46
                        },
                        {
                            questionId: 287,
                            questionText: "CABLE TIES FOR HARNESS",
                            order: 47
                        },
                        {
                            questionId: 288,
                            questionText: "GPS CONNECTIONS",
                            order: 48
                        },
                        {
                            questionId: 289,
                            questionText: "PRESSURE & FLOW SETTING",
                            order: 49
                        },
                        {
                            questionId: 290,
                            questionText: "MMR DETAILS PLATE FIXING",
                            order: 50
                        },
                        {
                            questionId: 291,
                            questionText: "ABB PLATE FIXING AT GPS",
                            order: 51
                        },
                        {
                            questionId: 292,
                            questionText: "ZIP TAGS FOR HARNESS",
                            order: 52
                        },
                        {
                            questionId: 293,
                            questionText: "WIFI  ROUTER ANTENNA FIXING",
                            order: 53
                        },
                        {
                            questionId: 294,
                            questionText: "SIM FIXING",
                            order: 54
                        },
                        {
                            questionId: 295,
                            questionText: "CONFIGURATION",
                            order: 55
                        },
                        {
                            questionId: 296,
                            questionText: "BRANDING FOR ROBOT",
                            order: 56
                        },
                        {
                            questionId: 297,
                            questionText: "Others :- (1)",
                            order: 57,
                            requiresText: true,
                            isOptional: true
                        },
                        {
                            questionId: 298,
                            questionText: "Others :- (2)",
                            order: 58,
                            requiresText: true,
                            isOptional: true
                        },
                        {
                            questionId: 299,
                            questionText: "Others :- (3)",
                            order: 59,
                            requiresText: true,
                            isOptional: true
                        },
                        {
                            questionId: 300,
                            questionText: "Others :- (4)",
                            order: 60,
                            requiresText: true,
                            isOptional: true
                        }
                    ]
                }
            ]
        },
        // ==========================================
        // TAB 4: FINAL CHECK (87 Questions)
        // ==========================================
        {
            tabId: "final_check",
            tabName: "Final Check",
            order: 4,
            categories: [
                {
                    categoryId: "final_check_all",
                    categoryName: "Final Quality Check",
                    order: 1,
                    questions: [
                        {
                            questionId: 114,
                            questionText: "MMR Type",
                            order: 1,
                            requiresText: true
                        },
                        {
                            questionId: 115,
                            questionText: "Actuator Type",
                            order: 2,
                            requiresText: true
                        },
                        {
                            questionId: 116,
                            questionText:
                                "Any other comments about this machine? (Optional)",
                            order: 3,
                            requiresText: true,
                            isOptional: true
                        },
                        {
                            questionId: 117,
                            questionText: "MMR Battery Manufacturer",
                            order: 4,
                            requiresText: true
                        },
                        {
                            questionId: 118,
                            questionText: "MMR Battery has Bluetooth?",
                            order: 5
                        },
                        {
                            questionId: 119,
                            questionText:
                                "Upload a screenshot of the Bluetooth App",
                            order: 6,
                            requiresImage: true
                        },
                        {
                            questionId: 120,
                            questionText: "MMR Battery Rated Voltage",
                            order: 7,
                            requiresText: true
                        },
                        {
                            questionId: 121,
                            questionText: "MMR Battery Current Voltage (V)",
                            order: 8,
                            requiresText: true
                        },
                        {
                            questionId: 122,
                            questionText: "MMR Battery Rated Capacity (Ah)",
                            order: 9,
                            requiresText: true
                        },
                        {
                            questionId: 123,
                            questionText: "MMR Battery Capacity (Ah)",
                            order: 10,
                            requiresText: true
                        },
                        {
                            questionId: 124,
                            questionText: "MMR Battery has CAN Port?",
                            order: 11
                        },
                        {
                            questionId: 125,
                            questionText:
                                "Photo of CAN-based Battery percent on remote",
                            order: 12,
                            requiresImage: true,
                            requiresText: true
                        },
                        {
                            questionId: 126,
                            questionText:
                                "Any other comments about the battery used, or its configuration? (Optional).",
                            order: 13,
                            requiresText: true,
                            isOptional: true
                        },
                        {
                            questionId: 127,
                            questionText:
                                "Does the MMR have a data collection OR autonomy stack?",
                            order: 14
                        },
                        {
                            questionId: 128,
                            questionText: "BOT Id",
                            order: 15,
                            requiresText: true
                        },
                        {
                            questionId: 129,
                            questionText: "Wireless Controller Details",
                            order: 16,
                            requiresText: true
                        },
                        {
                            questionId: 130,
                            questionText: "Dashboard of Wi-Fi router",
                            order: 17,
                            requiresText: true
                        },
                        {
                            questionId: 131,
                            questionText: "SIM Type",
                            order: 18,
                            requiresText: true
                        },
                        {
                            questionId: 132,
                            questionText: "SIM Number",
                            order: 19,
                            requiresText: true
                        },
                        {
                            questionId: 133,
                            questionText: "Wi-Fi Router SSID",
                            order: 20,
                            requiresText: true
                        },
                        {
                            questionId: 134,
                            questionText: "Wi-Fi Router Password",
                            order: 21,
                            requiresText: true
                        },
                        {
                            questionId: 135,
                            questionText: "Wi-Fi Router APN Profile",
                            order: 22,
                            requiresText: true
                        },
                        {
                            questionId: 136,
                            questionText:
                                "Upload Image of the APN Profile screenshot",
                            order: 23,
                            requiresImage: true
                        },
                        {
                            questionId: 137,
                            questionText:
                                "Any other comments related to data collection or autonomy stack in this machine? (Optional)",
                            order: 24,
                            requiresText: true,
                            isOptional: true
                        },
                        {
                            questionId: 138,
                            questionText:
                                "Is the Power Switch turning the machine ON/OFF properly?",
                            order: 25
                        },
                        {
                            questionId: 139,
                            questionText:
                                "Is the light on the power switch working when you turn on the switch?",
                            order: 26
                        },
                        {
                            questionId: 140,
                            questionText:
                                "Is the Emergency Switch working properly?",
                            order: 27
                        },
                        {
                            questionId: 141,
                            questionText:
                                "Confirm the configuration on the remote and select the option correctly as displayed on the remote [CHANNEL 5]",
                            order: 28,
                            requiresText: true
                        },
                        {
                            questionId: 142,
                            questionText:
                                "Confirm the configuration on the remote and select the option correctly as displayed on the remote [CHANNEL 6]",
                            order: 29,
                            requiresText: true
                        },
                        {
                            questionId: 143,
                            questionText:
                                "Confirm the configuration on the remote and select the option correctly as displayed on the remote [CHANNEL 7]",
                            order: 30,
                            requiresText: true
                        },
                        {
                            questionId: 144,
                            questionText:
                                "Confirm the configuration on the remote and select the option correctly as displayed on the remote [CHANNEL 8]",
                            order: 31,
                            requiresText: true
                        },
                        {
                            questionId: 145,
                            questionText:
                                "Confirm the configuration on the remote and select the option correctly as displayed on the remote [CHANNEL 9]",
                            order: 32,
                            requiresText: true
                        },
                        {
                            questionId: 146,
                            questionText:
                                "Confirm the configuration on the remote and select the option correctly as displayed on the remote [CHANNEL 10]",
                            order: 33,
                            requiresText: true
                        },
                        {
                            questionId: 147,
                            questionText:
                                "Is the failsafe enabled for all 10 channels? Check the failsafe value of each of the following channels as shown in the remote [CHANNEL 1]",
                            order: 34
                        },
                        {
                            questionId: 148,
                            questionText:
                                "Is the failsafe enabled for all 10 channels? Check the failsafe value of each of the following channels as shown in the remote [CHANNEL 2]",
                            order: 35
                        },
                        {
                            questionId: 149,
                            questionText:
                                "Is the failsafe enabled for all 10 channels? Check the failsafe value of each of the following channels as shown in the remote [CHANNEL 3]",
                            order: 36
                        },
                        {
                            questionId: 150,
                            questionText:
                                "Is the failsafe enabled for all 10 channels? Check the failsafe value of each of the following channels as shown in the remote [CHANNEL 4]",
                            order: 37
                        },
                        {
                            questionId: 151,
                            questionText:
                                "Is the failsafe enabled for all 10 channels? Check the failsafe value of each of the following channels as shown in the remote [CHANNEL 5]",
                            order: 38
                        },
                        {
                            questionId: 152,
                            questionText:
                                "Is the failsafe enabled for all 10 channels? Check the failsafe value of each of the following channels as shown in the remote [CHANNEL 6]",
                            order: 39
                        },
                        {
                            questionId: 153,
                            questionText:
                                "Is the failsafe enabled for all 10 channels? Check the failsafe value of each of the following channels as shown in the remote [CHANNEL 7]",
                            order: 40
                        },
                        {
                            questionId: 154,
                            questionText:
                                "Is the failsafe enabled for all 10 channels? Check the failsafe value of each of the following channels as shown in the remote [CHANNEL 8]",
                            order: 41
                        },
                        {
                            questionId: 155,
                            questionText:
                                "Is the failsafe enabled for all 10 channels? Check the failsafe value of each of the following channels as shown in the remote [CHANNEL 9]",
                            order: 42
                        },
                        {
                            questionId: 156,
                            questionText:
                                "Is the failsafe enabled for all 10 channels? Check the failsafe value of each of the following channels as shown in the remote [CHANNEL 10]",
                            order: 43
                        },
                        {
                            questionId: 157,
                            questionText:
                                "Upload a timestamped photo of the Failsafe configuration page showing the CH5 - CH10 failsafe data with timestamp watermark",
                            order: 44,
                            requiresImage: true
                        },
                        {
                            questionId: 158,
                            questionText:
                                "Is the Rx battery configured on the remote to external sensor with updated voltage parameters?",
                            order: 45
                        },
                        {
                            questionId: 159,
                            questionText:
                                "Take a of Rx battery external sensor and voltage limits with timestamp watermark",
                            order: 46,
                            requiresText: true
                        },
                        {
                            questionId: 160,
                            questionText:
                                "Is the ignition switch on the remote turning the ignition ON/OFF?",
                            order: 47
                        },
                        {
                            questionId: 161,
                            questionText:
                                "Is the light switch on the remote turning the fog light(s) ON/OFF?",
                            order: 48
                        },
                        {
                            questionId: 162,
                            questionText:
                                "Is the machine moving forward and reverse when throttle is pushed upward and downward?",
                            order: 49
                        },
                        {
                            questionId: 163,
                            questionText:
                                "Is the machine moving left and right during forward/reverse movement when the steering is pushed leftward/rightward?",
                            order: 50
                        },
                        {
                            questionId: 164,
                            questionText:
                                "After turning on the pivot mode, are the machine\'s front wheels able to rotate in-place when steering is pushed without pushing the throttle?",
                            order: 51
                        },
                        {
                            questionId: 165,
                            questionText:
                                "Is the dumper moving UP and DOWN when the dumper knob is pushed upwards or downwards, and stopped when the knob is released back to the middle?",
                            order: 52
                        },
                        {
                            questionId: 166,
                            questionText:
                                "Time taken in seconds for dumper to move fully from DOWN to UP",
                            order: 53,
                            requiresText: true
                        },
                        {
                            questionId: 167,
                            questionText:
                                "Time taken in seconds for dumper to move fully from UP to DOWN",
                            order: 54,
                            requiresText: true
                        },
                        {
                            questionId: 168,
                            questionText:
                                "Is the machine coming to a halt instantly when pushing the brake knob upwards or downwards?",
                            order: 55
                        },
                        {
                            questionId: 169,
                            questionText:
                                "Is there any custom function assigned to Switch C on the remote? If so, what is the function, and is it working?",
                            order: 56,
                            requiresText: true
                        },
                        {
                            questionId: 170,
                            questionText:
                                'Is the audio alarm of "Ignition switched on" and "Ignition switched off" audible?',
                            order: 57
                        },
                        {
                            questionId: 171,
                            questionText:
                                'Is the audio alarm of "Light switched on" and "Light switched off" audible?',
                            order: 58
                        },
                        {
                            questionId: 172,
                            questionText:
                                'Is the audio alarm of "Pivot mode on" and "Pivot mode off" audible?',
                            order: 59
                        },
                        {
                            questionId: 173,
                            questionText:
                                'Is the audio alarm of "Dumper moving up" and "Dumper moving down" audible?',
                            order: 60
                        },
                        {
                            questionId: 174,
                            questionText:
                                "If there is any audio linked to the custom function of Switch C, is it working? Select the option that applies.",
                            order: 61,
                            requiresText: true
                        },
                        {
                            questionId: 175,
                            questionText:
                                "Upload the image from the HUD to show that the bot is charging",
                            order: 62,
                            requiresImage: true
                        },
                        {
                            questionId: 176,
                            questionText:
                                "Any additional comments about this machine? (Optional)",
                            order: 63,
                            requiresText: true,
                            isOptional: true
                        },
                        {
                            questionId: 177,
                            questionText:
                                "Is data collection stack for non-autonomy machine used in this stack?",
                            order: 64
                        },
                        {
                            questionId: 178,
                            questionText:
                                "Is the live data appearing on the HUD for this MMR?",
                            order: 65
                        },
                        {
                            questionId: 179,
                            questionText: "Live Data dashboard screenshot",
                            order: 66,
                            requiresImage: true,
                            requiresText: true
                        },
                        {
                            questionId: 180,
                            questionText:
                                "Has the session been recorded on the HUD for this MMR?",
                            order: 67
                        },
                        {
                            questionId: 181,
                            questionText: "Session information screenshot",
                            order: 68,
                            requiresImage: true,
                            requiresText: true
                        },
                        {
                            questionId: 182,
                            questionText: "GPS data is received?",
                            order: 69
                        },
                        {
                            questionId: 183,
                            questionText: "Battery Data is received?",
                            order: 70
                        },
                        {
                            questionId: 184,
                            questionText:
                                "System data (Cytron temperatures, etc.) is received?",
                            order: 71
                        },
                        {
                            questionId: 185,
                            questionText: "Barometer data is received?",
                            order: 72
                        },
                        {
                            questionId: 186,
                            questionText: "IMU Data is received?",
                            order: 73
                        },
                        {
                            questionId: 187,
                            questionText:
                                "Any additional comments about data collection (Optional)",
                            order: 74,
                            requiresText: true,
                            isOptional: true
                        },
                        {
                            questionId: 188,
                            questionText:
                                "Upload an image of the front of the MMR with number plate clearly visible",
                            order: 75,
                            requiresImage: true
                        },
                        {
                            questionId: 189,
                            questionText:
                                "Upload a timestamped image of the stack box with all screws tightened, and if applicable, also the warranty sticker intact.",
                            order: 76,
                            requiresImage: true
                        },
                        {
                            questionId: 190,
                            questionText:
                                "As per tester\'s evaluation, is the machine ready for shipping based on the above testing?",
                            order: 77
                        },
                        {
                            questionId: 191,
                            questionText:
                                "Any additional comments about the testing? (Optional)",
                            order: 78,
                            requiresText: true,
                            isOptional: true
                        },
                        {
                            questionId: 192,
                            questionText:
                                "Is there pressure and distance sensor stack used in the bot?",
                            order: 79
                        },
                        {
                            questionId: 193,
                            questionText:
                                "Is the weight measurement alarm working when you turn on the ignition?",
                            order: 80
                        },
                        {
                            questionId: 194,
                            questionText:
                                "Is the weight measurement working when the dumper is at zero position?",
                            order: 81
                        },
                        {
                            questionId: 195,
                            questionText:
                                "Is the weight measurement working when the dumper is slightly lifted?",
                            order: 82
                        },
                        {
                            questionId: 196,
                            questionText:
                                "Is the weight measurement working when the ignition is switched off?",
                            order: 83
                        },
                        {
                            questionId: 197,
                            questionText:
                                "What is the weight recorded (kg) when you use the measure weight switch?",
                            order: 84,
                            requiresText: true
                        },
                        {
                            questionId: 198,
                            questionText:
                                "Is the distance sensor light blinking when the machine is moving?",
                            order: 85
                        },
                        {
                            questionId: 199,
                            questionText:
                                "Is the distance changing on the live dashboard a few seconds after moving the machine?",
                            order: 86
                        },
                        {
                            questionId: 200,
                            questionText:
                                "What is the distance displayed on the live dashboard at the time of this QC?",
                            order: 87,
                            requiresText: true
                        }
                    ]
                }
            ]
        }
    ],
    createdBy: {
        id: "system",
        name: "System",
        email: "system@flomobility.com"
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};
