import { useMissionsStore } from "../../../stores/missionsStore";
import StationPoint from "./StationPoint";

const Stations = () => {
    const stations = useMissionsStore((state) => state.pathMap?.stations);

    return (
        <>
            {stations &&
                stations.length > 0 &&
                stations.map((station) => {
                    return <StationPoint station={station} key={station.id} />;
                })}
        </>
    );
};
export default Stations;
