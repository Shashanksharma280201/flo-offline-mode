import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { ArrowLeft, Settings, Image as ImageIcon, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import {
    fetchPostFn,
    updatePostFn,
    createPostFn,
    uploadMediaFn
} from "./services/blogService";
import { BlogPost, BlogPayload } from "./types";
import BlogEditor from "./components/BlogEditor";
import BlogSettings from "./components/BlogSettings";
import { Button } from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { errorLogger } from "@/util/errorLogger";
import { cn } from "@/lib/utils";

const BlogEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const isNew = id === "new";
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [postData, setPostData] = useState<Partial<BlogPayload> | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isDirty, setIsDirty] = useState(isNew);
    const titleRef = useRef<HTMLTextAreaElement>(null);

    // Auto-expand title textarea
    useEffect(() => {
        if (titleRef.current) {
            titleRef.current.style.height = "auto";
            titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
        }
    }, [postData?.title]);

    // Fetch Post
    const { data: fetchedPost, isLoading } = useQuery(
        ["blog-post", id],
        () => fetchPostFn(id!),
        {
            enabled: !isNew && !!id,
            onError: (err) => {
                errorLogger(err);
                navigate("/blog");
            }
        }
    );

    // Sync fetched data or initialize new post
    useEffect(() => {
        if (isNew) {
            setPostData({
                status: "draft",
                content: "",
                title: "",
                excerpt: "New draft post",
                coverImage: "https://placehold.co/600x400",
                author: {
                    name: "Flo Team"
                }
            });
            setIsDirty(true);
        } else if (fetchedPost) {
            setPostData(fetchedPost);
            setIsDirty(false);
        }
    }, [fetchedPost, isNew, id]);

    // Create Mutation
    const createMutation = useMutation(createPostFn, {
        onSuccess: (newPost) => {
            toast.success("Draft created");
            setIsDirty(false);
            navigate(`/blog/${newPost._id}`, { replace: true });
        },
        onError: errorLogger
    });

    // Save Mutation
    const updateMutation = useMutation(
        (data: BlogPayload) => updatePostFn(id!, data),
        {
            onSuccess: (data) => {
                queryClient.setQueryData(["blog-post", id], data);
                setIsDirty(false);
                toast.success("Saved successfully");
            },
            onError: errorLogger
        }
    );

    const handleUpdate = useCallback((updates: Partial<BlogPayload>) => {
        setPostData((prev) => (prev ? { ...prev, ...updates } : updates));
        setIsDirty(true);
    }, []);

    const handleSave = useCallback(() => {
        if (!postData || !postData.title?.trim()) {
            toast.error("Title is required");
            return;
        }

        // Prepare payload according to backend spec
        const payload: BlogPayload = {
            title: postData.title,
            content: postData.content || "",
            status: postData.status,
            excerpt: postData.excerpt,
            coverImage: postData.coverImage,
            tags: postData.tags,
            author: postData.author,
            seo: postData.seo,
            slug: postData.slug
        };

        if (isNew) {
            createMutation.mutate(payload);
        } else {
            updateMutation.mutate(payload);
        }
    }, [postData, isNew, createMutation, updateMutation]);

    // Prompt on leave if dirty
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () =>
            window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    if (!postData || (isLoading && !isNew)) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <LoadingSpinner className="h-8 w-8 text-emerald-500" />
            </div>
        );
    }

    const isSaving = createMutation.isLoading || updateMutation.isLoading;
    const canSave = isDirty && postData.title?.trim() && !isSaving;

    const handleCoverUpload = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const toastId = toast.loading("Uploading cover image...");
            try {
                const { url } = await uploadMediaFn(file);
                handleUpdate({ coverImage: url });
                toast.update(toastId, {
                    render: "Cover image updated",
                    type: "success",
                    isLoading: false,
                    autoClose: 2000
                });
            } catch (error) {
                toast.update(toastId, {
                    render: "Failed to upload",
                    type: "error",
                    isLoading: false,
                    autoClose: 3000
                });
            }
        }
    };

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-slate-950 text-white">
            <BlogEditHeader
                isDirty={isDirty}
                isSaving={isSaving}
                canSave={!!canSave}
                onBack={() => navigate("/blog")}
                onSettings={() => setIsSettingsOpen(true)}
                onSave={handleSave}
                isNew={isNew}
            />

            {/* Main Editor Area */}
            <div className="relative flex-1 overflow-y-auto scroll-smooth">
                <div className="mx-auto max-w-4xl px-8 py-16">
                    {/* Title Area */}
                    <div className="mb-10">
                        <textarea
                            ref={titleRef}
                            value={postData.title || ""}
                            onChange={(e) =>
                                handleUpdate({ title: e.target.value })
                            }
                            placeholder="Post Title"
                            rows={1}
                            className="w-full resize-none overflow-hidden bg-transparent text-4xl font-extrabold text-white outline-none placeholder:text-white/10 sm:text-5xl"
                        />
                        <div className="mt-6 flex items-center gap-4 text-sm">
                            <span
                                className={cn(
                                    "rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                    {
                                        "border-emerald-500/20 bg-emerald-500/10 text-emerald-500":
                                            postData.status === "published",
                                        "border-orange-500/20 bg-orange-500/10 text-orange-500":
                                            postData.status === "draft",
                                        "border-slate-500/20 bg-slate-500/10 text-slate-500":
                                            postData.status === "archived"
                                    }
                                )}
                            >
                                {postData.status}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="font-medium text-slate-400">
                                {postData.author?.name || "No Author"}
                            </span>
                        </div>
                    </div>

                    {/* Cover Image Area */}
                    <div className="mb-12">
                        {postData.coverImage ? (
                            <div className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-white/5">
                                <img
                                    src={postData.coverImage}
                                    alt="Cover"
                                    className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() =>
                                            handleUpdate({ coverImage: "" })
                                        }
                                        className="gap-2"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Remove Cover
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <label className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/5 bg-white/[0.02] transition-colors hover:border-white/10 hover:bg-white/[0.04]">
                                <ImageIcon className="mb-2 h-8 w-8 text-slate-600" />
                                <span className="text-sm font-medium text-slate-500">
                                    Add a cover image
                                </span>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleCoverUpload}
                                />
                            </label>
                        )}
                    </div>

                    {/* Editor */}
                    <BlogEditor
                        key={id || "new"}
                        content={postData.content || ""}
                        onChange={(html) => handleUpdate({ content: html })}
                    />
                </div>
            </div>

            {/* Settings Sidebar */}
            <BlogSettings
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                post={postData}
                onChange={handleUpdate}
            />

            {/* Overlay for Sidebar */}
            {isSettingsOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    onClick={() => setIsSettingsOpen(false)}
                />
            )}
        </div>
    );
};

