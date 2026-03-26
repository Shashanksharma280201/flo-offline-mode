import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { Plus, X, Package, AlertCircle, Save } from "lucide-react";
import { toast } from "react-toastify";
import { fetchInventoryItems, type InventoryItem } from "@/api/inventoryApi";
import { Button } from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface SelectedPart {
    itemId: string;
    name: string;
    quantity: number;
    unit: string;
}

interface PartsSelectorProps {
    fleetId: string;
    initialElectricalParts?: SelectedPart[];
    initialMechanicalParts?: SelectedPart[];
    onSave: (
        electrical: SelectedPart[],
        mechanical: SelectedPart[]
    ) => Promise<void>;
}

export const PartsSelector = ({
    fleetId,
    initialElectricalParts = [],
    initialMechanicalParts = [],
    onSave
}: PartsSelectorProps) => {
    const queryClient = useQueryClient();
    const [electricalParts, setElectricalParts] = useState<SelectedPart[]>(
        initialElectricalParts
    );
    const [mechanicalParts, setMechanicalParts] = useState<SelectedPart[]>(
        initialMechanicalParts
    );
    const [showElectricalSelector, setShowElectricalSelector] = useState(false);
    const [showMechanicalSelector, setShowMechanicalSelector] = useState(false);

    // Fetch electrical items
    const { data: electricalItems, isLoading: electricalLoading } = useQuery(
        ["inventoryItems", "electronics"],
        () => fetchInventoryItems({ category: "electronics", limit: 1000 }),
        {
            staleTime: 5 * 60 * 1000
        }
    );

    // Fetch mechanical items
    const { data: mechanicalItems, isLoading: mechanicalLoading } = useQuery(
        ["inventoryItems", "mechanical"],
        () => fetchInventoryItems({ category: "mechanical", limit: 1000 }),
        {
            staleTime: 5 * 60 * 1000
        }
    );

    const saveMutation = useMutation(
        () => onSave(electricalParts, mechanicalParts),
        {
            onSuccess: () => {
                toast.success("Parts configuration saved successfully");
                queryClient.invalidateQueries(["fleet", fleetId]);
            },
            onError: (error: any) => {
                toast.error(
                    error.response?.data?.message ||
                        "Failed to save configuration"
                );
            }
        }
    );

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
        setShowElectricalSelector(false);
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
        setShowMechanicalSelector(false);
    };

    const updateQuantity = (
        type: "electrical" | "mechanical",
        itemId: string,
        newQuantity: number
    ) => {
        if (newQuantity < 1) return;

        if (type === "electrical") {
            setElectricalParts(
                electricalParts.map((p) =>
                    p.itemId === itemId ? { ...p, quantity: newQuantity } : p
                )
            );
        } else {
            setMechanicalParts(
                mechanicalParts.map((p) =>
                    p.itemId === itemId ? { ...p, quantity: newQuantity } : p
                )
            );
        }
    };

    const removePart = (type: "electrical" | "mechanical", itemId: string) => {
        if (type === "electrical") {
            setElectricalParts(
                electricalParts.filter((p) => p.itemId !== itemId)
            );
        } else {
            setMechanicalParts(
                mechanicalParts.filter((p) => p.itemId !== itemId)
            );
        }
    };

    const getAvailableQuantity = (
        itemId: string,
        category: "electronics" | "mechanical"
    ) => {
        const items =
            category === "electronics"
                ? electricalItems?.items
                : mechanicalItems?.items;
        const item = items?.find((i) => i.itemId === itemId);
        return item?.quantity || 0;
    };

    return (
        <div className="space-y-6">
            {/* Electrical Parts Section */}
            <div className="rounded-lg border border-blue-500/30 bg-slate-800/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-medium uppercase tracking-wide text-blue-400">
                            Electrical Parts (Reference Only)
                        </h4>
                        <p className="mt-1 text-xs text-slate-400">
                            These parts are for reference and must be recorded
                            manually during manufacturing
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            setShowElectricalSelector(!showElectricalSelector)
                        }
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Part
                    </Button>
                </div>

                {showElectricalSelector && (
                    <div className="mb-4 rounded-md border border-slate-700 bg-slate-900/50 p-3">
                        <p className="mb-2 text-xs font-medium text-slate-300">
                            Select Electrical Part:
                        </p>
                        {electricalLoading ? (
                            <LoadingSpinner className="h-5 w-5 animate-spin" />
                        ) : (
                            <div className="max-h-48 space-y-1 overflow-y-auto">
                                {electricalItems?.items.map((item) => (
                                    <button
                                        key={item.itemId}
                                        onClick={() => addElectricalPart(item)}
                                        className="flex w-full items-center justify-between rounded-md p-2 text-left text-sm hover:bg-slate-800"
                                    >
                                        <span className="text-white">
                                            {item.name}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            Available: {item.quantity}{" "}
                                            {item.unit}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {electricalParts.length === 0 ? (
                    <div className="rounded-md bg-slate-700/50 p-3 text-center text-sm text-slate-400">
                        No electrical parts configured
                    </div>
                ) : (
                    <div className="space-y-2">
                        {electricalParts.map((part) => {
                            const available = getAvailableQuantity(
                                part.itemId,
                                "electronics"
                            );
                            const isLowStock = available < part.quantity * 5;
                            return (
                                <div
                                    key={part.itemId}
                                    className="flex items-center justify-between rounded-md border border-slate-700 bg-slate-900/50 p-3"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium text-white">
                                            {part.name}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            ID: {part.itemId} • Available:{" "}
                                            {available} {part.unit}
                                        </p>
                                        {isLowStock && (
                                            <div className="mt-1 flex items-center gap-1 text-xs text-orange-400">
                                                <AlertCircle className="h-3 w-3" />
                                                Low inventory
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="1"
                                            value={part.quantity}
                                            onChange={(e) =>
                                                updateQuantity(
                                                    "electrical",
                                                    part.itemId,
                                                    parseInt(e.target.value) ||
                                                        1
                                                )
                                            }
                                            className="w-16 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-center text-sm text-white"
                                        />
                                        <span className="text-xs text-slate-400">
                                            {part.unit}
                                        </span>
                                        <button
                                            onClick={() =>
                                                removePart(
                                                    "electrical",
                                                    part.itemId
                                                )
                                            }
                                            className="ml-2 text-red-400 hover:text-red-300"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Mechanical Parts Section */}
            <div className="rounded-lg border border-orange-500/30 bg-slate-800/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-medium uppercase tracking-wide text-orange-400">
                            Mechanical Parts (Reference Only)
                        </h4>
                        <p className="mt-1 text-xs text-slate-400">
                            These parts are for reference and must be recorded
                            manually during manufacturing
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            setShowMechanicalSelector(!showMechanicalSelector)
                        }
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Part
                    </Button>
                </div>

                {showMechanicalSelector && (
                    <div className="mb-4 rounded-md border border-slate-700 bg-slate-900/50 p-3">
                        <p className="mb-2 text-xs font-medium text-slate-300">
                            Select Mechanical Part:
                        </p>
                        {mechanicalLoading ? (
                            <LoadingSpinner className="h-5 w-5 animate-spin" />
                        ) : (
                            <div className="max-h-48 space-y-1 overflow-y-auto">
                                {mechanicalItems?.items.map((item) => (
                                    <button
                                        key={item.itemId}
                                        onClick={() => addMechanicalPart(item)}
                                        className="flex w-full items-center justify-between rounded-md p-2 text-left text-sm hover:bg-slate-800"
                                    >
                                        <span className="text-white">
                                            {item.name}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            Available: {item.quantity}{" "}
                                            {item.unit}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {mechanicalParts.length === 0 ? (
                    <div className="rounded-md bg-slate-700/50 p-3 text-center text-sm text-slate-400">
                        No mechanical parts configured
                    </div>
                ) : (
                    <div className="space-y-2">
                        {mechanicalParts.map((part) => (
                            <div
                                key={part.itemId}
                                className="flex items-center justify-between rounded-md border border-slate-700 bg-slate-900/50 p-3"
                            >
                                <div className="flex-1">
                                    <p className="font-medium text-white">
                                        {part.name}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        ID: {part.itemId}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        value={part.quantity}
                                        onChange={(e) =>
                                            updateQuantity(
                                                "mechanical",
                                                part.itemId,
                                                parseInt(e.target.value) || 1
                                            )
                                        }
                                        className="w-16 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-center text-sm text-white"
                                    />
                                    <span className="text-xs text-slate-400">
                                        {part.unit}
                                    </span>
                                    <button
                                        onClick={() =>
                                            removePart(
                                                "mechanical",
                                                part.itemId
                                            )
                                        }
                                        className="ml-2 text-red-400 hover:text-red-300"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isLoading}
                    className="flex items-center gap-2"
                >
                    <Save className="h-4 w-4" />
                    {saveMutation.isLoading
                        ? "Saving..."
                        : "Save Configuration"}
                </Button>
            </div>
        </div>
    );
};
