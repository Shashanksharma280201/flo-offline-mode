import ROSLIB, {
    Service,
    ServiceRequest,
    ServiceResponse,
    Topic
} from "roslib";
import { useRobotStore } from "../../stores/robotStore";

export type TopicOptions = {
    compression?: string | undefined;
    throttle_rate?: number | undefined;
    queue_size?: number | undefined;
    latch?: boolean | undefined;
    queue_length?: number | undefined;
    reconnect_on_close?: boolean | undefined;
};
export type ActionOptions = {
    timeout?: number | undefined;
    omitFeedback?: boolean | undefined;
    omitStatus?: boolean | undefined;
    omitResult?: boolean | undefined;
};
export type TfOptions = {
    angularThres?: number | undefined;
    transThres?: number | undefined;
    rate?: number | undefined;
    updateDelay?: number | undefined;
    topicTimeout?: number | undefined;
    serverName?: string | undefined;
    repubServiceName?: string | undefined;
};

export const useRosFns = () => {
    const ros = useRobotStore((state) => state.ros);
    const rosDisconnectHandler = () => {
        if (ros && ros.isConnected) {
            ros.close();
        }
    };
    const rosServiceCaller = (
        name: string,
        serviceType: string,
        callback: (resp: ServiceResponse | any) => void,
        failedCallback: (error: any) => void,
        request?: object
    ) => {
        if (!ros) {
            failedCallback(new Error("Not connected to Robot"));
        } else {
            const service = new Service({ ros, name, serviceType });
            const serviceRequest = new ServiceRequest(request);
            service.callService(serviceRequest, callback, failedCallback);
        }
    };

    const rosSubscribe = (
        name: string,
        messageType: string,
        options?: TopicOptions
    ) => {
        if (!ros) {
            // console.error("No ROS instance, Unable to create subscriber");
        } else {
            const listener = new Topic({ ros, name, messageType, ...options });
            return listener;
        }
    };
    const rosPublish = (
        name: string,
        messageType: string,
        options?: TopicOptions
    ) => {
        if (!ros) {
            // console.error("No ROS instance, Unable to create publisher");
        } else {
            const publisher = new Topic({ ros, name, messageType, ...options });
            return publisher;
        }
    };

    const rosTfClient = (
        fixedFrame: string,
        options: TfOptions | undefined
    ) => {
        if (!ros) {
            // console.error("No ROS instance, Unable to create ROS tf client");
        } else {
            const tfClient = new ROSLIB.TFClient({
                ros,
                fixedFrame,
                ...options
            });

            return tfClient;
        }
    };

    return {
        rosDisconnectHandler,
        rosServiceCaller,
        rosSubscribe,
        rosTfClient,
        rosPublish
    };
};
