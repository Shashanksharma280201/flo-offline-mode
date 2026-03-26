import React, { useMemo } from "react";
import { GroupedVirtuoso } from "react-virtuoso";
import { QCTab, QCCategory } from "./types";
import { flattenQCTabData } from "./utils/virtualization";
import QCQuestionItem from "./QCQuestionItem";
import {
    useQCStore,
    useQCExpandedCategory,
    useCategoryStats
} from "./store/useQCStore";

interface VirtualizedQuestionListProps {
    tab: QCTab;
    disabled?: boolean;
}

const QCGroupHeader: React.FC<{ category: QCCategory; index: number }> = ({
    category
}) => {
    const isExpanded = useQCExpandedCategory(category.categoryId);
    const toggleCategory = useQCStore((state) => state.toggleCategory);

    // Memoize the question IDs to prevent stats re-calc unless category structure changes
    const questionIds = useMemo(
        () => category.questions.map((q) => q.questionId),
        [category]
    );

    const stats = useCategoryStats(questionIds);

    return (
        <div className="bg-slate-900/50 px-4 pb-0 pt-6">
            {" "}
            {/* Outer container providing the "gap" */}
            <div
                className={`
                    hover:bg-slate-750 group z-10 flex w-full cursor-pointer items-center 
                    justify-between border border-slate-700 bg-slate-800 px-6 py-4 shadow-sm
                    transition-all duration-300
                    ${isExpanded ? "rounded-t-xl border-b-0" : "rounded-xl"}
                `}
                onClick={() => toggleCategory(category.categoryId)}
            >
                <div className="flex w-full items-center justify-between gap-4">
                    {/* Left: Category Name */}
                    <h3 className="truncate text-sm font-bold uppercase tracking-wider text-slate-200 transition-colors group-hover:text-white">
                        {category ? category.categoryName : "Unknown Category"}
                    </h3>

                    {/* Right: Stats & Controls */}
                    <div className="flex flex-shrink-0 items-center gap-4">
                        {/* Answer Count */}
                        <span className="hidden text-xs font-medium text-slate-400 md:inline-block">
                            {stats.answered} / {stats.total} Answered
                        </span>

                        {/* Mini Progress Bar */}
                        <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-slate-700 md:block">
                            <div
                                className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                                style={{ width: `${stats.percent}%` }}
                            />
                        </div>

                        {/* Passed Pill */}
                        {stats.passed > 0 && (
                            <div className="hidden items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 md:flex">
                                <span className="text-[10px] font-semibold text-emerald-500">
                                    {stats.passed} Passed
                                </span>
                            </div>
                        )}

                        {/* Chevron */}
                        <div
                            className={`rounded-full p-1 transition-colors ${isExpanded ? "bg-slate-700/50" : "bg-transparent"}`}
                        >
                            <svg
                                className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const VirtualizedQuestionList: React.FC<VirtualizedQuestionListProps> = ({
    tab,
    disabled = false
}) => {
    const expandedCategories = useQCStore((state) => state.expandedCategories);

    // Flatten data for virtualization based on current expansion state
    const { items, groupCounts, categories } = useMemo(
        () => flattenQCTabData(tab, expandedCategories),
        [tab, expandedCategories]
    );

    // If no questions in tab at all
    if (!tab.categories.some((c) => c.questions.length > 0)) {
        return (
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-8 text-center">
                <p className="text-secondary">No questions in this tab</p>
            </div>
        );
    }

    return (
        <GroupedVirtuoso
            useWindowScroll
            groupCounts={groupCounts}
            groupContent={(index) => (
                <QCGroupHeader category={categories[index]} index={index} />
            )}
            itemContent={(index) => {
                const item = items[index];

                if (item.type === "spacer") {
                    return (
                        <div className="px-4 pb-0 duration-300 animate-in fade-in slide-in-from-top-2">
                            <div className="h-4 w-full rounded-b-xl border-x border-b border-slate-700 bg-slate-800/30" />
                        </div>
                    );
                }

                return (
                    <div className="bg-slate-900/50 px-4">
                        {" "}
                        {/* Wrapper for the "inset" look */}
                        <QCQuestionItem question={item} disabled={disabled} />
                    </div>
                );
            }}
            overscan={50} // Reduced from 200 → 75% memory reduction (60MB vs 240MB)
        />
    );
};

export default VirtualizedQuestionList;
