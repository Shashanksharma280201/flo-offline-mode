import React, { useState, useMemo, useEffect, useRef } from "react";
import Header from "@/components/header/Header";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/Table";
import useRobots from "@/hooks/useRobots";
import { useBillingSummary } from "@/features/billing/hooks/useBilling";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/Input";
import {
    Search,
    Filter,
    User,
    CalendarDays,
    RotateCcw,
    ArrowUp,
    Pencil
} from "lucide-react";
import { cn } from "@/lib/utils";
import BillingModal from "../features/billing/components/BillingModal";
import {
    BillingStatus,
    BillingRecord
} from "@/features/billing/services/billingService";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/Select";
import ComboBox from "@/components/comboBox/ComboBox";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/Popover";
import Calendar from "@/components/ui/Calendar";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { useQuery } from "react-query";
import { getClientsListFn } from "@/features/analytics/analyticsService";
import dayjs from "dayjs";
import { Button } from "@/components/ui/Button";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
    SortingState
} from "@tanstack/react-table";

const BillingSummary = () => {
    const navigate = useNavigate();
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<BillingRecord | null>(
        null
    );
    const [selectedRobotId, setSelectedRobotId] = useState<string>("");

    // Filter State
    const [selectedClient, setSelectedClient] = useState<string>("all");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [dateRange, setDateRange] = useState<DateRange | undefined>(
        undefined
    );
    const [sorting, setSorting] = useState<SortingState>([]);
    const [showScrollTop, setShowScrollTop] = useState(false);

    const { data: clients } = useQuery("clientsList", getClientsListFn);

    const filters = useMemo(
        () => ({
            clientId: selectedClient === "all" ? undefined : selectedClient,
            status: selectedStatus === "all" ? undefined : selectedStatus,
            startDate: dateRange?.from
                ? dateRange.from.toISOString()
                : undefined,
            endDate: dateRange?.to ? dateRange.to.toISOString() : undefined
        }),
        [selectedClient, selectedStatus, dateRange]
    );

    const { data: billingSummaryResponse, isLoading: billingLoading } =
        useBillingSummary(filters);
    const { isLoading: robotsLoading } = useRobots();

    const isLoading = billingLoading || robotsLoading;

    const displayData = useMemo(() => {
        if (!billingSummaryResponse?.data) return [];

        let data = billingSummaryResponse.data;

        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            data = data.filter(
                (item: any) =>
                    item.robotName.toLowerCase().includes(searchLower) ||
                    (item.clientName?.toLowerCase() || "").includes(searchLower)
            );
        }

        return data;
    }, [billingSummaryResponse, searchQuery]);

    const handleEdit = (e: React.MouseEvent, record: any, robotId: string) => {
        e.stopPropagation();
        setSelectedRecord(record);
        setSelectedRobotId(robotId);
        setIsModalOpen(true);
    };

    const resetFilters = () => {
        setSelectedClient("all");
        setSelectedStatus("all");
        setDateRange(undefined);
        setSearchQuery("");
    };

    const isFiltered =
        selectedClient !== "all" ||
        selectedStatus !== "all" ||
        dateRange !== undefined ||
        searchQuery !== "";

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

    const columns = useMemo<ColumnDef<any>[]>(
        () => [
            {
                accessorKey: "robotName",
                header: "Robot Name",
                cell: ({ row }) => (
                    <div className="flex flex-col px-4 text-left">
                        <span className="font-semibold text-white">
                            {row.original.robotName}
                        </span>
                        {/* <span className="font-mono text-xs uppercase tracking-wide text-white/30"> */}
                        {/*     {row.original.robotId || "N/A"} */}
                        {/* </span> */}
                    </div>
                )
            },
            {
                accessorKey: "clientName",
                header: "Client Name",
                cell: ({ row }) => (
                    <span className="text-white/70">
                        {row.original.clientName || "-"}
                    </span>
                )
            },
            {
                accessorKey: "amount",
                header: "Amount",
                cell: ({ row }) => (
                    <span className="font-mono text-white/70">
                        {row.original.amount != null
                            ? `₹${row.original.amount}`
                            : "-"}
                    </span>
                )
            },
            {
                accessorKey: "startDate",
                header: "Start Date",
                cell: ({ row }) => (
                    <span className="text-sm text-white/50">
                        {row.original.startDate
                            ? dayjs(row.original.startDate).format(
                                  "DD/MMM/YYYY"
                              )
                            : "-"}
                    </span>
                )
            },
            {
                accessorKey: "endDate",
                header: "End Date",
                cell: ({ row }) => (
                    <span className="text-sm text-white/50">
                        {row.original.endDate
                            ? dayjs(row.original.endDate).format("DD/MMM/YYYY")
                            : "-"}
                    </span>
                )
            },
            {
                accessorKey: "status",
                header: "Status",
                cell: ({ row }) => {
                    const status = row.original.status as
                        | BillingStatus
                        | undefined;

                    if (!status || !BILLING_STATUS_STYLES[status]) {
                        return "-";
                    }

                    return (
                        <span
                            className={cn(
                                "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                BILLING_STATUS_STYLES[status].className
                            )}
                        >
                            {status}
                        </span>
                    );
                }
            },
            {
                id: "actions",
                header: "",
                cell: ({ row }) => (
                    <button
                        className="p-2 text-white/30 transition-colors hover:text-white"
                        onClick={(e) =>
                            handleEdit(
                                e,
                                row.original._id ? row.original : null,
                                row.original.robotId
                            )
                        }
                    >
                        <Pencil size={14} />
                    </button>
                )
            }
        ],
        []
    );

    const table = useReactTable({
        data: displayData,
        columns,
        state: {
            sorting
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel()
    });

    // Reset selection when search changes
    useEffect(() => {
        if (searchQuery) {
            setSelectedIndex(0);
        } else {
            setSelectedIndex(-1);
        }
    }, [searchQuery]);

    // Keyboard Listeners
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
                e.preventDefault();
                searchInputRef.current?.focus();
                return;
            }

            if (searchQuery && displayData.length > 0) {
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedIndex((prev) =>
                        prev < displayData.length - 1 ? prev + 1 : prev
                    );
                } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
                } else if (e.key === "Enter" && selectedIndex >= 0) {
                    e.preventDefault();
                    const target = displayData[selectedIndex];
                    if (target) navigate(`/robots/${target.robotId}/billing`);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [searchQuery, displayData, selectedIndex, navigate]);

    // Scroll to top listener
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <LoadingSpinner className="h-8 w-8 text-white/50" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col">
            <Header title="Billing Summary" />

            <div className="flex-1 overflow-auto bg-blue-900/25 p-6">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 sm:px-6">
                    {/* Filter Bar */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative min-w-[300px] flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                            <Input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search robots or clients... (Press '/' to focus)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30 focus:ring-white/20"
                            />
                            <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 sm:block">
                                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-white/30 opacity-100">
                                    /
                                </kbd>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="w-[180px]">
                                <ComboBox
                                    items={[
                                        { id: "all", name: "All Clients" },
                                        ...(clients || [])
                                    ]}
                                    selectedItem={
                                        selectedClient === "all"
                                            ? { id: "all", name: "All Clients" }
                                            : clients?.find(
                                                  (c: any) =>
                                                      c.id === selectedClient
                                              ) || {
                                                  id: selectedClient,
                                                  name: "Unknown"
                                              }
                                    }
                                    setSelectedItem={(item) =>
                                        setSelectedClient(item.id)
                                    }
                                    label="Client"
                                    showLabel={false}
                                    getItemLabel={(item) => item?.name || ""}
                                    placeholder="Select Client"
                                    wrapperClassName="border-white/10 bg-white/5 h-10 py-0"
                                    inputClassName="text-white placeholder:text-white/30 text-sm truncate"
                                    isSelect={true}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Select
                                value={selectedStatus}
                                onValueChange={setSelectedStatus}
                            >
                                <SelectTrigger className="w-[180px] border-white/10 bg-white/5 text-white">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-3.5 w-3.5 text-white/30" />
                                        <SelectValue placeholder="All Status" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="border-white/10 bg-neutral-900 text-white">
                                    <SelectItem value="all">
                                        All Status
                                    </SelectItem>
                                    {Object.values(BillingStatus).map(
                                        (status) => (
                                            <SelectItem
                                                key={status}
                                                value={status}
                                            >
                                                {status}
                                            </SelectItem>
                                        )
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-[240px] justify-start border-white/10 bg-white/5 text-left font-normal text-white hover:bg-white/10",
                                            !dateRange && "text-white/50"
                                        )}
                                    >
                                        <CalendarDays className="mr-2 h-3.5 w-3.5 text-white/30" />
                                        {dateRange?.from ? (
                                            dateRange.to ? (
                                                <>
                                                    {format(
                                                        dateRange.from,
                                                        "LLL dd, y"
                                                    )}{" "}
                                                    -{" "}
                                                    {format(
                                                        dateRange.to,
                                                        "LLL dd, y"
                                                    )}
                                                </>
                                            ) : (
                                                format(
                                                    dateRange.from,
                                                    "LLL dd, y"
                                                )
                                            )
                                        ) : (
                                            <span>Pick a date range</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto border-border p-0"
                                    align="end"
                                >
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateRange?.from}
                                        selected={dateRange}
                                        onSelect={setDateRange}
                                        numberOfMonths={2}
                                        className="bg-neutral-900 text-white"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {isFiltered && (
                            <Button
                                variant="ghost"
                                onClick={resetFilters}
                                className="text-white/50 hover:bg-white/10 hover:text-white"
                            >
                                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                                Reset
                            </Button>
                        )}
                    </div>

                    {/* Table Surface */}
                    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                        <Table>
                            <TableHeader className="bg-white/[0.02]">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow
                                        key={headerGroup.id}
                                        className="border-b border-white/10 hover:bg-transparent"
                                    >
                                        {headerGroup.headers.map((header) => (
                                            <TableHead
                                                key={header.id}
                                                className="py-3 text-center text-xs font-medium uppercase tracking-wider text-white/50"
                                            >
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                          header.column
                                                              .columnDef.header,
                                                          header.getContext()
                                                      )}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows?.length ? (
                                    table
                                        .getRowModel()
                                        .rows.map((row, index) => {
                                            const isSelected =
                                                index === selectedIndex &&
                                                searchQuery !== "";
                                            return (
                                                <TableRow
                                                    key={row.id}
                                                    className={cn(
                                                        "cursor-pointer border-b border-white/10 transition-colors last:border-0",
                                                        isSelected
                                                            ? "bg-white/10"
                                                            : "hover:bg-white/[0.02]"
                                                    )}
                                                    onClick={() =>
                                                        navigate(
                                                            `/robots/${row.original.robotId}/billing`
                                                        )
                                                    }
                                                >
                                                    {row
                                                        .getVisibleCells()
                                                        .map((cell) => (
                                                            <TableCell
                                                                key={cell.id}
                                                                className="py-3 text-center"
                                                            >
                                                                {flexRender(
                                                                    cell.column
                                                                        .columnDef
                                                                        .cell,
                                                                    cell.getContext()
                                                                )}
                                                            </TableCell>
                                                        ))}
                                                </TableRow>
                                            );
                                        })
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={columns.length}
                                            className="h-24 border-none text-center text-white/30"
                                        >
                                            No robots found matching the filters
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <BillingModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    record={selectedRecord}
                    robotId={selectedRobotId}
                />
            )}

            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-6 right-6 z-50 rounded-full border border-white/10 bg-white/10 p-3 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-white/20 md:hidden"
                    aria-label="Scroll to top"
                >
                    <ArrowUp className="h-6 w-6" />
                </button>
            )}
        </div>
    );
};

export default BillingSummary;
