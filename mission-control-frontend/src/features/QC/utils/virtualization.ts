import { QCFormTemplate, QCQuestion, QCCategory, QCTab } from "../types";

export interface FlatQuestionItem extends Partial<QCQuestion> {
    type: "question" | "spacer";
    categoryId: string;
    tabId: string;
    questionId: number; // For spacer we can use negative or special ID
}

export interface VirtualizedData {
    items: FlatQuestionItem[];
    groupCounts: number[];
    categories: QCCategory[];
}

export const flattenQCTabData = (
    activeTab: QCTab,
    expandedCategories: Record<string, boolean> = {}
): VirtualizedData => {
    if (!activeTab) {
        return { items: [], groupCounts: [], categories: [] };
    }

    const items: FlatQuestionItem[] = [];
    const groupCounts: number[] = [];
    const categories: QCCategory[] = [];

    // Sort categories by order
    const sortedCategories = [...activeTab.categories].sort(
        (a, b) => a.order - b.order
    );

    sortedCategories.forEach((category) => {
        const sortedQuestions = [...category.questions].sort(
            (a, b) => a.order - b.order
        );
        const isExpanded = expandedCategories[category.categoryId] ?? true;

        if (sortedQuestions.length > 0) {
            if (isExpanded) {
                // Add questions
                sortedQuestions.forEach((q) => {
                    items.push({
                        ...q,
                        type: "question",
                        categoryId: category.categoryId,
                        tabId: activeTab.tabId
                    });
                });

                // Add Spacer (The "Card Base")
                items.push({
                    type: "spacer",
                    questionId:
                        -1 *
                        parseInt(
                            category.categoryId.replace(/\D/g, "") || "9999"
                        ), // unique negative ID
                    categoryId: category.categoryId,
                    tabId: activeTab.tabId
                });

                groupCounts.push(sortedQuestions.length + 1); // +1 for spacer
            } else {
                groupCounts.push(0);
            }
            categories.push(category);
        }
    });

    return { items, groupCounts, categories };
};
