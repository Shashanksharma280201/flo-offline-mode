import { useEffect, useState } from "react";
import { MdCircle, MdClose, MdCopyAll } from "react-icons/md";
import { useRobotStore } from "../../../stores/robotStore";
import OverviewPanel from "./OverviewPanel";
import LogsPanel from "./LogsPanel";
import { useSocketStore } from "../../../stores/socketStore";
import ConnectedClients from "./ConnectedClients";
import { toast } from "react-toastify";
import { useShallow } from "zustand/react/shallow";

type RobotLaunchPadProps = {
    onCloseLaunchPad: () => void;
};

const tabs = ["Overview", "Logs"];

/**
 * A component that opens to right which contains overview and logs of selected robot
 */
const RobotLaunchPad = ({ onCloseLaunchPad }: RobotLaunchPadProps) => {
    const [tab, setTab] = useState<string>(tabs[0]);

    const [robot, status, setRobotState, robotUrl, setRobotUrl, logs] =
        useRobotStore(
            useShallow((state) => [
                state.robot,
                state.status,
                state.setRobotState,
                state.robotUrl,
                state.setRobotUrl,
                state.logs
            ])
        );

    const clientSocket = useSocketStore((state) => state.clientSocket);

    const connectedClients = useRobotStore(
        (state) => state.state.connectedClients
    );

    useEffect(() => {
        if (robot) {
            console.log("Requesting robot info");
            clientSocket?.emit(
                "robot:info",
                { id: robot?.id },
                (response: any) => {
                    console.log(response);
                    const id = response?.data?.id;
                    if (robot && robot.id === id) {
                        console.log(
                            "Updated robot state successfully for ",
                            robot.name
                        );
                        const mode = response?.data?.mode;
                        const location = response?.data?.location;
                        const connectedClients =
                            response?.data?.connectedClients;
                        setRobotState({ mode, location, connectedClients });
                        const url: {
                            rosbridgeUrl: string | undefined;
                            sshUrl: string | undefined;
                        } = response?.data?.url;

                        if (
                            robotUrl?.rosbridgeUrl !== url.rosbridgeUrl ||
                            url.rosbridgeUrl === "" ||
                            !url.rosbridgeUrl
                        ) {
                            console.log("Setting robot Url");
                            setRobotUrl(url);
                        }
                    }
                }
            );
        }
    }, [robot]);

    return (
        <div className="no-scrollbar absolute top-0 z-[100]  flex h-screen max-h-screen w-full flex-col overflow-x-hidden overflow-y-scroll bg-gray-900 text-sm text-white max-md:left-0 md:right-0 md:w-[25vw] md:border  md:border-border md:text-lg">
            <div className="flex min-h-[3.5rem] items-center justify-between px-5">
                <div className="flex items-center gap-x-2">
                    <MdCircle
                        className={`${
                            status === "Active"
                                ? "text-primary700"
                                : "text-red-500"
                        } h-4 w-4`}
                    />
                    <div className="text-base font-semibold md:text-lg">
                        {robot?.name}
                    </div>
                    <MdCopyAll
                        onClick={async () => {
                            if (robot?.id) {
                                await navigator.clipboard.writeText(robot?.id);
                                toast.success("Copied to clipboard");
                            } else {
                                toast.error("No ROS Url found");
                            }
                        }}
                        className="h-4 w-4 cursor-pointer text-white opacity-75 hover:opacity-100"
                    />
                </div>
                <div className="flex items-center justify-between gap-x-1">
                    {connectedClients && (
                        <ConnectedClients connectedClients={connectedClients} />
                    )}
                    <div className="flex items-center justify-center">
                        <button
                            onClick={() => {
                                onCloseLaunchPad();
                            }}
                        >
                            <MdClose className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
            <div className="flex min-h-[3.5rem] w-full justify-between  border-b border-t border-border px-2.5 text-sm md:text-lg">
                <button
                    className={`flex-1 ${tab !== tabs[0] && "text-[#979797]"}`}
                    onClick={() => {
                        setTab(tabs[0]);
                    }}
                >
                    {tabs[0]}
                </button>
                <button
                    className={`flex-1 ${tab !== tabs[1] && "text-[#979797]"}`}
                    onClick={() => {
                        setTab(tabs[1]);
                    }}
                >
                    {tabs[1]}
                </button>
            </div>
            <div className="flex flex-1 flex-col">
                {tab === tabs[0] ? (
                    <OverviewPanel robot={robot} />
                ) : (
                    <LogsPanel logs={logs} />
                )}
            </div>
        </div>
    );
};
export default RobotLaunchPad;
