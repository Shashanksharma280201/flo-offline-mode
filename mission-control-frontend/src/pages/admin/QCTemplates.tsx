import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
    getAllTemplates,
    cloneTemplate
} from "../../features/QC/services/qcTemplateService";
import { Button } from "@/components/ui/Button";
import { Plus, Copy, Edit, Loader2, CheckCircle2 } from "lucide-react";

// Helper component for badges
const Badge = ({
    children,
    variant = "default"
}: {
    children: React.ReactNode;
    variant?: "default" | "success" | "secondary";
}) => {
    const variants = {
        default: "bg-slate-700 text-slate-200",
        success:
            "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50",
        secondary: "bg-slate-600 text-slate-300"
    };

    return (
        <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]}`}
        >
            {children}
        </span>
    );
};

const QCTemplates: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [cloningId, setCloningId] = useState<string | null>(null);

    // Fetch templates
    const {
        data: templates,
        isLoading,
        error
    } = useQuery({
        queryKey: ["qcTemplates"],
        queryFn: () => getAllTemplates()
    });

    // Clone mutation
    const cloneMutation = useMutation({
        mutationFn: ({ id, version }: { id: string; version: string }) =>
            cloneTemplate(id, version),
        onSuccess: () => {
            queryClient.invalidateQueries(["qcTemplates"]);
            toast.success("Template cloned successfully");
            setCloningId(null);
        },
        onError: (err: any) => {
            toast.error(
                err.response?.data?.message || "Failed to clone template"
            );
            setCloningId(null);
        }
    });

    const handleClone = async (template: any) => {
        const nextVersion = prompt(
            "Enter new version number:",
            incrementVersion(template.version)
        );
        if (!nextVersion) return;

        setCloningId(template.id);
        cloneMutation.mutate({ id: template.id, version: nextVersion });
    };

    const incrementVersion = (v: string) => {
        const parts = v.split(".");
        if (parts.length > 0) {
            const last = parseInt(parts[parts.length - 1]);
            if (!isNaN(last)) {
                parts[parts.length - 1] = (last + 1).toString();
                return parts.join(".");
            }
        }
        return v + ".1";
    };

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-96 items-center justify-center text-red-400">
                Failed to load templates. Please try again.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-6 md:p-8">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            QC Templates
                        </h1>
                        <p className="mt-1 text-slate-400">
                            Manage Quality Control checklists and versions
                        </p>
                    </div>
                    <Button
                        onClick={() => navigate("/qc/new")}
                        className="bg-emerald-600 text-white hover:bg-emerald-500"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        New Template
                    </Button>
                </div>

                {/* Templates List */}
                <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
                    <table className="min-w-full divide-y divide-slate-700">
                        <thead className="bg-slate-900/50">
                            <tr>
                                <th
                                    scope="col"
                                    className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-400"
                                >
                                    Template Name
                                </th>
                                <th
                                    scope="col"
                                    className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-400"
                                >
                                    Version
                                </th>
                                <th
                                    scope="col"
                                    className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-400"
                                >
                                    Status
                                </th>
                                <th
                                    scope="col"
                                    className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-400"
                                >
                                    Questions
                                </th>
                                <th
                                    scope="col"
                                    className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-slate-400"
                                >
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700 bg-slate-800">
                            {templates?.map((template) => (
                                <tr
                                    key={template.id}
                                    className="transition-colors hover:bg-slate-700/30"
                                >
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <div className="font-medium text-white">
                                            {template.name}
                                        </div>
                                        {template.description && (
                                            <div className="max-w-xs truncate text-xs text-slate-400">
                                                {template.description}
                                            </div>
                                        )}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <span className="font-mono text-sm text-slate-300">
                                            v{template.version}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        {template.isActive ? (
                                            <Badge variant="success">
                                                <div className="flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Active
                                                </div>
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">
                                                Archived
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-300">
                                        {template.totalQuestions || 0}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    navigate(
                                                        `/qc/${template.id}/edit`
                                                    )
                                                }
                                                className="text-slate-400 hover:bg-slate-700 hover:text-white"
                                                title="Edit Template"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    handleClone(template)
                                                }
                                                disabled={
                                                    cloningId === template.id
                                                }
                                                className="text-slate-400 hover:bg-slate-700 hover:text-emerald-400"
                                                title="Clone to New Version"
                                            >
                                                {cloningId === template.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {templates?.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-6 py-12 text-center text-slate-500"
                                    >
                                        No QC templates found. Create one to get
                                        started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default QCTemplates;
