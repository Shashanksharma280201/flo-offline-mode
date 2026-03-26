import dayjs from "dayjs";
import { FaRobot } from "react-icons/fa";
import { GoIssueClosed, GoIssueOpened } from "react-icons/go";
import { MdOutlineModeComment, MdEdit, MdChevronRight } from "react-icons/md";
import { Smartphone } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { updateIssueFn } from "../robots/services/issuesService";
import Popup from "@/components/popup/Popup";

export type Issue = {
    id: string;
    title: string;
    robot: {
        name: string;
        id: string;
    };
    client: {
        name: string;
        id: string;
    };
    raisedOnTimestamp: number;
    startTimestamp: number;
    closeTimestamp?: number;
    threadCount: number;
    status: "open" | "closed";
    typeOfIssue: "mechanical" | "electrical" | "downtime" | "observation" | "other";
    issueSubCategory?: string;
};

export const IssueItem = ({ issue }: { issue: Issue }) => {
    const [isEditPopupOpen, setIsEditPopupOpen] = useState(false);
    const queryClient = useQueryClient();

    // Determine if issue is from mobile app (other category with no subcategory)
    const isFromMobileApp = issue.typeOfIssue === "other" && !issue.issueSubCategory;

    // Get badge color based on issue type
    const getCategoryColor = () => {
        switch (issue.typeOfIssue) {
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

    const updateIssueMutation = useMutation({
        mutationFn: (data: {
            title: string;
            status: string;
            typeOfIssue: string;
            robotId: string;
            issueId: string;
        }) => updateIssueFn(data),
        onSuccess: () => {
            toast.success("Issue updated successfully!");
            setIsEditPopupOpen(false);
            queryClient.invalidateQueries("issues");
        },
        onError: (error) => {
            console.error("Error updating issue:", error);
            toast.error("Failed to update issue");
        }
    });

    const submitEditHandler = (data: {
        title: string;
        status: string;
        typeOfIssue: string;
    }) => {
        updateIssueMutation.mutate({
            ...data,
            robotId: issue.robot.id,
            issueId: issue.id
        });
    };

    const editButtonHandler = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsEditPopupOpen(true);
    };

    return (
        <div className="flex w-full justify-between p-6 md:p-8">
            <div className="flex w-full flex-col gap-6 md:flex-row-reverse md:items-center md:justify-center md:gap-8 ">
                <div className="flex w-full flex-col gap-2 text-white md:pl-8">
                    <Link
                        to={`/robots/${issue.robot?.id || 'unknown'}/issues/${issue.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-start justify-between"
                    >
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="cursor-pointer text-base font-semibold  hover:opacity-50 ">
                                    {issue.title}
                                </div>
                                {/* Issue Category Badge */}
                                <span className={`text-xs px-2 py-0.5 rounded border ${getCategoryColor()} capitalize`}>
                                    {issue.typeOfIssue}
                                </span>
                                {/* Mobile App Indicator */}
                                {isFromMobileApp && (
                                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded border bg-purple-500/20 border-purple-500/50 text-purple-400">
                                        <Smartphone className="h-3 w-3" />
                                        Mobile App
                                    </span>
                                )}
                            </div>
                            {issue.issueSubCategory && (
                                <div className="text-sm font-normal text-secondary">
                                    {issue.issueSubCategory}
                                </div>
                            )}
                            <div>
                                {!issue.closeTimestamp ? (
                                    <span className="text-secondary">{`Raised on ${dayjs(issue.raisedOnTimestamp).format("h:mm A MMMM DD[, ]YYYY")} at `}</span>
                                ) : (
                                    <span className="text-secondary">{`Closed on ${dayjs(issue.closeTimestamp).format("h:mm A MMMM DD[, ]YYYY")} at `}</span>
                                )}
                                <span className="font-bold text-secondary">
                                    {issue.client?.name || "Unknown Client"}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={editButtonHandler}
                                className="flex items-center justify-center gap-2 rounded-md border border-backgroundGray bg-transparent px-3 py-1 text-white hover:bg-white/20"
                                title="Edit Issue"
                            >
                                <MdEdit className="h-4 w-4" />
                            </button>
                            <div className="flex items-center justify-center gap-4 rounded-full border border-backgroundGray bg-backgroundGray/30 px-4 py-1 ">
                                <FaRobot className="h-4 w-4 -translate-y-[1px] text-white" />
                                <span className="whitespace-nowrap">
                                    {issue.robot?.name || "Unknown Robot"}
                                </span>
                            </div>
                            <div className="hidden items-center justify-center gap-2 md:flex">
                                <MdOutlineModeComment className="h-4 w-4 cursor-pointer text-white hover:opacity-50" />
                                <span>{issue.threadCount}</span>
                            </div>
                        </div>
                    </Link>
                </div>
                <div className="flex w-[30%] font-semibold md:w-[15%] md:items-center md:justify-center lg:w-[10%]">
                    {issue.status === "open" ? (
                        <div
                            className={`flex h-fit min-w-24 max-w-24 items-center justify-center gap-2 rounded-md bg-green-500 px-2 py-1 text-center`}
                        >
                            <GoIssueOpened className="h-4 w-4 text-white" />
                            <span className="first-letter:uppercase">
                                {issue.status}
                            </span>
                        </div>
                    ) : (
                        <div
                            className={`flex h-fit max-w-24 items-center justify-center gap-2 rounded-md bg-red-500 px-2 py-1 text-center `}
                        >
                            <GoIssueClosed className="h-4 w-4 text-white" />
                            <span className="first-letter:uppercase">
                                {issue.status}
                            </span>
                        </div>
                    )}
                </div>
            </div>
            <EditIssuePopup
                selectedIssue={issue}
                isPopOpen={isEditPopupOpen}
                setIsPopOpen={setIsEditPopupOpen}
                onSubmit={submitEditHandler}
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
    selectedIssue: Issue;
    isPopOpen: boolean;
    setIsPopOpen: React.Dispatch<React.SetStateAction<boolean>>;
    onSubmit: (data: {
        title: string;
        status: string;
        typeOfIssue: string;
    }) => void;
}) => {
    const { register, handleSubmit, setValue } = useForm();

    const submitHandler = (data: any) => {
        const updatedData = {
            title: data.title,
            status: data.status,
            typeOfIssue: data.typeOfIssue
        };

        onSubmit(updatedData);
    };

    useEffect(() => {
        if (selectedIssue) {
            setValue("title", selectedIssue.title);
            setValue("status", selectedIssue.status);
            setValue("typeOfIssue", selectedIssue.typeOfIssue);
        } else {
            setValue("title", "");
            setValue("status", "open");
            setValue("typeOfIssue", "other");
        }
    }, [selectedIssue, setValue]);

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
                            value="mechanical"
                        >
                            Mechanical
                        </option>
                        <option
                            className="bg-backgroundGray text-white"
                            value="electrical"
                        >
                            Electrical
                        </option>
                        <option
                            className="bg-backgroundGray text-white"
                            value="downtime"
                        >
                            Downtime
                        </option>
                        <option
                            className="bg-backgroundGray text-white"
                            value="observation"
                        >
                            Observation
                        </option>
                        <option
                            className="bg-backgroundGray text-white"
                            value="other"
                        >
                            Other
                        </option>
                    </select>

                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 pt-8">
                        <MdChevronRight className="h-5 w-5 rotate-90 text-neutral-400" />
                    </div>
                </div>

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
