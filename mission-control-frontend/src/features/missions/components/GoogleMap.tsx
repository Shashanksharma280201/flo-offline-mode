import {
    useEffect,
    useRef,
    useState,
    MouseEvent,
    memo,
    useCallback
} from "react";
import { ThreeJSOverlayView } from "@googlemaps/three";
import { useR3fStore } from "../../../stores/r3fStore";
import { useMissionsStore } from "../../../stores/missionsStore";
import { VectorMapOptions } from "../../../constants/map";
import { Vector2 } from "three";
import { distanceBetweenLatLng } from "@/util/geoUtils";
import { LatLng } from "@/data/types";
import { FaRobot } from "react-icons/fa";
import { MdMap } from "react-icons/md";
import { toast } from "react-toastify";
import { useShallow } from "zustand/react/shallow";
import { useRosFns } from "@/lib/ros/useRosFns";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import EditablePathPoints from "./EditablePathPoints";

const GoogleMap = ({ searchEnabled }: { searchEnabled?: boolean }) => {
    const mapRef = useRef<HTMLDivElement>(null!);
    const [map, setMap] = useState<google.maps.Map>();
    const { rosServiceCaller } = useRosFns();

    // Use the hook to wait for Google Maps API to load
    const mapsLibrary = useMapsLibrary("maps");

    const [isFetchingLatLng, setIsFetchingLatLng] = useR3fStore(
        useShallow((state) => [
            state.isFetchingLatLng,
            state.setIsFetchingLatLng
        ])
    );
    const [isMapCentered, setIsMapCentered] = useState(false);
    const anchor = useRef<LatLng>(VectorMapOptions.center);

    const [setOverlay, setClickPosition, setMousePosition] = useR3fStore(
        useShallow((state) => [
            state.setOverlay,
            state.setClickPosition,
            state.setMousePosition
        ])
    );

    const latLng = useMissionsStore((state) => state.latLng);

    const mapClickHandler = (event: MouseEvent) => {
        const { clientX, clientY } = event;
        const { left, top, width, height } =
            event.currentTarget.getBoundingClientRect();

        const x = clientX - left;
        const y = clientY - top;

        const xValue = 2 * (x / width) - 1;
        const yValue = 1 - 2 * (y / height);

        setClickPosition(new Vector2(xValue, yValue));
    };

    const mouseMoveHandler = (event: MouseEvent) => {
        const { clientX, clientY } = event;
        const { left, top, width, height } =
            event.currentTarget.getBoundingClientRect();

        const x = clientX - left;
        const y = clientY - top;

        const xValue = 2 * (x / width) - 1;
        const yValue = 1 - 2 * (y / height);

        setMousePosition(new Vector2(xValue, yValue));
    };

    useEffect(() => {
        // Wait for both the maps library to load and the DOM ref to be ready
        if (!mapsLibrary || !mapRef.current) {
            return;
        }

        try {
            const instance = new window.google.maps.Map(
                mapRef.current,
                VectorMapOptions
            );
            const overlay = new ThreeJSOverlayView({
                map: instance,
                anchor: VectorMapOptions.center,
                animationMode: "always"
            });
            setOverlay(overlay);
            setMap(instance);
        } catch (error) {
            console.error("Error initializing Google Map:", error);
        }

        return () => {
            setMap(undefined);
            setOverlay(undefined);
        };
    }, [mapsLibrary, setOverlay]);

    useEffect(() => {
        if (map && isFetchingLatLng) {
            const listener = map.addListener(
                "click",
                (e: google.maps.MapMouseEvent) => {
                    if (e.latLng) {
                        const lat = e.latLng.lat();
                        const lng = e.latLng.lng();
                        setIsFetchingLatLng(false);

                        rosServiceCaller(
                            "/mmr/experimental/reset_position",
                            "mmr/srv/ResetPosition",
                            (result: { message: string; success: boolean }) => {
                                if (result.success) {
                                    toast.success(result.success);
                                }
                            },
                            (error) => {
                                console.log(error);
                                toast.error(error.message);
                            },
                            { frame_id: "odom", lat, lng, yaw: -5.0 }
                        );
                    }
                }
            );

            return () => {
                google.maps.event.removeListener(listener);
            };
        }
    }, [map, isFetchingLatLng]);

    useEffect(() => {
        if (map && latLng && !isMapCentered) {
            if (map.getZoom() !== 21) {
                map.setCenter(latLng);
                map.moveCamera({
                    zoom: 21
                });
                setIsMapCentered(true);
            }
        }
    }, [latLng]);

    useEffect(() => {
        if (map && latLng) {
            if (distanceBetweenLatLng(latLng, anchor.current) > 50000) {
                const overlay = useR3fStore.getState().overlay;
                if (overlay) {
                    overlay.setAnchor(latLng);
                    anchor.current = latLng;
                }
            }
        }
    }, [latLng, map]);

    const panToRobotHandler = useCallback(
        (robotCoordinates: LatLng) => {
            if (map) {
                map.setCenter(robotCoordinates);
                map.moveCamera({
                    zoom: 21
                });
                setIsMapCentered(true);
            }
        },
        [map]
    );

    const selectLocationHandler = useCallback(
        (locationCoordinates: LatLng) => {
            if (map) {
                map.setCenter(locationCoordinates);
                map.moveCamera({
                    zoom: 21
                });
                setIsMapCentered(true);
            }
        },
        [map]
    );

    const panToPathmapHandler = useCallback(
        (pathMapCoordinates: LatLng) => {
            if (map) {
                map.setCenter(pathMapCoordinates);
                map.moveCamera({
                    zoom: 20
                });
                setIsMapCentered(true);
            }
        },
        [map]
    );

    return (
        <>
            <div
                onClick={mapClickHandler}
                onMouseMove={mouseMoveHandler}
                ref={mapRef}
                id="map"
                className="h-full min-h-[20vh]"
            />
            <EditablePathPoints map={map ?? null} />
            {searchEnabled && map ? (
                <AutocompleteSearch onLocationSelect={selectLocationHandler} />
            ) : null}
            <PanToItemButtons
                onRobotClick={panToRobotHandler}
                onPathmapClick={panToPathmapHandler}
            />
        </>
    );
};
export default memo(GoogleMap);

