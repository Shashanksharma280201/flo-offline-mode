import React, { useEffect, useState, useMemo } from "react";
import Popup from "@/components/popup/Popup";
import { BillingRecord, BillingStatus } from "../services/billingService";
import { useCreateBilling, useUpdateBilling } from "../hooks/useBilling";
import { getClientsListFn } from "@/features/analytics/analyticsService";
import { useQuery } from "react-query";
import { toast } from "react-toastify";
import SmIconButton from "@/components/ui/SmIconButton";
import { useUserStore } from "@/stores/userStore";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import Calendar from "@/components/ui/Calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/Popover";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/Input";
import ComboBox from "@/components/comboBox/ComboBox";

interface BillingModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: BillingRecord | null;
    robotId: string;
}

const BillingModal = ({
    isOpen,
    onClose,
    record,
    robotId
}: BillingModalProps) => {
    const user = useUserStore((state) => state.user);
    const { data: clients } = useQuery("clientsList", getClientsListFn);

    const [formData, setFormData] = useState<Partial<BillingRecord>>({
        clientId: "",
        startDate: "",
        endDate: undefined,
        amount: undefined,
        status: BillingStatus.POC,
        robotId: robotId
    });

    // Get selected client object safely
    const selectedClientObj = useMemo(() => {
        if (!clients) return null;
        if (!formData.clientId) return null;
        return clients.find((c: any) => c.id === formData.clientId) || null;
    }, [clients, formData.clientId]);

    useEffect(() => {
        if (record) {
            const clientId =
                typeof record.clientId === "object"
                    ? record.clientId._id
                    : record.clientId;

            setFormData({
                clientId,
                startDate: new Date(record.startDate)
                    .toISOString()
                    .split("T")[0],
                endDate: record.endDate
                    ? new Date(record.endDate).toISOString().split("T")[0]
                    : "",
                amount: record.amount,
                status: record.status,
                robotId: robotId
            });
        }
    }, [record, robotId]);

    const isDateValid =
        !formData.endDate ||
        (formData.startDate &&
            new Date(formData.endDate) > new Date(formData.startDate));
    const isFormValid = !!(
        formData.clientId &&
        formData.amount != null &&
        formData.startDate &&
        isDateValid
    );

    const createMutation = useCreateBilling();
    const updateMutation = useUpdateBilling();

    const handleSave = async () => {
        if (!isFormValid) return;

        const payload = {
            ...formData,
            endDate: formData.endDate || undefined,
            createdBy: user?.name || "System"
        };

        try {
            if (record) {
                await updateMutation.mutateAsync({
                    robotId,
                    billingData: payload
                });
                toast.success("Billing record updated successfully");
            } else {
                await createMutation.mutateAsync(payload);
                toast.success("Billing record created successfully");
            }
            onClose();
        } catch (error: any) {
            toast.error(
                error.response?.data?.message || "Failed to save billing record"
            );
        }
    };

    return (
        <Popup
            dialogToggle={isOpen}
            onClose={onClose}
            title={record ? "Edit Billing Record" : "Create Billing Record"}
            description={
                record
                    ? "Modify the billing details for this robot."
                    : "Add a new billing record for this robot."
            }
        >
            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 gap-6">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-white/70">
                            Client
                        </label>
                        <ComboBox
                            items={clients || []}
                            selectedItem={selectedClientObj}
                            setSelectedItem={(item) =>
                                setFormData({ ...formData, clientId: item.id })
                            }
                            label="Client"
                            showLabel={false}
                            getItemLabel={(item) => item?.name || ""}
                            placeholder="Select Client..."
                            wrapperClassName="border-white/10 bg-white/5 h-10 py-0"
                            inputClassName="text-white placeholder:text-white/30 text-sm truncate"
                            isSelect={true}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-white/70">
                            Start Date
                        </label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    className={cn(
                                        "flex w-full items-center justify-between rounded-md border border-white/10 bg-white/5 p-2 text-left text-sm text-white transition-colors hover:bg-white/10",
                                        !formData.startDate && "text-white/30"
                                    )}
                                >
                                    {formData.startDate
                                        ? dayjs(formData.startDate).format(
                                              "DD/MMM/YYYY"
                                          )
                                        : "Pick a date"}
                                    <CalendarDays className="h-4 w-4 text-white/30" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-auto border-white/10 bg-neutral-900 p-0"
                                align="start"
                            >
                                <Calendar
                                    mode="single"
                                    selected={
                                        formData.startDate
                                            ? new Date(formData.startDate)
                                            : undefined
                                    }
                                    onSelect={(date) =>
                                        setFormData({
                                            ...formData,
                                            startDate: date
                                                ? dayjs(date).format(
                                                      "YYYY-MM-DD"
                                                  )
                                                : ""
                                        })
                                    }
                                    initialFocus
                                    className="bg-neutral-900 text-white"
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-white/70">
                            End Date
                        </label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    className={cn(
                                        "flex w-full items-center justify-between rounded-md border border-white/10 bg-white/5 p-2 text-left text-sm text-white transition-colors hover:bg-white/10",
                                        !formData.endDate && "text-white/30"
                                    )}
                                >
                                    {formData.endDate
                                        ? dayjs(formData.endDate).format(
                                              "DD/MMM/YYYY"
                                          )
                                        : "No end date"}
                                    <CalendarDays className="h-4 w-4 text-white/30" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-auto border-white/10 bg-neutral-900 p-0"
                                align="start"
                            >
                                <Calendar
                                    mode="single"
                                    selected={
                                        formData.endDate
                                            ? new Date(formData.endDate)
                                            : undefined
                                    }
                                    onSelect={(date) =>
                                        setFormData({
                                            ...formData,
                                            endDate: date
                                                ? dayjs(date).format(
                                                      "YYYY-MM-DD"
                                                  )
                                                : ""
                                        })
                                    }
                                    initialFocus
                                    className="bg-neutral-900 text-white"
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-white/70">
                            Amount
                        </label>
                        <input
                            type="number"
                            placeholder="Amount in Rupees"
                            min="0"
                            className="rounded-md border border-white/10 bg-white/5 p-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
                            value={formData.amount ?? ""}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    amount:
                                        e.target.value === ""
                                            ? undefined
                                            : Number(e.target.value)
                                })
                            }
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-white/70">
                            Status
                        </label>
                        <div className="relative">
                            <select
                                className={cn(
                                    "w-full appearance-none rounded-md border border-white/10 bg-white/5 p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20",
                                    record && "cursor-not-allowed opacity-50"
                                )}
                                value={formData.status}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        status: e.target.value as BillingStatus
                                    })
                                }
                                disabled={!!record}
                            >
                                {Object.values(BillingStatus).map((status) => (
                                    <option
                                        key={status}
                                        value={status}
                                        className="bg-neutral-900"
                                    >
                                        {status}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                        </div>
                        {record && (
                            <p className="text-[10px] text-white/50">
                                Status cannot be changed on an existing record.
                            </p>
                        )}
                    </div>
                </div>

                {!isDateValid && formData.startDate && formData.endDate && (
                    <p className="text-xs text-red-400">
                        End Date must be greater than Start Date
                    </p>
                )}

                <div className="mt-2 flex justify-end gap-3 border-t border-white/10 pt-4">
                    <button
                        type="button"
                        className="rounded-lg border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
                        onClick={onClose}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        disabled={!isFormValid}
                        className={cn(
                            "rounded-lg px-4 py-2 text-sm font-medium transition-all",
                            !isFormValid
                                ? "cursor-not-allowed bg-white/10 text-white/30"
                                : "bg-white text-black hover:bg-white/90"
                        )}
                        onClick={handleSave}
                    >
                        Save Record
                    </button>
                </div>
            </div>
        </Popup>
    );
};

export default BillingModal;
