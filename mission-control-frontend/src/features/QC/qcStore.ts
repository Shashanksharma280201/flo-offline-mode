import { create } from "zustand";
import { QCAnswer } from "./types";

interface QCState {
    answers: Record<number, QCAnswer>; // Normalized by questionId
    isDirty: boolean;

    // Actions
    setAnswer: (answer: QCAnswer) => void;
    setAnswers: (answers: QCAnswer[]) => void;
    reset: () => void;
    getAnswersArray: () => QCAnswer[];
    setIsDirty: (isDirty: boolean) => void;
}

export const useQCStore = create<QCState>((set, get) => ({
    answers: {},
    isDirty: false,

    setAnswer: (newAnswer) => {
        set((state) => {
            const currentAnswer = state.answers[newAnswer.questionId];

            // Basic equality check to avoid unnecessary updates
            if (
                currentAnswer &&
                currentAnswer.status === newAnswer.status &&
                currentAnswer.remarks === newAnswer.remarks &&
                JSON.stringify(currentAnswer.imageUrls) ===
                    JSON.stringify(newAnswer.imageUrls) &&
                currentAnswer.textResponse === newAnswer.textResponse
            ) {
                return state;
            }

            return {
                answers: {
                    ...state.answers,
                    [newAnswer.questionId]: newAnswer
                },
                isDirty: true
            };
        });
    },

    setAnswers: (answersList) => {
        const normalized: Record<number, QCAnswer> = {};
        answersList.forEach((a) => {
            normalized[a.questionId] = a;
        });
        set({ answers: normalized, isDirty: false });
    },

    reset: () => {
        set({ answers: {}, isDirty: false });
    },

    getAnswersArray: () => {
        return Object.values(get().answers);
    },

    setIsDirty: (isDirty) => {
        set({ isDirty });
    }
}));
