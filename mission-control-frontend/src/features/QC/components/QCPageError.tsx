import React from "react";

interface QCPageErrorProps {
    submissionError: any;
    submissionId: string;
    robotId: string;
    navigate: (path: string) => void;
}

const QCPageError: React.FC<QCPageErrorProps> = ({
    submissionError,
    submissionId,
    robotId,
    navigate
}) => {
    return (
        <div className="min-h-screen bg-slate-900 p-8">
            <div className="mx-auto max-w-2xl">
                <div className="rounded-lg border border-red-600 bg-red-900/20 p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <svg
                                className="h-8 w-8 text-red-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-red-400">
                                Submission Not Found
                            </h3>
                            <p className="mt-2 text-sm text-red-300">
                                {(submissionError as any)?.response?.status ===
                                404
                                    ? `The QC submission you're looking for (ID: ${submissionId}) could not be found. It may have been deleted or the ID is incorrect.`
                                    : `Failed to load submission: ${(submissionError as any)?.message || "Unknown error"}`}
                            </p>
                            <div className="mt-4 flex gap-3">
                                <button
                                    onClick={() =>
                                        navigate(`/robots/${robotId}/qc`)
                                    }
                                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                                >
                                    Create New Submission
                                </button>
                                <button
                                    onClick={() =>
                                        navigate(`/robots/${robotId}/profile`)
                                    }
                                    className="rounded-md border border-slate-600 bg-slate-700/50 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600"
                                >
                                    Back to Robot
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QCPageError;
