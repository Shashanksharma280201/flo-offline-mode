import { getAuthHeader } from "@/features/auth/authService";
import axios from "axios";

export type Anomaly =
    | "crack"
    | "pole"
    | "pothole"
    | "crosswalk-blur"
    | "leaning-pole"
    | "white-line-blur";

export const getNissanImagesFn = async ({
    deviceId,
    sessionId,
    anomoly
}: {
    deviceId: string;
    sessionId: string;
    anomoly: Anomaly;
}) => {
    const response = await axios.get(
        `/api/v1/nissan/${deviceId}/${sessionId}/${anomoly}`,
        { headers: getAuthHeader() }
    );
    return response.data;
};

export const getNissanImageUrlFn = async (imagePath: string) => {
    const response = await axios.post(
        `/api/v1/nissan/images/fetchImageUrl`,
        { imagePath },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};
