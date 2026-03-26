import React, { useMemo } from "react";
import { QCFormTemplate } from "../types";
import {
    CheckCircle2,
    AlertTriangle,
    FileText,
    Layers,
    ListChecks
} from "lucide-react";

interface QCImportSummaryProps {
    data: Partial<QCFormTemplate>;
    fileName?: string;
    onReset: () => void;
}

const QCImportSummary: React.FC<QCImportSummaryProps> = ({
    data,
    fileName,
    onReset
}) => {
    const stats = useMemo(() => {
        const tabs = data.tabs || [];
        const tabCount = tabs.length;
        let categoryCount = 0;
        let questionCount = 0;
        let requiresImageCount = 0;
        let requiresTextCount = 0;

        tabs.forEach((tab) => {
            const cats = tab.categories || [];
            categoryCount += cats.length;
            cats.forEach((cat) => {
                const qs = cat.questions || [];
                questionCount += qs.length;
                qs.forEach((q) => {
                    if (q.requiresImage) requiresImageCount++;
                    if (q.requiresText) requiresTextCount++;
                });
            });
        });

        return {
            tabCount,
            categoryCount,
            questionCount,
            requiresImageCount,
            requiresTextCount
        };
    }, [data]);

    // Simple validation logic
    const issues: string[] = [];
    if (stats.tabCount === 0) issues.push("No tabs detected");
    if (stats.categoryCount === 0) issues.push("No categories detected");
    if (stats.questionCount === 0) issues.push("No questions detected");

    const isValid = issues.length === 0;

    return (
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-700 pb-4">
                <div className="flex items-center gap-3">
                    <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${isValid ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}
                    >
                        {isValid ? (
                            <CheckCircle2 className="h-5 w-5" />
                        ) : (
                            <AlertTriangle className="h-5 w-5" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-white">
                            Import Summary
                        </h3>
                        <p className="text-xs text-slate-400">
                            {fileName || "Imported Data"}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onReset}
                    className="text-xs font-medium text-red-400 hover:text-red-300 hover:underline"
                >
                    Remove File
                </button>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-slate-900/50 p-2">
                    <div className="text-lg font-bold text-white">
                        {stats.tabCount}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-500">
                        Tabs
                    </div>
                </div>
                <div className="rounded-md bg-slate-900/50 p-2">
                    <div className="text-lg font-bold text-white">
                        {stats.categoryCount}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-500">
                        Cats
                    </div>
                </div>
                <div className="rounded-md bg-slate-900/50 p-2">
                    <div className="text-lg font-bold text-white">
                        {stats.questionCount}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-500">
                        Checks
                    </div>
                </div>
            </div>

            <div className="mb-4 flex gap-4 text-center">
                <div className="flex-1 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2">
                    <div className="text-sm font-bold text-emerald-400">
                        {stats.requiresImageCount}
                    </div>
                    <div className="text-[9px] uppercase text-slate-500">
                        Req. Images
                    </div>
                </div>
                <div className="flex-1 rounded-md border border-blue-500/20 bg-blue-500/5 p-2">
                    <div className="text-sm font-bold text-blue-400">
                        {stats.requiresTextCount}
                    </div>
                    <div className="text-[9px] uppercase text-slate-500">
                        Req. Text
                    </div>
                </div>
            </div>

            <div
                className={`rounded border px-3 py-2 text-xs ${isValid ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" : "border-amber-500/20 bg-amber-500/5 text-amber-400"}`}
            >
                <span className="font-bold">
                    {isValid ? "Ready to Save" : "Attention Needed"}
                </span>
                {!isValid && (
                    <ul className="mt-1 list-disc pl-4 opacity-90">
                        {issues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                        ))}
                    </ul>
                )}
                {isValid && (
                    <span className="opacity-80"> - Structure looks good.</span>
                )}
            </div>
        </div>
    );
};

export default QCImportSummary;
