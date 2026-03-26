import { useEffect, useState } from "react";
import { useRosFns } from "../../../lib/ros/useRosFns";
import { useRobotStore } from "../../../stores/robotStore";

const SonarIndicator = () => {
    const [sonarColor, setSonarColor] = useState<{
        left: string | undefined;
        right: string | undefined;
    }>({
        left: undefined,
        right: undefined
    });
    const [robot, config, isRobotConnected] = useRobotStore((state) => [
        state.robot,
        state.robot?.config,
        state.isRobotConnected
    ]);
    const { rosSubscribe } = useRosFns();
    const sonarListenerRight = rosSubscribe(
        "/sonar/front/right",
        "sensor_msgs/msg/Range",
        {
            queue_size: 1,
            queue_length: 1,
            throttle_rate: 500
        }
    );
    const sonarListenerLeft = rosSubscribe(
        "/sonar/front/left",
        "sensor_msgs/msg/Range",
        {
            queue_size: 1,
            queue_length: 1,
            throttle_rate: 500
        }
    );
    useEffect(() => {
        sonarListenerRight?.subscribe((message: any) => {
            if (message.range < 2) {
                setSonarColor((prev) => {
                    return {
                        ...prev,
                        right: "from-orange-400"
                    };
                });
            } else if (message.range < 0.5) {
                setSonarColor((prev) => {
                    return {
                        ...prev,
                        right: "from-red-500"
                    };
                });
            } else {
                setSonarColor((prev) => {
                    return {
                        ...prev,
                        right: undefined
                    };
                });
            }
        });
        sonarListenerLeft?.subscribe((message: any) => {
            if (message.range < 0.5) {
                setSonarColor((prev) => {
                    return {
                        ...prev,
                        left: "from-red-400"
                    };
                });
            } else if (message.range < 2) {
                setSonarColor((prev) => {
                    return {
                        ...prev,
                        left: "from-orange-500"
                    };
                });
            } else {
                setSonarColor((prev) => {
                    return {
                        ...prev,
                        left: undefined
                    };
                });
            }
        });
        return () => {
            sonarListenerLeft?.unsubscribe();
            sonarListenerRight?.unsubscribe();
        };
    }, [isRobotConnected]);

    return (
        <>
            {sonarColor.left && (
                <div
                    className={`fixed h-[100vh] w-[1vw] bg-gradient-to-r ${sonarColor.left} pointer-events-none z-40 to-transparent  `}
                ></div>
            )}

            {sonarColor.right && (
                <div
                    className={`fixed right-0 h-[100vh] w-[1vw] bg-gradient-to-l  ${sonarColor.right} pointer-events-none z-40 to-transparent `}
                ></div>
            )}
        </>
    );
};
export default SonarIndicator;