const BlogEditHeader = ({
    isDirty,
    isSaving,
    canSave,
    onBack,
    onSettings,
    onSave,
    isNew
}: {
    isDirty: boolean;
    isSaving: boolean;
    canSave: boolean;
    onBack: () => void;
    onSettings: () => void;
    onSave: () => void;
    isNew: boolean;
}) => {
    return (
        <header className="z-20 flex items-center justify-between border-b border-white/5 bg-slate-950 px-6 py-3">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onBack}
                    className="h-8 w-8 text-slate-500 hover:bg-white/5 hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-300">
                        {isNew ? "New Draft" : "Editor"}
                    </span>
                    <span className="h-4 w-[1px] bg-white/10" />
                    <span className="text-xs text-slate-500">
                        {isSaving ? (
                            <span className="animate-pulse">Saving...</span>
                        ) : isDirty ? (
                            "Unsaved changes"
                        ) : (
                            "Saved"
                        )}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSettings}
                    className="h-9 gap-2 text-slate-400 hover:bg-white/5 hover:text-white"
                >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                </Button>
                <Button
                    onClick={onSave}
                    disabled={!canSave}
                    size="sm"
                    className="h-9 min-w-[80px] bg-emerald-600 px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-500 disabled:opacity-30"
                >
                    {isSaving ? (
                        <LoadingSpinner className="h-3 w-3 text-white" />
                    ) : isNew ? (
                        "Create"
                    ) : (
                        "Update"
                    )}
                </Button>
            </div>
        </header>
    );
};

export default BlogEditPage;
