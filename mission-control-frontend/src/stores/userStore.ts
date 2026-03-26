import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { ClientData, ESwapScreenStatus, IUser, RobotType } from "../data/types";
import { getCurrentUser } from "../features/auth/authService";


type UserState = {
    user: IUser | null;
    robots: RobotType[];
    clients: ClientData[];
    swapScreenStatus: ESwapScreenStatus;
};
type UserActions = {
    setUser: (user: IUser | null) => void;
    setRobots: (robots: RobotType[]) => void;
    setClients: (clients: ClientData[]) => void;
    setSwapScreenStatus: (screenName: ESwapScreenStatus) => void;
};
const user = getCurrentUser();

const initialState: UserState = {
    user: user ? user : null,
    robots: [],
    clients: [],
    swapScreenStatus: ESwapScreenStatus.MISSIONCONTROL
};

/**
 * Zustand store for user
 */
export const useUserStore = create<UserState & UserActions>()(
    devtools((set, get) => ({
        ...initialState,
        setUser: (newUser) => {
            set({ user: newUser });
        },
        setRobots: (robots: RobotType[]) => {
            set({ robots });
        },
        setClients: (clients: ClientData[]) => {
            set({ clients });
        },
        setSwapScreenStatus: (screenName) => {
            set({ swapScreenStatus: screenName });
        }
    }))
);
