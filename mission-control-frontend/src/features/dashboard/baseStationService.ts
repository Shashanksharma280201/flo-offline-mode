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
import { BaseStationData } from "@/data/types";

const API_URL = "/api/v1/base-stations/";

/**
 * Sends API request to fetch base Stations
 *
 * @returns List of base stations
 */
export const getBaseStationListFn = async () => {
    const response = await axios.get<BaseStationData[]>(API_URL, {
        headers: getAuthHeader()
    });
    return response.data;
};
