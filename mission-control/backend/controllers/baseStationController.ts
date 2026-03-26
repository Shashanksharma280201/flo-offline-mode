import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import baseStationModel, { BaseStationData } from "../models/baseStationModel";
import { LatLng } from "../models/pathMapModel";
import { redisClient } from "../services/redis";

/**
 * Get Base Stations
 * @access Private
 * @param req - Request
 * @param res - Response
 * @returns Base stations
 *
 *
 */
export const getBaseStations = asyncHandler(
  async (req: Request, res: Response) => {
    const baseStations = await baseStationModel.find<BaseStationData>();
    const updatedBaseStationsPromises = baseStations.map(
      async (baseStation) => {
        const status = await redisClient.json.get(`station:${baseStation.mac}`);
        return {
          mac: baseStation.mac,
          location: baseStation.location,
          id: baseStation.id,
          online: status || false
        };
      }
    );
    const updatedBaseStations = await Promise.all(updatedBaseStationsPromises);

    const onlineCount = updatedBaseStations.filter((s) => s.online).length;
    const offlineCount = updatedBaseStations.length - onlineCount;
    // eslint-disable-next-line no-console
    console.debug(
      `BaseStations API: total=${updatedBaseStations.length}, online=${onlineCount}, offline=${offlineCount}`
    );
    
    if (!updatedBaseStations) {
      res.status(400);
      throw new Error("No Fleets Found");
    }
    res.status(200).json(updatedBaseStations);
  }
);

/**
 * Creates Base Station
 * @access Private
 * @param req - Request
 * @param res - Response
 * @returns Created Base station
 *
 *
 */

export const registerBaseStation = asyncHandler(async (req, res) => {
  const { mac, location, online=false }: { mac: string; location: LatLng, online:boolean } = req.body;

  if (!mac || !location ) {
    res.status(400);
    throw new Error("Missing required request parameters");
  }

  // Checking if lat and lng are default values and setting them up

  const baseStation = await baseStationModel.create({
    mac,
    location: {
      lat: location.lat || 12.923650772185463,
      lng: location.lng || 77.64699235191925
    },
    online
    
  });

  if (baseStation) {
    res.status(200).json({
      id: baseStation.id,
      mac: baseStation.mac,
      location: baseStation.location
    });
  } else {
    res.status(400);
    throw new Error("Unable to register Base Station, Please try again later");
  }
});
