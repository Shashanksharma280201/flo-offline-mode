import React, { useEffect, useMemo, useState } from "react";
import { useMutation } from "react-query";
import { getBatteryErrorsDataFn } from "../sensorService";
import { errorLogger } from "@/util/errorLogger";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import {
    BATTERY_ERROR_CODES,
    decodeBatteryErrorCode
} from "./decodeBatteryErrorCode";

type Props = {
    robotId?: string;
    sessionId?: string;
};

type BatteryError = {
    timestamp: number;
    error: number;
};

type BatteryErrors = {
    errorCode1: BatteryError[];
    errorCode2: BatteryError[];
    errorCode3: BatteryError[];
    errorCode4: BatteryError[];
    errorCode5: BatteryError[];
    errorCode6: BatteryError[];
    errorCode7: BatteryError[];
    errorCode8: BatteryError[];
};

const defaultBatteryErrors: BatteryErrors = {
    errorCode1: [],
    errorCode2: [],
    errorCode3: [],
    errorCode4: [],
    errorCode5: [],
    errorCode6: [],
    errorCode7: [],
    errorCode8: []
};

const BatteryErrorPanel = ({ robotId, sessionId }: Props) => {
    const [batteryErrors, setBatteryErrors] =
        useState<BatteryErrors>(defaultBatteryErrors);
    const [isFetched, setIsFetched] = useState(false);

    const { mutate: fetchBatteryErrorsData, isLoading } = useMutation(
        ({ robotId, sessionId }: { robotId: string; sessionId: string }) =>
            getBatteryErrorsDataFn(robotId, sessionId),
        {
            onSuccess: (data) => {
                setBatteryErrors(data);
                setIsFetched(true);
            },
            onError: (error: any) => {
                errorLogger(error);
                setIsFetched(true);
            }
        }
    );

    useEffect(() => {
        if (robotId && sessionId) {
            fetchBatteryErrorsData({
                robotId,
                sessionId
            });
        }
        return () => {
            setBatteryErrors(defaultBatteryErrors);
            setIsFetched(false);
        };
    }, [robotId, sessionId]);

    const hasAnyErrors = useMemo(() => {
        return Object.values(batteryErrors).some(errors => errors.length > 0);
    }, [batteryErrors]);

    if (isFetched && !hasAnyErrors) {
        return null;
    }

    return (
        <div className="flex w-full flex-col gap-6 rounded-md border border-border p-4">
            <div className="flex flex-col gap-2">
                <span className="text-2xl">Battery Status Panel</span>
                <span className="text-base text-neutral-400">
                    See the battery errors encountered during the session
                </span>
            </div>
            <BatteryErrorDisplay batteryErrors={batteryErrors} />
        </div>
    );
};

const BatteryErrorDisplay = ({
    batteryErrors
}: {
    batteryErrors: BatteryErrors;
}) => {
    const [selectedErrorCodeIdx, setSelectedErrorCodeIdx] = useState<number>(0);
    const selectedErrorCode = BATTERY_ERROR_CODES[selectedErrorCodeIdx];

    const formatErrorCode = (errorCode: string) => {
        return `${errorCode.charAt(0).toUpperCase()}${errorCode.slice(1, 5)} ${errorCode.slice(5, errorCode.length - 1)} ${errorCode[errorCode.length - 1]}`;
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-end gap-4">
                <div>{formatErrorCode(selectedErrorCode)}</div>
                <div className="flex gap-2">
                    <MdChevronLeft
                        className="cursor-pointer"
                        onClick={() =>
                            setSelectedErrorCodeIdx(
                                (selectedErrorCodeIdx -
                                    1 +
                                    BATTERY_ERROR_CODES.length) %
                                BATTERY_ERROR_CODES.length
                            )
                        }
                    />
                    <MdChevronRight
                        className="cursor-pointer"
                        onClick={() =>
                            setSelectedErrorCodeIdx(
                                (selectedErrorCodeIdx + 1) %
                                BATTERY_ERROR_CODES.length
                            )
                        }
                    />
                </div>
            </div>
            <div className="flex h-[300px] flex-col gap-2 overflow-y-auto rounded-md border border-border p-4">
                {batteryErrors[selectedErrorCode].length > 0 ? (
                    batteryErrors[selectedErrorCode].map((error, index) => {
                        const errorCode = selectedErrorCode;
                        const errors = decodeBatteryErrorCode(
                            error.error,
                            errorCode
                        );

                        return (
                            <div
                                key={index}
                                className={cn(
                                    "flex pb-2",
                                    index !==
                                    batteryErrors[selectedErrorCode]
                                        .length -
                                    1 && "border-b border-border"
                                )}
                            >
                                <div className="basis-1/3">
                                    {dayjs(error.timestamp * 1000).format(
                                        "D MMM - h:mm:ss a"
                                    )}
                                </div>
                                <div className="flex basis-2/3 flex-col">
                                    {errors.map((error) => (
                                        <span>{error}</span>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex h-full items-center justify-center text-white">
                        No errors
                    </div>
                )}
            </div>
        </div>
    );
};

export default BatteryErrorPanel;
