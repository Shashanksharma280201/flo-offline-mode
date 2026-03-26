import { useEffect, useRef, useState } from "react";
import { Joystick } from "react-joystick-component";
import { useRobotConfigStore } from "../../../stores/robotConfigStore";
import GamepadInput from "./GamepadInput";
import { useRosFns } from "../../../lib/ros/useRosFns";
import { useRobotStore } from "../../../stores/robotStore";
import { GamePadMessage } from "../../../data/types";
import { useJanusStore } from "../../../stores/janusStore";

type JoystickPublisherProps = {
    isGamepadEnabled: boolean;
    className?: string;
};

const defaultGamePadMessage: GamePadMessage = {
    axis0: 0,
    axis1: 0,
    axis2: 0,
    axis3: 0,
    button0: {
        pressed: false,
        value: 0
    },
    button1: {
        pressed: false,
        value: 0
    },
    button2: {
        pressed: false,
        value: 0
    },
    button3: {
        pressed: false,
        value: 0
    },
    button4: {
        pressed: false,
        value: 0
    },
    button5: {
        pressed: false,
        value: 0
    },
    button6: {
        pressed: false,
        value: 0
    },
    button7: {
        pressed: false,
        value: 0
    },
    button8: {
        pressed: false,
        value: 0
    },
    button9: {
        pressed: false,
        value: 0
    },
    button10: {
        pressed: false,
        value: 0
    },
    button11: {
        pressed: false,
        value: 0
    },
    button12: {
        pressed: false,
        value: 0
    },
    button13: {
        pressed: false,
        value: 0
    },
    button14: {
        pressed: false,
        value: 0
    },
    button15: {
        pressed: false,
        value: 0
    },
    button16: {
        pressed: false,
        value: 0
    },
    connected: false,
    id: "",
    index: 0,
    mapping: "",
    timestamp: 0
};

