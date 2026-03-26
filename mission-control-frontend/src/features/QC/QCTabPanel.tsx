import React from "react";
import { QCTab, QCAnswer } from "./types";

import VirtualizedQuestionList from "./VirtualizedQuestionList";


interface QCTabPanelProps {
    tab: QCTab;
    robotId: string;
    submissionId: string;
    answers: QCAnswer[];
    onAnswerChange: (
        questionId: number,
        tabId: string,
        categoryId: string,
        status: "passed" | "repaired" | "replaced" | null,
        remarks?: string,
        imageUrls?: string[],
        textResponse?: string
    ) => void;
    disabled?: boolean;
}

const QCTabPanel: React.FC<QCTabPanelProps> = ({
    tab,
    robotId,
    submissionId,
    answers,
    onAnswerChange,
    disabled = false
}) => {
    // Calculate overall tab completion
    const allQuestions = tab.categories.flatMap((cat) => cat.questions);
    const totalQuestions = allQuestions.length;
    const answeredQuestions = allQuestions.filter((q) =>
        answers.find((a) => a.questionId === q.questionId && a.status !== null)
    ).length;
    const passedQuestions = allQuestions.filter((q) =>
        answers.find((a) => a.questionId === q.questionId && a.status === "passed")
    ).length;
    const repairedQuestions = allQuestions.filter((q) =>
        answers.find((a) => a.questionId === q.questionId && a.status === "repaired")
    ).length;
    const replacedQuestions = allQuestions.filter((q) =>
        answers.find((a) => a.questionId === q.questionId && a.status === "replaced")
    ).length;

    const completionPercentage =
        totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Tab Stats Header */}
            <div className="bg-neutral-800/55 border border-backgroundGray rounded-lg p-4 md:p-6 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                    <h2 className="text-lg md:text-2xl font-bold text-white">{tab.tabName}</h2>
                    <div className="text-xs md:text-sm text-secondary">
                        {totalQuestions} total checkpoints
                    </div>
                </div>

                {/* Progress Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    {/* Overall Progress */}
                    <div className="col-span-2 md:col-span-1 bg-backgroundGray rounded-lg p-3 md:p-4 border border-border">
                        <div className="text-xs md:text-sm font-medium text-primary600 mb-1">
                            Overall Progress
                        </div>
                        <div className="text-2xl md:text-3xl font-bold text-white">
                            {completionPercentage}%
                        </div>
                        <div className="text-xs md:text-sm text-secondary mt-1">
                            {answeredQuestions} / {totalQuestions} answered
                        </div>
                        <div className="mt-2 w-full h-2 bg-background rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary600 transition-all duration-300"
                                style={{ width: `${completionPercentage}%` }}
                            />
                        </div>
                    </div>

                    {/* Passed */}
                    <div className="bg-backgroundGray rounded-lg p-3 md:p-4 border border-border">
                        <div className="text-xs md:text-sm font-medium text-primary700 mb-1">
                            Passed
                        </div>
                        <div className="text-2xl md:text-3xl font-bold text-white">
                            {passedQuestions}
                        </div>
                        <div className="text-xs md:text-sm text-secondary mt-1">
                            {totalQuestions > 0
                                ? Math.round((passedQuestions / totalQuestions) * 100)
                                : 0}
                            % of total
                        </div>
                    </div>

                    {/* Repaired */}
                    <div className="bg-backgroundGray rounded-lg p-3 md:p-4 border border-border">
                        <div className="text-xs md:text-sm font-medium text-yellow-500 mb-1">
                            Repaired
                        </div>
                        <div className="text-2xl md:text-3xl font-bold text-white">
                            {repairedQuestions}
                        </div>
                        <div className="text-xs md:text-sm text-secondary mt-1">
                            {totalQuestions > 0
                                ? Math.round((repairedQuestions / totalQuestions) * 100)
                                : 0}
                            % of total
                        </div>
                    </div>

                    {/* Replaced */}
                    <div className="bg-backgroundGray rounded-lg p-3 md:p-4 border border-border">
                        <div className="text-xs md:text-sm font-medium text-orange-500 mb-1">
                            Replaced
                        </div>
                        <div className="text-2xl md:text-3xl font-bold text-white">
                            {replacedQuestions}
                        </div>
                        <div className="text-xs md:text-sm text-secondary mt-1">
                            {totalQuestions > 0
                                ? Math.round((replacedQuestions / totalQuestions) * 100)
                                : 0}
                            % of total
                        </div>
                    </div>
                </div>
            </div>

            {/* Virtualized Question List */}
            <div className="space-y-4">
                <VirtualizedQuestionList tab={tab} disabled={disabled} />
            </div>

        </div>
    );
};

export default QCTabPanel;
