import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import {
    Package,
    Cpu,
    ClipboardCheck,
    Plus,
    Edit2,
    Trash2,
    X,
    Check,
    Download
} from "lucide-react";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
// Ensure these paths match your project structure
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { fetchInventoryItems, type InventoryItem } from "@/api/inventoryApi";
import { getAllTemplates, type QCFormTemplate } from "@/features/QC/qcService";
import {
    updateFleetPartsConsumptionFn,
    updateFleetSensorsFn,
    linkFleetQCTemplateFn,
    type PartsConsumption,
    type SensorConfiguration
} from "./services/fleetService";
import { fetchFleetsFn } from "./services/fleetService";

// --- Types & Interfaces ---

// Union type for the navigation tabs
type ConfigTab = "parts" | "sensors" | "qc";

// Union type used to make the Parts editor generic
type PartCategory = "electrical" | "mechanical";

interface Part {
    itemId: string;
    name: string;
    quantity: number;
    unit: string;
}

// ============================================================================
// 1. MAIN PARENT VIEW
//    - Manages the active tab state
//    - Fetches the fleet data once
//    - Passes data down to child editors
// ============================================================================

export const FleetConfigurationView = () => {
    const { id: fleetId } = useParams<{ id: string }>();
    const [activeTab, setActiveTab] = useState<ConfigTab>("parts");

    // Fetch current fleet data
    // OPTIMIZATION: We use the 'select' option to isolate the specific fleet
    // and ensure re-renders only happen when this specific fleet changes.
    const { data: fleet, isLoading: fleetsLoading } = useQuery(
        ["fleets"],
        fetchFleetsFn,
        {
            select: (fleets) => fleets?.find((f: any) => f.id === fleetId),
            enabled: !!fleetId // Only run query if we have an ID
        }
    );

    if (!fleetId) {
        return <div className="p-6 text-red-400">Fleet ID not found</div>;
    }

    if (fleetsLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-background" />
            </div>
        );
    }

    // Fallback if fleet is not found after loading
    if (!fleet) {
        return <div className="p-6 text-zinc-400">Fleet not found</div>;
    }

    return (
        <div className="flex min-h-screen w-full flex-col gap-6 p-4 sm:p-6">
            {/* Sub-tabs for Configuration Sections */}
            <div className="no-scrollbar flex w-full flex-nowrap gap-2 overflow-x-auto border-b border-white/10 pb-2">
                <TabButton
                    isActive={activeTab === "parts"}
                    onClick={() => setActiveTab("parts")}
                    icon={<Package className="h-4 w-4" />}
                    label="Parts Consumption"
                />
                <TabButton
                    isActive={activeTab === "sensors"}
                    onClick={() => setActiveTab("sensors")}
                    icon={<Cpu className="h-4 w-4" />}
                    label="Sensor Configuration"
                />
                <TabButton
                    isActive={activeTab === "qc"}
                    onClick={() => setActiveTab("qc")}
                    icon={<ClipboardCheck className="h-4 w-4" />}
                    label="QC Template"
                />
            </div>

            {/* Content Area */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6">
                {/* OPTIMIZATION: The `key` prop is crucial here. 
           It forces the component to re-mount if the fleet data changes from the server.
           This solves the "stale props" bug where editing didn't reset correctly.
        */}

                {activeTab === "parts" && (
                    <PartsConsumptionEditor
                        key={`parts-${fleet.id}-${JSON.stringify(fleet.partsConsumption)}`}
                        fleetId={fleetId}
                        currentParts={
                            fleet.partsConsumption || {
                                electrical: [],
                                mechanical: []
                            }
                        }
                    />
                )}

                {activeTab === "sensors" && (
                    <SensorConfigurationEditor
                        key={`sensors-${fleet.id}-${fleet.sensors?.length}`}
                        fleetId={fleetId}
                        currentSensors={fleet.sensors || []}
                    />
                )}

                {activeTab === "qc" && (
                    <QCTemplateSelector
                        key={`qc-${fleet.id}-${fleet.qcTemplateId}`}
                        fleetId={fleetId}
                        currentTemplateId={fleet.qcTemplateId}
                    />
                )}
            </div>
        </div>
    );
};

