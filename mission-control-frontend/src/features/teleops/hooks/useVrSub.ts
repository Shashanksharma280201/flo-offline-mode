import { useEffect, useState } from "react";
import { useJanusStore } from "../../../stores/janusStore";
import { useRobotStore } from "../../../stores/robotStore";
import { useTeleStore } from "../../../stores/teleStore";
import { JanusJS } from "janus-gateway";
import { SonarMessage } from "../../../data/types";
import { Quaternion, Vector3 } from "three";
import { useMissionsStore } from "../../../stores/missionsStore";
import { useShallow } from "zustand/react/shallow";

const useVrSub = (robotId: string | undefined) => {
    const [
        janusInstance,
        vRSubHandle,
        setVRSubHandle,
        setIsJanusFeedSubscriber,
        restartSubscriber
    ] = useJanusStore(
        useShallow((state) => [
            state.janusInstance,
            state.vRSubHandle,
            state.setVRSubHandle,
            state.setIsJanusFeedSubscriber,
            state.restartSubscriber
        ])
    );
    const [message, setMessage] = useState<any>();
    const setSonarData = useRobotStore((state) => state.setSonarData);
    const [setRobotYaw, setLatLng] = useMissionsStore(
        useShallow((state) => [state.setRobotYaw, state.setLatLng])
    );

    const [streams, setStreams, setStreamBitrates, resetStreams] = useTeleStore(
        useShallow((state) => [
            state.streams,
            state.setStreams,
            state.setStreamBitrates,
            state.resetStreams
        ])
    );
    const isRobotConnected = useRobotStore((state) => state.isRobotConnected);

    const joinJanusVideoRoom = (pluginHandle: JanusJS.PluginHandle) => {
        if (!pluginHandle) {
            console.log("No attached plugin to join room");
            return;
        }
        if (!robotId) {
            console.error("No Robot selected");
            return;
        }
        pluginHandle.send({
            message: {
                request: "join",
                ptype: "subscriber",
                room: "1234",
                streams: [
                    {
                        feed: robotId
                    }
                ]
            }
        });
    };

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        if (message) {
            const errorCode = message["error_code"];

            if (errorCode === 428) {
                if (vRSubHandle) {
                    if (!vRSubHandle.detached) {
                        timeoutId = setTimeout(() => {
                            joinJanusVideoRoom(vRSubHandle);
                        }, 5000);
                    }
                } else {
                    console.error("No videroom publisher");
                }
            }
        }
        return () => {
            clearTimeout(timeoutId);
        };
    }, [message, vRSubHandle]);

    useEffect(() => {
        const pos = new Vector3();
        const quart = new Quaternion();
        let pluginHandle: JanusJS.PluginHandle;
        if (janusInstance) {
            janusInstance?.attach({
                plugin: "janus.plugin.videoroom",
                success: (handle) => {
                    pluginHandle = handle;
                    setVRSubHandle(handle);

                    console.log(`Plugin attached! (${handle.getPlugin()})`);
                    joinJanusVideoRoom(handle);
                },
                error: (error) => {
                    console.error("Error attaching plugin:", error);
                },
                iceState: (state) => {
                    console.log("ICE state changed to " + state);
                    if (state === "connected") {
                        setIsJanusFeedSubscriber(true);
                    } else {
                        setIsJanusFeedSubscriber(false);
                    }
                },
                webrtcState: (on) => {
                    console.log(
                        "Janus says our WebRTC PeerConnection is " +
                            (on ? "Active" : "Inactive")
                    );
                },

                onmessage: (message, jsep) => {
                    setMessage(message);

                    if (jsep) {
                        console.debug("Handling SDP", jsep);
                        const tracks = [
                            { type: "data" }
                        ] as JanusJS.TrackOption[];
                        pluginHandle.createAnswer({
                            jsep: jsep,
                            tracks,
                            success: (jsep) => {
                                console.log("Got SDP!: ", jsep);
                                const subscribe = {
                                    request: "start",
                                    room: "1234"
                                };
                                pluginHandle.send({
                                    message: subscribe,
                                    jsep: jsep
                                });
                            },
                            error: (error) => {
                                console.error("Webrtc error: ", error);
                            }
                        });
                    }
                },
                ondata: (data: string) => {
                    if (useRobotStore.getState().tcpOnly) {
                        return;
                    }
                    const {
                        pose,
                        sonar
                    }: {
                        pose: {
                            latitude: number;
                            longitude: number;
                            pose: {
                                point: {
                                    x: number;
                                    y: number;
                                };
                                yaw: number;
                            };
                        };
                        sonar: {
                            [sonarName: string]: SonarMessage;
                        };
                    } = JSON.parse(data);
                    if (pose) {
                        const latLng = {
                            lat: pose.latitude,
                            lng: pose.longitude
                        };
                        setRobotYaw(pose.pose.yaw);
                        setLatLng(latLng);
                    }
                    if (sonar) {
                        // console.log("sonar", sonar);
                        setSonarData(sonar);
                    }
                },
                onlocaltrack: (track, on) => {},
                onremotetrack: async (track, mid, added, metadata) => {
                    console.log(track, mid, added, metadata);
                    if (track.kind === "video" && added ) {
                        console.log(
                            "Remote track " +
                                (added ? "added" : "removed") +
                                ":",
                            track
                        );
                        if (mid === "0") {
                            console.log("Stream one");
                            const stream = new MediaStream([track]);

                            setStreams({ "0": stream });
                        } else {
                            console.log("Stream two");
                            const stream = new MediaStream([track]);
                            setStreams({ "1": stream });
                        }
                    }
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
            setVRSubHandle(undefined);
            setIsJanusFeedSubscriber(false);
            resetStreams();
        };
    }, [janusInstance, restartSubscriber, isRobotConnected]);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        if (message) {
            const errorCode = message["error_code"];

            if (errorCode === 428) {
                if (vRSubHandle) {
                    if (!vRSubHandle.detached) {
                        timeoutId = setTimeout(() => {
                            joinJanusVideoRoom(vRSubHandle);
                        }, 5000);
                    }
                }
            }
        }
        return () => {
            clearTimeout(timeoutId);
        };
    }, [message, vRSubHandle]);

    useEffect(() => {
        let intervalIds: NodeJS.Timeout[] = [];
        if (Object.keys(streams).length > 0) {
            if (vRSubHandle) {
                Object.keys(streams).map((streamId) => {
                    const bitrateTimerId = setInterval(() => {
                        const bitrate = vRSubHandle.getBitrate(
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            streamId
                        );
                        setStreamBitrates({
                            [streamId]: bitrate
                        });
                    }, 1000);
                    intervalIds.push(bitrateTimerId);
                });
            }
        }

        return () => {
            if (intervalIds.length > 0) {
                intervalIds.map((intervalId) => {
                    clearInterval(intervalId);
                });
            }
        };
    }, [vRSubHandle, streams]);
};

export default useVrSub;
