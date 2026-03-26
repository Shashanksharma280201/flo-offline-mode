import ComboBox from "@/components/comboBox/ComboBox";
import Popup from "@/components/popup/Popup";
import SmIconButton from "@/components/ui/SmIconButton";
import { useMutation } from "react-query";
import { errorLogger } from "@/util/errorLogger";
import { useEffect, useState } from "react";
import { fetchAllOperators } from "@/features/operators/services/operatorService";
import { toast } from "react-toastify";
import { RobotType } from "@/data/types";
import {
    addOperatorToRobot,
    removeOperatorFromRobot
} from "../../services/robotsService";
import { Operator } from "@/data/types/appDataTypes";

type PopupProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    selectedOperator: Operator;
    selectedRobot: RobotType;
    existingOperators: RobotType[];
    onSuccess: () => void;
};
type AddRobotPopupProps = Omit<PopupProps, "selectedOperator">;
type RemoveRobotPopupProps = Omit<PopupProps, "existingOperators">;

export const AddOperatorToRobotPopup = ({
    isOpen,
    setIsOpen,
    onSuccess,
    selectedRobot,
    existingOperators
}: AddRobotPopupProps) => {
    const [operators, setOperators] = useState<Operator[]>([]);
    const [operatorToAdd, setOperatorToAdd] = useState<Operator>();

    const { mutate: mutateFetchAllOperators, isLoading } = useMutation({
        mutationFn: () => fetchAllOperators(),
        onSuccess: (operators: Operator[]) => {
            const exists = new Set(existingOperators.map((bot) => bot.id));

            const filteredOperators = operators.filter(
                (operator) => !exists.has(operator.id)
            );
            setOperators(filteredOperators);
        },
        onError: (err) => errorLogger(err)
    });

    const { mutate: mutateAddOperatorToRobot } = useMutation({
        mutationFn: ({
            robotId,
            operatorId
        }: {
            robotId: string;
            operatorId: string;
        }) => addOperatorToRobot({ robotId, operatorId }),
        onSuccess: () => {
            toast.success("Robot added successfully!");
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
            mutateAddOperatorToRobot({
                robotId: selectedRobot.id,
                operatorId: operatorToAdd.id
            });
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
                    <>
                        Add{" "}
                        <strong className="text-white">
                            {operatorToAdd.name}
                        </strong>{" "}
                        to{" "}
                        <strong className="text-white">
                            {selectedRobot.name}
                        </strong>
                        ?
                    </>
                ) : (
                    <>Which operator do you want to add?</>
                )
            }
        >
            <ComboBox
                label="Operators"
                items={operators.filter((op) => op.isActive)}
                selectedItem={operatorToAdd}
                setSelectedItem={setOperatorToAdd}
                getItemLabel={(operator) => (operator ? operator.name : "")}
                placeholder="Select operator"
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

export const RemoveOperatorFromRobotPopup = ({
    selectedOperator,
    selectedRobot,
    onSuccess,
    isOpen,
    setIsOpen
}: RemoveRobotPopupProps) => {
    const { mutate: mutateRemoveOperatorFromRobot } = useMutation({
        mutationFn: ({
            robotId,
            operatorId
        }: {
            robotId: string;
            operatorId: string;
        }) => removeOperatorFromRobot({ robotId, operatorId }),
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
        if (selectedRobot) {
            mutateRemoveOperatorFromRobot({
                robotId: selectedRobot.id,
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
                        {selectedOperator.name}
                    </strong>{" "}
                    from{" "}
                    <strong className="text-white">
                        {selectedRobot.name}?
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
