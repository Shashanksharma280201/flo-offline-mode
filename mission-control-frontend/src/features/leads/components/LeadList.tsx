import { Link } from "react-router-dom";
import dayjs from "dayjs";

import {
    Lead,
    LeadPayload,
    NextStepPayload,
    ResponsePayload
} from "@/data/types";
import { useLeadsStore } from "@/stores/leadsStore";
import { MdDelete, MdEdit, MdMoreHoriz, MdHistory } from "react-icons/md";
import { useEffect, useState } from "react";
import Popup from "@/components/popup/Popup";
import { useForm } from "react-hook-form";
import { useMutation } from "react-query";
import { deleteLeadFn, updateLeadFn } from "../services/leadService";
import { useLeads } from "@/hooks/useLeads";
import { toast } from "react-toastify";
import { errorLogger } from "@/util/errorLogger";
import { LeadsDatePicker } from "./LeadsDatePicker";
import ComboBox from "@/components/comboBox/ComboBox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/DropdownMenu";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from "@/components/ui/accordion";
import { indianNumberFormat, removeCommas } from "@/util/numberConverter";
import { Button } from "@/components/ui/Button";
import { StageHistoryPopup } from "./StageHistoryPopup";

export const LeadList = () => {
    const leads = useLeadsStore((state) => state.leads);

    return (
        <div className="flex justify-center items-center">
            <div className="flex flex-col w-3/4 gap-2">
                {leads.length ? (
                    leads.map((lead) => {
                        return <LeadItem key={lead._id} lead={lead} />;
                    })
                ) : (
                    <div className="self-center p-6">No leads found</div>
                )}
            </div>
        </div>
    );
};

