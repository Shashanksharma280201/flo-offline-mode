import React from "react";
import { Button } from "@/components/ui/Button";
import { QCSubmission } from "../types";

interface QCMainHeaderProps {
    robotId: string;
    robotName: string;
    saving: boolean;
    lastSaved: Date | null;
    isDirty: boolean;
    isReadOnly: boolean;
    isFormComplete: boolean;
    answeredCount: number;
    totalQuestions: number;
    submission: QCSubmission | null;
    onSaveDraft: () => void;
    onSubmit: () => void;
    onDownloadPDF: () => void;
    onShowHistory: () => void;
    onClearAll: () => void;
    navigate: (path: string) => void;
}

const QCMainHeader: React.FC<QCMainHeaderProps> = ({
    robotId,
    robotName,
    saving,
    lastSaved,
    isDirty,
    isReadOnly,
    isFormComplete,
    answeredCount,
    totalQuestions,
    submission,
    onSaveDraft,
    onSubmit,
    onDownloadPDF,
    onShowHistory,
    onClearAll,
    navigate
}) => {
    return (
        <div className="sticky top-0 z-10 border-b border-slate-700 bg-slate-800/95 shadow-lg backdrop-blur-sm">
            <div className="mx-auto w-full px-3 py-3 sm:px-6 lg:px-8">
                {/* Mobile: Stack layout */}
                <div className="flex flex-col gap-3 md:hidden">
                    {/* Top row: Back button and title */}
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() =>
                                navigate(`/robots/${robotId}/profile`)
                            }
                            variant="ghost"
                            size="icon"
                            className="flex-shrink-0 text-secondary hover:bg-transparent hover:text-primary600"
                        >
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                        </Button>
                        <div className="min-w-0 flex-1">
                            <h1 className="truncate text-base font-bold text-white">
                                {robotName || robotId}
                            </h1>
                            <p className="text-xs text-secondary">
                                QC Inspection Form
                            </p>
                        </div>
                    </div>

                    {/* Auto-save indicator */}
                    {(saving || lastSaved) && (
                        <div className="flex items-center gap-2 px-1 text-xs text-slate-400">
                            {saving ? (
                                <>
                                    <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-emerald-500"></div>
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <span>
                                    Saved {lastSaved?.toLocaleTimeString()}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Bottom row: Action buttons */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {submission && (
                            <Button
                                onClick={onDownloadPDF}
                                variant="outline"
                                size="sm"
                                className="whitespace-nowrap border-slate-600 bg-slate-700/50 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-600/70 hover:text-white"
                            >
                                <svg
                                    className="mr-1.5 inline h-3 w-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                                PDF
                            </Button>
                        )}
                        <Button
                            onClick={onShowHistory}
                            variant="outline"
                            size="sm"
                            className="whitespace-nowrap border-slate-600 bg-slate-700/50 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-600/70 hover:text-white"
                        >
                            <svg
                                className="mr-1.5 inline h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            History
                        </Button>
                        <Button
                            onClick={onClearAll}
                            disabled={saving}
                            variant="outline"
                            size="sm"
                            className="whitespace-nowrap border-red-600 bg-red-900/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/50 hover:text-red-300"
                        >
                            <svg
                                className="mr-1.5 inline h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                            </svg>
                            Clear
                        </Button>
                        {!isReadOnly && (
                            <>
                                <Button
                                    onClick={onSaveDraft}
                                    disabled={saving || !isDirty}
                                    variant="secondary"
                                    size="sm"
                                    className="whitespace-nowrap bg-slate-600 px-3 py-1.5 text-xs text-white hover:bg-slate-500"
                                >
                                    Save
                                </Button>
                                <Button
                                    onClick={onSubmit}
                                    disabled={saving || !isFormComplete}
                                    variant="default"
                                    size="sm"
                                    className="whitespace-nowrap bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-600"
                                    title={
                                        !isFormComplete
                                            ? `${answeredCount}/${totalQuestions} questions answered`
                                            : "Submit QC Form"
                                    }
                                >
                                    Submit
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Desktop: Original layout */}
                <div className="hidden items-center justify-between md:flex">
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={() =>
                                navigate(`/robots/${robotId}/profile`)
                            }
                            variant="ghost"
                            size="icon"
                            className="text-secondary hover:bg-transparent hover:text-primary600"
                        >
                            <svg
                                className="h-6 w-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold text-white lg:text-2xl">
                                {robotName || robotId}
                            </h1>
                            <p className="text-sm text-secondary">
                                QC Inspection Form
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 lg:gap-3">
                        {saving && (
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-emerald-500"></div>
                                Saving...
                            </div>
                        )}
                        {!saving && lastSaved && (
                            <div className="hidden text-sm text-secondary lg:block">
                                Saved {lastSaved.toLocaleTimeString()}
                            </div>
                        )}

                        {submission && (
                            <Button
                                onClick={onDownloadPDF}
                                variant="outline"
                                className="border-slate-600 bg-slate-700/50 text-sm text-slate-200 hover:bg-slate-600/70 hover:text-white"
                            >
                                <svg
                                    className="mr-2 inline h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                                <span className="hidden lg:inline">
                                    Download PDF
                                </span>
                                <span className="lg:hidden">PDF</span>
                            </Button>
                        )}

                        <Button
                            onClick={onShowHistory}
                            variant="outline"
                            className="border-slate-600 bg-slate-700/50 text-sm text-slate-200 hover:bg-slate-600/70 hover:text-white"
                        >
                            <svg
                                className="mr-2 inline h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            History
                        </Button>

                        <Button
                            onClick={onClearAll}
                            disabled={saving}
                            variant="outline"
                            className="border-red-600 bg-red-900/30 text-sm text-red-400 hover:bg-red-900/50 hover:text-red-300"
                        >
                            <svg
                                className="mr-2 inline h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                            </svg>
                            <span className="hidden lg:inline">Clear All</span>
                            <span className="lg:hidden">Clear</span>
                        </Button>

                        {!isReadOnly && (
                            <>
                                <Button
                                    onClick={onSaveDraft}
                                    disabled={saving || !isDirty}
                                    variant="secondary"
                                    className="bg-slate-600 text-sm text-white hover:bg-slate-500"
                                >
                                    Save Draft
                                </Button>
                                <Button
                                    onClick={onSubmit}
                                    disabled={saving || !isFormComplete}
                                    variant="default"
                                    className="bg-emerald-600 text-sm text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-600"
                                    title={
                                        !isFormComplete
                                            ? `${answeredCount}/${totalQuestions} questions answered`
                                            : "Submit QC Form"
                                    }
                                >
                                    Submit QC
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QCMainHeader;
