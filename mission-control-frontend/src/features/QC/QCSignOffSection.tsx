import React, { useState, useEffect } from "react";
import { QCSignOffField } from "./types";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface QCSignOffSectionProps {
    signOffFields: QCSignOffField[];
    signOffData: Record<string, any>;
    onSignOffChange: (fieldId: string, value: any) => void;
    disabled?: boolean;
}

const QCSignOffSection: React.FC<QCSignOffSectionProps> = ({
    signOffFields,
    signOffData,
    onSignOffChange,
    disabled = false
}) => {
    const [localData, setLocalData] = useState<Record<string, any>>(
        signOffData || {}
    );

    // Sync local state with parent data only when parent data changes significantly
    // (e.g. after a fetch or reset) to avoid interfering with active typing.
    useEffect(() => {
        setLocalData(signOffData || {});
    }, [signOffData]);

    const handleFieldChange = (fieldId: string, value: any) => {
        // 1. Immediate UI update for fluid typing
        setLocalData((prev) => ({ ...prev, [fieldId]: value }));

        // 2. Trigger parent update (which is debounced at the page level)
        onSignOffChange(fieldId, value);
    };

    const renderField = (field: QCSignOffField) => {
        const value = localData?.[field.fieldId] || "";

        switch (field.fieldType) {
            case "text":
                return (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) =>
                            handleFieldChange(field.fieldId, e.target.value)
                        }
                        disabled={disabled}
                        required={field.required}
                        className="mt-1 block min-h-[44px] w-full touch-manipulation rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-slate-100 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700/40 md:min-h-0 md:text-base"
                        placeholder={`Enter ${field.fieldName.toLowerCase()}`}
                    />
                );

            case "textarea":
                return (
                    <Textarea
                        value={value}
                        onChange={(e) =>
                            handleFieldChange(field.fieldId, e.target.value)
                        }
                        disabled={disabled}
                        required={field.required}
                        rows={4}
                        className="touch-manipulation border-slate-600 bg-slate-700/50 text-sm text-slate-100 placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:ring-emerald-500 md:text-base"
                        placeholder={`Enter ${field.fieldName.toLowerCase()}`}
                    />
                );

            case "signature":
                return (
                    <div className="mt-1">
                        <input
                            type="text"
                            value={value}
                            onChange={(e) =>
                                handleFieldChange(field.fieldId, e.target.value)
                            }
                            disabled={disabled}
                            required={field.required}
                            className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 sm:text-sm"
                            placeholder="Type your name to sign"
                        />
                        {value && (
                            <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-4">
                                <p className="mb-1 text-xs text-gray-500">
                                    Digital Signature:
                                </p>
                                <p className="font-cursive text-2xl text-gray-700">
                                    {value}
                                </p>
                                <p className="mt-2 text-xs text-gray-500">
                                    {new Date().toLocaleDateString()}
                                </p>
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    if (signOffFields.length === 0) {
        return null;
    }

    return (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 shadow-lg md:p-6">
            <div className="mb-4 flex items-center gap-2 md:mb-6">
                <svg
                    className="h-5 w-5 text-emerald-500 md:h-6 md:w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
                <h2 className="text-lg font-bold text-slate-100 md:text-xl">
                    Final Sign-Off
                </h2>
            </div>

            <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 md:mb-6 md:p-4">
                <div className="flex">
                    <svg
                        className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400 md:mr-3 md:h-5 md:w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <p className="text-xs text-amber-200 md:text-sm">
                        Please review all QC checkpoints before submitting. This
                        will finalize the inspection and cannot be undone.
                    </p>
                </div>
            </div>

            <div className="space-y-4 md:space-y-6">
                {signOffFields.map((field) => (
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

export default QCSignOffSection;
