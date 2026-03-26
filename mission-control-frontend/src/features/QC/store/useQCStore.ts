import { create } from "zustand";
import { QCSubmission, QCAnswer, AnswerUpdatePayload } from "../types";

interface QCState {
    answers: Record<number, QCAnswer>;
    metadata: Record<string, any>;
    signOff: Record<string, any>;
    isDirty: boolean; // Managed by store
    robotId: string | null;
    submissionId: string | null;
    expandedCategories: Record<string, boolean>;

    initialize: (submission: QCSubmission | null, robotId?: string) => void;
    setAnswer: (payload: AnswerUpdatePayload) => void;
    setMetadata: (fieldId: string, value: any) => void;
    setSignOff: (fieldId: string, value: any) => void;
    reset: () => void;
    setIsDirty: (isDirty: boolean) => void;
    toggleCategory: (categoryId: string) => void;
}

export const useQCStore = create<QCState>((set) => ({
    answers: {},
    metadata: {},
    signOff: {},
    isDirty: false,
    robotId: null,
    submissionId: null,
    expandedCategories: {},

    initialize: (submission, robotId) => {
        if (!submission) {
            set({
                answers: {},
                metadata: {},
                signOff: {},
                isDirty: false,
                robotId: robotId || null,
                submissionId: null,
                expandedCategories: {}
            });
            return;
        }

        const answersMap: Record<number, QCAnswer> = {};
        if (submission.answers) {
            submission.answers.forEach((ans) => {
                answersMap[ans.questionId] = ans;
            });
        }

        set({
            answers: answersMap,
            metadata: submission.metadata || {},
            signOff: submission.signOff || {},
            isDirty: false,
            robotId: submission.robotId || robotId || null,
            submissionId: submission.id || null,
            expandedCategories: {}
        });
    },

    setAnswer: (payload) =>
        set((state) => ({
            answers: {
                ...state.answers,
                [payload.questionId]: {
                    ...state.answers[payload.questionId], // Preserve existing properties if any (though payload should be comprehensive for create)
                    ...payload
                }
            },
            isDirty: true
        })),

    setMetadata: (fieldId, value) =>
        set((state) => ({
            metadata: { ...state.metadata, [fieldId]: value },
            isDirty: true
        })),

    setSignOff: (fieldId, value) =>
        set((state) => ({
            signOff: { ...state.signOff, [fieldId]: value },
            isDirty: true
        })),

    setIsDirty: (isDirty) => set({ isDirty }),

    toggleCategory: (categoryId) =>
        set((state) => ({
            expandedCategories: {
                ...state.expandedCategories,
                [categoryId]: !(state.expandedCategories[categoryId] ?? true)
            }
        })),

    reset: () =>
        set({
            answers: {},
            metadata: {},
            signOff: {},
            isDirty: false,
            robotId: null,
            submissionId: null,
            expandedCategories: {}
        })
}));

// Selector hooks for performance optimization
export const useQCAnswer = (questionId: number) => {
    return useQCStore((state) => state.answers[questionId]);
};

export const useQCMetadata = () => useQCStore((state) => state.metadata);
export const useQCSignOff = () => useQCStore((state) => state.signOff);
export const useQCIsDirty = () => useQCStore((state) => state.isDirty);
export const useQCAnswers = () => useQCStore((state) => state.answers);
export const useQCRobotId = () => useQCStore((state) => state.robotId);
export const useQCSubmissionId = () =>
    useQCStore((state) => state.submissionId);
export const useQCExpandedCategory = (categoryId: string) =>
    useQCStore((state) => state.expandedCategories[categoryId] ?? true); // Default to expanded

// New Stats Selector Hook
export const useCategoryStats = (questionIds: number[]) => {
    return useQCStore((state) => {
        let answered = 0;
        let passed = 0;
        let repaired = 0;
        let replaced = 0;

        questionIds.forEach((id) => {
            const ans = state.answers[id];
            if (ans?.status) {
                answered++;
                if (ans.status === "passed") passed++;
                else if (ans.status === "repaired") repaired++;
                else if (ans.status === "replaced") replaced++;
            }
        });

        const total = questionIds.length;
        const percent = total > 0 ? Math.round((answered / total) * 100) : 0;

        return { total, answered, passed, repaired, replaced, percent };
    });
};
