import { RasterMapOptions } from "@/constants/map";
import { AdvancedMarker, Map, useMap } from "@vis.gl/react-google-maps";
import { useEffect } from "react";

export const ClientMap = ({
    clientName,
    latitude,
    longitude
}: {
    clientName: string;
    latitude: number;
    longitude: number;
}) => {
    const map = useMap("clientMap");

    useEffect(() => {
        if (!map) return;
        map.setCenter({
            lat: latitude,
            lng: longitude
        });
    }, [latitude, longitude]);

    return (
        <Map
            id="clientMap"
            defaultCenter={{
                lat: latitude,
                lng: longitude
            }}
            style={{ borderRadius: "6px" }}
            mapId={RasterMapOptions.mapId}
            disableDefaultUI
            defaultZoom={15}
        >
            <AdvancedMarker
                zIndex={10}
                position={{
                    lat: latitude,
                    lng: longitude
                }}
                title={clientName}
            />
        </Map>
    );
};
