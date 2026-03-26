import { useRobotStore } from "@/stores/robotStore";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import RobotCalendar from "../calendarView/RobotCalendar";
import { CalendarEvent } from "../calendarView/CalendarView";
import { RobotType } from "@/data/types";

type RobotSessionOutletProps = RobotType;

const RobotSessionsCalendar = () => {
    const { robotId } = useParams();
    const navigate = useNavigate();
    const robot = useOutletContext<RobotSessionOutletProps>();

    const showAnalysisPanelHandler = (event: CalendarEvent) => {
        if (event.title === "Maintenance") {
            navigate(`/robots/${robotId}/maintenance/${event.sessionId}`);
        } else {
            navigate(`/robots/${robotId}/sessions/${event.sessionId}`);
        }
    };

    return robot ? (
        <RobotCalendar
            onDoubleClickEvent={showAnalysisPanelHandler}
            robot={robot}
        />
    ) : (
        <div className="flex h-[70vh] flex-col items-center justify-center">
            <img
                className="mb-8 w-36"
                src="/errorRobotGreen.png"
                alt="Broken down robot"
            />
            <span>Please Select a Robot To view Session calendar</span>
        </div>
    );
};

export default RobotSessionsCalendar;
