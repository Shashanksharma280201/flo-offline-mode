import { LeadReportData } from "@/data/types";
import { ChartWrapper } from "./ChartWrapper";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
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
const stages: PipelineStage[] = ["L0", "L1", "L2", "L3", "L4", "L5"];

// Fixed list of all products to always display
const PRODUCTS = [
    "MMR rental",
    "MMR otb",
    "Autonomy",
    "Projects",
    "Others"
] as const;

type ProductMachineRow = {
    level: string;
    [product: string]: number | string;
    total: number;
};

const LeadsLevelProductMachinewise = ({
    chartData
}: {
    chartData: LeadReportData;
}) => {
    const dates = useMemo(() => Object.keys(chartData).sort(), [chartData]);
    const [selectedDate, setSelectedDate] = useState<string>();
    const [tableData, setTableData] = useState<ProductMachineRow[]>([]);

    // Transform data when date changes
    useEffect(() => {
        if (!selectedDate) return;

        if (!Object.keys(chartData).length) {
            setTableData([]);
            return;
        }

        if (!chartData[selectedDate]) {
            setTableData([]);
            return;
        }

        const rows: ProductMachineRow[] = stages.map((stage) => {
            const stageData = chartData[selectedDate][stage]?.robotCount || {};

            const row: ProductMachineRow = {
                level: stage,
                total: 0
            };

            // Add each product count from the fixed PRODUCTS list
            PRODUCTS.forEach((product) => {
                const count = stageData[product] || 0;
                row[product] = count;
                row.total += count;
            });

            return row;
        });

        // Calculate totals row
        const totalsRow: ProductMachineRow = {
            level: "Total",
            total: 0
        };

        PRODUCTS.forEach((product) => {
            const productTotal = rows.reduce(
                (sum, row) => sum + (row[product] as number),
                0
            );
            totalsRow[product] = productTotal;
            totalsRow.total += productTotal;
        });

        setTableData([...rows, totalsRow]);
    }, [selectedDate, chartData]);

    useLayoutEffect(() => {
        if (dates.length > 0) {
            setSelectedDate(dates[dates.length - 1]); // Select latest date
        } else {
            setSelectedDate(undefined);
        }
    }, [dates]);

    // Generate columns based on fixed PRODUCTS list
    const columns = useMemo<ColumnDef<ProductMachineRow>[]>(() => {
        const cols: ColumnDef<ProductMachineRow>[] = [
            {
                accessorKey: "level",
                header: "Level",
                cell: ({ row }) => {
                    const isTotal = row.original.level === "Total";
                    return (
                        <div
                            className={`font-medium ${isTotal ? "font-bold" : ""}`}
                        >
                            {row.getValue("level")}
                        </div>
                    );
                }
            }
        ];

        // Add product columns from fixed PRODUCTS list
        PRODUCTS.forEach((product) => {
            cols.push({
                accessorKey: product,
                header: ({ column }) => {
                    const isAsc = column.getIsSorted() === "asc";
                    return (
                        <button
                            className="flex items-center justify-center gap-2 rounded-md p-2 hover:bg-slate-900"
                            onClick={() => column.toggleSorting(isAsc)}
                        >
                            <span>{product}</span>
                            {isAsc ? (
                                <MdArrowDownward className="h-4 w-4 shrink-0" />
                            ) : (
                                <MdArrowUpward className="h-4 w-4 shrink-0" />
                            )}
                        </button>
                    );
                },
                cell: ({ row }) => {
                    const isTotal = row.original.level === "Total";
                    const value = row.getValue(product) as number;
                    return (
                        <div
                            className={`text-center ${isTotal ? "font-bold" : ""}`}
                        >
                            {value}
                        </div>
                    );
                },
                sortingFn: (rowA, rowB, columnId) => {
                    const a = rowA.getValue(columnId) as number;
                    const b = rowB.getValue(columnId) as number;
                    return a - b;
                }
            });
        });

        // Add total column
        cols.push({
            accessorKey: "total",
            header: ({ column }) => {
                const isAsc = column.getIsSorted() === "asc";
                return (
                    <button
                        className="flex items-center justify-center gap-2 rounded-md p-2 hover:bg-backgroundGray/30"
                        onClick={() => column.toggleSorting(isAsc)}
                    >
                        <span className="font-bold">Total</span>
                        {isAsc ? (
                            <MdArrowDownward className="h-4 w-4 shrink-0" />
                        ) : (
                            <MdArrowUpward className="h-4 w-4 shrink-0" />
                        )}
                    </button>
                );
            },
            cell: ({ row }) => {
                const isTotal = row.original.level === "Total";
                const value = row.getValue("total") as number;
                return (
                    <div
                        className={`text-center font-bold ${isTotal ? "text-primary600" : ""}`}
                    >
                        {value}
                    </div>
                );
            },
            sortingFn: (rowA, rowB, columnId) => {
                const a = rowA.getValue(columnId) as number;
                const b = rowB.getValue(columnId) as number;
                return a - b;
            }
        });

        return cols;
    }, []);

    return (
        <ChartWrapper
            isEmpty={false}
            description="Product-wise machine count breakdown by stage"
            title="Level Product-Machine Count"
        >
            <div className="w-full">
                {selectedDate ? (
                    <div className="flex w-full items-center justify-end pb-2">
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
                <DataTable data={tableData} columns={columns} />
            </div>
        </ChartWrapper>
    );
};

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
                        table.getRowModel().rows.map((row) => {
                            const isTotal =
                                (row.original as ProductMachineRow).level ===
                                "Total";
                            return (
                                <TableRow
                                    className={`hover:bg-slate-800 ${isTotal ? "bg-backgroundGray/50" : ""}`}
                                    key={row.id}
                                    data-state={
                                        row.getIsSelected() && "selected"
                                    }
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
                            );
                        })
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
        </div>
    );
}

export default LeadsLevelProductMachinewise;
