import Popup from "@/components/popup/Popup";
import SmIconButton from "@/components/ui/SmIconButton";
import useBaseStations from "@/hooks/useBaseStations";
import { useRosFns } from "@/lib/ros/useRosFns";
import { useMissionsStore } from "@/stores/missionsStore";
import { useRobotStore } from "@/stores/robotStore";
import { useSocketStore } from "@/stores/socketStore";
import { useEffect, useState } from "react";
import { FaMapMarkedAlt } from "react-icons/fa";
import { MdSquare } from "react-icons/md";
import { toast } from "react-toastify";
import { useShallow } from "zustand/react/shallow";
import BaseStationsMap from "../../BaseStationsMap";
import { useBoundaryStore } from "@/stores/boundaryStore";

type PathMapPanelHeaderProps = {
    mode: "gps" | "lidar" | "odom";
};

const PathMapPanelHeader = ({ mode }: PathMapPanelHeaderProps) => {
    const [
        pathMap,
        isLocalized,
        isNonRTKMode,
        isPathMapping,
        setIsPathMapMapping,
        setLatLngPath,
        setIsLocalized
    ] = useMissionsStore(
        useShallow((state) => [
            state.pathMap,
            state.isLocalized,
            state.isNonRTKMode,
            state.isPathMapping,
            state.setIsPathMapping,
            state.setLatLngPath,
            state.setIsLocalized
        ])
    );
    const { baseStations, setBaseStations, findNearestBaseStation } =
        useBaseStations();
    const clientSocket = useSocketStore((state) => state.clientSocket);

    const [
        isRobotConnected,
        robotBaseStationId,
        robotLatLng,
        robotId,
        setBaseStationId
    ] = useRobotStore((state) => [
        state.isRobotConnected,
        state.robot?.gps?.baseStationId,
        state.robot?.gps,
        state.robot?.id,
        state.setBaseStationId
    ]);

    const [gpsQuality, setGpsQuality] = useState<string | undefined>();
    const [ndtScore, setNdtScore] = useState<number | null>(null);
    const [baseStationMapToggle, setBaseStationMapToggle] = useState(false);
    const [selectedBaseStation, setSelectedBaseStation] =
        useState(robotBaseStationId);

    const { rosSubscribe, rosServiceCaller } = useRosFns();

    const isBaseStationOnline =
        baseStations.find(
            (baseStation) => baseStation.mac === robotBaseStationId
        )?.online || false;

    const closeBaseStationMapHandler = () => {
        setBaseStationMapToggle(false);
        setSelectedBaseStation(robotBaseStationId);
    };

    const updateRobotBaseStation = (data: {
        robotId: string;
        prevBaseStationId: string;
        baseStationId: string;
    }) => {
        clientSocket?.emit(
            "robot:base-station",
            data,
            (response: { result: boolean; message: string; data: string }) => {
                setBaseStationId(response.data);
                setSelectedBaseStation(response.data);
            }
        );
    };

    useEffect(() => {
        const localizationSubscriber = rosSubscribe(
            "/localization_status",
            "std_msgs/msg/Bool",
            {
                queue_length: 0,
                queue_size: 1
            }
        );
        const gpsQualitySubscriber = rosSubscribe(
            "/nmea/gga",
            "flo_msgs/msg/NmeaGGA",
            {
                queue_length: 0,
                queue_size: 1
            }
        );
        localizationSubscriber?.subscribe((message) => {
            const localizationMessage = message as {
                data: boolean;
            };
            setIsLocalized(localizationMessage.data);
        });

        gpsQualitySubscriber?.subscribe((message) => {
            const gpsQualityMessage = message as {
                quality: number;
            };
            switch (gpsQualityMessage.quality) {
                case 0:
                    setGpsQuality("No Fix");
                    break;
                case 1:
                    setGpsQuality("GPS Fix");
                    break;
                case 2:
                    setGpsQuality("DGNSS");
                    break;
                case 4:
                    setGpsQuality("RTK Fixed");
                    break;
                case 5:
                    setGpsQuality("RTK Float");
                    break;
                case 6:
                    setGpsQuality("No messages received");
                    break;
                default:
                    setGpsQuality(`Unknown (${gpsQualityMessage.quality})`);
            }
        });
        return () => {
            localizationSubscriber?.unsubscribe();
            gpsQualitySubscriber?.unsubscribe();
        };
    }, [isRobotConnected]);

    useEffect(() => {
        if (!robotBaseStationId && robotLatLng && robotId) {
            const nearestBaseStation = findNearestBaseStation(
                {
                    lat: robotLatLng.latitude,
                    lng: robotLatLng.longitude
                },
                baseStations
            );

            if (nearestBaseStation.baseStation) {
                updateRobotBaseStation({
                    robotId,
                    prevBaseStationId: robotLatLng.baseStationId,
                    baseStationId: nearestBaseStation.baseStation.mac
                });
            }
        }
    }, [robotBaseStationId, robotLatLng, baseStations, robotId]);

    useEffect(() => {
        clientSocket?.on("station:online", (baseStationId) => {
            setBaseStations((baseStations) => {
                baseStations.forEach((baseStation) => {
                    if (baseStation.mac === baseStationId) {
                        baseStation.online = true;
                    }
                    return baseStation;
                });

                return [...baseStations];
            });
        });
        clientSocket?.on("station:offline", (baseStationId) => {
            setBaseStations((baseStations) => {
                baseStations.forEach((baseStation) => {
                    if (baseStation.mac === baseStationId) {
                        baseStation.online = false;
                    }
                    return baseStation;
                });

                return [...baseStations];
            });
        });

        return () => {
            clientSocket?.off("station:online");
            clientSocket?.off("station:offline");
        };
    }, [clientSocket]);

    useEffect(() => {
        if (isNonRTKMode) {
            return;
        }
        if (!isLocalized && isPathMapping) {
            rosServiceCaller(
                "/stop_recording_path",
                " flo_msgs/srv/StopRecordingPath",
                (result: { message: string; success: boolean }) => {
                    if (!result.success) {
                        setIsPathMapMapping(false);
                        toast.error(result.message);
                        setLatLngPath([]);
                    }
                },
                (error) => {
                    console.log(error);
                    setIsPathMapMapping(false);
                    setLatLngPath([]);
                },
                {}
            );
        }
    }, [isLocalized, isPathMapping, isNonRTKMode]);

    useEffect(() => {
        if (!isRobotConnected) {
            setNdtScore(null);
            return;
        }

        const ndtScoreSubscriber = rosSubscribe(
            "/ndt_score",
            "std_msgs/msg/Float64",
            {
                queue_length: 0,
                queue_size: 1
            }
        );

        ndtScoreSubscriber?.subscribe((message) => {
            const scoreMessage = message as { data: number };
            setNdtScore(scoreMessage.data);
        });

        return () => {
            ndtScoreSubscriber?.unsubscribe();
            setNdtScore(null);
        };
    }, [isRobotConnected]);

    return (
        <>
            <div className="flex flex-col gap-y-4 border-y border-white/10 px-4 py-6 text-gray-300">
                <div className="flex items-center gap-x-2 text-sm">
                    <span className="font-medium text-white">{`Selected Path Map:`}</span>
                    {pathMap ? (
                        <div className="font-semibold text-white">{pathMap.name}</div>
                    ) : (
                        <div className="text-gray-400">No data</div>
                    )}
                </div>
                <div className="flex items-center gap-x-2 text-sm">
                    <span className="font-medium text-white">{`PathMap Status:`}</span>
                    {pathMap &&
                    pathMap.stations &&
                    pathMap.stations.length > 0 ? (
                        <span className="font-semibold text-green-400">Present</span>
                    ) : (
                        <span className="font-semibold text-red-400">Absent</span>
                    )}
                </div>
                <div className="flex items-center gap-x-2 text-sm">
                    <span className="font-medium text-white">{`Localization Status:`}</span>
                    {isLocalized ? (
                        <span className="font-semibold text-green-400">Localized</span>
                    ) : (
                        <span className="font-semibold text-red-400">Not Localized</span>
                    )}
                </div>

                {/* NDT Score - Only show in LIDAR mode */}
                {mode === "lidar" && (
                    <div className="flex items-center gap-x-2 text-sm">
                        <span className="font-medium text-white">NDT Score:</span>
                        {ndtScore !== null ? (
                            <div className="flex items-center gap-x-2">
                                <span
                                    className={`font-mono font-semibold ${
                                        ndtScore > 0.8
                                            ? "text-green-400"
                                            : ndtScore > 0.5
                                              ? "text-yellow-400"
                                              : "text-red-400"
                                    }`}
                                >
                                    {ndtScore.toFixed(2)}
                                </span>
                                <span
                                    className={`h-2 w-2 rounded-full ${
                                        ndtScore > 0.8
                                            ? "bg-green-400"
                                            : ndtScore > 0.5
                                              ? "bg-yellow-400"
                                              : "bg-red-400"
                                    }`}
                                />
                            </div>
                        ) : (
                            <span className="text-gray-400">No data</span>
                        )}
                    </div>
                )}

                {/* Base Station - Show in GPS and LIDAR modes only */}
                {(mode === "gps" || mode === "lidar") && (
                    <div className="flex items-center gap-x-2 text-sm">
                        <span className="font-medium text-white">{`Base Station:`}</span>
                        {robotBaseStationId ? (
                            <>
                                <span
                                    className={`font-semibold ${isBaseStationOnline ? "text-green-400" : "text-red-400"}`}
                                >
                                    {robotBaseStationId}
                                </span>
                                <FaMapMarkedAlt
                                    onClick={() => {
                                        setBaseStationMapToggle(true);
                                    }}
                                    className="h-4 w-4 cursor-pointer text-blue-400 hover:text-blue-300 active:text-blue-500"
                                />
                            </>
                        ) : (
                            <span className="font-semibold text-yellow-400">
                                Assigning nearest base station...
                            </span>
                        )}
                    </div>
                )}

                {/* GNSS Quality - Show in GPS and LIDAR modes only */}
                {(mode === "gps" || mode === "lidar") && (
                    <div className="flex items-center gap-x-2 text-sm">
                        <span className="font-medium text-white">{`Gnss Quality:`}</span>
                        {gpsQuality ? (
                            <span className="font-semibold text-white">{gpsQuality}</span>
                        ) : (
                            <span className="text-gray-400">No GNSS data</span>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-x-2 text-sm">
                    <span className="font-medium text-white">{`Frame:`}</span>
                    {pathMap?.frame ? (
                        <span className="font-semibold text-white">{pathMap?.frame}</span>
                    ) : (
                        <span className="text-gray-400">No frame reference</span>
                    )}
                </div>
                <BoundaryConfig />
            </div>
            <Popup
                title="Base Stations"
                description="Map view of robot base stations. Click on the marker to update robot's base station."
                dialogToggle={baseStationMapToggle}
                onClose={closeBaseStationMapHandler}
                panelClassName="absolute rounded-none md:rounded-2xl top-0 left-0 md:static h-full w-full md:w-[48vw]"
            >
                <BaseStationsMap
                    baseStations={baseStations}
                    selectedBaseStation={selectedBaseStation}
                    setSelectedBaseStation={setSelectedBaseStation}
                />
                <div className="flex flex-col justify-between gap-2 ss:flex-row md:gap-4">
                    <div className="flex items-center justify-start gap-2  py-3">
                        <div className="flex items-center justify-center gap-2 text-white">
                            <MdSquare className="h-4 w-4 text-green-500" />
                            <span>Online</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-white">
                            <MdSquare className="h-4 w-4 text-red-500" />
                            <span>Offline</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-white">
                            <MdSquare className="h-4 w-4 text-white" />
                            <span>Selected</span>
                        </div>
                    </div>
                    {selectedBaseStation &&
                        selectedBaseStation !== robotBaseStationId && (
                            <div className="flex flex-col justify-end gap-2 ss:flex-row ss:items-center sm:justify-between md:gap-4">
                                <SmIconButton
                                    name="Cancel"
                                    className="border border-backgroundGray bg-transparent font-semibold text-white hover:bg-white/20"
                                    onClick={closeBaseStationMapHandler}
                                />
                                <SmIconButton
                                    name="Update Base station"
                                    className="border border-white bg-white font-semibold text-black"
                                    onClick={() => {
                                        if (!robotId) {
                                            return toast.error(
                                                "No robot selected"
                                            );
                                        }
                                        if (!robotBaseStationId) {
                                            return toast.error(
                                                "No base station set for robot"
                                            );
                                        }

                                        updateRobotBaseStation({
                                            robotId: robotId,
                                            prevBaseStationId:
                                                robotBaseStationId,
                                            baseStationId: selectedBaseStation
                                        });
                                        closeBaseStationMapHandler();
                                    }}
                                />
                            </div>
                        )}
                </div>
            </Popup>
        </>
    );
};

export default PathMapPanelHeader;

const BoundaryConfig = () => {
    const [boundaryConfig, setBoundaryConfig] = useBoundaryStore(
        useShallow((state) => [state.boundaryConfig, state.setBoundaryConfig])
    );

    return (
        <>
            <BoundaryConfigItem
                title={"Safety Margin"}
                value={boundaryConfig.safetyMargin}
                onChange={(value) =>
                    setBoundaryConfig({
                        ...boundaryConfig,
                        safetyMargin: value
                    })
                }
            />
            <BoundaryConfigItem
                title={"Step size"}
                value={boundaryConfig.stepSize}
                onChange={(value) =>
                    setBoundaryConfig({
                        ...boundaryConfig,
                        stepSize: value
                    })
                }
            />
            <BoundaryConfigItem
                title={"Wheel seperation"}
                value={boundaryConfig.wheelSeperation}
                onChange={(value) =>
                    setBoundaryConfig({
                        ...boundaryConfig,
                        wheelSeperation: value
                    })
                }
            />
        </>
    );
};

const BoundaryConfigItem = ({
    title,
    value,
    onChange
}: {
    title: string;
    value: number;
    onChange: (value: number) => void;
}) => {
    const [isEditing, setIsEditing] = useState(false);

    const handleChange = (value: string) => {
        if (isNaN(Number(value)) || value === "" || +value < 0) {
            onChange(0);
            return;
        }
        onChange(+value);
    };

    return (
        <div className="flex items-center gap-x-2 text-sm">
            <span className="font-medium text-white">{title}:</span>
            {isEditing ? (
                <input
                    className="rounded border border-white/20 bg-gray-800/80 px-2 py-1 font-semibold text-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    value={value}
                    type="number"
                    onBlur={() => setIsEditing(false)}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
                />
            ) : (
                <div
                    className="cursor-pointer font-semibold text-white hover:text-blue-400 transition-colors"
                    onClick={() => setIsEditing(true)}
                >
                    {value}
                </div>
            )}
        </div>
    );
};
