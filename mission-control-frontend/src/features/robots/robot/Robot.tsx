import Header from "@/components/header/Header";
import { useRobotStore } from "@/stores/robotStore";
import { useUserStore } from "@/stores/userStore";
import { Tab } from "@headlessui/react";
import { useEffect, useLayoutEffect } from "react";
import {
    Link,
    NavLink,
    Navigate,
    Outlet,
    useNavigate,
    useParams
} from "react-router-dom";
import RobotProfile from "./robotProfile/RobotProfile";
import RobotIssues from "./robotIssues/RobotIssues";
import { useMutation } from "react-query";
import { getRobotFn } from "../services/robotsService";
import { errorLogger } from "@/util/errorLogger";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type RobotParams = {
    robotId: string;
};

const Robot = () => {
    const { robotId } = useParams<RobotParams>();
    const robots = useUserStore((state) => state.robots);
    const [robot, setRobot] = useRobotStore((state) => [
        state.robot,
        state.setRobot
    ]);
    const navigate = useNavigate();

    const robotMutation = useMutation(
        (robotId: string) => getRobotFn(robotId),
        {
            onSuccess(data) {
                setRobot(data);
            },
            onError(error) {
                errorLogger(error);
                navigate("/robots", { replace: true });
            }
        }
    );

    useEffect(() => {
        if (!robotId) {
            navigate(-1);
            return;
        }

        if (!robot || robot.id !== robotId) {
            const availableRobot = robots.find((robot) => robot.id === robotId);
            if (availableRobot) {
                setRobot(availableRobot);
                return;
            }
            robotMutation.mutate(robotId);
        }
    }, [robotId, robot, robots]);

    return (
        <div>
            {robot ? (
                <>
                    <Header
                        onBack={() => navigate("/robots")}
                        title={robot.name}
                    />
                    <section className="flex flex-col">
                        <ul className="flex min-h-[3rem] w-full items-center gap-6 border-b border-t border-border bg-gray-800 px-6 text-sm md:gap-8 md:border-t-0 md:px-8 md:text-lg">
                            <NavLink
                                className={({ isActive }) =>
                                    `outline-none hover:opacity-100 ${isActive ? "opacity-100" : "opacity-50"}`
                                }
                                to={`/robots/${robotId}/profile`}
                            >
                                Profile
                            </NavLink>
                            <NavLink
                                className={({ isActive }) =>
                                    `outline-none hover:opacity-100 ${isActive ? "opacity-100" : "opacity-50"}`
                                }
                                to={`/robots/${robotId}/operators`}
                            >
                                Operators
                            </NavLink>
                            <NavLink
                                className={({ isActive }) =>
                                    `outline-none hover:opacity-100 ${isActive ? "opacity-100" : "opacity-50"}`
                                }
                                to={`/robots/${robotId}/issues`}
                            >
                                Issues
                            </NavLink>
                            <NavLink
                                className={({ isActive }) =>
                                    `outline-none hover:opacity-100 ${isActive ? "opacity-100" : "opacity-50"}`
                                }
                                to={`/robots/${robotId}/manufacturing-data`}
                            >
                                Manufacturing
                            </NavLink>
                            <NavLink
                                className={({ isActive }) =>
                                    `outline-none hover:opacity-100 ${isActive ? "opacity-100" : "opacity-50"}`
                                }
                                to={`/robots/${robotId}/motor-data`}
                            >
                                Battery-Motor
                            </NavLink>
                            <NavLink
                                className={({ isActive }) =>
                                    `outline-none hover:opacity-100 ${isActive ? "opacity-100" : "opacity-50"}`
                                }
                                to={`/robots/${robotId}/tasks`}
                            >
                                Tasks
                            </NavLink>
                            <NavLink
                                className={({ isActive }) =>
                                    `outline-none hover:opacity-100 ${isActive ? "opacity-100" : "opacity-50"}`
                                }
                                to={`/robots/${robotId}/shipping`}
                            >
                                Shipping
                            </NavLink>
                            <NavLink
                                className={({ isActive }) =>
                                    `outline-none hover:opacity-100 ${isActive ? "opacity-100" : "opacity-50"}`
                                }
                                to={`/robots/${robotId}/billing`}
                            >
                                Billing
                            </NavLink>
                        </ul>
                        <div className="w-full">
                            <Outlet
                                context={{
                                    robot,
                                    fetchRobotDetails: () => {
                                        robotMutation.mutate(robot.id);
                                    }
                                }}
                            />
                        </div>
                    </section>
                </>
            ) : (
                <div className="flex h-screen w-full flex-col items-center justify-center gap-6 md:gap-8">
                    <LoadingSpinner className="h-6 w-6 animate-spin fill-white text-center text-blue-900/25" />
                    <span>Fetching Robot details</span>
                </div>
            )}
        </div>
    );
};
export default Robot;
