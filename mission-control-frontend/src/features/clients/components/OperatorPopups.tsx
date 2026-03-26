import ComboBox from "@/components/comboBox/ComboBox";
import Popup from "@/components/popup/Popup";
import SmIconButton from "@/components/ui/SmIconButton";
import { ClientOperator } from "../ClientOperators";
import { ClientData } from "@/data/types";
import { useMutation } from "react-query";
import {
    addOperatorToClient,
    fetchClients,
    moveOperator,
    removeOperatorFromClient
} from "../services/clientService";
import { toast } from "react-toastify";
import { errorLogger } from "@/util/errorLogger";
import { useEffect, useState } from "react";
import { Client } from "@/pages/Clients";
import { fetchAllOperators } from "@/features/operators/services/operatorService";

type PopupProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    selectedOperator: ClientOperator;
    selectedClient: ClientData;
    onSuccess: () => void;
};
type AddOperatorPopupProps = Omit<PopupProps, "selectedOperator">;

export const AddOperatorPopup = ({
    isOpen,
    setIsOpen,
    onSuccess,
    selectedClient
}: AddOperatorPopupProps) => {
    const [operators, setOperators] = useState<ClientOperator[]>([]);
    const [operatorToAdd, setOperatorToAdd] = useState<ClientOperator>();

    const { mutate: mutateFetchAllOperators, isLoading } = useMutation({
        mutationFn: () => fetchAllOperators(),
        onSuccess: (data: ClientOperator[]) => {
            setOperators(data);
        },
        onError: (err) => errorLogger(err)
    });

    const { mutate: mutateAddOperator } = useMutation({
        mutationFn: ({
            clientId,
            operatorId
        }: {
            clientId: string;
            operatorId: string;
        }) => addOperatorToClient(clientId, operatorId),
        onSuccess: () => {
            toast.success("Operator added successfully!");
            onSuccess();
        },
        onError: (err) => errorLogger(err)
    });

    const { mutate: mutateMoveOperator } = useMutation({
        mutationFn: ({
            toClientId,
            operatorId
        }: {
            toClientId: string;
            operatorId: string;
        }) => moveOperator(toClientId, operatorId),
        onSuccess: () => {
            toast.success("Operator added successfully");
            onSuccess();
        },
        onError: (err) => errorLogger(err)
    });

    useEffect(() => {
        if (isOpen) {
            mutateFetchAllOperators();
        }
    }, [isOpen]);

    const closePopup = () => {
        setIsOpen(false);
    };

    const cancelHandler = () => {
        if (operatorToAdd) {
            setOperatorToAdd(undefined);
        }
    };

    const confirmHandler = () => {
        if (operatorToAdd) {
            if (!operatorToAdd.isActive) {
                toast.error("Operator is not active");
                return;
            }
            if (operatorToAdd.client) {
                mutateMoveOperator({
                    operatorId: operatorToAdd.id,
                    toClientId: selectedClient.id
                });
            } else {
                mutateAddOperator({
                    clientId: selectedClient.id,
                    operatorId: operatorToAdd.id
                });
            }
        }
        setIsOpen(false);
        setOperatorToAdd(undefined);
    };

    return (
        <Popup
            onClose={closePopup}
            dialogToggle={isOpen}
            title="Add operator"
            panelClassName="overflow-visible"
            description={
                operatorToAdd ? (
                    operatorToAdd.client ? (
                        <>
                            Move{" "}
                            <strong className="text-white">
                                {operatorToAdd.name}
                            </strong>{" "}
                            from{" "}
                            <strong className="text-white">
                                {operatorToAdd.client.name}
                            </strong>{" "}
                            to{" "}
                            <strong className="text-white">
                                {selectedClient.name}
                            </strong>
                            ?
                        </>
                    ) : (
                        <>
                            Add{" "}
                            <strong className="text-white">
                                {operatorToAdd.name}
                            </strong>{" "}
                            to{" "}
                            <strong className="text-white">
                                {selectedClient.name}
                            </strong>
                            ?
                        </>
                    )
                ) : (
                    <>Who do you want to add?</>
                )
            }
        >
            <ComboBox
                label="Operators"
                items={operators.filter((op) => {
                    if (!op.isActive) return false;
                    if (!op.client) return true;
                    return op.client.id !== selectedClient.id;
                })}
                selectedItem={operatorToAdd}
                setSelectedItem={setOperatorToAdd}
                getItemLabel={(operator) => (operator ? operator.name : "")}
                placeholder="Select Operator"
                isLoading={isLoading}
            />
            {operatorToAdd && (
                <div className="flex items-center justify-end gap-2 md:gap-4">
                    <SmIconButton
                        name="Cancel"
                        className="border border-backgroundGray bg-transparent font-semibold text-white hover:bg-white/20"
                        onClick={cancelHandler}
                    />
                    <SmIconButton
                        name="Confirm"
                        className="border bg-white font-semibold text-black"
                        onClick={confirmHandler}
                    />
                </div>
            )}
        </Popup>
    );
};

