import ComboBox from "@/components/comboBox/ComboBox";
import Header from "@/components/header/Header";
import Popup from "@/components/popup/Popup";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SmIconButton from "@/components/ui/SmIconButton";
import ClientForm from "@/features/clients/components/ClientForm";
import {
    fetchClients,
    updateClientStatusFn
} from "@/features/clients/services/clientService";
import { errorLogger } from "@/util/errorLogger";
import { checkPermission } from "@/util/roles";
import { useEffect, useRef, useState } from "react";
import {
    MdAdd,
    MdArchive,
    MdClose,
    MdLocationOn,
    MdPerson,
    MdSearch,
    MdSettings,
    MdUndo
} from "react-icons/md";
import { useMutation } from "react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export type Client = {
    id: string;
    name: string;
    operators: number;
    materials: number;
    isActive: boolean;
};

const Clients = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState<Client[]>([]);
    const [isClientFormVisible, setIsClientFormVisible] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);

    const { mutate: mutateFetchClients, isLoading } = useMutation({
        mutationFn: () => fetchClients(),
        onSuccess: setClients,
        onError: errorLogger
    });

    useEffect(() => {
        mutateFetchClients();
    }, []);

    const filterClientsOnStatus = (client: Client) => {
        if (client.isActive === undefined) return true;
        if (clientStatus === "All") return true;
        if (clientStatus === "Inactive") return client.isActive === false;
        if (clientStatus === "Active") return client.isActive === true;
    };

    const filterClientsOnSearch = (client: Client) => {
        return client.name.toLowerCase().includes(searchQuery.toLowerCase());
    };

    const [clientStatus, setClientStatus] = useState<string>("Active");
    const [searchQuery, setSearchQuery] = useState("");
    const [isClientStatusPopupOpen, setIsClientStatusPopupOpen] =
        useState(false);

    const filteredClients = clients
        .filter(filterClientsOnStatus)
        .filter(filterClientsOnSearch);

    // Keyboard Navigation: "/" to focus search, Arrows to select
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Focus search on "/"
            if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
                e.preventDefault();
                searchInputRef.current?.focus();
            }

            if (filteredClients.length === 0) return;

            // Navigate rows with arrows
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev < filteredClients.length - 1 ? prev + 1 : prev
                );
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
            } else if (e.key === "Enter" && selectedIndex >= 0) {
                // Navigate to selected client on Enter
                navigate(
                    `/clients/${filteredClients[selectedIndex].id}/config`
                );
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [filteredClients, selectedIndex, navigate]);

    // Reset selection when search/filter changes
    useEffect(() => {
        setSelectedIndex(-1);
    }, [searchQuery, clientStatus]);

    const [isViewMode, setIsViewMode] = useState(true);
    const manageClickHandler = () => {
        if (clients.length === 0) {
            toast.info("No Clients exist");
            return;
        }
        setIsViewMode((prev) => !prev);
    };

    const clientStatusMutation = useMutation({
        mutationFn: ({
            clientId,
            isActive
        }: {
            clientId: string;
            isActive: boolean;
        }) => updateClientStatusFn({ clientId, isActive }),
        onSuccess: () => {
            toast.success("Client status changed successfully");
            mutateFetchClients();
        },
        onError: (err) => errorLogger(err)
    });

    const [clientForStatusChange, setClientForStatusChange] =
        useState<Client>();

    const clientStatusChangeHandler = () => {
        if (!clientForStatusChange) return;
        const isActive = !clientForStatusChange.isActive;

        if (clientForStatusChange.operators) {
            toast.error("Client has operators assigned");
            return;
        }

        if (clientForStatusChange.materials) {
            toast.error("Client has materials assigned");
            return;
        }

        clientStatusMutation.mutate({
            clientId: clientForStatusChange.id,
            isActive: isActive
        });
        setIsClientStatusPopupOpen(false);
    };

    return (
        <>
            <div className="flex h-full w-full flex-col bg-blue-900/25">
                <Header title="Clients">
                    {checkPermission("change_site_mgmt") && (
                        <button
                            className="flex items-center gap-x-2 bg-green-700 md:rounded-md md:border md:p-2.5 md:font-semibold md:hover:border-green-600 md:hover:bg-green-600"
                            onClick={() => setIsClientFormVisible(true)}
                        >
                            <div className="hidden text-sm md:block md:text-base">
                                Create
                            </div>
                            <MdAdd className="h-6 w-6 md:h-5 md:w-5" />
                        </button>
                    )}
                </Header>
                <section className="m-auto flex h-full w-full flex-col items-center border-border bg-gray-600/45 md:my-8 md:w-[75%] md:rounded-md md:border">
                    <div
                        className={
                            "flex h-[3rem] w-full items-center divide-x divide-border border-b border-t border-border text-sm md:border-t-0 md:text-lg"
                        }
                    >
                        <label
                            htmlFor="Search"
                            className={
                                "flex h-full w-full items-center justify-between bg-backgroundGray/30 pr-4 text-sm text-white transition-colors ease-in md:text-lg"
                            }
                        >
                            <input
                                ref={searchInputRef}
                                onChange={(event) =>
                                    setSearchQuery(event.target.value)
                                }
                                value={searchQuery}
                                type="text"
                                placeholder="Search Sites..."
                                className="block h-full w-full appearance-none items-center bg-transparent  px-6 text-sm  text-white placeholder:text-neutral-400 focus:outline-none md:px-8"
                            />
                            <MdSearch className="h-6 w-6 text-neutral-400" />
                        </label>
                        <div className="-order-1 w-[15%] md:order-none">
                            <ComboBox
                                nullable={false}
                                label="Client status"
                                items={["All", "Active", "Inactive"]}
                                selectedItem={clientStatus}
                                setSelectedItem={setClientStatus}
                                getItemLabel={(clientStatus) =>
                                    clientStatus ?? ""
                                }
                                wrapperClassName="border-none z-10 px-6 md:px-8 bg-backgroundGray/30"
                                compareItems={(itemOne, itemTwo) =>
                                    itemOne === itemTwo
                                }
                                showLabel={false}
                                isSelect={true}
                            />
                        </div>
                        <button
                            onClick={manageClickHandler}
                            className={`h-full ${isViewMode ? "bg-backgroundGray/30 text-white hover:bg-white hover:text-black md:text-white" : "bg-red-500 text-white hover:bg-red-400 md:bg-red-500"} border-border px-4 text-sm md:rounded-r-md  md:border-l md:px-6`}
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
                    <div className="flex w-full flex-col divide-y divide-border  border-t-0">
                        {filteredClients.length > 0 ? (
                            filteredClients.map((client, index) => {
                                const clientClickHandler = () => {
                                    navigate(`/clients/${client.id}/config`);
                                };
                                const clientStatusChangeHandler = (
                                    e: React.MouseEvent
                                ) => {
                                    e.stopPropagation(); // Prevent navigation when clicking archive/undo
                                    setClientForStatusChange(client);
                                    setIsClientStatusPopupOpen(true);
                                };
                                return (
                                    <div
                                        className={`flex w-full items-center gap-6 p-6 transition-colors hover:cursor-pointer hover:bg-slate-800/25 md:p-6 ${
                                            selectedIndex === index
                                                ? "bg-slate-700/50"
                                                : "bg-gray-900/25"
                                        }`}
                                        key={client.id}
                                        onClick={clientClickHandler}
                                    >
                                        <div className="hidden sm:flex">
                                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-backgroundGray">
                                                <MdLocationOn className="h-5 w-5 text-primary600" />
                                            </span>
                                        </div>
                                        <div className="flex w-full flex-col">
                                            <div className="flex justify-between">
                                                <h3 className="cursor-pointer text-base font-semibold text-white hover:text-neutral-400">
                                                    {client.name}
                                                </h3>
                                                {isViewMode ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <MdPerson className="h-4 w-4 cursor-pointer text-white" />
                                                        <span>
                                                            {client.operators}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={
                                                            clientStatusChangeHandler
                                                        }
                                                    >
                                                        {client.isActive ? (
                                                            <MdArchive className="h-6 w-6 cursor-pointer text-white" />
                                                        ) : (
                                                            <MdUndo className="h-6 w-6 cursor-pointer text-white" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                            <span className="text-secondary">
                                                {client.id}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex min-h-[30vh] items-center justify-center bg-background">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center gap-6 md:gap-8">
                                        <LoadingSpinner className="h-6 w-6 animate-spin fill-white text-center text-background" />
                                        <span>Loading Clients</span>
                                    </div>
                                ) : (
                                    <span>No Clients</span>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </div>
            {isClientFormVisible && (
                <ClientForm
                    closeClientForm={() => setIsClientFormVisible(false)}
                    refetchClients={mutateFetchClients}
                />
            )}
            {clientForStatusChange && (
                <ClientStatusChangePopup
                    isOpen={isClientStatusPopupOpen}
                    setIsOpen={setIsClientStatusPopupOpen}
                    client={clientForStatusChange}
                    onSubmit={clientStatusChangeHandler}
                />
            )}
        </>
    );
};

const ClientStatusChangePopup = ({
    client,
    isOpen,
    setIsOpen,
    onSubmit
}: {
    client: Client;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onSubmit: () => void;
}) => {
    return (
        <Popup
            title={`${client.isActive ? "Deactivate" : "Activate"} client?`}
            description={
                <p>
                    Are you sure you want to{" "}
                    {client.isActive ? "deactivate" : "activate"}{" "}
                    <span className="font-bold">{client.name}</span>?
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

export default Clients;
