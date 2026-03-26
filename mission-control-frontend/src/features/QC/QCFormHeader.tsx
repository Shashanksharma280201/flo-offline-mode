import React from "react";
import { QCHeaderField } from "./types";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";

interface QCFormHeaderProps {
    headerFields: QCHeaderField[];
    metadata: Record<string, any>;
    onMetadataChange: (fieldId: string, value: any) => void;
    disabled?: boolean;
    robotId?: string;
    robotName?: string;
}

const QCFormHeader: React.FC<QCFormHeaderProps> = ({
    headerFields,
    metadata,
    onMetadataChange,
    disabled = false,
    robotId = "",
    robotName = ""
}) => {
    // Get current date in YYYY-MM-DD format
    const currentDate = new Date().toLocaleDateString("en-CA"); // en-CA gives YYYY-MM-DD format
    const renderField = (field: QCHeaderField) => {
        const value = metadata[field.fieldId] || "";

        switch (field.fieldType) {
            case "text":
            case "number":
                return (
                    <Input
                        id={field.fieldId}
                        type={field.fieldType}
                        value={value}
                        onChange={(e) =>
                            onMetadataChange(field.fieldId, e.target.value)
                        }
                        disabled={disabled}
                        required={field.required}
                        className="mt-1 block min-h-[44px] w-full touch-manipulation rounded-md border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-slate-100 shadow-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 md:min-h-0 md:text-base"
                        placeholder={`Enter ${field.fieldName.toLowerCase()}`}
                    />
                );

            case "date":
                return (
                    <Input
                        id={field.fieldId}
                        type="date"
                        value={
                            value
                                ? new Date(value).toISOString().split("T")[0]
                                : ""
                        }
                        onChange={(e) =>
                            onMetadataChange(field.fieldId, e.target.value)
                        }
                        disabled={disabled}
                        required={field.required}
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-slate-900/30 px-3 py-2 shadow-sm disabled:cursor-not-allowed disabled:bg-gray-100 sm:text-sm"
                    />
                );

            case "dropdown":
                return (
                    <select
                        id={field.fieldId}
                        value={value}
                        onChange={(e) =>
                            onMetadataChange(field.fieldId, e.target.value)
                        }
                        disabled={disabled}
                        required={field.required}
                        className="mt-1 block min-h-[44px] w-full touch-manipulation rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-slate-100 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 md:min-h-0 md:text-base"
                    >
                        <option
                            value=""
                            className="bg-slate-800 text-slate-100"
                        >
                            Select {field.fieldName}
                        </option>
                        {field.options?.map((option) => (
                            <option
                                key={option}
                                value={option}
                                className="bg-slate-800 text-slate-100"
                            >
                                {option}
                            </option>
                        ))}
                    </select>
                );

            default:
                return null;
        }
    };

    if (headerFields.length === 0) {
        return null;
    }

    return (
        <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/50 p-4 shadow-lg md:p-6">
            <div className="mb-3 flex items-center gap-2 md:mb-4">
                <h2 className="text-base font-bold text-slate-100 md:text-xl">
                    Inspection Details
                </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                {/* Auto-populated MMR Name */}
                <div className="space-y-1 md:space-y-2">
                    <Label
                        htmlFor="mmr-name"
                        className="text-xs text-slate-300 md:text-sm"
                    >
                        MMR Name
                    </Label>
                    <Input
                        id="mmr-name"
                        type="text"
                        value={robotName || robotId || "N/A"}
                        disabled={true}
                        className="mt-1 block min-h-[44px] w-full cursor-not-allowed rounded-md border-slate-600 bg-slate-700/40 px-3 py-2 text-sm text-slate-400 shadow-sm md:min-h-0 md:text-base"
                    />
                </div>

                {/* Auto-populated Date */}
                <div className="space-y-1 md:space-y-2">
                    <Label
                        htmlFor="inspection-date"
                        className="text-xs text-slate-300 md:text-sm"
                    >
                        Date of Inspection
                    </Label>
                    <Input
                        id="inspection-date"
                        type="text"
                        value={currentDate}
                        disabled={true}
                        className="mt-1 block min-h-[44px] w-full cursor-not-allowed rounded-md border-slate-600 bg-slate-700/40 px-3 py-2 text-sm text-slate-400 shadow-sm md:min-h-0 md:text-base"
                    />
                </div>

                {/* Dynamic header fields (vendor dropdown) */}
                {headerFields.map((field) => (
                    <div key={field.fieldId} className="space-y-1 md:space-y-2">
                        <Label
                            htmlFor={field.fieldId}
                            className="text-xs text-slate-300 md:text-sm"
                        >
                            {field.fieldName}
                            {field.required && (
                                <span className="ml-1 text-rose-400">*</span>
                            )}
                        </Label>
                        {renderField(field)}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default QCFormHeader;
