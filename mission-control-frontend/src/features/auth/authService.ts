import { IUser } from "@/data/types";
import axios from "axios";

const API_URL = "/api/v1/";

/**
 * Sends API request to server for authentication of user login
 *
 * @param userData - contains user email and password
 * @returns response from server with user details and JWT token
 */
export const login = async (userData: { email: string; password: string }) => {
    const response = await axios.post(API_URL + "login", userData);
    if (response.data.token) {
        localStorage.setItem("user", JSON.stringify(response.data));
    }
    return response.data;
};

/**
 * Provide details of current user
 * @returns response from backend regarding current user details
 */
export const getMeFn = async () => {
    const response = await axios.get(API_URL + "me");
    return response.data;
};

/**
 * Log out the currently logged in user
 */
export const logout = () => {
    localStorage.removeItem("user");
};

/**
 * Gets currently loggedIn user details
 * @returns user details
 */
export const getCurrentUser = () => {
    const userStr = localStorage.getItem("user");
    if (userStr) return JSON.parse(userStr);

    return null;
};

/**
 * Gets authorization headers for API requests from local storage
 *
 * @returns Auth Headers
 */
export const getAuthHeader = () => {
    const userStr = localStorage.getItem("user");
    let user = null;
    if (userStr) user = JSON.parse(userStr);

    if (user && user.token) {
        return { Authorization: "Bearer " + user.token };
    } else {
        return { Authorization: "" };
    }
};

export const getAuthUser = () => {
    const userStr = localStorage.getItem("user");
    let user: IUser | null = null;
    if (userStr) user = JSON.parse(userStr);
    return user;
};
