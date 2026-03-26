import { useEffect, useState } from "react";
import { MdCopyAll, MdSearch } from "react-icons/md";
import { toast } from "react-toastify";

import Header from "../components/header/Header";
import ComboBox from "../components/comboBox/ComboBox";
import { RobotType } from "../data/types";
import { useUserStore } from "../stores/userStore";
import { useRobotStore } from "../stores/robotStore";
import useRobots from "@/hooks/useRobots";
import {
    Outlet,
    useNavigate,
    useLocation,
    Link,
    useParams
} from "react-router-dom";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type HeaderTitle = "Robot Calendar" | "Session" | "Maintenance";

/**
 *
 * This page displays information about the robot sessions, the components being
 * * Cards - Distance travelled, Operation Time, Energy Consumed for the time period
 * * Robot calendar - displays a calendar depicting the dates on which the robot operated,
 * double clicking an event opens details for that session with details:
 *   * The event can be of maintenance type in which case all the pictures taken for the maintenance will be displayed
 *   * VideoPanel - video captured by the robot during the session
 *   * GpsPanel - path taken by the robot during session depicted on google maps
 *   * DistancePanel - a graph depicting the distance travelled by robot during the session
 *   * BatteryPanel - a graph depicting the battery percentage of the robot during the session
 *
 */
const Sessions = () => {
    const { robotId } = useParams();
    const navigate = useNavigate();

    // location -> /robots/:robotId/sessions/:sessionId
    const location = useLocation();
    const locationParts = location.pathname.substring(1).split("/");

    const [headerTitle, setHeaderTitle] =
        useState<HeaderTitle>("Robot Calendar");
    const [selectedRobot, setSelectedRobot] = useRobotStore((state) => [
        state.robot,
        state.setRobot
    ]);
    const robots = useUserStore((state) => state.robots);

    const [showRobotComboBox, setShowRobotComboBox] = useState(false);

    // useRobots now returns a query, not a mutation
    const { isLoading } = useRobots();

    useEffect(() => {
        if (location.pathname.includes("maintenance")) {
            setHeaderTitle("Maintenance");
        } else if (
            location.pathname.includes("sessions") &&
            locationParts.length > 3
        ) {
            setHeaderTitle("Session");
        } else {
            setHeaderTitle("Robot Calendar");
        }
    }, [location]);

    const selectRobotHandler = (robot: RobotType | undefined) => {
        if (robot) {
            navigate(`/robots/${robot.id}/sessions`);
            setSelectedRobot(robot);
        }
    };

    useEffect(() => {
        if (!isLoading && robots) {
            const robot = robots.find((it) => it.id == locationParts[1]);
            setSelectedRobot(robot);
            navigate(location);
        }
    }, [isLoading, robots]);

    return (
        <div className="flex min-h-screen w-screen flex-col overflow-y-auto bg-blue-900/25">
            <Header
                onBack={() =>
                    locationParts[locationParts.length - 1] === "sessions"
                        ? navigate(`/robots/`, {
                              replace: true
                          })
                        : navigate(`/robots/${robotId}/sessions`, {
                              replace: true
                          })
                }
                title={
                    <div className="flex items-center gap-2  text-xs text-neutral-400  md:gap-4  md:text-xl">
                        <span className="cursor-default text-base font-semibold text-white md:text-xl">
                            {headerTitle}
                        </span>
                    </div>
                }
            >
                <div className="hidden md:flex">
                    <ComboBox
                        label="Robot"
                        items={robots}
                        selectedItem={selectedRobot}
                        setSelectedItem={selectRobotHandler}
                        getItemLabel={(robot) => robot?.name ?? ""}
                        placeholder="Select Robots"
                        isLoading={isLoading}
                    />
                </div>
                <div className="flex md:hidden">
                    <MdSearch
                        onClick={() => setShowRobotComboBox((prev) => !prev)}
                        className="h-6 w-6 text-white hover:opacity-75"
                    />
                </div>
            </Header>
            <main className="-mt-6 h-full min-h-fit overflow-y-auto px-6 md:mt-0 md:px-8">
                {showRobotComboBox ? (
                    <div className="mb-6 flex md:hidden">
                        <ComboBox
                            label="Robot"
                            items={robots}
                            selectedItem={selectedRobot}
                            setSelectedItem={setSelectedRobot}
                            getItemLabel={(robot) => robot?.name ?? ""}
                            placeholder="Select Robots"
                            isLoading={isLoading}
                        />
                    </div>
                ) : (
                    <></>
                )}

                {selectedRobot ? (
                    <Outlet context={selectedRobot} />
                ) : (
                    <div className="flex h-[70vh] flex-col items-center justify-center">
                        <img
                            className="mb-8 w-36"
                            src="/errorRobotGreen.png"
                            alt="Broken down robot"
                        />
                        <span>
                            Please Select a Robot To view Session calendar
                        </span>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Sessions;
