import { useEffect, useState } from "react";
import "react-circular-progressbar/dist/styles.css";
import { FaRobot, FaClipboardCheck } from "react-icons/fa";
import {
    MdErrorOutline,
    MdInfoOutline,
    MdLaunch,
    MdOutlineTerminal,
    MdCopyAll
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ESwapScreenStatus, RobotType } from "../../../data/types";
import { useRobotStore } from "../../../stores/robotStore";
import { useUserStore } from "../../../stores/userStore";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import LogoWithFallback from "../../../components/ui/LogoWithFallback";
import { useShallow } from "zustand/react/shallow";
import { getLatestQCForRobot } from "../../QC/qcService";
import { QCSubmission } from "../../QC/types";

type OverviewPanelProps = {
    robot: RobotType | undefined;
};

/**
 * Displays robot's over-view
 *
 * Actions:
 * * Open robot sessions
 * * Teleoperate robot
 * * Open mission control
 *
 * @param robot robot info
 *
 */
const OverviewPanel = ({ robot }: OverviewPanelProps) => {
    const [error, setError] = useState<Error | undefined>();
    const [qcSubmission, setQcSubmission] = useState<QCSubmission | null>(null);
    const [qcStatus, setQcStatus] = useState<"green" | "red" | "orange">("orange");

    const setSwapScreenStatus = useUserStore(
        (state) => state.setSwapScreenStatus
    );
    const [
        robotStatus,
        robotUrl,
        rosError,
        isRosConnecting,
        isRobotConnected,
        setSelectedRobot
    ] = useRobotStore(
        useShallow((state) => [
            state.status,
            state.robotUrl,
            state.rosError,
            state.isRosConnecting,
            state.isRobotConnected,
            state.setRobot
        ])
    );

    const navigate = useNavigate();

    const launchMissionControlHandler = () => {
        setSwapScreenStatus(ESwapScreenStatus.MISSIONCONTROL);
        navigate("/dashboard");
    };

    const launchTeleopsHandler = () => {
        setSwapScreenStatus(ESwapScreenStatus.TELEOPS);
        navigate("/dashboard");
    };

    const launchLiveDashboardHandler = () => {
        setSwapScreenStatus(ESwapScreenStatus.LIVEDASHBOARD);
        navigate("/dashboard");
    };

    const launchRobotSessionsHandler = () => {
        if (robot) {
            setSelectedRobot(robot);
            navigate(`/robots/${robot.id}/sessions`);
        }
    };

    useEffect(() => {
        setError(rosError);
    }, [rosError, isRobotConnected]);

    // Fetch and analyze QC status
    useEffect(() => {
        const fetchQCStatus = async () => {
            if (!robot?.id) return;

            try {
                const latestQC = await getLatestQCForRobot(robot.id);
                setQcSubmission(latestQC);

                // Determine QC status color
                if (latestQC.status === "draft") {
                    // Draft = incomplete, show red
                    setQcStatus("red");
                } else if (latestQC.status === "submitted" || latestQC.status === "approved") {
                    // Check if all questions are answered and passed
                    const hasFailedOrRepairedOrReplaced = latestQC.answers.some(
                        (answer) => answer.status === "repaired" || answer.status === "replaced" || answer.status === null
                    );

                    if (hasFailedOrRepairedOrReplaced) {
                        setQcStatus("red");
                    } else {
                        // All answered and passed
                        setQcStatus("green");
                    }
                }
            } catch (error) {
                // No QC found or form not filled at all, show orange
                setQcStatus("orange");
            }
        };

        fetchQCStatus();
    }, [robot?.id]);

    return (
        <div className="flex h-full flex-1 flex-col justify-evenly p-5">
            <div
                className={`w-full rounded-md bg-gradient-to-r from-backgroundGray via-green-800 to-backgroundGray p-[2px]`}
            >
                <div className="flex min-h-[20vh] w-full  flex-col items-center justify-center rounded-md  bg-background p-2.5 px-6">
                    {isRosConnecting ? (
                        <div className="my-2 flex w-full flex-col  items-center justify-center gap-y-5 xs:flex-col">
                            <div>
                                <LoadingSpinner className="mb-2 h-14 w-14 animate-spin fill-white text-background" />
                            </div>
                            <div className="flex flex-col text-center">
                                <p className="mb-2 text-center text-xs">
                                    Establishing connection to the robot...
                                </p>
                            </div>
                        </div>
                    ) : robotStatus === "Offline" ? (
                        <div className="my-2 flex h-full w-full flex-col items-center justify-center gap-y-5 xs:flex-col">
                            <MdErrorOutline className="h-20 w-20 text-red-500 " />
                            <div className="flex flex-col text-center">
                                <p className="mb-2 text-center text-xs">
                                    {"Robot is offline"}
                                </p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="my-2 flex h-full w-full flex-col items-center justify-center gap-y-5 xs:flex-col">
                            <MdErrorOutline className="h-20 w-20 text-red-500 " />
                            <div className="flex flex-col text-center">
                                <p className="mb-2 text-center text-xs">
                                    {error.message ?? error}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <LogoWithFallback
                                className="h-[20vh] w-[60%]  object-contain"
                                src={robot?.image}
                                alt={`${robot?.name} logo`}
                                fallbackComponent={
                                    <div className="flex min-h-[20vh]  w-full items-center justify-center">
                                        <FaRobot className="h-16 w-16 text-backgroundGray" />
                                    </div>
                                }
                            />
                        </>
                    )}
                </div>
            </div>
            <div className="my-2 flex flex-col justify-center items-center gap-4 py-5">
                <div className="flex flex-col gap-4 items-center justify-between ">
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg text-white">{`${
                            robot?.fleet?.name ? robot?.fleet?.name : ""
                        }`}</h1>
                        <MdCopyAll
                            onClick={async () => {
                                if (robot?.id) {
                                    await navigator.clipboard.writeText(robot.id);
                                    toast.success("Robot ID copied to clipboard");
                                } else {
                                    toast.error("No Robot ID found");
                                }
                            }}
                            className="h-4 w-4 cursor-pointer text-white opacity-75 hover:opacity-100"
                            title="Copy Robot ID"
                        />
                    </div>
                    <div className="flex rounded-md border bg-transparent">
                        <div className="relative flex items-center gap-2">
                            <span
                                onClick={() => {
                                    navigate(`${robot?.id}/profile`);
                                }}
                                title="Robot Info"
                                className="flex cursor-pointer items-center gap-2 rounded-l-md p-2 hover:bg-green-600/90  hover:text-black"
                            >
                                <MdInfoOutline className="h-6 w-6" />
                                <p>Robot Info</p>
                            </span>
                        </div>
                        <div className="relative">
                            <button
                                title="SSH url"
                                onClick={async () => {
                                    if (robotUrl && robotUrl.sshUrl) {
                                        const ssh: string[] =
                                            robotUrl.sshUrl.split(":");
                                        await navigator.clipboard.writeText(
                                            `ssh ubuntu@${ssh[0]} -p ${ssh[1]}`
                                        );
                                        toast.success("Copied to clipboard");
                                    } else {
                                        toast.error("No SSH Url found");
                                    }
                                }}
                                className="flex  items-center gap-2 border-l-[0.5px] p-2  hover:bg-green-600/90 hover:text-black"
                            >
                                <MdOutlineTerminal className="h-6 w-6" />
                                <p>SSH Url</p>
                            </button>
                        </div>
                        <div className="relative">
                            <button
                                title={
                                    qcStatus === "green"
                                        ? "QC Passed - All questions passed"
                                        : qcStatus === "red"
                                        ? "QC Failed - Has incomplete/repaired/replaced items"
                                        : "QC Not Filled - No inspection data"
                                }
                                onClick={() => {
                                    navigate(`/robots/${robot?.id}/qc`);
                                }}
                                className={`flex items-center gap-2 rounded-r-md border-l-[0.5px] p-2 transition-all ${
                                    qcStatus === "green"
                                        ? "bg-green-600 text-white hover:bg-green-700"
                                        : qcStatus === "red"
                                        ? "bg-red-800 text-white hover:bg-red-700"
                                        : "bg-orange-500 text-white hover:bg-orange-600"
                                }`}
                            >
                                <FaClipboardCheck className="h-6 w-6" />
                                <p>QC</p>
                            </button>
                        </div>
                    </div>
                </div>
                <p className="my-3 text-justify text-base text-neutral-400 md:text-lg">
                    {robot?.desc}
                </p>
            </div>
            <div className="flex flex-col gap-y-4">
                <div
                    onClick={launchRobotSessionsHandler}
                    className="text-md flex w-auto cursor-pointer items-center justify-between rounded-md border bg-transparent px-4 py-4 font-semibold text-white hover:bg-white hover:font-semibold hover:text-black"
                >
                    <button>Robot Sessions</button>
                    <MdLaunch className="h-4 w-4" />
                </div>
                {robot?.macAddress ? (
                    <div
                        onClick={launchLiveDashboardHandler}
                        className="text-md flex w-auto cursor-pointer items-center justify-between rounded-md border bg-transparent px-4 py-4 font-semibold text-white hover:bg-white hover:font-semibold hover:text-black"
                    >
                        <button>Live dashboard</button>
                        <MdLaunch className="h-4 w-4" />
                    </div>
                ) : null}
                {!robot?.macAddress ? (
                    <>
                        {" "}
                        <div
                            onClick={launchTeleopsHandler}
                            className="text-md flex w-auto cursor-pointer items-center justify-between rounded-md border bg-transparent px-4 py-4 font-semibold text-white hover:bg-white hover:font-semibold hover:text-black"
                        >
                            <button>Teleoperate Bot</button>
                            <MdLaunch className="h-4 w-4" />
                        </div>
                        <div
                            onClick={launchMissionControlHandler}
                            className="text-md flex w-auto cursor-pointer items-center justify-between rounded-md border bg-transparent px-4 py-4 font-semibold text-white hover:bg-white hover:font-semibold hover:text-black"
                        >
                            <button>Mission Control</button>
                            <MdLaunch className="h-4 w-4" />
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default OverviewPanel;
