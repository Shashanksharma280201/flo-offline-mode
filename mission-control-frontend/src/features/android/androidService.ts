import axios from "axios";

const API_URL = "/api/v1/app/";

/**
 * Sends API request to server for authentication of user login
 *
 * @returns response from server with apk url
 */
export const fetchUrlForApp = async () => {
    const response = await axios.get(API_URL + "apk");
    return response.data;
};
