import { useEffect, useState } from "react";
import { useMissionsStore } from "../../../stores/missionsStore";
import PathBetweenStations from "./PathBetweenStations";
import { Path } from "../../../data/types";
import MissionPath from "./MissionPath";
import LatLngPath from "./LatLngPath";

const Paths = () => {
    const [
        latlngPath,
        paths,
        selectedStation,
        isMissionPlanning,
        isPathMapping,
        mission,
        stations,
        isEditingPaths
    ] = useMissionsStore((state) => [
        state.latLngPath,
        state.pathMap?.paths,
        state.selectedStation,
        state.isMissionPlanning,
        state.isPathMapping,
        state.mission,
        state.pathMap?.stations,
        state.isEditingPaths
    ]);
    const [stationPaths, setStationPaths] = useState<Path[]>();
    const [availablePaths, setAvailablePaths] = useState<Path[]>();
    useEffect(() => {
        const stationIds = stations ? stations.map((s) => s.id) : [];

        if (paths && stationIds.length > 0) {
            if (selectedStation) {
                const stationPaths = (paths?.[selectedStation.id] || []).filter(
                    (path) => stationIds.includes(path.destStationId)
                );
                setStationPaths(stationPaths);
            } else {
                setStationPaths([]);
            }
            const availablePaths = Object.values(paths)
                .flat()
                .filter((path) => stationIds.includes(path.destStationId));
            setAvailablePaths(availablePaths);
        } else {
            setStationPaths([]);
            setAvailablePaths([]);
        }
        return () => {
            setStationPaths([]);
            setAvailablePaths([]);
        };
    }, [paths, selectedStation, stations]);

    return (
        <>
            {/* Hide Three.js paths when editing to show Google Maps preview */}
            {!isEditingPaths && (
                <>
                    {isMissionPlanning ? (
                        stationPaths &&
                        stationPaths.length > 0 &&
                        stationPaths.map((path, index) => (
                            <PathBetweenStations key={index} path={path} />
                        ))
                    ) : (
                        <MissionPath />
                    )}
                    {!mission &&
                        availablePaths &&
                        availablePaths.length > 0 &&
                        stations &&
                        stations.length > 0 &&
                        availablePaths.map((path, index) => (
                            <PathBetweenStations key={index} path={path} />
                        ))}
                </>
            )}
            {/* ✅ FIX: Show latLngPath if it exists (not just when mapping)
                This allows recorded paths to stay visible until saved */}
            {latlngPath && latlngPath.length > 0 && (
                <LatLngPath path={latlngPath} />
            )}
        </>
    );
};
export default Paths;
