import { ChangeEvent, useEffect, useState, useRef } from "react";
import { MdAdd, MdErrorOutline, MdSearch } from "react-icons/md";
import { FaMapMarkedAlt, FaRobot } from "react-icons/fa";

import { RobotType } from "../data/types";
import RobotLaunchPad from "../features/robots/robotLaunchPad/RobotLaunchPad";
import { useRobotStore } from "../stores/robotStore";
import { useUserStore } from "../stores/userStore";
import { useSocketStore } from "../stores/socketStore";
import { useRosFns } from "../lib/ros/useRosFns";
import RobotMapView from "../features/robots/map/RobotMapView";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Navbar from "../components/nav/Navbar";
import RobotForm from "../features/robots/robotForm/RobotForm";
import LogoWithFallback from "../components/ui/LogoWithFallback";
import useRobots from "@/hooks/useRobots";
import { checkPermission } from "@/util/roles";
import { useShallow } from "zustand/react/shallow";
import { sortRobotsByName } from "@/util/sortRobots";

/**
 * This page displays robot's Details along with their status
 */
const Robots = () => {
    const [showLaunchPad, setShowLaunchPad] = useState(false);
    const [showRobotForm, setShowRobotForm] = useState(false);
    const [showMaps, setShowMaps] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchValue, setSearchValue] = useState("");

    // Ref for the search input to handle focus
    const searchInputRef = useRef<HTMLInputElement>(null);
    // Ref for the scrollable container
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [user, robots] = useUserStore(
        useShallow((state) => [state.user, state.robots])
    );
    const [robot, setRobot, setRobotStatus, resetRobot, isRobotConnected] =
        useRobotStore(
            useShallow((state) => [
                state.robot,
                state.setRobot,
                state.setRobotStatus,
                state.resetRobot,
                state.isRobotConnected
            ])
        );
    const { rosDisconnectHandler } = useRosFns();
    const clientSocket = useSocketStore((state) => state.clientSocket);

    // useRobots now returns a query, not a mutation - auto-fetches on mount
    const {
        refetch: fetchRobotsList,
        isLoading,
        isError,
        isSuccess
    } = useRobots();

    /**
     * Calls fetchRobotList to refetch the data
     */
    const refetchRobotslistHandler = () => {
        fetchRobotsList();
    };

    const launchBotHandler = (selectedRobot: RobotType, status: string) => {
        if (selectedRobot.id !== robot?.id) {
            emitUserDisconnectionStatus();
            rosDisconnectHandler();
            resetRobot();
            setRobot(selectedRobot);
            setRobotStatus(status);
        }
        setShowLaunchPad(true);
    };

    const closeLaunchPadHandler = () => {
        setShowLaunchPad(false);
        setRobot(undefined);
    };

    const mapsHandler = () => {
        setShowMaps((prev) => !prev);
    };

    const createRobotHandler = () => {
        setShowRobotForm(true);
    };

    /**
     * Set state searchValue on change in searchField
     * @param event-searchField input values
     */
    const searchValueChangeHandler = (event: ChangeEvent<HTMLInputElement>) => {
        event.preventDefault();
        setSearchValue(event.target.value);
    };

    /**
     * Checks for robot matches with searchField value
     *
     * @param robot - robot details from robots state
     * @returns boolean value on wheter to display robot in Robots  page according to searchValue
     */
    const filterRobotsOnSearch = (robot: RobotType) => {
        if (searchValue === "") {
            return true;
        }
        const reSearchValue = searchValue.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );
        const re = new RegExp(reSearchValue, "i");

        if (robot.name.match(re)) {
            return true;
        }
        return false;
    };

    const emitUserConnectionStatus = () => {
        clientSocket?.emit(
            "user:connect",
            {
                id: robot?.id,
                email: user?.email,
                name: user?.name
            },
            (response: any) => {
                console.log(response);
            }
        );
    };

    const emitUserDisconnectionStatus = () => {
        clientSocket?.emit(
            "user:disconnect",
            {
                id: robot?.id,
                email: user?.email,
                name: user?.name
            },
            (response: any) => {
                console.log(response);
            }
        );
    };

    // No need for manual fetch - useQuery auto-fetches on mount

    useEffect(() => {
        if (robot && isRobotConnected) {
            emitUserConnectionStatus();
        }
    }, [isRobotConnected]);

    // Handle "/" toggle and auto-focus for search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if user is typing in an input already
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            if (e.key === "/") {
                e.preventDefault();
                setShowSearch(true);
                // Timeout to ensure the element is visible before focusing
                setTimeout(() => {
                    searchInputRef.current?.focus();
                }, 0);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Maintain scroll position when navigating back
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || !isSuccess) return;

        const savedPosition = sessionStorage.getItem("robots-scroll-pos");
        if (savedPosition) {
            container.scrollTop = parseInt(savedPosition, 10);
        }

        const handleScroll = () => {
            sessionStorage.setItem(
                "robots-scroll-pos",
                container.scrollTop.toString()
            );
        };

        container.addEventListener("scroll", handleScroll);
        return () => container.removeEventListener("scroll", handleScroll);
    }, [isSuccess]);

    return (
        <div className={`relative flex h-screen max-h-screen bg-blue-900/25`}>
            <div className="flex h-full w-full flex-col  text-white ">
                <div
                    className={`flex min-h-[5rem] items-center justify-between bg-gray-800/25 px-6 md:min-h-[7rem] md:px-8  ${
                        showLaunchPad ? "md:w-[75vw]" : "w-full"
                    }`}
                >
                    <div className="flex items-center justify-center gap-6">
                        <Navbar />
                        <div className="text-base font-semibold md:text-xl">
                            Robots
                        </div>
                    </div>

                    <div>
                        <div className="flex flex-row gap-x-2 rounded-md">
                            <div
                                className={`hidden items-center justify-end space-x-2 rounded-md border p-2 text-sm md:flex md:text-lg ${
                                    showSearch
                                        ? "border-white bg-gray-700/30"
                                        : "border-transparent bg-transparent"
                                }`}
                            >
                                <label
                                    htmlFor="Search"
                                    className="flex items-center"
                                >
                                    <MdSearch
                                        className="text-bold relative h-5 w-5 cursor-pointer text-white hover:text-neutral-400"
                                        onClick={() => {
                                            setShowSearch((prev) => !prev);
                                        }}
                                    />
                                </label>
                                <input
                                    ref={searchInputRef}
                                    value={searchValue}
                                    onChange={searchValueChangeHandler}
                                    type="text"
                                    placeholder="Search robots"
                                    className={`appearance-none ${
                                        showSearch ? "flex" : "hidden"
                                    } w-full items-center bg-transparent text-sm text-white placeholder:text-neutral-400 focus:outline-none md:text-lg`}
                                />
                            </div>
                            <button
                                className={`hidden items-center gap-x-2 font-semibold md:flex md:rounded-md md:border md:p-2.5 md:hover:border-white md:hover:bg-white md:hover:text-black ${
                                    showMaps
                                        ? "bg-white text-black"
                                        : "bg-transparent text-white"
                                }`}
                                onClick={mapsHandler}
                            >
                                <FaMapMarkedAlt
                                    className={`h-6 w-6 md:h-5 md:w-5 `}
                                />
                            </button>
                            {checkPermission("change_robots") && (
                                <button
                                    className="flex items-center gap-x-2 md:rounded-md md:border md:p-2.5 md:font-semibold md:hover:border-green-500 md:hover:bg-green-500"
                                    onClick={createRobotHandler}
                                >
                                    <div className="hidden text-sm md:block md:text-lg">
                                        Create
                                    </div>
                                    <MdAdd className="h-6 w-6 md:h-5 md:w-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                <div>
                    <div className="hidden h-[0.1vh] items-center justify-end bg-border md:mb-8 md:flex"></div>
                </div>

                <div className="mb-4 px-6  md:hidden">
                    <label
                        htmlFor="Search"
                        className="flex  items-center rounded-md bg-backgroundGray px-2.5 py-2 text-sm  text-white transition-colors
                        ease-in md:text-lg"
                    >
                        <input
                            value={searchValue}
                            onChange={searchValueChangeHandler}
                            type="text"
                            placeholder="Search robots"
                            className="block w-full appearance-none items-center bg-transparent p-2.5 text-xs text-white placeholder:text-neutral-400 focus:outline-none"
                        />
                        <MdSearch className="h-6 w-6 text-white hover:text-gray-400" />
                    </label>
                </div>
                <div
                    className={`flex h-[81%] flex-row justify-center ${
                        showLaunchPad ? "md:w-[75vw]" : "w-full"
                    }`}
                >
                    {showMaps ? (
                        <div className="ml-8 hidden h-full w-1/2 overflow-hidden rounded-md pb-4 md:block ">
                            <div className=" h-full overflow-hidden rounded-md border border-border">
                                <RobotMapView />
                            </div>
                        </div>
                    ) : null}
                    {showRobotForm ? (
                        <RobotForm
                            onRefetchRobotslist={refetchRobotslistHandler}
                            closeRobotForm={() => {
                                setShowRobotForm(false);
                            }}
                        />
                    ) : null}
                    {isError && (
                        <div
                            className={`flex h-full w-full flex-1 flex-col items-center  justify-center p-6`}
                        >
                            <MdErrorOutline className="mb-6 h-24 w-24 text-red-500 " />
                            <p className="mb-2 text-sm md:text-lg">
                                Error retrieving robots list!
                            </p>
                            <button
                                onClick={refetchRobotslistHandler}
                                className="text-blue-500 hover:text-blue-400"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {isLoading && (
                        <div
                            role="status"
                            className={`flex h-full w-full  flex-col items-center justify-center p-6`}
                        >
                            <LoadingSpinner className="mb-6 mr-2 h-8 w-8 animate-spin fill-white text-background" />
                            <span className="sr-only">Loading...</span>
                            <p className="text-sm md:text-lg">
                                Assembling robots...
                            </p>
                        </div>
                    )}
                    {isSuccess && (
                        <div
                            ref={scrollContainerRef}
                            className={`no-scrollbar h-[100%] w-full overflow-scroll overflow-x-hidden px-6 pb-4 md:px-8`}
                        >
                            {robots && robots.length > 0 ? (
                                <ul
                                    className={`grid grid-cols-autoFit gap-4 md:gap-8 `}
                                >
                                    {robots
                                        .sort(sortRobotsByName)
                                        .filter(filterRobotsOnSearch)
                                        .map((robot: RobotType) => {
                                            // Check for recent open issues (past 2 days)
                                            const hasRecentIssues =
                                                robot.recentOpenIssuesCount &&
                                                robot.recentOpenIssuesCount > 0;
                                            // Get actual online/offline status
                                            const connectionStatus =
                                                robot.status ?? "Offline";
                                            const isOnline =
                                                connectionStatus === "Active";

                                            return (
                                                <li
                                                    onClick={() => {
                                                        launchBotHandler(
                                                            robot,
                                                            connectionStatus
                                                        );
                                                    }}
                                                    key={robot.id}
                                                    className={`relative flex h-[9rem] cursor-pointer items-center justify-between overflow-hidden rounded-lg border bg-opacity-70 transition-all duration-200 lg:h-[11rem] ${
                                                        isOnline
                                                            ? "border-slate-600/60 bg-slate-700/50 hover:border-slate-500 hover:bg-slate-700/60 hover:shadow-xl hover:shadow-slate-500/20"
                                                            : "border-slate-600/60 bg-slate-700/50 hover:border-slate-500 hover:bg-slate-700/60 hover:shadow-xl hover:shadow-slate-500/20"
                                                    }`}
                                                >
                                                    {/* Main Content Area */}
                                                    <div className="flex flex-1 flex-col justify-between gap-y-3 p-5 pb-12">
                                                        {/* Robot Name */}
                                                        <h3 className={`text-base font-semibold tracking-wide md:text-lg ${
                                                            robot.bomCompletionStatus === 'incomplete'
                                                                ? 'text-red-500'
                                                                : 'text-white'
                                                        }`}>
                                                            {robot.name}
                                                        </h3>

                                                        {/* Status Badges */}
                                                        <div className="flex items-center gap-2">
                                                            {/* Connection Status */}
                                                            <span
                                                                className={`font-mono text-xs ${
                                                                    isOnline
                                                                        ? "text-green-500"
                                                                        : "text-red-600"
                                                                }`}
                                                            >
                                                                {connectionStatus}
                                                            </span>

                                                            {/* Issue Badge */}
                                                            {hasRecentIssues && (
                                                                <span className="inline-flex items-center rounded-md bg-orange-500/15 px-2.5 py-1 font-mono text-xs font-medium text-orange-400 ring-1 ring-orange-500/30">
                                                                    Issue
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Robot Image Area */}
                                                    <div className="flex h-full w-28 items-center justify-center overflow-hidden rounded-r-lg bg-slate-900/40">
                                                        <LogoWithFallback
                                                            className="w-[65%] object-contain md:w-[75%]"
                                                            src={robot.image}
                                                            alt={`${robot.name} logo`}
                                                            fallbackComponent={
                                                                <FaRobot
                                                                    className={`h-14 w-14 transition-colors md:h-16 md:w-16 ${
                                                                        isOnline ? "text-green-500" : "text-red-500/70"
                                                                    }`}
                                                                />
                                                            }
                                                        />
                                                    </div>
                                                </li>
                                            );
                                        })}
                                </ul>
                            ) : (
                                <div
                                    className={`flex h-full w-full flex-1 
                                    flex-col items-center justify-center p-6 md:p-6`}
                                >
                                    <img
                                        className="mb-8 w-36"
                                        src="/errorRobotGreen.png"
                                        alt="Broken down robot"
                                    />
                                    <div className="flex flex-col items-center gap-y-2">
                                        <p className="text-sm md:text-lg">
                                            You have no robots to display!
                                        </p>
                                        <button
                                            onClick={refetchRobotslistHandler}
                                            className="text-blue-500 hover:text-blue-400"
                                        >
                                            Try again
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {showLaunchPad ? (
                    <RobotLaunchPad onCloseLaunchPad={closeLaunchPadHandler} />
                ) : null}
            </div>
        </div>
    );
};
export default Robots;
