import {
    FormattedMasterDataPayload,
    MasterDataPayload,
    Note,
    NotePayload,
    RobotMasterDataResponse
} from "@/data/types/masterDataTypes";
import { getAuthHeader } from "@/features/auth/authService";
import axios from "axios";

const baseUrl = "/api/v1/masterdata";

export interface RobotMasterDataFilters {
    status?: string;
    search?: string;
    client?: string;
    operator?: string;
    fleet?: string;
    access?: string;
    gpsStatus?: string;
}

// Robot Master Data Service
export const getRobotsMasterData = async (
    page: number = 1,
    limit: number = 20,
    filters?: RobotMasterDataFilters
): Promise<RobotMasterDataResponse> => {
    const params: Record<string, string | number> = { page, limit };

    if (filters) {
        if (filters.status) params.status = filters.status;
        if (filters.search) params.search = filters.search;
        if (filters.client) params.client = filters.client;
        if (filters.operator) params.operator = filters.operator;
        if (filters.fleet) params.fleet = filters.fleet;
        if (filters.access) params.access = filters.access;
        if (filters.gpsStatus) params.gpsStatus = filters.gpsStatus;
    }

    const response = await axios.get(`/api/v1/robots/master-data`, {
        params,
        headers: getAuthHeader()
    });
    return response.data;
};

// MasterData services
export const fetchMasterDataFn = async (query: string) => {
    const response = await axios.get(`${baseUrl}?${query}`, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const downloadMasterDataFn = async () => {
    const response = await axios.get(`${baseUrl}/download`, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const uploadMasterDataFn = async (masterData: FormattedMasterDataPayload[]) => {
    const response = await axios.post(baseUrl + "/merge-masterdata", masterData, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const fetchSingleMasterDataFn = async (masterDataId: string) => {
    const response = await axios.get(`${baseUrl}/${masterDataId}`, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const addMasterDataFn = async (masterData: Partial<MasterDataPayload>) => {
    const response = await axios.post(baseUrl, masterData, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const updateMasterDataFn = async (
    masterData: Partial<MasterDataPayload>,
    id: string,
    note?: NotePayload
) => {
    const result = await axios.put(
        `${baseUrl}/${id}`,
        { ...masterData, note },
        {
            headers: getAuthHeader()
        }
    );
    return result.data;
};

export const deleteMasterDataFn = async (id: string) => {
    const response = await axios.delete(`${baseUrl}/${id}`, {
        headers: getAuthHeader()
    });
    return response.data;
};

// Note services
export const addNoteFn = async (
    newNote: NotePayload,
    masterDataId: string
) => {
    const response = await axios.post(
        `${baseUrl}/${masterDataId}/notes`,
        newNote,
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const updateNoteFn = async (
    updatedNote: NotePayload,
    masterDataId: string,
    noteId: string
) => {
    const response = await axios.put(
        `${baseUrl}/${masterDataId}/notes/${noteId}`,
        updatedNote,
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const deleteNoteFn = async (masterDataId: string, noteId: string) => {
    const response = await axios.delete(
        `${baseUrl}/${masterDataId}/notes/${noteId}`,
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};
