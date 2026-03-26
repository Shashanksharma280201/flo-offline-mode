import { RobotType } from "@/data/types";
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
import { fetchRobotOperators, setActiveOperator } from "../../services/robotsService";
import {
    AddOperatorToRobotPopup,
    RemoveOperatorFromRobotPopup
} from "./OperatorPopups";
import { Operator } from "@/data/types/appDataTypes";
import { Users } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";

type ProfileOutletProps = { robot: RobotType; fetchRobotDetails: () => void };

const Operators = () => {
    const { robot } = useOutletContext<ProfileOutletProps>();
    const navigate = useNavigate();
    const [operators, setOperators] = useState<Operator[]>([]);
    const [filteredOperators, setFilteredOperators] = useState<Operator[]>([]);
    const [isViewMode, setIsViewMode] = useState(true);

    const { mutate: mutateFetchRobotOperators, isLoading } = useMutation({
        mutationFn: (robotId: string) => fetchRobotOperators(robotId),
        onSuccess: (data) => {
            if (data.length === 0) setIsViewMode(true);
            setOperators(data);
            setFilteredOperators(data);
        },
        onError: (err) => errorLogger(err)
    });

    const { mutate: mutateSetActiveOperator, isLoading: isSettingActive } = useMutation({
        mutationFn: ({ robotId, operatorId }: { robotId: string; operatorId: string }) =>
            setActiveOperator({ robotId, operatorId }),
        onSuccess: () => {
            toast.success("Active operator updated successfully");
            mutateFetchRobotOperators(robot.id);
        },
        onError: (err) => {
            errorLogger(err);
            toast.error("Failed to update active operator");
        }
    });

    const filterOperatorsOnSearch = (searchValue: string) => {
        const filteredOperators = operators.filter((operator) => {
            if (searchValue === "") {
                return true;
            }
            const reSearchValue = searchValue
                .toLowerCase()
                .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const re = new RegExp(reSearchValue, "i");

            if (operator.name.toLowerCase().match(re)) {
                return true;
            }
            return false;
        });
        setFilteredOperators(filteredOperators);
    };

    const manageClickHandler = () => {
        if (!operators.length) {
            toast.info("No operators exist");
            return;
        }
        setIsViewMode((prev) => !prev);
    };

    useEffect(() => {
        mutateFetchRobotOperators(robot.id);
    }, []);

    const [selectedOperator, setSelectedOperator] = useState<Operator>();
    const [isRemovePopupOpen, setIsRemovePopupOpen] = useState(false);
    const [isAddPopupOpen, setIsAddPopupOpen] = useState(false);

    const addNewOperatorHandler = () => {
        setIsAddPopupOpen(true);
    };

    return (
        <>
            <div className="m-auto flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-slate-700/30 md:my-8 md:w-[75%]">
                {/* Header Section */}
                <div className="flex w-full items-center gap-3 border-b border-gray-700 bg-slate-900/50 p-4">
                    {/* <Users className="h-6 w-6 text-blue-400" /> */}
                    <h2 className="text-xl font-bold text-white">
                        Robot Operators
                    </h2>
                </div>

                {/* Search and Action Bar */}
                <div className="flex h-14 w-full items-center border-b border-gray-700">
                    <label
                        htmlFor="Search"
                        className="flex h-full flex-1 items-center justify-between bg-slate-900/30 pr-4 transition-colors"
                    >
                        <input
                            onChange={(event) =>
                                filterOperatorsOnSearch(event.target.value)
                            }
                            type="text"
                            placeholder="Search operators by name..."
                            className="block h-full w-full appearance-none bg-transparent px-6 text-sm text-white placeholder:text-gray-400 focus:outline-none"
                        />
                        <MdSearch className="h-5 w-5 text-gray-400" />
                    </label>
                    <div className="flex h-full border-l border-gray-700">
                        <button
                            onClick={addNewOperatorHandler}
                            className="flex h-full items-center gap-2 border-r border-gray-700 bg-slate-900/30 px-6 text-sm font-semibold text-white transition-all hover:bg-green-600 hover:text-white"
                        >
                            <MdAdd size={20} />
                            <span className="hidden sm:inline">
                                Add Operator
                            </span>
                        </button>
                        <button
                            onClick={manageClickHandler}
                            className={`flex h-full items-center gap-2 px-6 text-sm font-semibold transition-all ${
                                isViewMode
                                    ? "bg-slate-900/30 text-white hover:bg-gray-700 hover:text-white"
                                    : "bg-red-600 text-white hover:bg-red-500"
                            }`}
                        >
                            {isViewMode ? (
                                <>
                                    <MdSettings size={20} />
                                    <span className="hidden sm:inline">
                                        Manage
                                    </span>
                                </>
                            ) : (
                                <>
                                    <MdClose size={20} />
                                    <span className="hidden sm:inline">
                                        Cancel
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Operators List */}
                <div className="w-full divide-y divide-gray-700">
                    {filteredOperators.length > 0 ? (
                        filteredOperators.map((operator) => {
                            const removeOperatorHandler = () => {
                                setSelectedOperator(operator);
                                setIsRemovePopupOpen(true);
                            };

                            const navigateOnPress = () => {
                                if (!isViewMode) return;
                                navigate(`/operators/${operator.id}/profile`, {
                                    replace: true
                                });
                            };

                            const handleCheckboxClick = () => {
                                if (isSettingActive) return; // Prevent multiple clicks while loading
                                mutateSetActiveOperator({
                                    robotId: robot.id,
                                    operatorId: operator.id
                                });
                            };

                            return (
                                <>
                                    <div className="flex flex-row items-center justify-between px-4">
                                        <div
                                            onClick={navigateOnPress}
                                            className={`flex w-full items-center justify-between p-6 transition-colors ${
                                                isViewMode
                                                    ? "cursor-pointer hover:bg-slate-700/30"
                                                    : ""
                                            }`}
                                            key={operator.id}
                                        >
                                            <div className="flex w-full items-center gap-6">
                                                {/* Operator Avatar */}
                                                <div className="flex-shrink-0">
                                                    {operator.imageUrl ? (
                                                        <img
                                                            src={
                                                                operator.imageUrl
                                                            }
                                                            alt={operator.name}
                                                            className="h-14 w-14 rounded-full border-2 border-gray-600 object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gray-600 bg-slate-700">
                                                            <MdPerson
                                                                color="white"
                                                                size={28}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Operator Info */}
                                                <div className="flex flex-1 flex-col gap-1.5">
                                                    <span className="text-base font-semibold text-white">
                                                        {operator.name}
                                                    </span>
                                                    <span className="text-sm text-gray-400">
                                                        {operator.phoneNumber}
                                                    </span>
                                                </div>

                                                {/* Actions/Stats */}
                                                {isViewMode ? (
                                                    <>
                                                        <div className="flex items-center gap-2 rounded-md bg-blue-500/10 px-4 py-2 text-blue-400">
                                                            <FaRobot
                                                                size={18}
                                                            />
                                                            <span className="font-semibold">
                                                                {
                                                                    operator.robots
                                                                }
                                                            </span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={
                                                            removeOperatorHandler
                                                        }
                                                        className="rounded-md p-2 transition-all hover:bg-red-500/20"
                                                    >
                                                        <MdDelete
                                                            size={24}
                                                            className="text-red-400"
                                                        />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center pr-4">
                                            <Checkbox
                                                checked={operator.isActiveOperator || false}
                                                onCheckedChange={handleCheckboxClick}
                                                disabled={isSettingActive}
                                                className="border-[1px] flex border-green-500 data-[state=checked]:bg-green-600 items-center data-[state=checked]:border-green-300 data-[state=checked]:text-green-600 rounded-md text-green-500 hover:border-green-400 hover:text-green-600 transition-all"
                                            />
                                        </div>
                                    </div>
                                </>
                            );
                        })
                    ) : (
                        <div className="flex min-h-[30vh] items-center justify-center">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center gap-4">
                                    <LoadingSpinner className="h-8 w-8 animate-spin fill-blue-500 text-gray-600" />
                                    <span className="text-sm text-gray-400">
                                        Loading Operators...
                                    </span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <Users className="h-12 w-12 text-gray-600" />
                                    <span className="text-sm text-gray-400">
                                        No operators found
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {selectedOperator && (
                <RemoveOperatorFromRobotPopup
                    selectedRobot={robot}
                    selectedOperator={selectedOperator}
                    isOpen={isRemovePopupOpen}
                    setIsOpen={setIsRemovePopupOpen}
                    onSuccess={() => mutateFetchRobotOperators(robot.id)}
                />
            )}

            <AddOperatorToRobotPopup
                selectedRobot={robot}
                existingOperators={operators}
                isOpen={isAddPopupOpen}
                setIsOpen={setIsAddPopupOpen}
                onSuccess={() => {
                    mutateFetchRobotOperators(robot.id);
                }}
            />
        </>
    );
};

export default Operators;
