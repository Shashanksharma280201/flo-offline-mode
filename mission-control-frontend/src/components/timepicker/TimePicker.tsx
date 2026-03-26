import * as React from "react";

import { TimePickerInput } from "./TimePickerInput";
import { TimePeriodSelect } from "./TimePickerSelect";
import { Period } from "./timePickerUtils";

interface TimePickerDemoProps {
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
    showLabel?: boolean;
}

export function TimePicker({
    date,
    setDate,
    showLabel = true
}: TimePickerDemoProps) {
    const [period, setPeriod] = React.useState<Period>("PM");

    const minuteRef = React.useRef<HTMLInputElement>(null);
    const hourRef = React.useRef<HTMLInputElement>(null);
    const secondRef = React.useRef<HTMLInputElement>(null);
    const periodRef = React.useRef<HTMLButtonElement>(null);

    return (
        <div className="flex items-end gap-2">
            <div className="grid gap-1 text-center">
                {showLabel && (
                    <label htmlFor="12hours" className="text-xs">
                        Hours
                    </label>
                )}
                <TimePickerInput
                    picker="12hours"
                    period={period}
                    date={date}
                    setDate={setDate}
                    ref={hourRef}
                    onRightFocus={() => minuteRef.current?.focus()}
                />
            </div>
            <div className="grid gap-1 text-center">
                {showLabel && (
                    <label htmlFor="minutes" className="text-xs">
                        Min
                    </label>
                )}
                <TimePickerInput
                    picker="minutes"
                    id="minutes12"
                    date={date}
                    setDate={setDate}
                    ref={minuteRef}
                    onLeftFocus={() => hourRef.current?.focus()}
                    onRightFocus={() => secondRef.current?.focus()}
                />
            </div>
            <div className="grid gap-1 text-center">
                {showLabel && (
                    <label htmlFor="seconds" className="text-xs">
                        Seconds
                    </label>
                )}
                <TimePickerInput
                    picker="seconds"
                    id="seconds12"
                    date={date}
                    setDate={setDate}
                    ref={secondRef}
                    onLeftFocus={() => minuteRef.current?.focus()}
                    onRightFocus={() => periodRef.current?.focus()}
                />
            </div>
            <div className="grid gap-1 text-center">
                {showLabel && (
                    <label htmlFor="period" className="text-xs">
                        Period
                    </label>
                )}
                <TimePeriodSelect
                    period={period}
                    setPeriod={setPeriod}
                    date={date}
                    setDate={setDate}
                    ref={periodRef}
                    onLeftFocus={() => secondRef.current?.focus()}
                />
            </div>
        </div>
    );
}
