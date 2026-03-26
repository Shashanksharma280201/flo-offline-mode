import { RasterMapOptions } from "@/constants/map";
import { Map, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useState } from "react";
import { MdSquare } from "react-icons/md";

import MapMarkerWithTooltip from "./MapMarkerWithTooltip";

type Props = {
    checkIn?: {
        time: string;
        location: {
            lat: number;
            lng: number;
        };
    };
    checkOut?: {
        time: string;
        location: {
            lat: number;
            lng: number;
        };
    };
};

export const OperatorAttendanceMap = ({ checkIn, checkOut }: Props) => {
    if (!checkIn || !checkIn.location) {
        return (
            <div className="flex h-full w-full items-center justify-center p-4">
                <p>No location data</p>
            </div>
        );
    }
    const map = useMap("operatorAttendance");

    useEffect(() => {
        if (!map) return;
        map.setCenter({
            lat: checkIn.location.lat,
            lng: checkIn.location.lng
        });
    }, []);

    const panToLocation = ({ lat, lng }: { lat: number; lng: number }) => {
        if (!map) return;
        map.panTo({
            lat,
            lng
        });
    };

    return (
        <>
            <Map
                id="operatorAttendance"
                defaultCenter={{
                    lat: checkIn.location.lat,
                    lng: checkIn.location.lng
                }}
                style={{ borderRadius: "6px" }}
                mapId={RasterMapOptions.mapId}
                disableDefaultUI
                defaultZoom={15}
            >
                <MapMarkerWithTooltip
                    title="Check In"
                    tooltipText="Checked in at"
                    attendanceLocationWithTime={checkIn}
                    markerColor="#22c55e"
                />
                {checkOut && checkOut.location && (
                    <MapMarkerWithTooltip
                        title="Check Out"
                        tooltipText="Checked out at"
                        attendanceLocationWithTime={checkOut}
                        markerColor="#EF4444"
                    />
                )}
            </Map>
            <div className="flex h-[10%] gap-8 bg-black p-2">
                <div
                    onClick={() => panToLocation(checkIn.location)}
                    className="flex cursor-pointer items-center justify-center gap-2"
                >
                    <MdSquare className="h-4 w-4 text-green-400" />
                    <p>Check in</p>
                </div>
                {checkOut && checkOut.location && (
                    <div
                        onClick={() => panToLocation(checkOut.location)}
                        className="flex cursor-pointer items-center justify-center gap-2"
                    >
                        <MdSquare className="h-4 w-4 text-red-400" />
                        <p>Check out</p>
                    </div>
                )}
            </div>
        </>
    );
};
