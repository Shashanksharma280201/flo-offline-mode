import { useEffect, useState } from "react";
import { useJanusStore } from "../../../stores/janusStore";
import { JanusJS } from "janus-gateway";
import { toast } from "react-toastify";
import { useRobotStore } from "../../../stores/robotStore";
import { useShallow } from "zustand/react/shallow";

const useVrPub = (robotId: string | undefined) => {
    const [
        janusInstance,
        setIsJanusDataPublisher,
        vRSubHandle,
        vRPubHandle,
        setVRPubHandle,
        setIsJanusDataPeerActive
    ] = useJanusStore(
        useShallow((state) => [
            state.janusInstance,
            state.setIsJanusDataPublisher,
            state.vRSubHandle,
            state.vRPubHandle,
            state.setVRPubHandle,
            state.setIsJanusDataPeerActive
        ])
    );

    const setIsTeleOperating = useRobotStore(
        (state) => state.setIsTeleOperating
    );
    const [message, setMessage] = useState<any>();

    const joinVideoRoomAsPublisher = (handle: JanusJS.PluginHandle) => {
        if (robotId) {
            handle.send({
                message: {
                    request: "join",
                    ptype: "publisher",
                    room: "1234",
                    id: `${robotId}-data`
                }
            });
        } else {
            console.error("No Robot Selected");
            handle.detach();
            return;
        }
        handle.createOffer({
            tracks: [
                {
                    type: "data",
                    capture: false,
                    mid: "joystick"
                }
            ],
            iceRestart: true,
            success: (jsep) => {
                console.log("Got publisher SDP!: ", jsep);
                const publish = {
                    request: "configure",
                    audio: false,
                    video: false,
                    data: true
                };
                handle.send({
                    message: publish,
                    jsep: jsep
                });
            },
            error: (error) => {
                console.error("Webrtc error: ", error);
            }
        });
    };

    useEffect(() => {
        let pluginHandle: JanusJS.PluginHandle;
        if (janusInstance) {
            janusInstance?.attach({
                plugin: "janus.plugin.videoroom",
                success: (handle) => {
                    pluginHandle = handle;
                    console.log("Setting Plugin Handle");
                    setVRPubHandle(handle);
                    console.log(`Plugin attached! (${handle.getPlugin()})`);
                    joinVideoRoomAsPublisher(handle);
                },
                error: (error) => {
                    console.error("Error attaching plugin:", error);
                },
                iceState: (state) => {
                    console.log("ICE state changed to " + state);
                    if (state === "connected") {
                        setIsJanusDataPeerActive(true);
                    } else {
                        setIsJanusDataPeerActive(false);
                    }
                },
                webrtcState: (on) => {
                    console.log(
                        "Janus says our WebRTC PeerConnection is " +
                            (on ? "Active" : "Inactive")
                    );
                },
                onmessage: (message, jsep) => {
                    console.log(message);
                    setMessage(message);

                    if (jsep) {
                        console.debug("Handling SDP", jsep);
                        pluginHandle.handleRemoteJsep({
                            jsep: jsep
                        });
                    }
                },
                onlocaltrack: (track, on) => {
                    console.log(
                        "Local track " + (on ? "added" : "removed") + ":",
                        track
                    );
                },
                onremotetrack: (track, mid, on) => {
                    console.log(track, mid, on);
                },
                ondata: (data: never) => {},
                ondataopen: () => {
                    console.log("Data channel opened");
                }
            });
        }

        return () => {
            if (pluginHandle) {
                try {
                    pluginHandle.detach();
                } catch (error) {
                    console.log(error);
                }
            }
            setVRPubHandle(undefined);
            setIsJanusDataPublisher(false);
            setIsJanusDataPeerActive(false);
        };
    }, [janusInstance]);

    useEffect(() => {
        if (vRPubHandle) {
            if (message) {
                const joiningId = message?.joining?.id;
                const errorCode = message["error_code"];

                if (errorCode === 436) {
                    toast.error("Bot is already being teleoperated");
                    setIsTeleOperating(false);
                }

                if (joiningId === robotId) {
                    if (vRSubHandle) {
                        console.log(
                            "Restarting Subscriber due to publisher Restart."
                        );

                        useJanusStore.setState((state) => {
                            return {
                                ...state,
                                restartSubscriber: !state.restartSubscriber
                            };
                        });
                    }
                }
            }
        }
    }, [message, vRPubHandle, vRSubHandle]);
};

export default useVrPub;
