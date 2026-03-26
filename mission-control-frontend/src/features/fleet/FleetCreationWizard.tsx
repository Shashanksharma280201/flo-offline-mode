import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "react-query";
import { MdClose, MdArrowBack, MdArrowForward, MdCheck } from "react-icons/md";
import { AlertTriangle, Info } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { fetchInventoryItems, type InventoryItem } from "@/api/inventoryApi";
import {
    getQCFormTemplates,
    type QCFormTemplate
} from "@/features/QC/qcService";
import type {
    CreateFleetPayload,
    SensorConfiguration
} from "./services/fleetService";

interface FleetCreationWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateFleetPayload) => void;
    isSubmitting: boolean;
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

interface ElectricalPart {
    itemId: string;
    name: string;
    quantity: number;
    unit: string;
}

interface MechanicalPart {
    itemId: string;
    name: string;
    quantity: number;
    unit: string;
}

export const FleetCreationWizard = ({
    isOpen,
    onClose,
    onSubmit,
    isSubmitting
}: FleetCreationWizardProps) => {
    const [currentStep, setCurrentStep] = useState<WizardStep>(1);
    const [electricalParts, setElectricalParts] = useState<ElectricalPart[]>(
        []
    );
    const [mechanicalParts, setMechanicalParts] = useState<MechanicalPart[]>(
        []
    );
    const [sensors, setSensors] = useState<SensorConfiguration[]>([]);
    const [selectedQCTemplateId, setSelectedQCTemplateId] =
        useState<string>("");
    const [searchTerm, setSearchTerm] = useState("");

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors }
    } = useForm({
        defaultValues: {
            name: "",
            prefix: "",
            modelVersion: "V1"
        }
    });

    const formData = watch();

    // Fetch inventory items for parts selection
    const { data: electricalItems, isLoading: electricalLoading } = useQuery(
        ["inventoryItems", "electronics"],
        () => fetchInventoryItems({ category: "electronics", limit: 1000 }),
        { enabled: currentStep === 2 }
    );

    const { data: mechanicalItems, isLoading: mechanicalLoading } = useQuery(
        ["inventoryItems", "mechanical"],
        () => fetchInventoryItems({ category: "mechanical", limit: 1000 }),
        { enabled: currentStep === 3 }
    );

    // Fetch QC templates
    const { data: qcTemplates, isLoading: templatesLoading } = useQuery(
        ["qcTemplates"],
        () => getQCFormTemplates(),
        { enabled: currentStep === 5 }
    );

    const canGoNext = useMemo(() => {
        switch (currentStep) {
            case 1:
                return (
                    formData.name && formData.prefix && formData.modelVersion
                );
            case 2:
            case 3:
            case 4:
            case 5:
                return true; // Optional steps
            case 6:
                return true; // Review step
            default:
                return false;
        }
    }, [currentStep, formData]);

    const handleNext = () => {
        if (canGoNext && currentStep < 6) {
            setCurrentStep((prev) => (prev + 1) as WizardStep);
            setSearchTerm("");
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep((prev) => (prev - 1) as WizardStep);
            setSearchTerm("");
        }
    };

    const handleFinalSubmit = (basicData: any) => {
        const payload: CreateFleetPayload = {
            name: basicData.name,
            prefix: basicData.prefix,
            modelVersion: basicData.modelVersion,
            partsConsumption: {
                electrical: electricalParts,
                mechanical: mechanicalParts
            },
            sensors,
            qcTemplateId: selectedQCTemplateId || undefined
        };

        onSubmit(payload);
    };

    // Parts Management
    const addElectricalPart = (item: InventoryItem) => {
        const exists = electricalParts.some((p) => p.itemId === item.itemId);
        if (exists) {
            toast.warning("Part already added");
            return;
        }
        setElectricalParts([
            ...electricalParts,
            {
                itemId: item.itemId,
                name: item.name,
                quantity: 1,
                unit: item.unit
            }
        ]);
    };

    const removeElectricalPart = (itemId: string) => {
        setElectricalParts(electricalParts.filter((p) => p.itemId !== itemId));
    };

    const updateElectricalQuantity = (itemId: string, quantity: number) => {
        if (quantity < 1) return;
        setElectricalParts(
            electricalParts.map((p) =>
                p.itemId === itemId ? { ...p, quantity } : p
            )
        );
    };

    const addMechanicalPart = (item: InventoryItem) => {
        const exists = mechanicalParts.some((p) => p.itemId === item.itemId);
        if (exists) {
            toast.warning("Part already added");
            return;
        }
        setMechanicalParts([
            ...mechanicalParts,
            {
                itemId: item.itemId,
                name: item.name,
                quantity: 1,
                unit: item.unit
            }
        ]);
    };

    const removeMechanicalPart = (itemId: string) => {
        setMechanicalParts(mechanicalParts.filter((p) => p.itemId !== itemId));
    };

    const updateMechanicalQuantity = (itemId: string, quantity: number) => {
        if (quantity < 1) return;
        setMechanicalParts(
            mechanicalParts.map((p) =>
                p.itemId === itemId ? { ...p, quantity } : p
            )
        );
    };

    // Sensors Management
    const [newSensor, setNewSensor] = useState<SensorConfiguration>({
        sensorType: "",
        model: "",
        quantity: 1,
        specifications: ""
    });
    const [isAddingSensor, setIsAddingSensor] = useState(false);

    const addSensor = () => {
        if (!newSensor.sensorType.trim()) {
            toast.error("Sensor type is required");
            return;
        }
        setSensors([...sensors, newSensor]);
        setNewSensor({
            sensorType: "",
            model: "",
            quantity: 1,
            specifications: ""
        });
        setIsAddingSensor(false);
    };

    const removeSensor = (index: number) => {
        setSensors(sensors.filter((_, i) => i !== index));
    };

    if (!isOpen) return null;

    return (
        <div className="dark fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="flex h-full w-full flex-col overflow-hidden border border-slate-800 bg-[#0a0c14] shadow-[0_0_50px_rgba(0,0,0,0.5)] md:h-[90vh] md:w-[80vw] md:max-w-6xl md:rounded-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/50 px-6 py-4">
                    <div>
                        <h2 className="text-xl font-medium text-white">
                            Create Fleet Template
                        </h2>
                        <p className="mt-0.5 text-sm text-slate-400">
                            Step {currentStep} of 6
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 transition-colors hover:text-white"
                        disabled={isSubmitting}
                    >
                        <MdClose className="h-5 w-5" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="relative border-b border-white/10 bg-slate-900/30 px-6 py-8">
                    {/* Track Background */}
                    <div className="absolute left-10 right-10 top-1/2 h-0.5 -translate-y-1/2 bg-slate-800" />

                    {/* Progress Fill */}
                    <div
                        className="absolute left-10 top-1/2 h-0.5 -translate-y-1/2 bg-emerald-500 transition-all duration-500 ease-in-out"
                        style={{
                            width: `calc(((100% - 5rem) / 5) * ${currentStep - 1})`
                        }}
                    />

                    <div className="relative flex items-center justify-between">
                        {[
                            "Basic Info",
                            "Electrical",
                            "Mechanical",
                            "Sensors",
                            "QC Template",
                            "Review"
                        ].map((label, index) => (
                            <div
                                key={label}
                                className="flex flex-col items-center gap-2"
                            >
                                <div
                                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                                        index + 1 === currentStep
                                            ? "border-blue-500 bg-blue-500 text-white shadow-blue-500/50"
                                            : index + 1 < currentStep
                                              ? "border-emerald-500 bg-emerald-500 text-white"
                                              : "border-slate-700 bg-slate-900 text-slate-500"
                                    }`}
                                >
                                    {index + 1 < currentStep ? (
                                        <MdCheck className="text-sm" />
                                    ) : (
                                        <span className="text-xs font-medium">
                                            {index + 1}
                                        </span>
                                    )}
                                </div>
                                <span
                                    className={`absolute top-full mt-2 hidden whitespace-nowrap text-xs transition-colors md:inline ${
                                        index + 1 === currentStep
                                            ? "font-medium text-white"
                                            : index + 1 < currentStep
                                              ? "text-emerald-400"
                                              : "text-slate-500"
                                    }`}
                                >
                                    {label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {/* Step 1: Basic Info */}
                    {currentStep === 1 && (
                        <div className="mx-auto max-w-2xl space-y-6">
                            <div>
                                <h3 className="mb-6 text-base font-medium text-white">
                                    Fleet Basic Information
                                </h3>
                                <div className="space-y-5">
                                    <div>
                                        <Label
                                            htmlFor="name"
                                            className="mb-2 block text-slate-200"
                                        >
                                            Fleet Name{" "}
                                            <span className="text-red-400">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="name"
                                            {...register("name", {
                                                required:
                                                    "Fleet name is required"
                                            })}
                                            className={`border-white/10 bg-transparent text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 ${
                                                errors.name
                                                    ? "border-red-500 focus-visible:ring-red-500/20"
                                                    : ""
                                            }`}
                                            placeholder="e.g., Warehouse Robots, Delivery Bots"
                                        />
                                        {errors.name && (
                                            <p className="mt-1.5 text-xs text-red-400">
                                                {errors.name.message}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <Label
                                            htmlFor="prefix"
                                            className="mb-2 block text-slate-200"
                                        >
                                            Robot Prefix{" "}
                                            <span className="text-red-400">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="prefix"
                                            {...register("prefix", {
                                                required: "Prefix is required"
                                            })}
                                            className={`border-white/10 bg-transparent text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 ${
                                                errors.prefix
                                                    ? "border-red-500 focus-visible:ring-red-500/20"
                                                    : ""
                                            }`}
                                            placeholder="e.g., WH-, DEL-"
                                        />
                                        {errors.prefix && (
                                            <p className="mt-1.5 text-xs text-red-400">
                                                {errors.prefix.message}
                                            </p>
                                        )}
                                        <p className="mt-1.5 text-xs text-slate-500">
                                            This prefix will be used for robot
                                            naming
                                        </p>
                                    </div>

                                    <div>
                                        <Label
                                            htmlFor="modelVersion"
                                            className="mb-2 block text-slate-200"
                                        >
                                            Model Version{" "}
                                            <span className="text-red-400">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="modelVersion"
                                            {...register("modelVersion", {
                                                required:
                                                    "Model version is required"
                                            })}
                                            className={`border-white/10 bg-transparent text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 ${
                                                errors.modelVersion
                                                    ? "border-red-500 focus-visible:ring-red-500/20"
                                                    : ""
                                            }`}
                                            placeholder="e.g., V1, V2, V3"
                                        />
                                        {errors.modelVersion && (
                                            <p className="mt-1.5 text-xs text-red-400">
                                                {errors.modelVersion.message}
                                            </p>
                                        )}
                                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-500/80">
                                            <AlertTriangle className="h-3 w-3" />
                                            Model version cannot be changed
                                            after creation
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                                <div className="flex items-start gap-3">
                                    <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
                                    <div className="text-sm">
                                        <p className="mb-1 font-medium text-blue-300">
                                            About Fleet Templates
                                        </p>
                                        <p className="leading-relaxed text-slate-400">
                                            A fleet is a template that defines
                                            what parts, sensors, and QC
                                            standards apply to a group of
                                            robots. Once created, the model
                                            version cannot be changed.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Electrical Parts */}
                    {currentStep === 2 && (
                        <div className="mx-auto max-w-4xl">
                            <div className="mb-6">
                                <h3 className="mb-2 text-base font-medium text-white">
                                    Electrical Parts Configuration
                                </h3>
                                <p className="text-sm text-slate-400">
                                    These parts are for reference and must be
                                    recorded manually during manufacturing.
                                </p>
                            </div>

                            {electricalLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-background" />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Selected Parts */}
                                    {electricalParts.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="mb-3 text-sm font-medium text-slate-200">
                                                Selected Parts (
                                                {electricalParts.length})
                                            </h4>
                                            {electricalParts.map((part) => (
                                                <div
                                                    key={part.itemId}
                                                    className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/40 p-3 transition-colors hover:bg-slate-900/60"
                                                >
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-white">
                                                            {part.name}
                                                        </p>
                                                        <p className="mt-0.5 font-mono text-xs text-slate-500">
                                                            ID: {part.itemId}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            className="h-9 w-16 border-white/10 bg-transparent text-center font-mono text-white placeholder:text-slate-500"
                                                            value={
                                                                part.quantity
                                                            }
                                                            onFocus={(e) =>
                                                                e.target.select()
                                                            }
                                                            onClick={(e) =>
                                                                (
                                                                    e.target as HTMLInputElement
                                                                ).select()
                                                            }
                                                            onChange={(e) =>
                                                                updateElectricalQuantity(
                                                                    part.itemId,
                                                                    parseInt(
                                                                        e.target
                                                                            .value
                                                                    ) || 1
                                                                )
                                                            }
                                                        />
                                                        <span className="min-w-[3rem] text-xs text-slate-400">
                                                            {part.unit}
                                                        </span>
                                                        <button
                                                            onClick={() =>
                                                                removeElectricalPart(
                                                                    part.itemId
                                                                )
                                                            }
                                                            className="ml-2 text-red-400 transition-colors hover:text-red-300"
                                                        >
                                                            <MdClose className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Available Parts */}
                                    <div>
                                        <div className="mb-3 flex items-center justify-between">
                                            <h4 className="text-sm font-medium text-slate-200">
                                                Add from Inventory
                                            </h4>
                                            <div className="w-64">
                                                <Input
                                                    placeholder="Search parts..."
                                                    value={searchTerm}
                                                    onChange={(e) =>
                                                        setSearchTerm(
                                                            e.target.value
                                                        )
                                                    }
                                                    className="h-8 border-white/10 bg-transparent text-xs text-white placeholder:text-slate-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-96 space-y-1.5 overflow-y-auto rounded-lg border border-white/10 bg-slate-900/30 p-2">
                                            {electricalItems?.items
                                                .filter(
                                                    (item) =>
                                                        item.name
                                                            .toLowerCase()
                                                            .includes(
                                                                searchTerm.toLowerCase()
                                                            ) ||
                                                        item.itemId
                                                            .toLowerCase()
                                                            .includes(
                                                                searchTerm.toLowerCase()
                                                            )
                                                )
                                                .map((item) => {
                                                    const isSelected =
                                                        electricalParts.some(
                                                            (p) =>
                                                                p.itemId ===
                                                                item.itemId
                                                        );
                                                    return (
                                                        <button
                                                            key={item.itemId}
                                                            onClick={() =>
                                                                addElectricalPart(
                                                                    item
                                                                )
                                                            }
                                                            disabled={
                                                                isSelected
                                                            }
                                                            className={`flex w-full items-center justify-between rounded-md p-2.5 text-left transition-all ${
                                                                isSelected
                                                                    ? "cursor-not-allowed bg-slate-800/30 opacity-50"
                                                                    : "bg-slate-900/40 hover:bg-slate-800/60 hover:shadow-sm"
                                                            }`}
                                                        >
                                                            <div>
                                                                <p className="text-sm font-medium text-white">
                                                                    {item.name}
                                                                </p>
                                                                <p className="mt-0.5 font-mono text-xs text-slate-500">
                                                                    ID:{" "}
                                                                    {
                                                                        item.itemId
                                                                    }
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xs text-slate-400">
                                                                    Available:{" "}
                                                                    {
                                                                        item.quantity
                                                                    }{" "}
                                                                    {item.unit}
                                                                </p>
                                                                {isSelected && (
                                                                    <p className="mt-0.5 text-xs text-emerald-400">
                                                                        ✓ Added
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    </div>

                                    {electricalParts.length === 0 && (
                                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-400" />
                                                <div className="text-sm">
                                                    <p className="mb-1 font-medium text-amber-300">
                                                        No electrical parts
                                                        configured
                                                    </p>
                                                    <p className="text-slate-400">
                                                        You can skip this step,
                                                        but robots created from
                                                        this fleet won't have
                                                        reference parts
                                                        configured.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Mechanical Parts */}
                    {currentStep === 3 && (
                        <div className="mx-auto max-w-4xl">
                            <div className="mb-6">
                                <h3 className="mb-2 text-lg font-semibold text-white">
                                    Mechanical Parts Configuration
                                </h3>
                                <p className="text-sm text-slate-400">
                                    These parts are for reference and must be
                                    recorded manually during manufacturing.
                                </p>
                            </div>

                            {mechanicalLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-background" />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Selected Parts */}
                                    {mechanicalParts.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-medium text-white">
                                                Selected Parts (
                                                {mechanicalParts.length})
                                            </h4>
                                            {mechanicalParts.map((part) => (
                                                <div
                                                    key={part.itemId}
                                                    className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/40 p-3"
                                                >
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-white">
                                                            {part.name}
                                                        </p>
                                                        <p className="font-mono text-xs text-slate-500">
                                                            ID: {part.itemId}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            value={
                                                                part.quantity
                                                            }
                                                            onFocus={(e) =>
                                                                e.target.select()
                                                            }
                                                            onClick={(e) =>
                                                                (
                                                                    e.target as HTMLInputElement
                                                                ).select()
                                                            }
                                                            onChange={(e) =>
                                                                updateMechanicalQuantity(
                                                                    part.itemId,
                                                                    parseInt(
                                                                        e.target
                                                                            .value
                                                                    ) || 1
                                                                )
                                                            }
                                                            className="h-9 w-16 border-white/10 bg-transparent text-center text-white placeholder:text-slate-500"
                                                        />
                                                        <span className="text-xs text-slate-400">
                                                            {part.unit}
                                                        </span>
                                                        <button
                                                            onClick={() =>
                                                                removeMechanicalPart(
                                                                    part.itemId
                                                                )
                                                            }
                                                            className="ml-2 text-red-400 hover:text-red-300"
                                                        >
                                                            <MdClose className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Available Parts */}
                                    <div>
                                        <div className="mb-3 flex items-center justify-between">
                                            <h4 className="text-sm font-medium text-slate-200">
                                                Add from Inventory
                                            </h4>
                                            <div className="w-64">
                                                <Input
                                                    placeholder="Search parts..."
                                                    value={searchTerm}
                                                    onChange={(e) =>
                                                        setSearchTerm(
                                                            e.target.value
                                                        )
                                                    }
                                                    className="h-8 border-white/10 bg-transparent text-xs text-white placeholder:text-slate-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-96 space-y-1.5 overflow-y-auto rounded-lg border border-white/10 bg-slate-900/30 p-2">
                                            {mechanicalItems?.items
                                                .filter(
                                                    (item) =>
                                                        item.name
                                                            .toLowerCase()
                                                            .includes(
                                                                searchTerm.toLowerCase()
                                                            ) ||
                                                        item.itemId
                                                            .toLowerCase()
                                                            .includes(
                                                                searchTerm.toLowerCase()
                                                            )
                                                )
                                                .map((item) => {
                                                    const isSelected =
                                                        mechanicalParts.some(
                                                            (p) =>
                                                                p.itemId ===
                                                                item.itemId
                                                        );
                                                    return (
                                                        <button
                                                            key={item.itemId}
                                                            onClick={() =>
                                                                addMechanicalPart(
                                                                    item
                                                                )
                                                            }
                                                            disabled={
                                                                isSelected
                                                            }
                                                            className={`flex w-full items-center justify-between rounded-md p-2.5 text-left transition-all ${
                                                                isSelected
                                                                    ? "cursor-not-allowed bg-slate-800/30 opacity-50"
                                                                    : "bg-slate-900/40 hover:bg-slate-800/60 hover:shadow-sm"
                                                            }`}
                                                        >
                                                            <div>
                                                                <p className="text-sm font-medium text-white">
                                                                    {item.name}
                                                                </p>
                                                                <p className="font-mono text-xs text-slate-500">
                                                                    ID:{" "}
                                                                    {
                                                                        item.itemId
                                                                    }
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xs text-slate-400">
                                                                    Available:{" "}
                                                                    {
                                                                        item.quantity
                                                                    }{" "}
                                                                    {item.unit}
                                                                </p>
                                                                {isSelected && (
                                                                    <p className="mt-0.5 text-xs text-emerald-400">
                                                                        ✓ Added
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Sensors */}
                    {currentStep === 4 && (
                        <div className="mx-auto max-w-4xl">
                            <div className="mb-6">
                                <h3 className="mb-2 text-lg font-semibold text-white">
                                    Sensors Configuration
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Configure sensors and telemetry data points
                                    for robots in this fleet.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {/* Added Sensors */}
                                {sensors.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-medium text-white">
                                            Configured Sensors ({sensors.length}
                                            )
                                        </h4>
                                        {sensors.map((sensor, index) => (
                                            <div
                                                key={index}
                                                className="rounded-lg border border-white/10 bg-slate-900/40 p-4"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-white">
                                                            {sensor.sensorType}
                                                        </p>
                                                        {sensor.model && (
                                                            <p className="text-xs text-slate-300">
                                                                Model:{" "}
                                                                {sensor.model}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-slate-400">
                                                            Quantity:{" "}
                                                            {sensor.quantity}
                                                        </p>
                                                        {sensor.specifications && (
                                                            <p className="mt-1 text-xs text-slate-500">
                                                                {
                                                                    sensor.specifications
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() =>
                                                            removeSensor(index)
                                                        }
                                                        className="text-red-400 hover:text-red-300"
                                                    >
                                                        <MdClose className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add Sensor Form */}
                                {isAddingSensor ? (
                                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                                        <h4 className="mb-3 text-sm font-medium text-white">
                                            Add New Sensor
                                        </h4>
                                        <div className="space-y-4">
                                            <div>
                                                <Label className="mb-1.5 block text-xs text-slate-400">
                                                    Sensor Type *
                                                </Label>
                                                <Input
                                                    type="text"
                                                    value={newSensor.sensorType}
                                                    onChange={(e) =>
                                                        setNewSensor({
                                                            ...newSensor,
                                                            sensorType:
                                                                e.target.value
                                                        })
                                                    }
                                                    placeholder="e.g., LIDAR, Ultrasonic, IMU"
                                                    className="border-white/10 bg-transparent text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="mb-1.5 block text-xs text-slate-400">
                                                        Model
                                                    </Label>
                                                    <Input
                                                        type="text"
                                                        value={
                                                            newSensor.model ||
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            setNewSensor({
                                                                ...newSensor,
                                                                model: e.target
                                                                    .value
                                                            })
                                                        }
                                                        placeholder="e.g., VL53L0X"
                                                        className="border-white/10 bg-transparent text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                                                    />
                                                </div>

                                                <div>
                                                    <Label className="mb-1.5 block text-xs text-slate-400">
                                                        Quantity *
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={
                                                            newSensor.quantity
                                                        }
                                                        onFocus={(e) =>
                                                            e.target.select()
                                                        }
                                                        onClick={(e) =>
                                                            (
                                                                e.target as HTMLInputElement
                                                            ).select()
                                                        }
                                                        onChange={(e) =>
                                                            setNewSensor({
                                                                ...newSensor,
                                                                quantity:
                                                                    parseInt(
                                                                        e.target
                                                                            .value
                                                                    ) || 1
                                                            })
                                                        }
                                                        className="border-white/10 bg-transparent text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <Label className="mb-1.5 block text-xs text-slate-400">
                                                    Specifications
                                                </Label>
                                                <Textarea
                                                    value={
                                                        newSensor.specifications ||
                                                        ""
                                                    }
                                                    onChange={(e) =>
                                                        setNewSensor({
                                                            ...newSensor,
                                                            specifications:
                                                                e.target.value
                                                        })
                                                    }
                                                    placeholder="e.g., Range: 0-2m, Accuracy: ±3mm"
                                                    rows={2}
                                                    className="border-white/10 bg-transparent text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                                                />
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={addSensor}
                                                    className="bg-emerald-600 text-white hover:bg-emerald-500"
                                                >
                                                    Add Sensor
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        setIsAddingSensor(
                                                            false
                                                        );
                                                        setNewSensor({
                                                            sensorType: "",
                                                            model: "",
                                                            quantity: 1,
                                                            specifications: ""
                                                        });
                                                    }}
                                                    className="border border-white/10 bg-transparent text-slate-300 hover:bg-white/10 hover:text-white"
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={() => setIsAddingSensor(true)}
                                        className="border border-white/10 bg-transparent text-slate-300 hover:bg-white/10 hover:text-white"
                                    >
                                        + Add Sensor
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 5: QC Template */}
                    {currentStep === 5 && (
                        <div className="mx-auto max-w-2xl">
                            <div className="mb-6">
                                <h3 className="mb-2 text-lg font-semibold text-white">
                                    QC Template Selection (Optional)
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Link a QC inspection template to this fleet.
                                    Robots will use this template for quality
                                    control inspections.
                                </p>
                            </div>

                            {templatesLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-background" />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* None Option */}
                                    <button
                                        onClick={() =>
                                            setSelectedQCTemplateId("")
                                        }
                                        className={`w-full rounded-lg border p-4 text-left transition-all ${
                                            selectedQCTemplateId === ""
                                                ? "border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                                                : "border-white/10 bg-slate-900/40 hover:bg-slate-900/60"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-white">
                                                    None (Skip for now)
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    You can assign a QC template
                                                    later
                                                </p>
                                            </div>
                                            {selectedQCTemplateId === "" && (
                                                <MdCheck className="h-5 w-5 text-blue-400" />
                                            )}
                                        </div>
                                    </button>

                                    {/* Available Templates */}
                                    {qcTemplates?.map(
                                        (template: QCFormTemplate) => (
                                            <button
                                                key={template.id}
                                                onClick={() =>
                                                    setSelectedQCTemplateId(
                                                        template.id
                                                    )
                                                }
                                                className={`w-full rounded-lg border p-4 text-left transition-all ${
                                                    selectedQCTemplateId ===
                                                    template.id
                                                        ? "border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                                                        : "border-white/10 bg-slate-900/40 hover:bg-slate-900/60"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-medium text-white">
                                                            {template.name}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            Version{" "}
                                                            {template.version} •{" "}
                                                            {
                                                                template.totalQuestions
                                                            }{" "}
                                                            questions
                                                        </p>
                                                        {template.description && (
                                                            <p className="mt-1 text-xs text-slate-600">
                                                                {
                                                                    template.description
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                    {selectedQCTemplateId ===
                                                        template.id && (
                                                        <MdCheck className="h-5 w-5 text-blue-400" />
                                                    )}
                                                </div>
                                            </button>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 6: Review */}
                    {currentStep === 6 && (
                        <div className="mx-auto max-w-3xl">
                            <div className="mb-6">
                                <h3 className="mb-2 text-lg font-semibold text-white">
                                    Review Fleet Template
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Please review all configurations before
                                    creating the fleet template.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {/* Basic Info */}
                                <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
                                    <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Basic Information
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">
                                                Fleet Name:
                                            </span>
                                            <span className="font-medium text-white">
                                                {formData.name}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">
                                                Prefix:
                                            </span>
                                            <span className="font-medium text-white">
                                                {formData.prefix}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">
                                                Model Version:
                                            </span>
                                            <span className="font-medium text-white">
                                                {formData.modelVersion}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Parts */}
                                <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
                                    <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Parts Configuration
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">
                                                Electrical Parts:
                                            </span>
                                            <span className="font-medium text-white">
                                                {electricalParts.length} items
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">
                                                Mechanical Parts:
                                            </span>
                                            <span className="font-medium text-white">
                                                {mechanicalParts.length} items
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Sensors */}
                                <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
                                    <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Sensors
                                    </h4>
                                    <div className="text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">
                                                Total Sensors:
                                            </span>
                                            <span className="font-medium text-white">
                                                {sensors.length} configured
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* QC Template */}
                                <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
                                    <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        QC Template
                                    </h4>
                                    <div className="text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">
                                                Template:
                                            </span>
                                            <span className="font-medium text-white">
                                                {selectedQCTemplateId
                                                    ? qcTemplates?.find(
                                                          (t: QCFormTemplate) =>
                                                              t.id ===
                                                              selectedQCTemplateId
                                                      )?.name || "Selected"
                                                    : "None"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Warning */}
                                <div className="rounded-md border border-orange-500/30 bg-orange-500/10 p-4">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="mt-0.5 h-5 w-5 text-orange-400" />
                                        <div className="text-sm text-orange-300">
                                            <p className="mb-1 font-medium">
                                                Important Note
                                            </p>
                                            <p className="text-orange-300/80">
                                                Name, Prefix, and Model Version
                                                cannot be changed after
                                                creation. All other
                                                configurations can be updated
                                                later from the fleet
                                                configuration page.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-white/10 bg-slate-900/50 px-6 py-4">
                    <Button
                        onClick={handleBack}
                        disabled={currentStep === 1 || isSubmitting}
                        className="gap-2 border border-white/10 bg-transparent text-slate-300 hover:bg-white/10 hover:text-white"
                    >
                        <MdArrowBack className="text-base" />
                        Back
                    </Button>

                    {currentStep < 6 ? (
                        <Button
                            onClick={handleNext}
                            disabled={!canGoNext}
                            className="gap-2 bg-white text-black hover:bg-slate-200"
                        >
                            Next
                            <MdArrowForward className="text-base" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit(handleFinalSubmit)}
                            disabled={isSubmitting || !canGoNext}
                            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500"
                        >
                            {isSubmitting ? (
                                <>
                                    <LoadingSpinner className="h-4 w-4" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <MdCheck className="text-base" />
                                    Create Fleet Template
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
