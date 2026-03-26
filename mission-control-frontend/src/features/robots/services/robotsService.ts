import axios from "axios";
import { getAuthHeader } from "../../auth/authService";

const API_URL = "/api/v1/robots";

/**
 * Fetches all robots in the system (Admin only)
 * Used for user management to assign robot access
 *
 * @returns List of all robots
 */
export const fetchAllRobots = async () => {
    const response = await axios.get("/api/v1/robots/all", {
        headers: getAuthHeader()
    });

    return response.data;
};

/**
 * Sends API request to get robot if user has access
 *
 * @param robotId - robot id
 * @returns robot if accessible by the user
 */
export const getRobotFn = async (robotId: string) => {
    const response = await axios.post(
        API_URL + "/robot",
        { robotId },
        { headers: getAuthHeader() }
    );

    return response.data;
};

/**
 * Sends API request to get fleets
 *
 * @returns List of Fleets
 */
export const getFleetsListFn = async () => {
    const response = await axios.get("/api/v1/fleets/", {
        headers: getAuthHeader()
    });

    return response.data;
};

/**
 * Sends API request to create robot
 *
 * @param robotData - Data related to robot.
 * @returns List of Robots accessible by the user
 */
export const createRobotfn = async (robotData: {
    name: string;
    desc: string;
    password: string;
    owner: string;
    fleetId?: string;
    maintenance: {
        schedule: number[];
        lastMaintenance: number;
    };
}) => {
    const response = await axios.post(API_URL + "/create", robotData, {
        headers: getAuthHeader()
    });

    return response.data;
};

/**
 * BOM Part Verification Type
 */
export type BOMPart = {
    itemId: string;
    name: string;
    quantity: number;
    unit: string;
    source: 'Flo' | 'GKX' | 'Abhirup';
    purpose: 'electrical' | 'mechanical';
};

/**
 * Create robot with BOM verification and inventory deduction
 * @param robotData - Robot creation data
 * @param bomVerification - Array of parts with source selection
 */
export const createRobotWithBOMfn = async (payload: {
    robotData: {
        name: string;
        desc: string;
        password: string;
        owner: string;
        fleetId: string;
        robotType: 'autonomous' | 'manual';
        macAddress?: string;
        maintenance: {
            schedule: number[];
            lastMaintenance: number;
        };
    };
    bomVerification: BOMPart[];
}) => {
    const response = await axios.post(API_URL + "/create-with-bom", payload, {
        headers: getAuthHeader()
    });

    return response.data;
};

export const updateRobotfn = async (robotData: {
    name: string;
    desc?: string;
    robotId: string;
    macAddress?: string;
    fleetId?: string;
    maintenance?: {
        schedule: number[];
        lastMaintenance: number;
    };
}) => {
    const response = await axios.post(API_URL + "/update", robotData, {
        headers: getAuthHeader()
    });

    return response.data;
};

export const fetchRobotOperators = async (robotId: string) => {
    const response = await axios.post(
        `${API_URL}/robot/operators`,
        { robotId },
        {
            headers: getAuthHeader()
        }
    );

    return response.data;
};
export const addOperatorToRobot = async ({
    robotId,
    operatorId
}: {
    robotId: string;
    operatorId: string;
}) => {
    const response = await axios.post(
        `${API_URL}/add-appuser`,
        { robotId, operatorId },
        {
            headers: getAuthHeader()
        }
    );

    return response.data;
};

export const removeOperatorFromRobot = async ({
    robotId,
    operatorId
}: {
    robotId: string;
    operatorId: string;
}) => {
    const response = await axios.post(
        `${API_URL}/remove-appuser`,
        { robotId, operatorId },
        {
            headers: getAuthHeader()
        }
    );

    return response.data;
};

export const setActiveOperator = async ({
    robotId,
    operatorId
}: {
    robotId: string;
    operatorId: string;
}) => {
    const response = await axios.post(
        `${API_URL}/set-active-operator`,
        { robotId, operatorId },
        {
            headers: getAuthHeader()
        }
    );

    return response.data;
};

/**
 * Manufacturing Data Types and Services
 */
export type ManufacturingStatus =
    | 'created' | 'manufacturing' | 'manufactured'
    | 'qc_pending' | 'qc_approved' | 'deployed';

export type StatusHistoryEntry = {
    status: ManufacturingStatus;
    changedAt: string;
    changedBy: string;
};

export type PartsConsumedRecord = {
    itemId: string;
    name: string;
    quantity: number;
    unit: string;
    source: 'Flo' | 'GKX' | 'Abhirup';
    inventoryStatus?: 'sufficient' | 'insufficient' | 'external';
    consumedAt: string;
    consumedBy: string;
    purpose: 'electrical' | 'mechanical';
};

