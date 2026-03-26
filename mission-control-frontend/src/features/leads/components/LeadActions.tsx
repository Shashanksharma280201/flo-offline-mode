import { cn } from "@/lib/utils";
import { useState } from "react";
import { NextStepsTabContent } from "./NextStepsTabContent";
import { ResponseTabContent } from "./ResponseTabContent";
import { ClosingPlanTabContent } from "./ClosingPlanTabContent";
import { IoSparkles } from "react-icons/io5";
import LeadNews from "./LeadNews";

type LeadTabsType = "response" | "nextSteps" | "closePlan" | "news";

export const LeadActions = () => {
    const [currentTab, setCurrentTab] = useState<LeadTabsType>("response");

    return (
        <div className="flex h-full w-full flex-col gap-4">
            <LeadTabs currentTab={currentTab} setCurrentTab={setCurrentTab} />
            <div className="flex h-full w-full flex-col gap-4">
                {currentTab === "response" && <ResponseTabContent />}
                {currentTab === "nextSteps" && <NextStepsTabContent />}
                {currentTab === "closePlan" && <ClosingPlanTabContent />}
                {currentTab === "news" && <LeadNews />}
            </div>
        </div>
    );
};

const LeadTabs = ({
    currentTab,
    setCurrentTab
}: {
    currentTab: LeadTabsType;
    setCurrentTab: (tab: LeadTabsType) => void;
}) => {
    return (
        <div className="flex w-fit items-center self-center border-b border-border text-secondary md:self-start">
            <button
                onClick={() => setCurrentTab("response")}
                className="group relative px-4 py-2"
            >
                <span
                    className={cn(
                        "group-hover:text-white",
                        currentTab === "response" && "text-white"
                    )}
                >
                    Response
                </span>
                <span
                    className={cn(
                        "absolute -bottom-[1px] left-0 hidden h-[2px] w-full bg-white group-hover:block",
                        currentTab === "response" && "block"
                    )}
                />
            </button>
            <button
                onClick={() => setCurrentTab("nextSteps")}
                className="group relative px-4 py-2"
            >
                <span
                    className={cn(
                        "group-hover:text-white",
                        currentTab === "nextSteps" && "text-white"
                    )}
                >
                    Next Steps
                </span>
                <span
                    className={cn(
                        "absolute -bottom-[1px] left-0 hidden h-[2px] w-full bg-white group-hover:block",
                        currentTab === "nextSteps" && "block"
                    )}
                />
            </button>
            <button
                onClick={() => setCurrentTab("closePlan")}
                className="group relative px-4 py-2"
            >
                <span
                    className={cn(
                        "group-hover:text-white",
                        currentTab === "closePlan" && "text-white"
                    )}
                >
                    Closing plan
                </span>
                <span
                    className={cn(
                        "absolute -bottom-[1px] left-0 hidden h-[2px] w-full bg-white group-hover:block",
                        currentTab === "closePlan" && "block"
                    )}
                />
            </button>
            <button
                onClick={() => setCurrentTab("news")}
                className="group relative px-4 py-2"
            >
                <span
                    className={cn(
                        "group-hover:text-white",
                        currentTab === "news" && " text-white"
                    )}
                >
                    <IoSparkles
                        className={cn(
                            "absolute right-0 top-0 group-hover:animate-pulse group-hover:text-white",
                            currentTab === "news" && "animate-pulse"
                        )}
                    />
                    <span>News</span>
                </span>
                <span
                    className={cn(
                        "absolute -bottom-[1px] left-0 hidden h-[2px] w-full bg-white group-hover:block",
                        currentTab === "news" && "block"
                    )}
                />
            </button>
        </div>
    );
};
