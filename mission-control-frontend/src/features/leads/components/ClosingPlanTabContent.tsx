import { TargetChange, TargetChangePayload } from "@/data/types";
import { useEffect, useState } from "react";
import { useLeadsStore } from "@/stores/leadsStore";
import {
    addClosingPlanFn,
    addTargetChangeFn,
    updateClosingPlanFn,
    updateTargetChangeFn
} from "../services/leadService";
import { useMutation } from "react-query";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import { LeadsDatePicker } from "./LeadsDatePicker";
import Popup from "@/components/popup/Popup";
import dayjs from "dayjs";
import { AudioRecorder } from "@/components/AudioRecorder";
import { AudioPlayer } from "@/components/AudioPlayer";

export const ClosingPlanTabContent = () => {
    const [selectedLead, setSelectedLead] = useLeadsStore((state) => [
        state.selectedLead!,
        state.setSelectedLead
    ]);
    const [selectedTargetChange, setSelectedTargetChange] =
        useState<TargetChange>();
    const [isEditTargetPopupOpen, setIsEditTargetPopupOpen] = useState(false);
    const [isClosePlanPopupOpen, setIsClosePlanPopupOpen] = useState(false);

    const updatePlanMutation = useMutation({
        mutationFn: ({
            updatedClosingPlan,
            leadId
        }: {
            updatedClosingPlan: {
                description: string;
                audioData?: string;
                audioDuration?: number;
            };
            leadId: string;
        }) => updateClosingPlanFn(updatedClosingPlan, leadId),
        onSuccess: (data) => {
            toast.success("Closing plan updated successfully!");
            setSelectedLead(data);
            setIsClosePlanPopupOpen(false);
        },
        onError: (err) => {
            toast.error("Error updating closing plan");
            console.log("Error updating closing plan", err);
        }
    });

    const addPlanMutation = useMutation({
        mutationFn: ({
            newClosingPlan,
            leadId
        }: {
            newClosingPlan: {
                description: string;
                audioData?: string;
                audioDuration?: number;
            };
            leadId: string;
        }) => addClosingPlanFn(newClosingPlan, leadId),
        onSuccess: (data) => {
            toast.success("Closing plan created successfully!");
            setSelectedLead(data);
            setIsClosePlanPopupOpen(false);
        },
        onError: (err) => {
            toast.error("Error creating closing plan");
            console.log("Error creating closing plan", err);
        }
    });

    const submitHandler = (plan: {
        description: string;
        audioData?: string;
        audioDuration?: number;
    }) => {
        if (selectedLead.closePlan) {
            updatePlanMutation.mutate({
                updatedClosingPlan: plan,
                leadId: selectedLead._id
            });
        } else {
            addPlanMutation.mutate({
                newClosingPlan: plan,
                leadId: selectedLead._id
            });
        }
    };

    const updateTargetChangeMutation = useMutation({
        mutationFn: ({
            targetChange,
            leadId,
            targetChangeId
        }: {
            targetChange: TargetChange;
            leadId: string;
            targetChangeId: string;
        }) => updateTargetChangeFn(targetChange, leadId, targetChangeId),
        onSuccess: (data) => {
            toast.success("Target change updated successfully!");
            setSelectedLead(data);
            setIsClosePlanPopupOpen(false);
        },
        onError: (err) => {
            toast.error("Error updating Target change");
            console.log("Error updating Target change", err);
        }
    });

    const editTargetChangeHandler = (data: TargetChange) => {
        if (!selectedTargetChange) return;

        updateTargetChangeMutation.mutate({
            targetChange: { ...data, changeReason: data.changeReason.trim() },
            leadId: selectedLead._id,
            targetChangeId: data._id
        });
        setIsEditTargetPopupOpen(false);
    };

    const sortTargetChangesByDate = (a: TargetChange, b: TargetChange) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    };

    return (
        <>
            <div className="flex h-[12.10rem] flex-col overflow-y-scroll rounded-md border border-border p-2">
                {selectedLead.closePlan ? (
                    <div className="flex flex-col gap-2">
                        <p
                            onClick={() => {
                                setIsClosePlanPopupOpen(true);
                            }}
                            className="cursor-pointer rounded-md p-2 hover:bg-backgroundGray/30"
                        >
                            {selectedLead.closePlan.description}
                        </p>
                        {selectedLead.closePlan.audioData && (
                            <div className="ml-auto px-2">
                                <AudioPlayer
                                    audioData={selectedLead.closePlan.audioData}
                                    duration={selectedLead.closePlan.audioDuration}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="self-center p-2 text-secondary">
                        No closing plan found{" "}
                        <button
                            onClick={() => setIsClosePlanPopupOpen(true)}
                            className="text-white underline hover:opacity-80"
                        >
                            Create one?
                        </button>
                    </div>
                )}
                <AddOrEditClosingPlanPopup
                    isOpen={isClosePlanPopupOpen}
                    onClose={() => setIsClosePlanPopupOpen(false)}
                    onSubmit={submitHandler}
                    selectedPlan={selectedLead.closePlan}
                />
            </div>
            {selectedLead.closePlan ? (
                <>
                    <AddTargetChangeInput />
                    {selectedLead.targetChanges.length ? (
                        <div className="flex max-h-[12.10rem] flex-col overflow-y-scroll rounded-md border border-border p-2 md:h-full">
                            {selectedLead.targetChanges
                                .sort(sortTargetChangesByDate)
                                .map((targetChange) => {
                                    return (
                                        <div
                                            key={targetChange._id}
                                            onClick={() => {
                                                setSelectedTargetChange(
                                                    targetChange
                                                );
                                                setIsEditTargetPopupOpen(true);
                                            }}
                                            className="grid cursor-pointer grid-cols-5  gap-4 rounded-md p-2 hover:bg-backgroundGray/30"
                                        >
                                            <span className="col-span-1 place-self-start text-white">
                                                {dayjs(
                                                    targetChange.date
                                                ).format("D MMM YYYY")}
                                            </span>
                                            <div className="col-span-4 text-white">
                                                {targetChange.changeReason}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    ) : null}

                    {selectedTargetChange && (
                        <EditClosePlanPopup
                            isOpen={isEditTargetPopupOpen}
                            selectedTarget={selectedTargetChange}
                            onSubmit={editTargetChangeHandler}
                            onClose={() => setIsEditTargetPopupOpen(false)}
                        />
                    )}
                </>
            ) : null}
        </>
    );
};

const AddOrEditClosingPlanPopup = ({
    isOpen,
    selectedPlan,
    onSubmit,
    onClose
}: {
    isOpen: boolean;
    selectedPlan?: { description: string; audioData?: string; audioDuration?: number };
    onSubmit: (plan: {
        description: string;
        audioData?: string;
        audioDuration?: number;
    }) => void;
    onClose: () => void;
}) => {
    const { register, handleSubmit, setValue } = useForm();
    const [audioData, setAudioData] = useState<string>("");
    const [audioDuration, setAudioDuration] = useState<number>(0);

    useEffect(() => {
        if (!selectedPlan) return;
        setValue("closePlan", selectedPlan.description);
        setAudioData(selectedPlan.audioData || "");
        setAudioDuration(selectedPlan.audioDuration || 0);
    }, [selectedPlan]);

    const updatePlanHandler = (data: any) => {
        const { closePlan } = data as { closePlan: string };

        // Validate: either description or audio must be provided
        if (!closePlan?.trim() && !audioData) {
            toast.error("Please provide either text or audio");
            return;
        }

        onSubmit({
            description: closePlan?.trim() || "",
            audioData,
            audioDuration
        });
    };

    return (
        <Popup
            title={selectedPlan ? "Edit closing plan" : "Add closing plan"}
            description
            dialogToggle={isOpen}
            onClose={onClose}
            panelClassName="absolute rounded-none md:rounded-2xl top-0 left-0 md:static h-full w-full text-white md:w-[30vw]"
        >
            <form
                className="flex w-full flex-col gap-2 text-white"
                onSubmit={handleSubmit(updatePlanHandler)}
            >
                <div className="flex flex-col gap-2">
                    <label className="font-medium">Description</label>
                    <textarea
                        className="h-24 w-full resize-none rounded-md border border-border bg-transparent px-4 py-2 outline-none"
                        placeholder="Enter closing plan (or record audio)"
                        {...register("closePlan")}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="font-medium">Audio/Document Upload</label>
                    <AudioRecorder
                        onRecordingComplete={(data, duration) => {
                            setAudioData(data);
                            setAudioDuration(duration);
                        }}
                        onTranscriptionComplete={(text) => {
                            setValue("closePlan", text);
                        }}
                        existingAudio={audioData}
                        onClearAudio={() => {
                            setAudioData("");
                            setAudioDuration(0);
                        }}
                        enableTranscription={true}
                        allowFileUpload={true}
                        onFileUpload={(fileData, fileName, fileType) => {
                            setAudioData(fileData);
                        }}
                    />
                </div>
                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:self-end md:mt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-border px-6 py-2 text-white hover:bg-backgroundGray/30"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="rounded-md border border-border bg-primary600 px-6 py-2 text-black hover:bg-primary700"
                    >
                        Submit
                    </button>
                </div>
            </form>
        </Popup>
    );
};

const EditClosePlanPopup = ({
    isOpen,
    selectedTarget,
    onSubmit,
    onClose
}: {
    isOpen: boolean;
    selectedTarget: TargetChange;
    onSubmit: (data: TargetChange) => void;
    onClose: () => void;
}) => {
    const { register, handleSubmit, setValue } = useForm();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(
        new Date()
    );

    useEffect(() => {
        setValue("changeReason", selectedTarget.changeReason);
        setSelectedDate(selectedTarget.date);
    }, [selectedTarget]);

    const updateTargetChangeHandler = (data: any) => {
        const { changeReason } = data as { changeReason: string };
        onSubmit({
            _id: selectedTarget._id,
            changeReason: changeReason.trim(),
            date: selectedDate || selectedTarget.date
        });
    };

    return (
        <Popup
            title="Edit target change"
            description
            dialogToggle={isOpen}
            onClose={onClose}
            panelClassName="absolute rounded-none md:rounded-2xl top-0 left-0 md:static h-full w-full text-white md:w-[30vw]"
        >
            <form
                className="flex w-full flex-col gap-2 text-white"
                onSubmit={handleSubmit(updateTargetChangeHandler)}
            >
                <div className="flex flex-col gap-2">
                    <label className="font-medium">Description</label>
                    <textarea
                        required
                        className="h-24 w-full resize-none rounded-md border border-border bg-transparent px-4 py-2 outline-none"
                        placeholder="Enter change reason"
                        {...register("changeReason")}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="font-medium">Date</label>
                    <LeadsDatePicker
                        variant="input"
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                    />
                </div>
                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:self-end md:mt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-border px-6 py-2 text-white hover:bg-backgroundGray/30"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="rounded-md border border-border bg-primary600 px-6 py-2 text-black hover:bg-primary700"
                    >
                        Submit
                    </button>
                </div>
            </form>
        </Popup>
    );
};

const AddTargetChangeInput = () => {
    const { register, handleSubmit, setValue } = useForm();
    const [selectedLead, setSelectedLead] = useLeadsStore((state) => [
        state.selectedLead,
        state.setSelectedLead
    ]);

    const [selectedDate, setSelectedDate] = useState<Date | undefined>(
        new Date()
    );

    const addTargetChangeHandler = (data: any) => {
        const { changeReason } = data as { changeReason: string };
        if (!changeReason || !selectedDate) {
            toast.error("Please fill in all the fields");
            return;
        }
        addTargetChangeMutation.mutate({
            targetChange: {
                changeReason: changeReason.trim(),
                date: selectedDate
            },
            leadId: selectedLead!._id
        });
    };

    const addTargetChangeMutation = useMutation({
        mutationFn: ({
            targetChange,
            leadId
        }: {
            targetChange: TargetChangePayload;
            leadId: string;
        }) => addTargetChangeFn(targetChange, leadId),
        onSuccess: (data) => {
            toast.success("Target change added successfully!");
            setSelectedLead(data);
            setValue("changeReason", "");
            setSelectedDate(new Date());
        },
        onError: (err) => {
            toast.error("Error adding target change");
            console.log("Error adding target change", err);
        }
    });

    return (
        <form
            className="rounded-md border border-border"
            onSubmit={handleSubmit(addTargetChangeHandler)}
        >
            <textarea
                className="h-24 w-full resize-none bg-transparent px-4 py-2 outline-none"
                placeholder="Changing target close date? Enter the reason here and select the new target date"
                required
                {...register("changeReason")}
            />
            <div className="flex items-center justify-between p-2">
                <div className="px-2">
                    <LeadsDatePicker
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                    />
                </div>
                <button
                    type="submit"
                    className="rounded-md bg-primary600 px-6 py-1 text-black hover:bg-primary700"
                >
                    Submit
                </button>
            </div>
        </form>
    );
};
