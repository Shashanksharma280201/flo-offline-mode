import axios from "axios";
import {
    IBoundary,
    ICurrentMission,
    IDbPosition,
    ILocation,
    IMission,
    ISaveMission
} from "../../data/types/locationTypes";
import { threeJsToDb } from "../../util/cordinatesConverter";
import { getAuthHeader } from "../auth/authService";

const API_URL = "/api/v1/locations/";

/**
 * Sends API request to fetch locations that user has access
 *
 * @returns List of Locations accessible by the user
 */
export const getLocationsListFn = async () => {
    const response = await axios.get(API_URL, { headers: getAuthHeader() });
    return response.data;
};

export const saveBoundaryFn = async (
    boundaryMap: IDbPosition[],
    locationId: string
) => {
    console.log("payload for save", boundaryMap, locationId);

    const response = await axios.post(
        `${API_URL}update-boundary-map`,
        {
            boundaryMap: boundaryMap,
            locationId: locationId
        },
        { headers: getAuthHeader() }
    );

    console.log("saved data", response.data);

    return response.data;
};

export const saveMissionFn = async (mission: ISaveMission) => {
    console.log("save mission payload", mission);

    const response = await axios.post(
        `${API_URL}update-missions`,
        { ...mission },
        { headers: getAuthHeader() }
    );

    console.log("save mission response", response.data);

    return response.data;
};

export const createLocationFn = async (newLocation: {
    name: string;
    owner: string;
}) => {
    const response = await axios.post(`${API_URL}create`, newLocation, {
        headers: getAuthHeader()
    });

    console.log(response.data);
    return response.data;
};
