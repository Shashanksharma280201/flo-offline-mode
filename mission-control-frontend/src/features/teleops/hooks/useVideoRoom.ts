import Janus from "janus-gateway";
import { useState, useEffect, useCallback } from "react";
import { useJanusStore } from "../../../stores/janusStore";
import { useRobotStore } from "../../../stores/robotStore";

const useVideoRoom = () => {
    const [janusInstance, setJanusInstance] = useJanusStore((state) => [
        state.janusInstance,
        state.setJanusInstance
    ]);
    const [janusError, setJanusError] = useState<any>();
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const [isReconnecting, setIsReconnecting] = useState(false);

    const reConnectJanus = (attempt: number) => {
        if (isReconnecting || attempt >= 10) {
            // Max 10 reconnection attempts
            if (attempt >= 10) {
                console.error("Max reconnection attempts reached. Please refresh the page.");
            }
            return;
        }

        setIsReconnecting(true);

        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);

        const reConnectTimeoutId = setTimeout(() => {
            setReconnectAttempts(attempt + 1);
            connectJanus();
            setIsReconnecting(false);
        }, delay);

        return reConnectTimeoutId;
    };

    const connectJanus = useCallback(() => {
        Janus.init({
            debug: false,
            callback: () => {
                const janus = new Janus({
                    server: "wss://webrtc.flomobility.com",
                    iceServers: [
                        {
                            urls: "stun:65.0.243.2:3478"
                        },
                        {
                            urls: "turn:65.0.243.2:3478",
                            username: "flo",
                            credential:
                                "b4pmdw2JVDfTsajc1NLcmBnFiJSlHSG4YqbxcA6Qr64"
                        }
                    ],
                    success: () => {
                        console.log(
                            "Connected to Janus Media server successfully!"
                        );
                        setJanusInstance(janus);
                        // Reset reconnection attempts on successful connection
                        setReconnectAttempts(0);
                        setIsReconnecting(false);
                    },
                    error: (error) => {
                        console.log(error);
                        setJanusInstance(janus);
                        setJanusError(error);
                    },
                    destroyed: () => {
                        console.log("Janus destroyed");
                    }
                });
            }
        });
    }, []);

    useEffect(() => {
        connectJanus();

        return () => {
            useJanusStore.setState((state) => {
                if (state.janusInstance?.isConnected) {
                    state.janusInstance?.destroy({
                        success: () => {
                            console.log("Janus Destroyed successfully");
                        }
                    });
                }
                return {
                    ...state,
                    janusInstance: undefined
                };
            });
        };
    }, []);

    useEffect(() => {
        let reConnectTimeoutId: NodeJS.Timeout | undefined;
        console.log("JANUS CONNECTION", janusInstance?.isConnected());

        if (janusInstance && !janusInstance.isConnected() && !isReconnecting) {
            console.info(`Reconnection attempt ${reconnectAttempts + 1}/10 with exponential backoff`);
            reConnectTimeoutId = reConnectJanus(reconnectAttempts);
        }

        return () => {
            if (reConnectTimeoutId) {
                clearTimeout(reConnectTimeoutId);
            }
        };
    }, [janusInstance, janusInstance?.isConnected(), janusError, reconnectAttempts, isReconnecting]);
};

export default useVideoRoom;
