import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { toast } from "react-toastify";
import { Settings2, Edit, CheckCircle2, Package, AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
import { RobotType } from "@/data/types";
import {
    getManufacturingDataFn,
    updateManufacturingDataFn,
    completeBOMInventoryFn,
    getPartsConsumedFn,
    type ManufacturingData
} from "../../services/robotsService";
import ManufacturingDataForm from "./ManufacturingDataForm";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { PartsConsumptionHistory } from "./PartsConsumptionHistory";

const RobotManufacturingData = () => {
    const { robot } = useOutletContext<{ robot: RobotType }>();
    const queryClient = useQueryClient();
    const [isEditMode, setIsEditMode] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);

    // Fetch manufacturing data
    const { data, isLoading, isError } = useQuery(
        ["manufacturingData", robot.id],
        () => getManufacturingDataFn(robot.id),
        {
            staleTime: 5 * 60 * 1000 // Cache for 5 minutes
        }
    );

    // Update mutation
    const updateMutation = useMutation(
        (formData: any) => updateManufacturingDataFn(robot.id, formData),
        {
            onSuccess: () => {
                toast.success("Manufacturing data updated successfully");
                queryClient.invalidateQueries(["manufacturingData", robot.id]);
                setIsEditMode(false);
            },
            onError: (error: any) => {
                toast.error(
                    error.response?.data?.message || "Failed to update"
                );
            }
        }
    );

    // Complete BOM Inventory mutation
    const completeBOMMutation = useMutation(
        () => completeBOMInventoryFn(robot.id),
        {
            onSuccess: (response) => {
                const { updatedParts, stillInsufficientParts } = response;

                // Handle case when no parts were updated
                if (updatedParts.length === 0 && stillInsufficientParts.length === 0) {
                    toast.info("All parts are already complete or no Flo parts to check");
                    setShowCompleteModal(false);
                    return;
                }

                // Parts were successfully updated
                if (updatedParts.length > 0) {
                    toast.success(
                        `Successfully updated ${updatedParts.length} part(s) to sufficient`
                    );
                }

                // Some parts are still insufficient
                if (stillInsufficientParts.length > 0) {
                    const partNames = stillInsufficientParts
                        .slice(0, 3)
                        .map((p: any) => p.name)
                        .join(", ");
                    const remaining = stillInsufficientParts.length > 3
                        ? ` and ${stillInsufficientParts.length - 3} more`
                        : "";

                    toast.warning(
                        `Insufficient inventory: ${partNames}${remaining}`,
                        { autoClose: 5000 }
                    );
                } else if (updatedParts.length > 0) {
                    toast.success("BOM is now complete!");
                }

                // Refresh both manufacturing data and parts consumed
                queryClient.invalidateQueries(["manufacturingData", robot.id]);
                queryClient.invalidateQueries(["partsConsumed", robot.id]);
                setShowCompleteModal(false);
            },
            onError: (error: any) => {
                toast.error(
                    error.response?.data?.message || "Failed to complete BOM inventory"
                );
                setShowCompleteModal(false);
            }
        }
    );

    const manufacturingData = data?.manufacturingData;
    const manufacturedDate = data?.manufacturedDate;
    const insufficientPartsCount = data?.insufficientPartsCount || 0;
    const hasInsufficientParts = data?.hasInsufficientParts || false;

    const hasData =
        manufacturingData && Object.keys(manufacturingData).length > 0;

    // Show alert when page loads if BOM is incomplete
    useEffect(() => {
        if (!isLoading && hasInsufficientParts) {
            toast.warning(
                `BOM Incomplete: ${insufficientPartsCount} part${insufficientPartsCount !== 1 ? 's' : ''} need inventory update`,
                {
                    autoClose: 5000,
                    toastId: `bom-incomplete-${robot.id}` // Prevent duplicate toasts
                }
            );
        }
    }, [isLoading, hasInsufficientParts, insufficientPartsCount, robot.id]);

    // Handle ESC key to close modal
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && showCompleteModal && !completeBOMMutation.isLoading) {
                setShowCompleteModal(false);
            }
        };

        if (showCompleteModal) {
            document.addEventListener("keydown", handleEscape);
            return () => document.removeEventListener("keydown", handleEscape);
        }
    }, [showCompleteModal, completeBOMMutation.isLoading]);

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4 bg-blue-900/25 py-6 md:gap-8 md:px-8">
                <div className="m-auto flex h-full w-full flex-col overflow-hidden rounded-lg bg-slate-800/30 md:w-[75%]">
                    <div className="flex min-h-[30vh] items-center justify-center">
                        <div className="flex flex-col items-center justify-center gap-4">
                            <LoadingSpinner className="h-8 w-8 animate-spin fill-blue-500 text-gray-600" />
                            <span className="text-sm text-gray-400">
                                Loading Manufacturing Data...
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col gap-4 bg-blue-900/25 py-6 md:gap-8 md:px-8">
                <div className="m-auto flex h-full w-full flex-col overflow-hidden rounded-lg bg-slate-800/30 md:w-[75%]">
                    <div className="p-6 text-center text-red-400">
                        Error loading manufacturing data
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 bg-blue-900/25 py-6 md:gap-8 md:px-8">
            <div className="m-auto flex h-full w-full flex-col overflow-hidden rounded-lg bg-slate-800/30 md:w-[75%]">
                {/* Red Alert Banner for Incomplete BOM */}
                {hasInsufficientParts && (
                    <div className="flex items-start gap-3 border-b border-red-500 bg-red-500/10 p-4">
                        <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-red-400">
                                BOM Incomplete - Inventory Update Required
                            </h3>
                            <p className="mt-1 text-xs text-red-300/80">
                                {insufficientPartsCount} part{insufficientPartsCount !== 1 ? 's' : ''} need{insufficientPartsCount === 1 ? 's' : ''} inventory update. Please update the inventory and complete the BOM for this robot.
                            </p>
                        </div>
                    </div>
                )}

                {/* Header Section */}
                <div className="flex w-full items-center justify-between gap-3 border-b border-gray-700 bg-slate-900/50 p-4">
                    <h2 className="text-xl font-bold text-white">Manufacturing Data</h2>
                    <div className="flex items-center gap-3">
                        {!isEditMode && (
                            <button
                                onClick={() => setShowCompleteModal(true)}
                                disabled={completeBOMMutation.isLoading}
                                className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                                    hasInsufficientParts
                                        ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                        : 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                }`}
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                <span>
                                    {hasInsufficientParts
                                        ? `Complete Inventory (${insufficientPartsCount})`
                                        : 'Update BOM Inventory'
                                    }
                                </span>
                            </button>
                        )}
                        {!isEditMode && hasData && (
                            <button
                                onClick={() => setIsEditMode(true)}
                                className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/10"
                            >
                                <Edit className="h-4 w-4" />
                                <span>Edit</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                {isEditMode ? (
                    <div className="w-full">
                        {/* Manufacturing Form Section */}
                        <div className="border-b border-gray-700 p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">
                                    Manufacturing Information
                                </h3>
                            </div>
                            <ManufacturingDataForm
                                initialData={manufacturingData}
                                onSubmit={updateMutation.mutate}
                                isLoading={updateMutation.isLoading}
                                onCancel={
                                    hasData
                                        ? () => setIsEditMode(false)
                                        : undefined
                                }
                            />
                        </div>

                        {/* BOM Summary Card - Red theme when incomplete */}
                        <div className={`border-b p-6 ${
                            hasInsufficientParts
                                ? 'border-red-500 bg-red-500/5'
                                : 'border-gray-700 bg-slate-900/30'
                        }`}>
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h3 className={`text-sm font-bold uppercase tracking-widest ${
                                        hasInsufficientParts ? 'text-red-400' : 'text-white/60'
                                    }`}>
                                        Bill of Materials (BOM)
                                    </h3>
                                    {hasInsufficientParts && (
                                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                                            {insufficientPartsCount}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setShowCompleteModal(true)}
                                    disabled={completeBOMMutation.isLoading}
                                    className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                                        hasInsufficientParts
                                            ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                            : 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                    }`}
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>
                                        {hasInsufficientParts
                                            ? `Complete Inventory (${insufficientPartsCount})`
                                            : 'Update BOM Inventory'
                                        }
                                    </span>
                                </button>
                            </div>

                            <BOMSummaryCards
                                robotId={robot.id}
                                insufficientCount={insufficientPartsCount}
                            />
                        </div>

                        {/* Parts Consumption History (BOM) */}
                        <PartsConsumptionHistory robotId={robot.id} />
                    </div>
                ) : (
                    <div className="w-full">
                        {/* Metadata Section */}
                        {hasData && (
                            <div className="border-b border-gray-700 p-6">
                                <ManufacturingHeaderView
                                    data={manufacturingData}
                                    manufacturedDate={manufacturedDate}
                                />
                            </div>
                        )}

                        {/* Parts Consumption History (BOM) */}
                        <PartsConsumptionHistory robotId={robot.id} />

                        {/* Technical Specs Section */}
                        {hasData && (
                            <div className="border-t border-gray-700 p-6">
                                <ManufacturingSpecsView
                                    data={manufacturingData}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Complete Inventory Confirmation Modal */}
                {showCompleteModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget && !completeBOMMutation.isLoading) {
                                setShowCompleteModal(false);
                            }
                        }}
                    >
                        <div className="w-full max-w-md rounded-lg border border-border bg-slate-800 p-6 shadow-xl">
                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-white">
                                    {hasInsufficientParts ? 'Complete BOM Inventory' : 'Update BOM Inventory'}
                                </h3>
                                <p className="mt-2 text-sm text-gray-400">
                                    {hasInsufficientParts ? (
                                        <>
                                            This will re-check inventory levels for {insufficientPartsCount} insufficient part{insufficientPartsCount !== 1 ? 's' : ''}.
                                            Parts with sufficient inventory will be marked as complete and inventory will be deducted.
                                        </>
                                    ) : (
                                        <>
                                            This will re-check inventory levels for all Flo parts in the BOM.
                                            If any parts now have sufficient inventory, they will be marked as complete and inventory will be deducted.
                                        </>
                                    )}
                                </p>
                            </div>

                            <div className="mb-6 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
                                <p className="text-xs text-yellow-400">
                                    <strong>Note:</strong> Only parts from Flo inventory will be rechecked.
                                    External parts (GKX/Abhirup) are not affected.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowCompleteModal(false)}
                                    disabled={completeBOMMutation.isLoading}
                                    className="rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-semibold text-zinc-300 transition-all hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => completeBOMMutation.mutate()}
                                    disabled={completeBOMMutation.isLoading}
                                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {completeBOMMutation.isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <svg
                                                className="h-4 w-4 animate-spin"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            Checking...
                                        </span>
                                    ) : (
                                        hasInsufficientParts ? "Complete Inventory" : "Update BOM Inventory"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Header View Component (Identity/Dates/Status)
const ManufacturingHeaderView = ({
    data,
    manufacturedDate
}: {
    data: ManufacturingData;
    manufacturedDate?: string;
}) => {
    const formatDate = (dateString?: string) => {
        if (!dateString) return "Not set";
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    };

    const getPartnerDisplay = () => {
        if (
            data.manufacturingPartner === "Others" &&
            data.manufacturingPartnerOther
        ) {
            return data.manufacturingPartnerOther;
        }
        return data.manufacturingPartner || "Not set";
    };

    return (
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Manufacturing Partner */}
            <div className="rounded-md border border-border bg-gray-700/45 p-4">
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Manufacturing Partner
                </label>
                <p className="text-sm font-semibold text-white">
                    {getPartnerDisplay()}
                </p>
            </div>

            {/* Manufactured Date (from robot creation) */}
            <div className="rounded-md border border-border bg-gray-700/45 p-4">
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Manufactured Date
                </label>
                <p className="font-mono text-sm font-semibold text-white">
                    {formatDate(manufacturedDate)}
                </p>
            </div>

            {/* Shipping Date */}
            <div className="rounded-md border border-border bg-gray-700/45 p-4">
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Shipping Date
                </label>
                <p className="font-mono text-sm font-semibold text-white">
                    {formatDate(data.shippingDate)}
                </p>
            </div>

            {/* Data Collection */}
            <div className="rounded-md border border-border bg-gray-700/45 p-4">
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Data Collection
                </label>
                <div>
                    <span
                        className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium ${
                            data.dataCollection
                                ? "border-green-500/30 bg-green-500/10 text-green-400"
                                : "border-red-500/30 bg-red-500/10 text-red-400"
                        }`}
                    >
                        {data.dataCollection ? "ENABLED" : "DISABLED"}
                    </span>
                </div>
            </div>

            {/* Invoicing Status */}
            {data.invoicingStatus && (
                <div className="rounded-md border border-border bg-gray-700/45 p-4">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                        Invoicing Status
                    </label>
                    <span className="inline-flex items-center rounded-md border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                        {data.invoicingStatus}
                    </span>
                </div>
            )}
        </div>
    );
};

// Specs View Component (Features/Notes)
const ManufacturingSpecsView = ({ data }: { data: ManufacturingData }) => {
    return (
        <div className="grid w-full grid-cols-1 gap-4">
            {/* Features */}
            {data.features && (
                <div className="rounded-md border border-border bg-gray-700/45 p-4">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                        Features
                    </label>
                    <p className="whitespace-pre-wrap font-mono text-sm text-white">
                        {data.features}
                    </p>
                </div>
            )}

            {/* Additional Inputs */}
            {data.additionalInputs && (
                <div className="rounded-md border border-border bg-gray-700/45 p-4">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                        Additional Inputs
                    </label>
                    <p className="whitespace-pre-wrap font-mono text-sm text-white">
                        {data.additionalInputs}
                    </p>
                </div>
            )}
        </div>
    );
};

// BOM Summary Cards Component
const BOMSummaryCards = ({
    robotId,
    insufficientCount
}: {
    robotId: string;
    insufficientCount: number;
}) => {
    const { data: partsData, isLoading } = useQuery(
        ["partsConsumed", robotId],
        () => getPartsConsumedFn(robotId),
        {
            staleTime: 5 * 60 * 1000
        }
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <LoadingSpinner className="h-6 w-6 animate-spin fill-blue-500 text-gray-600" />
            </div>
        );
    }

    // Backend returns { electrical, mechanical, totalQuantity } structure
    const parts = [
        ...(partsData?.electrical || []),
        ...(partsData?.mechanical || [])
    ];

    // Calculate statistics
    const totalParts = parts.length;

    // FALLBACK: If Flo part has no inventoryStatus, treat as insufficient
    const getEffectiveStatus = (part: any) => {
        if (part.inventoryStatus) {
            return part.inventoryStatus;
        }
        // If no status and source is Flo, assume insufficient (inventory not deducted)
        return part.source === 'Flo' ? 'insufficient' : 'external';
    };

    const sufficientParts = parts.filter((p: any) => getEffectiveStatus(p) === 'sufficient').length;
    const insufficientParts = parts.filter((p: any) => getEffectiveStatus(p) === 'insufficient').length;
    const externalParts = parts.filter((p: any) => getEffectiveStatus(p) === 'external').length;
    const mechanicalParts = parts.filter((p: any) => p.purpose === 'mechanical').length;
    const electricalParts = parts.filter((p: any) => p.purpose === 'electrical').length;

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Total Parts */}
            <div className="rounded-md border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-3">
                    <div className="rounded-md bg-white/5 p-2">
                        <Package className="h-5 w-5 text-white/60" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                            Total Parts
                        </p>
                        <p className="text-2xl font-bold text-white">{totalParts}</p>
                    </div>
                </div>
            </div>

            {/* Sufficient Parts */}
            <div className="rounded-md border border-green-500/20 bg-green-500/5 p-4">
                <div className="flex items-center gap-3">
                    <div className="rounded-md bg-green-500/10 p-2">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-green-400/70">
                            Sufficient
                        </p>
                        <p className="text-2xl font-bold text-green-400">{sufficientParts}</p>
                    </div>
                </div>
            </div>

            {/* Insufficient Parts */}
            {insufficientParts > 0 && (
                <div className="rounded-md border border-red-500/20 bg-red-500/5 p-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-md bg-red-500/10 p-2">
                            <AlertCircle className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/70">
                                Insufficient
                            </p>
                            <p className="text-2xl font-bold text-red-400">{insufficientParts}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* External Parts */}
            {externalParts > 0 && (
                <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-md bg-blue-500/10 p-2">
                            <ExternalLink className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400/70">
                                External
                            </p>
                            <p className="text-2xl font-bold text-blue-400">{externalParts}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Mechanical Parts */}
            <div className="rounded-md border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-3">
                    <div className="rounded-md bg-white/5 p-2">
                        <Settings2 className="h-5 w-5 text-white/60" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                            Mechanical
                        </p>
                        <p className="text-2xl font-bold text-white">{mechanicalParts}</p>
                    </div>
                </div>
            </div>

            {/* Electrical Parts */}
            <div className="rounded-md border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-3">
                    <div className="rounded-md bg-white/5 p-2">
                        <Package className="h-5 w-5 text-white/60" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                            Electrical
                        </p>
                        <p className="text-2xl font-bold text-white">{electricalParts}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RobotManufacturingData;
