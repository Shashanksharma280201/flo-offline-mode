import React, { useState } from "react";
import { QCFormTemplate, QCTab } from "../types";
import { Layout } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from "@/components/ui/accordion";

interface QCOutlinePreviewProps {
    data: Partial<QCFormTemplate>;
}

const QCOutlinePreview: React.FC<QCOutlinePreviewProps> = ({ data }) => {
    const tabs = data.tabs || [];

    if (tabs.length === 0) {
        return (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-800/20 p-8 text-slate-500">
                <Layout className="mb-2 h-8 w-8 opacity-50" />
                <p>No structure to preview</p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-medium text-white">
                    <Layout className="h-4 w-4 text-emerald-500" />
                    Structural Preview
                </h3>
                <span className="text-xs text-slate-400">Read-only view</span>
            </div>

            <div className="flex-1 overflow-hidden p-4">
                <Tabs
                    defaultValue={tabs[0]?.tabId}
                    className="flex h-full flex-col"
                >
                    <TabsList className="mb-4 h-auto w-full justify-start overflow-x-auto bg-slate-900/50 p-1">
                        {tabs.map((tab) => (
                            <TabsTrigger
                                key={tab.tabId}
                                value={tab.tabId}
                                className="text-xs text-slate-400 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
                            >
                                {tab.tabName}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
                        {tabs.map((tab) => (
                            <TabsContent
                                key={tab.tabId}
                                value={tab.tabId}
                                className="mt-0 space-y-3"
                            >
                                <Accordion
                                    type="single"
                                    collapsible
                                    className="w-full space-y-2"
                                >
                                    {tab.categories.map((cat, idx) => (
                                        <AccordionItem
                                            key={idx}
                                            value={`item-${idx}`}
                                            className="rounded-md border border-slate-700 bg-slate-900/30 px-3"
                                        >
                                            <AccordionTrigger className="py-3 hover:no-underline">
                                                <div className="flex w-full items-center justify-between pr-4">
                                                    <h4 className="text-sm font-medium text-slate-200">
                                                        {cat.categoryName}
                                                    </h4>
                                                    <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300">
                                                        {cat.questions.length}{" "}
                                                        Checks
                                                    </span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="space-y-1.5 pt-2">
                                                    {(cat.questions || []).map(
                                                        (q) => (
                                                            <div
                                                                key={
                                                                    q.questionId
                                                                }
                                                                className="flex items-start justify-between gap-3 border-t border-slate-700/50 pt-1.5"
                                                            >
                                                                <div className="flex items-start gap-2 overflow-hidden text-ellipsis">
                                                                    <span className="mt-0.5 min-w-[18px] text-[10px] font-bold text-emerald-500">
                                                                        {
                                                                            q.questionId
                                                                        }
                                                                    </span>
                                                                    <p className="truncate text-[11px] text-slate-400">
                                                                        {
                                                                            q.questionText
                                                                        }
                                                                    </p>
                                                                </div>
                                                                <div className="flex flex-shrink-0 gap-1">
                                                                    {q.requiresText && (
                                                                        <span
                                                                            className="rounded bg-blue-500/10 px-1 py-0.5 text-[9px] text-blue-400"
                                                                            title="Requires Text Response"
                                                                        >
                                                                            TXT
                                                                        </span>
                                                                    )}
                                                                    {q.requiresImage && (
                                                                        <span
                                                                            className="rounded bg-emerald-500/10 px-1 py-0.5 text-[9px] text-emerald-400"
                                                                            title="Requires Image"
                                                                        >
                                                                            IMG
                                                                        </span>
                                                                    )}
                                                                    {q.required && (
                                                                        <span
                                                                            className="rounded bg-red-500/10 px-1 py-0.5 text-[9px] text-red-400"
                                                                            title="Mandatory Question"
                                                                        >
                                                                            *
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                                {tab.categories.length === 0 && (
                                    <p className="text-xs italic text-slate-500">
                                        No categories in this tab
                                    </p>
                                )}
                            </TabsContent>
                        ))}
                    </div>
                </Tabs>
            </div>
        </div>
    );
};

export default QCOutlinePreview;
