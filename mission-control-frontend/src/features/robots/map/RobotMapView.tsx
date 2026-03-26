import { useEffect } from "react";
import { useUserStore } from "../../../stores/userStore";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { RasterMapOptions } from "@/constants/map";
import { AdvancedMarker, Map, Pin, useMap } from "@vis.gl/react-google-maps";
import { FaRobot } from "react-icons/fa";
import { useRobotStore } from "@/stores/robotStore";
dayjs.extend(relativeTime);

/**
 * Google map view depicting location of robots that updated their GPS
 */
const RobotMapView = () => {
    const [robots] = useUserStore((state) => [state.robots]);
    const [selectedRobot] = useRobotStore((state) => [state.robot]);

    const map = useMap("robotsViewMap");

    useEffect(() => {
        // Calculate the bounds that include all path coordinates
        if (!map) return;
        const bounds = new google.maps.LatLngBounds();
        robots.forEach((robot) => {
            if (robot.gps) {
                bounds.extend(
                    new google.maps.LatLng(
                        robot.gps.latitude,
                        robot.gps.longitude
                    )
                );
            }
        });
        // Fit the map to the calculated bounds
        map.fitBounds(bounds);
    }, [robots, map]);

    useEffect(() => {
        if (!map) return;
        if (selectedRobot && selectedRobot.gps) {
            map.setCenter({
                lat: selectedRobot.gps.latitude,
                lng: selectedRobot.gps.longitude
            });
        }
    }, [selectedRobot]);

    return (
        <div className="h-full w-full text-white">
            <div className={`h-full w-full ${map ? "flex" : "hidden"} `}>
                <Map
                    id="robotsViewMap"
                    style={{ height: "full" }}
                    {...RasterMapOptions}
                >
                    {robots.map((robot) => {
                        const robotStatus = robot.status ?? "Offline";
                        return (
                            robot.gps && (
                                <AdvancedMarker
                                    zIndex={
                                        selectedRobot?.id === robot.id
                                            ? 100
                                            : 10
                                    }
                                    key={robot.id}
                                    position={{
                                        lat: robot.gps?.latitude,
                                        lng: robot.gps?.longitude
                                    }}
                                    title={`Last updated ${robot.name} ${dayjs(
                                        robot.gps.updatedAt
                                    ).fromNow()}`}
                                >
                                    <Pin
                                        background={
                                            robotStatus === "Active"
                                                ? "#22c55e"
                                                : "#ef4444"
                                        }
                                        borderColor={
                                            robotStatus === "Active"
                                                ? "#22c55e"
                                                : "#ef4444"
                                        }
                                        scale={1}
                                    >
                                        <FaRobot
                                            className={`h-4 w-4 text-black`}
                                        />
                                    </Pin>
                                </AdvancedMarker>
                            )
                        );
                    })}
                </Map>
            </div>
            <div
                className={`h-full w-full items-center justify-center bg-backgroundGray text-sm md:text-xl ${
                    map ? "hidden" : "flex"
                }`}
            >
                Loading map...
            </div>
        </div>
    );
};

export default RobotMapView;
