import { useEffect, useState } from "react";
import { useRosFns } from "./useRosFns";
import { Message } from "roslib";
import { useRobotStore } from "../../stores/robotStore";

const useRos2Action = (
    actionName: string,
    actionType: string,
    resultCallback: (result: any) => void,
    feedbackCallback: (feedback: any) => void,
    setIsActionInProgress: (isActionInProgress: boolean) => void
) => {
    const isRobotConnected = useRobotStore((state) => state.isRobotConnected);
    const [startSubscription, setStartSubscription] = useState(false);
    const { rosPublish, rosSubscribe } = useRosFns();

    const startRosAction = (payload: any) => {
        const actionGoalPublisher = rosPublish(
            actionName + "/goal",
            actionType + "ActionGoal"
        );
        if (actionGoalPublisher) {
            const actionGoal = new Message(payload);
            actionGoalPublisher?.publish(actionGoal);
            setIsActionInProgress(true);
            setStartSubscription(true);
        } else {
            throw new Error("Robot is offline");
        }
    };

    useEffect(() => {
        const feedbackSubscriber = rosSubscribe(
            actionName + "/feedback",
            actionType + "ActionFeedback"
        );
        const resultSubscriber = rosSubscribe(
            actionName + "/result",
            actionType + "ActionResult"
        );
        if (startSubscription) {
            feedbackSubscriber?.subscribe(feedbackCallback);
            resultSubscriber?.subscribe((result: any) => {
                if (result) {
                    setIsActionInProgress(false);
                    setStartSubscription(false);
                    feedbackSubscriber?.unsubscribe();
                    resultSubscriber?.unsubscribe();
                    resultCallback(result);
                }
            });
        }
    }, [startSubscription, actionName, actionType, isRobotConnected]);

    return { startRosAction };
};
export default useRos2Action;
