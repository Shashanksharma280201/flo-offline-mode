import { useEffect } from "react";
import { io } from "socket.io-client";
import { useRobotStore } from "../../stores/robotStore";
import { useSocketStore } from "../../stores/socketStore";
import { useUserStore } from "../../stores/userStore";
import { RobotType } from "../../data/types";
import { useShallow } from "zustand/react/shallow";

/**
 * Handles clientNamespace socket events
 * @returns clientsocket instance, active robots and clientsocket status
 */
export const useClientNamespace = () => {
    const token = useUserStore((state) => state.user?.token);
    const [robot, setRobotStatus, setRobotUrl, setRobotConnectedClients] =
        useRobotStore(
            useShallow((state) => [
                state.robot,
                state.setRobotStatus,
                state.setRobotUrl,
                state.setRobotConnectedClients
            ])
        );

    const [
        clientSocket,
        isClientSocketConnected,
        setClientSocket,
        setIsClientSocketConnected
    ] = useSocketStore(
        useShallow((state) => [
            state.clientSocket,
            state.isClientSocketConnected,
            state.setClientSocket,
            state.setIsClientSocketConnected
        ])
    );

    /**
     * Handles robot status for selected robot
     * @param status -   robot status
     */
    const robotStatusHandler = (status: {
        id: string;
        data: {
            [id: string]: string;
        };
    }) => {
        const id = status?.id;
        if (!id) return;

        const newStatus = status?.data[id] || Object.values(status.data)[0];

        // Update selected robot status (only if different)
        if (robot && robot.id === id && robot.status !== newStatus) {
            setRobotStatus(newStatus);
        }

        // Update robot in store (only if status changed)
        useUserStore.setState((state) => {
            const targetRobot = state.robots.find((r: RobotType) => r.id === id);

            // If robot not found or status unchanged, don't update
            if (!targetRobot || targetRobot.status === newStatus) {
                return state;
            }

            const updatedRobots = state.robots.map((robot: RobotType) => {
                if (robot.id === id) {
                    return { ...robot, status: newStatus };
                }
                return robot;
            });

            return {
                ...state,
                robots: updatedRobots
            };
        });
    };

    /**
     * Handles robot URL for selected robot
     * @param urlData - robot URL data
     */
    const robotUrlHandler = (urlData: any) => {
        const id = urlData?.id;
        if (robot && robot.id === id) {
            setRobotUrl(urlData?.data);
        }
    };
    const disconnectClientSocketHandler = () => {
        clientSocket?.disconnect();
    };
    const robotClientHandler = (data: any) => {
        if (data?.id && robot && robot.id !== data.id) {
            return;
        }

        setRobotConnectedClients(data?.connectedClients || data);
    };

    useEffect(() => {
        // Don't attempt connection without a valid token
        if (!token) {
            console.log("🔌 No token available, skipping socket connection");
            return;
        }

        console.log("🔌 Attempting to connect to client namespace with token:", token ? "present" : "missing");

        const socket = io("/v1/client", {
            forceNew: false,
            auth: {
                token
            },
            transports: ['websocket', 'polling'],
            timeout: 20000,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000  // Max 5 seconds between attempts
        });
        console.log("🔌 Socket instance created:", socket.id);

        setClientSocket(socket);

        // Socket.io auto-connects by default, no need to call connect() explicitly
        console.log("🔌 Socket will auto-connect...");

        return () => {
            console.log("🔌 Disconnecting socket...");
            socket.disconnect();
        };
    }, [token]);

    useEffect(() => {
        if (!clientSocket) return;

        clientSocket.on("connect", () => {
            console.log("Client Namespace Connected");
            console.log("🔌 Connection details:", {
                socketId: clientSocket.id,
                connected: clientSocket.connected,
                timestamp: new Date().toISOString()
            });
            setIsClientSocketConnected(true);
        });

        clientSocket.on("connect_error", (error) => {
            console.log(error);
            console.error("🔌 Error details:", {
                message: error.message,
                timestamp: new Date().toISOString()
            });
        });

        clientSocket.on("disconnect", (reason) => {
            console.log("Client Namespace Disconnected due to ", reason);
            console.log("🔌 Disconnect details:", {
                socketId: clientSocket.id,
                reason: reason,
                timestamp: new Date().toISOString()
            });
            setIsClientSocketConnected(false);
        });

        clientSocket.on("robot:status", robotStatusHandler);
        clientSocket.on("robot:url", robotUrlHandler);
        clientSocket.on("robot:clients", robotClientHandler);

        return () => {
            console.log("Cleared socket event listeners");
            clientSocket.off("connect");
            clientSocket.off("disconnect");
            clientSocket.off("connect_error");
            clientSocket.off("robot:status");
            clientSocket.off("robot:url");
            clientSocket.off("robot:clients");
        };
    }, [clientSocket]); // Removed 'robot' dependency - handlers access latest state via Zustand

    return {
        disconnectClientSocketHandler
    };
};