// ============================================================================
// 2. PARTS CONSUMPTION EDITOR
//    - Now handles BOTH Electrical and Mechanical using generic handlers
//    - Reduced code duplication by ~50%
// ============================================================================

interface PartsConsumptionEditorProps {
    fleetId: string;
    currentParts: PartsConsumption;
}

const PartsConsumptionEditor = ({
    fleetId,
    currentParts
}: PartsConsumptionEditorProps) => {
    // Store both categories in one state object for easier manipulation
    const [partsData, setPartsData] = useState<PartsConsumption>(currentParts);
    const [isEditing, setIsEditing] = useState(false);

    // Tracks which category we are currently adding an item to (null = modal closed)
    const [activeCategoryAdd, setActiveCategoryAdd] =
        useState<PartCategory | null>(null);

    const queryClient = useQueryClient();

    const updatePartsMutation = useMutation(
        (data: PartsConsumption) =>
            updateFleetPartsConsumptionFn({ fleetId, partsConsumption: data }),
        {
            onSuccess: () => {
                toast.success("Parts configuration updated successfully!");
                queryClient.invalidateQueries(["fleets"]);
                setIsEditing(false);
            },
            onError: (error: any) => {
                toast.error(
                    error.response?.data?.message ||
                        "Failed to update parts configuration"
                );
            }
        }
    );

    // --- Generic Handlers (The key optimization) ---

    // Helper to safely update one category without touching the other
    const modifyCategory = (category: PartCategory, newItems: Part[]) => {
        setPartsData((prev) => ({
            ...prev,
            [category]: newItems
        }));
    };

    const handleAddPart = (item: InventoryItem) => {
        if (!activeCategoryAdd) return;

        const currentList = partsData[activeCategoryAdd] || [];

        // Check for duplicates within the specific category
        if (currentList.some((p) => p.itemId === item.itemId)) {
            toast.warning("Part already added");
            return;
        }

        const newPart: Part = {
            itemId: item.itemId,
            name: item.name,
            quantity: 1,
            unit: item.unit
        };

        modifyCategory(activeCategoryAdd, [...currentList, newPart]);
        setActiveCategoryAdd(null); // Close modal
    };

    const handleRemovePart = (itemId: string, category: PartCategory) => {
        const currentList = partsData[category] || [];
        modifyCategory(
            category,
            currentList.filter((p) => p.itemId !== itemId)
        );
    };

    const handleUpdateQuantity = (
        itemId: string,
        qty: number,
        category: PartCategory
    ) => {
        if (qty < 1) return;
        const currentList = partsData[category] || [];
        const updatedList = currentList.map((p) =>
            p.itemId === itemId ? { ...p, quantity: qty } : p
        );
        modifyCategory(category, updatedList);
    };

    const handleCancel = () => {
        setPartsData(currentParts); // Reset to props
        setIsEditing(false);
        setActiveCategoryAdd(null);
    };

    const handleDownloadExcel = () => {
        try {
            // Create workbook
            const workbook = XLSX.utils.book_new();

            // Prepare Electrical Parts data
            const electricalData = (partsData.electrical || []).map((part) => ({
                "Item ID": part.itemId,
                "Name": part.name,
                "Quantity": part.quantity,
                "Unit": part.unit
            }));

            // Prepare Mechanical Parts data
            const mechanicalData = (partsData.mechanical || []).map((part) => ({
                "Item ID": part.itemId,
                "Name": part.name,
                "Quantity": part.quantity,
                "Unit": part.unit
            }));

            // Create worksheets
            const electricalSheet = XLSX.utils.json_to_sheet(electricalData);
            const mechanicalSheet = XLSX.utils.json_to_sheet(mechanicalData);

            // Set column widths for better readability
            const columnWidths = [
                { wch: 15 }, // Item ID
                { wch: 40 }, // Name
                { wch: 10 }, // Quantity
                { wch: 10 }  // Unit
            ];
            electricalSheet["!cols"] = columnWidths;
            mechanicalSheet["!cols"] = columnWidths;

            // Add worksheets to workbook
            XLSX.utils.book_append_sheet(workbook, electricalSheet, "Electrical Parts");
            XLSX.utils.book_append_sheet(workbook, mechanicalSheet, "Mechanical Parts");

            // Generate filename with current date
            const date = new Date().toISOString().split('T')[0];
            const filename = `Fleet_BOM_Parts_${date}.xlsx`;

            // Download the file
            XLSX.writeFile(workbook, filename);

            toast.success("Parts list downloaded successfully!");
        } catch (error) {
            console.error("Error downloading Excel file:", error);
            toast.error("Failed to download parts list");
        }
    };

    return (
        <div>
            <HeaderSection
                title="Parts Consumption Configuration"
                subtitle="These parts are for reference and must be recorded manually during manufacturing."
                isEditing={isEditing}
                onEdit={() => setIsEditing(true)}
                onCancel={handleCancel}
                onSave={() => updatePartsMutation.mutate(partsData)}
                isLoading={updatePartsMutation.isLoading}
                onDownload={handleDownloadExcel}
                showDownload={true}
            />

            {/* The Search Modal: Only renders when activeCategoryAdd is not null */}
            {activeCategoryAdd && (
                <PartSearchModal
                    category={activeCategoryAdd}
                    onClose={() => setActiveCategoryAdd(null)}
                    onAdd={handleAddPart}
                    existingParts={partsData[activeCategoryAdd] || []}
                />
            )}

            {/* Reusable List Components 
         Instead of writing the JSX loop twice, we use PartListSection
      */}
            <PartListSection
                title="Electrical Parts"
                category="electrical"
                parts={partsData.electrical || []}
                isEditing={isEditing}
                isAddingAny={!!activeCategoryAdd}
                onAddClick={() => setActiveCategoryAdd("electrical")}
                onRemove={handleRemovePart}
                onUpdateQty={handleUpdateQuantity}
            />

            <PartListSection
                title="Mechanical Parts"
                category="mechanical"
                parts={partsData.mechanical || []}
                isEditing={isEditing}
                isAddingAny={!!activeCategoryAdd}
                onAddClick={() => setActiveCategoryAdd("mechanical")}
                onRemove={handleRemovePart}
                onUpdateQty={handleUpdateQuantity}
            />
        </div>
    );
};

