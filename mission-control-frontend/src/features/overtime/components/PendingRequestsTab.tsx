import { useState, useEffect } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
    fetchPendingRequests,
    approveOvertimeRequest,
    rejectOvertimeRequest,
    type OvertimeRequest
} from "../../../api/overtimeApi";
import { useUserStore } from "../../../stores/userStore";
import { toast } from "react-toastify";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";

dayjs.extend(relativeTime);

const PendingRequestsTab = () => {
    const [requests, setRequests] = useState<OvertimeRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [isApproveModalVisible, setIsApproveModalVisible] = useState(false);
    const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<OvertimeRequest | null>(null);
    const [approvedDuration, setApprovedDuration] = useState("");
    const [rejectionReason, setRejectionReason] = useState("");
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const user = useUserStore((state) => state.user);

    useEffect(() => {
        loadRequests();
        const interval = setInterval(loadRequests, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const data = await fetchPendingRequests();
            setRequests(data.requests);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to load pending requests");
        } finally {
            setLoading(false);
        }
    };

    const showApproveModal = (request: OvertimeRequest) => {
        setSelectedRequest(request);
        setApprovedDuration(request.requestedDuration.toString());
        setIsApproveModalVisible(true);
    };

    const handleApprove = async () => {
        if (!selectedRequest || !user) return;

        const duration = parseFloat(approvedDuration);
        if (isNaN(duration) || duration < 0.5 || duration > 12) {
            toast.error("Duration must be between 0.5 and 12 hours");
            return;
        }

        setActionLoading(selectedRequest._id);
        try {
            await approveOvertimeRequest(selectedRequest._id, user.id, user.name, duration);
            toast.success(`Approved ${duration} hours overtime for ${selectedRequest.operatorName}`);
            setIsApproveModalVisible(false);
            setSelectedRequest(null);
            setApprovedDuration("");
            loadRequests();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to approve request");
        } finally {
            setActionLoading(null);
        }
    };

    const showRejectModal = (request: OvertimeRequest) => {
        setSelectedRequest(request);
        setRejectionReason("");
        setIsRejectModalVisible(true);
    };

    const handleReject = async () => {
        if (!selectedRequest || !user) return;

        if (!rejectionReason.trim()) {
            toast.error("Please provide a rejection reason");
            return;
        }

        setActionLoading(selectedRequest._id);
        try {
            await rejectOvertimeRequest(
                selectedRequest._id,
                user.id,
                user.name,
                rejectionReason.trim()
            );
            toast.success(`Rejected overtime request from ${selectedRequest.operatorName}`);
            setIsRejectModalVisible(false);
            setSelectedRequest(null);
            setRejectionReason("");
            loadRequests();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to reject request");
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
                        {requests.length} pending request{requests.length !== 1 ? "s" : ""}
                    </span>
                </div>
                <button
                    onClick={loadRequests}
                    disabled={loading}
                    className="rounded-md bg-gray-700 px-4 py-2 font-semibold text-white transition-colors hover:bg-gray-600 disabled:opacity-50"
                >
                    {loading ? "Loading..." : "Refresh"}
                </button>
            </div>

            {loading && requests.length === 0 ? (
                <div className="flex min-h-[30vh] items-center justify-center">
                    <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-gray-700" />
                </div>
            ) : requests.length === 0 ? (
                <div className="flex min-h-[30vh] items-center justify-center rounded-lg border border-gray-700 bg-gray-800/50">
                    <p className="text-gray-400">No pending requests</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-700">
                    <table className="w-full">
                        <thead className="bg-gray-800/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Operator</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Client</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Robot</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Duration</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Reason</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Requested</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {requests.map((request) => (
                                <tr key={request._id} className="hover:bg-gray-800/30">
                                    <td className="px-4 py-3 text-sm text-white">{request.operatorName}</td>
                                    <td className="px-4 py-3 text-sm text-white">{request.clientName}</td>
                                    <td className="px-4 py-3 text-sm text-gray-400">{request.robotName || "-"}</td>
                                    <td className="px-4 py-3 text-sm text-white">
                                        {request.requestedDuration} hr{request.requestedDuration !== 1 ? "s" : ""}
                                    </td>
                                    <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-400" title={request.reason}>
                                        {request.reason}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-400" title={dayjs(request.requestedAt).format("MMM D, YYYY h:mm A")}>
                                        {dayjs(request.requestedAt).fromNow()}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => showApproveModal(request)}
                                                disabled={actionLoading !== null}
                                                className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-green-500 disabled:opacity-50"
                                                title="Approve"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => showRejectModal(request)}
                                                disabled={actionLoading !== null}
                                                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                                                title="Reject"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isApproveModalVisible && selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6">
                        <h2 className="mb-4 text-xl font-bold text-white">
                            Approve Overtime Request - {selectedRequest.operatorName}
                        </h2>

                        <div className="mb-4 space-y-2 rounded-md bg-gray-800/50 p-3">
                            <p className="text-sm text-gray-400">Request Details:</p>
                            <p className="text-sm text-white">
                                <strong>Requested Duration:</strong> {selectedRequest.requestedDuration} hours
                            </p>
                            <p className="text-sm text-white">
                                <strong>Client:</strong> {selectedRequest.clientName}
                            </p>
                            {selectedRequest.robotName && (
                                <p className="text-sm text-white">
                                    <strong>Robot:</strong> {selectedRequest.robotName}
                                </p>
                            )}
                            <p className="mt-2 text-sm text-white">
                                <strong>Reason:</strong>
                            </p>
                            <p className="text-sm text-gray-300">{selectedRequest.reason}</p>
                        </div>

                        <div className="mb-6">
                            <label className="mb-1 block text-sm font-medium text-gray-300">
                                Approved Duration (hours) *
                            </label>
                            <input
                                type="number"
                                min="0.5"
                                max="12"
                                step="0.5"
                                value={approvedDuration}
                                onChange={(e) => setApprovedDuration(e.target.value)}
                                placeholder="Enter hours (0.5 - 12)"
                                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-green-500 focus:outline-none"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                You can modify the duration before approving (0.5 - 12 hours)
                            </p>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setIsApproveModalVisible(false);
                                    setSelectedRequest(null);
                                    setApprovedDuration("");
                                }}
                                disabled={actionLoading !== null}
                                className="rounded-md border border-gray-600 bg-transparent px-4 py-2 font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={actionLoading !== null}
                                className="rounded-md bg-green-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-green-500 disabled:opacity-50"
                            >
                                {actionLoading !== null ? "Approving..." : "Approve Request"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isRejectModalVisible && selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6">
                        <h2 className="mb-4 text-xl font-bold text-white">
                            Reject Overtime Request - {selectedRequest.operatorName}
                        </h2>

                        <div className="mb-4 space-y-2 rounded-md bg-gray-800/50 p-3">
                            <p className="text-sm text-gray-400">Request Details:</p>
                            <p className="text-sm text-white">
                                <strong>Duration:</strong> {selectedRequest.requestedDuration} hours
                            </p>
                            <p className="text-sm text-white">
                                <strong>Client:</strong> {selectedRequest.clientName}
                            </p>
                            <p className="mt-2 text-sm text-white">
                                <strong>Reason:</strong>
                            </p>
                            <p className="text-sm text-gray-300">{selectedRequest.reason}</p>
                        </div>

                        <div className="mb-6">
                            <label className="mb-1 block text-sm font-medium text-gray-300">
                                Rejection Reason *
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Provide a reason for rejection..."
                                rows={4}
                                maxLength={500}
                                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
                            />
                            <p className="mt-1 text-xs text-gray-400">{rejectionReason.length}/500</p>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setIsRejectModalVisible(false);
                                    setSelectedRequest(null);
                                    setRejectionReason("");
                                }}
                                disabled={actionLoading !== null}
                                className="rounded-md border border-gray-600 bg-transparent px-4 py-2 font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={actionLoading !== null}
                                className="rounded-md bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                            >
                                {actionLoading !== null ? "Rejecting..." : "Reject Request"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PendingRequestsTab;
