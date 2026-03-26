import axios from "axios";
import { getAuthHeader } from "../auth/authService";
import {
    Boundary,
    Obstacle,
    Path,
    Paths,
    Point2,
    Station
} from "../../data/types";

const API_URL = "/api/v1/pathMaps/";

/**
 * Sends API request to fetch PathMaps that user has access
 *
 * @returns List of PathMaps accessible by the user
 */
export const getPathMapsListFn = async () => {
    const response = await axios.get(API_URL, { headers: getAuthHeader() });
    return response.data;
};
/**
 * Sends API request to fetch PathMaps that user has access
 *
 * @returns List of PathMaps accessible by the user
 */
export const getPathMapById = async (pathMapId: string) => {
    const response = await axios.post(
        API_URL,
        { pathMapId },
        { headers: getAuthHeader() }
    );
    return response.data;
};

/**
 * Sends API request to fetch missions specified by the pathMap id
 *
 * @returns List of PathMaps accessible by the user
 */
export const getMissionsFn = async () => {
    const response = await axios.get(`${API_URL}get-missions`, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const updatePathMapFn = async (
    paths: Paths,
    stations: Station[],
    pathMapId: string,
    boundaries?: Boundary[],
    obstacles?: Obstacle[]
) => {
    const requestBody: any = {
        paths,
        stations,
        pathMapId
    };

    // Add boundaries and obstacles if provided
    if (boundaries !== undefined) {
        requestBody.boundaries = boundaries;
    }
    if (obstacles !== undefined) {
        requestBody.obstacles = obstacles;
    }

    const response = await axios.post(
        `${API_URL}update`,
        requestBody,
        { headers: getAuthHeader() }
    );

    return response.data;
};
export const deletePathMapFn = async (pathMapId: string) => {
    const response = await axios.post(
        `${API_URL}delete`,
        { id: pathMapId },
        { headers: getAuthHeader() }
    );

    return response.data;
};
export const deleteMissionFn = async (missionId: string, pathMapId: string) => {
    const response = await axios.post(
        `${API_URL}delete-mission`,
        {
            missionId,
            pathMapId
        },
        { headers: getAuthHeader() }
    );

    return response.data;
};

export const createMissionFn = async (name: string, pathMapId: string) => {
    const response = await axios.post(
        `${API_URL}create-mission`,
        { name, pathMapId },
        { headers: getAuthHeader() }
    );

    return response.data;
};

export const updateMissionFn = async (
    missionId: string,
    pathMapId: string,
    mission: Path[]
) => {
    const response = await axios.post(
        `${API_URL}update-mission`,
        { missionId, pathMapId, mission },
        { headers: getAuthHeader() }
    );

    return response.data;
};

export const createPathMapFn = async (
    name: string,
    owner: string,
    frame: string,
    lidarMapName?: string
) => {
    const response = await axios.post(
        `${API_URL}create`,
        {
            name,
            owner,
            frame,
            lidarMapName
        },
        {
            headers: getAuthHeader()
        }
    );

    return response.data;
};

export const addBoundaryFn = async (
    boundaries: Boundary[],
    obstacles: Obstacle[],
    pathMapId: string
) => {
    const response = await axios.post(
        `${API_URL}add-boundary`,
        {
            boundaries,
            obstacles,
            pathMapId
        },
        {
            headers: getAuthHeader()
        }
    );
    return response.data;
};

export const generatePathFn = async (
    points: Point2[],
    direction: "horizontal" | "vertical" = "horizontal",
    wheelSeperation: number,
    stepSize: number,
    safetyMargin: number,
    obstacles?: Point2[][]
) => {
    const response = await axios.post(
        "/algorithm",
        {
            points,
            direction,
            obstacles,
            wheelSeperation,
            stepSize,
            safetyMargin
        },
        {
            headers: {
                "Content-Type": "application/json"
            }
        }
    );
    return response.data;
};

/**
 * Context object passed to the Autonomy Agent with each voice command
 * Gives the agent awareness of the current dashboard state
 */
export interface AutonomyContext {
    robotId?: string;
    robotName?: string;
    robotType?: string;
    robotStatus?: string;
    isRobotConnected?: boolean;
    pathMapId?: string;
    pathMapName?: string;
    pathMapFrame?: string;
    missionId?: string;
    missionName?: string;
    isMissionExecuting?: boolean;
    isPathMapping?: boolean;
    isMissionPlanning?: boolean;
    isNonRTKMode?: boolean;
    isLocalized?: boolean;
}

/**
 * Send voice command to Autonomy Agent (Command Executor)
 * New GPT-4o powered agent with function calling
 */
export const sendVoiceCmdFn = async (
    audio: File,
    conversationId?: string,
    context?: AutonomyContext
) => {
    const formData = new FormData();
    formData.append("file", audio);
    if (conversationId) {
        formData.append("conversationId", conversationId);
    }
    if (context) {
        formData.append("context", JSON.stringify(context));
    }

    const response = await axios.post("/api/v1/autonomy-agent/command", formData, {
        headers: {
            ...getAuthHeader(),
            "Content-Type": "multipart/form-data",
            Accept: "*/*"
        }
    });
    return response.data;
};

/**
 * Send text command to Autonomy Agent (for disambiguation choices)
 * Continues an existing conversation with a text input
 */
export const sendTextCmdFn = async (
    text: string,
    conversationId: string,
    context?: AutonomyContext
) => {
    const response = await axios.post(
        "/api/v1/autonomy-agent/command-text",
        { text, conversationId, context },
        {
            headers: {
                ...getAuthHeader(),
                "Content-Type": "application/json"
            }
        }
    );
    return response.data;
};
