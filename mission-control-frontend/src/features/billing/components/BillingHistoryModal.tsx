import React from "react";
import Popup from "@/components/popup/Popup";
import { BillingRecord } from "../services/billingService";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";

interface BillingHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: BillingRecord | null;
}

const BillingHistoryModal = ({ isOpen, onClose, record }: BillingHistoryModalProps) => {
    const history = (record?.history || []).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const formatChanges = (changes: any) => {
        if (!changes || typeof changes !== "object") return null;

        // If it's the initial creation, just text
        if (Object.keys(changes).length > 4 && changes.robotId && changes.clientId) {
            return <span className="text-xs text-neutral-400">Initial Record Creation</span>
        }

        return (
            <div className="flex flex-col gap-1 mt-1 text-xs">
                {Object.entries(changes).map(([key, val]: [string, any]) => {
                    // Skip internal fields if they sneak in
                    if (key === "_id" || key === "updatedAt") return null;

                    if (val && typeof val === "object" && "old" in val && "new" in val) {
                        // Check if values are valid dates
                        const isOldDate = val.old && dayjs(val.old).isValid() && typeof val.old === 'string' && val.old.includes('-');
                        const isNewDate = val.new && dayjs(val.new).isValid() && typeof val.new === 'string' && val.new.includes('-');

                        const oldVal = isOldDate ? dayjs(val.old).format("DD/MMM/YYYY") : (val.old ?? "None");
                        const newVal = isNewDate ? dayjs(val.new).format("DD/MMM/YYYY") : (val.new ?? "None");

                        // Formatting for amounts
                        if (key === 'amount') {
                            return (
                                <div key={key} className="grid grid-cols-[80px_1fr] gap-2">
                                    <span className="text-neutral-500 capitalize">{key}:</span>
                                    <span className="text-white">
                                        <span className="text-red-400 line-through mr-2">₹{val.old}</span>
                                        <span className="text-green-400">₹{val.new}</span>
                                    </span>
                                </div>
                            )
                        }
                        return (
                            <div key={key} className="grid grid-cols-[80px_1fr] gap-2">
                                <span className="text-neutral-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                <span className="text-white">
                                    <span className="text-neutral-400 mr-2">{oldVal}</span>
                                    <span className="text-neutral-600 px-1">→</span>
                                    <span className="text-green-400">{newVal}</span>
                                </span>
                            </div>
                        );
                    }
                    return null;
                })}
            </div>
        );
    };

    return (
        <Popup
            dialogToggle={isOpen}
            onClose={onClose}
            title="Billing History Log"
            description={`History for billing record ${dayjs(record?.startDate).format("DD/MMM/YYYY")}`}
        >
            <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2">
                {history.length === 0 ? (
                    <div className="text-center text-neutral-500 py-8">No history available for this record.</div>
                ) : (
                    history.map((entry, idx) => (
                        <div key={idx} className="flex flex-col border-l-2 border-neutral-700 pl-4 py-1 relative">
                            <div className="absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full bg-neutral-600" />
                            <div className="flex items-center justify-between mb-1">
                                <span className={cn(
                                    "font-semibold text-sm",
                                    entry.action === "ENTRY_CREATED" ? "text-green-400" : "text-blue-400"
                                )}>
                                    {entry.action.replace("_", " ")}
                                </span>
                                <span className="text-xs text-neutral-500">
                                    {dayjs(entry.updatedAt).format("DD/MMM/YY HH:mm")}
                                </span>
                            </div>
                            <div className="text-xs text-neutral-400 mb-1">
                                By: <span className="text-white">{entry.changedBy}</span>
                            </div>
                            {formatChanges(entry.changes)}
                        </div>
                    ))
                )}
            </div>
        </Popup>
    );
};

export default BillingHistoryModal;
