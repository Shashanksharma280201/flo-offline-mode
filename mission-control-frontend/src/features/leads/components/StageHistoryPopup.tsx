import Popup from "@/components/popup/Popup";
import { StageHistoryEntry } from "@/data/types";
import dayjs from "dayjs";
import { MdHistory, MdArrowForward } from "react-icons/md";

interface StageHistoryPopupProps {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    stageHistory: StageHistoryEntry[];
    leadName: string;
}

export const StageHistoryPopup = ({
    isOpen,
    setIsOpen,
    stageHistory,
    leadName
}: StageHistoryPopupProps) => {
    // Sort history by date (newest first)
    const sortedHistory = [...(stageHistory || [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return (
        <Popup
            title={`Stage History - ${leadName}`}
            description=""
            dialogToggle={isOpen}
            onClose={() => setIsOpen(false)}
            panelClassName="absolute overflow-visible rounded-none md:rounded-2xl bg-slate-900 top-0 left-0 md:static h-full w-full text-white md:w-[50vw] md:max-w-2xl"
        >
            <div className="flex flex-col gap-4">
                {sortedHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-8 text-gray-400">
                        <MdHistory className="h-12 w-12 opacity-50" />
                        <p>No stage history available</p>
                    </div>
                ) : (
                    <div className="relative flex flex-col gap-4">
                        {/* Timeline line */}
                        <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gray-700" />

                        {sortedHistory.map((entry, index) => (
                            <StageHistoryItem
                                key={index}
                                entry={entry}
                                isLatest={index === 0}
                            />
                        ))}
                    </div>
                )}

                <div className="mt-4 flex justify-end">
                    <button
                        onClick={() => setIsOpen(false)}
                        type="button"
                        className="rounded-md bg-slate-300 px-4 py-2 text-black hover:bg-slate-500 transition-colors delay-75"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Popup>
    );
};

interface StageHistoryItemProps {
    entry: StageHistoryEntry;
    isLatest: boolean;
}

const StageHistoryItem = ({ entry, isLatest }: StageHistoryItemProps) => {
    const formatStage = (stage?: number, pipelineStage?: string) => {
        if (stage !== undefined && pipelineStage) {
            return `Stage ${stage} (${pipelineStage})`;
        }
        if (stage !== undefined) {
            return `Stage ${stage}`;
        }
        if (pipelineStage) {
            return pipelineStage;
        }
        return "N/A";
    };

    const hasStageChange =
        entry.previousStage !== undefined ||
        entry.previousPipelineStage !== undefined;

    return (
        <div className="relative flex gap-4 pl-10">
            {/* Timeline dot */}
            <div
                className={`absolute left-0 top-1 z-10 h-8 w-8 rounded-full border-4 ${
                    isLatest
                        ? "border-green-500 bg-green-500"
                        : "border-blue-500 bg-blue-500"
                } flex items-center justify-center`}
            >
                {isLatest && (
                    <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 rounded-lg border border-border bg-backgroundGray/30 p-4">
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-gray-400">
                        {dayjs(entry.date).format("MMM D, YYYY h:mm A")}
                    </span>
                    {isLatest && (
                        <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-500">
                            Current
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-base">
                    {hasStageChange ? (
                        <>
                            <span className="whitespace-nowrap rounded-md bg-red-500/20 px-3 py-1 text-red-400">
                                {formatStage(
                                    entry.previousStage,
                                    entry.previousPipelineStage
                                )}
                            </span>
                            <MdArrowForward className="h-5 w-5 flex-shrink-0 text-gray-400" />
                            <span className="whitespace-nowrap rounded-md bg-green-500/20 px-3 py-1 text-green-400">
                                {formatStage(
                                    entry.newStage,
                                    entry.newPipelineStage
                                )}
                            </span>
                        </>
                    ) : (
                        <span className="rounded-md bg-blue-500/20 px-3 py-1 text-blue-400">
                            Initial: {formatStage(entry.newStage, entry.newPipelineStage)}
                        </span>
                    )}
                </div>

                {entry.changedBy && (
                    <div className="mt-2 text-sm text-gray-400">
                        Changed by: {entry.changedBy.name}
                    </div>
                )}
            </div>
        </div>
    );
};
