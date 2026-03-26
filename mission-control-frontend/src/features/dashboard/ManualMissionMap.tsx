import { RasterMapOptions } from "@/constants/map";
import { AdvancedMarker, Map, Pin, useMap } from "@vis.gl/react-google-maps";
import { useEffect } from "react";

type Props = {
    lat?: number;
    lng?: number;
};

export const ManualMissionMap = ({ lat, lng }: Props) => {
    const map = useMap("manualMissionMap");

    if (!lat || !lng) {
        return (
            <div className="flex h-full w-full items-center justify-center rounded-md bg-backgroundGray/30 p-4">
                <p>No location data</p>
            </div>
        );
    }

    useEffect(() => {
        if (!map) return;
        map.setCenter({
            lat,
            lng
        });
    }, []);

    return (
        <Map
            id="manualMissionMap"
            defaultCenter={{
                lat,
                lng
            }}
            style={{ borderRadius: "6px" }}
            mapId={RasterMapOptions.mapId}
            disableDefaultUI
            defaultZoom={15}
        >
            <AdvancedMarker
                position={{
                    lat,
                    lng
                }}
            >
                <Pin
                    background={"#FF0000"}
                    glyphColor={"#FFFFFF"}
                    borderColor={"#FF0000"}
                />
            </AdvancedMarker>
        </Map>
    );
};
