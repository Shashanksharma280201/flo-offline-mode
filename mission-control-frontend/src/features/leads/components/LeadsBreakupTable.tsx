import { LeadReportData } from "@/data/types";
import { ChartWrapper } from "./ChartWrapper";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/Table";
import {
    MdArrowDownward,
    MdArrowUpward,
    MdChevronLeft,
    MdChevronRight
} from "react-icons/md";
import dayjs from "dayjs";

type PipelineStage = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";
const stages: PipelineStage[] = ["L1", "L2", "L3", "L4", "L5"];

const LeadsBreakupTable = ({ chartData }: { chartData: LeadReportData }) => {
    const [selectedStage, setSelectedStage] = useState<PipelineStage>("L1");
    const dates = useMemo(() => Object.keys(chartData).sort(), [chartData]);
    const [selectedDate, setSelectedDate] = useState<string>();
    const [data, setData] = useState<LeadBreakup[]>([]);

    useEffect(() => {
        if (!selectedDate) return;

        if (!Object.keys(chartData).length) {
            setData([]);
            return;
        }

        if (!chartData[selectedDate]) {
            setData([]);
            return;
        }

        const chartItem = chartData[selectedDate][selectedStage];
        if (!chartItem) {
            setData([]);
            return;
        }

        setData(
            Object.keys(chartItem.breakup).map((key) => ({
                id: key,
                ...chartItem.breakup[key]
            }))
        );
    }, [selectedDate, selectedStage, chartData]);

    useLayoutEffect(() => {
        if (dates.length > 0) {
            setSelectedDate(dates[0]);
        } else {
            setSelectedDate(undefined);
        }
    }, [dates]);

    return (
        <ChartWrapper
            isEmpty={false}
            description="Breakdown of leads per stage"
            title="Breakdown table"
        >
            <div className="w-full">
                {selectedDate ? (
                    <div className="flex w-full items-center justify-between pb-2">
                        <div className="flex items-center gap-2">
                            <MdChevronLeft
                                onClick={() =>
                                    setSelectedStage(
                                        stages[
                                            (stages.indexOf(selectedStage) -
                                                1 +
                                                stages.length) %
                                                stages.length
                                        ]
                                    )
                                }
                                className="h-5 w-5 cursor-pointer hover:text-white/30"
                            />
                            <span className="rounded-md bg-backgroundGray/30 p-2">
                                {selectedStage}
                            </span>
                            <MdChevronRight
                                onClick={() =>
                                    setSelectedStage(
                                        stages[
                                            (stages.indexOf(selectedStage) +
                                                1) %
                                                stages.length
                                        ]
                                    )
                                }
                                className="h-5 w-5 cursor-pointer hover:text-white/30"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <MdChevronLeft
                                onClick={() =>
                                    setSelectedDate(
                                        dates[
                                            (dates.indexOf(selectedDate) -
                                                1 +
                                                dates.length) %
                                                dates.length
                                        ]
                                    )
                                }
                                className="h-5 w-5 cursor-pointer hover:text-white/30"
                            />
                            <span className="rounded-md bg-backgroundGray/30 p-2">
                                {dayjs(selectedDate).format("D MMM YYYY")}
                            </span>
                            <MdChevronRight
                                onClick={() =>
                                    setSelectedDate(
                                        dates[
                                            (dates.indexOf(selectedDate) + 1) %
                                                dates.length
                                        ]
                                    )
                                }
                                className="h-5 w-5 cursor-pointer hover:text-white/30"
                            />
                        </div>
                    </div>
                ) : null}
                <DataTable data={data} columns={columns} />
            </div>
        </ChartWrapper>
    );
};

type LeadBreakup = {
    id: string;
    pocName: string;
    companyName: string;
    city: string;
    acv: number;
    tcv: number;
    robotCount: number;
};

