import { useCallback, useEffect, useState } from "react";

import { useRobotStore } from "../../stores/robotStore";

import { Ros } from "roslib";

export const useRos = () => {
    const [
        robot,
        ros,
        setRos,
        isRobotConnected,
        setIsRobotConnected,
        robotUrl,
        setRosError,
        isRosConnecting,
        setIsRosConnecting
    ] = useRobotStore((state) => [
        state.robot,
        state.ros,
        state.setRos,
        state.isRobotConnected,
        state.setIsRobotConnected,
        state.robotUrl,
        state.setRosError,
        state.isRosConnecting,
        state.setIsRosConnecting
    ]);
    const [reconnect, setReconnect] = useState(false);
    useEffect(() => {
        try {
            // Skip ROS connection for MMR robots (they use MQTT instead)
            if (robot?.macAddress) {
                console.log('MMR robot detected, skipping ROS connection');
                setIsRosConnecting(false);
                setRosError(undefined);
                return;
            }

            if (!robotUrl || !robotUrl.rosbridgeUrl) {
                throw new Error("No ROS URL to establish connection");
            }
            let ros: Ros;
            setIsRosConnecting(true);
            // Use ws:// for localhost (offline mode), wss:// for remote (online mode)
            const protocol = robotUrl.rosbridgeUrl.includes('127.0.0.1') || robotUrl.rosbridgeUrl.includes('localhost') ? 'ws://' : 'wss://';
            ros = new Ros({ url: `${protocol}${robotUrl.rosbridgeUrl}` });
            // ros = new Ros({ url: `ws://192.168.0.121:9090` });
            setRos(ros);
            return () => {
                ros.close();
            };
        } catch (error: any) {
            setRosError(error);
        }
    }, [robotUrl, robot?.macAddress]);

    useEffect(() => {
        if (ros) {
            console.log("Robot Connection", ros.isConnected);
            setIsRobotConnected(ros.isConnected);
            if (ros.isConnected) {
                setReconnect(false);
            } else {
                setReconnect(true);
            }
        }
    }, [ros?.isConnected]);

    useEffect(() => {
        ros?.on("connection", () => {
            setIsRosConnecting(false);
            setRosError(undefined);
            console.log("Connected to ROS via Rosbridge.");
        });

        ros?.on("error", (error: any) => {
            setIsRosConnecting(false);
            console.log("Error connecting to websocket server: ", error);
            setRosError(new Error("Error connecting to ROS websocket server"));
        });

        ros?.on("close", (event: any) => {
            console.log("Connection to ROS via Rosbridge closed.", event);
            setIsRosConnecting(false);
        });
    }, [ros]);

    useEffect(() => {
        return () => {
            if (ros?.isConnected) {
                console.log("Closing ROS");
                ros?.close();
            }
        };
    }, []);

    useEffect(() => {
        // Skip reconnect logic for MMR robots (they use MQTT instead)
        if (robot?.macAddress) {
            return;
        }

        let intervalId: any;
        if (reconnect) {
            intervalId = setInterval(() => {
                if (robotUrl?.rosbridgeUrl) {
                    if (!isRobotConnected && !isRosConnecting) {
                        console.log("Trying to Reconnect ROS");
                        // Use ws:// for localhost (offline mode), wss:// for remote (online mode)
                        const protocol = robotUrl.rosbridgeUrl.includes('127.0.0.1') || robotUrl.rosbridgeUrl.includes('localhost') ? 'ws://' : 'wss://';
                        ros?.connect(`${protocol}${robotUrl.rosbridgeUrl}`);
                    }
                }
            }, 5000);
        }
        return () => {
            clearInterval(intervalId);
        };
    }, [reconnect, isRobotConnected, isRosConnecting, robotUrl, ros, robot?.macAddress]);
};
