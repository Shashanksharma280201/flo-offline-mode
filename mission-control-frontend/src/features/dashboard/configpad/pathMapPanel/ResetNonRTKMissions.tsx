import SmIconButton from "@/components/ui/SmIconButton";
import { useMissionsStore } from "@/stores/missionsStore";
import { useR3fStore } from "@/stores/r3fStore";
import { MdMap, MdRestore } from "react-icons/md";
import { toast } from "react-toastify";
import { useShallow } from "zustand/react/shallow";

export const ResetNonRTKMissionButton = () => {
    const [isFetchingLatLng, setIsFetchingLatLng] = useR3fStore(
        useShallow((state) => [
            state.isFetchingLatLng,
            state.setIsFetchingLatLng
        ])
    );

    const [pathMap, isSelectingStationForReset, setIsSelectingStationForReset] =
        useMissionsStore(
            useShallow((state) => [
                state.pathMap,
                state.isSelectingStationForReset,
                state.setIsSelectingStationForReset
            ])
        );

    const fetchPointOnMapHandler = () => {
        setIsFetchingLatLng(true);
    };

    const resetBotPositionToStationHandler = () => {
        if (!pathMap) {
            toast.error("No pathmap selected");
            return;
        }
        if (!pathMap.frame) {
            toast.error("PathMap has no frame associated with it");
            return;
        }
        setIsSelectingStationForReset(true);
    };

    return (
        <>
            <div className="flex items-center justify-between">
                <span>Reset to station</span>
                {isSelectingStationForReset ? (
                    <p>Select station to reset bot to</p>
                ) : (
                    <SmIconButton
                        name={"Reset"}
                        className={"bg-primary700"}
                        onClick={resetBotPositionToStationHandler}
                    >
                        <MdRestore className="h-4 w-4 text-white" />
                    </SmIconButton>
                )}
            </div>
            <div className="flex items-center justify-between">
                <span>Fetch point on map</span>
                {isFetchingLatLng ? (
                    <p>Click anywhere on the map</p>
                ) : (
                    <SmIconButton
                        name={"Fetch"}
                        className={"bg-primary700"}
                        onClick={fetchPointOnMapHandler}
                    >
                        <MdMap className="h-4 w-4 text-white" />
                    </SmIconButton>
                )}
            </div>
        </>
    );
};
