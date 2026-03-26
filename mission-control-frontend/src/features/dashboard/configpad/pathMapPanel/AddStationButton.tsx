import SmIconButton from "@/components/ui/SmIconButton";
import { Station } from "@/data/types";
import { useRosFns } from "@/lib/ros/useRosFns";
import { useMissionsStore } from "@/stores/missionsStore";
import { distanceBetweenLatLng } from "@/util/geoUtils";
import { MdAdd } from "react-icons/md";
import { toast } from "react-toastify";
import { useShallow } from "zustand/react/shallow";

const AddStationButton = () => {
    const [isLocalized, isNonRTKMode, pathMap, addStationToPathMap] =
        useMissionsStore(
            useShallow((state) => [
                state.isLocalized,
                state.isNonRTKMode,
                state.pathMap,
                state.addStationToPathMap
            ])
        );
    const latLng = useMissionsStore((state) => state.latLng);

    const { rosServiceCaller } = useRosFns();

    const handleAddStation = () => {
        if (isLocalized || isNonRTKMode) {
            rosServiceCaller(
                "/get_robot_pose",
                "/lm_msgs/srv/GetRobotPose",
                (result: {
                    message: string;
                    pose: {
                        point: { x: number; y: number };
                        yaw: number;
                    };
                    success: boolean;
                }) => {
                    if (latLng && result.success) {
                        const station: Station = {
                            id: Date.now().toString(),
                            ...latLng,
                            ...result.pose.point,
                            theta: result.pose.yaw
                        };
                        let isStationTooClose = false;
                        pathMap?.stations.forEach((value) => {
                            if (
                                distanceBetweenLatLng(
                                    { lat: value.lat, lng: value.lng },
                                    { lat: station.lat, lng: station.lng }
                                ) <= 2
                            ) {
                                toast.error("Stations cannot be too close");
                                isStationTooClose = true;
                                return;
                            } else {
                                toast.success("Station added successfully");
                            }
                        });

                        if (!isStationTooClose) {
                            addStationToPathMap(station);
                            console.log(station);

                            // ✅ FIX: Show persistent notification about saving
                            toast.success(
                                "Station added. Click 'Save Map' to persist to database.",
                                {
                                    autoClose: 6000,
                                    position: "bottom-right"
                                }
                            );
                        }
                    } else {
                        toast.error(result.message);
                    }
                },
                (error) => {
                    console.error(error);
                },
                {
                    frame: "utm"
                }
            );
        } else {
            toast.error("Bot is not localized");
        }
    };

    return (
        <div className="flex items-center justify-between">
            <span>Add Station</span>
            <SmIconButton
                name={"Add"}
                className={"bg-primary700"}
                onClick={handleAddStation}
            >
                <MdAdd className="h-4 w-4 text-white" />
            </SmIconButton>
        </div>
    );
};

export default AddStationButton;
