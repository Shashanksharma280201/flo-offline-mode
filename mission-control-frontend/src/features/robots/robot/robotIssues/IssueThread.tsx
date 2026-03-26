import { useMutation } from "react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    CloseIssuePayload,
    SendMessageToThreadPayload,
    closeIssueFn,
    getIssueFn,
    sendMessageToThreadFn,
    updateIssueFn
} from "../../services/issuesService";
import { errorLogger } from "@/util/errorLogger";
import { useEffect, useState } from "react";
import { IssueData } from "@/data/types/issueTypes";
import Header from "@/components/header/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
    MdAttachment,
    MdCancel,
    MdChevronRight,
    MdEdit,
    MdPerson,
    MdSquare
} from "react-icons/md";
import SmIconButton from "@/components/ui/SmIconButton";
import { GoIssueClosed, GoIssueOpened } from "react-icons/go";
import { RiTeamFill } from "react-icons/ri";
import { Smartphone } from "lucide-react";
import dayjs from "dayjs";
import FileDropZone from "@/components/dropzone/FileDropZone";
import AttachmentThumbnail from "@/components/dropzone/AttachmentThumbnail";
import { formatBytes } from "@/util/bytesConverter";
import MediaPlayer from "@/components/ui/MediaPlayer";
import { toast } from "react-toastify";
import CloseIssueButton from "./CloseIssueButton";
import Popup from "@/components/popup/Popup";
import { useForm } from "react-hook-form";

