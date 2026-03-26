import React from "react";
import { Button } from "@/components/ui/Button";
import { QCTab, QCSubmission } from "../types";
import QCHistoryModal from "../QCHistoryModal";

interface QCCompletionViewProps {
    submission: QCSubmission | null;
    template: { totalQuestions?: number } | null;
    robotId: string;
    robotName: string;
    isHistorical: boolean;
    showHistory: boolean;
    saving: boolean;
    onDownloadPDF: () => void;
    onFillFreshForm: () => void;
    setShowHistory: (show: boolean) => void;
    navigate: (path: string) => void;
    historicalBanner: React.ReactNode;
}

const QCCompletionView: React.FC<QCCompletionViewProps> = ({
    submission,
    template,
    robotId,
    robotName,
    isHistorical,
    showHistory,
    saving,
    onDownloadPDF,
    onFillFreshForm,
    setShowHistory,
    navigate,
    historicalBanner
}) => {
    return (
        <div
            className={`min-h-screen bg-slate-900 pb-12 ${isHistorical ? "shadow-[inset_0_0_0_4px_rgba(245,158,11,0.2)]" : ""}`}
        >
            {historicalBanner}
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-slate-700 bg-slate-800/95 shadow-lg backdrop-blur-sm">
                <div className="mx-auto w-full px-3 py-3 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
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
                    </div>
                </div>
            </div>

            {/* Completion Content */}
            <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-8 text-center shadow-lg md:p-12">
                    {/* Success Icon */}
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-500/20 md:h-24 md:w-24">
                        <svg
                            className="h-10 w-10 text-emerald-500 md:h-12 md:w-12"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>

                    {/* Title */}
                    <h2 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                        This Form is Completed
                    </h2>

                    {/* Status Badge */}
                    <div className="mb-6 inline-flex">
                        {submission?.status === "submitted" && (
                            <span className="inline-flex items-center rounded-full border border-primary600 bg-primary600 bg-opacity-20 px-4 py-2 text-base font-medium text-primary600">
                                <svg
                                    className="mr-2 h-5 w-5"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                Submitted
                            </span>
                        )}
                        {submission?.status === "approved" && (
                            <span className="inline-flex items-center rounded-full border border-primary700 bg-primary700 bg-opacity-20 px-4 py-2 text-base font-medium text-primary700">
                                <svg
                                    className="mr-2 h-5 w-5"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                Approved
                            </span>
                        )}
                    </div>

                    {/* Submission Details */}
                    {submission && (
                        <div className="mb-8 rounded-lg border border-slate-600 bg-slate-700/30 p-6">
                            <div className="grid grid-cols-1 gap-4 text-left md:grid-cols-3">
                                <div>
                                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-secondary">
                                        Submitted By
                                    </p>
                                    <p className="text-sm font-semibold text-white">
                                        {submission.submittedBy.name}
                                    </p>
                                    <p className="text-xs text-secondary">
                                        {submission.submittedBy.email}
                                    </p>
                                </div>
                                <div>
                                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-secondary">
                                        Submitted At
                                    </p>
                                    <p className="text-sm font-semibold text-white">
                                        {new Date(
                                            submission.createdAt
                                        ).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric"
                                        })}
                                    </p>
                                    <p className="text-xs text-secondary">
                                        {new Date(
                                            submission.createdAt
                                        ).toLocaleTimeString("en-US", {
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        })}
                                    </p>
                                </div>
                                <div>
                                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-secondary">
                                        Completion
                                    </p>
                                    <p className="text-sm font-semibold text-emerald-400">
                                        {Number.isFinite(
                                            submission.completionPercentage
                                        )
                                            ? submission.completionPercentage
                                            : 0}
                                        % ({submission.answeredQuestions || 0}/
                                        {submission.totalQuestions ||
                                            template?.totalQuestions ||
                                            0}
                                        )
                                    </p>
                                    <p className="text-xs text-secondary">
                                        Pass Rate: {submission.passRate || 0}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Download PDF Button */}
                    <div className="mb-8">
                        <Button
                            onClick={onDownloadPDF}
                            className="bg-emerald-600 px-8 py-3 text-base text-white hover:bg-emerald-500"
                        >
                            <svg
                                className="mr-2 inline h-5 w-5"
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
                            Download PDF Report
                        </Button>
                    </div>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-600"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-slate-800 px-4 text-secondary">
                                Want to fill another form?
                            </span>
                        </div>
                    </div>

                    {/* Fill Fresh Form Button */}
                    <div>
                        <Button
                            onClick={onFillFreshForm}
                            variant="outline"
                            className="border-slate-600 bg-slate-700/50 px-8 py-3 text-base text-slate-200 hover:bg-slate-600/70 hover:text-white"
                            disabled={saving}
                        >
                            <svg
                                className="mr-2 inline h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            {saving ? "Creating..." : "Fill Fresh Form"}
                        </Button>
                    </div>

                    {/* View History Link */}
                    <div className="mt-6">
                        <button
                            onClick={() => setShowHistory(true)}
                            className="text-sm text-slate-400 transition-colors hover:text-slate-200"
                        >
                            View QC History
                        </button>
                    </div>
                </div>
            </div>

            {/* History Modal */}
            <QCHistoryModal
                robotId={robotId}
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                onViewSubmission={(id) =>
                    navigate(`/robots/${robotId}/qc/${id}`)
                }
            />
        </div>
    );
};

export default QCCompletionView;
