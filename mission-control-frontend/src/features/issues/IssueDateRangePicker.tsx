import Calendar from "@/components/ui/Calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/Popover";
import { DateRange } from "react-day-picker";
import { IoMdCalendar } from "react-icons/io";
import dayjs from "dayjs";

export const IssueDateRangePicker = ({
    dateRange,
    onDateRangeChange
}: {
    dateRange: DateRange;
    onDateRangeChange: (dateRange?: DateRange) => void;
}) => {
    return (
        <Popover>
            <PopoverTrigger asChild className="cursor-pointer">
                <div className="flex min-h-[3rem] grow items-center justify-between rounded-md border border-border bg-backgroundGray/30 px-4">
                    <p>
                        {dateRange && dateRange.from
                            ? dateRange.to
                                ? `${dayjs(dateRange.from).format("MMM D")} - ${dayjs(dateRange.to).format("MMM D")}`
                                : dayjs(dateRange.from).format("MMM D")
                            : "All dates"}
                    </p>
                    <IoMdCalendar size={24} color="white" />
                </div>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="mt-2 flex items-center justify-center rounded-md border border-backgroundGray bg-black"
            >
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={onDateRangeChange}
                />
            </PopoverContent>
        </Popover>
    );
};
