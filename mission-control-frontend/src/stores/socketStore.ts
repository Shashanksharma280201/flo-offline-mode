import { create } from "zustand";
import { Socket } from "socket.io-client";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

type SocketState = {
    clientSocket: Socket | undefined;
    isClientSocketConnected: boolean;
};


type SocketActions = {
    setClientSocket: (clientSocket: Socket | undefined) => void;
    setIsClientSocketConnected: (isConnected: boolean) => void;
};


const initialState: SocketState = {
    clientSocket: undefined,
    isClientSocketConnected: false
};

/**
 * Zustand store for managing socket state and actions.
 * 
 * useSocketStore<{@link SocketState} & {@link SocketActions}>
 * 
 */
export const useSocketStore = create<SocketState & SocketActions>()(
    devtools(
        immer((set, get) => ({
            ...initialState,
            setClientSocket: (clientSocket: Socket | undefined) => {
                set({
                    clientSocket
                });
            },
            setIsClientSocketConnected: (isConnected: boolean) => {
                set({
                    isClientSocketConnected: isConnected
                });
            }
        }))
    )
);
