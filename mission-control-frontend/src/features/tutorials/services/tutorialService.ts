import { TutorialPayload } from "@/data/types/tutorialTypes";
import { getAuthHeader } from "@/features/auth/authService";
import axios from "axios";

const BASE_URL = "/api/v1/tutorials";

export const fetchTutorialsFn = async () => {
    const response = await axios.get(BASE_URL, { headers: getAuthHeader() });
    return response.data;
};

export const postTutorialFn = async (tutorial: TutorialPayload) => {
    const response = await axios.post(BASE_URL, tutorial, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const updateTutorialFn = async (
    id: string,
    tutorial: TutorialPayload
) => {
    const response = await axios.put(`${BASE_URL}/${id}`, tutorial, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const deleteTutorialFn = async (id: string) => {
    const response = await axios.delete(`${BASE_URL}/${id}`, {
        headers: getAuthHeader()
    });
    return response.data;
};
