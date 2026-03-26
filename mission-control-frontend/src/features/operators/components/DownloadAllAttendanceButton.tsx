import dayjs from "dayjs";
import { TbCalendarDown } from "react-icons/tb";
import { useMutation } from "react-query";
import {
    fetchAllOperatorsAttendance,
    fetchAllOperatorsAttendanceForAllClients
} from "../services/operatorService";
import {
    downloadAttendanceInClientFormat,
    downloadAttendanceInLabourNetFormat
} from "../utils/attendanceCalculator";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/Popover";
import Calendar from "@/components/ui/Calendar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

const DownloadAllAttendanceButton = () => {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: dayjs().startOf("month").toDate(),
        to: dayjs().endOf("month").toDate()
    });

    const {
        mutate: mutateFetchLabourNetAttendance,
        isLoading: isLabourAttendanceLoading
    } = useMutation({
        mutationFn: ({
            startingTimestamp,
            endingTimestamp
        }: {
            startingTimestamp: number;
            endingTimestamp: number;
        }) =>
            fetchAllOperatorsAttendance({
                startingTimestamp,
                endingTimestamp
            }),
        onSuccess: (data, variables) => {
            downloadAttendanceInLabourNetFormat(
                data,
                variables.startingTimestamp,
                variables.endingTimestamp
            );
        },
        onError: (err) => console.log(err)
    });

    const {
        mutate: mutateFetchClientFormatAttendance,
        isLoading: isClientAttendanceLoading
    } = useMutation({
        mutationFn: ({
            startingTimestamp,
            endingTimestamp
        }: {
            startingTimestamp: number;
            endingTimestamp: number;
        }) =>
            fetchAllOperatorsAttendanceForAllClients({
                startingTimestamp,
                endingTimestamp
            }),
        onSuccess: (data, variables) => {
            downloadAttendanceInClientFormat(
                data,
                variables.startingTimestamp,
                variables.endingTimestamp
            );
        },
        onError: (err) => console.log(err)
    });

    const handleLabourNetFormatDownload = () => {
        if (!dateRange?.from || !dateRange?.to) return;
        const startingTimestamp = dayjs(dateRange.from).startOf("day").valueOf();
        const endingTimestamp = dayjs(dateRange.to).endOf("day").valueOf();
        mutateFetchLabourNetAttendance({
            startingTimestamp,
            endingTimestamp
        });
    };

    const handleClientFormatDownload = () => {
        if (!dateRange?.from || !dateRange?.to) return;
        const startingTimestamp = dayjs(dateRange.from).startOf("day").valueOf();
        const endingTimestamp = dayjs(dateRange.to).endOf("day").valueOf();
        mutateFetchClientFormatAttendance({
            startingTimestamp,
            endingTimestamp
        });
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className="flex cursor-pointer items-center gap-x-2 bg-green-800 md:rounded-md md:border md:p-2.5 md:font-semibold md:hover:border-green-600 md:hover:bg-green-600">
                    <div className="hidden text-sm md:block md:text-base">
                        {dateRange?.from ? (
                            dateRange.to ? (
                                <>
                                    {dayjs(dateRange.from).format("MMM D")} -{" "}
                                    {dayjs(dateRange.to).format("MMM D, YYYY")}
                                </>
                            ) : (
                                dayjs(dateRange.from).format("MMM D, YYYY")
                            )
                        ) : (
                            "Pick Range"
                        )}
                    </div>
                    {isLabourAttendanceLoading || isClientAttendanceLoading ? (
                        <LoadingSpinner className="h-5 w-5 animate-spin fill-white text-center text-background" />
                    ) : (
                        <TbCalendarDown className="h-6 w-6 md:h-5 md:w-5" />
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto border-backgroundGray bg-backgroundGray p-0"
                align="end"
            >
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    className="p-3"
                />
                <div className="flex flex-col gap-1 border-t border-border p-2">
                    <button
                        onClick={handleClientFormatDownload}
                        disabled={
                            !dateRange?.from ||
                            !dateRange?.to ||
                            isClientAttendanceLoading
                        }
                        className="cursor-pointer rounded-md px-3 py-2 text-left text-sm text-white transition-colors hover:bg-neutral-100 hover:text-black disabled:opacity-50"
                    >
                        {isClientAttendanceLoading
                            ? "Downloading..."
                            : "Client format"}
                    </button>
                    <button
                        onClick={handleLabourNetFormatDownload}
                        disabled={
                            !dateRange?.from ||
                            !dateRange?.to ||
                            isLabourAttendanceLoading
                        }
                        className="cursor-pointer rounded-md px-3 py-2 text-left text-sm text-white transition-colors hover:bg-neutral-100 hover:text-black disabled:opacity-50"
                    >
                        {isLabourAttendanceLoading
                            ? "Downloading..."
                            : "Labournet format"}
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default DownloadAllAttendanceButton;
