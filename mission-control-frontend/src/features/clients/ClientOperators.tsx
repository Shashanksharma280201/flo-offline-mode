import { useEffect, useState } from "react";
import { useMutation } from "react-query";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
    MdAdd,
    MdClose,
    MdDelete,
    MdPerson,
    MdSearch,
    MdSettings
} from "react-icons/md";
import { FaRobot } from "react-icons/fa";
import { FaPersonWalkingArrowRight } from "react-icons/fa6";
import { toast } from "react-toastify";
import { ClientData } from "@/data/types";
import { errorLogger } from "@/util/errorLogger";
import { fetchClientOperators } from "./services/clientService";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
    AddOperatorPopup,
    MoveOperatorPopup,
    RemoveOperatorPopup
} from "./components/OperatorPopups";
import { checkPermission } from "@/util/roles";

export type ClientOperator = {
    id: string;
    name: string;
    imageUrl?: string;
    isActive: boolean;
    phoneNumber: string;
    robots: number;
    client?: { id: string; name: string };
};

const Operators = () => {
    const { selectedClient }: { selectedClient: ClientData } =
        useOutletContext();
    const navigate = useNavigate();
    const [operators, setOperators] = useState<ClientOperator[]>([]);
    const [filteredOperators, setFilteredOperators] = useState<
        ClientOperator[]
    >([]);
    const [isViewMode, setIsViewMode] = useState(true);

    const { mutate: mutateFetchClientOperators, isLoading } = useMutation({
        mutationFn: (clientId: string) => fetchClientOperators(clientId),
        onSuccess: (data) => {
            if (data.length === 0) setIsViewMode(true);
            setOperators(data);
            setFilteredOperators(data);
        },
        onError: (err) => errorLogger(err)
    });

    const filterMaterialsOnSearch = (searchValue: string) => {
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
        mutateFetchClientOperators(selectedClient.id);
    }, []);

    const [selectedOperator, setSelectedOperator] = useState<ClientOperator>();
    const [isRemovePopupOpen, setIsRemovePopupOpen] = useState(false);
    const [isMovePopupOpen, setIsMovePopupOpen] = useState(false);
    const [isAddPopupOpen, setIsAddPopupOpen] = useState(false);

    const addNewOperatorHandler = () => {
        setIsAddPopupOpen(true);
    };

    const moveOperatorHandler = (operator: ClientOperator) => {
        setSelectedOperator(operator);
        setIsMovePopupOpen(true);
    };

    const removeOperatorHandler = (operator: ClientOperator) => {
        setSelectedOperator(operator);
        setIsRemovePopupOpen(true);
    };

    const navigateOnPress = (operator: ClientOperator) => {
        if (!isViewMode) return;
        navigate(`/operators/${operator.id}/profile`, {
            replace: true
        });
    };

    return (
        <>
            <div className="m-auto flex h-full w-full flex-col items-cente overflow-hidden rounded-b border-border md:my-8 md:w-[75%] md:rounded-md md:border">
                <div
                    className={
                        "flex h-[3rem] w-full items-center divide-x divide-border border-b border-border bg-backgroundGray/30 text-sm md:text-lg"
                    }
                >
                    <label
                        htmlFor="Search"
                        className={
                            "flex h-full flex-1 items-center justify-between pr-4 text-sm text-white transition-colors ease-in md:text-lg"
                        }
                    >
                        <input
                            onChange={(event) =>
                                filterMaterialsOnSearch(event.target.value)
                            }
                            type="text"
                            placeholder="Search operators"
                            className="block h-full w-full appearance-none items-center bg-transparent  px-6 text-sm  text-white placeholder:text-neutral-400 focus:outline-none md:px-8"
                        />
                        <MdSearch className="h-6 w-6 text-neutral-400" />
                    </label>
                    {checkPermission("change_site_mgmt") && (
                        <div className="flex h-full divide-x divide-border">
                            <button
                                onClick={addNewOperatorHandler}
                                className={`h-full border-border px-4 text-sm text-white hover:bg-white hover:text-black md:border-l md:px-8 md:text-white`}
                            >
                                <span className="hidden sm:block">Add</span>
                                <MdAdd size={24} className="sm:hidden" />
                            </button>
                            <button
                                onClick={manageClickHandler}
                                className={`h-full px-4 sm:min-w-20 md:min-w-28 ${isViewMode ? "text-white hover:bg-white hover:text-black md:text-white" : "bg-red-500 text-white hover:bg-red-400 md:bg-red-500"} border-border text-sm  md:border-l`}
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
                            </button>
                        </div>
                    )}
                </div>
                <div className="w-full divide-y divide-border">
                    {filteredOperators.length > 0 ? (
                        filteredOperators.map((operator) => {
                            return (
                                <div
                                    onClick={() => navigateOnPress(operator)}
                                    className={`flex w-full border-b border-border justify-between ${isViewMode ? "cursor-pointer hover:bg-backgroundGray/30" : ""} p-6 md:p-8`}
                                    key={operator.id}
                                >
                                    <div className="flex w-full gap-6  md:items-center md:justify-center md:gap-8 ">
                                        <div className="flex w-full items-center gap-6">
                                            {operator.imageUrl ? (
                                                <img
                                                    src={operator.imageUrl}
                                                    className="h-16 w-16 rounded-full  object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-backgroundGray">
                                                    <MdPerson
                                                        color="white"
                                                        size={32}
                                                    />
                                                </div>
                                            )}
                                            <div className="flex  flex-col gap-2 text-white md:pl-8">
                                                <div className="flex w-full justify-between">
                                                    <span className="text-base font-semibold">
                                                        {operator.name}
                                                    </span>
                                                </div>
                                                <span className="text-secondary">
                                                    {operator.phoneNumber}
                                                </span>
                                            </div>
                                        </div>
                                        {isViewMode ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <FaRobot
                                                    size={24}
                                                    color="white"
                                                />
                                                <span className="-mb-1">
                                                    {operator.robots}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() =>
                                                        moveOperatorHandler(
                                                            operator
                                                        )
                                                    }
                                                    className="p-2 hover:opacity-80"
                                                >
                                                    <FaPersonWalkingArrowRight
                                                        size={24}
                                                        color="white"
                                                    />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        removeOperatorHandler(
                                                            operator
                                                        )
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
                                    <span>Loading Operators</span>
                                </div>
                            ) : (
                                <span>No Operators found</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {selectedOperator && (
                <RemoveOperatorPopup
                    selectedClient={selectedClient}
                    selectedOperator={selectedOperator}
                    isOpen={isRemovePopupOpen}
                    setIsOpen={setIsRemovePopupOpen}
                    onSuccess={() =>
                        mutateFetchClientOperators(selectedClient.id)
                    }
                />
            )}
            {selectedOperator && (
                <MoveOperatorPopup
                    isOpen={isMovePopupOpen}
                    setIsOpen={setIsMovePopupOpen}
                    selectedClient={selectedClient}
                    selectedOperator={selectedOperator}
                    onSuccess={() => {
                        if (operators.length === 0) setIsViewMode(true);
                        mutateFetchClientOperators(selectedClient.id);
                    }}
                />
            )}

            <AddOperatorPopup
                isOpen={isAddPopupOpen}
                setIsOpen={setIsAddPopupOpen}
                onSuccess={() => {
                    mutateFetchClientOperators(selectedClient.id);
                }}
                selectedClient={selectedClient}
            />
        </>
    );
};

export default Operators;
