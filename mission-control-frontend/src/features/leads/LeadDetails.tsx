import Header from "@/components/header/Header";
import { Lead } from "@/data/types";
import { MdEdit } from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";
import { LeadActions } from "./components/LeadActions";
import { useLeadsStore } from "@/stores/leadsStore";
import { useLead } from "@/hooks/useLead";
import { useEffect, useState } from "react";
import { indianNumberFormat } from "@/util/numberConverter";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "react-query";
import { updateLeadFn } from "./services/leadService";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { Button } from "@/components/ui/Button";
import { AudioPlayer } from "@/components/AudioPlayer";

const LeadDetails = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const { mutate: fetchLead } = useLead();
    const selectedLead = useLeadsStore((state) => state.selectedLead);

    useEffect(() => {
        if (!id) return;
        fetchLead(id);
    }, []);

    return (
        <>
            <Header 
                title={
                    selectedLead && (
                        <div className="flex  w-full items-center justify-between gap-4">
                            {/* <Button className="flex bg-gray-800" onClick={() => navigate(-1)}>Back</Button> */}
                            <span>{selectedLead.pocName}</span>
                            <MdEdit
                                role="button"
                                className="h-5 w-5 cursor-pointer text-white"
                                onClick={() => navigate("edit")}
                            />
                        </div>
                    )
                }
                onBack={() => navigate(-1)}
            />
            <div className="mx-auto flex w-full flex-col bg-blue-900/25 p-3 sm:p-6 md:p-8">
                <div className="flex h-full w-full flex-col gap-4 md:flex-row">
                    {/* Left Column - Basic & Pipeline Details */}
                    <div className="flex w-full flex-col gap-4 md:w-1/3">
                        {selectedLead ? (
                            <div className="rounded-md border border-border">
                                <BasicDetails lead={selectedLead} />
                            </div>
                        ) : (
                            <div className="h-64 animate-pulse rounded-md bg-backgroundGray/30" />
                        )}
                        {selectedLead ? (
                            <div className="h-fit rounded-md border border-border">
                                <PipelineDetails lead={selectedLead} />
                            </div>
                        ) : (
                            <div className="h-48 animate-pulse rounded-md bg-backgroundGray/30" />
                        )}
                    </div>

                    {/* Middle Column - Lead Actions Tabs */}
                    <div className="flex w-full flex-col gap-4 md:w-1/3">
                        {selectedLead ? (
                            <div className="h-full rounded-md">
                                <LeadActions />
                            </div>
                        ) : (
                            <div className="h-[36rem] animate-pulse rounded-md bg-backgroundGray/30" />
                        )}
                    </div>

                    {/* Right Column - Closing Plan & Notes */}
                    <div className="flex w-full flex-col gap-4 md:w-1/3">
                        {/* Closing Plan - 60% height */}
                        <div className="flex min-h-[16rem] flex-[6]">
                            {selectedLead ? (
                                <div className="flex h-full w-full rounded-md border border-border">
                                    <NonEditableDetails lead={selectedLead} />
                                </div>
                            ) : (
                                <div className="h-64 w-full animate-pulse rounded-md bg-backgroundGray/30" />
                            )}
                        </div>

                        {/* Notes - 40% height */}
                        <div className="flex min-h-[12rem] flex-[4]">
                            {selectedLead ? (
                                <div className="flex h-full w-full">
                                    <Notes lead={selectedLead} />
                                </div>
                            ) : (
                                <div className="h-48 w-full animate-pulse rounded-md bg-backgroundGray/30" />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

const BasicDetails = ({ lead }: { lead: Lead }) => {
    return (
        <div className="flex flex-col divide-y divide-border overflow-hidden">
            <h2 className="p-4 font-semibold">Basic details</h2>
            <div className="flex flex-col gap-2 p-4">
                <Detail detail="POC Name" value={lead.pocName} />
                <Detail detail="Company Name" value={lead.companyName} />
                <Detail detail="City" value={lead.city} />
                <Detail detail="Phone number" value={lead.phoneNumber} />
                <Detail detail="Email" value={lead.email} />
                <Detail detail="Designation" value={lead.designation} />
                <Detail detail="Source" value={lead.source} />
                <Detail detail="Source details" value={lead.sourceDetails} />
                <Detail detail="Category" value={lead.category} />
                <Detail detail="Type" value={lead.type} />
            </div>
        </div>
    );
};

const PipelineDetails = ({ lead }: { lead: Lead }) => {
    return (
        <div className="flex flex-col divide-y divide-border overflow-hidden">
            <h2 className="p-4 font-semibold">Pipeline details</h2>
            <div className="flex flex-col gap-2 p-4">
                <Detail
                    detail="Pipeline stage"
                    value={
                        lead.stage !== undefined
                            ? `Stage ${lead.stage}`
                            : undefined
                    }
                />
                <Detail detail="Product" value={lead.product} />
                <Detail detail="Stage" value={lead.pipelineStage} />
                <Detail
                    detail="Robot count"
                    value={lead.robotCount ? lead.robotCount.toString() : ""}
                />
                <Detail
                    detail="ACV"
                    value={lead.acv ? "₹" + indianNumberFormat(lead.acv) : ""}
                />
                <Detail
                    detail="TCV"
                    value={lead.tcv ? "₹" + indianNumberFormat(lead.tcv) : ""}
                />
            </div>
        </div>
    );
};

const Detail = ({ detail, value }: { detail: string; value?: string }) => {
    return (
        <div className="flex w-full items-center">
            <h3 className="basis-1/2">{detail}</h3>
            <span className="basis-1/2" title={value}>
                {value
                    ? value.length > 15
                        ? value.slice(0, 20) + "..."
                        : value
                    : "-"}
            </span>
        </div>
    );
};

const NonEditableDetails = ({ lead }: { lead: Lead }) => {
    // Get the latest target change (most recent by date)
    const latestTargetChange = lead.targetChanges?.length
        ? [...lead.targetChanges].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )[0]
        : null;

    return (
        <div className="flex h-full w-full flex-col divide-y divide-border overflow-hidden">
            <h2 className="p-4 font-semibold">Closing Plan</h2>
            <div className="flex-1 overflow-y-auto p-4">
                {/* Closing Plan Section */}
                <div className="mb-4">
                    {lead.closePlan ? (
                        <>
                            <p className="whitespace-pre-wrap text-sm text-gray-300">
                                {lead.closePlan.description}
                            </p>
                            {lead.closePlan.audioData && (
                                <div className="mt-2">
                                    <AudioPlayer
                                        audioData={lead.closePlan.audioData}
                                        duration={lead.closePlan.audioDuration}
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-gray-500">
                            No closing plan available.
                        </p>
                    )}
                </div>

                {/* Latest Target Change Section */}
                {/* {latestTargetChange && (
                    <div className="mt-4 border-t border-border pt-4">
                        <h3 className="mb-2 text-sm font-semibold text-gray-400">
                            Latest Target Change
                        </h3>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-gray-500">
                                {dayjs(latestTargetChange.date).format(
                                    "D MMM YYYY"
                                )}
                            </span>
                            <p className="whitespace-pre-wrap text-sm text-gray-300">
                                {latestTargetChange.changeReason}
                            </p>
                        </div>
                    </div>
                )} */}
            </div>
        </div>
    );
};

const Notes = ({ lead }: { lead: Lead }) => {
    const [notes, setNotes] = useState(lead.accountNotes || "");
    const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
    const setSelectedLead = useLeadsStore((state) => state.setSelectedLead);

    // Update notes mutation
    const updateNotesMutation = useMutation({
        mutationFn: (accountNotes: string) =>
            updateLeadFn({ accountNotes }, lead._id),
        onSuccess: (data) => {
            setSaveStatus("saved");
            setSelectedLead(data);
        },
        onError: () => {
            setSaveStatus("error");
            toast.error("Failed to save notes");
        }
    });

    // Debounce auto-save effect
    useEffect(() => {
        if (notes === (lead.accountNotes || "")) return; // No change, skip save

        setSaveStatus("saving");
        const timer = setTimeout(() => {
            updateNotesMutation.mutate(notes);
        }, 500);

        return () => clearTimeout(timer);
    }, [notes]);

    // Update local state when lead changes
    useEffect(() => {
        setNotes(lead.accountNotes || "");
    }, [lead.accountNotes]);

    return (
        <div className="flex h-full w-full flex-col overflow-hidden rounded-md border border-border">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <h3 className="text-sm font-semibold">Account Research Notes</h3>
                <span className="text-xs text-gray-400">
                    {saveStatus === "saving" && "Saving..."}
                    {saveStatus === "saved" && "✓ Saved"}
                    {saveStatus === "error" && "⚠ Error"}
                </span>
            </div>
            <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex-1 resize-none border-0 bg-transparent p-4 focus-visible:ring-0"
                placeholder="Add research notes, insights, or key information about this account..."
            />
        </div>
    );
};

export default LeadDetails;
