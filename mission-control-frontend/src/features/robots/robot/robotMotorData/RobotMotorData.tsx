import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { toast } from "react-toastify";
import { RobotType } from "@/data/types";
import {
    getMotorDataFn,
    updateMotorDataFn,
    BatteryMotorData
} from "../../services/robotsService";
import BatteryMotorDataForm from "./MotorDataForm";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";

const RobotMotorData = () => {
    const { robot } = useOutletContext<{ robot: RobotType }>();
    const queryClient = useQueryClient();
    const [isEditMode, setIsEditMode] = useState(false);

    // Fetch motor data
    const { data, isLoading, isError } = useQuery(
        ["motorData", robot.id],
        () => getMotorDataFn(robot.id),
        {
            staleTime: 5 * 60 * 1000 // Cache for 5 minutes
        }
    );

    // Update mutation
    const updateMutation = useMutation(
        (formData: any) => updateMotorDataFn(robot.id, formData),
        {
            onSuccess: () => {
                toast.success("Battery-Motor data updated successfully");
                queryClient.invalidateQueries(["motorData", robot.id]);
                setIsEditMode(false);
            },
            onError: (error: any) => {
                toast.error(
                    error.response?.data?.message || "Failed to update"
                );
            }
        }
    );

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-center text-background" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-6 text-red-400">
                Error loading battery-motor data
            </div>
        );
    }

    const batteryMotorData = data?.motorData;
    const hasData = batteryMotorData && Object.keys(batteryMotorData).length > 0;

    return (
        <div className="flex flex-col gap-4 items-center justify-center bg-blue-900/25 py-6 md:gap-8 md:px-8">
            <div className="mb-6 flex items-center w-full justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Battery-Motor Data</h2>
                    {/* <p className="mt-2 text-sm text-gray-400">
                        Manage battery and motor specifications for{" "}
                        {robot.name}
                    </p> */}
                </div>
                {!isEditMode && hasData && (
                    <Button
                        onClick={() => setIsEditMode(true)}
                        className="rounded-md bg-green-600 px-6 py-2 text-white hover:bg-green-700"
                    >
                        Edit
                    </Button>
                )}
            </div>

            {!isEditMode && hasData ? (
                <BatteryMotorDataView data={batteryMotorData} />
            ) : (
                <BatteryMotorDataForm
                    initialData={batteryMotorData}
                    onSubmit={updateMutation.mutate}
                    isLoading={updateMutation.isLoading}
                    onCancel={hasData ? () => setIsEditMode(false) : undefined}
                />
            )}
        </div>
    );
};

// View Component for Read-Only Display
const BatteryMotorDataView = ({ data }: { data: BatteryMotorData }) => {
    return (
        <div className="flex flex-col w-3/4 space-y-8 rounded-lg bg-gray-800/65 p-6">
            {/* Battery Information Section */}
            <div className="space-y-6">
                <h3 className="text-lg font-semibold border-b border-gray-700 pb-2">
                    Battery Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-400">
                            Battery ID
                        </label>
                        <p className="text-white">{data.batteryId || "Not set"}</p>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-400">
                            Battery Code
                        </label>
                        <p className="text-white">{data.batteryCode || "Not set"}</p>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-400">
                            Battery Serial Number
                        </label>
                        <p className="text-white">{data.batterySerialNo || "Not set"}</p>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-400">
                            Battery Type
                        </label>
                        <p className="text-white">{data.batteryType || "Not set"}</p>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-400">
                            Bluetooth Connection Serial No
                        </label>
                        <p className="text-white">{data.bluetoothConnectionSerialNo || "Not set"}</p>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-400">
                            Battery Selection
                        </label>
                        <p className="text-white">{data.batteryIdDropdown || "Not set"}</p>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-400">
                            Flo Stack ID
                        </label>
                        <p className="text-white">{data.floStackId || "Not set"}</p>
                    </div>
                </div>
            </div>

            {/* Motor Information Section */}
            <div className="space-y-6">
                <h3 className="text-lg font-semibold border-b border-gray-700 pb-2">
                    Motor Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-400">
                            Motor Type
                        </label>
                        <p className="text-white">{data.motorType || "Not set"}</p>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-400">
                            Motor Model
                        </label>
                        <p className="text-white">{data.motorModel || "Not set"}</p>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-400">
                            Motor Serial Number
                        </label>
                        <p className="text-white">{data.motorSerialNumber || "Not set"}</p>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-400">
                            Motor ID
                        </label>
                        <p className="text-white">{data.motorId || "Not set"}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RobotMotorData;
