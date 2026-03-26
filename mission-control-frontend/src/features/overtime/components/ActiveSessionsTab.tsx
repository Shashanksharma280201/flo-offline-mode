import { useState, useEffect } from "react";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import {
    fetchActiveSessions,
    updateActiveSessionDuration,
    type OvertimeSession
} from "../../../api/overtimeApi";
import { useUserStore } from "../../../stores/userStore";
import { toast } from "react-toastify";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";

dayjs.extend(duration);

const ActiveSessionsTab = () => {
    const [sessions, setSessions] = useState<OvertimeSession[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [selectedSession, setSelectedSession] = useState<OvertimeSession | null>(null);
    const [newDuration, setNewDuration] = useState("");
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const user = useUserStore((state) => state.user);

    useEffect(() => {
        loadSessions();
        const interval = setInterval(loadSessions, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadSessions = async () => {
        setLoading(true);
        try {
            const data = await fetchActiveSessions();
            setSessions(data.sessions);
        } catch (error: any) {
            console.error("Failed to load active sessions:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (ms: number) => {
        const d = dayjs.duration(ms);
        const hours = Math.floor(d.asHours());
        const minutes = d.minutes();

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    };

    const showEditModal = (session: OvertimeSession) => {
        setSelectedSession(session);
        setNewDuration(session.session.approvedDuration.toString());
        setIsEditModalVisible(true);
    };

    const handleUpdateDuration = async () => {
        if (!selectedSession || !user) return;

        const duration = parseFloat(newDuration);
        if (isNaN(duration) || duration < 0.5 || duration > 12) {
            toast.error("Duration must be between 0.5 and 12 hours");
            return;
        }

        setActionLoading(selectedSession.session.id);
        try {
            await updateActiveSessionDuration(
                selectedSession.session.id,
                user.id,
                user.name,
                duration
            );
            toast.success(`Updated overtime duration to ${duration} hours for ${selectedSession.operator.name}`);
            setIsEditModalVisible(false);
            setSelectedSession(null);
            setNewDuration("");
            loadSessions();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update duration");
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                        {sessions.length} active session{sessions.length !== 1 ? "s" : ""}
                    </span>
                </div>
                <button
                    onClick={loadSessions}
                    disabled={loading}
                    className="rounded-md bg-gray-700 px-4 py-2 font-semibold text-white transition-colors hover:bg-gray-600 disabled:opacity-50"
                >
                    {loading ? "Loading..." : "Refresh"}
                </button>
            </div>

            {loading && sessions.length === 0 ? (
                <div className="flex min-h-[30vh] items-center justify-center">
                    <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-gray-700" />
                </div>
            ) : sessions.length === 0 ? (
                <div className="flex min-h-[30vh] items-center justify-center rounded-lg border border-gray-700 bg-gray-800/50">
                    <p className="text-gray-400">No active sessions</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-700">
                    <table className="w-full">
                        <thead className="bg-gray-800/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Operator</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Client</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Check-In Time</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Elapsed Time</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Approved</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Remaining</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Progress</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {sessions.map((session) => {
                                const elapsedHours = session.elapsedTime / (1000 * 60 * 60);
                                const approvedHours = session.session.approvedDuration;
                                const percentage = Math.min(100, (elapsedHours / approvedHours) * 100);
                                const isOvertime = session.remainingTime <= 0;

                                return (
                                    <tr key={session.session.id} className="hover:bg-gray-800/30">
                                        <td className="px-4 py-3 text-sm text-white">{session.operator.name}</td>
                                        <td className="px-4 py-3 text-sm text-white">{session.client.name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-400" title={dayjs(session.session.checkInTime).format("MMM D, YYYY h:mm A")}>
                                            {dayjs(session.session.checkInTime).format("h:mm A")}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={isOvertime ? "flex items-center gap-1 text-yellow-500" : "text-white"}>
                                                {isOvertime && (
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                    </svg>
                                                )}
                                                {formatDuration(session.elapsedTime)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-white">
                                            {session.session.approvedDuration} hr{session.session.approvedDuration !== 1 ? "s" : ""}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={isOvertime ? "text-yellow-500" : "text-white"}>
                                                {isOvertime ? "Exceeded" : formatDuration(session.remainingTime)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-700">
                                                    <div
                                                        className={`h-full transition-all ${
                                                            percentage >= 100 ? "bg-yellow-500" : "bg-blue-500"
                                                        }`}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-400">{Math.round(percentage)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                                    isOvertime
                                                        ? "bg-yellow-900/50 text-yellow-500"
                                                        : "bg-green-900/50 text-green-500"
                                                }`}
                                            >
                                                {isOvertime ? "Exceeding" : "Active"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => showEditModal(session)}
                                                disabled={actionLoading !== null}
                                                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                                                title="Edit Duration"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {isEditModalVisible && selectedSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6">
                        <h2 className="mb-4 text-xl font-bold text-white">
                            Edit Overtime Duration - {selectedSession.operator.name}
                        </h2>

                        <div className="mb-4 space-y-2 rounded-md bg-gray-800/50 p-3">
                            <p className="text-sm text-gray-400">Session Details:</p>
                            <p className="text-sm text-white">
                                <strong>Client:</strong> {selectedSession.client.name}
                            </p>
                            <p className="text-sm text-white">
                                <strong>Current Duration:</strong> {selectedSession.session.approvedDuration} hours
                            </p>
                            <p className="text-sm text-white">
                                <strong>Elapsed:</strong> {formatDuration(selectedSession.elapsedTime)}
                            </p>
                            <p className="text-sm text-white">
                                <strong>Remaining:</strong> {selectedSession.remainingTime > 0 ? formatDuration(selectedSession.remainingTime) : "Exceeded"}
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="mb-1 block text-sm font-medium text-gray-300">
                                New Duration (hours) *
                            </label>
                            <input
                                type="number"
                                min="0.5"
                                max="12"
                                step="0.5"
                                value={newDuration}
                                onChange={(e) => setNewDuration(e.target.value)}
                                placeholder="Enter hours (0.5 - 12)"
                                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                Update the approved duration for this active session (0.5 - 12 hours)
                            </p>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setIsEditModalVisible(false);
                                    setSelectedSession(null);
                                    setNewDuration("");
                                }}
                                disabled={actionLoading !== null}
                                className="rounded-md border border-gray-600 bg-transparent px-4 py-2 font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateDuration}
                                disabled={actionLoading !== null}
                                className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                            >
                                {actionLoading !== null ? "Updating..." : "Update Duration"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActiveSessionsTab;
