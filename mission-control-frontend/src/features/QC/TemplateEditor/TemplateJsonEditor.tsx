import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { toast } from "react-toastify";
import {
    createTemplate,
    updateTemplate,
    getTemplateById
} from "@/features/QC/services/qcTemplateService";
import { QCFormTemplate } from "../types";
import { normalizeTemplate } from "../utils/normalization";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import {
    Save,
    ArrowLeft,
    Code,
    RefreshCw,
    ChevronDown,
    ChevronRight,
    FileJson
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

import QCFileDropzone from "./QCFileDropzone";
import QCImportSummary from "./QCImportSummary";
import QCOutlinePreview from "./QCOutlinePreview";

const TemplateJsonEditor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const isEditing = !!id && id !== "new";
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Form State
    const [name, setName] = useState("");
    const [version, setVersion] = useState("1.0");
    const [templateData, setTemplateData] =
        useState<Partial<QCFormTemplate> | null>(null);
    const [importedFileName, setImportedFileName] = useState<string | null>(
        null
    );

    // UI State
    const [showRawJson, setShowRawJson] = useState(false);
    const [rawJsonContent, setRawJsonContent] = useState("");
    const [jsonError, setJsonError] = useState<string | null>(null);

    // Fetch existing template if editing
    const { isLoading: isLoadingTemplate } = useQuery({
        queryKey: ["qcTemplate", id],
        queryFn: () => getTemplateById(id!),
        enabled: isEditing,
        onSuccess: (data) => {
            setName(data.name);
            setVersion(data.version);

            // Extract structure
            const {
                name: _n,
                version: _v,
                _id,
                createdAt,
                updatedAt,
                __v,
                createdBy,
                totalQuestions,
                isActive,
                ...structure
            } = data as any;

            setTemplateData(structure);
            setRawJsonContent(JSON.stringify(structure, null, 2));
            setImportedFileName("Existing Template");
        },
        onError: () => {
            toast.error("Failed to load template");
            navigate("/qc");
        }
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: createTemplate,
        onSuccess: () => {
            queryClient.invalidateQueries(["qcTemplates"]);
            toast.success("QC Template created successfully");
            navigate("/qc");
        },
        onError: (err: any) => {
            toast.error(
                err.response?.data?.message || "Failed to create template"
            );
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => updateTemplate(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries(["qcTemplates"]);
            toast.success("QC Template updated successfully");
            navigate("/qc");
        },
        onError: (err: any) => {
            toast.error(
                err.response?.data?.message || "Failed to update template"
            );
        }
    });

    // Handlers
    const handleImport = (
        importedData: Partial<QCFormTemplate>,
        fileName: string
    ) => {
        // Normalize the imported data
        const normalizedData = normalizeTemplate(importedData);

        // If imported data has name/version, use them
        if (normalizedData.name) setName(normalizedData.name);
        if (normalizedData.version) setVersion(normalizedData.version);

        // Clean up data for structure
        const { name: _n, version: _v, ...structure } = normalizedData;

        setTemplateData(structure);
        setRawJsonContent(JSON.stringify(structure, null, 2));
        setImportedFileName(fileName);
        setJsonError(null);
    };

    const handleReset = () => {
        if (
            window.confirm(
                "Are you sure you want to clear the current template and start over?"
            )
        ) {
            setTemplateData(null);
            setImportedFileName(null);
            setName("");
            setVersion("1.0");
            setRawJsonContent("");
            setJsonError(null);
        }
    };

    const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setRawJsonContent(val);

        try {
            const parsed = JSON.parse(val);
            const normalized = normalizeTemplate(parsed);
            setTemplateData(normalized);
            setJsonError(null);
        } catch (err: any) {
            setJsonError(err.message);
        }
    };

    const handleSave = () => {
        if (!name.trim()) return toast.error("QC Template Name is required");
        if (!version.trim()) return toast.error("Version Tag is required");
        if (!templateData) return toast.error("No template data to save");
        if (jsonError) return toast.error("Invalid JSON in raw editor");

        // Validate structure
        if (
            !templateData.tabs ||
            !Array.isArray(templateData.tabs) ||
            templateData.tabs.length === 0
        ) {
            return toast.error("Template must have at least one tab.");
        }

        const payload: any = {
            name,
            version,
            ...templateData
        };

        if (isEditing) {
            updateMutation.mutate(payload);
        } else {
            createMutation.mutate(payload);
        }
    };

    const isSaving = createMutation.isLoading || updateMutation.isLoading;

    if (isLoadingTemplate) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                <LoadingSpinner className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-6 md:p-8">
            <div className="mx-auto flex h-full max-w-7xl flex-col">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/qc")}
                            className="text-slate-400 hover:bg-slate-800 hover:text-white"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-white">
                                {isEditing
                                    ? "Edit QC Template"
                                    : "New QC Template"}
                            </h1>
                            <p className="text-sm text-slate-400">
                                {isEditing
                                    ? `Updating version ${version}`
                                    : "Import and configure a new checklist"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleSave}
                            disabled={
                                isSaving ||
                                !templateData ||
                                !!jsonError ||
                                !name.trim() ||
                                !version.trim()
                            }
                            className="min-w-[140px] bg-emerald-600 text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSaving ? (
                                "Saving..."
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save QC Template
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Content Area */}
                {!templateData ? (
                    // Empty State: Ingestion
                    <div className="flex flex-1 flex-col">
                        {/* Optional Metadata inputs even before file load? Maybe not needed until loaded. 
                             Let's show them to allow pre-filling name */}
                        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                            {/* You can hide these if you want a purely clean dropzone, 
                                 but user might want to set name first. Keeping it simple. */}
                        </div>

                        <div className="flex min-h-[400px] flex-1 flex-col justify-center">
                            <QCFileDropzone onImport={handleImport} />
                        </div>
                    </div>
                ) : (
                    // Loaded State: Workspace
                    <div className="space-y-6 duration-500 animate-in fade-in slide-in-from-bottom-4">
                        {/* Top Metadata Row */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                            <div className="space-y-2 md:col-span-8">
                                <Label
                                    htmlFor="name"
                                    className="text-slate-300"
                                >
                                    QC Template Name{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. MMR Weeder Standard QC"
                                    className="border-slate-700 bg-slate-800 text-white focus:border-emerald-500"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-4">
                                <Label
                                    htmlFor="version"
                                    className="text-slate-300"
                                >
                                    Version Tag{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="version"
                                    value={version}
                                    onChange={(e) => setVersion(e.target.value)}
                                    placeholder="1.0"
                                    className="border-slate-700 bg-slate-800 text-white focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Main Grid */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                            {/* Left Col: Summary */}
                            <div className="space-y-6 lg:col-span-1">
                                <QCImportSummary
                                    data={templateData}
                                    fileName={
                                        importedFileName || "Unknown Source"
                                    }
                                    onReset={handleReset}
                                />

                                <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 shadow-sm">
                                    <h4 className="mb-2 text-sm font-medium text-slate-300">
                                        Ingestion Help
                                    </h4>
                                    <p className="mb-3 text-xs text-slate-400">
                                        Review the structure on the right. If
                                        something looks wrong, check your Excel
                                        file formatting or edit the raw JSON
                                        below.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                                        onClick={() =>
                                            setShowRawJson(!showRawJson)
                                        }
                                    >
                                        <Code className="mr-2 h-3 w-3" />
                                        {showRawJson
                                            ? "Hide Raw Data"
                                            : "Advanced: Edit Raw JSON"}
                                    </Button>
                                </div>
                            </div>

                            {/* Right Col: Preview */}
                            <div className="min-h-[400px] lg:col-span-2">
                                <QCOutlinePreview data={templateData} />
                            </div>
                        </div>

                        {/* Advanced JSON Editor (Collapsible) */}
                        {showRawJson && (
                            <div className="mt-6 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl animate-in slide-in-from-top-2">
                                <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-2">
                                    <div className="flex items-center gap-2">
                                        <FileJson className="h-4 w-4 text-blue-400" />
                                        <span className="font-mono text-xs text-slate-300">
                                            raw_source.json
                                        </span>
                                    </div>
                                    {jsonError && (
                                        <span className="rounded border border-red-900/50 bg-red-900/20 px-2 py-0.5 text-xs text-red-400">
                                            {jsonError}
                                        </span>
                                    )}
                                </div>
                                <textarea
                                    value={rawJsonContent}
                                    onChange={handleJsonChange}
                                    className="h-96 w-full resize-y bg-slate-950 p-4 font-mono text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                    spellCheck={false}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TemplateJsonEditor;
