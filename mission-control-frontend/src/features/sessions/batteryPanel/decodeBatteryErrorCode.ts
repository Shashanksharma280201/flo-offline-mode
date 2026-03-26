export type ErrorCode =
    | "errorCode1"
    | "errorCode2"
    | "errorCode3"
    | "errorCode4"
    | "errorCode5"
    | "errorCode6"
    | "errorCode7"
    | "errorCode8";

export const BATTERY_ERROR_CODES: ErrorCode[] = [
    "errorCode1",
    "errorCode2",
    "errorCode3",
    "errorCode4",
    "errorCode5",
    "errorCode6",
    "errorCode7",
    "errorCode8"
];

export const decodeBatteryErrorCode = (
    errorCode: number,
    errorCodeName: ErrorCode
) => {
    const errorCodeBinary = errorCode.toString(2);

    const errors: string[] = [];
    switch (errorCodeName) {
        case "errorCode1": {
            errorCodeBinary[0] == "1"
                ? errors.push("Cell volt high level 1")
                : null;
            errorCodeBinary[1] == "1"
                ? errors.push("Cell volt high level 2")
                : null;
            errorCodeBinary[2] == "1"
                ? errors.push("Cell volt low level 1")
                : null;
            errorCodeBinary[3] == "1"
                ? errors.push("Cell volt low level 2")
                : null;
            errorCodeBinary[4] == "1"
                ? errors.push("Sum volt high level 1")
                : null;
            errorCodeBinary[5] == "1"
                ? errors.push("Sum volt high level 2")
                : null;
            errorCodeBinary[6] == "1"
                ? errors.push("Sum volt low level 1")
                : null;
            errorCodeBinary[7] == "1"
                ? errors.push("Sum volt low level 2")
                : null;
            break;
        }
        case "errorCode2": {
            errorCodeBinary[0] == "1"
                ? errors.push("Chg temp high level 1")
                : null;
            errorCodeBinary[1] == "1"
                ? errors.push("Chg temp high level 2")
                : null;
            errorCodeBinary[2] == "1"
                ? errors.push("Chg temp low level 1")
                : null;
            errorCodeBinary[3] == "1"
                ? errors.push("Chg temp low level 2")
                : null;
            errorCodeBinary[4] == "1"
                ? errors.push("Dischg temp high level 1")
                : null;
            errorCodeBinary[5] == "1"
                ? errors.push("Dischg temp high level 2")
                : null;
            errorCodeBinary[6] == "1"
                ? errors.push("Dischg temp low level 1")
                : null;
            errorCodeBinary[7] == "1"
                ? errors.push("Dischg temp low level 2")
                : null;
            break;
        }
        case "errorCode3": {
            errorCodeBinary[0] == "1"
                ? errors.push("Chg overcurrent level 1")
                : null;
            errorCodeBinary[1] == "1"
                ? errors.push("Chg overcurrent level 2")
                : null;
            errorCodeBinary[2] == "1"
                ? errors.push("Dischg overcurrent level 1")
                : null;
            errorCodeBinary[3] == "1"
                ? errors.push("Dischg overcurrent level 2")
                : null;
            errorCodeBinary[4] == "1" ? errors.push("SOC high level 1") : null;
            errorCodeBinary[5] == "1" ? errors.push("SOC high level 2") : null;
            errorCodeBinary[6] == "1" ? errors.push("SOC low level 1") : null;
            errorCodeBinary[7] == "1" ? errors.push("SOC low level 2") : null;
            break;
        }
        case "errorCode4": {
            errorCodeBinary[0] == "1" ? errors.push("Diff volt level 1") : null;
            errorCodeBinary[1] == "1" ? errors.push("Diff volt level 2") : null;
            errorCodeBinary[2] == "1" ? errors.push("Diff temp level 1") : null;
            errorCodeBinary[3] == "1" ? errors.push("Diff temp level 2") : null;
            break;
        }
        case "errorCode5": {
            errorCodeBinary[0] == "1"
                ? errors.push("Chg MOS temp high alarm")
                : null;
            errorCodeBinary[1] == "1"
                ? errors.push("Dischg MOS temp high alarm")
                : null;
            errorCodeBinary[2] == "1"
                ? errors.push("Chg MOS temp sensor err")
                : null;
            errorCodeBinary[3] == "1"
                ? errors.push("Dischg MOS temp sensor err")
                : null;
            errorCodeBinary[4] == "1"
                ? errors.push("Chg MOS adhesion err")
                : null;
            errorCodeBinary[5] == "1"
                ? errors.push("Dischg MOS adhesion err")
                : null;
            errorCodeBinary[6] == "1"
                ? errors.push("Chg MOS open circuit err")
                : null;
            errorCodeBinary[7] == "1"
                ? errors.push("Discrg MOS open circuit err")
                : null;
            break;
        }
        case "errorCode6": {
            errorCodeBinary[0] == "1"
                ? errors.push("AFE collect chip err")
                : null;
            errorCodeBinary[1] == "1"
                ? errors.push("Voltage collect dropped")
                : null;
            errorCodeBinary[2] == "1"
                ? errors.push("Cell temp sensor err")
                : null;
            errorCodeBinary[3] == "1" ? errors.push("EEPROM err") : null;
            errorCodeBinary[4] == "1" ? errors.push("RTC err") : null;
            errorCodeBinary[5] == "1" ? errors.push("Precharge failure") : null;
            errorCodeBinary[6] == "1"
                ? errors.push("Communication failure")
                : null;
            errorCodeBinary[7] == "1"
                ? errors.push("Internal communication failure")
                : null;
            break;
        }
        case "errorCode7": {
            errorCodeBinary[0] == "1"
                ? errors.push("Current module fault")
                : null;
            errorCodeBinary[1] == "1"
                ? errors.push("Sum voltage detect fault")
                : null;
            errorCodeBinary[2] == "1"
                ? errors.push("Short circuit protect fault")
                : null;
            errorCodeBinary[3] == "1"
                ? errors.push("Low volt forbidden chg fault")
                : null;
            break;
        }
        case "errorCode8": {
            errorCode == 0 ? null : errors.push("Fault code");
        }
    }
    return errors;
};