export type ManufacturingData = {
    manufacturingPartner?: 'GKX Engineering' | 'Abhirup Technologies' | 'Flo Mobility' | 'Others';
    manufacturingPartnerOther?: string;
    manufacturingDate?: string;
    shippingDate?: string;
    dataCollection?: boolean;
    invoicingStatus?: string;
    features?: string;
    additionalInputs?: string;
    partsConsumed?: PartsConsumedRecord[];
};

export const getManufacturingDataFn = async (robotId: string) => {
    const response = await axios.get(
        `${API_URL}/${robotId}/manufacturing-data`,
        { headers: getAuthHeader() }
    );
    return response.data;
};

export const updateManufacturingDataFn = async (
    robotId: string,
    data: ManufacturingData
) => {
    const response = await axios.put(
        `${API_URL}/${robotId}/manufacturing-data`,
        data,
        { headers: getAuthHeader() }
    );
    return response.data;
};

/**
 * Battery and Motor Data Types and Services
 */
export type BatteryData = {
    batteryId?: string; // Autogenerated: BAT<sequence>
    batteryCode?: string;
    batterySerialNo?: string;
    batteryType?: string; // e.g., Micronix LFP, Inverted LFP (include make, model, vendor)
    bluetoothConnectionSerialNo?: string;
    batteryIdDropdown?: string; // Dropdown from battery code field
    floStackId?: string;
};

export type MotorData = {
    motorType?: 'Brushed DC' | 'Brushless DC' | 'Stepper' | 'Servo' | 'AC Induction';
    motorModel?: string;
    motorSerialNumber?: string;
    motorId?: string;
};

export type BatteryMotorData = BatteryData & MotorData;

export const getBatteryMotorDataFn = async (robotId: string) => {
    const response = await axios.get(
        `${API_URL}/${robotId}/battery-motor-data`,
        { headers: getAuthHeader() }
    );
    return response.data;
};

export const updateBatteryMotorDataFn = async (
    robotId: string,
    data: BatteryMotorData
) => {
    const response = await axios.put(
        `${API_URL}/${robotId}/battery-motor-data`,
        data,
        { headers: getAuthHeader() }
    );
    return response.data;
};

// Legacy motor data endpoints (kept for backward compatibility)
export const getMotorDataFn = async (robotId: string) => {
    const response = await axios.get(
        `${API_URL}/${robotId}/motor-data`,
        { headers: getAuthHeader() }
    );
    return response.data;
};

export const updateMotorDataFn = async (
    robotId: string,
    data: BatteryMotorData
) => {
    const response = await axios.put(
        `${API_URL}/${robotId}/motor-data`,
        data,
        { headers: getAuthHeader() }
    );
    return response.data;
};

/**
 * Task Types and Services
 */
export type TaskHistoryEntry = {
    date: string;
    changedBy: string;
    field: string;
    oldValue?: string;
    newValue?: string;
    comment?: string;
};

export type Task = {
    _id?: string;
    title: string;
    description?: string;
    status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    category: 'Manufacturing' | 'Motor' | 'Issue' | 'General' | 'Maintenance';
    createdBy: string;
    assignedTo?: string;
    createdDate: string;
    dueDate?: string;
    completedDate?: string;
    history: TaskHistoryEntry[];
};

export const getTasksFn = async (
    robotId: string,
    params?: { status?: string; category?: string; priority?: string }
) => {
    const response = await axios.get(
        `${API_URL}/${robotId}/tasks`,
        {
            headers: getAuthHeader(),
            params
        }
    );
    return response.data;
};

export const createTaskFn = async (
    robotId: string,
    data: Partial<Task>
) => {
    const response = await axios.post(
        `${API_URL}/${robotId}/tasks`,
        data,
        { headers: getAuthHeader() }
    );
    return response.data;
};

export const updateTaskFn = async (
    robotId: string,
    taskId: string,
    data: Partial<Task>
) => {
    const response = await axios.put(
        `${API_URL}/${robotId}/tasks/${taskId}`,
        data,
        { headers: getAuthHeader() }
    );
    return response.data;
};

export const deleteTaskFn = async (
    robotId: string,
    taskId: string
) => {
    const response = await axios.delete(
        `${API_URL}/${robotId}/tasks/${taskId}`,
        { headers: getAuthHeader() }
    );
    return response.data;
};

/**
 * Parts Consumed API
 */
export const getPartsConsumedFn = async (robotId: string) => {
    const response = await axios.get(
        `${API_URL}/${robotId}/parts-consumed`,
        { headers: getAuthHeader() }
    );
    return response.data;
};

/**
 * Complete BOM Inventory - Re-check inventory for insufficient parts
 * @param robotId - Robot ID
 * @param partIds - Optional: specific part IDs to recheck
 */
export const completeBOMInventoryFn = async (
    robotId: string,
    partIds?: string[]
) => {
    const response = await axios.post(
        `${API_URL}/${robotId}/complete-bom-inventory`,
        { partIds },
        { headers: getAuthHeader() }
    );
    return response.data;
};