const JoystickPublisher = ({
    isGamepadEnabled,
    className
}: JoystickPublisherProps) => {
    const [isWindowFocused, setIsWindowFocused] = useState(true);
    const gamepadRef = useRef({ ...defaultGamePadMessage });
    const [robotId, tcpOnly, isRobotConnected] = useRobotStore((state) => [
        state.robot?.id,
        state.tcpOnly,
        state.isRobotConnected
    ]);
    const [isAvoidObsctacle] = useRobotConfigStore((state) => [
        state.isAvoidObstacle
    ]);
    const [vRPubHandle, isJanusFeedSubscriber, isJanusDataPeerActive] =
        useJanusStore((state) => [
            state.vRPubHandle,
            state.isJanusFeedSubscriber,
            state.isJanusDataPeerActive
        ]);

    const { rosPublish } = useRosFns();
    /**
     * Handles movement of the Joystick component
     * @param event- movements from JoyStick
     */
    const handleMove = (event: any) => {
        //event.x and event.y ranges from -50 to +50
        console.info("Joystick is Active");
        let x = event.x;
        let y = event.y;

        const gamepadData = { ...defaultGamePadMessage };
        gamepadData.axis2 = x;
        gamepadData.axis3 = -y;
        if (isAvoidObsctacle) {
            gamepadData.button7 = {
                pressed: true,
                value: 1
            };
        }
        gamepadRef.current = gamepadData;
    };

    /**
     * Resets linearX and angularZ state
     *
     */
    const handleStop = (event: any) => {
        console.log(event);
        console.info("Joystick is Inactive");
        gamepadRef.current = { ...defaultGamePadMessage };
    };

    const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
        event.preventDefault();
        gamepadRef.current = { ...defaultGamePadMessage };
    };

    useEffect(() => {
        /**
         * Publishes Zero values when component unmounts
         *
         */

        return () => {
            gamepadRef.current = { ...defaultGamePadMessage };
        };
    }, []);

    useEffect(() => {
        if (!isGamepadEnabled) {
            gamepadRef.current = { ...defaultGamePadMessage };
        }
    }, [isGamepadEnabled]);

    useEffect(() => {
        const handleWindowBlur = () => {
            setIsWindowFocused(false);
        };

        const handleWindowFocus = () => {
            setIsWindowFocused(true);
        };

        window.addEventListener("blur", handleWindowBlur);
        window.addEventListener("focus", handleWindowFocus);

        window.addEventListener("gamepaddisconnected", handleStop);
        window.addEventListener("beforeunload", beforeUnloadHandler);

        return () => {
            window.removeEventListener("gamepaddisconnected", handleStop);
            window.removeEventListener("beforeunload", beforeUnloadHandler);
            window.removeEventListener("blur", handleWindowBlur);
            window.removeEventListener("focus", handleWindowFocus);
        };
    }, []);

    useEffect(() => {
        /**
         * Publishes Teleoperation data to ROS
         *
         */
        const gamePadTopic = rosPublish("/mmr/gamepad", "mmr/msg/GamePad");
        // const pingTopic = rosPublish("/ping", "std_msgs/msg/String");

        const publishInterval = setInterval(() => {
            if (tcpOnly) {
                if (gamePadTopic) {
                    gamePadTopic?.publish(
                        isWindowFocused
                            ? gamepadRef.current
                            : { ...defaultGamePadMessage }
                    );
                }
            } else {
                vRPubHandle?.data({
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    text: JSON.stringify(
                        isWindowFocused
                            ? gamepadRef.current
                            : { ...defaultGamePadMessage }
                    ),
                    error: function (reason) {
                        console.error(reason);
                    }
                });
            }
        }, 100);
        return () => {
            clearInterval(publishInterval);
        };
    }, [tcpOnly, gamepadRef, vRPubHandle, isWindowFocused,isRobotConnected]);

    return (
        <>
            {isGamepadEnabled ? (
                <>
                    <GamepadInput
                        onGamePad={(gamepad) => {
                            if (gamepad) {
                                const {
                                    axes,
                                    buttons,
                                    connected,
                                    id,
                                    index,
                                    mapping,
                                    timestamp
                                } = gamepad;
                                const gamePadMessage = {
                                    axis0: axes[0],
                                    axis1: axes[1],
                                    axis2: axes[2],
                                    axis3: axes[3],
                                    button0: {
                                        pressed: buttons[0].pressed,
                                        value: buttons[0].value
                                    },
                                    button1: {
                                        pressed: buttons[1].pressed,
                                        value: buttons[1].value
                                    },
                                    button2: {
                                        pressed: buttons[2].pressed,
                                        value: buttons[2].value
                                    },
                                    button3: {
                                        pressed: buttons[3].pressed,
                                        value: buttons[3].value
                                    },
                                    button4: {
                                        pressed: buttons[4].pressed,
                                        value: buttons[4].value
                                    },
                                    button5: {
                                        pressed: buttons[5].pressed,
                                        value: buttons[5].value
                                    },
                                    button6: {
                                        pressed: buttons[6].pressed,
                                        value: buttons[6].value
                                    },
                                    button7: {
                                        pressed: buttons[7].pressed,
                                        value: buttons[7].value
                                    },
                                    button8: {
                                        pressed: buttons[8].pressed,
                                        value: buttons[8].value
                                    },
                                    button9: {
                                        pressed: buttons[9].pressed,
                                        value: buttons[9].value
                                    },
                                    button10: {
                                        pressed: buttons[10].pressed,
                                        value: buttons[10].value
                                    },
                                    button11: {
                                        pressed: buttons[11].pressed,
                                        value: buttons[11].value
                                    },
                                    button12: {
                                        pressed: buttons[12].pressed,
                                        value: buttons[12].value
                                    },
                                    button13: {
                                        pressed: buttons[13].pressed,
                                        value: buttons[13].value
                                    },
                                    button14: {
                                        pressed: buttons[14].pressed,
                                        value: buttons[14].value
                                    },
                                    button15: {
                                        pressed: buttons[15].pressed,
                                        value: buttons[15].value
                                    },
                                    button16: {
                                        pressed: buttons[16].pressed,
                                        value: buttons[16].value
                                    },
                                    connected,
                                    id,
                                    index,
                                    mapping,
                                    timestamp
                                };

                                gamepadRef.current = gamePadMessage;
                            }
                        }}
                    />
                </>
            ) : (
                <div
                    className={`absolute bottom-10 right-10 mb-5 mt-24 flex h-[130px] w-[130px] items-center justify-center rounded-full ${
                        tcpOnly
                            ? isRobotConnected
                                ? "bg-green-400"
                                : "bg-red-400"
                            : isJanusDataPeerActive
                              ? "bg-green-400"
                              : "bg-red-400"
                    }    ${className}`}
                >
                    <Joystick
                        size={125}
                        stickSize={50}
                        sticky={false}
                        baseColor="#191414"
                        stickColor="white"
                        move={handleMove}
                        stop={handleStop}
                    ></Joystick>
                </div>
            )}
        </>
    );
};
export default JoystickPublisher;
