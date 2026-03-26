import Calendar from "@/components/ui/Calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/Popover";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { useState } from "react";
import { IoMdCalendar } from "react-icons/io";

type Props = {
    variant?: "text" | "input";
    selectedDate?: Date;
    onDateSelect: (date?: Date) => void;
    className?: string;
};

export const LeadsDatePicker = ({
    variant = "text",
    selectedDate,
    onDateSelect,
    className
}: Props) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const selectDateHandler = (date?: Date) => {
        onDateSelect(date);
        setIsPopoverOpen(false);
    };

    return (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild className={"cursor-pointer"}>
                {variant === "text" ? (
                    selectedDate ? (
                        <span className={className}>
                            {dayjs(selectedDate).format("D MMM YYYY")}
                        </span>
                    ) : (
                        <span className={cn("text-gray-400", className)}>
                            Select Date
                        </span>
                    )
                ) : (
                    <div
                        className={cn(
                            "flex items-center justify-between rounded-md border border-border px-4 py-2",
                            className
                        )}
                    >
                        {selectedDate ? (
                            <span>
                                {dayjs(selectedDate).format("D MMM YYYY")}
                            </span>
                        ) : (
                            <span>Select Date</span>
                        )}
                        <IoMdCalendar className="size-5 text-white" />
                    </div>
                )}
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="mt-2 flex items-center justify-center rounded-md border border-backgroundGray bg-black"
            >
                <Calendar
                    initialFocus
                    mode="single"
                    defaultMonth={new Date()}
                    selected={selectedDate}
                    onSelect={selectDateHandler}
                />
            </PopoverContent>
        </Popover>
    );
};
