import counterModel from "../models/counterModel";

/**
 * Get the next sequence value for a given counter
 * @param counterName - Name of the counter (e.g., 'battery')
 * @returns Promise<number> - The next sequence value
 */
export const getNextSequence = async (counterName: string): Promise<number> => {
  const counter = await counterModel.findByIdAndUpdate(
    counterName,
    { $inc: { sequenceValue: 1 } },
    { new: true, upsert: true }
  );

  return counter.sequenceValue;
};

/**
 * Generate the next Battery ID
 * @returns Promise<string> - Battery ID in format BAT0001
 */
export const generateBatteryId = async (): Promise<string> => {
  const sequence = await getNextSequence('battery');
  // Pad with zeros to make it 4 digits
  const paddedSequence = sequence.toString().padStart(4, '0');
  return `BAT${paddedSequence}`;
};

/**
 * Get current counter value without incrementing
 * @param counterName - Name of the counter
 * @returns Promise<number> - Current sequence value
 */
export const getCurrentSequence = async (counterName: string): Promise<number> => {
  const counter = await counterModel.findById(counterName);
  return counter?.sequenceValue || 0;
};

/**
 * Generate the next Inventory ID for Mechanical items
 * @returns Promise<string> - Inventory ID in format MECH-001
 */
export const generateMechanicalInventoryId = async (): Promise<string> => {
  const sequence = await getNextSequence('inventory-mechanical');
  const paddedSequence = sequence.toString().padStart(3, '0');
  return `MECH-${paddedSequence}`;
};

/**
 * Generate the next Inventory ID for Electronics items
 * @returns Promise<string> - Inventory ID in format ELEC-001
 */
export const generateElectronicsInventoryId = async (): Promise<string> => {
  const sequence = await getNextSequence('inventory-electronics');
  const paddedSequence = sequence.toString().padStart(3, '0');
  return `ELEC-${paddedSequence}`;
};

/**
 * Generate Inventory ID based on category
 * @param category - "mechanical" or "electronics"
 * @returns Promise<string> - Generated inventory ID
 */
export const generateInventoryId = async (
  category: "mechanical" | "electronics"
): Promise<string> => {
  if (category === "mechanical") {
    return generateMechanicalInventoryId();
  }
  return generateElectronicsInventoryId();
};

/**
 * Generate the next Shipment ID
 * @returns Promise<string> - Shipment ID in format SHIP-001
 */
export const generateShipmentId = async (): Promise<string> => {
  const sequence = await getNextSequence('shipment');
  const paddedSequence = sequence.toString().padStart(3, '0');
  return `SHIP-${paddedSequence}`;
};
