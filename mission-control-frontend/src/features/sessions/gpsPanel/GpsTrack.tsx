import { Suspense, useEffect, useState } from "react";
import { Gnss } from "../../../data/types";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { useRobotSessionsStore } from "@/stores/robotSessionsStore";
import { RasterMapOptions } from "@/constants/map";
import {
    AdvancedMarker,
    Map,
    Pin,
    useAdvancedMarkerRef,
    useMap
} from "@vis.gl/react-google-maps";
import { FaRobot } from "react-icons/fa";

type GpsTrackProps = {
    coordinates: Gnss[];
    isLoading?: boolean;
};

const updatedMapOptions = { ...RasterMapOptions };
updatedMapOptions.disableDefaultUI = false;

const GpsTrack = ({ coordinates, isLoading }: GpsTrackProps) => {
    const [path, setPath] = useState<any>(null);
    const map = useMap("gpsTrackMap");

    const [markerRef, marker] = useAdvancedMarkerRef();
    const videoRef = useRobotSessionsStore((state) => state.videoRef);

    useEffect(() => {
        if (!map) return;

        if (path) {
            path.setMap(null);
        }
        if (coordinates && coordinates.length > 0) {
            // Filter out GPS outliers before plotting
            // Only keep points that are NOT outliers (correctionType is 'none' or undefined)
            const validCoordinates = coordinates.filter((coord) => {
                return (
                    !coord.isOutlier || coord.correctionType === "interpolated"
                );
            });

            if (validCoordinates.length === 0) {
                console.warn("All GPS coordinates were filtered as outliers");
                return;
            }

            const myLatlng = new google.maps.LatLng(
                validCoordinates[validCoordinates.length - 1].latitude,
                validCoordinates[validCoordinates.length - 1].longitude
            );

            const transformedCoordinates: { lat: number; lng: number }[] =
                validCoordinates.map((value) => {
                    return {
                        lat: value.latitude,
                        lng: value.longitude
                    };
                });

            const robotPath = new google.maps.Polyline({
                path: transformedCoordinates,
                geodesic: true,
                strokeColor: "#22d3ee",
                strokeOpacity: 1.0,
                map: map
            });

            setPath(robotPath);
            map.setCenter(myLatlng);
            robotPath.setMap(map);

            // Calculate the bounds that include all path coordinates
            const bounds = new google.maps.LatLngBounds();
            transformedCoordinates.forEach((coord) =>
                bounds.extend(new google.maps.LatLng(coord.lat, coord.lng))
            );
            // Fit the map to the calculated bounds
            map.fitBounds(bounds);

            // Log filtering stats for debugging
            const rejectedCount = coordinates.filter(
                (c) => c.correctionType === "rejected"
            ).length;
            const geofenceViolations = coordinates.filter(
                (c) => c.correctionType === "geofence_violation"
            ).length;
            const interpolatedCount = coordinates.filter(
                (c) => c.correctionType === "interpolated"
            ).length;

            if (
                rejectedCount > 0 ||
                geofenceViolations > 0 ||
                interpolatedCount > 0
            ) {
                console.log(
                    `GPS filtering: ${validCoordinates.length}/${coordinates.length} points plotted (${rejectedCount} rejected, ${geofenceViolations} geofence violations, ${interpolatedCount} interpolated)`
                );
            }
        }
    }, [coordinates, map]);

    useEffect(() => {
        if (!marker) {
            return;
        }
        if (!coordinates.length) {
            return;
        }
        console.log("Running Interval");
        const intervalId = setInterval(() => {
            let currentTime = videoRef.current?.currentTime;
            if (currentTime) {
                if (Math.round(currentTime) > coordinates.length - 1) {
                    currentTime = coordinates.length - 1;
                }
                const myLatlng = new google.maps.LatLng(
                    coordinates[Math.round(currentTime)].latitude,
                    coordinates[Math.round(currentTime)].longitude
                );
                marker.position = myLatlng;
            }
        }, 1000);

        return () => {
            clearInterval(intervalId);
        };
    }, [coordinates, marker]);
    return (
        <Suspense fallback={<></>}>
            <div
                className={`relative h-full w-full ${
                    map ? "flex" : "hidden"
                } overflow-hidden rounded-md `}
            >
                {isLoading ? (
                    <div className="absolute left-0 top-0 z-[100] flex h-full w-full items-center justify-center rounded-md bg-backgroundGray text-2xl opacity-90">
                        <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-background" />
                    </div>
                ) : (
                    coordinates.length === 0 && (
                        <div className="absolute left-0 top-0 z-[100] flex h-full w-full items-center justify-center  rounded-md bg-backgroundGray opacity-95">
                            No GPS Data found
                        </div>
                    )
                )}

                <Map
                    id="gpsTrackMap"
                    style={{ minHeight: "25rem", height: "100%" }}
                    {...RasterMapOptions}
                >
                    {coordinates && coordinates.length && (
                        <AdvancedMarker
                            position={{
                                lat: coordinates[0].latitude,
                                lng: coordinates[0].longitude
                            }}
                            title="Robot Position"
                            ref={markerRef}
                        >
                            <Pin
                                background={"#ef4444"}
                                borderColor={"#ef4444"}
                                scale={1}
                            >
                                <FaRobot className="h-4 w-4 text-white" />
                            </Pin>
                        </AdvancedMarker>
                    )}
                </Map>
            </div>
            <div
                className={`min-h-full w-full items-center justify-center bg-backgroundGray text-xs ${
                    map ? "hidden" : "flex"
                }`}
            >
                Loading map...
            </div>
        </Suspense>
    );
};
export default GpsTrack;
