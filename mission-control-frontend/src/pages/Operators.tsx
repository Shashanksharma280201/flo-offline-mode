import ComboBox from "@/components/comboBox/ComboBox";
import Header from "@/components/header/Header";
import Popup from "@/components/popup/Popup";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SmIconButton from "@/components/ui/SmIconButton";
import { Operator } from "@/data/types/appDataTypes";
import DownloadAllAttendanceButton from "@/features/operators/components/DownloadAllAttendanceButton";
import OperatorForm from "@/features/operators/components/OperatorForm";
import {
    fetchAllOperators,
    updateOperatorStatusFn
} from "@/features/operators/services/operatorService";
import { errorLogger } from "@/util/errorLogger";
import { checkPermission } from "@/util/roles";

import { useEffect, useState } from "react";
import { FaRobot } from "react-icons/fa";
import {
    MdAdd,
    MdArchive,
    MdClose,
    MdPerson,
    MdPersonAdd,
    MdSearch,
    MdSettings
} from "react-icons/md";
import { useMutation } from "react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const Operators = () => {
    const navigate = useNavigate();
    const [operators, setOperators] = useState<Operator[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isOperatorFormVisible, setIsOperatorFormVisible] = useState(false);
    const [isViewMode, setIsViewMode] = useState(true);
    const [operatorStatus, setOperatorStatus] = useState<string>("Active");
    const [isOperatorStatusPopupOpen, setIsOperatorStatusPopupOpen] =
        useState(false);
    const [operatorForStatusChange, setOperatorForStatusChange] =
        useState<Operator>();

    const { mutate: mutateFetchOperators, isLoading } = useMutation({
        mutationFn: () => fetchAllOperators(),
        onSuccess: (data) => {
            setOperators(data);
        },
        onError: (error) => errorLogger(error)
    });

    useEffect(() => {
        mutateFetchOperators();
    }, []);

    const filterOperatorsOnSearch = (operator: Operator) => {
        return operator.name.toLowerCase().includes(searchQuery.toLowerCase());
    };
    const filterOperatorsOnStatus = (operator: Operator) => {
        if (operator.isActive === undefined) return true;
        if (operatorStatus === "All") return true;
        if (operatorStatus === "Inactive") return operator.isActive === false;
        if (operatorStatus === "Active") return operator.isActive === true;
    };

    const manageClickHandler = () => {
        if (operators.length === 0) {
            toast.info("No operators exist");
            return;
        }
        setIsViewMode((prev) => !prev);
    };

    const operatorStatusMutation = useMutation({
        mutationFn: ({
            operatorId,
            isActive
        }: {
            operatorId: string;
            isActive: boolean;
        }) => updateOperatorStatusFn({ operatorId, isActive }),
        onSuccess: () => {
            toast.success("Operator status changed successfully");
            mutateFetchOperators();
        },
        onError: (err) => errorLogger(err)
    });

    const operatorStatusChangeHandler = () => {
        if (!operatorForStatusChange) return;
        const isActive = !operatorForStatusChange.isActive;

        // Allow status change regardless of client or robot assignments
        // Operators can be deactivated/activated even if assigned
        operatorStatusMutation.mutate({
            operatorId: operatorForStatusChange.id,
            isActive: isActive
        });
        setIsOperatorStatusPopupOpen(false);
    };

    const filteredOps = operators
        .filter(filterOperatorsOnStatus)
        .filter(filterOperatorsOnSearch);

    return (
        <>
            <div className="flex w-full flex-col bg-blue-900/25">
                <Header title="Operators">
                    {checkPermission("change_site_mgmt") && (
                        <div className="flex gap-4">
                            <DownloadAllAttendanceButton />
                            <button
                                className="flex items-center gap-x-2 bg-green-800 md:rounded-md md:border md:p-2.5 md:font-semibold md:hover:border-green-600 md:hover:bg-green-600"
                                onClick={() => setIsOperatorFormVisible(true)}
                            >
                                <div className="hidden text-sm md:block md:text-base">
                                    Create
                                </div>
                                <MdAdd className="h-6 w-6 md:h-5 md:w-5" />
                            </button>
                        </div>
                    )}
                </Header>
                <section className="m-auto flex h-full w-full flex-col items-center justify-center  border-border bg-backgroundGray/30 md:my-8 md:w-[75%] md:rounded-md md:border">
                    <div
                        className={
                            "flex h-[3rem] w-full items-center divide-x divide-border border-b border-t  border-border text-sm md:border-t-0 md:text-lg"
                        }
                    >
                        <label
                            htmlFor="Search"
                            className={
                                "flex h-full w-full items-center justify-between  bg-backgroundGray/30 pr-4 text-sm text-white transition-colors ease-in md:text-lg"
                            }
                        >
                            <input
                                onChange={(event) =>
                                    setSearchQuery(event.target.value)
                                }
                                value={searchQuery}
                                type="text"
                                placeholder="Search operators"
                                className="block h-full w-full appearance-none items-center bg-transparent  px-6 text-sm  text-white placeholder:text-neutral-400 focus:outline-none md:px-8"
                            />
                            <MdSearch className="h-6 w-6 text-neutral-400" />
                        </label>
                        <div className="-order-1 w-[15%] md:order-none">
                            <ComboBox
                                nullable={false}
                                label="Operator status"
                                items={["All", "Active", "Inactive"]}
                                selectedItem={operatorStatus}
                                setSelectedItem={setOperatorStatus}
                                getItemLabel={(operatorStatus) =>
                                    operatorStatus ?? ""
                                }
                                wrapperClassName="border-none z-10 px-6 md:px-8 bg-backgroundGray/30"
                                compareItems={(itemOne, itemTwo) =>
                                    itemOne === itemTwo
                                }
                                showLabel={false}
                                isSelect={true}
                            />
                        </div>
                        <div className="flex h-full">
                            <button
                                onClick={manageClickHandler}
                                className={`h-full ${isViewMode ? "bg-backgroundGray/30 text-white hover:bg-white hover:text-black md:text-white" : "bg-red-500 text-white hover:bg-red-400 md:bg-red-500"} rounded-r-md border-border px-4 text-sm  md:border-l md:px-6`}
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
                                        <span className="hidden sm:block">
                                            Cancel
                                        </span>
                                        <MdClose
                                            size={24}
                                            color="white"
                                            className="sm:hidden"
                                        />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="w-full">
                        {filteredOps.length > 0 ? (
                            filteredOps.map((operator) => {
                                const operatorClickHandler = () => {
                                    navigate(
                                        `/operators/${operator.id}/profile`
                                    );
                                };
                                const operatorStatusChangeHandler = () => {
                                    setOperatorForStatusChange(operator);
                                    setIsOperatorStatusPopupOpen(true);
                                };
                                return (
                                    <div
                                        key={operator.id}
                                        className="flex w-full  items-center gap-6 border-b border-border bg-slate-900/55 p-6 hover:cursor-pointer md:p-8"
                                        onClick={operatorClickHandler}
                                    >
                                        <div className="hidden sm:flex">
                                            <span className="flex size-10 items-center justify-center rounded-full bg-backgroundGray">
                                                {operator.imageUrl ? (
                                                    <img
                                                        src={operator.imageUrl}
                                                        className="size-10 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <MdPerson className="size-5 text-white" />
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex w-full flex-col">
                                            <div className="flex justify-between">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="cursor-pointer text-base font-semibold text-white hover:text-neutral-400">
                                                        {operator.name}
                                                    </h3>
                                                    {!operator.isActive &&
                                                        operatorStatus !==
                                                            "Inactive" && (
                                                            <span className="flex h-fit w-fit items-center justify-center rounded-full border-[0.5px] bg-backgroundGray/30 px-3 py-0.5 text-xs">
                                                                Inactive
                                                            </span>
                                                        )}
                                                </div>
                                                {isViewMode ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <FaRobot className="h-4 w-4 cursor-pointer text-white" />
                                                        <span>
                                                            {operator.robots}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={
                                                            operatorStatusChangeHandler
                                                        }
                                                    >
                                                        {operator.isActive ? (
                                                            <MdArchive className="h-6 w-6 cursor-pointer text-white" />
                                                        ) : (
                                                            <MdPersonAdd className="h-6 w-6 cursor-pointer text-white" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                            <span className="text-secondary">
                                                {operator.client
                                                    ? operator.client.name
                                                    : "--"}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex min-h-[30vh] items-center justify-center ">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center gap-6 md:gap-8">
                                        <LoadingSpinner className="h-6 w-6 animate-spin fill-white text-center text-background" />
                                        <span>Loading Operators</span>
                                    </div>
                                ) : (
                                    <span>No Operators</span>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </div>
            {isOperatorFormVisible && (
                <OperatorForm
                    refetchOperators={mutateFetchOperators}
                    closeOperatorForm={() => setIsOperatorFormVisible(false)}
                />
            )}
            {operatorForStatusChange && (
                <OperatorStatusChangePopup
                    isOpen={isOperatorStatusPopupOpen}
                    setIsOpen={setIsOperatorStatusPopupOpen}
                    operator={operatorForStatusChange}
                    onSubmit={operatorStatusChangeHandler}
                />
            )}
        </>
    );
};

const OperatorStatusChangePopup = ({
    operator,
    isOpen,
    setIsOpen,
    onSubmit
}: {
    operator: Operator;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onSubmit: () => void;
}) => {
    return (
        <Popup
            title={`${operator.isActive ? "Deactivate" : "Activate"} operator?`}
            description={
                <p>
                    Are you sure you want to{" "}
                    {operator.isActive ? "deactivate" : "activate"}{" "}
                    <span className="font-bold">{operator.name}</span>?
                </p>
            }
            onClose={() => setIsOpen(false)}
            dialogToggle={isOpen}
        >
            <div className="flex items-center justify-end gap-2 md:gap-4">
                <SmIconButton
                    name="Cancel"
                    className="border border-backgroundGray bg-transparent font-semibold text-white hover:bg-white/20"
                    onClick={() => setIsOpen(false)}
                />
                <SmIconButton
                    name="Confirm"
                    className="border bg-white font-semibold text-black"
                    onClick={onSubmit}
                />
            </div>
        </Popup>
    );
};

export default Operators;
