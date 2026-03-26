import ComboBox from "@/components/comboBox/ComboBox";
import Popup from "@/components/popup/Popup";
import SmIconButton from "@/components/ui/SmIconButton";
import { useMutation } from "react-query";
import { errorLogger } from "@/util/errorLogger";
import { useEffect, useState } from "react";
import {
    addRobotToOperator,
    fetchAllRobots,
    removeRobotFromOperator
} from "@/features/operators/services/operatorService";
import { Robot } from "../OperatorRobots";
import { toast } from "react-toastify";
import { Operator } from "@/data/types/appDataTypes";

type PopupProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    selectedOperator: Operator;
    selectedRobot: Robot;
    existingRobots: Robot[];
    onSuccess: () => void;
};
type AddRobotPopupProps = Omit<PopupProps, "selectedRobot">;
type RemoveRobotPopupProps = Omit<PopupProps, "existingRobots">;

export const AddRobotPopup = ({
    isOpen,
    setIsOpen,
    onSuccess,
    selectedOperator,
    existingRobots
}: AddRobotPopupProps) => {
    const [robots, setRobots] = useState<Robot[]>([]);
    const [robotToAdd, setRobotToAdd] = useState<Robot>();

    const { mutate: mutateFetchAllRobots, isLoading } = useMutation({
        mutationFn: () => fetchAllRobots(),
        onSuccess: (robots: Robot[]) => {
            const exists = new Set(existingRobots.map((bot) => bot.id));

            const filteredRobots = robots.filter(
                (robot) => !exists.has(robot.id)
            );
            setRobots(filteredRobots);
        },
        onError: (err) => errorLogger(err)
    });

    const { mutate: mutateAddRobot } = useMutation({
        mutationFn: ({
            robotId,
            operatorId
        }: {
            robotId: string;
            operatorId: string;
        }) => addRobotToOperator({ robotId, operatorId }),
        onSuccess: () => {
            toast.success("Robot added successfully!");
            onSuccess();
        },
        onError: (err) => errorLogger(err)
    });

    useEffect(() => {
        if (isOpen) {
            mutateFetchAllRobots();
        }
    }, [isOpen]);

    const closePopup = () => {
        setIsOpen(false);
    };

    const cancelHandler = () => {
        if (robotToAdd) {
            setRobotToAdd(undefined);
        }
    };

    const confirmHandler = () => {
        if (robotToAdd)
            mutateAddRobot({
                robotId: robotToAdd.id,
                operatorId: selectedOperator.id
            });

        setIsOpen(false);
        setRobotToAdd(undefined);
    };

    return (
        <Popup
            onClose={closePopup}
            dialogToggle={isOpen}
            title="Add robot"
            panelClassName="overflow-visible"
            description={
                robotToAdd ? (
                    <>
                        Add{" "}
                        <strong className="text-white">
                            {robotToAdd.name}
                        </strong>{" "}
                        to{" "}
                        <strong className="text-white">
                            {selectedOperator.name}
                        </strong>
                        ?
                    </>
                ) : (
                    <>Which robot do you want to add?</>
                )
            }
        >
            <ComboBox
                label="Robots"
                items={robots}
                selectedItem={robotToAdd}
                setSelectedItem={setRobotToAdd}
                getItemLabel={(robot) => (robot ? robot.name : "")}
                placeholder="Select Robot"
                isLoading={isLoading}
            />
            {robotToAdd && (
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

export const RemoveRobotPopup = ({
    selectedOperator,
    selectedRobot,
    onSuccess,
    isOpen,
    setIsOpen
}: RemoveRobotPopupProps) => {
    const { mutate: mutateRemoveRobotFromOperator } = useMutation({
        mutationFn: ({
            robotId,
            operatorId
        }: {
            robotId: string;
            operatorId: string;
        }) => removeRobotFromOperator({ robotId, operatorId }),
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
            mutateRemoveRobotFromOperator({
                robotId: selectedRobot.id,
                operatorId: selectedOperator.id
            });
        }
        closeRemovePopup();
    };

    return (
        <Popup
            title="Remove Robot?"
            description={
                <>
                    Are you sure you want to remove{" "}
                    <strong className="text-white">{selectedRobot.name}</strong>{" "}
                    from{" "}
                    <strong className="text-white">
                        {selectedOperator.name}?
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