const IssueThread = () => {
    const { robotId, issueId } = useParams();
    const [issueData, setIssueData] = useState<IssueData>();
    const [message, setMessage] = useState("");
    const [fileAttachments, setFileAttachments] = useState<File[]>([]);
    const [selectedAttachment, setSelectedAttachment] = useState<number>(0);

    const [isPopOpen, setIsPopOpen] = useState(false);

    // Helper function to determine badge color based on issue type
    const getCategoryColor = (typeOfIssue?: string) => {
        switch (typeOfIssue) {
            case "mechanical":
                return "bg-orange-500/20 border-orange-500/50 text-orange-400";
            case "electrical":
                return "bg-blue-500/20 border-blue-500/50 text-blue-400";
            case "downtime":
                return "bg-red-500/20 border-red-500/50 text-red-400";
            case "observation":
                return "bg-yellow-500/20 border-yellow-500/50 text-yellow-400";
            case "other":
                return "bg-gray-500/20 border-gray-500/50 text-gray-400";
            default:
                return "bg-gray-500/20 border-gray-500/50 text-gray-400";
        }
    };

    // Determine if issue is from mobile app
    const isFromMobileApp = issueData?.typeOfIssue === "other" && !issueData?.issueSubCategory;

    const [selectedUrls, setSelectedUrls] = useState<
        {
            mediaType: string;
            url: string;
        }[]
    >([]);
    const [showMediaPlayerAttachments, setShowMediaPlayerAttachments] =
        useState(false);
    const [showMediaPlayerUrls, setShowMediaPlayerUrls] = useState(false);
    const fileAttachmentsSize = fileAttachments.reduce(
        (prevValue, currentValue) => {
            return currentValue.size + prevValue;
        },
        0
    );
    const [showDropZone, setShowDropZone] = useState(false);
    const navigate = useNavigate();

    const fetchIssueMutation = useMutation(
        ({ robotId, issueId }: { robotId: string; issueId: string }) =>
            getIssueFn(robotId, issueId),
        {
            onSuccess(data) {
                console.log(data);
                setIssueData(data);
            },
            onError(error) {
                errorLogger(error);
            }
        }
    );
    const sendMessageMutation = useMutation(
        (messageData: SendMessageToThreadPayload) => {
            return sendMessageToThreadFn(messageData);
        },
        {
            onSuccess(data) {
                console.log(data);
                if (robotId && issueId) {
                    fetchIssueMutation.mutate({ robotId, issueId });
                }
                setMessage("");
                setFileAttachments([]);
                toast.success(data.message, {
                    pauseOnFocusLoss: false,
                    position: "bottom-right"
                });
            },
            onError(error) {
                errorLogger(error);
            }
        }
    );
    const closeIssueMutation = useMutation(
        (closeIssueData: CloseIssuePayload) => {
            return closeIssueFn(closeIssueData);
        },
        {
            onSuccess(data) {
                console.log(data);
                toast.success(data.message, {
                    pauseOnFocusLoss: false,
                    position: "bottom-right"
                });
                if (robotId && issueId)
                    fetchIssueMutation.mutate({ robotId, issueId });
            },
            onError(error) {
                errorLogger(error);
            }
        }
    );

    const sendMessageToThreadHandler = () => {
        if (fileAttachmentsSize > 50 * 1000000) {
            toast.error("Attachment size should be less than 50MB", {
                position: "top-right"
            });
            return;
        } // 50 MB limit
        if (message === "") {
            toast.error("Message cannot be empty", {
                position: "top-right"
            });
            return;
        }
        if (!robotId) {
            toast.error("Robot Id not set", {
                position: "top-right"
            });
            return;
        }
        if (!issueData || !issueData.raisedOnTimestamp || !issueData.id) {
            toast.error("Issue data not available.", {
                position: "top-right"
            });
            return;
        }

        sendMessageMutation.mutate({
            robotId: robotId,
            issueId: issueData.id,
            raisedOnTimestamp: issueData.raisedOnTimestamp,
            message: message,
            messageTimestamp: Date.now(),
            attachments: fileAttachments,
            uploadProgress: (progress) => {
                console.log({ progress });
            }
        });
    };

    // mutation for updating the issue
    const updateIssueMutation = useMutation({
        mutationFn: (data: {
            title: string;
            status: string;
            typeOfIssue: string;
            // solution?: string;
            // client: string;
            // robot: string;
            // thread?: string;
            robotId: string;
            issueId: string;
        }) => updateIssueFn(data),

        onSuccess: (response, request) => {
            toast.success("Issues updated successfully!");
            fetchIssueMutation.mutate({
                robotId: request.robotId,
                issueId: request.issueId
            });
        },
        onError: (error) => errorLogger(error)
    });

    const closeIssueHandler = ({
        date,
        issueSolution
    }: {
        date: Date;
        issueSolution: string;
    }) => {
        const closeTimestamp = date.getTime();
        if (!issueSolution) {
            toast.error("Please enter a solution", {
                position: "top-right"
            });
            return;
        }
        if (!robotId) {
            toast.error("Robot Id not set", {
                position: "top-right"
            });
            return;
        }
        if (!issueId) {
            toast.error("Issue Id not set", {
                position: "top-right"
            });
            return;
        }
        if (!issueData?.startTimestamp) {
            toast.error("Issue has not started yet", {
                position: "top-right"
            });
            return;
        }

        if (issueData.startTimestamp > closeTimestamp) {
            toast.error("Issue close time cannot be before issue start time", {
                position: "top-right"
            });
            return;
        }

        if (closeTimestamp > Date.now()) {
            toast.error("Close date cannot be in the future", {
                position: "top-right"
            });
            return;
        }

        closeIssueMutation.mutate({
            robotId,
            issueId,
            closeTimestamp,
            issueSolution
        });
    };

    useEffect(() => {
        if (robotId && issueId) {
            fetchIssueMutation.mutate({ robotId, issueId });
        }
    }, [robotId, issueId]);

    // on submitting the edit form it comes here
    const submitEditIssuesHandler = (data: {
        title: string;
        status: string;
        typeOfIssue: string;
        // solution?: string;
        // client: string;
        // robot: string;
        // thread?: string;
        robotId: string;
        issueId: string;
    }) => {
        updateIssueMutation.mutate(data);
        setIsPopOpen(false);
    };

    // handler to open edit pop up
    const editButtonHandler = () => {
        setIsPopOpen(true);
    };

    return (
        <div>
            {showMediaPlayerAttachments && (
                <MediaPlayer
                    scrollTo={selectedAttachment}
                    mediaItems={fileAttachments}
                    onClose={() => setShowMediaPlayerAttachments(false)}
                />
            )}
            {showMediaPlayerUrls && (
                <MediaPlayer
                    scrollTo={selectedAttachment}
                    mediaItems={selectedUrls}
                    onClose={() => setShowMediaPlayerUrls(false)}
                />
            )}
            {issueData ? (
                <div>
                    <Header
                        onBack={() => navigate(`/robots/${robotId}/issues`)}
                        title={
                            <div className="flex items-center gap-2  text-xs text-neutral-400  md:gap-4  md:text-xl">
                                <Link
                                    to={`/robots/${robotId}/issues`}
                                    className="font-normal text-neutral-400 hover:text-white "
                                >
                                    {issueData.robot.name}
                                </Link>
                                <span className="hidden  md:block ">{">"}</span>
                                <span className="hidden font-normal text-neutral-400 md:block">
                                    Issues
                                </span>
                                <span>{">"}</span>
                                <span className="font-normal text-white">
                                    {issueData.id}
                                </span>
                            </div>
                        }
                    />
                    <div className="flex w-full flex-col items-center">
                        <section className="flex w-full flex-col justify-between gap-6 border-y border-border p-6 md:w-[75%]  md:gap-8 md:border-y-0 md:border-b md:p-8">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-start gap-2 md:justify-between">
                                    <div className="flex flex-col gap-2 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-base md:text-xl">
                                                {issueData.title}
                                            </span>
                                            {/* Issue Category Badge */}
                                            <span className={`text-xs px-2 py-0.5 rounded border ${getCategoryColor(issueData.typeOfIssue)} capitalize`}>
                                                {issueData.typeOfIssue}
                                            </span>
                                            {/* Mobile App Indicator */}
                                            {isFromMobileApp && (
                                                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded border bg-purple-500/20 border-purple-500/50 text-purple-400">
                                                    <Smartphone className="h-3 w-3" />
                                                    Mobile App
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <SmIconButton
                                            name="Edit"
                                            className="flex border border-backgroundGray bg-transparent p-2 font-semibold text-white hover:bg-white/20"
                                            onClick={editButtonHandler}
                                        >
                                            <MdEdit className="h-4 w-4 cursor-pointer text-neutral-400 hover:opacity-75" />
                                        </SmIconButton>
                                    </div>
                                </div>
                                {issueData.issueSubCategory && (
                                    <span className="text-sm font-normal text-secondary">
                                        {issueData.issueSubCategory}
                                    </span>
                                )}
                                {!issueData.closeTimestamp ? (
                                    <span className="text-secondary">{`Raised on ${dayjs(issueData.raisedOnTimestamp).format("MMMM DD[, ]YYYY")} at ${issueData.client.name}`}</span>
                                ) : (
                                    <span className="text-secondary">{`Closed on ${dayjs(issueData.closeTimestamp).format("MMMM DD[, ]YYYY")} at ${issueData.client.name}`}</span>
                                )}
                            </div>
                            <div>
                                {issueData.status === "open" ? (
                                    <div
                                        className={`flex h-fit min-w-24 max-w-24 items-center justify-center gap-2 rounded-md bg-green-500 px-2 py-1 text-center`}
                                    >
                                        <GoIssueOpened className="h-4 w-4 text-white" />
                                        <span className="first-letter:uppercase">
                                            {issueData.status}
                                        </span>
                                    </div>
                                ) : (
                                    <div
                                        className={`flex h-fit max-w-24 items-center justify-center gap-2 rounded-md bg-red-500 px-2 py-1 text-center `}
                                    >
                                        <GoIssueClosed className="h-4 w-4 text-white" />
                                        <span className="first-letter:uppercase">
                                            {issueData.status}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </section>
                        <section className="flex w-full flex-col gap-6 p-6  md:w-[75%] md:gap-8 md:p-8">
                            {issueData.thread.map((threadItem) => (
                                <div className="w-full" key={threadItem.id}>
                                    <div className="flex w-full items-start justify-center gap-6 md:gap-8">
                                        <div className="hidden h-[2.5rem] w-[2.5rem] items-center justify-center rounded-full bg-backgroundGray  md:flex">
                                            <MdPerson className="m-3 h-4 w-4 text-white md:h-5   md:w-5 " />
                                        </div>

                                        <div className="w-full">
                                            <div className="relative flex h-[2.5rem] w-full items-center justify-between gap-6  rounded-t-md  border border-x border-border bg-[#171717]   px-6   text-base   text-white md:gap-8 md:px-8  md:text-lg ">
                                                <span>
                                                    {threadItem.senderInfo.name}
                                                </span>
                                                <span className="text-xs text-secondary md:text-base">
                                                    {`${dayjs(threadItem.id).format(" MMMM DD[, ]YYYY")} `}
                                                </span>
                                                <MdSquare className="absolute -left-2 top-auto hidden h-4 w-4 rotate-45 border-b border-l border-border bg-[#171717] text-[#171717] md:block" />
                                            </div>
                                            <div className="flex flex-col divide-y divide-border rounded-b-md border-x border-b border-backgroundGray  text-secondary  ">
                                                <span className="h-full w-full p-6 md:p-8">
                                                    {threadItem.message}
                                                </span>
                                                {threadItem.attachments.length >
                                                    0 && (
                                                    <div className="flex w-full overflow-x-auto p-2 ">
                                                        <div className="flex gap-2 md:gap-4">
                                                            {threadItem.attachments.map(
                                                                (
                                                                    urlItem,
                                                                    index
                                                                ) => (
                                                                    <div
                                                                        key={
                                                                            index
                                                                        }
                                                                        className="h-24 w-24 overflow-hidden rounded-md bg-backgroundGray/50"
                                                                    >
                                                                        <AttachmentThumbnail
                                                                            onClick={() => {
                                                                                setSelectedUrls(
                                                                                    threadItem.attachments
                                                                                );
                                                                                setSelectedAttachment(
                                                                                    index
                                                                                );
                                                                                setShowMediaPlayerUrls(
                                                                                    true
                                                                                );
                                                                            }}
                                                                            className="hover:opacity-20 active:opacity-20"
                                                                            attachment={
                                                                                urlItem
                                                                            }
                                                                        />
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {issueData.status === "open" && (
                                <section className="flex w-full flex-col gap-6 md:gap-8 ">
                                    <div className="flex w-full items-start justify-center gap-6 border-t border-border pt-6 md:gap-8  md:pt-8">
                                        <div className="hidden h-[2.5rem] w-[2.5rem] items-center  justify-center rounded-full bg-backgroundGray  md:flex">
                                            <MdPerson className="m-3 h-4 w-4 text-white md:h-5   md:w-5 " />
                                        </div>

                                        <div className="w-full">
                                            <div
                                                onClick={() =>
                                                    setShowDropZone(
                                                        (prev) => !prev
                                                    )
                                                }
                                                className="relative flex h-[2.5rem] w-full items-center justify-between gap-6  rounded-t-md  border border-x border-border bg-[#171717]   px-6   text-base   text-white md:gap-8 md:px-8  md:text-lg "
                                            >
                                                <span>Add a message</span>

                                                <div className="flex items-center justify-between gap-2 md:gap-4">
                                                    <span className="text-xs text-secondary md:text-base">
                                                        {fileAttachments.length >
                                                            0 &&
                                                            formatBytes(
                                                                fileAttachmentsSize
                                                            )}
                                                    </span>
                                                    <MdAttachment className="h-4 w-4 -rotate-90 cursor-pointer text-neutral-400 md:h-5  md:w-5 " />
                                                </div>

                                                <MdSquare className="absolute -left-2 top-auto hidden h-4 w-4 rotate-45 border-b border-l border-border bg-[#171717] text-[#171717] md:block" />
                                            </div>
                                            <div className="w-full divide-y divide-border rounded-b-md border-x border-b border-backgroundGray   text-secondary ">
                                                <label htmlFor="issueMessage">
                                                    <textarea
                                                        value={message}
                                                        onChange={(event) =>
                                                            setMessage(
                                                                event.target
                                                                    .value
                                                            )
                                                        }
                                                        placeholder="Type your message here"
                                                        name="issueMessage"
                                                        className=" h-full w-full bg-transparent p-6 outline-none placeholder:text-neutral-600  md:p-8"
                                                    />
                                                </label>
                                                {fileAttachments &&
                                                    fileAttachments.length >
                                                        0 && (
                                                        <div className="flex w-full overflow-x-scroll p-2 ">
                                                            <div className="flex gap-2 md:gap-4">
                                                                {fileAttachments.map(
                                                                    (
                                                                        attachment,
                                                                        index
                                                                    ) => (
                                                                        <div
                                                                            key={
                                                                                index
                                                                            }
                                                                            className="relative h-24 w-24  overflow-hidden rounded-md bg-backgroundGray/50"
                                                                        >
                                                                            <AttachmentThumbnail
                                                                                onClick={() => {
                                                                                    setSelectedAttachment(
                                                                                        index
                                                                                    );
                                                                                    setShowMediaPlayerAttachments(
                                                                                        true
                                                                                    );
                                                                                }}
                                                                                className="hover:opacity-20 active:opacity-20"
                                                                                attachment={
                                                                                    attachment
                                                                                }
                                                                            />

                                                                            <MdCancel
                                                                                onClick={() => {
                                                                                    setFileAttachments(
                                                                                        (
                                                                                            prev
                                                                                        ) =>
                                                                                            prev.toSpliced(
                                                                                                index,
                                                                                                1
                                                                                            )
                                                                                    );
                                                                                }}
                                                                                className="absolute right-1 top-1 h-4 w-4 cursor-pointer text-white "
                                                                            />
                                                                        </div>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                {showDropZone && (
                                                    <div className="flex w-full  text-neutral-600">
                                                        <FileDropZone
                                                            onDrop={(
                                                                acceptedFiles
                                                            ) => {
                                                                setFileAttachments(
                                                                    (
                                                                        prevAttachments
                                                                    ) => [
                                                                        ...prevAttachments,
                                                                        ...acceptedFiles
                                                                    ]
                                                                );
                                                            }}
                                                            attachments={
                                                                fileAttachments
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 md:gap-4">
                                        <CloseIssueButton
                                            onSubmit={closeIssueHandler}
                                        />
                                        <SmIconButton
                                            name={"Submit Message"}
                                            className="whitespace-nowrap bg-green-500/20 font-semibold text-white hover:bg-green-500 active:bg-green-500"
                                            onClick={sendMessageToThreadHandler}
                                        />
                                    </div>
                                </section>
                            )}
                            {issueData.solution ? (
                                <div className="w-full">
                                    <div className="flex w-full items-start justify-center gap-6 md:gap-8">
                                        <div className="hidden h-[2.5rem] w-[2.5rem] items-center justify-center rounded-full bg-backgroundGray  md:flex">
                                            <RiTeamFill className="m-3 h-4 w-4 text-white md:h-5 md:w-5" />
                                        </div>

                                        <div className="w-full">
                                            <div className="relative flex h-[2.5rem] w-full items-center justify-between gap-6  rounded-t-md  border border-x border-border bg-[#171717]   px-6   text-base   text-white md:gap-8 md:px-8  md:text-lg ">
                                                <span>Support Team</span>
                                                <MdSquare className="absolute -left-2 top-auto hidden h-4 w-4 rotate-45 border-b border-l border-border bg-[#171717] text-[#171717] md:block" />
                                            </div>
                                            <div className="flex flex-col divide-y divide-border rounded-b-md border-x border-b border-backgroundGray  text-secondary  ">
                                                <span className="h-full w-full p-6 md:p-8">
                                                    {issueData.solution}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </section>
                    </div>
                </div>
            ) : (
                <div className="flex h-screen w-full flex-col items-center justify-center gap-6 md:gap-8">
                    <LoadingSpinner className="h-6 w-6 animate-spin fill-white text-center text-background" />
                    <span>Fetching Issue details</span>
                </div>
            )}

            <EditIssuePopup
                onSubmit={submitEditIssuesHandler}
                isPopOpen={isPopOpen}
                selectedIssue={issueData}
                setIsPopOpen={setIsPopOpen}
            />
        </div>
    );
};

const EditIssuePopup = ({
    selectedIssue,
    isPopOpen,
    setIsPopOpen,
    onSubmit
}: {
    selectedIssue?: IssueData;
    isPopOpen: boolean;
    setIsPopOpen: React.Dispatch<React.SetStateAction<boolean>>;
    onSubmit: (data: {
        title: string;
        status: string;
        typeOfIssue: string;
        robotId: string;
        issueId: string;
        // solution?: string;
        // client: string;
        // robot: string;
        // thread?: string;
    }) => void;
}) => {
    const { register, handleSubmit, setValue } = useForm();

    const submitHandler = (data: any) => {
        // editing the thread data
        const updatedData = {
            ...data,
            // thread: data.thread
            // ? data.thread.split(",").map((msg: string, idx: number) => ({
            //     id: idx,
            //     message: msg.trim(),
            //     senderInfo: { id: "unknown", name: "Unknown" },
            //     attachments: [],
            //     }))
            // : [],
            robotId: selectedIssue?.robot.id,
            issueId: selectedIssue?.id
        };

        onSubmit(updatedData);
        setIsPopOpen(false);
    };

    useEffect(() => {
        if (selectedIssue) {
            setValue("title", selectedIssue.title);
            setValue("status", selectedIssue.status);
            setValue("typeOfIssue", selectedIssue.typeOfIssue);
            // setValue("solution", selectedIssue.solution || "");
            // setValue("client", selectedIssue.client.name);
            // setValue("robot", selectedIssue.robot.id);
            // setValue("robot", selectedIssue.robot.name);
            // setValue("thread", selectedIssue.thread.map(t => t.message).join(", "));
        } else {
            setValue("title", "");
            setValue("status", "open");
            setValue("typeOfIssue", "Other");
            // setValue("solution", "");
            // setValue("client", "");
            // setValue("robot", "");
            // setValue("thread", "");
        }
    }, [selectedIssue]);

    return (
        <Popup
            title="Edit Issue"
            description=""
            dialogToggle={isPopOpen}
            onClose={() => setIsPopOpen(false)}
            panelClassName="absolute rounded-none md:rounded-2xl top-0 left-0 md:static h-full w-full text-white md:w-[25vw]"
        >
            <form
                className="flex flex-col gap-4"
                onSubmit={handleSubmit(submitHandler)}
            >
                <div className="flex flex-col gap-2">
                    <label htmlFor="title" className="text-neutral-400">
                        Title
                    </label>
                    <input
                        id="title"
                        {...register("title")}
                        className="rounded-md border border-border bg-transparent px-4 py-2 outline-none"
                        placeholder="Enter issue title"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor="status" className="text-neutral-400">
                        Status
                    </label>
                    <select
                        id="status"
                        {...register("status")}
                        className="w-full appearance-none rounded-md border border-border bg-backgroundGray/30 px-4 py-2 text-sm text-white placeholder:text-neutral-400 focus:outline-none"
                    >
                        <option
                            className="bg-backgroundGray text-white"
                            value="open"
                        >
                            Open
                        </option>
                        {/* <option className="text-white bg-backgroundGray" value="pending">Pending</option> */}
                        <option
                            className="bg-backgroundGray text-white"
                            value="closed"
                        >
                            Closed
                        </option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-8 pt-7">
                        <MdChevronRight className="h-5 w-5 rotate-90 text-neutral-400" />
                    </div>
                </div>

                <div className="relative flex flex-col gap-2">
                    <label htmlFor="typeOfIssue" className="text-neutral-400">
                        Type of Issue
                    </label>
                    <select
                        id="typeOfIssue"
                        {...register("typeOfIssue")}
                        className="w-full appearance-none rounded-md border border-border bg-backgroundGray/30 px-4 py-2 text-sm text-white placeholder:text-neutral-400 focus:outline-none"
                    >
                        <option
                            className="bg-backgroundGray text-white"
                            value="Mechanical"
                        >
                            Mechanical
                        </option>
                        <option
                            className="bg-backgroundGray text-white"
                            value="Electrical"
                        >
                            Electrical
                        </option>
                        <option
                            className="bg-backgroundGray text-white"
                            value="Downtime"
                        >
                            Downtime
                        </option>
                        <option
                            className="bg-backgroundGray text-white"
                            value="Observation"
                        >
                            Observation
                        </option>
                        <option
                            className="bg-backgroundGray text-white"
                            value="Other"
                        >
                            Other
                        </option>
                    </select>

                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 pt-8">
                        {" "}
                        {/* Add pt-7 to match the second div */}
                        <MdChevronRight className="h-5 w-5 rotate-90 text-neutral-400" />
                    </div>
                </div>

                {/* <div className="flex flex-col gap-2">
                    <label htmlFor="solution">Solution</label>
                    <textarea
                    id="solution"
                    {...register("solution")}
                    className="rounded-md border border-border bg-transparent px-4 py-2 outline-none"
                    placeholder="Describe the solution"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor="client">Client Name</label>
                    <input
                    id="client"
                    {...register("client")}
                    className="rounded-md border border-border bg-transparent px-4 py-2 outline-none"
                    placeholder="Enter client name"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor="robot">Robot Name</label>
                    <input
                    id="robot"
                    {...register("robot")}
                    className="rounded-md border border-border bg-transparent px-4 py-2 outline-none"
                    placeholder="Enter robot name"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor="thread">Message Thread (optional)</label>
                    <textarea
                    id="thread"
                    {...register("thread")}
                    className="rounded-md border border-border bg-transparent px-4 py-2 outline-none"
                    placeholder="Comma-separated thread messages"
                    />
                </div>*/}

                <div className="mt-2 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => setIsPopOpen(false)}
                        className="rounded-md border border-border px-6 py-2 text-white hover:bg-backgroundGray/30"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="rounded-md border border-border bg-white px-6 py-2 text-black hover:bg-white/80"
                    >
                        Submit
                    </button>
                </div>
            </form>
        </Popup>
    );
};
export default IssueThread;
