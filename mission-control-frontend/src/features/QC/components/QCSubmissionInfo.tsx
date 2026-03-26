import React from "react";
import { QCSubmission, QCFormTemplate } from "../types";

interface QCSubmissionInfoProps {
    submission: QCSubmission | null;
    template: QCFormTemplate | null;
    answeredCount: number;
}

const QCSubmissionInfo: React.FC<QCSubmissionInfoProps> = ({
    submission,
    template,
    answeredCount
}) => {
    if (!submission) {
        return null;
    }

    return (
        <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/60 p-4 shadow-lg">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {/* Created By */}
                <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-secondary">
                        Created By
                    </p>
                    <p className="text-sm font-semibold text-white">
                        {submission.submittedBy.name}
                    </p>
                    <p className="text-xs text-secondary">
                        {submission.submittedBy.email}
                    </p>
                </div>

                {/* Created At */}
                <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-secondary">
                        Created At
                    </p>
                    <p className="text-sm font-semibold text-white">
                        {new Date(submission.createdAt).toLocaleDateString(
                            "en-US",
                            {
                                year: "numeric",
                                month: "short",
                                day: "numeric"
                            }
                        )}
                    </p>
                    <p className="text-xs text-secondary">
                        {new Date(submission.createdAt).toLocaleTimeString(
                            "en-US",
                            {
                                hour: "2-digit",
                                minute: "2-digit"
                            }
                        )}
                    </p>
                </div>

                {/* Status */}
                <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-secondary">
                        Status
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-yellow-500"></span>
                        <p className="text-sm font-semibold capitalize text-white">
                            {submission.status}
                        </p>
                    </div>
                </div>

                {/* Progress */}
                <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-secondary">
                        Progress
                    </p>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-full max-w-[100px] overflow-hidden rounded-full bg-slate-700">
                            <div
                                className="h-full bg-emerald-500"
                                style={{
                                    // Ensure the bar is always slightly visible, even for very small percentages
                                    width: `${Math.max((answeredCount / (template?.totalQuestions || 1)) * 100, 0.5)}%`
                                }}
                            ></div>
                        </div>
                        <span className="text-xs font-medium text-white">
                            {(
                                (answeredCount /
                                    (template?.totalQuestions || 1)) *
                                100
                            ).toFixed(2)}
                            %
                        </span>
                    </div>
                    <p className="text-xs text-secondary">
                        {answeredCount} of {template?.totalQuestions || 0}{" "}
                        checks
                    </p>
                </div>
            </div>
        </div>
    );
};

export default QCSubmissionInfo;
