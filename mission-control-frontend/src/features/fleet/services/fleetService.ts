import { getAuthHeader } from "@/features/auth/authService";
import axios from "axios";

const baseUrl = "/api/v1/fleets";

export const fetchFleetsFn = async () => {
    const response = await axios.get(baseUrl, {
        headers: getAuthHeader()
    });
    return response.data;
};

export interface UpdateFleetPayload {
    name: string;
    prefix: string;
    modelVersion: string;
    id: string;
}

export interface MaintenanceStep {
    _id: string;
    step: string;
    tag: string;
    referenceImageUrl?: string;
}

export interface FleetData {
    id: string;
    name: string;
    prefix: string;
    maintenanceSteps: MaintenanceStep[];
    modelVersion: string;
    partsConsumption?: PartsConsumption;
    sensors?: SensorConfiguration[];
    qcTemplateId?: string;
}

export interface CreateFleetPayload {
    name: string;
    prefix: string;
    modelVersion?: string;
    partsConsumption?: PartsConsumption;
    sensors?: SensorConfiguration[];
    qcTemplateId?: string;
}

export const addFleetFn = async (data: CreateFleetPayload) => {
    const response = await axios.post(baseUrl, data, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const updateFleetMetadataFn = async (data: UpdateFleetPayload) => {
    const response = await axios.put(`${baseUrl}/${data.id}`, data, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const fetchFleetRobotsFn = async (fleetId: string) => {
    const response = await axios.get(`${baseUrl}/${fleetId}/robots`, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const fetchFleetMaintenanceStepsFn = async (fleetId: string) => {
    const response = await axios.get(`${baseUrl}/${fleetId}/maintenance`, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const addMaintenanceStepFn = async ({
    fleetId,
    step,
    tag
}: {
    fleetId: string;
    step: string;
    tag: string;
}) => {
    const response = await axios.post(
        `${baseUrl}/${fleetId}/maintenance`,
        { step, tag },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const updateMaintenanceStepFn = async ({
    fleetId,
    stepId,
    step
}: {
    fleetId: string;
    stepId: string;
    step: string;
}) => {
    const response = await axios.put(
        `${baseUrl}/${fleetId}/maintenance/${stepId}`,
        { step },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const deleteMaintenanceStepFn = async ({
    fleetId,
    stepId
}: {
    fleetId: string;
    stepId: string;
}) => {
    const response = await axios.delete(
        `${baseUrl}/${fleetId}/maintenance/${stepId}`,
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const uploadMaintenanceStepReferenceFn = async ({
    fleetId,
    stepId,
    imageFile
}: {
    fleetId: string;
    stepId: string;
    imageFile: File;
}) => {
    const formData = new FormData();
    formData.append("referenceImage", imageFile);

    const response = await axios.post(
        `${baseUrl}/${fleetId}/maintenance/${stepId}/reference`,
        formData,
        {
            headers: {
                ...getAuthHeader(),
                "Content-Type": "multipart/form-data"
            }
        }
    );
    return response.data;
};

export const deleteMaintenanceStepReferenceFn = async ({
    fleetId,
    stepId
}: {
    fleetId: string;
    stepId: string;
}) => {
    const response = await axios.delete(
        `${baseUrl}/${fleetId}/maintenance/${stepId}/reference`,
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export interface PartsConsumption {
    electrical: {
        itemId: string;
        name: string;
        quantity: number;
        unit: string;
    }[];
    mechanical: {
        itemId: string;
        name: string;
        quantity: number;
        unit: string;
    }[];
}

export interface SensorConfiguration {
    sensorType: string;
    model?: string;
    quantity: number;
    specifications?: string;
}

export const updateFleetPartsConsumptionFn = async ({
    fleetId,
    partsConsumption
}: {
    fleetId: string;
    partsConsumption: PartsConsumption;
}) => {
    const response = await axios.put(
        `${baseUrl}/${fleetId}/parts-consumption`,
        { partsConsumption },
        { headers: getAuthHeader() }
    );
    return response.data;
};

export const updateFleetSensorsFn = async ({
    fleetId,
    sensors
}: {
    fleetId: string;
    sensors: SensorConfiguration[];
}) => {
    const response = await axios.put(
        `${baseUrl}/${fleetId}/sensors`,
        { sensors },
        { headers: getAuthHeader() }
    );
    return response.data;
};

export const linkFleetQCTemplateFn = async ({
    fleetId,
    qcTemplateId
}: {
    fleetId: string;
    qcTemplateId: string;
}) => {
    const response = await axios.put(
        `${baseUrl}/${fleetId}/qc-template`,
        { qcTemplateId },
        { headers: getAuthHeader() }
    );
    return response.data;
};

export const getFleetPartsRequirementFn = async (fleetId: string) => {
    const response = await axios.get(
        `${baseUrl}/${fleetId}/parts-requirement`,
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};
