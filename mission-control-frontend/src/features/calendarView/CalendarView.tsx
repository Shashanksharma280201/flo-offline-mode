import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";
import dayjs from "dayjs";
import { Calendar, dayjsLocalizer, View, Event } from "react-big-calendar";
import CalendarToolbar from "./CalendarToolbar";
import { useRobotSessionsStore } from "../../stores/robotSessionsStore";

import minMax from "dayjs/plugin/minMax";
dayjs.extend(minMax);
const localizer = dayjsLocalizer(dayjs);

export interface CalendarEvent extends Event {
    sessionId: string | undefined;
}

type CalendarViewProps = {
    events: Event[];
    onRangeChange?:
        | ((
              range:
                  | Date[]
                  | {
                        start: Date;
                        end: Date;
                    },
              view?: View | undefined
          ) => void | undefined)
        | undefined;
    onDoubleClickEvent: (event: CalendarEvent) => void;
};

/**
 * 
 * Displays a calendar depicting the dates on which the robot operated, 
 * double clicking an event opens details for that session with details
 * 
 */
const CalendarView = ({
    events,
    onRangeChange,
    onDoubleClickEvent
}: CalendarViewProps) => {
    const [touchHold, setTouchHold] = useState(false);
    const [touchTimeoutId, setTouchTimeoutId] = useState<NodeJS.Timeout>();
    const [date, setDate, selectedEvent, setSelectedEvent, view, setView] =
        useRobotSessionsStore((state) => [
            state.date,
            state.setDate,
            state.selectedEvent,
            state.setSelectedEvent,
            state.view,
            state.setView
        ]);

    // Scroll to selectedEvent or the first event if not available
    useEffect(() => {
        if (date && view === "day") {
            const filteredDates = events
                .filter((event) =>
                    dayjs(event.start).isSame(dayjs(date), "day")
                )
                .map((event) => dayjs(event.start));

            let scrollToTime = dayjs.min(filteredDates)?.toDate();

            if (
                selectedEvent?.start &&
                dayjs(date).isSame(selectedEvent.start, "date")
            )
                scrollToTime = selectedEvent.start;

            const scrollView = document.querySelector(".rbc-time-content");

            if (scrollToTime && scrollView) {
                const totalTimeInMin = 24 * 60;
                const eventTimeInMin =
                    scrollToTime?.getHours() * 60 + scrollToTime?.getMinutes();
                const scrollHeight = scrollView.scrollHeight;

                // totalTimeInMin -> scrollHeight
                // eventTimeInMin -> scrollPosition
                const scrollPosition =
                    (scrollHeight * eventTimeInMin) / totalTimeInMin;
                scrollView.scrollTop = scrollPosition;
            }
        }
    }, [view]);

    const { views, components } = useMemo(
        () => ({
            components: {
                toolbar: CalendarToolbar
            },
            views: {
                month: true,
                week: true,
                day: true
            }
        }),
        []
    );

    const eventPropGetter = useCallback(
        (event: Event, start: Date, end: Date, isSelected: boolean) => ({
            ...(dayjs(start).isSame(selectedEvent?.start) && {
                className: "bg-purple-600"
            })
        }),
        [selectedEvent]
    );

    useEffect(() => {
        if (touchHold && selectedEvent) {
            onDoubleClickEvent(selectedEvent as CalendarEvent);
        }
    }, [selectedEvent, touchHold]);

    return (
        <div
            onTouchStart={(event) => {
                const touchTimeoutId = setTimeout(() => {
                    setTouchHold(true);
                }, 1000);
                setTouchTimeoutId(touchTimeoutId);
            }}
            onTouchEnd={() => {
                clearTimeout(touchTimeoutId);
                setTouchHold(false);
            }}
            className="h-[70vh] w-full pb-6 md:h-screen md:pb-8"
        >
            <Calendar
                events={events}
                onRangeChange={onRangeChange}
                view={view}
                onView={setView}
                step={10}
                timeslots={1}
                date={date}
                enableAutoScroll={true}
                onNavigate={setDate}
                selected={selectedEvent}
                onSelectEvent={setSelectedEvent}
                eventPropGetter={eventPropGetter}
                onDoubleClickEvent={(event) => {
                    onDoubleClickEvent(event as CalendarEvent);
                }}
                components={components}
                views={views}
                localizer={localizer}
                startAccessor="start"
                endAccessor="end"
            />
        </div>
    );
};

export default CalendarView;
