import { RobotType, SonarMessage } from "../data/types";
import { Ros } from "roslib";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

/**
 * Types for log messages coming from Robotic Operating System
 *
 * [ROS2 reference](https://docs.ros2.org/foxy/api/rcl_interfaces/msg/Log.html)
 *
 **/
export type LogMessage = {
    stamp: { sec: number; nanosec: number };
    level: number;
    name: string;
    function: string;
    file: string;
    msg: string;
    line: number;
};

type RobotState = {
    robot: RobotType | undefined;
    status: string | undefined;
    state: {
        mode: string | undefined;
        location: string | undefined;
        connectedClients?:
            | {
                  [x: string]: {
                      name: string;
                      email: string;
                  };
              }
            | undefined;
    };
    robotUrl:
        | {
              rosbridgeUrl: string | undefined;
              sshUrl: string | undefined;
          }
        | undefined;
    ros?: Ros;
    isRobotConnected: boolean;
    isRosConnecting: boolean;
    autoConnect?: boolean;
    rosError: Error | undefined;
    logs: LogMessage[];
    location: {
        latitude: number | undefined;
        longitude: number | undefined;
    };
    sonarData: { [sonarName: string]: SonarMessage } | undefined;
    isTeleOperating: boolean;
    tcpOnly: boolean;
};

type RobotActions = {
    setRobot: (robot: RobotType | undefined) => void;
    setIsRobotConnected: (isRobotConnected: boolean) => void;
    setIsRosConnecting: (isRosConnecting: boolean) => void;
    setRobotStatus: (status: string | undefined) => void;
    setRobotState: (state: {
        mode: string;
        location: string;
        connectedClients?: {
            [x: string]: {
                name: string;
                email: string;
            };
        };
    }) => void;
    setRobotConnectedClients: (connectedClients: {
        [x: string]: {
            name: string;
            email: string;
        };
    }) => void;
    setRobotUrl: (
        urlData:
            | {
                  rosbridgeUrl: string | undefined;
                  sshUrl: string | undefined;
              }
            | undefined
    ) => void;
    setRos: (ros: Ros) => void;
    setRosError: (rosError: Error | undefined) => void;
    addLog: (log: LogMessage) => void;
    setLogs: (logs: LogMessage[]) => void;
    setLatitude: (latitude: number) => void;
    setLongitude: (longitude: number) => void;
    setSonarData: (sonarData: { [sonarName: string]: SonarMessage }) => void;
    setTcpOnly: (tcpOnly: boolean) => void;
    setIsTeleOperating: (isTeleOperating: boolean) => void;
    setBaseStationId: (baseStationId: string) => void;
    resetRobot: () => void;
};

const initialState: RobotState = {
    robot: undefined,
    ros: undefined,
    isRobotConnected: false,
    isRosConnecting: false,
    state: {
        mode: undefined,
        location: undefined,
        connectedClients: undefined
    },
    logs: [],
    status: undefined,
    robotUrl: undefined,
    rosError: undefined,
    location: {
        latitude: undefined,
        longitude: undefined
    },
    sonarData: undefined,
    isTeleOperating: true,
    tcpOnly: true
};

/**
 * Zustand store for robots
 */
export const useRobotStore = create<RobotState & RobotActions>()(
    devtools(
        immer((set, get) => ({
            ...initialState,
            setRobot: (newRobot) => {
                set({ robot: newRobot });
            },
            setRobotStatus: (status) => {
                set({ status });
            },
            setRobotState: ({ mode, location, connectedClients }) => {
                set({
                    state: {
                        mode,
                        location,
                        connectedClients
                    }
                });
            },
            setRobotConnectedClients: (connectedClients) =>
                set((state) => {
                    state.state.connectedClients = connectedClients;
                }),

            setRobotUrl: (urlData) => {
                set({ robotUrl: urlData });
            },
            setRos: (ros) => {
                set({ ros });
            },
            setIsRobotConnected: (isRobotConnected) => {
                set({ isRobotConnected });
            },
            setIsRosConnecting: (isRosConnecting) => {
                set({ isRosConnecting });
            },
            setRosError: (rosError) => {
                set({
                    rosError
                });
            },
            setLogs: (logs) => {
                set({ logs });
            },
            addLog: (log) => {
                set((state) => ({ logs: [log, ...state.logs] }));
            },
            setLatitude: (latitude) => {
                set((state) => ({
                    location: {
                        latitude: latitude,
                        longitude: state.location.longitude
                    }
                }));
            },
            setLongitude: (longitude) => {
                set((state) => ({
                    location: {
                        latitude: state.location.latitude,
                        longitude: longitude
                    }
                }));
            },
            setSonarData: (sonarData) => {
                set((state) => ({
                    sonarData: {
                        ...state.sonarData,
                        ...sonarData
                    }
                }));
            },
            setTcpOnly: (tcpOnly) => {
                set({ tcpOnly });
            },
            setIsTeleOperating: (isTeleOperating) => {
                set({ isTeleOperating });
            },
            setBaseStationId: (baseStationId: string) => {
                set((state) => {
                    if (state.robot && state.robot.gps) {
                        state.robot.gps.baseStationId = baseStationId;
                    }
                });
            },
            resetRobot: () => {
                set(initialState);
            }
        }))
    )
);
