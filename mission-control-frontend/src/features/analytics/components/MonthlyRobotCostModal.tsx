import React, { useState, useEffect } from "react";
import { MonthlyRobotCostInput } from "../types/costAnalysisTypes";
import { X, Building2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";

interface MonthlyRobotCostModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedClients: { id: string; name: string }[];
    onGenerate: (costs: MonthlyRobotCostInput) => void;
}

export const MonthlyRobotCostModal: React.FC<MonthlyRobotCostModalProps> = ({
    isOpen,
    onClose,
    selectedClients,
    onGenerate
}) => {
    const [clientCosts, setClientCosts] = useState<MonthlyRobotCostInput>({});
    const [errors, setErrors] = useState<{ [clientId: string]: string }>({});
    const [showAnimation, setShowAnimation] = useState(false);

    // Initialize costs when modal opens
    useEffect(() => {
        if (isOpen) {
            const initialCosts: MonthlyRobotCostInput = {};
            selectedClients.forEach((client) => {
                initialCosts[client.id] = 50000; // Default cost
            });
            setClientCosts(initialCosts);
            setErrors({});
            setShowAnimation(false);
            setTimeout(() => setShowAnimation(true), 50);
        }
    }, [isOpen, selectedClients]);

    // Format currency for display
    const formatCurrency = (value: number): string => {
        return `Rs ${new Intl.NumberFormat("en-IN", {
            maximumFractionDigits: 0
        }).format(value)}`;
    };

    const handleCostChange = (clientId: string, value: string) => {
        const numValue = parseFloat(value);
        setClientCosts((prev) => ({
            ...prev,
            [clientId]: numValue
        }));

        // Clear error for this field
        if (errors[clientId]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[clientId];
                return newErrors;
            });
        }
    };

    const validateCosts = (): boolean => {
        const newErrors: { [clientId: string]: string } = {};
        let isValid = true;

        selectedClients.forEach((client) => {
            const cost = clientCosts[client.id];
            if (!cost || cost <= 0 || isNaN(cost)) {
                newErrors[client.id] = "Please enter a valid cost";
                isValid = false;
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    const handleGenerate = () => {
        if (validateCosts()) {
            onGenerate(clientCosts);
            onClose();
        }
    };

    const handleCancel = () => {
        setClientCosts({});
        setErrors({});
        onClose();
    };

    // Calculate total cost
    const totalCost = Object.values(clientCosts).reduce(
        (sum, cost) => sum + (cost || 0),
        0
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div
                className={`flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-gray-800 shadow-2xl transition-all duration-300 ${
                    showAnimation ? "scale-100 opacity-100" : "scale-95 opacity-0"
                }`}
            >
                {/* Header */}
                <div className="border-b border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white">
                                Monthly Robot Cost
                            </h2>
                            <p className="mt-1 text-sm text-gray-400">
                                Set monthly rental cost for each site
                            </p>
                        </div>
                        <button
                            onClick={handleCancel}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="max-h-[60vh] overflow-y-auto p-6">
                    <div className="space-y-6">
                        {selectedClients.map((client, index) => (
                            <div
                                key={client.id}
                                className="space-y-4 rounded-xl border border-gray-700 bg-gray-750 p-5 transition-all hover:border-gray-600"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {/* Client Name */}
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-green-900/30 p-2">
                                        <Building2 className="h-5 w-5 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Site
                                        </p>
                                        <p className="text-lg font-semibold text-white">
                                            {client.name}
                                        </p>
                                    </div>
                                </div>

                                {/* Cost Input */}
                                <div className="space-y-2">
                                    <Label
                                        htmlFor={`cost-${client.id}`}
                                        className="text-sm font-medium text-gray-300"
                                    >
                                        Monthly Robot Rental Cost (INR)
                                    </Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                                            Rs
                                        </span>
                                        <Input
                                            id={`cost-${client.id}`}
                                            type="number"
                                            min="0"
                                            step="1000"
                                            value={clientCosts[client.id] || ""}
                                            onChange={(e) =>
                                                handleCostChange(client.id, e.target.value)
                                            }
                                            className={`pl-12 pr-16 text-base font-semibold ${
                                                errors[client.id]
                                                    ? "border-red-500 bg-red-950/20 focus-visible:ring-red-500"
                                                    : "border-gray-600 bg-gray-900 text-white focus-visible:ring-green-500"
                                            }`}
                                            placeholder="50000"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-gray-800 px-2 py-1 text-xs font-medium text-gray-400">
                                            INR
                                        </span>
                                    </div>

                                    {/* Error Message */}
                                    {errors[client.id] && (
                                        <div className="flex items-center gap-2 rounded-lg bg-red-950/20 p-2 text-sm text-red-400">
                                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                            <span>{errors[client.id]}</span>
                                        </div>
                                    )}

                                    {/* Daily Cost Display */}
                                    {clientCosts[client.id] > 0 && !errors[client.id] && (
                                        <div className="flex items-center justify-between rounded-lg bg-green-950/20 px-3 py-2 text-sm">
                                            <span className="text-gray-400">Daily cost:</span>
                                            <span className="font-semibold text-green-400">
                                                {formatCurrency(clientCosts[client.id] / 30)}/day
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Total Cost Summary */}
                    {selectedClients.length > 1 && (
                        <div className="mt-6 rounded-xl border border-green-700 bg-green-950/20 p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-green-300">
                                        Total Monthly Cost
                                    </p>
                                    <p className="mt-1 text-xs text-green-500">
                                        {selectedClients.length} sites combined
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-green-400">
                                        {formatCurrency(totalCost)}
                                    </p>
                                    <p className="text-xs text-green-500">
                                        {formatCurrency(totalCost / 30)}/day
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-700 p-6">
                    <div className="flex items-center justify-between gap-4">
                        <div className="hidden text-sm text-gray-400 sm:block">
                            {selectedClients.length} site
                            {selectedClients.length > 1 ? "s" : ""} selected
                        </div>
                        <div className="flex w-full gap-3 sm:w-auto">
                            <Button
                                onClick={handleCancel}
                                className="flex-1 rounded-lg border border-gray-600 bg-gray-700 px-6 py-2.5 font-medium text-white hover:bg-gray-600 sm:flex-none"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleGenerate}
                                className="flex-1 rounded-lg bg-green-600 px-8 py-2.5 font-semibold text-white hover:bg-green-700 sm:flex-none"
                            >
                                Generate PDF
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
