import { Lead, Response, ResponsePayload } from "@/data/types";
import { useEffect, useState } from "react";
import { useLeadsStore } from "@/stores/leadsStore";
import { addResponseFn, updateResponseFn } from "../services/leadService";
import { useMutation } from "react-query";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { useForm } from "react-hook-form";
import { LeadsDatePicker } from "./LeadsDatePicker";
import Popup from "@/components/popup/Popup";
import { AudioRecorder } from "@/components/AudioRecorder";
import { AudioPlayer } from "@/components/AudioPlayer";

export const ResponseTabContent = () => {
    const [selectedLead, setSelectedLead] = useLeadsStore((state) => [
        state.selectedLead!,
        state.setSelectedLead
    ]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedResponse, setSelectedResponse] = useState<Response>();

    const editHandler = (response: ResponsePayload) => {
        if (!selectedResponse) return;
        updateResponseMutation.mutate({
            newResponse: response,
            leadId: selectedLead._id,
            responseId: selectedResponse._id
        });
        setIsOpen(false);
    };

    const updateResponseMutation = useMutation({
        mutationFn: ({
            newResponse,
            leadId,
            responseId
        }: {
            newResponse: ResponsePayload;
            leadId: string;
            responseId: string;
        }) => updateResponseFn(newResponse, leadId, responseId),
        onSuccess: (data) => {
            toast.success("Response updated successfully!");
            setSelectedLead(data);
        },
        onError: (err) => {
            toast.error("Error updating response");
            console.log("Error updating response", err);
        }
    });

    const sortResponsesByDate = (a: Response, b: Response) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    };

    return (
        <>
            <AddResponseInput />
            <div className="flex h-full max-h-[25.25rem] flex-col overflow-y-scroll rounded-md border border-border p-2 md:h-full">
                {selectedLead.responses.length ? (
                    selectedLead.responses
                        .sort(sortResponsesByDate)
                        .map((response) => {
                            return (
                                <div
                                    key={response._id}
                                    className="flex flex-col gap-2 rounded-md p-2 hover:bg-backgroundGray/30"
                                >
                                    <div
                                        onClick={() => {
                                            setSelectedResponse(response);
                                            setIsOpen(true);
                                        }}
                                        className="grid cursor-pointer grid-cols-5 gap-4"
                                    >
                                        <span className="col-span-1 place-self-start text-white text-xs opacity-60">
                                            {dayjs(response.date).format(
                                                "D MMM YYYY"
                                            )}
                                        </span>
                                        <div className="col-span-4 text-white">
                                            {response.description}
                                        </div>
                                    </div>
                                    {response.audioData && (
                                        <div className="ml-auto">
                                            <AudioPlayer
                                                audioData={response.audioData}
                                                duration={response.audioDuration}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                ) : (
                    <div className="self-center p-2">No responses found</div>
                )}
                {selectedResponse && (
                    <EditResponsePopup
                        onSubmit={editHandler}
                        isOpen={isOpen}
                        selectedResponse={selectedResponse}
                        onClose={() => setIsOpen(false)}
                    />
                )}
            </div>
        </>
    );
};

const EditResponsePopup = ({
    isOpen,
    selectedResponse,
    onSubmit,
    onClose
}: {
    isOpen: boolean;
    selectedResponse: Response;
    onSubmit: (data: ResponsePayload) => void;
    onClose: () => void;
}) => {
    const { register, handleSubmit, setValue } = useForm();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(
        new Date()
    );
    const [audioData, setAudioData] = useState<string>("");
    const [audioDuration, setAudioDuration] = useState<number>(0);

    useEffect(() => {
        setValue("description", selectedResponse.description);
        setSelectedDate(selectedResponse.date);
        setAudioData(selectedResponse.audioData || "");
        setAudioDuration(selectedResponse.audioDuration || 0);
    }, [selectedResponse]);

    const updateResponseHandler = (data: any) => {
        const { description } = data as { description: string };

        // Validate: either description or audio must be provided
        if (!description?.trim() && !audioData) {
            toast.error("Please provide either text or audio");
            return;
        }

        onSubmit({
            description: description?.trim() || "",
            date: selectedDate || selectedResponse.date,
            audioData,
            audioDuration
        });
    };

    return (
        <Popup
            title="Edit Response"
            description
            dialogToggle={isOpen}
            onClose={onClose}
            panelClassName="absolute rounded-none md:rounded-2xl top-0 left-0 md:static h-full w-full text-white md:w-[30vw]"
        >
            <form
                className="flex w-full flex-col gap-2 text-white"
                onSubmit={handleSubmit(updateResponseHandler)}
            >
                <div className="flex flex-col gap-2">
                    <label className="font-medium">Description</label>
                    <textarea
                        className="h-24 w-full resize-none rounded-md border border-border bg-transparent px-4 py-2 outline-none"
                        placeholder="Enter response (or record audio)"
                        {...register("description")}
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
                <div className="flex flex-col gap-2">
                    <label className="font-medium">Audio/Document Upload</label>
                    <AudioRecorder
                        onRecordingComplete={(data, duration) => {
                            setAudioData(data);
                            setAudioDuration(duration);
                        }}
                        onTranscriptionComplete={(text) => {
                            setValue("description", text);
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

const AddResponseInput = () => {
    const { register, handleSubmit, setValue } = useForm();
    const [selectedLead, setSelectedLead] = useLeadsStore((state) => [
        state.selectedLead,
        state.setSelectedLead
    ]);
    const [audioData, setAudioData] = useState<string>("");
    const [audioDuration, setAudioDuration] = useState<number>(0);

    const addResponseHandler = (data: any) => {
        const { description } = data as { description: string };

        // Validate: either description or audio must be provided
        if (!description?.trim() && !audioData) {
            toast.error("Please provide either text or audio");
            return;
        }

        if (!selectedDate) {
            toast.error("Please select a date");
            return;
        }

        addResponseMutation.mutate({
            newResponse: {
                description: description?.trim() || "",
                date: selectedDate,
                audioData,
                audioDuration
            },
            leadId: selectedLead!._id
        });
    };

    const addResponseMutation = useMutation({
        mutationFn: ({
            newResponse,
            leadId
        }: {
            newResponse: ResponsePayload;
            leadId: string;
        }) => addResponseFn(newResponse, leadId),
        onSuccess: (data) => {
            toast.success("Response added successfully!");
            setSelectedLead(data);
            setValue("description", "");
            setSelectedDate(new Date());
            setAudioData("");
            setAudioDuration(0);
        },
        onError: (err) => {
            toast.error("Error adding response");
            console.log("Error adding response", err);
        }
    });

    const [selectedDate, setSelectedDate] = useState<Date | undefined>(
        new Date()
    );

    return (
        <form
            className="rounded-md border border-border"
            onSubmit={handleSubmit(addResponseHandler)}
        >
            <textarea
                className="h-24 w-full resize-none bg-transparent px-4 py-2 outline-none"
                placeholder="Enter new response (or record audio)"
                {...register("description")}
            />
            <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2 px-2">
                    <LeadsDatePicker
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                    />
                    <AudioRecorder
                        onRecordingComplete={(data, duration) => {
                            setAudioData(data);
                            setAudioDuration(duration);
                        }}
                        onTranscriptionComplete={(text) => {
                            setValue("description", text);
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