const LeadItem = ({ lead }: { lead: Lead }) => {
    const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
    const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
    const [isHistoryPopupOpen, setIsHistoryPopupOpen] = useState(false);

    const editLeadClickHandler = () => {
        setIsQuickEditOpen(true);
    };

    const deleteLeadClickHandler = () => {
        setIsDeletePopupOpen(true);
    };

    const historyClickHandler = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsHistoryPopupOpen(true);
    };

    const nextStepDate = lead.nextSteps.length
        ? dayjs(lead.nextSteps[lead.nextSteps.length - 1].date).format(
              "D MMM YYYY"
          )
        : undefined;

    return (
        <>
            <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                    <AccordionTrigger className="flex items-center justify-between rounded-lg border-2 border-gray-700 bg-gray-800/85 p-2 hover:bg-gray-800/50 hover:no-underline">
                        <Link
                            to={`/leads/${lead._id}`}
                            className="flex justify-between p-4"
                        >
                            <div className="flex flex-col gap-3 md:gap-1">
                                <div className="flex flex-wrap items-center gap-2 text-xl hover:opacity-65">
                                    <h1 className="flex">{lead.pocName}</h1>
                                    {lead.stage !== undefined && (
                                        <LeadChip
                                            text={`Stage ${lead.stage}`}
                                            color="#22c55e"
                                        />
                                    )}
                                    <LeadChip
                                        text={lead.companyName}
                                        color="#f59e0b"
                                    />
                                    {lead.product ? (
                                        <LeadChip
                                            text={lead.product}
                                            color="#ef4444"
                                        />
                                    ) : null}
                                    <LeadChip
                                        text={lead.city}
                                        color="#3b82f6"
                                    />
                                    {lead.acv ? (
                                        <LeadChip
                                            text={
                                                "ACV: " +
                                                new Intl.NumberFormat("en-IN", {
                                                    style: "currency",
                                                    currency: "INR",
                                                    maximumFractionDigits: 0
                                                }).format(+lead.acv)
                                            }
                                            color="#aaaaaa"
                                        />
                                    ) : null}
                                </div>
                                <span className="text-sm text-secondary">
                                    {nextStepDate
                                        ? `${nextStepDate}: ${lead.nextSteps[lead.nextSteps.length - 1].description}`
                                        : null}
                                </span>
                            </div>
                        </Link>
                    </AccordionTrigger>
                    <AccordionContent className="flex flex-col gap-3 rounded-b-2xl bg-gray-700 p-4">
                        {/* Stage history preview */}
                        {lead.stageHistory && lead.stageHistory.length > 0 && (
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                <MdHistory className="h-4 w-4" />
                                <span>
                                    Last updated:{" "}
                                    {dayjs(
                                        lead.stageHistory[
                                            lead.stageHistory.length - 1
                                        ].date
                                    ).format("MMM D, YYYY")}
                                </span>
                                <span className="text-gray-500">•</span>
                                <span>
                                    {lead.stageHistory.length} stage change
                                    {lead.stageHistory.length !== 1 ? "s" : ""}
                                </span>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-row items-center justify-end gap-2">
                            {lead.stageHistory && lead.stageHistory.length > 0 && (
                                <Button
                                    onClick={historyClickHandler}
                                    className="flex items-center gap-2 rounded-lg bg-purple-500 p-2 hover:bg-purple-600"
                                >
                                    <MdHistory className="h-4 w-4" />
                                    <span>History</span>
                                </Button>
                            )}
                            <Button
                                onClick={deleteLeadClickHandler}
                                className="flex w-[80px] rounded-lg bg-red-500 p-2"
                            >
                                Delete
                            </Button>
                            <Button
                                onClick={editLeadClickHandler}
                                className="flex w-[80px] rounded-lg bg-blue-500 p-2"
                            >
                                Edit
                            </Button>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <QuickEditPopup
                isOpen={isQuickEditOpen}
                setIsOpen={setIsQuickEditOpen}
                lead={lead}
            />
            <DeleteLeadPopup
                isOpen={isDeletePopupOpen}
                setIsOpen={setIsDeletePopupOpen}
                lead={lead}
            />
            <StageHistoryPopup
                isOpen={isHistoryPopupOpen}
                setIsOpen={setIsHistoryPopupOpen}
                stageHistory={lead.stageHistory || []}
                leadName={lead.pocName}
            />
        </>
    );
};

const QuickEditPopup = ({
    isOpen,
    setIsOpen,
    lead
}: {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    lead: Lead;
}) => {
    const { register, handleSubmit, setValue, watch } = useForm();
    const { fetchLeads } = useLeads();
    const [nextStepDate, setNextStepDate] = useState<Date | undefined>();
    const [responseDate, setResponseDate] = useState<Date | undefined>();
    const [stage, setStage] = useState<string>();

    const acvValue = watch("acv");
    const tcvValue = watch("tcv");

    const quickEditMutation = useMutation({
        mutationFn: ({
            lead,
            response,
            nextStep,
            id
        }: {
            lead: Partial<LeadPayload>;
            response?: ResponsePayload;
            nextStep?: NextStepPayload;
            id: string;
        }) => updateLeadFn(lead, id, response, nextStep),
        onSuccess: () => {
            toast.success("Lead updated successfully!");
            fetchLeads();
            setIsOpen(false);
        },
        onError: errorLogger
    });

    const submitHandler = (data: any) => {
        if (quickEditMutation.isLoading) return; // Prevent multiple submissions
        const {
            acv,
            tcv,
            robotCount,
            response: responseDesc,
            nextStep: nextStepDesc
        } = data;

        if (!responseDate && responseDesc) {
            toast.error("Please select a response date");
            return;
        }

        if (!nextStepDate && nextStepDesc) {
            toast.error("Please select a next step date");
            return;
        }

        quickEditMutation.mutate({
            lead: {
                ...(acvValue && { acv: +removeCommas(acvValue) }),
                ...(tcvValue && { tcv: +removeCommas(tcvValue) }),
                robotCount,
                stage: stage ? +stage[stage.length - 1] : undefined
            },
            ...(responseDate &&
                responseDesc && {
                    response: { date: responseDate, description: responseDesc }
                }),
            ...(nextStepDate &&
                nextStepDesc && {
                    nextStep: { date: nextStepDate, description: nextStepDesc }
                }),
            id: lead._id
        });
    };

    useEffect(() => {
        setValue("acv", lead.acv ? indianNumberFormat(+lead.acv) : "");
        setValue("tcv", lead.tcv ? indianNumberFormat(+lead.tcv) : "");
        setValue("robotCount", lead.robotCount);
        setStage(lead.stage !== undefined ? `Stage ${lead.stage}` : undefined);
    }, []);

    return (
        <Popup
            title={"Quick edit"}
            description={""}
            dialogToggle={isOpen}
            onClose={() => setIsOpen(false)}
            panelClassName="absolute overflow-visible rounded-none bg-slate-900 md:rounded-2xl top-0 left-0 md:static h-full w-full text-white md:w-[40vw]"
        >
            <form
                className="flex flex-col gap-4"
                onSubmit={handleSubmit(submitHandler)}
            >
                <div className="flex flex-col gap-2">
                    <label>ACV</label>
                    <input
                        className="rounded-md bg-backgroundGray/30 p-2 outline-none"
                        placeholder="ACV of the lead"
                        {...register("acv")}
                        onBlur={(e) => {
                            setValue(
                                "acv",
                                e.target.value
                                    ? indianNumberFormat(e.target.value)
                                    : ""
                            );
                        }}
                        onFocus={(e) =>
                            setValue("acv", removeCommas(e.target.value))
                        }
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>TCV</label>
                    <input
                        className="rounded-md bg-backgroundGray/30 p-2 outline-none"
                        placeholder="TCV of the lead"
                        {...register("tcv")}
                        onBlur={(e) => {
                            setValue(
                                "tcv",
                                e.target.value
                                    ? indianNumberFormat(e.target.value)
                                    : ""
                            );
                        }}
                        onFocus={(e) =>
                            setValue("tcv", removeCommas(e.target.value))
                        }
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>Pipeline stage</label>
                    <ComboBox
                        wrapperClassName="px-2 py-2 h-fit bg-backgroundGray/30 border-none"
                        inputClassName="placeholder:text-sm placeholder:text-gray"
                        label=""
                        showLabel={false}
                        items={[
                            "Stage -1",
                            "Stage 0",
                            "Stage 1",
                            "Stage 2",
                            "Stage 3",
                            "Stage 4",
                            "Stage 5"
                        ]}
                        selectedItem={stage}
                        setSelectedItem={setStage}
                        getItemLabel={(stage) => stage}
                        placeholder="Select pipeline stage"
                        compareItems={(stageA, stageB) => stageA === stageB}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>Robot count</label>
                    <input
                        className="rounded-md bg-backgroundGray/30 p-2 outline-none"
                        placeholder="Number of robots purchased"
                        {...register("robotCount")}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label>Response</label>
                    <div className="flex gap-2">
                        <LeadsDatePicker
                            variant="text"
                            className="rounded-md border-none bg-backgroundGray/30 p-2"
                            selectedDate={responseDate}
                            onDateSelect={setResponseDate}
                        />
                        <input
                            className="flex-1 rounded-md bg-backgroundGray/30  p-2 outline-none"
                            placeholder="Enter the recent response"
                            {...register("response")}
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <label>Next step</label>
                    <div className="flex gap-2">
                        <LeadsDatePicker
                            variant="text"
                            className="rounded-md border-none bg-backgroundGray/30 p-2"
                            selectedDate={nextStepDate}
                            onDateSelect={setNextStepDate}
                        />
                        <input
                            className="flex-1 rounded-md bg-backgroundGray/30  p-2 outline-none"
                            placeholder="Enter the next step"
                            {...register("nextStep")}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => setIsOpen(false)}
                        type="button"
                        className="rounded-md border border-border px-4 py-2 hover:bg-backgroundGray/30"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="rounded-md bg-white px-4 py-2 text-black hover:bg-gray-400 transition-colors delay-75"
                    >
                        Save
                    </button>
                </div>
            </form>
        </Popup>
    );
};

