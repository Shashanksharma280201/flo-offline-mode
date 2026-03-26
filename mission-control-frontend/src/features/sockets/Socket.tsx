import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import io, { Socket } from "socket.io-client";
import { useRobotStore } from "../../stores/robotStore";
type response = {
    [x: string]: string;
};

/**
 * Handles socket connections for Trial Screen that contains edge details for developement purposes
 * @param RobotData - contains robot details
 *
 */
function RobotSocket({ url, name }: { url: string; name?: string }) {
    const [isConnected, setIsConnected] = useState<boolean | null>(null);
    const [port, setPort] = useState<number>(0);
    const [token, setToken] = useState<string>("");
    const [masterSocket, setMasterSocket] = useState<Socket | null>(null);
    const [rtcmData, setRtcmData] = useState<string>();

    useEffect(() => {
        const socket = io(url, {
            forceNew: false,
            auth: {
                token
            }
        });
        setMasterSocket(socket);
        if (!masterSocket) {
            socket.connect();
        }
        return () => {
            socket.disconnect();
        };
    }, [token]);
    let timeoutId: NodeJS.Timeout;
    useEffect(() => {
        masterSocket?.on("connect", () => {
            setIsConnected(true);
        });

        masterSocket?.on("connect_error", (err: any) => {
            console.error(err.message);
            toast.error(err.message);
        });

        masterSocket?.on("robot:rtcm", (data) => {
            const array = new Uint8Array(data);
            console.log(array);
            clearTimeout(timeoutId);
            setRtcmData(array.toString());
            timeoutId = setTimeout(() => {
                setRtcmData("");
            }, 5000);
        });

        masterSocket?.on("disconnect", () => {
            setIsConnected(false);
        });

        return () => {
            masterSocket?.off("connect");
            masterSocket?.off("disconnect");
            masterSocket?.off("connect_err");
            masterSocket?.off("robot:rtcm");
        };
    }, [masterSocket]);
    /**
     *  Handles socket opening and closing connection
     */
    const connectHandler = () => {
        setRtcmData("");
        if (isConnected) {
            masterSocket?.disconnect();
        } else {
            masterSocket?.connect();
        }
    };

    /**
     *  Emits URL to server
     */
    const sendUrlHandler = () => {
        if (isConnected) {
            masterSocket?.emit(
                "robot:url",
                {
                    rosbridgeUrl: `mc-dev.flomobility.com:${port}`,
                    sshUrl: "mc-dev.flomobility.com:26286"
                },
                (data: any) => {
                    console.log(data);
                    console.log("Sent URL to the server");
                }
            );
        }
    };
    const sendGpsHandler = () => {
        if (isConnected) {
            masterSocket?.emit(
                "robot:gps",
                {
                    latitude: 12.92014302274929,
                    longitude: 77.66546953776084
                },
                (response: any) => {
                    console.log(response);
                    console.log("Sent GPS to the server");
                }
            );
        }
    };

    /**
     *  Emits mode to server
     */
    const sendModeHandler = () => {
        if (isConnected) {
            masterSocket?.emit(
                "robot:state",
                {
                    mode: "Teleops",
                    location: "FLo mobility"
                },
                (data: any) => {
                    console.log(data);
                    console.log("Mode recieved by server");
                }
            );
        }
    };

    return (
        <div className="flex flex-col p-5">
            <div className="mb-10 flex items-center gap-x-5 ">
                <label htmlFor="token"> Token </label>
                <input
                    name="token"
                    className="w-32 overflow-hidden rounded-sm bg-backgroundGray p-2.5 text-center text-xs text-white outline-none"
                    type="text"
                    value={token}
                    onChange={(event) => {
                        setToken(event.target.value);
                    }}
                />
                <p>{name}</p>
                <p>Connected: {"" + isConnected}</p>
                <button
                    onClick={connectHandler}
                    className="w-auto rounded-md bg-green-500 p-2.5 text-sm font-semibold text-white hover:scale-[98%]"
                >
                    {isConnected ? "Disconnect" : "Connect"}
                </button>
                <button
                    onClick={sendModeHandler}
                    className="w-auto rounded-md bg-green-500 p-2.5 text-sm font-semibold text-white hover:scale-[98%]"
                >
                    Set Mode
                </button>
                <button
                    onClick={sendUrlHandler}
                    className="w-auto rounded-md bg-green-500 p-2.5 text-sm font-semibold text-white hover:scale-[98%]"
                >
                    Set URL
                </button>
                <button
                    onClick={sendGpsHandler}
                    className="w-auto rounded-md bg-green-500 p-2.5 text-sm font-semibold text-white hover:scale-[98%]"
                >
                    Set GPS
                </button>

                <label htmlFor="port"> Port </label>
                <input
                    name="port"
                    pattern="^[0-9]*$"
                    className="w-32 rounded-sm bg-backgroundGray p-2.5 text-center text-xs text-white outline-none"
                    type="text"
                    value={port}
                    onChange={(event) => {
                        setPort(
                            event.target.validity.valid
                                ? Number(event.target.value)
                                : 0
                        );
                    }}
                />
                {rtcmData && <p>Rtcm Data: {rtcmData}</p>}
            </div>
        </div>
    );
}

export default RobotSocket;
