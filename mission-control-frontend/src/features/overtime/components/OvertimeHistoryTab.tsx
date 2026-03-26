import { useState, useEffect } from "react";
import dayjs, { Dayjs } from "dayjs";
import * as XLSX from "xlsx";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
    getSortedRowModel,
    SortingState
} from "@tanstack/react-table";
import {
    fetchOvertimeHistory,
    type OvertimeRequest
} from "../../../api/overtimeApi";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { Button } from "../../../components/ui/Button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "../../../components/ui/Select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "../../../components/ui/Table";
import { toast } from "react-toastify";
import {
    MdArrowDownward,
    MdArrowUpward,
    MdRefresh,
    MdFileDownload
} from "react-icons/md";
import { DateRangePicker } from "../../analytics/components/DateRangePicker";

// Table column definitions
const getStatusBadgeClass = (status: string) => {
    switch (status) {
        case "approved":
            return "bg-green-900/50 text-green-500";
        case "rejected":
            return "bg-red-900/50 text-red-500";
        case "pending":
            return "bg-yellow-900/50 text-yellow-500";
        default:
            return "bg-gray-900/50 text-gray-500";
    }
};

const columns: ColumnDef<OvertimeRequest>[] = [
    {
        accessorKey: "requestedAt",
        header: ({ column }) => {
            const isAsc = column.getIsSorted() === "asc";
            return (
                <button
                    className="flex items-center justify-center gap-2 rounded-md p-2 hover:bg-backgroundGray/30"
                    onClick={() => column.toggleSorting(isAsc)}
                >
                    <span>Date</span>
                    {isAsc ? (
                        <MdArrowDownward className="h-4 w-4 shrink-0" />
                    ) : (
                        <MdArrowUpward className="h-4 w-4 shrink-0" />
                    )}
                </button>
            );
        },
        cell: ({ row }) => {
            const date = row.getValue("requestedAt") as Date;
            return (
                <div
                    className="text-sm text-gray-400"
                    title={dayjs(date).format("MMM D, YYYY h:mm A")}
                >
                    {dayjs(date).format("MMM D, YYYY")}
                </div>
            );
        }
    },
    {
        accessorKey: "operatorName",
        header: ({ column }) => {
            const isAsc = column.getIsSorted() === "asc";
            return (
                <button
                    className="flex items-center justify-center gap-2 rounded-md p-2 hover:bg-backgroundGray/30"
                    onClick={() => column.toggleSorting(isAsc)}
                >
                    <span>Operator</span>
                    {isAsc ? (
                        <MdArrowDownward className="h-4 w-4 shrink-0" />
                    ) : (
                        <MdArrowUpward className="h-4 w-4 shrink-0" />
                    )}
                </button>
            );
        },
        cell: ({ row }) => (
            <div className="text-sm text-white">
                {row.getValue("operatorName")}
            </div>
        )
    },
    {
        accessorKey: "clientName",
        header: ({ column }) => {
            const isAsc = column.getIsSorted() === "asc";
            return (
                <button
                    className="flex items-center justify-center gap-2 rounded-md p-2 hover:bg-backgroundGray/30"
                    onClick={() => column.toggleSorting(isAsc)}
                >
                    <span>Client</span>
                    {isAsc ? (
                        <MdArrowDownward className="h-4 w-4 shrink-0" />
                    ) : (
                        <MdArrowUpward className="h-4 w-4 shrink-0" />
                    )}
                </button>
            );
        },
        cell: ({ row }) => (
            <div className="text-sm text-white">
                {row.getValue("clientName")}
            </div>
        )
    },
    {
        accessorKey: "robotName",
        header: "Robot/MMR",
        cell: ({ row }) => (
            <div className="text-sm text-gray-400">
                {row.getValue("robotName") || "-"}
            </div>
        )
    },
    {
        accessorKey: "requestedDuration",
        header: ({ column }) => {
            const isAsc = column.getIsSorted() === "asc";
            return (
                <button
                    className="flex items-center justify-center gap-2 rounded-md p-2 hover:bg-backgroundGray/30"
                    onClick={() => column.toggleSorting(isAsc)}
                >
                    <span>Requested</span>
                    {isAsc ? (
                        <MdArrowDownward className="h-4 w-4 shrink-0" />
                    ) : (
                        <MdArrowUpward className="h-4 w-4 shrink-0" />
                    )}
                </button>
            );
        },
        cell: ({ row }) => {
            const duration = row.getValue("requestedDuration") as number;
            return (
                <div className="text-sm text-white">
                    {duration} hr{duration !== 1 ? "s" : ""}
                </div>
            );
        }
    },
    {
        accessorKey: "approvedDuration",
        header: ({ column }) => {
            const isAsc = column.getIsSorted() === "asc";
            return (
                <button
                    className="flex items-center justify-center gap-2 rounded-md p-2 hover:bg-backgroundGray/30"
                    onClick={() => column.toggleSorting(isAsc)}
                >
                    <span>Approved</span>
                    {isAsc ? (
                        <MdArrowDownward className="h-4 w-4 shrink-0" />
                    ) : (
                        <MdArrowUpward className="h-4 w-4 shrink-0" />
                    )}
                </button>
            );
        },
        cell: ({ row }) => {
            const approvedDuration = row.getValue("approvedDuration") as
                | number
                | undefined;
            const requestedDuration = row.getValue(
                "requestedDuration"
            ) as number;
            if (!approvedDuration) {
                return <div className="text-sm text-gray-500">-</div>;
            }
            const isDifferent = approvedDuration !== requestedDuration;
            return (
                <div
                    className={`text-sm ${isDifferent ? "text-yellow-500" : "text-white"}`}
                >
                    {approvedDuration} hr{approvedDuration !== 1 ? "s" : ""}
                    {isDifferent && (
                        <span
                            className="ml-1 text-xs"
                            title="Duration was modified by admin"
                        >
                            ⚠️
                        </span>
                    )}
                </div>
            );
        }
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string;
            return (
                <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(status)}`}
                >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
            );
        }
    },
    {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) => {
            const reason = row.getValue("reason") as string;
            return (
                <div
                    className="max-w-xs truncate text-sm text-gray-400"
                    title={reason}
                >
                    {reason}
                </div>
            );
        }
    }
];

const OvertimeHistoryTab = () => {
    const [records, setRecords] = useState<OvertimeRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Filter states - only Date Range, Robot, and Status
    const [startingTimestamp, setStartingTimestamp] = useState<
        Dayjs | undefined
    >(undefined);
    const [endingTimestamp, setEndingTimestamp] = useState<Dayjs | undefined>(
        undefined
    );
    const [selectedRobotId, setSelectedRobotId] = useState<string>("");
    const [selectedStatus, setSelectedStatus] = useState<string>("");

    // Extract unique robots from overtime records
    const availableRobots = records
        .filter((record) => record.robotId && record.robotName)
        .reduce(
            (acc, record) => {
                if (!acc.find((r) => r.id === record.robotId)) {
                    acc.push({ id: record.robotId!, name: record.robotName! });
                }
                return acc;
            },
            [] as { id: string; name: string }[]
        )
        .sort((a, b) => a.name.localeCompare(b.name));

    const loadHistory = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (startingTimestamp)
                params.startDate = startingTimestamp.format("YYYY-MM-DD");
            if (endingTimestamp)
                params.endDate = endingTimestamp.format("YYYY-MM-DD");
            if (selectedRobotId) params.robotId = selectedRobotId;
            if (selectedStatus) params.status = selectedStatus;

            console.log("[OvertimeHistory] Fetching with params:", params);
            const data = await fetchOvertimeHistory(params);
            console.log("[OvertimeHistory] Received data:", data);
            console.log("[OvertimeHistory] Records count:", data.records?.length || 0);
            setRecords(data.records || []);
            console.log("[OvertimeHistory] State updated with records");
        } catch (error: any) {
            console.error("[OvertimeHistory] Failed to load overtime history:", error);
            console.error("[OvertimeHistory] Error details:", {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            toast.error(
                error.response?.data?.message ||
                    "Failed to load overtime history"
            );
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        loadHistory(); // Initial load without filters
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        loadHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startingTimestamp, endingTimestamp, selectedRobotId, selectedStatus]);

    const handleExportToExcel = () => {
        if (records.length === 0) {
            toast.info("No data to export");
            return;
        }

        setExporting(true);
        try {
            const exportData = records.map((record) => ({
                "Request Date": dayjs(record.requestedAt).format(
                    "MMM D, YYYY h:mm A"
                ),
                Operator: record.operatorName,
                Client: record.clientName,
                "Robot/MMR": record.robotName || "-",
                "Requested Duration (hrs)": record.requestedDuration,
                "Approved Duration (hrs)": record.approvedDuration || "-",
                Status:
                    record.status.charAt(0).toUpperCase() +
                    record.status.slice(1),
                Reason: record.reason,
                "Approved By": record.approvedByName || "-",
                "Approved At": record.approvedAt
                    ? dayjs(record.approvedAt).format("MMM D, YYYY h:mm A")
                    : "-",
                "Rejected By": record.rejectedByName || "-",
                "Rejected At": record.rejectedAt
                    ? dayjs(record.rejectedAt).format("MMM D, YYYY h:mm A")
                    : "-",
                "Rejection Reason": record.rejectionReason || "-",
                "Expires At": record.expiresAt
                    ? dayjs(record.expiresAt).format("MMM D, YYYY h:mm A")
                    : "-"
            }));

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(exportData);

            // Set column widths
            worksheet["!cols"] = [
                { wpx: 150 }, // Request Date
                { wpx: 120 }, // Operator
                { wpx: 120 }, // Client
                { wpx: 100 }, // Robot/MMR
                { wpx: 150 }, // Requested Duration
                { wpx: 150 }, // Approved Duration
                { wpx: 80 }, // Status
                { wpx: 200 }, // Reason
                { wpx: 120 }, // Approved By
                { wpx: 150 }, // Approved At
                { wpx: 120 }, // Rejected By
                { wpx: 150 }, // Rejected At
                { wpx: 200 }, // Rejection Reason
                { wpx: 150 } // Expires At
            ];

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "Overtime History"
            );

            const fileName = `Overtime_History_${dayjs().format("YYYY-MM-DD_HHmmss")}.xlsx`;
            XLSX.writeFile(workbook, fileName, { compression: true });

            toast.success("Excel file downloaded successfully");
        } catch (error) {
            console.error("Failed to export to Excel:", error);
            toast.error("Failed to export to Excel");
        } finally {
            setExporting(false);
        }
    };

    const handleClearFilters = () => {
        setStartingTimestamp(undefined);
        setEndingTimestamp(undefined);
        setSelectedRobotId("");
        setSelectedStatus("");
    };

    // TanStack Table setup
    const [sorting, setSorting] = useState<SortingState>([]);

    const table = useReactTable({
        data: records,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        state: {
            sorting
        }
    });

    return (
        <div className="space-y-6">
            {/* Filters Section */}
            <div className="rounded-xl border border-gray-700 bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 shadow-lg backdrop-blur-sm">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-white">
                            Filters
                        </h3>
                        <p className="text-xs text-gray-400">
                            Refine your overtime history search
                        </p>
                    </div>
                    <Button
                        onClick={handleClearFilters}
                        variant="ghost"
                        size="sm"
                        className="text-sm text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                    >
                        Clear All
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* Date Range */}
                    <div>
                        <DateRangePicker
                            className="w-full"
                            dateRange={{
                                from: startingTimestamp?.toDate(),
                                to: endingTimestamp?.toDate()
                            }}
                            setStartingTimestamp={setStartingTimestamp}
                            setEndingTimestamp={setEndingTimestamp}
                        />
                    </div>

                    {/* Robot Filter */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-200">
                            Robot
                        </label>
                        <Select
                            value={selectedRobotId || "all"}
                            onValueChange={(val) =>
                                setSelectedRobotId(val === "all" ? "" : val)
                            }
                        >
                            <SelectTrigger className="h-11 border-none bg-gray-700/50 text-white shadow-none ring-1 ring-gray-600/50 transition-all hover:bg-gray-700 focus:ring-1 focus:ring-blue-500/50">
                                <SelectValue placeholder="All Robots" />
                            </SelectTrigger>
                            <SelectContent className="border border-gray-700/50 bg-gray-800 shadow-2xl">
                                <SelectItem
                                    value="all"
                                    className="text-gray-300 focus:bg-gray-700/50 focus:text-white"
                                >
                                    All Robots
                                </SelectItem>
                                {availableRobots.length > 0 ? (
                                    availableRobots.map((robot) => (
                                        <SelectItem
                                            key={robot.id}
                                            value={robot.id}
                                            className="text-gray-300 focus:bg-gray-700/50 focus:text-white"
                                        >
                                            {robot.name}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem
                                        value="none"
                                        disabled
                                        className="text-gray-500"
                                    >
                                        No robots with overtime records
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-200">
                            Status
                        </label>
                        <Select
                            value={selectedStatus || "all"}
                            onValueChange={(val) =>
                                setSelectedStatus(val === "all" ? "" : val)
                            }
                        >
                            <SelectTrigger className="h-11 border-none bg-gray-700/50 text-white shadow-none ring-1 ring-gray-600/50 transition-all hover:bg-gray-700 focus:ring-1 focus:ring-blue-500/50">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent className="border border-gray-700/50 bg-gray-800 shadow-2xl">
                                <SelectItem
                                    value="all"
                                    className="text-gray-300 focus:bg-gray-700/50 focus:text-white"
                                >
                                    All Status
                                </SelectItem>
                                <SelectItem
                                    value="pending"
                                    className="text-yellow-400 focus:bg-gray-700/50 focus:text-yellow-300"
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-yellow-400"></span>
                                        Pending
                                    </span>
                                </SelectItem>
                                <SelectItem
                                    value="approved"
                                    className="text-green-400 focus:bg-gray-700/50 focus:text-green-300"
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-green-400"></span>
                                        Approved
                                    </span>
                                </SelectItem>
                                <SelectItem
                                    value="rejected"
                                    className="text-red-400 focus:bg-gray-700/50 focus:text-red-300"
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-red-400"></span>
                                        Rejected
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col items-start justify-between gap-4 rounded-lg border border-gray-700 bg-gray-800/30 p-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                        <span className="text-lg font-bold text-blue-400">
                            {records.length}
                        </span>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white">
                            {records.length} Record
                            {records.length !== 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-gray-400">
                            Total overtime requests found
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        onClick={loadHistory}
                        disabled={loading}
                        variant="outline"
                        size="sm"
                        className="gap-2 border-gray-600 bg-gray-700/50 hover:bg-gray-600"
                    >
                        <MdRefresh
                            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                        />
                        {loading ? "Refreshing..." : "Refresh"}
                    </Button>
                    <Button
                        onClick={handleExportToExcel}
                        disabled={exporting || records.length === 0}
                        size="sm"
                        className="gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-600"
                    >
                        {exporting ? (
                            <>
                                <LoadingSpinner className="h-4 w-4 animate-spin fill-white" />
                                <span>Exporting...</span>
                            </>
                        ) : (
                            <>
                                <MdFileDownload className="h-4 w-4" />
                                <span>Export to Excel</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Table */}
            {loading && records.length === 0 ? (
                <div className="flex min-h-[40vh] items-center justify-center">
                    <LoadingSpinner className="h-8 w-8 animate-spin" />
                </div>
            ) : records.length === 0 ? (
                <div className="flex min-h-[40vh] items-center justify-center rounded-lg border border-border bg-backgroundGray/50">
                    <div className="text-center">
                        <p className="mt-2 text-gray-400">
                            No overtime records found
                        </p>
                        <p className="text-sm text-gray-500">
                            Try adjusting your filters
                        </p>
                    </div>
                </div>
            ) : (
                <div className="w-full rounded-md border border-border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead
                                            className="cursor-default bg-background"
                                            key={header.id}
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef
                                                          .header,
                                                      header.getContext()
                                                  )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        className="hover:bg-background"
                                        key={row.id}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center"
                                    >
                                        No results.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    {records.length > 0 && (
                        <div className="flex items-center justify-end gap-4 py-4 pr-4">
                            <Button
                                variant="outline"
                                className="flex bg-transparent hover:bg-backgroundGray/30"
                                size="sm"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                Prev
                            </Button>
                            <span className="text-sm">
                                {table.getState().pagination.pageIndex + 1} of{" "}
                                {table.getPageCount()}
                            </span>
                            <Button
                                className="flex bg-transparent hover:bg-backgroundGray/30"
                                variant="outline"
                                size="sm"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default OvertimeHistoryTab;
