import { memo } from "react";
import { useMissionsStore } from "../../../stores/missionsStore";
import { MdMap, MdRadar } from "react-icons/md";

const MapTypeToggle = memo(() => {
    const [mapType, setMapType] = useMissionsStore((state) => [
        state.mapType,
        state.setMapType
    ]);

    // Toggle between map types
    const handleToggle = () => {
        setMapType(mapType === "google" ? "lidar" : "google");
    };

    // Show the opposite map type in the button
    const isShowingGoogle = mapType === "google";
    const buttonText = isShowingGoogle ? "Lidar Map" : "Google Map";
    const Icon = isShowingGoogle ? MdRadar : MdMap;

    return (
        <div className="absolute right-2 top-2 z-10 sm:right-4 sm:top-4">
            <button
                onClick={handleToggle}
                className="flex items-center gap-1 rounded-lg bg-gray-900/70 backdrop-blur-xl border border-white/10 px-2 py-2 font-medium text-white shadow-lg shadow-black/20 transition-all duration-200 hover:border-white/20 sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2.5"
                title={`Switch to ${buttonText}`}
            >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-xs sm:text-sm">{buttonText}</span>
            </button>
        </div>
    );
});

MapTypeToggle.displayName = "MapTypeToggle";

export default MapTypeToggle;
