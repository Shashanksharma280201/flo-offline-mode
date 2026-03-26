import React from "react";
import { QCCategory, QCAnswer } from "./types";
import QCCheckItem from "./QCCheckItem";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from "@/components/ui/accordion";

interface QCCategoryAccordionProps {
    category: QCCategory;
    tabId: string;
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

const QCCategoryAccordion: React.FC<QCCategoryAccordionProps> = ({
    category,
    tabId,
    robotId,
    submissionId,
    answers,
    onAnswerChange,
    disabled = false
}) => {
    const totalQuestions = category.questions.length;
    const answeredQuestions = category.questions.filter((q) =>
        answers.find((a) => a.questionId === q.questionId && a.status !== null)
    ).length;
    const passedQuestions = category.questions.filter((q) =>
        answers.find(
            (a) => a.questionId === q.questionId && a.status === "passed"
        )
    ).length;

    const completionPercentage =
        totalQuestions > 0
            ? Math.round((answeredQuestions / totalQuestions) * 100)
            : 0;

    return (
        <Accordion
            type="single"
            collapsible
            defaultValue={category.categoryId}
            className="mb-3 md:mb-4"
        >
            <AccordionItem
                value={category.categoryId}
                className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800/40 shadow-lg"
            >
                <AccordionTrigger className="bg-slate-800/60 px-4 py-3 transition-colors hover:bg-slate-700/60 hover:no-underline md:px-6 md:py-4">
                    <div className="flex w-full flex-1 flex-col gap-2 md:flex-row md:items-center md:gap-4">
                        {/* Category Name */}
                        <h3 className="text-left text-sm font-semibold text-slate-200 md:text-lg">
                            {category.categoryName}
                        </h3>

                        {/* Stats Container */}
                        <div className="flex flex-wrap items-center gap-2 md:ml-auto md:gap-4">
                            <div className="text-xs text-slate-400 md:text-sm">
                                <span className="font-medium text-slate-300">
                                    {answeredQuestions}
                                </span>
                                <span className="mx-1">/</span>
                                <span>{totalQuestions}</span>
                                <span className="ml-1 hidden sm:inline">
                                    answered
                                </span>
                            </div>

                            {/* Percentage Text Only (Progress Bar Removed) */}
                            <div className="text-xs font-medium text-slate-200 md:text-sm">
                                {completionPercentage}%
                            </div>

                            {/* Pass Rate Badge - Only on Trigger */}
                            {answeredQuestions > 0 && (
                                <div className="rounded-full border border-emerald-500/50 bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400 md:px-3 md:py-1">
                                    {passedQuestions}{" "}
                                    <span className="hidden sm:inline">
                                        passed
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="rounded-b-lg bg-slate-800/30 px-4 py-3 md:px-6 md:py-4">
                    {category.questions.length === 0 ? (
                        <p className="text-sm italic text-slate-400">
                            No questions in this category
                        </p>
                    ) : (
                        <div className="space-y-0">
                            {category.questions
                                .sort((a, b) => a.order - b.order)
                                .map((question) => {
                                    const flatQuestion = {
                                        ...question,
                                        categoryId: category.categoryId,
                                        tabId: tabId,
                                        type: "question" as const
                                    };

                                    return (
                                        <QCCheckItem
                                            key={question.questionId}
                                            question={flatQuestion}
                                            disabled={disabled}
                                            // Assuming QCCheckItem handles its own internal badges,
                                            // you would typically pass a prop here to hide them if needed.
                                        />
                                    );
                                })}
                        </div>
                    )}
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
};

export default QCCategoryAccordion;