const columns: ColumnDef<LeadBreakup>[] = [
    {
        accessorKey: "pocName",
        header: ({ column }) => {
            const isAsc = column.getIsSorted() === "asc";
            return (
                <button
                    className="flex items-center justify-center gap-2 rounded-md p-2 hover:bg-backgroundGray/30"
                    onClick={() => column.toggleSorting(isAsc)}
                >
                    <span>POC Name</span>
                    {isAsc ? (
                        <MdArrowDownward className="h-4 w-4 shrink-0" />
                    ) : (
                        <MdArrowUpward className="h-4 w-4 shrink-0" />
                    )}
                </button>
            );
        }
    },
    {
        accessorKey: "companyName",
        header: ({ column }) => {
            const isAsc = column.getIsSorted() === "asc";
            return (
                <button
                    className="flex items-center justify-center gap-2 rounded-md p-2 hover:bg-backgroundGray/30"
                    onClick={() => column.toggleSorting(isAsc)}
                >
                    <span>Company</span>
                    {isAsc ? (
                        <MdArrowDownward className="h-4 w-4 shrink-0" />
                    ) : (
                        <MdArrowUpward className="h-4 w-4 shrink-0" />
                    )}
                </button>
            );
        }
    },
    {
        accessorKey: "city",
        header: ({ column }) => {
            const isAsc = column.getIsSorted() === "asc";
            return (
                <button
                    className="flex items-center justify-center gap-2 rounded-md p-2 hover:bg-backgroundGray/30"
                    onClick={() => column.toggleSorting(isAsc)}
                >
                    <span>City</span>
                    {isAsc ? (
                        <MdArrowDownward className="h-4 w-4 shrink-0" />
                    ) : (
                        <MdArrowUpward className="h-4 w-4 shrink-0" />
                    )}
                </button>
            );
        }
    },
    {
        accessorKey: "acv",
        header: ({ column }) => {
            const isAsc = column.getIsSorted() === "asc";
            return (
                <button
                    className="flex items-center justify-center gap-2 rounded-md p-2 hover:bg-backgroundGray/30"
                    onClick={() => column.toggleSorting(isAsc)}
                >
                    <span>ACV</span>
                    {isAsc ? (
                        <MdArrowDownward className="h-4 w-4 shrink-0" />
                    ) : (
                        <MdArrowUpward className="h-4 w-4 shrink-0" />
                    )}
                </button>
            );
        },
        cell: ({ row }) => {
            const acv = parseInt(row.getValue("acv"));
            const formatted = new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR"
            }).format(acv);

            return <div className="text-left font-medium">{formatted}</div>;
        },
        sortingFn: (rowA, rowB, columnId) => {
            const a = rowA.getValue(columnId) as unknown as number;
            const b = rowB.getValue(columnId) as unknown as number;
            return a - b;
        }
    },
    {
        accessorKey: "tcv",
        header: ({ column }) => {
            const isAsc = column.getIsSorted() === "asc";
            return (
                <button
                    className="flex items-center justify-center gap-2 rounded-md p-2 hover:bg-backgroundGray/30"
                    onClick={() => column.toggleSorting(isAsc)}
                >
                    <span>TCV</span>
                    {isAsc ? (
                        <MdArrowDownward className="h-4 w-4 shrink-0" />
                    ) : (
                        <MdArrowUpward className="h-4 w-4 shrink-0" />
                    )}
                </button>
            );
        },
        cell: ({ row }) => {
            const tcv = parseInt(row.getValue("tcv"));
            const formatted = new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR"
            }).format(tcv);

            return <div className="text-left font-medium">{formatted}</div>;
        },
        sortingFn: (rowA, rowB, columnId) => {
            const a = rowA.getValue(columnId) as unknown as number;
            const b = rowB.getValue(columnId) as unknown as number;
            return a - b;
        }
    },
    {
        accessorKey: "robotCount",
        header: ({ column }) => {
            const isAsc = column.getIsSorted() === "asc";
            return (
                <button
                    className="flex items-center justify-center gap-2 rounded-md p-2 hover:bg-backgroundGray/30"
                    onClick={() => column.toggleSorting(isAsc)}
                >
                    <span>Robot Count</span>
                    {isAsc ? (
                        <MdArrowDownward className="h-4 w-4 shrink-0" />
                    ) : (
                        <MdArrowUpward className="h-4 w-4 shrink-0" />
                    )}
                </button>
            );
        }
    }
];

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
}

export function DataTable<TData, TValue>({
    columns,
    data
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = useState<SortingState>([]);

    const table = useReactTable({
        data,
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
        <div className="w-full rounded-md border border-border">
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                    <TableHead
                                        className="cursor-default bg-slate-900"
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
                                );
                            })}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                className="hover:bg-slate-900"
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
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
            {data.length ? (
                <div className="flex items-center justify-end gap-4 py-4 pr-4">
                    <button
                        className="rounded-md border border-border px-4 py-2 text-white hover:bg-white hover:text-black disabled:opacity-50 disabled:hover:bg-background disabled:hover:text-white"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Prev
                    </button>
                    <span>
                        {table.getState().pagination.pageIndex + 1} of {""}
                        {table.getPageCount()}
                    </span>

                    <button
                        className="rounded-md border border-border px-4 py-2 text-white hover:bg-white hover:text-black disabled:opacity-50 disabled:hover:bg-background disabled:hover:text-white"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </button>
                </div>
            ) : null}
        </div>
    );
}

export default LeadsBreakupTable;
