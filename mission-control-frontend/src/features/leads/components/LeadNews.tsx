import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

import { useParams } from "react-router-dom";
import axios from "axios";
import { getAuthHeader } from "@/features/auth/authService";
import { MdDone, MdError, MdRefresh } from "react-icons/md";
import { cn } from "@/lib/utils";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import dayjs from "dayjs";
import { useLeadsStore } from "@/stores/leadsStore";
import { useLead } from "@/hooks/useLead";
import { toast } from "react-toastify";

type ProgressType = {
    data?: any;
    status: "START" | "LOADING" | "SUCCESS" | "ERROR";
};

type FetchState = "idle" | "fetching" | "generating" | "complete" | "error";

const LeadNews = () => {
    const { id } = useParams();
    const selectedLead = useLeadsStore((state) => state.selectedLead);
    const fetchLeadsMutation = useLead();
    const divRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    // State management
    const [markdown, setMarkdown] = useState("");
    const [fetchState, setFetchState] = useState<FetchState>("idle");
    const [lastUpdate, setLastUpdate] = useState<number>();

    // Progress tracking for each step
    const [linkedInProgress, setLinkedInProgress] = useState<ProgressType>();
    const [webSearchProgress, setWebSearchProgress] = useState<ProgressType>();
    const [webCrawlProgress, setWebCrawlProgress] = useState<ProgressType>();
    const [aiResponseProgress, setAiResponseProgress] =
        useState<ProgressType>();

    // Clean up event source on unmount
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, []);

    // Initialize data from selected lead
    useEffect(() => {
        if (!selectedLead || !selectedLead.news) return;

        setMarkdown(selectedLead.news.summary || "");
        setLastUpdate(selectedLead.news.timestamp);
        setFetchState("complete");
    }, [selectedLead]);

    const resetState = () => {
        setMarkdown("");
        setLinkedInProgress(undefined);
        setWebSearchProgress(undefined);
        setWebCrawlProgress(undefined);
        setAiResponseProgress(undefined);
    };

    const fetchAiResponse = () => {
        if (!id) return;
        if (!selectedLead?.linkedinTag) {
            toast.error("Company does not have a linkedIn tag set");
            return;
        }

        // Reset states
        resetState();
        setFetchState("fetching");

        // Create EventSource for SSE
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        eventSourceRef.current = new EventSource(`/horus/${id}`);

        // Handle progress events
        eventSourceRef.current.addEventListener("progress", (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case "LINKEDIN":
                    setLinkedInProgress(data);
                    break;
                case "WEB_SEARCH_RESULT":
                    setWebSearchProgress(data);
                    break;
                case "WEB_CRAWL":
                    setWebCrawlProgress(data);
                    break;
                case "AI_RESPONSE":
                    if (data.status === "START") {
                        setFetchState("generating");
                    } else if (data.status === "SUCCESS") {
                        setFetchState("complete");
                        fetchLeadsMutation.mutate(id);

                        // Close the event source after completion
                        if (eventSourceRef.current) {
                            eventSourceRef.current.close();
                            eventSourceRef.current = null;
                        }
                    }
                    setAiResponseProgress(data);
                    break;
                default:
                    console.log("Unknown event type:", data);
            }
        });

        // Handle toast notifications
        eventSourceRef.current.addEventListener("toast", (event) => {
            const data = JSON.parse(event.data);

            if (data.type === "RATE_LIMITED" || data.type === "LEAD_ERROR") {
                // Restore previous state on rate limit
                setTimeout(() => {
                    setFetchState("complete");
                    setMarkdown(selectedLead?.news?.summary || "");
                }, 1000);
            }

            toast.error(data.message);
        });

        // Handle AI response chunks
        eventSourceRef.current.addEventListener("ai_response", (event) => {
            const data = event.data;
            setMarkdown((prev) => prev + data);
        });

        // Handle EventSource errors
        eventSourceRef.current.onerror = (error) => {
            setTimeout(() => {
                setFetchState("error");
                setMarkdown(selectedLead?.news?.summary || "");
            }, 1000);
            toast.error("Error fetching AI response");
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    };

    const renderContent = () => {
        if ((fetchState === "idle" || fetchState === "error") && !markdown) {
            return (
                <div className="flex h-full w-full items-center justify-center">
                    <button
                        onClick={fetchAiResponse}
                        className="text-white hover:text-white/80"
                    >
                        Fetch recent news
                    </button>
                </div>
            );
        }

        if (fetchState === "fetching") {
            return (
                <div className="flex w-full flex-col gap-2">
                    {linkedInProgress && (
                        <ProgressIndicator
                            text="Fetching Posts from LinkedIn"
                            status={linkedInProgress.status}
                        />
                    )}
                    {webSearchProgress && (
                        <ProgressIndicator
                            text="Searching the web..."
                            status={webSearchProgress.status}
                        />
                    )}
                    {webCrawlProgress && (
                        <ProgressIndicator
                            text={
                                webCrawlProgress.data
                                    ? `Analyzing web results ${webCrawlProgress.data.progress} / ${webCrawlProgress.data.total}`
                                    : "Analyzing web results..."
                            }
                            status={webCrawlProgress.status}
                        />
                    )}

                    {!markdown.length &&
                        !webCrawlProgress &&
                        !webSearchProgress &&
                        !linkedInProgress && <RandomizedSkeletonLoader />}
                </div>
            );
        }

        if (
            fetchState === "generating" &&
            aiResponseProgress?.status === "START" &&
            !markdown.length
        ) {
            return <RandomizedSkeletonLoader />;
        }
    };

    return (
        <div
            ref={divRef}
            className="max-h-[37.7rem] w-full overflow-y-auto rounded-md border border-border p-4 md:h-full"
        >
            {(fetchState === "complete" || fetchState === "error") &&
                markdown && (
                    <div className="mb-4 flex items-center justify-between">
                        <p className="text-neutral-400">
                            {lastUpdate
                                ? `As of ${dayjs(lastUpdate).format("h:mm a, Do MMM YYYY")}`
                                : null}
                        </p>
                        <button
                            onClick={fetchAiResponse}
                            className="transition-opacity hover:opacity-80"
                        >
                            <MdRefresh size={24} className="text-white" />
                        </button>
                    </div>
                )}

            {renderContent()}
            <div className="prose prose-headings:text-neutral-200 prose-p:text-neutral-200 prose-strong:text-neutral-200 prose-li:text-neutral-200">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                >
                    {markdown}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default LeadNews;

const ProgressIndicator = ({
    text,
    status
}: {
    text: string;
    status: "START" | "LOADING" | "SUCCESS" | "ERROR";
}) => {
    return (
        <div className="flex w-full items-center gap-2 rounded-md bg-backgroundGray/30 p-4">
            <div className="h-5 w-5">
                {(status === "START" || status === "LOADING") && (
                    <LoadingSpinner className="h-4 w-4 animate-spin text-white" />
                )}
                {status === "SUCCESS" && (
                    <MdDone className="h-4 w-4 text-white" />
                )}
                {status === "ERROR" && (
                    <MdError className="h-4 w-4 text-red-500" />
                )}
            </div>
            <span className="text-sm text-white">{text}</span>
        </div>
    );
};

const LoadingSkeleton = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <div
            {...props}
            className={cn(
                "animate-pulse rounded-md bg-backgroundGray/50",
                className
            )}
        />
    );
};

const getRandomWidth = () => {
    const widths = ["w-1/2", "w-1/3", "w-1/4", "w-1/5", "w-2/3", "w-3/5"];
    return widths[Math.floor(Math.random() * widths.length)];
};

const RandomizedSkeletonLoader = () => {
    return (
        <div className="flex h-full flex-col gap-2">
            {[...Array(6)].map((_, rowIndex) => (
                <div key={rowIndex} className="flex gap-2">
                    {[...Array(2)].map((_, colIndex) => (
                        <LoadingSkeleton
                            key={colIndex}
                            className={`h-10 ${getRandomWidth()}`}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};