export const RemoveOperatorPopup = ({
    selectedOperator,
    selectedClient,
    onSuccess,
    isOpen,
    setIsOpen
}: PopupProps) => {
    const { mutate: mutateRemoveOperatorFromClient } = useMutation({
        mutationFn: ({
            clientId,
            operatorId
        }: {
            clientId: string;
            operatorId: string;
        }) => removeOperatorFromClient(clientId, operatorId),
        onSuccess: () => {
            toast.success("Removed operator successfully!");
            onSuccess();
        },
        onError: (err) => errorLogger(err)
    });

    const closeRemovePopup = () => {
        setIsOpen(false);
    };

    const confirmRemovePopup = () => {
        if (selectedOperator) {
            mutateRemoveOperatorFromClient({
                clientId: selectedClient.id,
                operatorId: selectedOperator.id
            });
        }
        closeRemovePopup();
    };

    return (
        <Popup
            title="Remove Operator?"
            description={
                <>
                    Are you sure you want to remove{" "}
                    <strong className="text-white">
                        {selectedOperator?.name}
                    </strong>{" "}
                    from{" "}
                    <strong className="text-white">
                        {selectedClient.name}?
                    </strong>
                </>
            }
            onClose={closeRemovePopup}
            dialogToggle={isOpen}
        >
            <div className="flex items-center justify-end gap-2 md:gap-4">
                <SmIconButton
                    name="Cancel"
                    className="border border-backgroundGray bg-transparent font-semibold text-white hover:bg-white/20"
                    onClick={closeRemovePopup}
                />
                <SmIconButton
                    name="Confirm"
                    className="border border-red-500 bg-red-500 font-semibold text-white"
                    onClick={confirmRemovePopup}
                />
            </div>
        </Popup>
    );
};

export const MoveOperatorPopup = ({
    isOpen,
    setIsOpen,
    selectedOperator,
    selectedClient,
    onSuccess
}: PopupProps) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [moveToClient, setMoveToClient] = useState<Client>();

    const { mutate: mutateFetchClients, isLoading: isLoadingClients } =
        useMutation({
            mutationFn: () => fetchClients(),
            onSuccess: (data) => {
                setClients(data);
            },
            onError: (err) => console.log(err)
        });

    const { mutate: mutateMoveOperator, isLoading: isMoveLoading } =
        useMutation({
            mutationFn: ({
                toClientId,
                operatorId
            }: {
                toClientId: string;
                operatorId: string;
            }) => moveOperator(toClientId, operatorId),
            onSuccess: () => {
                toast.success("Operator moved successfully");
                onSuccess();
            },
            onError: (err) => errorLogger(err)
        });

    const clientChangeHandler = (client: Client) => {
        setMoveToClient(client);
    };
    const closeMovePopup = () => {
        setIsOpen(false);
    };

    const confirmMovePopup = () => {
        if (moveToClient && selectedOperator) {
            mutateMoveOperator({
                toClientId: moveToClient.id,
                operatorId: selectedOperator.id
            });
        }
        closeMovePopup();
    };

    useEffect(() => {
        mutateFetchClients();
    }, []);

    return (
        <Popup
            onClose={closeMovePopup}
            dialogToggle={isOpen}
            title="Move operator"
            panelClassName="overflow-visible"
            description={
                <>
                    Where do you want to move&nbsp;
                    <strong className="text-white">
                        {selectedOperator?.name}
                    </strong>{" "}
                    to?
                </>
            }
        >
            <ComboBox
                label="Clients"
                items={clients.filter(
                    (client) => client.id !== selectedClient.id
                )}
                selectedItem={moveToClient}
                setSelectedItem={clientChangeHandler}
                getItemLabel={(client) => (client ? client.name : "")}
                placeholder="Select Client"
                isLoading={isLoadingClients}
            />
            <div className="flex items-center justify-end gap-2 md:gap-4">
                <SmIconButton
                    name="Cancel"
                    className="border border-backgroundGray bg-transparent font-semibold text-white hover:bg-white/20"
                    onClick={closeMovePopup}
                />
                <SmIconButton
                    name="Confirm"
                    className="border bg-white font-semibold text-black"
                    onClick={confirmMovePopup}
                />
            </div>
        </Popup>
    );
};
