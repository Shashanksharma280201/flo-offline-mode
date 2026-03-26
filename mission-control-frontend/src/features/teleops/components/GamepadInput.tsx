import { useState, useEffect, useCallback } from "react";

type GamepadInputProps = {
    onLeftStickXChange?: (value: number) => void;
    onRightStickYChange?: (value: number) => void;
    onA?: (value: boolean) => void;
    onB?: (value: boolean) => void;
    onX?: (value: boolean) => void;
    onY?: (value: boolean) => void;
    onDPadUp?: (value: boolean) => void;
    onDPadDown?: (value: boolean) => void;
    onLeftStickPress?: (value: boolean) => void;
    onGamePad?: (gamepad: Gamepad) => void;
};

export default function GamepadInput({
    onLeftStickXChange,
    onRightStickYChange,
    onA,
    onB,
    onX,
    onY,
    onDPadUp,
    onDPadDown,
    onLeftStickPress,
    onGamePad
}: GamepadInputProps): null {
    const [gamepad, setGamepad] = useState<Gamepad | null>(null);

    const handleGamepadInput = useCallback(() => {
        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[0];

        if (gamepad) {
            console.info("Gamepad is Active");
            const leftStickX = gamepad?.axes[0];
            const rightStickY = -gamepad?.axes[3];
            const buttonA = gamepad?.buttons[0]?.pressed;
            const buttonB = gamepad?.buttons[1]?.pressed;
            const buttonX = gamepad?.buttons[2]?.pressed;
            const buttonY = gamepad?.buttons[3]?.pressed;
            const dPadUp = gamepad?.buttons[12]?.pressed;
            const dPadDown = gamepad?.buttons[13]?.pressed;
            const leftStickButton = gamepad?.buttons[10]?.pressed;

            if (onLeftStickXChange) {
                onLeftStickXChange(leftStickX);
            }

            if (onRightStickYChange) {
                onRightStickYChange(rightStickY);
            }
            if (onA) {
                onA(buttonA);
            }
            if (onB) {
                onB(buttonB);
            }
            if (onX) {
                onX(buttonX);
            }
            if (onY) {
                onY(buttonY);
            }
            if (onDPadUp) {
                onDPadUp(dPadUp);
            }
            if (onDPadDown) {
                onDPadDown(dPadDown);
            }
            if (onLeftStickPress) {
                onLeftStickPress(leftStickButton);
            }
            if (onGamePad) {
                onGamePad(gamepad);
            }
        }
    }, [
        onLeftStickXChange,
        onRightStickYChange,
        onA,
        onB,
        onX,
        onY,
        onDPadUp,
        onDPadDown,
        onLeftStickPress,
        onGamePad
    ]);

    useEffect(() => {
        const handleGamepadConnected = (event: GamepadEvent) => {
            console.log(`Gamepad connected at index ${event.gamepad.index}`);
            setGamepad(event.gamepad);
        };
        const gamepads = navigator.getGamepads();
        if (gamepads[0]) {
            setGamepad(gamepads[0]);
        }
        window.addEventListener("gamepadconnected", handleGamepadConnected);

        return () => {
            window.removeEventListener(
                "gamepadconnected",
                handleGamepadConnected
            );
            console.info("Gamepad is Inactive");
            setGamepad(null);
        };
    }, []);

    useEffect(() => {
        let requestId: number;

        const pollGamepadInput = () => {
            handleGamepadInput();
            requestId = window.requestAnimationFrame(pollGamepadInput);
        };

        const startPolling = () => {
            if (gamepad) {
                pollGamepadInput();
            } else {
                requestId = window.requestAnimationFrame(startPolling);
            }
        };

        startPolling();

        return () => {
            window.cancelAnimationFrame(requestId);
        };
    }, [gamepad, handleGamepadInput]);

    return null;
}
