import { useEffect, useState } from "react";
import { MdClose } from "react-icons/md";
import { CheckCircle } from "lucide-react";
import { BOMPart } from "../services/robotsService";
import { PartsConsumption } from "../../fleet/services/fleetService";
import { fetchInventoryItem, InventoryItem } from "../../../api/inventoryApi";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";

type BOMVerificationModalProps = {
    fleetName: string;
    partsConsumption: PartsConsumption;
    onConfirm: (bomParts: BOMPart[]) => void;
    onCancel: () => void;
};

type PartWithInventory = {
    itemId: string;
    name: string;
    quantity: number;
    unit: string;
    purpose: 'electrical' | 'mechanical';
    source: 'Flo' | 'GKX' | 'Abhirup';
    availableQty?: number;
    loading?: boolean;
    error?: string;
};

/**
 * BOM Verification Modal - Shows all fleet parts with source selection
 * Displays inventory availability for Flo parts
 */
const BOMVerificationModal = ({
    fleetName,
    partsConsumption,
    onConfirm,
    onCancel
}: BOMVerificationModalProps) => {
    const [parts, setParts] = useState<PartWithInventory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        initializeParts();
    }, [partsConsumption]);

    const initializeParts = async () => {
        const allParts: PartWithInventory[] = [
            ...partsConsumption.electrical.map(p => ({
                ...p,
                purpose: 'electrical' as const,
                source: 'Flo' as const,
                loading: true
            })),
            ...partsConsumption.mechanical.map(p => ({
                ...p,
                purpose: 'mechanical' as const,
                source: 'Flo' as const,
                loading: true
            }))
        ];

        setParts(allParts);
        setLoading(false);

        // Fetch inventory for all parts
        for (const part of allParts) {
            fetchPartInventory(part.itemId);
        }
    };

    const fetchPartInventory = async (itemId: string) => {
        try {
            const inventory = await fetchInventoryItem(itemId.toUpperCase());
            setParts(prev => prev.map(p =>
                p.itemId === itemId
                    ? {
                        ...p,
                        availableQty: inventory.quantity,
                        loading: false,
                        error: undefined
                    }
                    : p
            ));
        } catch (error: any) {
            setParts(prev => prev.map(p =>
                p.itemId === itemId
                    ? {
                        ...p,
                        loading: false,
                        error: error.response?.status === 404
                            ? 'Not found in inventory'
                            : 'Failed to fetch'
                    }
                    : p
            ));
        }
    };

    const handleSourceChange = (itemId: string, source: 'Flo' | 'GKX' | 'Abhirup') => {
        setParts(prev => prev.map(p =>
            p.itemId === itemId ? { ...p, source } : p
        ));
    };

    const handleConfirm = () => {
        const bomParts: BOMPart[] = parts.map(p => ({
            itemId: p.itemId,
            name: p.name,
            quantity: p.quantity,
            unit: p.unit,
            source: p.source,
            purpose: p.purpose
        }));
        onConfirm(bomParts);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4">
            <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg border border-border bg-background">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border bg-gray-800/25 p-6">
                    <div>
                        <h2 className="text-2xl font-semibold text-white">
                            BOM Verification
                        </h2>
                        <p className="mt-1 text-sm text-secondary">
                            Fleet: <span className="font-medium text-white">{fleetName}</span>
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="rounded-md p-1 hover:bg-gray-700"
                    >
                        <MdClose className="h-6 w-6 text-white" />
                    </button>
                </div>

                {/* Parts List - Side by Side */}
                <div className="flex h-[60vh] border-t border-border">
                    {loading ? (
                        <div className="flex flex-1 items-center justify-center">
                            <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-background" />
                        </div>
                    ) : (
                        <>
                            {/* Left Section: Electrical Parts */}
                            <div className="flex-1 overflow-y-auto border-r border-border p-6">
                                <h3 className="mb-4 text-lg font-semibold text-green-400">
                                    Electrical Parts
                                </h3>
                                {parts.filter(p => p.purpose === 'electrical').length > 0 ? (
                                    <div className="space-y-3">
                                        {parts.filter(p => p.purpose === 'electrical').map(part => (
                                            <PartRow
                                                key={part.itemId}
                                                part={part}
                                                onSourceChange={handleSourceChange}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-secondary">No electrical parts configured</p>
                                )}
                            </div>

                            {/* Right Section: Mechanical Parts */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <h3 className="mb-4 text-lg font-semibold text-blue-400">
                                    Mechanical Parts
                                </h3>
                                {parts.filter(p => p.purpose === 'mechanical').length > 0 ? (
                                    <div className="space-y-3">
                                        {parts.filter(p => p.purpose === 'mechanical').map(part => (
                                            <PartRow
                                                key={part.itemId}
                                                part={part}
                                                onSourceChange={handleSourceChange}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-secondary">No mechanical parts configured</p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border bg-gray-800/25 p-6">
                    <div className="text-sm text-secondary">
                        Total Parts: <span className="font-medium text-white">{parts.length}</span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="rounded-md border border-border bg-transparent px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex items-center gap-2 rounded-md border border-green-500 bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
                        >
                            <CheckCircle className="h-4 w-4" />
                            Confirm & Create Robot
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Part Row Component
const PartRow = ({
    part,
    onSourceChange
}: {
    part: PartWithInventory;
    onSourceChange: (itemId: string, source: 'Flo' | 'GKX' | 'Abhirup') => void;
}) => {
    const isInsufficient = part.source === 'Flo' && part.availableQty !== undefined && part.availableQty < part.quantity;
    const isLowStock = part.source === 'Flo' && part.availableQty !== undefined && part.availableQty >= part.quantity && part.availableQty < part.quantity * 2;

    return (
        <div className="rounded-md bg-backgroundGray/30 p-4">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h4 className="font-medium text-white">{part.name}</h4>
                        <span className="rounded bg-gray-700 px-2 py-0.5 text-xs font-mono text-gray-300">
                            {part.itemId}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-secondary">
                        Required: <span className="font-medium text-white">{part.quantity} {part.unit}</span>
                    </p>

                    {/* Inventory Status */}
                    {part.source === 'Flo' && (
                        <div className="mt-2">
                            {part.loading ? (
                                <span className="text-xs text-secondary">Loading inventory...</span>
                            ) : part.error ? (
                                <span className="text-xs text-red-400">{part.error}</span>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-medium ${isInsufficient ? 'text-red-400' : isLowStock ? 'text-yellow-400' : 'text-green-400'}`}>
                                        Available: {part.availableQty} {part.unit}
                                    </span>
                                    {isInsufficient && (
                                        <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400">
                                            INSUFFICIENT
                                        </span>
                                    )}
                                    {isLowStock && (
                                        <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs font-semibold text-yellow-400">
                                            LOW STOCK
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Source Selection */}
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-secondary">Source:</label>
                    <select
                        value={part.source}
                        onChange={(e) => onSourceChange(part.itemId, e.target.value as 'Flo' | 'GKX' | 'Abhirup')}
                        className="rounded-md border border-border bg-gray-700 px-3 py-1.5 text-sm text-white focus:border-green-500 focus:outline-none"
                    >
                        <option value="Flo">Flo</option>
                        <option value="GKX">GKX</option>
                        <option value="Abhirup">Abhirup</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default BOMVerificationModal;
