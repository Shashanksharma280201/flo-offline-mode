// Store to handle state for analytic component.
import { createRef } from "react";
import { View, Event } from "react-big-calendar";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

type SessionsState = {
    date: Date;
    selectedEvent?: Event;
    view: View;
    sessionEvents: Event[];
    dateRange?: {
        start: number;
        end: number;
    };

    analysisData?: {
        distanceTravelled: number;
        operationTime: number;
        energyConsumed: number;
    };
    videoRef: React.RefObject<HTMLVideoElement>;
    startingTimestamp?: number;
    endingTimestamp?: number;
};

type SessionsActions = {
    setDate: (date: Date) => void;
    setSelectedEvent: (selectedEvent?: Event) => void;
    setView: (view: View) => void;
    setSessionEvents: (sessionEvents: Event[]) => void;
    setDateRange: (dateRange: { start: number; end: number }) => void;
    setAnalysisData: (analysisData?: {
        distanceTravelled: number;
        operationTime: number;
        energyConsumed: number;
    }) => void;
    setStartingTimestamp: (startingTimestamp?: number) => void;
    setEndingTimestamp: (endingTimestamp?: number) => void;
};

const initialState: SessionsState = {
    date: new Date(),
    videoRef: createRef<HTMLVideoElement>(),
    selectedEvent: undefined,
    view: "month",
    sessionEvents: [],
    dateRange: undefined,
    analysisData: undefined,
    startingTimestamp: undefined,
    endingTimestamp: undefined
};

export const useRobotSessionsStore = create<SessionsState & SessionsActions>()(
    devtools(
        immer((set, get) => ({
            ...initialState,
            setDate: (date: Date) => set({ date }),
            setSelectedEvent: (selectedEvent?: Event) => set({ selectedEvent }),
            setView: (view: View) => set({ view }),
            setSessionEvents: (sessionEvents: Event[]) =>
                set({ sessionEvents }),
            setDateRange: (dateRange: { start: number; end: number }) =>
                set({ dateRange }),
            setAnalysisData: (analysisData?: {
                distanceTravelled: number;
                operationTime: number;
                energyConsumed: number;
            }) => set({ analysisData }),
            setStartingTimestamp: (startingTimestamp?: number) =>
                set({ startingTimestamp }),
            setEndingTimestamp: (endingTimestamp?: number) =>
                set({ endingTimestamp })
        }))
    )
);