// ============================================================================
// 3. SENSOR CONFIGURATION EDITOR
//    - Consolidated form logic (Edit/Add use same form state)
// ============================================================================

interface SensorConfigurationEditorProps {
    fleetId: string;
    currentSensors: SensorConfiguration[];
}

const SensorConfigurationEditor = ({
    fleetId,
    currentSensors
}: SensorConfigurationEditorProps) => {
    const [sensors, setSensors] = useState<SensorConfiguration[]>(
        currentSensors || []
    );
    const [isEditing, setIsEditing] = useState(false);

    // Clean state management for the inline form
    const [editState, setEditState] = useState<{
        index: number | null;
        isOpen: boolean;
    }>({
        index: null,
        isOpen: false
    });

    // Empty form template
    const defaultForm = {
        sensorType: "",
        model: "",
        quantity: 1,
        specifications: ""
    };
    const [formData, setFormData] = useState<SensorConfiguration>(defaultForm);

    const queryClient = useQueryClient();

    const updateSensorsMutation = useMutation(
        (data: SensorConfiguration[]) =>
            updateFleetSensorsFn({ fleetId, sensors: data }),
        {
            onSuccess: () => {
                toast.success("Sensors configuration updated successfully!");
                queryClient.invalidateQueries(["fleets"]);
                setIsEditing(false);
                setEditState({ index: null, isOpen: false });
            },
            onError: (error: any) => {
                toast.error(
                    error.response?.data?.message ||
                        "Failed to update sensors configuration"
                );
            }
        }
    );

    const handleSaveForm = () => {
        if (!formData.sensorType.trim()) {
            toast.error("Sensor type is required");
            return;
        }

        const updatedSensors = [...sensors];
        if (editState.index !== null) {
            // Update existing
            updatedSensors[editState.index] = formData;
        } else {
            // Add new
            updatedSensors.push(formData);
        }

        setSensors(updatedSensors);
        setEditState({ index: null, isOpen: false });
        setFormData(defaultForm);
    };

    const openForm = (index: number | null = null) => {
        setEditState({ index, isOpen: true });
        setFormData(index !== null ? sensors[index] : defaultForm);
    };

    const removeSensor = (index: number) => {
        setSensors(sensors.filter((_, i) => i !== index));
    };

    const handleCancel = () => {
        setSensors(currentSensors || []);
        setIsEditing(false);
        setEditState({ index: null, isOpen: false });
    };

    return (
        <div>
            <HeaderSection
                title="Sensor Configuration"
                subtitle="Configure sensors and telemetry data points for robots in this fleet."
                isEditing={isEditing}
                onEdit={() => setIsEditing(true)}
                onCancel={handleCancel}
                onSave={() => updateSensorsMutation.mutate(sensors)}
                isLoading={updateSensorsMutation.isLoading}
            />

            {/* Add Button (only visible if editing and form not open) */}
            {isEditing && !editState.isOpen && (
                <button
                    onClick={() => openForm(null)}
                    className="mb-4 flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                    <Plus className="h-4 w-4" />
                    Add Sensor
                </button>
            )}

            {/* Add/Edit Form */}
            {editState.isOpen && (
                <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-4">
                    <h5 className="mb-4 text-sm font-medium text-white">
                        {editState.index !== null
                            ? "Edit Sensor"
                            : "Add New Sensor"}
                    </h5>
                    <div className="space-y-3">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-white/70">
                                Sensor Type{" "}
                                <span className="text-red-400">*</span>
                            </label>
                            <input
                                value={formData.sensorType}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        sensorType: e.target.value
                                    })
                                }
                                placeholder="e.g., LIDAR, Ultrasonic"
                                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-white/20 focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-white/70">
                                    Model
                                </label>
                                <input
                                    value={formData.model}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            model: e.target.value
                                        })
                                    }
                                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-white/20 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-white/70">
                                    Quantity{" "}
                                    <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.quantity}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            quantity:
                                                parseInt(e.target.value) || 1
                                        })
                                    }
                                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-white/20 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-white/70">
                                Specifications
                            </label>
                            <textarea
                                value={formData.specifications}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        specifications: e.target.value
                                    })
                                }
                                rows={2}
                                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-white/20 focus:outline-none"
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleSaveForm}
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                            >
                                {editState.index !== null ? "Update" : "Add"}
                            </button>
                            <button
                                onClick={() =>
                                    setEditState({ index: null, isOpen: false })
                                }
                                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/10 hover:text-white"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sensor List */}
            <div className="space-y-2">
                {sensors.length > 0 ? (
                    sensors.map((sensor, index) => (
                        <div
                            key={index}
                            className="rounded-lg border border-white/10 bg-white/5 p-4"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-white">
                                        {sensor.sensorType}
                                    </p>
                                    {sensor.model && (
                                        <p className="mt-1 text-sm text-white/70">
                                            Model: {sensor.model}
                                        </p>
                                    )}
                                    <p className="mt-1 text-sm text-white/50">
                                        Quantity: {sensor.quantity}
                                    </p>
                                    {sensor.specifications && (
                                        <p className="mt-2 text-xs text-white/50">
                                            {sensor.specifications}
                                        </p>
                                    )}
                                </div>
                                {/* Only show actions if main editing is on and form is closed */}
                                {isEditing && !editState.isOpen && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openForm(index);
                                            }}
                                            className="text-blue-400 hover:text-blue-300"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeSensor(index);
                                            }}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-zinc-500">
                        No sensors configured
                    </p>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// 4. QC TEMPLATE SELECTOR
//    - Simplified render logic using sub-components
// ============================================================================

interface QCTemplateSelectorProps {
    fleetId: string;
    currentTemplateId?: string;
}

const QCTemplateSelector = ({
    fleetId,
    currentTemplateId
}: QCTemplateSelectorProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
        currentTemplateId || ""
    );
    const queryClient = useQueryClient();

    const { data: templates, isLoading: templatesLoading } = useQuery({
        queryKey: ["qcTemplates"],
        queryFn: () => getAllTemplates({ isActive: true })
    });

    const updateQCTemplateMutation = useMutation(
        (templateId: string) =>
            linkFleetQCTemplateFn({ fleetId, qcTemplateId: templateId }),
        {
            onSuccess: () => {
                toast.success("QC Template updated successfully!");
                queryClient.invalidateQueries(["fleets"]);
                setIsEditing(false);
            },
            onError: (error: any) => {
                toast.error(
                    error.response?.data?.message ||
                        "Failed to update QC template"
                );
            }
        }
    );

    const handleCancel = () => {
        setSelectedTemplateId(currentTemplateId || "");
        setIsEditing(false);
    };

    const currentTemplate = templates?.find(
        (t: QCFormTemplate) => t.id === currentTemplateId
    );

    return (
        <div>
            <HeaderSection
                title="QC Template Assignment"
                subtitle="Link a QC template to this fleet for quality control inspections."
                isEditing={isEditing}
                onEdit={() => setIsEditing(true)}
                onCancel={handleCancel}
                onSave={() =>
                    updateQCTemplateMutation.mutate(selectedTemplateId)
                }
                isLoading={updateQCTemplateMutation.isLoading}
            />

            {!isEditing ? (
                // View Mode
                <div>
                    {currentTemplate ? (
                        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                            <p className="text-sm font-semibold text-white">
                                {currentTemplate.name}
                            </p>
                            <p className="mt-1 text-sm text-white/50">
                                Version {currentTemplate.version} •{" "}
                                {currentTemplate.totalQuestions} questions
                            </p>
                            {currentTemplate.description && (
                                <p className="mt-2 text-xs text-white/50">
                                    {currentTemplate.description}
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-500">
                            No QC template assigned
                        </p>
                    )}
                </div>
            ) : (
                // Edit Mode
                <div>
                    {templatesLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <LoadingSpinner className="h-6 w-6 animate-spin fill-white text-background" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* "None" Option */}
                            <TemplateOption
                                label="None"
                                description="No QC template assigned"
                                selected={selectedTemplateId === ""}
                                onClick={() => setSelectedTemplateId("")}
                            />

                            {/* Template Options */}
                            {templates?.map((template: QCFormTemplate) => (
                                <TemplateOption
                                    key={template.id}
                                    label={template.name}
                                    description={`Version ${template.version} • ${template.totalQuestions} questions`}
                                    subDescription={template.description}
                                    selected={
                                        selectedTemplateId === template.id
                                    }
                                    onClick={() =>
                                        setSelectedTemplateId(template.id)
                                    }
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// 5. REUSABLE SUB-COMPONENTS
//    - These components handle the UI rendering, keeping the logic files clean.
// ============================================================================

const TabButton = ({ isActive, onClick, icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            isActive
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white"
        }`}
    >
        {icon}
        {label}
    </button>
);

// Standardized Header for all 3 sections
const HeaderSection = ({
    title,
    subtitle,
    isEditing,
    onEdit,
    onCancel,
    onSave,
    isLoading,
    onDownload,
    showDownload = false
}: any) => (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="mt-1 text-sm text-white/50">{subtitle}</p>
        </div>
        {!isEditing ? (
            <div className="flex w-full gap-2 sm:w-auto">
                {showDownload && (
                    <button
                        onClick={onDownload}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white sm:flex-none"
                    >
                        <Download className="h-4 w-4" />
                        Download Excel
                    </button>
                )}
                <button
                    onClick={onEdit}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 sm:flex-none"
                >
                    <Edit2 className="h-4 w-4" />
                    Edit
                </button>
            </div>
        ) : (
            <div className="flex w-full gap-2 sm:w-auto">
                <button
                    onClick={onCancel}
                    disabled={isLoading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50 sm:flex-none"
                >
                    <X className="h-4 w-4" />
                    Cancel
                </button>
                <button
                    onClick={onSave}
                    disabled={isLoading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 sm:flex-none"
                >
                    {isLoading ? (
                        <LoadingSpinner className="h-4 w-4 animate-spin" />
                    ) : (
                        <Check className="h-4 w-4" />
                    )}
                    Save Changes
                </button>
            </div>
        )}
    </div>
);

// Generic List Render Component for Parts
const PartListSection = ({
    title,
    category,
    parts,
    isEditing,
    isAddingAny,
    onAddClick,
    onRemove,
    onUpdateQty
}: any) => (
    <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-medium text-white/70">
                {title} ({parts.length})
            </h4>
            {isEditing && !isAddingAny && (
                <button
                    onClick={onAddClick}
                    className="flex items-center gap-2 rounded-md border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                    <Plus className="h-4 w-4" />
                    Add Part
                </button>
            )}
        </div>

        {parts.length > 0 ? (
            <div className="space-y-2">
                {parts.map((part: Part) => (
                    <div
                        key={part.itemId}
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
                    >
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">
                                {part.name}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-xs tracking-wide text-white/50">
                                ID: {part.itemId}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                            {isEditing ? (
                                <>
                                    <input
                                        type="number"
                                        min="1"
                                        value={part.quantity}
                                        onChange={(e) =>
                                            onUpdateQty(
                                                part.itemId,
                                                parseInt(e.target.value) || 1,
                                                category
                                            )
                                        }
                                        className="w-16 rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-center text-sm text-white focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
                                    />
                                    <span className="min-w-[3rem] text-xs text-white/50">
                                        {part.unit}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemove(part.itemId, category);
                                        }}
                                        className="text-red-400 transition-colors hover:text-red-300"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </>
                            ) : (
                                <span className="text-sm text-white/50">
                                    {part.quantity} {part.unit}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-sm text-zinc-500">
                No {category} parts configured
            </p>
        )}
    </div>
);

// Generic Search Modal for Parts
const PartSearchModal = ({ category, onClose, onAdd, existingParts }: any) => {
    const [searchQuery, setSearchQuery] = useState("");

    // Map our internal category to the API category string
    const apiCategory =
        category === "electrical" ? "electronics" : "mechanical";

    const { data } = useQuery(
        ["inventoryItems", apiCategory],
        () => fetchInventoryItems({ category: apiCategory, limit: 1000 }),
        {
            // Keep data fresh to avoid refetching immediately
            staleTime: 60 * 1000
        }
    );

    const filteredItems = data?.items.filter(
        (item: InventoryItem) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.itemId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
                <h5 className="text-sm font-medium capitalize text-white">
                    Add {category} Part
                </h5>
                <button
                    onClick={onClose}
                    className="text-white/50 hover:text-white"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
            <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or ID..."
                className="mb-3 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
            />
            <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2">
                {filteredItems?.map((item: InventoryItem) => (
                    <button
                        key={item.itemId}
                        onClick={() => onAdd(item)}
                        disabled={existingParts.some(
                            (p: Part) => p.itemId === item.itemId
                        )}
                        className="flex w-full items-center justify-between gap-3 rounded-md p-2.5 text-left transition-all hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">
                                {item.name}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-xs tracking-wide text-white/50">
                                ID: {item.itemId}
                            </p>
                        </div>
                        <p className="shrink-0 text-xs text-white/50">
                            Stock: {item.quantity} {item.unit}
                        </p>
                    </button>
                ))}
            </div>
        </div>
    );
};

// QC Template Option Component
const TemplateOption = ({
    label,
    description,
    subDescription,
    selected,
    onClick
}: any) => (
    <button
        onClick={onClick}
        className={`w-full rounded-lg border p-4 text-left transition-colors ${
            selected
                ? "border-white/20 bg-white/10"
                : "border-white/10 bg-white/5 hover:bg-white/10"
        }`}
    >
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="mt-0.5 text-sm text-white/50">{description}</p>
                {subDescription && (
                    <p className="mt-1 text-xs text-white/50">
                        {subDescription}
                    </p>
                )}
            </div>
            {selected && <Check className="h-5 w-5 text-white" />}
        </div>
    </button>
);