const DeleteLeadPopup = ({
    isOpen,
    setIsOpen,
    lead
}: {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    lead: Lead;
}) => {
    const { fetchLeads } = useLeads();
    const deleteLeadMutation = useMutation({
        mutationFn: (leadId: string) => deleteLeadFn(leadId),
        onSuccess: () => {
            toast.success("Lead deleted successfully");
            fetchLeads();
            setIsOpen(false);
        },
        onError: errorLogger
    });

    const deleteLeadHandler = () => {
        deleteLeadMutation.mutate(lead._id);
        setIsOpen(false);
    };

    return (
        <Popup
            title={"Delete lead?"}
            description={
                <p>
                    Are you sure you want delete{" "}
                    <span className="font-bold">{lead.pocName}</span>?
                </p>
            }
            dialogToggle={isOpen}
            onClose={() => setIsOpen(false)}
            panelClassName="absolute overflow-visible rounded-none bg-slate-900 md:rounded-2xl top-0 left-0 md:static h-full w-full text-white md:w-[40vw]"
        >
            <div className="flex justify-end gap-2">
                <button
                    onClick={() => setIsOpen(false)}
                    type="button"
                    className="rounded-md border border-border px-4 py-2 hover:bg-gray-700 transition-colors delay-75"
                >
                    Cancel
                </button>
                <button
                    onClick={deleteLeadHandler}
                    className="rounded-md bg-red-500 px-4 py-2 text-black hover:bg-red-700/80 transition-colors delay-75"
                >
                    Delete
                </button>
            </div>
        </Popup>
    );
};

const LeadActions = ({
    onEdit,
    onDelete
}: {
    onEdit: () => void;
    onDelete: () => void;
}) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="p-2 hover:opacity-80">
                <MdMoreHoriz className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="space-y-2 border-backgroundGray bg-background p-2"
            >
                <DropdownMenuItem
                    onClick={onEdit}
                    className="flex cursor-pointer items-center justify-between rounded-md text-white focus:bg-neutral-100 focus:text-black"
                >
                    <span>Edit</span>
                    <MdEdit className="size-5" />
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={onDelete}
                    className="flex cursor-pointer items-center justify-between rounded-md text-white focus:bg-red-500 focus:text-black"
                >
                    <span>Delete</span>
                    <MdDelete className="size-5" />
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
type LeadChipProps = {
    text: string;
    color: string;
};

const LeadChip = ({ text, color }: LeadChipProps) => {
    return (
        <div
            className="flex h-fit w-fit items-center justify-center rounded-full border-[0.5px] px-3 py-0.5 text-xs"
            style={{
                backgroundColor: color + "50",

                color: color,
                borderColor: color
            }}
        >
            {text}
        </div>
    );
};
