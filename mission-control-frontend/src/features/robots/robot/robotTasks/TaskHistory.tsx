import { Task, TaskHistoryEntry } from "../../services/robotsService";

type TaskHistoryProps = {
    task: Task;
};

const TaskHistory = ({ task }: TaskHistoryProps) => {
    const sortedHistory = [...(task.history || [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    };

    const getFieldLabel = (field: string) => {
        const labels: { [key: string]: string } = {
            title: "Title",
            description: "Description",
            status: "Status",
            priority: "Priority",
            category: "Category",
            dueDate: "Due Date",
            assignedTo: "Assigned To",
            created: "Created"
        };
        return labels[field] || field;
    };

    return (
        <div className="space-y-4">
            {/* Task Summary */}
            <div className="rounded-lg bg-slate-800/45 p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-400">Status:</span>{" "}
                        <span className="font-medium">{task.status}</span>
                    </div>
                    <div>
                        <span className="text-gray-400">Priority:</span>{" "}
                        <span className="font-medium">{task.priority}</span>
                    </div>
                    <div>
                        <span className="text-gray-400">Category:</span>{" "}
                        <span className="font-medium">{task.category}</span>
                    </div>
                    <div>
                        <span className="text-gray-400">Created:</span>{" "}
                        <span className="font-medium">
                            {new Date(task.createdDate).toLocaleDateString()}
                        </span>
                    </div>
                    {task.dueDate && (
                        <div>
                            <span className="text-gray-400">Due Date:</span>{" "}
                            <span className="font-medium">
                                {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                        </div>
                    )}
                    {task.completedDate && (
                        <div>
                            <span className="text-gray-400">Completed:</span>{" "}
                            <span className="font-medium">
                                {new Date(task.completedDate).toLocaleDateString()}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* History Timeline */}
            <div>
                <h4 className="mb-4 text-sm font-semibold text-gray-300">Change History</h4>
                {sortedHistory.length > 0 ? (
                    <div className="space-y-3">
                        {sortedHistory.map((entry: TaskHistoryEntry, index: number) => (
                            <div
                                key={index}
                                className="relative rounded-lg bg-slate-800/45 p-4 pl-8"
                            >
                                {/* Timeline dot */}
                                <div className="absolute left-2 top-6 h-2 w-2 rounded-full bg-blue-500"></div>
                                {index < sortedHistory.length - 1 && (
                                    <div className="absolute left-2.5 top-8 bottom-0 w-0.5 bg-gray-700"></div>
                                )}

                                <div className="space-y-2">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="font-medium text-sm">
                                                {getFieldLabel(entry.field)}
                                                {entry.field !== "created" && " Changed"}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {formatDate(entry.date)}
                                                {entry.changedBy && (
                                                    <span className="ml-2">
                                                        by{" "}
                                                        {typeof entry.changedBy === "string"
                                                            ? entry.changedBy
                                                            : (entry.changedBy as any).name ||
                                                              (entry.changedBy as any).email}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {entry.field !== "created" && (
                                        <div className="flex items-center gap-2 text-sm">
                                            {entry.oldValue && (
                                                <>
                                                    <span className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-400">
                                                        {entry.oldValue}
                                                    </span>
                                                    <span className="text-gray-500">→</span>
                                                </>
                                            )}
                                            {entry.newValue && (
                                                <span className="rounded bg-green-500/20 px-2 py-1 text-xs text-green-400">
                                                    {entry.newValue}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {entry.comment && (
                                        <div className="mt-2 rounded bg-slate-700/50 p-2 text-sm text-gray-300">
                                            <span className="text-xs text-gray-400">Comment:</span>{" "}
                                            {entry.comment}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-lg bg-slate-800/45 p-6 text-center text-sm text-gray-400">
                        No history available for this task
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskHistory;
