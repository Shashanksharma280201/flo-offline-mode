import { create } from "zustand";
import {
    MMRobot,
    RobotSummary,
    RobotsByLocation,
    MMRIssue,
    MMRIssueSummary,
    MMROperator,
    OperatorSummary,
    DailyRobotLog
} from "@/data/types";

type OperationsStore = {
    // Robot State
    robots: MMRobot[];
    selectedRobot?: MMRobot;
    robotSummary?: RobotSummary;
    robotsByLocation: RobotsByLocation[];

    // Issue State
    issues: MMRIssue[];
    selectedIssue?: MMRIssue;
    issueSummary?: MMRIssueSummary;

    // Operator State
    operators: MMROperator[];
    selectedOperator?: MMROperator;
    operatorSummary?: OperatorSummary;

    // Daily Logs
    dailyLogs: DailyRobotLog[];
    selectedDate: Date;

    // Filters
    filters: {
        city?: string;
        status?: string;
        client?: string;
        issueType?: string;
        issueSeverity?: string;
    };

    // Actions - Robots
    setRobots: (robots: MMRobot[]) => void;
    setSelectedRobot: (robot?: MMRobot) => void;
    setRobotSummary: (summary: RobotSummary) => void;
    setRobotsByLocation: (byLocation: RobotsByLocation[]) => void;
    updateRobotStatus: (robotId: string, status: string) => void;

    // Actions - Issues
    setIssues: (issues: MMRIssue[]) => void;
    setSelectedIssue: (issue?: MMRIssue) => void;
    setIssueSummary: (summary: MMRIssueSummary) => void;
    addIssue: (issue: MMRIssue) => void;
    updateIssue: (issueId: string, updates: Partial<MMRIssue>) => void;

    // Actions - Operators
    setOperators: (operators: MMROperator[]) => void;
    setSelectedOperator: (operator?: MMROperator) => void;
    setOperatorSummary: (summary: OperatorSummary) => void;

    // Actions - Daily Logs
    setDailyLogs: (logs: DailyRobotLog[]) => void;
    setSelectedDate: (date: Date) => void;

    // Actions - Filters
    setFilters: (filters: Partial<OperationsStore["filters"]>) => void;
    clearFilters: () => void;
};

export const useOperationsStore = create<OperationsStore>((set) => ({
    // Initial State
    robots: [],
    selectedRobot: undefined,
    robotSummary: undefined,
    robotsByLocation: [],

    issues: [],
    selectedIssue: undefined,
    issueSummary: undefined,

    operators: [],
    selectedOperator: undefined,
    operatorSummary: undefined,

    dailyLogs: [],
    selectedDate: new Date(),

    filters: {},

    // Robot Actions
    setRobots: (robots) => set({ robots }),
    setSelectedRobot: (robot) => set({ selectedRobot: robot }),
    setRobotSummary: (summary) => set({ robotSummary: summary }),
    setRobotsByLocation: (byLocation) => set({ robotsByLocation: byLocation }),
    updateRobotStatus: (robotId, status) =>
        set((state) => ({
            robots: state.robots.map((robot) =>
                robot._id === robotId ? { ...robot, status: status as any } : robot
            )
        })),

    // Issue Actions
    setIssues: (issues) => set({ issues }),
    setSelectedIssue: (issue) => set({ selectedIssue: issue }),
    setIssueSummary: (summary) => set({ issueSummary: summary }),
    addIssue: (issue) =>
        set((state) => ({
            issues: [issue, ...state.issues]
        })),
    updateIssue: (issueId, updates) =>
        set((state) => ({
            issues: state.issues.map((issue) =>
                issue._id === issueId ? { ...issue, ...updates } : issue
            )
        })),

    // Operator Actions
    setOperators: (operators) => set({ operators }),
    setSelectedOperator: (operator) => set({ selectedOperator: operator }),
    setOperatorSummary: (summary) => set({ operatorSummary: summary }),

    // Daily Log Actions
    setDailyLogs: (logs) => set({ dailyLogs: logs }),
    setSelectedDate: (date) => set({ selectedDate: date }),

    // Filter Actions
    setFilters: (filters) =>
        set((state) => ({
            filters: { ...state.filters, ...filters }
        })),
    clearFilters: () => set({ filters: {} })
}));
