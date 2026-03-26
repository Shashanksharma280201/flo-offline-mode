import React, { useState } from "react";
import { useQuery } from "react-query";
import { QCSubmission } from "./types";
import { getQCHistoryForRobot } from "./qcService";
import { toast } from "react-toastify";

interface QCHistoryModalProps {
    robotId: string;
    isOpen: boolean;
    onClose: () => void;
    onViewSubmission: (submissionId: string) => void;
}

const QCHistoryModal: React.FC<QCHistoryModalProps> = ({
    robotId,
    isOpen,
    onClose,
    onViewSubmission
}) => {
    const [page, setPage] = useState(1);

    // Use React Query for automatic cache management and invalidation
    const {
        data: historyData,
        isLoading: loading,
        error
    } = useQuery(
        ["qc-history", robotId, page],
        () => getQCHistoryForRobot(robotId, page, 10),
        {
            enabled: isOpen && !!robotId,
            staleTime: 1000 * 30, // 30 seconds - relatively fresh for history
            cacheTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
            keepPreviousData: true, // Smooth pagination experience
            onError: (err: any) => {
                console.error("Error fetching QC history:", err);
                toast.error(
                    err.response?.data?.message || "Failed to load QC history"
                );
            }
        }
    );

    const submissions = historyData?.submissions || [];
    const totalPages = historyData?.pages || 1;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "draft":
                return (
                    <span className="rounded-full border border-border bg-backgroundGray px-2 py-1 text-xs font-medium text-secondary">
                        Draft
                    </span>
                );
            case "submitted":
                return (
                    <span className="rounded-full border border-blue-500 bg-blue-500 bg-opacity-20 px-2 py-1 text-xs font-medium text-blue-400">
                        Submitted
                    </span>
                );
            case "approved":
                return (
                    <span className="rounded-full border border-primary600 bg-primary600 bg-opacity-20 px-2 py-1 text-xs font-medium text-primary600">
                        Approved
                    </span>
                );
            default:
                return null;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div
                    className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
                    onClick={onClose}
                />

                {/* Modal panel */}
                <div className="inline-block transform overflow-hidden rounded-lg border border-backgroundGray bg-background text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:align-middle">
                    {/* Header */}
                    <div className="border-b border-border bg-backgroundGray px-6 py-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">
                                QC Inspection History
                            </h3>
                            <button
                                onClick={onClose}
                                className="text-secondary transition-colors hover:text-white"
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
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary600"></div>
                            </div>
                        ) : !submissions || submissions.length === 0 ? (
                            <div className="py-12 text-center">
                                <svg
                                    className="mx-auto h-12 w-12 text-secondary"
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
                                <p className="mt-4 text-secondary">
                                    No QC submissions found for this robot
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {submissions &&
                                    submissions.length > 0 &&
                                    submissions.map((submission) => (
                                        <div
                                            key={submission.id}
                                            className="cursor-pointer rounded-lg border border-backgroundGray p-4 transition-colors hover:bg-backgroundGray"
                                            onClick={() => {
                                                onViewSubmission(submission.id);
                                                onClose();
                                            }}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="mb-2 flex items-center gap-3">
                                                        <h4 className="text-sm font-medium text-white">
                                                            {new Date(
                                                                submission.createdAt
                                                            ).toLocaleDateString(
                                                                "en-US",
                                                                {
                                                                    year: "numeric",
                                                                    month: "long",
                                                                    day: "numeric"
                                                                }
                                                            )}
                                                        </h4>
                                                        {getStatusBadge(
                                                            submission.status
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                                                        <div>
                                                            <p className="text-secondary">
                                                                Created By
                                                            </p>
                                                            <p className="font-medium text-white">
                                                                {
                                                                    submission
                                                                        .submittedBy
                                                                        .name
                                                                }
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <p className="text-secondary">
                                                                Last Edited By
                                                            </p>
                                                            <p className="font-medium text-white">
                                                                {submission.history &&
                                                                submission
                                                                    .history
                                                                    .length > 0
                                                                    ? submission
                                                                          .history[
                                                                          submission
                                                                              .history
                                                                              .length -
                                                                              1
                                                                      ].editedBy
                                                                          .name
                                                                    : submission
                                                                          .submittedBy
                                                                          .name}
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <p className="text-secondary">
                                                                Completion
                                                            </p>
                                                            <p className="font-medium text-white">
                                                                {Number.isFinite(
                                                                    submission.completionPercentage
                                                                )
                                                                    ? submission.completionPercentage
                                                                    : 0}
                                                                %
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <p className="text-secondary">
                                                                Pass Rate
                                                            </p>
                                                            <p className="font-medium text-primary600">
                                                                {
                                                                    submission.passRate
                                                                }
                                                                %
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <svg
                                                    className="ml-4 h-5 w-5 text-secondary"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M9 5l7 7-7 7"
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-6 flex items-center justify-between border-t border-backgroundGray pt-4">
                                <button
                                    onClick={() =>
                                        setPage((p) => Math.max(1, p - 1))
                                    }
                                    disabled={page === 1}
                                    className="rounded-md border border-border bg-backgroundGray px-4 py-2 text-sm font-medium text-white hover:bg-primary600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Previous
                                </button>

                                <span className="text-sm text-white">
                                    Page {page} of {totalPages}
                                </span>

                                <button
                                    onClick={() =>
                                        setPage((p) =>
                                            Math.min(totalPages, p + 1)
                                        )
                                    }
                                    disabled={page === totalPages}
                                    className="rounded-md border border-border bg-backgroundGray px-4 py-2 text-sm font-medium text-white hover:bg-primary600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-border bg-backgroundGray px-6 py-4">
                        <button
                            onClick={onClose}
                            className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-white hover:bg-primary600 sm:w-auto"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QCHistoryModal;