const AutocompleteSearch = ({
    onLocationSelect
}: {
    onLocationSelect: ({ lat, lng }: { lat: number; lng: number }) => void;
}) => {
    const placesLib = useMapsLibrary("places");
    const [searchQuery, setSearchQuery] = useState("");
    const [predictions, setPredictions] = useState<
        google.maps.places.AutocompletePrediction[]
    >([]);
    const autocompleteServiceRef =
        useRef<google.maps.places.AutocompleteService | null>(null);
    const placesServiceRef = useRef<google.maps.places.PlacesService | null>(
        null
    );

    // A dummy div is needed for PlacesService (needs an HTMLElement)
    const dummyMapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!placesLib || !window.google || !dummyMapRef.current) return;

        if (!autocompleteServiceRef.current) {
            autocompleteServiceRef.current =
                new window.google.maps.places.AutocompleteService();
        }

        if (!placesServiceRef.current) {
            placesServiceRef.current =
                new window.google.maps.places.PlacesService(
                    dummyMapRef.current
                );
        }

        if (searchQuery === "") {
            setPredictions([]);
            return;
        }

        const delayDebounce = setTimeout(() => {
            autocompleteServiceRef.current!.getPlacePredictions(
                { input: searchQuery },
                (preds) => {
                    setPredictions(preds || []);
                }
            );
        }, 700);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery, placesLib]);

    const handlePlaceClick = (placeId: string) => {
        if (!placesServiceRef.current) return;

        placesServiceRef.current.getDetails({ placeId }, (place, status) => {
            if (
                status === google.maps.places.PlacesServiceStatus.OK &&
                place?.geometry?.location
            ) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                onLocationSelect({ lat, lng });
                setSearchQuery("");
            } else {
                console.warn("Failed to fetch place details:", status);
            }
        });
    };

    return (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 transform rounded p-2 shadow-md">
            {predictions.length > 0 && (
                <ul className="mb-2 max-h-48 overflow-y-auto bg-white text-sm text-black">
                    {predictions.map((pred) => (
                        <li
                            key={pred.place_id}
                            className="cursor-pointer px-2 py-1 hover:bg-gray-100"
                            onClick={() => handlePlaceClick(pred.place_id)}
                        >
                            {pred.description}
                        </li>
                    ))}
                </ul>
            )}
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search places..."
                className="h-8 w-72 rounded border border-gray-300 bg-white px-2 text-black"
            />

            <div ref={dummyMapRef} className="hidden" />
        </div>
    );
};

const PanToItemButtons = memo(
    ({
        onRobotClick,
        onPathmapClick
    }: {
        onRobotClick: (robotCoordinates: LatLng) => void;
        onPathmapClick: (pathMapCoordinates: LatLng) => void;
    }) => {
        const [stations, latLng] = useMissionsStore(
            useShallow((state) => [state.pathMap?.stations, state.latLng])
        );

        const handleRobotClick = () => {
            if (latLng) {
                onRobotClick(latLng);
            } else {
                onRobotClick({
                    lat: VectorMapOptions.center.lat,
                    lng: VectorMapOptions.center.lng
                });
            }
        };

        const handlePathMapClick = () => {
            if (stations) {
                const pathMapCoordinates = stations[0];
                onPathmapClick(pathMapCoordinates);
            } else {
                toast.error("No pathmap selected");
            }
        };

        return (
            <div className="absolute bottom-5 right-5 flex flex-col gap-4 md:bottom-10 md:right-10">
                <button
                    onClick={handleRobotClick}
                    title="Pan to robot"
                    className="rounded-lg bg-black p-2 text-white shadow-lg transition-all duration-200 hover:bg-gray-800"
                >
                    <div className="rounded-lg border-2 border-white p-1">
                        <FaRobot />
                    </div>
                </button>
                {stations ? (
                    <button
                        onClick={handlePathMapClick}
                        title="Pan to pathmap"
                        className="rounded-lg bg-black p-2 text-white shadow-lg transition-all duration-200 hover:bg-gray-800"
                    >
                        <div className="rounded-lg border-2 border-white p-1">
                            <MdMap />
                        </div>
                    </button>
                ) : null}
            </div>
        );
    }
);
