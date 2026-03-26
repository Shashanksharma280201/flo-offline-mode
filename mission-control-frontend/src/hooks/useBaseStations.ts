import { BaseStationData, LatLng } from "@/data/types";
import { errorLogger } from "@/util/errorLogger";
import { useCallback, useEffect, useState } from "react";
import { useMutation } from "react-query";
import { getBaseStationListFn } from "../features/dashboard/baseStationService";
import { distanceBetweenLatLng } from "@/util/geoUtils";
import { useRobotStore } from "@/stores/robotStore";

const useBaseStations = () => {
    const [baseStations, setBaseStations] = useState<BaseStationData[]>([]);
    const findNearestBaseStation = (
        latLng: LatLng,
        baseStations: BaseStationData[]
    ) => {
        console.log(baseStations);
        const nearestBaseStation = baseStations.reduce<{
            distance: number;
            baseStation?: BaseStationData;
        }>(
            (nearest, currentBaseStation) => {
                const distance = distanceBetweenLatLng(
                    currentBaseStation.location,
                    latLng
                );

                return distance < nearest.distance
                    ? {
                          distance: distance,
                          baseStation: currentBaseStation
                      }
                    : nearest;
            },
            {
                distance: Number.MAX_SAFE_INTEGER,
                baseStation: undefined
            }
        );
        return nearestBaseStation;
    };

    useEffect(() => {
        fetchBaseStationList();
    }, []);

    const {
        mutate: fetchBaseStationList,
        isLoading,
        isError,
        isSuccess,
        data
    } = useMutation(() => getBaseStationListFn(), {
        onSuccess: (data) => {
            setBaseStations(data);
        },
        onError: (error: any) => errorLogger(error)
    });

    return { baseStations, setBaseStations, isLoading, findNearestBaseStation };
};

export default useBaseStations;
