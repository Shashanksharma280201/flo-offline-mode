import { Fragment, memo, useEffect } from "react";
import { RasterMapOptions } from "@/constants/map";
import { BaseStationData } from "@/data/types";
import { MdCellTower } from "react-icons/md";
import {
    APIProvider,
    Map,
    AdvancedMarker,
    Pin,
    useMap
} from "@vis.gl/react-google-maps";
import { Circle } from "@/components/map/Circle";

type BaseStationsMapProps = {
    baseStations: BaseStationData[];
    setSelectedBaseStation: (selectedBaseStation?: string) => void;
    selectedBaseStation?: string;
};
const BaseStationsMap = ({
    baseStations,
    selectedBaseStation,
    setSelectedBaseStation
}: BaseStationsMapProps) => {
    const map = useMap("baseStationMap");
    useEffect(() => {
        // Calculate the bounds that include all path coordinates
        if (!map) return;
        const bounds = new google.maps.LatLngBounds();
        baseStations.forEach((baseStation) => {
            bounds.extend(
                new google.maps.LatLng(
                    baseStation.location.lat,
                    baseStation.location.lng
                )
            );
        });
        // Fit the map to the calculated bounds
        map.fitBounds(bounds);
    }, [baseStations, map]);

    return (
        <Map
            id="baseStationMap"
            className="h-full min-h-[40vh]"
            // style={{ height: "40vh" }}
            {...RasterMapOptions}
        >
            {baseStations.length &&
                baseStations.map((baseStation) => {
                    return (
                        <Fragment key={baseStation.mac}>
                            <AdvancedMarker
                                zIndex={
                                    selectedBaseStation === baseStation.mac
                                        ? 10
                                        : 1
                                }
                                onClick={() => {
                                    setSelectedBaseStation(baseStation.mac);
                                }}
                                position={baseStation.location}
                                title={baseStation.mac}
                            >
                                <Pin
                                    background={
                                        selectedBaseStation === baseStation.mac
                                            ? "#ffffff"
                                            : baseStation.online
                                              ? "#22c55e"
                                              : "#ef4444"
                                    }
                                    borderColor={
                                        selectedBaseStation === baseStation.mac
                                            ? "#ffffff"
                                            : baseStation.online
                                              ? "#22c55e"
                                              : "#ef4444"
                                    }
                                    scale={1}
                                >
                                    <MdCellTower className="h-5 w-5 text-black" />
                                </Pin>
                            </AdvancedMarker>
                            <Circle
                                zIndex={
                                    selectedBaseStation === baseStation.mac
                                        ? 10
                                        : 1
                                }
                                radius={15000}
                                center={baseStation.location}
                                strokeColor={
                                    selectedBaseStation === baseStation.mac
                                        ? "#ffffff"
                                        : baseStation.online
                                          ? "#22c55e"
                                          : "#ef4444"
                                }
                                strokeOpacity={1}
                                strokeWeight={3}
                                fillColor={
                                    selectedBaseStation === baseStation.mac
                                        ? "#ffffff"
                                        : baseStation.online
                                          ? "#22c55e"
                                          : "#ef4444"
                                }
                                fillOpacity={0.2}
                            />
                        </Fragment>
                    );
                })}
        </Map>
    );
};
export default memo(BaseStationsMap);
