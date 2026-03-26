import axios, { AxiosProgressEvent } from "axios";
import { getAuthHeader } from "@/features/auth/authService";
import { BlogPost, BlogPayload, BlogUploadResponse } from "../types";

const BASE_URL = "/api/v1/blog";

export const fetchPostsFn = async (
    status?: string,
    page: number = 1,
    limit: number = 10
) => {
    const response = await axios.get(BASE_URL, {
        params: { status, page, limit },
        headers: getAuthHeader()
    });
    return response.data;
};

export const fetchPostFn = async (id: string): Promise<BlogPost> => {
    // The backend uses /id/:id for fetching by ID for editing
    const response = await axios.get(`${BASE_URL}/id/${id}`, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const createPostFn = async (payload: BlogPayload): Promise<BlogPost> => {
    const response = await axios.post(BASE_URL, payload, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const updatePostFn = async (
    id: string,
    payload: BlogPayload
): Promise<BlogPost> => {
    const response = await axios.put(`${BASE_URL}/${id}`, payload, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const deletePostFn = async (id: string) => {
    const response = await axios.delete(`${BASE_URL}/${id}`, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const uploadMediaFn = async (
    file: File,
    onProgress?: (progress: number) => void
): Promise<BlogUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(`${BASE_URL}/upload`, formData, {
        headers: {
            ...getAuthHeader(),
            "Content-Type": "multipart/form-data"
        },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (onProgress && progressEvent.total) {
                const percent = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                );
                onProgress(percent);
            }
        }
    });
    return response.data;
};
