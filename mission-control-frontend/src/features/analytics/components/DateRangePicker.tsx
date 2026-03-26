import dayjs, { Dayjs } from "dayjs";
import { cn } from "@/lib/utils";
import Calendar from "@/components/ui/Calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/Popover";
import { MdEditCalendar } from "react-icons/md";
import { DateRange } from "react-day-picker";

type DateRangePickerProps = {
    dateRange?: DateRange;
    setStartingTimestamp: (startingTimestamp?: Dayjs) => void;
    setEndingTimestamp: (endingTimestamp?: Dayjs) => void;
};

/**
 * Calendar component to select a timeframe
 */
export const DateRangePicker = ({
    className,
    dateRange,
    setStartingTimestamp,
    setEndingTimestamp
}: React.HTMLAttributes<HTMLDivElement> & DateRangePickerProps) => {
    const dateRangeHandler = (dateRange: DateRange | undefined) => {
        setStartingTimestamp(
            dateRange?.from ? dayjs(dateRange.from) : undefined
        );
        setEndingTimestamp(
            dateRange?.to ? dayjs(dateRange.to).endOf("day") : undefined
        );
    };

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <button
                        id="date"
                        className={cn(
                            "relative flex w-full items-center justify-start space-x-2 whitespace-nowrap rounded-md border border-border bg-gray-700 p-3 text-sm md:w-fit md:text-base ",
                            !dateRange && "text-neutral-400"
                        )}
                    >
                        <span className="hidden text-neutral-400 md:block">
                            Date range:
                        </span>
                        <div className="flex w-full items-center justify-between">
                            {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                        {dayjs(dateRange.from).format(
                                            "MMMM D, YYYY"
                                        )}
                                        {" - "}
                                        {dayjs(dateRange.to).format(
                                            "MMMM D, YYYY"
                                        )}
                                    </>
                                ) : (
                                    dayjs(dateRange.from).format("MMMM D, YYYY")
                                )
                            ) : (
                                <span>Pick a Date Range</span>
                            )}
                            <MdEditCalendar className="ml-4 h-5 w-5 text-neutral-400 hover:opacity-75" />
                        </div>
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    className="no-scrollbar max-h-[40vh] w-auto overflow-y-scroll rounded-md p-0 md:h-full"
                    align="start"
                >
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={dateRangeHandler}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
};
