import { add, format } from "date-fns";
import { LuCalendar } from "react-icons/lu";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import Calendar from "@/components/ui/Calendar";

import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/Popover";
import { TimePicker } from "./TimePicker";
import dayjs from "dayjs";

type Props = {
    date?: Date;
    setDate: (date?: Date) => void;
};

export function DateTimePicker({ date, setDate }: Props) {
    /**
     * carry over the current time when a user clicks a new day
     * instead of resetting to 00:00
     */
    const handleSelect = (newDay: Date | undefined) => {
        if (!newDay) return;
        if (!date) {
            setDate(newDay);
            return;
        }
        const diff = newDay.getTime() - date.getTime();
        const diffInDays = diff / (1000 * 60 * 60 * 24);
        const newDateFull = add(date, { days: Math.ceil(diffInDays) });
        setDate(newDateFull);
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start border-border bg-background text-left font-normal",
                        !date && "text-muted-foreground"
                    )}
                >
                    <LuCalendar className="mr-2 h-4 w-4" />
                    {date ? (
                        dayjs(date).format("MMMM Do, YYYY h:mm:ss A")
                    ) : (
                        <span>Pick a date</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="flex w-auto flex-col p-0 sm:flex-row">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => handleSelect(d)}
                    initialFocus
                />
                <div className="border-t border-border p-3">
                    <TimePicker setDate={setDate} date={date} />
                </div>
            </PopoverContent>
        </Popover>
    );
}
