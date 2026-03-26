import { useQuery } from "react-query";
import { Package, Calendar, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { getPartsConsumedFn } from "../../services/robotsService";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface Part {
    itemId: string;
    name: string;
    quantity: number;
    unit: string;
    source: 'Flo' | 'GKX' | 'Abhirup';
    inventoryStatus?: 'sufficient' | 'insufficient' | 'external';
    consumedAt: string;
    consumedBy: string;
    purpose: "electrical" | "mechanical";
}

interface PartsConsumptionHistoryProps {
    robotId: string;
}

export const PartsConsumptionHistory = ({
    robotId
}: PartsConsumptionHistoryProps) => {
    const { data, isLoading, isError } = useQuery(
        ["partsConsumed", robotId],
        () => getPartsConsumedFn(robotId),
        {
            staleTime: 5 * 60 * 1000 // Cache for 5 minutes
        }
    );

    if (isLoading) {
        return (
            <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                <div className="flex h-32 items-center justify-center">
                    <LoadingSpinner className="h-6 w-6 animate-spin fill-white text-slate-600" />
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                <p className="text-red-400">
                    Error loading parts consumption data
                </p>
            </div>
        );
    }

    const allParts = [
        ...(data?.electrical || []),
        ...(data?.mechanical || [])
    ];
    const hasParts = allParts.length > 0;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    // Render inventory status badge following DESIGN2.md
    const renderStatusBadge = (status?: string) => {
        if (!status) return null;

        switch (status) {
            case 'sufficient':
                return (
                    <div className="flex items-center gap-1.5 rounded border border-green-500/30 bg-green-500/10 px-2 py-1 text-xs font-medium text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>SUFFICIENT</span>
                    </div>
                );
            case 'insufficient':
                return (
                    <div className="flex items-center gap-1.5 rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400">
                        <AlertCircle className="h-3 w-3" />
                        <span>INSUFFICIENT</span>
                    </div>
                );
            case 'external':
                return (
                    <div className="flex items-center gap-1.5 rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400">
                        <ExternalLink className="h-3 w-3" />
                        <span>EXTERNAL</span>
                    </div>
                );
            default:
                return null;
        }
    };

    const mechanicalParts = allParts.filter(part => part.purpose === 'mechanical');
    const electricalParts = allParts.filter(part => part.purpose === 'electrical');

    const PartItem = ({ part }: { part: Part }) => {
        // FALLBACK: If Flo part has no inventoryStatus, treat as insufficient
        const effectiveStatus = part.inventoryStatus
            ? part.inventoryStatus
            : (part.source === 'Flo' ? 'insufficient' : 'external');

        // Highlight insufficient parts with red background and border
        const isInsufficient = effectiveStatus === 'insufficient';
        const itemClassName = isInsufficient
            ? "border-b border-red-500 bg-red-500/10 p-4 last:border-b-0"
            : "border-b border-gray-700 p-4 last:border-b-0";

        return (
            <div className={itemClassName}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <p className="font-semibold text-white">
                                {part.name}
                            </p>
                            {renderStatusBadge(effectiveStatus)}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-white/60">
                            <span className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                {part.quantity} {part.unit}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(part.consumedAt)}
                            </span>
                            <span className="font-mono text-white/50">
                                {part.source}
                            </span>
                        </div>
                    </div>
                    <div className="rounded border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs font-medium text-white/50">
                        {part.itemId}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full">
            {!hasParts ? (
                <div className="flex min-h-[30vh] items-center justify-center border-b border-gray-700 p-6">
                    <div className="flex flex-col items-center gap-3">
                        <Package className="h-12 w-12 text-gray-600" />
                        <span className="text-sm text-gray-400">
                            No parts have been consumed
                        </span>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
                    {/* Left Column - Mechanical Parts */}
                    <div className="flex flex-col border-r-0 lg:border-r lg:border-gray-700">
                        <div className="border-b border-gray-700 bg-slate-900/30 px-6 py-3">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">
                                Mechanical Parts ({mechanicalParts.length})
                            </h3>
                        </div>
                        <div className="max-h-[60vh] divide-y divide-gray-700 overflow-y-auto">
                            {mechanicalParts.length > 0 ? (
                                mechanicalParts.map((part: Part, index: number) => (
                                    <PartItem key={`${part.itemId}-${index}`} part={part} />
                                ))
                            ) : (
                                <div className="flex min-h-[20vh] items-center justify-center p-6">
                                    <span className="text-sm text-gray-500">
                                        No mechanical parts
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Electrical Parts */}
                    <div className="flex flex-col">
                        <div className="border-b border-gray-700 bg-slate-900/30 px-6 py-3">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">
                                Electrical Parts ({electricalParts.length})
                            </h3>
                        </div>
                        <div className="max-h-[60vh] divide-y divide-gray-700 overflow-y-auto">
                            {electricalParts.length > 0 ? (
                                electricalParts.map((part: Part, index: number) => (
                                    <PartItem key={`${part.itemId}-${index}`} part={part} />
                                ))
                            ) : (
                                <div className="flex min-h-[20vh] items-center justify-center p-6">
                                    <span className="text-sm text-gray-500">
                                        No electrical parts
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
