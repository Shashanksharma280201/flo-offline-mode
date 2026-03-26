import React, { useRef } from "react";
import { BlogPayload, BlogStatus } from "../types";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/Select";

interface BlogSettingsProps {
    post: Partial<BlogPayload>;
    onChange: (updates: Partial<BlogPayload>) => void;
    isOpen: boolean;
    onClose: () => void;
}

const BlogSettings: React.FC<BlogSettingsProps> = React.memo(
    ({ post, onChange, isOpen, onClose }) => {
        const [showSEO, setShowSEO] = React.useState(false);

        if (!isOpen) return null;

        const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const tagsString = e.target.value;
            const tags = tagsString
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
            onChange({ tags });
        };

        return (
            <>
                <style>
                    {`
                    @keyframes slideIn {
                        from { transform: translateX(100%); }
                        to { transform: translateX(0); }
                    }
                    .animate-sidebar {
                        animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    }
                    `}
                </style>
                <div className="animate-sidebar fixed inset-y-0 right-0 z-50 w-full transform overflow-y-auto border-l border-white/5 bg-slate-950 p-8 shadow-2xl sm:w-96">
                    <div className="mb-8 flex items-center justify-between">
                        <h2 className="text-lg font-bold tracking-tight text-white">
                            Post Settings
                        </h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-8 w-8 text-slate-500 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="space-y-8">
                        {/* Status & Author */}
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Status
                                </Label>
                                <Select
                                    value={post.status || "draft"}
                                    onValueChange={(value) =>
                                        onChange({
                                            status: value as BlogStatus
                                        })
                                    }
                                >
                                    <SelectTrigger className="border-white/5 bg-white/5 text-sm text-white focus:ring-0 focus:ring-offset-0">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent className="border-white/5 bg-slate-900 text-white">
                                        <SelectItem value="draft">
                                            Draft
                                        </SelectItem>
                                        <SelectItem value="published">
                                            Published
                                        </SelectItem>
                                        <SelectItem value="archived">
                                            Archived
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Author
                                </Label>
                                <Input
                                    value={post.author?.name || ""}
                                    onChange={(e) =>
                                        onChange({
                                            author: {
                                                ...post.author,
                                                name: e.target.value
                                            }
                                        })
                                    }
                                    placeholder="Name"
                                    className="border-white/5 bg-white/5 text-sm text-white focus:ring-0 focus:ring-offset-0"
                                />
                            </div>
                        </div>

                        {/* Excerpt */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Summary
                            </Label>
                            <textarea
                                className="min-h-[100px] w-full resize-none rounded-lg border border-white/5 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                value={post.excerpt || ""}
                                onChange={(e) =>
                                    onChange({ excerpt: e.target.value })
                                }
                                placeholder="Briefly describe this post..."
                            />
                        </div>

                        {/* Tags */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Tags
                            </Label>
                            <Input
                                value={post.tags?.join(", ") || ""}
                                onChange={handleTagsChange}
                                placeholder="e.g. tech, design"
                                className="border-white/5 bg-white/5 text-sm text-white focus:ring-0 focus:ring-offset-0"
                            />
                        </div>

                        {/* SEO Toggle */}
                        <div className="border-t border-white/5 pt-6">
                            <button
                                type="button"
                                onClick={() => setShowSEO(!showSEO)}
                                className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-white"
                            >
                                SEO Settings
                                <span className="text-lg">
                                    {showSEO ? "−" : "+"}
                                </span>
                            </button>

                            {showSEO && (
                                <div className="mt-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] text-slate-500">
                                            Meta Title
                                        </Label>
                                        <Input
                                            value={post.seo?.title || ""}
                                            onChange={(e) =>
                                                onChange({
                                                    seo: {
                                                        ...post.seo,
                                                        title: e.target.value
                                                    }
                                                })
                                            }
                                            className="h-8 border-white/5 bg-white/5 text-xs text-white focus:ring-0 focus:ring-offset-0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] text-slate-500">
                                            Meta Description
                                        </Label>
                                        <textarea
                                            className="h-20 w-full resize-none rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                            value={post.seo?.description || ""}
                                            onChange={(e) =>
                                                onChange({
                                                    seo: {
                                                        ...post.seo,
                                                        description:
                                                            e.target.value
                                                    }
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </>
        );
    }
);

export default BlogSettings;
