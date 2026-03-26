import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/Table";
import { useBillingHistory } from "@/features/billing/hooks/useBilling";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { MdAdd, MdEdit, MdHistory } from "react-icons/md";
import BillingModal from "../features/billing/components/BillingModal";
import BillingHistoryModal from "../features/billing/components/BillingHistoryModal";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { useUserStore } from "@/stores/userStore";
import {
    BillingRecord,
    BillingStatus
} from "@/features/billing/services/billingService";

const RobotBillingHistory = () => {
    const { robotId } = useParams<{ robotId: string }>();
    const navigate = useNavigate();
    const { data: historyResponse, isLoading } = useBillingHistory(robotId!);
    const robots = useUserStore((state) => state.robots);
    const robot = robots?.find((r) => r.id === robotId);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<BillingRecord | null>(
        null
    );
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyRecord, setHistoryRecord] = useState<BillingRecord | null>(
        null
    );

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <LoadingSpinner className="h-8 w-8 text-white" />
            </div>
        );
    }

    const history = historyResponse?.data || [];
    // Sort by Start Date (Descending)
    const sortedHistory = [...history].sort(
        (a, b) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );

    const latestRecord = sortedHistory[0];
    const hasActiveBilling = latestRecord && !latestRecord.endDate;

    const handleCreateClick = () => {
        if (hasActiveBilling) {
            toast.warn(
                "Please provide an end date for the current entry before starting a new one.",
                {
                    autoClose: 4000,
                    position: "top-center"
                }
            );
            return;
        }
        handleCreate();
    };

    const handleCreate = () => {
        setSelectedRecord(null);
        setIsModalOpen(true);
    };

    const handleEdit = (record: BillingRecord) => {
        setSelectedRecord(record);
        setIsModalOpen(true);
    };

    const handleViewHistory = (record: BillingRecord) => {
        setHistoryRecord(record);
        setIsHistoryOpen(true);
    };

    // Change pill color based on status
    const BILLING_STATUS_STYLES: Record<
        BillingStatus,
        {
            className: string;
        }
    > = {
        [BillingStatus.BILLING]: {
            // Primary positive state
            className: "border-green-500/30 bg-green-500/20 text-green-400"
        },

        [BillingStatus.PAIDPOC]: {
            // Completed & paid — slightly stronger green
            className:
                "border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
        },

        [BillingStatus.SOLD]: {
            // Successful outcome
            className: "border-blue-500/30 bg-blue-500/20 text-blue-400"
        },

        [BillingStatus.POC]: {
            // POC / in progress
            className: "border-yellow-500/30 bg-yellow-500/20 text-yellow-400"
        },

        [BillingStatus.WORKORDERPENDING]: {
            // Blocked / waiting
            className: "border-orange-500/30 bg-orange-500/20 text-orange-400"
        },

        [BillingStatus.NOTBILLING]: {
            // Inactive / disabled
            className: "border-gray-500/30 bg-gray-500/20 text-gray-400"
        },

        [BillingStatus.NA]: {
            // Neutral / unknown
            className:
                "border-neutral-500/30 bg-neutral-500/20 text-neutral-400"
        }
    };

    return (
        <div className="flex h-screen w-full flex-col bg-blue-900/25 py-6 md:gap-8 md:py-8">
            <div className="mb-6 flex items-center justify-between px-6 md:px-8">
                <h3 className="text-lg font-semibold text-white">
                    Billing History
                </h3>
                <button
                    className={cn(
                        "flex items-center gap-x-2 rounded-md bg-green-700 p-2 px-4 text-white transition-colors hover:bg-green-600",
                        hasActiveBilling &&
                            "cursor-not-allowed opacity-50 hover:bg-green-700"
                    )}
                    onClick={handleCreateClick}
                >
                    <MdAdd size={20} />
                    <span>Create</span>
                </button>
            </div>
            <div className="flex-1 overflow-auto px-6 text-center md:px-8">
                <div className="mx-auto w-full max-w-7xl rounded-md border border-border bg-gray-600/45">
                    <Table>
                        <TableHeader>
                            <TableRow className="font-bold">
                                <TableHead className="text-center text-white">
                                    Robot
                                </TableHead>
                                <TableHead className="text-center text-white">
                                    Client
                                </TableHead>
                                <TableHead className="text-center text-white">
                                    Amount
                                </TableHead>
                                <TableHead className="text-center text-white">
                                    Start Date
                                </TableHead>
                                <TableHead className="text-center text-white">
                                    End Date
                                </TableHead>
                                <TableHead className="text-center text-white">
                                    Status
                                </TableHead>
                                <TableHead className="text-center text-white">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedHistory.map((record) => (
                                <TableRow
                                    key={record._id}
                                    className="border-border hover:bg-slate-800/25"
                                >
                                    <TableCell className="font-medium text-white">
                                        {robot?.name ||
                                            (typeof record.robotId === "object"
                                                ? record.robotId.name
                                                : record.robotId)}
                                    </TableCell>
                                    <TableCell className="text-neutral-300">
                                        {typeof record.clientId === "object"
                                            ? record.clientId.name
                                            : record.clientId}
                                    </TableCell>
                                    <TableCell className="text-neutral-300">
                                        ₹{record.amount}
                                    </TableCell>
                                    <TableCell className="text-neutral-300">
                                        {dayjs(record.startDate).format(
                                            "DD/MMM/YYYY"
                                        )}
                                    </TableCell>{" "}
                                    <TableCell className="text-neutral-300">
                                        {record.endDate
                                            ? dayjs(record.endDate).format(
                                                  "DD/MMM/YYYY"
                                              )
                                            : "-"}
                                    </TableCell>{" "}
                                    <TableCell>
                                        <span
                                            className={cn(
                                                "rounded-full border px-2 py-1 text-xs font-semibold",
                                                BILLING_STATUS_STYLES[
                                                    record.status as BillingStatus
                                                ]?.className
                                            )}
                                        >
                                            {record.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <button
                                            className="p-2 text-neutral-400 transition-colors hover:text-white"
                                            onClick={() => handleEdit(record)}
                                        >
                                            <MdEdit size={20} />
                                        </button>
                                        <button
                                            className="p-2 text-neutral-400 transition-colors hover:text-white"
                                            onClick={() =>
                                                handleViewHistory(record)
                                            }
                                            title="View History"
                                        >
                                            <MdHistory size={20} />
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {isModalOpen && (
                <BillingModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    record={selectedRecord}
                    robotId={robotId!}
                />
            )}

            {isHistoryOpen && (
                <BillingHistoryModal
                    isOpen={isHistoryOpen}
                    onClose={() => setIsHistoryOpen(false)}
                    record={historyRecord}
                />
            )}
        </div>
    );
};

export default RobotBillingHistory;
