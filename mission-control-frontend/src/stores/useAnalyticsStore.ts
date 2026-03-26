import { AppUser, ClientData, RobotType } from "@/data/types";
import { ProcessedAppData } from "@/data/types/appDataTypes";
import dayjs, { Dayjs } from "dayjs";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

type AnalyticsMode = "single" | "multi";

type AnalyticsState = {
    startingTimestamp?: Dayjs;
    endingTimestamp?: Dayjs;
    totalLabourCost?: number;
    selectedClient?: ClientData;
    selectedClients?: ClientData[]; // For multi-client mode
    selectedRobot?: { id: string; name: string };
    processedAppData: ProcessedAppData;
    selectedAppUser?: AppUser;
    totalDistance?: number;
    gnssData?: import("@/data/types/sensorTypes").Gnss[];
    analyticsMode: AnalyticsMode; // Toggle between single and multi-client
};

type AnalyticsActions = {
    setStartingTimestamp: (startingTimestamp?: Dayjs) => void;
    setEndingTimestamp: (endingTimestamp?: Dayjs) => void;
    setTotalLabourCost: (totalLabourCost: number) => void;
    setSelectedRobot: (selectedRobot?: { id: string; name: string }) => void;
    setSelectedClient: (selectedClient?: ClientData) => void;
    setSelectedClients: (selectedClients?: ClientData[]) => void; // For multi-client mode
    setSelectedAppUser: (selectedAppUser?: AppUser) => void;
    setProcessedAppData: (processedAppData: ProcessedAppData) => void;
    setTotalDistance: (totalDistance: number) => void;
    setGnssData: (gnssData: import("@/data/types/sensorTypes").Gnss[]) => void;
    setAnalyticsMode: (mode: AnalyticsMode) => void;
};

const initialState: AnalyticsState = {
    startingTimestamp: dayjs().startOf("month"),
    endingTimestamp: dayjs(),
    totalLabourCost: 0,
    processedAppData: {
        appSessionData: [],
        downtimeData: []
    },
    totalDistance: 0,
    gnssData: [],
    analyticsMode: "single", // Default to single client mode
    selectedClients: []
};

export const useAnalyticsStore = create<AnalyticsState & AnalyticsActions>()(
    devtools(
        immer((set, get) => ({
            ...initialState,
            setStartingTimestamp: (startingTimestamp?: Dayjs) =>
                set({ startingTimestamp }),
            setEndingTimestamp: (endingTimestamp?: Dayjs) =>
                set({ endingTimestamp }),
            setTotalLabourCost: (totalLabourCost: number) =>
                set({ totalLabourCost }),
            setSelectedRobot: (selectedRobot) => set({ selectedRobot }),
            setSelectedClient: (selectedClient?: ClientData) =>
                set({ selectedClient }),
            setSelectedClients: (selectedClients?: ClientData[]) =>
                set({ selectedClients }),
            setSelectedAppUser: (selectedAppUser?: AppUser) =>
                set({ selectedAppUser }),
            setProcessedAppData: (processedAppData) => {
                set({ processedAppData });
            },
            setTotalDistance: (totalDistance: number) => set({ totalDistance }),
            setGnssData: (gnssData: import("@/data/types/sensorTypes").Gnss[]) => set({ gnssData }),
            setAnalyticsMode: (mode: AnalyticsMode) => set({ analyticsMode: mode })

        }))
    )
);
