import { errorLogger } from "@/util/errorLogger";
import { useMutation } from "react-query";
import { useNavigate, useOutletContext } from "react-router-dom";

import { useEffect, useState } from "react";
import {
    MdAdd,
    MdClose,
    MdDelete,
    MdPerson,
    MdSearch,
    MdSettings
} from "react-icons/md";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { FaRobot } from "react-icons/fa";
import { toast } from "react-toastify";
import { AddRobotPopup, RemoveRobotPopup } from "./components/RobotPopups";
import { fetchOperatorRobots } from "./services/operatorService";
import { checkPermission } from "@/util/roles";
import { Operator } from "@/data/types/appDataTypes";

export type Robot = {
    id: string;
    name: string;
    imageUrl: string;
    operators: number;
};

const Robots = () => {
    const { selectedOperator }: { selectedOperator: Operator } =
        useOutletContext();
    const navigate = useNavigate();
    const [robots, setRobots] = useState<Robot[]>([]);
    const [filteredRobots, setFilteredRobots] = useState<Robot[]>([]);
    const [isViewMode, setIsViewMode] = useState(true);
    const [selectedRobot, setSelectedRobot] = useState<Robot>();
    const [isRemovePopupOpen, setIsRemovePopupOpen] = useState(false);
    const [isAddPopupOpen, setIsAddPopupOpen] = useState(false);

    const { mutate: mutateFetchOperatorRobots, isLoading } = useMutation({
        mutationFn: (operatorId: string) => fetchOperatorRobots(operatorId),
        onSuccess: (data) => {
            if (data.length === 0) setIsViewMode(true);
            setRobots(data);
            setFilteredRobots(data);
        },
        onError: (err) => errorLogger(err)
    });

    const filterRobotsOnSearch = (searchValue: string) => {
        const filteredRobots = robots.filter((robot) => {
            if (searchValue === "") {
                return true;
            }
            const reSearchValue = searchValue
                .toLowerCase()
                .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const re = new RegExp(reSearchValue, "i");

            if (robot.name.toLowerCase().match(re)) {
                return true;
            }
            return false;
        });
        setFilteredRobots(filteredRobots);
    };

    const manageClickHandler = () => {
        if (!robots.length) {
            toast.info("No robots exist");
            return;
        }
        setIsViewMode((prev) => !prev);
    };

    useEffect(() => {
        mutateFetchOperatorRobots(selectedOperator.id);
    }, []);

    const addNewRobotHandler = () => {
        if (!selectedOperator.isActive) {
            toast.error("Operator is not active");
            return;
        }
        setIsAddPopupOpen(true);
    };

    return (
        <>
            <div className="m-auto flex h-full w-full flex-col items-center overflow-hidden rounded-b border-border md:my-8 md:w-[75%] md:rounded-md md:border">
                <div
                    className={
                        "flex h-[3rem] w-full items-center divide-x divide-border border-b border-border text-sm md:text-lg"
                    }
                >
                    <label
                        htmlFor="Search"
                        className={
                            "flex h-full flex-1 items-center justify-between  bg-backgroundGray/30 pr-4 text-sm text-white transition-colors ease-in md:text-lg"
                        }
                    >
                        <input
                            onChange={(event) =>
                                filterRobotsOnSearch(event.target.value)
                            }
                            type="text"
                            placeholder="Search robots"
                            className="block h-full w-full appearance-none items-center bg-transparent  px-6 text-sm  text-white placeholder:text-neutral-400 focus:outline-none md:px-8"
                        />
                        <MdSearch className="h-6 w-6 text-neutral-400" />
                    </label>
                    {checkPermission("change_site_mgmt") && (
                        <div className="flex h-full divide-x divide-border">
                            {/* <button
                                onClick={addNewRobotHandler}
                                className={`h-full border-border bg-backgroundGray/30 px-4 text-sm text-white hover:bg-white hover:text-black md:border-l  md:px-8 md:text-white`}
                            >
                                <span className="hidden sm:block">Add</span>
                                <MdAdd size={24} className="sm:hidden" />
                            </button> */}
                            {/* <button
                                onClick={manageClickHandler}
                                className={`h-full ${isViewMode ? "bg-backgroundGray/30 text-white hover:bg-white hover:text-black md:text-white" : "bg-red-500 text-white hover:bg-red-400 md:bg-red-500"} border-border px-4 text-sm  md:border-l md:px-6`}
                            >
                                {isViewMode ? (
                                    <>
                                        <span className="hidden sm:block">
                                            Manage
                                        </span>
                                        <MdSettings
                                            size={24}
                                            className="sm:hidden"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <span className="hidden  sm:block">
                                            Cancel
                                        </span>
                                        <MdClose
                                            size={24}
                                            color="white"
                                            className="sm:hidden"
                                        />
                                    </>
                                )}
                            </button> */}
                        </div>
                    )}
                </div>
                <div className="w-full divide-y divide-border bg-gray-800/45 h-full">
                    {filteredRobots.length > 0 ? (
                        filteredRobots.map((robot) => {
                            const removeOperatorHandler = () => {
                                setSelectedRobot(robot);
                                setIsRemovePopupOpen(true);
                            };

                            const navigateOnClick = () => {
                                if (!isViewMode) return;
                                navigate(`/robots/${robot.id}/profile`, {
                                    replace: true
                                });
                            };

                            return (
                                <div
                                    onClick={navigateOnClick}
                                    className={`flex w-full justify-between ${isViewMode ? "cursor-pointer hover:bg-backgroundGray/30" : ""} p-6 md:p-8`}
                                    key={robot.id}
                                >
                                    <div className="flex w-full gap-6  md:items-center md:justify-center md:gap-8 ">
                                        <div className="flex w-full items-center gap-6">
                                            {robot.imageUrl ? (
                                                <img
                                                    src={robot.imageUrl}
                                                    className="h-16 w-16 rounded-full bg-backgroundGray/30 object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-backgroundGray/30">
                                                    <FaRobot
                                                        className="text-secondary"
                                                        size={28}
                                                    />
                                                </div>
                                            )}
                                            <div className="flex  flex-col gap-2 text-white md:pl-8">
                                                <div className="flex w-full justify-between">
                                                    <span className="text-base font-semibold">
                                                        {robot.name}
                                                    </span>
                                                </div>
                                                <span className="text-secondary">
                                                    {robot.id}
                                                </span>
                                            </div>
                                        </div>
                                        {isViewMode ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <MdPerson
                                                    size={24}
                                                    color="white"
                                                />
                                                <span className="-mb-1">
                                                    {robot.operators}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={
                                                        removeOperatorHandler
                                                    }
                                                    className="p-2 hover:opacity-80"
                                                >
                                                    <MdDelete
                                                        size={24}
                                                        color="white"
                                                    />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex min-h-[30vh] items-center justify-center ">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center gap-6 md:gap-8">
                                    <LoadingSpinner className="h-6 w-6 animate-spin fill-white text-center text-background" />
                                    <span>Loading Robots</span>
                                </div>
                            ) : (
                                <span>No Robots found</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {selectedRobot && (
                <RemoveRobotPopup
                    selectedOperator={selectedOperator}
                    selectedRobot={selectedRobot}
                    isOpen={isRemovePopupOpen}
                    setIsOpen={setIsRemovePopupOpen}
                    onSuccess={() =>
                        mutateFetchOperatorRobots(selectedOperator.id)
                    }
                />
            )}

            <AddRobotPopup
                existingRobots={robots}
                isOpen={isAddPopupOpen}
                setIsOpen={setIsAddPopupOpen}
                onSuccess={() => {
                    mutateFetchOperatorRobots(selectedOperator.id);
                }}
                selectedOperator={selectedOperator}
            />
        </>
    );
};

export default Robots;
