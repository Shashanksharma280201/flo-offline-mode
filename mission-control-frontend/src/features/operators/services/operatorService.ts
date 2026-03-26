import { getAuthHeader } from "@/features/auth/authService";
import axios from "axios";

const API_URL = "/api/v1";

export const registerOperator = async (operatorData: {
    name: string;
    phoneNumber: string;
    password: string;
}) => {
    const response = await axios.post(`${API_URL}/operators`, operatorData, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const fetchAllOperators = async () => {
    const response = await axios.get(`${API_URL}/operators`, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const fetchOperatorDetails = async (operatorId: string) => {
    const response = await axios.post(
        `${API_URL}/operators/operator`,
        { operatorId },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const fetchOperatorAttendance = async (
    operatorId: string,
    startingTimestamp: number,
    endingTimestamp: number
) => {
    const response = await axios.post(
        `${API_URL}/attendance/fetch`,
        { operatorId, startingTimestamp, endingTimestamp },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const fetchAllOperatorsAttendance = async ({
    startingTimestamp,
    endingTimestamp
}: {
    startingTimestamp: number;
    endingTimestamp: number;
}) => {
    const response = await axios.post(
        `${API_URL}/attendance/fetchAll`,
        { startingTimestamp, endingTimestamp },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const fetchAllOperatorsAttendanceForAllClients = async ({
    startingTimestamp,
    endingTimestamp
}: {
    startingTimestamp: number;
    endingTimestamp: number;
}) => {
    const response = await axios.post(
        `${API_URL}/attendance/client`,
        { startingTimestamp, endingTimestamp },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const fetchOperatorRobots = async (operatorId: string) => {
    const response = await axios.post(
        `${API_URL}/operators/operator/robots`,
        { operatorId },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const fetchAllRobots = async () => {
    const response = await axios.get(`${API_URL}/robots/`, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const addRobotToOperator = async ({
    robotId,
    operatorId
}: {
    robotId: string;
    operatorId: string;
}) => {
    const response = await axios.post(
        `${API_URL}/robots/add-appuser`,
        {
            robotId,
            operatorId
        },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const removeRobotFromOperator = async ({
    robotId,
    operatorId
}: {
    robotId: string;
    operatorId: string;
}) => {
    const response = await axios.post(
        `${API_URL}/robots/remove-appuser`,
        {
            robotId,
            operatorId
        },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const updateOperatorStatusFn = async ({
    operatorId,
    isActive
}: {
    operatorId: string;
    isActive: boolean;
}) => {
    const response = await axios.put(
        `${API_URL}/operators/${operatorId}/status`,
        {
            isActive
        },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const resetOperatorPassword = async (
    operatorId: string,
    newPassword?: string
) => {
    const response = await axios.post(
        `${API_URL}/operators/reset-password`,
        { operatorId, newPassword },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const uploadOperatorDocuments = async (
    operatorId: string,
    panCardImages?: File[],
    aadharCardImages?: File[],
    profileImage?: File
) => {
    const formData = new FormData();

    if (panCardImages && panCardImages.length > 0) {
        panCardImages.forEach((file) => {
            formData.append("panCardImage", file);
        });
    }

    if (aadharCardImages && aadharCardImages.length > 0) {
        aadharCardImages.forEach((file) => {
            formData.append("aadharCardImage", file);
        });
    }

    if (profileImage) {
        formData.append("imageUrl", profileImage);
    }

    const response = await axios.post(
        `${API_URL}/operators/${operatorId}/documents`,
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

export const deleteOperatorDocument = async (
    operatorId: string,
    documentType: "pan" | "aadhar",
    imageUrl: string
) => {
    const response = await axios.delete(
        `${API_URL}/operators/${operatorId}/documents`,
        {
            headers: getAuthHeader(),
            data: {
                documentType,
                imageUrl
            }
        }
    );
    return response.data;
};

export const updateOperatorDetails = async (
    operatorId: string,
    name: string,
    phoneNumber: string
) => {
    const response = await axios.put(
        `${API_URL}/operators/operator/update`,
        { operatorId, name, phoneNumber },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};
