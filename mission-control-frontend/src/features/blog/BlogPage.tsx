import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fetchPostsFn, deletePostFn } from "./services/blogService";
import { BlogPost } from "./types";
import Header from "@/components/header/Header";
import { Button } from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { toast } from "react-toastify";
import { errorLogger } from "@/util/errorLogger";

const BlogPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery(["blog-posts", page], () =>
        fetchPostsFn(undefined, page)
    );

    const deleteMutation = useMutation(deletePostFn, {
        onSuccess: () => {
            queryClient.invalidateQueries("blog-posts");
            toast.success("Post deleted");
        },
        onError: errorLogger
    });

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this post?")) {
            deleteMutation.mutate(id);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-950">
                <LoadingSpinner className="h-8 w-8 text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-slate-950">
            <Header title="Blog Posts">
                <Button
                    onClick={() => navigate("/blog/new")}
                    className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500"
                >
                    <Plus className="h-4 w-4" />
                    New Post
                </Button>
            </Header>

            <div className="mx-auto w-full max-w-7xl flex-1 p-6">
                <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-900">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="border-b border-white/10 bg-white/5 text-xs font-medium uppercase text-slate-300">
                            <tr>
                                <th className="px-6 py-4">Title</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Author</th>
                                <th className="px-6 py-4">Created</th>
                                <th className="px-6 py-4 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {data?.posts?.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-6 py-8 text-center"
                                    >
                                        No posts found.
                                    </td>
                                </tr>
                            ) : (
                                data?.posts?.map((post: BlogPost) => (
                                    <BlogPostRow
                                        key={post._id}
                                        post={post}
                                        onDelete={handleDelete}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const BlogPostRow = ({
    post,
    onDelete
}: {
    post: BlogPost;
    onDelete: (id: string) => void;
}) => {
    const navigate = useNavigate();

    return (
        <tr className="group transition-colors hover:bg-white/5">
            <td className="px-6 py-4">
                <Link
                    to={`/blog/${post._id}`}
                    className="font-semibold text-white transition-colors group-hover:text-emerald-400"
                >
                    {post.title}
                </Link>
                <div className="mt-1 text-xs text-slate-500">/{post.slug}</div>
            </td>
            <td className="px-6 py-4">
                <span
                    className={`rounded-full border px-2 py-1 text-xs font-medium ${
                        post.status === "published"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : "border-slate-700 bg-slate-700/50 text-slate-400"
                    }`}
                >
                    {post.status.toUpperCase()}
                </span>
            </td>
            <td className="px-6 py-4">{post.author?.name || "Unknown"}</td>
            <td className="px-6 py-4">
                {format(new Date(post.createdAt), "MMM d, yyyy")}
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-white"
                        onClick={() => navigate(`/blog/${post._id}`)}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:bg-red-900/30 hover:text-red-400"
                        onClick={() => onDelete(post._id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </td>
        </tr>
    );
};

export default BlogPage;
