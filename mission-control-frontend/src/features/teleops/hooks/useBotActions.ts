import { Message } from "roslib";
import { useRosFns } from "../../../lib/ros/useRosFns";
import { useRobotConfigStore } from "../../../stores/robotConfigStore";

const useBotActions = () => {
    const { rosPublish, rosServiceCaller } = useRosFns();
    const [isAvoidObsctacle, setIsAvoidObstacle] = useRobotConfigStore(
        (state) => [state.isAvoidObstacle, state.setIsAvoidObstacle]
    );

    const switchBladeOn = () => {
        rosServiceCaller(
            "/blade/set_state",
            "/lm_msgs/srv/SetBladeState",
            (result) => {
                console.log(result);
            },
            (error) => {
                console.error(error);
            },
            {
                state: 1
            }
        );
    };
    const switchBladeOff = () => {
        rosServiceCaller(
            "/blade/set_state",
            "/lm_msgs/srv/SetBladeState",
            (result) => {
                console.log(result);
            },
            (error) => {
                console.error(error);
            },
            {
                state: 0
            }
        );
    };
    const pivotRobot = (pivotState: { data: boolean }) => {
        rosServiceCaller(
            "/enable_pivot",
            "/std_srvs/srv/SetBool",
            (result) => {
                console.log(result);
            },
            (error) => {
                console.error(error);
            },
            pivotState
        );
    };
    const increaseDeckHeightPublisher = rosPublish(
        "/deck/cmd",
        "lm_msgs/msg/DeckHeightCmd"
    );
    const decreaseDeckHeightPublisher = rosPublish(
        "/deck/cmd",
        "lm_msgs/msg/DeckHeightCmd"
    );

    const switchObstacleOn = () => {
        setIsAvoidObstacle(true);
    };
    const switchObstacleOff = () => {
        setIsAvoidObstacle(false);
    };

    const increaseDeckHeight = (value: boolean) => {
        increaseDeckHeightPublisher?.publish(
            new Message({
                cmd: value ? 0 : 2
            })
        );
    };
    const decreaseDeckHeight = (value: boolean) => {
        decreaseDeckHeightPublisher?.publish(
            new Message({
                cmd: value ? 1 : 2
            })
        );
    };

    return {
        switchBladeOn,
        switchBladeOff,
        switchObstacleOn,
        switchObstacleOff,
        increaseDeckHeight,
        decreaseDeckHeight,
        pivotRobot
    };
};
export default useBotActions;
