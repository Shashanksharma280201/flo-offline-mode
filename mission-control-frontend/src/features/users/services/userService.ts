import { getAuthHeader } from "@/features/auth/authService";
import axios from "axios";

const API_URL = "/api/v1/users";

export interface CreateUserData {
    name: string;
    email: string;
    password: string;
    role: "admin" | "custom";
    permissions?: string[];
    robots?: string[];
    clients?: string[];
    operators?: string[];
}

export interface UpdateUserData {
    name?: string;
    email?: string;
    password?: string;
    role?: "admin" | "custom";
    permissions?: string[];
    robots?: string[];
    clients?: string[];
    operators?: string[];
}

export interface UserResponse {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions?: string[];
    robots?: string[];
    clients?: string[];
    operators?: string[];
    notificationPreferance: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface AllUsersResponse {
    users: UserResponse[];
    totalUsers: number;
}

/**
 * Create a new user (admin only)
 */
export const createUser = async (userData: CreateUserData) => {
    const response = await axios.post(`${API_URL}/create`, userData, {
        headers: getAuthHeader()
    });
    return response.data;
};

/**
 * Get all users (admin only)
 */
export const fetchAllUsers = async (): Promise<AllUsersResponse> => {
    const response = await axios.get(`${API_URL}/all`, {
        headers: getAuthHeader()
    });
    return response.data;
};

/**
 * Get user by ID (admin only)
 */
export const fetchUserById = async (userId: string): Promise<UserResponse> => {
    const response = await axios.get(`${API_URL}/${userId}`, {
        headers: getAuthHeader()
    });
    return response.data;
};

/**
 * Update user (admin only)
 */
export const updateUser = async (userId: string, userData: UpdateUserData) => {
    const response = await axios.put(`${API_URL}/${userId}`, userData, {
        headers: getAuthHeader()
    });
    return response.data;
};

/**
 * Delete user (admin only)
 */
export const deleteUser = async (userId: string) => {
    const response = await axios.delete(`${API_URL}/${userId}`, {
        headers: getAuthHeader()
    });
    return response.data;
};
