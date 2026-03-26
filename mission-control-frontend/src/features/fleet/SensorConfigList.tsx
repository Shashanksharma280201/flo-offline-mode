import { useState } from "react";
import { useMutation, useQueryClient } from "react-query";
import { Plus, X, Cpu, Save } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";

export interface SensorConfiguration {
    sensorType: string;
    model?: string;
    quantity: number;
    specifications?: string;
}

interface SensorConfigurationListProps {
    fleetId: string;
    initialSensors?: SensorConfiguration[];
    onSave: (sensors: SensorConfiguration[]) => Promise<void>;
}

export const SensorConfigurationList = ({
    fleetId,
    initialSensors = [],
    onSave
}: SensorConfigurationListProps) => {
    const queryClient = useQueryClient();
    const [sensors, setSensors] = useState<SensorConfiguration[]>(initialSensors);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newSensor, setNewSensor] = useState<SensorConfiguration>({
        sensorType: "",
        model: "",
        quantity: 1,
        specifications: ""
    });

    const saveMutation = useMutation(() => onSave(sensors), {
        onSuccess: () => {
            toast.success("Sensor configuration saved successfully");
            queryClient.invalidateQueries(["fleet", fleetId]);
        },
        onError: (error: any) => {
            toast.error(
                error.response?.data?.message || "Failed to save configuration"
            );
        }
    });

    const handleAddSensor = () => {
        if (!newSensor.sensorType.trim()) {
            toast.error("Sensor type is required");
            return;
        }
        if (newSensor.quantity < 1) {
            toast.error("Quantity must be at least 1");
            return;
        }

        setSensors([...sensors, newSensor]);
        setNewSensor({
            sensorType: "",
            model: "",
            quantity: 1,
            specifications: ""
        });
        setIsAddingNew(false);
    };

    const handleRemoveSensor = (index: number) => {
        setSensors(sensors.filter((_, i) => i !== index));
    };

    const handleUpdateSensor = (
        index: number,
        field: keyof SensorConfiguration,
        value: string | number
    ) => {
        const updated = [...sensors];
        updated[index] = { ...updated[index], [field]: value };
        setSensors(updated);
    };

    return (
        <div className="space-y-4">
            {/* Info Box */}
            <div className="rounded-md border border-slate-700 bg-slate-800/40 p-3">
                <p className="text-sm text-slate-300">
                    Configure sensors and telemetry data points for robots in this fleet.
                    This information is used for documentation and tracking purposes.
                </p>
            </div>

            {/* Sensors List */}
            {sensors.length === 0 && !isAddingNew && (
                <div className="rounded-md bg-slate-700/50 p-4 text-center text-sm text-slate-400">
                    No sensors configured for this fleet
                </div>
            )}

            <div className="space-y-3">
                {sensors.map((sensor, index) => (
                    <div
                        key={index}
                        className="rounded-lg border border-slate-700 bg-slate-800/60 p-4"
                    >
                        <div className="flex items-start gap-3">
                            <Cpu className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
                            <div className="flex-1 space-y-3">
                                {/* Sensor Type */}
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">
                                        Sensor Type *
                                    </label>
                                    <input
                                        type="text"
                                        value={sensor.sensorType}
                                        onChange={(e) =>
                                            handleUpdateSensor(
                                                index,
                                                "sensorType",
                                                e.target.value
                                            )
                                        }
                                        className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                                        placeholder="e.g., LIDAR, Ultrasonic, IMU"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {/* Model */}
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-400">
                                            Model
                                        </label>
                                        <input
                                            type="text"
                                            value={sensor.model || ""}
                                            onChange={(e) =>
                                                handleUpdateSensor(
                                                    index,
                                                    "model",
                                                    e.target.value
                                                )
                                            }
                                            className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                                            placeholder="e.g., VL53L0X, MPU6050"
                                        />
                                    </div>

                                    {/* Quantity */}
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-400">
                                            Quantity *
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={sensor.quantity}
                                            onChange={(e) =>
                                                handleUpdateSensor(
                                                    index,
                                                    "quantity",
                                                    parseInt(e.target.value) || 1
                                                )
                                            }
                                            className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Specifications */}
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">
                                        Specifications
                                    </label>
                                    <textarea
                                        value={sensor.specifications || ""}
                                        onChange={(e) =>
                                            handleUpdateSensor(
                                                index,
                                                "specifications",
                                                e.target.value
                                            )
                                        }
                                        className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                                        placeholder="e.g., Range: 0-2m, Accuracy: ±3mm, Interface: I2C"
                                        rows={2}
                                    />
                                </div>
                            </div>

                            {/* Remove Button */}
                            <button
                                onClick={() => handleRemoveSensor(index)}
                                className="text-red-400 hover:text-red-300"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Add New Sensor Form */}
                {isAddingNew && (
                    <div className="rounded-lg border border-green-500/50 bg-slate-800/60 p-4">
                        <div className="flex items-start gap-3">
                            <Cpu className="h-5 w-5 text-green-400 mt-1 flex-shrink-0" />
                            <div className="flex-1 space-y-3">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">
                                        Sensor Type *
                                    </label>
                                    <input
                                        type="text"
                                        value={newSensor.sensorType}
                                        onChange={(e) =>
                                            setNewSensor({
                                                ...newSensor,
                                                sensorType: e.target.value
                                            })
                                        }
                                        className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
                                        placeholder="e.g., LIDAR, Ultrasonic, IMU"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-400">
                                            Model
                                        </label>
                                        <input
                                            type="text"
                                            value={newSensor.model || ""}
                                            onChange={(e) =>
                                                setNewSensor({
                                                    ...newSensor,
                                                    model: e.target.value
                                                })
                                            }
                                            className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
                                            placeholder="e.g., VL53L0X"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-400">
                                            Quantity *
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={newSensor.quantity}
                                            onChange={(e) =>
                                                setNewSensor({
                                                    ...newSensor,
                                                    quantity: parseInt(e.target.value) || 1
                                                })
                                            }
                                            className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">
                                        Specifications
                                    </label>
                                    <textarea
                                        value={newSensor.specifications || ""}
                                        onChange={(e) =>
                                            setNewSensor({
                                                ...newSensor,
                                                specifications: e.target.value
                                            })
                                        }
                                        className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
                                        placeholder="e.g., Range: 0-2m, Accuracy: ±3mm"
                                        rows={2}
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleAddSensor}
                                        size="sm"
                                        className="flex items-center gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Sensor
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setIsAddingNew(false);
                                            setNewSensor({
                                                sensorType: "",
                                                model: "",
                                                quantity: 1,
                                                specifications: ""
                                            });
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add New Button */}
            {!isAddingNew && (
                <Button
                    variant="outline"
                    onClick={() => setIsAddingNew(true)}
                    className="flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Sensor
                </Button>
            )}

            {/* Save Button */}
            <div className="flex justify-end border-t border-slate-700 pt-4">
                <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isLoading}
                    className="flex items-center gap-2"
                >
                    <Save className="h-4 w-4" />
                    {saveMutation.isLoading ? "Saving..." : "Save Configuration"}
                </Button>
            </div>
        </div>
    );
};
