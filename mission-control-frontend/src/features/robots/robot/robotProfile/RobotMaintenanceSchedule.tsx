import { cn } from "@/lib/utils";
import { useMemo } from "react";

type RobotMaintenanceScheduleProps = {
    maintenanceSchedule: Set<number>;
    className?: string;
    disabled?: boolean;
    setMaintenanceSchedule: (selectedDays: Set<number>) => void;
};

const RobotMaintenanceSchedule = ({
    maintenanceSchedule,
    setMaintenanceSchedule,
    disabled = false,
    className
}: RobotMaintenanceScheduleProps) => {
    const schedule = useMemo(
        () => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        []
    );

    const scheduleSelectHandler = (index: number) => {
        if (maintenanceSchedule.has(index)) {
            maintenanceSchedule.delete(index);
        } else {
            maintenanceSchedule.add(index);
        }
        setMaintenanceSchedule(new Set(maintenanceSchedule));
    };

    return (
        <ul
            className={cn(
                "flex w-full appearance-none items-center justify-around rounded-md border border-border bg-transparent text-sm text-white placeholder:text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:required:border-red-400 md:text-lg",
                className
            )}
        >
            {schedule.map((dayOfWeek, index) => (
                <li
                    onClick={() => {
                        !disabled && scheduleSelectHandler(index);
                    }}
                    className={`${!disabled && "cursor-pointer hover:text-white/90"} select-none p-3 ${maintenanceSchedule.has(index) ? "text-white" : "text-neutral-600"} `}
                    key={dayOfWeek}
                >
                    {dayOfWeek}
                </li>
            ))}
        </ul>
    );
};

export default RobotMaintenanceSchedule;
