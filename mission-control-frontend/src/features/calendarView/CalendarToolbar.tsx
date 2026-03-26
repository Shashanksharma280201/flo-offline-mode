import { Navigate, ToolbarProps, View } from "react-big-calendar";
import dayjs from "dayjs";
import {
    MdChevronLeft,
    MdChevronRight,
    MdExpandLess,
    MdExpandMore
} from "react-icons/md";
import ViewsListBox from "./ViewsListBox";
import { useEffect } from "react";

const CalendarToolbar = ({
    date,
    label,
    localizer: { messages },
    onNavigate,
    onView,
    view,
    views
}: ToolbarProps) => {
    useEffect(() => {
        onView(view);
    }, []);
    return (
        <div className="flex items-center justify-between py-6 md:py-8 ">
            <section className="flex items-center justify-center gap-2">
                <span className="text-base font-semibold md:text-xl">
                    {label}
                </span>
            </section>
            <section className="flex items-center justify-center gap-4">
                <button
                    onClick={() => onNavigate(Navigate.PREVIOUS)}
                    aria-label={String(messages.previous || "Previous")}
                >
                    <MdChevronLeft className="h-4 w-4 hover:opacity-75 md:h-5 md:w-5" />
                </button>
                <button
                    onClick={() => onNavigate(Navigate.NEXT)}
                    aria-label={String(messages.next || "Next")}
                >
                    <MdChevronRight className="h-4 w-4 hover:opacity-75 md:h-5 md:w-5" />
                </button>
                <ViewsListBox
                    view={view}
                    views={views as View[]}
                    messages={messages}
                    onView={onView}
                />
                <button
                    onClick={() => onNavigate(Navigate.TODAY)}
                    aria-label={String(messages.today || "Today")}
                    className="rounded-md border border-white px-4 py-2 text-xs md:text-base"
                >
                    Today
                </button>
            </section>
        </div>
    );
};
export default CalendarToolbar;
