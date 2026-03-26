import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { toast } from "react-toastify";
import { RobotType } from "@/data/types";
import {
    getTasksFn,
    createTaskFn,
    updateTaskFn,
    deleteTaskFn,
    Task
} from "../../services/robotsService";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import TaskForm from "./TaskForm";
import TaskHistory from "./TaskHistory";

const RobotTasks = () => {
    const { robot } = useOutletContext<{ robot: RobotType }>();
    const queryClient = useQueryClient();
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [viewingHistory, setViewingHistory] = useState<Task | null>(null);
    const [filters, setFilters] = useState({
        status: "",
        category: "",
        priority: ""
    });

    // Fetch tasks
    const { data, isLoading, isError } = useQuery(
        ["tasks", robot.id, filters],
        () => getTasksFn(robot.id, filters),
        {
            staleTime: 2 * 60 * 1000 // Cache for 2 minutes
        }
    );

    // Create task mutation
    const createMutation = useMutation(
        (taskData: Partial<Task>) => createTaskFn(robot.id, taskData),
        {
            onSuccess: () => {
                toast.success("Task created successfully");
                queryClient.invalidateQueries(["tasks", robot.id]);
                setShowTaskForm(false);
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Failed to create task");
            }
        }
    );

    // Update task mutation
    const updateMutation = useMutation(
        ({ taskId, data }: { taskId: string; data: Partial<Task> }) =>
            updateTaskFn(robot.id, taskId, data),
        {
            onSuccess: () => {
                toast.success("Task updated successfully");
                queryClient.invalidateQueries(["tasks", robot.id]);
                setEditingTask(null);
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Failed to update task");
            }
        }
    );

    // Delete task mutation
    const deleteMutation = useMutation(
        (taskId: string) => deleteTaskFn(robot.id, taskId),
        {
            onSuccess: () => {
                toast.success("Task deleted successfully");
                queryClient.invalidateQueries(["tasks", robot.id]);
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Failed to delete task");
            }
        }
    );

    const handleCreateTask = (taskData: Partial<Task>) => {
        createMutation.mutate(taskData);
    };

    const handleUpdateTask = (taskData: Partial<Task>) => {
        if (editingTask?._id) {
            updateMutation.mutate({ taskId: editingTask._id, data: taskData });
        }
    };

    const handleDeleteTask = (taskId: string) => {
        if (confirm("Are you sure you want to delete this task?")) {
            deleteMutation.mutate(taskId);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Completed":
                return "bg-green-500/20 text-green-400";
            case "In Progress":
                return "bg-blue-500/20 text-blue-400";
            case "Cancelled":
                return "bg-red-500/20 text-red-400";
            default:
                return "bg-gray-500/20 text-gray-400";
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "Critical":
                return "bg-red-500/20 text-red-400";
            case "High":
                return "bg-orange-500/20 text-orange-400";
            case "Medium":
                return "bg-yellow-500/20 text-yellow-400";
            default:
                return "bg-gray-500/20 text-gray-400";
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-center text-background" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-6 text-red-400">Error loading tasks</div>
        );
    }

    return (
        <div className="flex flex-col w-full h-screen items-center rounded-lg bg-blue-900/25 p-6">
            <div className="mb-6 flex w-full items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Tasks</h2>
                    {/* <p className="mt-2 text-sm text-gray-400">
                        Manage tasks and track progress for {robot.name}
                    </p> */}
                </div>
                <Button
                    onClick={() => setShowTaskForm(true)}
                    className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                >
                    + New Task
                </Button>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-wrap w-3/4 gap-8 rounded-lg bg-gray-700/45 p-4">
                <div>
                    <label className="mb-1 block text-lg text-gray-400">Status</label>
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="rounded-md border border-gray-700 bg-slate-600/50 px-3 py-1.5 text-sm text-white outline-none focus:border-blue-500"
                    >
                        <option value="">All</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-lg text-gray-400">Category</label>
                    <select
                        value={filters.category}
                        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                        className="rounded-md border border-gray-700 bg-slate-600/50 px-3 py-1.5 text-sm text-white outline-none focus:border-blue-500"
                    >
                        <option value="">All</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Motor">Motor</option>
                        <option value="Issue">Issue</option>
                        <option value="General">General</option>
                        <option value="Maintenance">Maintenance</option>
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-lg text-gray-400">Priority</label>
                    <select
                        value={filters.priority}
                        onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                        className="rounded-md border border-gray-700 bg-slate-600/50 px-3 py-1.5 text-sm text-white outline-none focus:border-blue-500"
                    >
                        <option value="">All</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                    </select>
                </div>
            </div>

            {/* Task List */}
            <div className="flex flex-col w-3/4 space-y-4">
                {data?.tasks && data.tasks.length > 0 ? (
                    data.tasks.map((task: Task) => (
                        <div
                            key={task._id}
                            className="rounded-lg bg-gray-700/45 p-4 hover:bg-gray-700/60"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-semibold">{task.title}</h3>
                                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(task.status)}`}>
                                            {task.status}
                                        </span>
                                        <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(task.priority)}`}>
                                            {task.priority}
                                        </span>
                                        <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400">
                                            {task.category}
                                        </span>
                                    </div>
                                    {task.description && (
                                        <p className="text-sm text-gray-400 mb-2">{task.description}</p>
                                    )}
                                    <div className="flex gap-4 text-xs text-gray-500">
                                        {task.dueDate && (
                                            <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                                        )}
                                        <span>Created: {new Date(task.createdDate).toLocaleDateString()}</span>
                                        {task.completedDate && (
                                            <span>Completed: {new Date(task.completedDate).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setViewingHistory(task)}
                                        className="text-sm text-blue-400 hover:text-blue-300"
                                    >
                                        History
                                    </button>
                                    <button
                                        onClick={() => setEditingTask(task)}
                                        className="text-sm text-green-400 hover:text-green-300"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => task._id && handleDeleteTask(task._id)}
                                        className="text-sm text-red-400 hover:text-red-300"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="rounded-lg bg-slate-800/45 p-8 text-center text-gray-400">
                        No tasks found. Create a new task to get started.
                    </div>
                )}
            </div>

            {/* Task Form Modal */}
            {(showTaskForm || editingTask) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-slate-900 p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold opacity-65">
                                {editingTask ? "Edit Task" : "Create New Task"}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowTaskForm(false);
                                    setEditingTask(null);
                                }}
                                className="text-gray-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>
                        <TaskForm
                            initialData={editingTask || undefined}
                            onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
                            isLoading={createMutation.isLoading || updateMutation.isLoading}
                            onCancel={() => {
                                setShowTaskForm(false);
                                setEditingTask(null);
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Task History Modal */}
            {viewingHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-slate-900 p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold">Task History: {viewingHistory.title}</h3>
                            <button
                                onClick={() => setViewingHistory(null)}
                                className="text-gray-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>
                        <TaskHistory task={viewingHistory} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default RobotTasks;
