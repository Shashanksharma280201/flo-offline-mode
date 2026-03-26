import { getAuthHeader } from "@/features/auth/authService";
import axios from "axios";

const API_URL = "/api/v1";

export type ClientUpdatePayload = {
    id: string;
    name: string;
    operatingHours: number;
    checkInTimeWithZone: string;
    latitude: number;
    longitude: number;
};

export const createClient = async (clientData: {
    name: string;
    operatingHours: string;
    latitude: number;
    longitude: number;
    checkInTimeWithZone: string;
}) => {
    const response = await axios.post(API_URL + "/clients/create", clientData, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const fetchClients = async () => {
    const response = await axios.get(API_URL + "/clients/fetchAll", {
        headers: getAuthHeader()
    });
    return response.data;
};

export const fetchClientDetails = async (clientId: string) => {
    const response = await axios.get(API_URL + `/clients/${clientId}`, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const updateClientDetails = async (
    clientPayload: ClientUpdatePayload
) => {
    const response = await axios.post(
        API_URL + "/clients/update",
        clientPayload,
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};
export const updateClientStatusFn = async ({
    clientId,
    isActive
}: {
    clientId: string;
    isActive: boolean;
}) => {
    const response = await axios.put(
        `${API_URL}/clients/${clientId}/status`,
        {
            isActive
        },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const fetchMaterials = async () => {
    const response = await axios.get(API_URL + `/materials/`, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const insertMaterialsFn = async (materials: string[]) => {
    const response = await axios.post(
        API_URL + `/materials/`,
        { materials },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const updateMaterialFn = async (material: string, id: string) => {
    const response = await axios.put(
        `${API_URL}/materials/${id}`,
        { material },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const updateMaterialStatusFn = async (isActive: boolean, id: string) => {
    const response = await axios.put(
        `${API_URL}/materials/${id}/status`,
        { isActive },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const fetchClientMaterials = async (clientId: string) => {
    const response = await axios.get(API_URL + `/materials/${clientId}`, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const removeMaterialFromClient = async (
    materialId: string,
    clientId: string
) => {
    const response = await axios.post(
        API_URL + `/clients/remove-material`,
        {
            materialId,
            clientId
        },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const addMaterialsToClient = async (
    clientId: string,
    materialIds: string[]
) => {
    const response = await axios.post(
        API_URL + `/clients/add-materials`,
        { clientId, materialIds },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const updateMaterial = async (
    newMaterialName: string,
    materialId: string
) => {
    const response = await axios.post(
        API_URL + `/materials/update-material`,
        { newMaterialName, materialId },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const fetchClientOperators = async (clientId: string) => {
    const response = await axios.get(
        API_URL + `/clients/${clientId}/operators`,
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const addOperatorToClient = async (
    clientId: string,
    operatorId: string
) => {
    const response = await axios.post(
        API_URL + `/clients/add-appuser`,
        { clientId, operatorId },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const removeOperatorFromClient = async (
    clientId: string,
    operatorId: string
) => {
    const response = await axios.post(
        API_URL + `/clients/remove-appuser`,
        { clientId, operatorId },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const moveOperator = async (toClientId: string, operatorId: string) => {
    const response = await axios.post(
        API_URL + `/clients/move-operator`,
        { toClientId, operatorId },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};
