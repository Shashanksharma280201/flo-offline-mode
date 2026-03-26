import { useForm, Controller } from "react-hook-form";
import { Task } from "../../services/robotsService";
import { Button } from "@/components/ui/Button";
import Calendar from "@/components/ui/Calendar";
import React from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/Popover";
import { CalendarIcon } from "lucide-react";
import dayjs from "dayjs";

type TaskFormData = Partial<Task> & {
    comment?: string;
};

type TaskFormProps = {
    initialData?: Task;
    onSubmit: (data: Partial<Task>) => void;
    isLoading: boolean;
    onCancel: () => void;
};

const TaskForm = ({
    initialData,
    onSubmit,
    isLoading,
    onCancel
}: TaskFormProps) => {
    const {
        register,
        handleSubmit,
        control,
        watch,
        formState: { errors }
    } = useForm<TaskFormData>({
        defaultValues: initialData || {
            status: "Pending",
            priority: "Medium",
            category: "General",
            dueDate: undefined
        }
    });

    const [open, setOpen] = React.useState(false);
    const dueDate = watch("dueDate");

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-lg bg-slate-800/30 p-6">
            {/* Title */}
            <div>
                <label className="mb-2 block text-sm font-semibold text-gray-200">
                    Title <span className="text-red-400">*</span>
                </label>
                <input
                    type="text"
                    {...register("title", {
                        required: "Title is required",
                        maxLength: {
                            value: 200,
                            message: "Title must be less than 200 characters"
                        }
                    })}
                    className="w-full rounded-md border border-gray-600 bg-slate-900/70 px-4 py-2.5 text-white placeholder-gray-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Enter task title"
                />
                {errors.title && (
                    <p className="mt-1.5 text-sm text-red-400">
                        {errors.title.message}
                    </p>
                )}
            </div>

            {/* Description */}
            <div>
                <label className="mb-2 block text-sm font-semibold text-gray-200">
                    Description
                </label>
                <textarea
                    {...register("description", {
                        maxLength: {
                            value: 2000,
                            message:
                                "Description must be less than 2000 characters"
                        }
                    })}
                    rows={4}
                    className="w-full rounded-md border border-gray-600 bg-slate-900/70 px-4 py-2.5 text-white placeholder-gray-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Enter task description (optional)"
                />
                {errors.description && (
                    <p className="mt-1.5 text-sm text-red-400">
                        {errors.description.message}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Status */}
                <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-200">
                        Status <span className="text-red-400">*</span>
                    </label>
                    <select
                        {...register("status", {
                            required: "Status is required"
                        })}
                        className="w-full rounded-md border border-gray-600 bg-slate-900/70 px-4 py-2.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                    {errors.status && (
                        <p className="mt-1.5 text-sm text-red-400">
                            {errors.status.message}
                        </p>
                    )}
                </div>

                {/* Priority */}
                <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-200">
                        Priority <span className="text-red-400">*</span>
                    </label>
                    <select
                        {...register("priority", {
                            required: "Priority is required"
                        })}
                        className="w-full rounded-md border border-gray-600 bg-slate-900/70 px-4 py-2.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                    </select>
                    {errors.priority && (
                        <p className="mt-1.5 text-sm text-red-400">
                            {errors.priority.message}
                        </p>
                    )}
                </div>

                {/* Category */}
                <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-200">
                        Category <span className="text-red-400">*</span>
                    </label>
                    <select
                        {...register("category", {
                            required: "Category is required"
                        })}
                        className="w-full rounded-md border border-gray-600 bg-slate-900/70 px-4 py-2.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="General">General</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Motor">Motor</option>
                        <option value="Issue">Issue</option>
                        <option value="Maintenance">Maintenance</option>
                    </select>
                    {errors.category && (
                        <p className="mt-1.5 text-sm text-red-400">
                            {errors.category.message}
                        </p>
                    )}
                </div>
            </div>

            {/* Due Date */}
            <div>
                <label className="mb-2 block text-sm font-semibold text-gray-200">
                    Due Date
                </label>
                <Controller
                    name="dueDate"
                    control={control}
                    render={({ field }) => (
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className={`w-full justify-start gap-3 rounded-md border border-gray-700 bg-slate-900/50 px-4 py-2 text-left font-normal text-white hover:bg-slate-800 hover:text-white ${
                                        !field.value && "text-gray-400"
                                    }`}
                                >
                                    <CalendarIcon className="h-5 w-5" />
                                    {field.value
                                        ? dayjs(field.value).format("MMM DD, YYYY")
                                        : "Select a due date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-auto border-gray-700 bg-slate-900 p-0"
                                align="start"
                            >
                                <Calendar
                                    mode="single"
                                    selected={
                                        field.value
                                            ? new Date(field.value)
                                            : undefined
                                    }
                                    onSelect={(date) => {
                                        field.onChange(date);
                                        setOpen(false);
                                    }}
                                    disabled={(date) =>
                                        date < new Date(new Date().setHours(0, 0, 0, 0))
                                    }
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    )}
                />
                {errors.dueDate && (
                    <p className="mt-1 text-sm text-red-400">
                        {errors.dueDate.message}
                    </p>
                )}
            </div>

            {/* Comment (for updates) */}
            {initialData && (
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
                    <label className="mb-2 block text-sm font-semibold text-gray-200">
                        Comment (optional)
                    </label>
                    <textarea
                        {...register("comment")}
                        rows={3}
                        className="w-full rounded-md border border-gray-600 bg-slate-900/70 px-4 py-2.5 text-white placeholder-gray-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Add a comment about this update..."
                    />
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 border-t border-gray-700 pt-6">
                <Button
                    type="button"
                    onClick={onCancel}
                    className="rounded-md border border-gray-600 bg-transparent px-6 py-2.5 text-white transition-all hover:bg-gray-700/50"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isLoading}
                    className="rounded-md bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-2.5 font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-500 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                    {isLoading ? (
                        <span className="flex items-center gap-2">
                            <svg
                                className="h-5 w-5 animate-spin"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                            Saving...
                        </span>
                    ) : initialData ? (
                        "Update Task"
                    ) : (
                        "Create Task"
                    )}
                </Button>
            </div>
        </form>
    );
};

export default TaskForm;
