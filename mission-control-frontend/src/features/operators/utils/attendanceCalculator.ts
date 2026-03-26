import dayjs from "dayjs";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

type AttendanceEntry = {
    entryType: "attendance" | "checkIn" | "checkOut";
    checkInStatus: "late" | "ontime" | "early";
    clientName: string;
    operatorName: string;
    timestamp: number;
    id: string;
};

type ClientAttendanceEntry = {
    timestamp: number;
    client: string;
    operatingHours: number;
    checkInTimeWithZone: string;
    operator: string;
    robot: string;
    checkInTimestamp?: number;
    checkOutTimestamp?: number;
};

type ClientFormat = {
    Date: string;
    Day: string;
    "Work Description": string;
    // @ts-ignore
    [operator: string]: string;
    // @ts-ignore
    [robot: string]: string;
};

type LabourNetFormat = {
    "Sl.no": number;
    "LN Associate No.": string;
    "Associate Name": string;
    "Date of Joining": string;
    "Date of Leaving": string;
    "Mobile No.": string;
    Department: string;
    Designation: string;
    "Working location": string;
    "Working State": string;
    "Weekly Holiday": string;
    Holiday: string;
    "Leave with Pay": string;
    "LOP Days": string;
    "Salary Cal. From": string;
    "Salary Cal. Up to": string;
    "Working Days": string;
    "Paid Days": string;
    "LOP Reversal / Arrear Month & Year": string;
    "LOP Reversal / Arrear Days": string;
    "Total Paid Days": string;
    Remarks: string;
    [date: string]: string | number;
};

export const downloadAttendanceInLabourNetFormat = (
    attendanceData: AttendanceEntry[],
    startingTimestamp: number,
    endingTimestamp: number
) => {
    if (attendanceData.length === 0) {
        toast.info("No data to download");
        return;
    }
    const operatorData = attendanceData.reduce(
        (acc, data) => {
            const operatorName = data.operatorName;
            if (
                data.entryType === "attendance" ||
                data.entryType === "checkIn"
            ) {
                if (acc[operatorName]) {
                    acc[operatorName].clientName = data.clientName;
                    acc[operatorName][dayjs(data.timestamp).format("D-MMM")] =
                        "P";
                } else {
                    acc[operatorName] = {
                        clientName: data.clientName,
                        [dayjs(data.timestamp).format("D-MMM")]: "P"
                    };
                }
            }
            return acc;
        },
        {} as {
            [operator: string]: {
                clientName: string;
                [date: string]: string;
            };
        }
    );

    const diffDays = dayjs(endingTimestamp).diff(dayjs(startingTimestamp), "day") + 1;
    const daysInRange = Array.from(Array(diffDays).keys());

    const dataToDownload = Object.keys(operatorData).map(
        (operatorName, idx) => {
            const operator = operatorData[operatorName];
            const formatDate: Partial<LabourNetFormat> = {
                "Sl.no": idx + 1,
                "LN Associate No.": "-",
                "Associate Name": operatorName,
                "Date of Joining": "-",
                "Date of Leaving": "-",
                "Mobile No.": "-",
                Department: "-",
                Designation: "-",
                "Working location": operator.clientName
            };

            daysInRange.forEach((dayOffset) => {
                const date = dayjs(startingTimestamp).add(dayOffset, "day");
                const dateFormatted = date.format("D-MMM");
                if (operator[dateFormatted]) {
                    formatDate[dateFormatted] = "P";
                } else if (date.day() === 0) {
                    formatDate[dateFormatted] = "WH";
                } else {
                    formatDate[dateFormatted] = "A";
                }
            });

            return {
                ...formatDate,
                "Working State": "-",
                "Weekly Holiday": "-",
                Holiday: "-",
                "Leave with Pay": "-",
                "LOP Days": "-",
                "Salary Cal. From": "-",
                "Salary Cal. Up to": "-",
                "Working Days": "-",
                "Paid Days": "-",
                "LOP Reversal / Arrear Month & Year": "-",
                "LOP Reversal / Arrear Days": "-",
                "Total Paid Days": "-",
                Remarks: "-"
            } as LabourNetFormat;
        }
    );

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(dataToDownload);
    worksheet["!cols"] = [];
    Object.keys(dataToDownload[0] || {}).forEach(() => {
        worksheet["!cols"]?.push({
            wpx: 65
        });
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, "attendance");

    XLSX.writeFile(
        workbook,
        `Attendance_labournet_${dayjs(startingTimestamp).format("MMM")}_to_${dayjs(endingTimestamp).format("MMM")}.xlsx`,
        { compression: true }
    );
};

export const downloadAttendanceInClientFormat = (
    attendanceData: ClientAttendanceEntry[],
    startingTimestamp: number,
    endingTimestamp: number
) => {
    if (attendanceData.length === 0) {
        toast.info("No data to download");
        return;
    }

    // Debug: Log sample data to check if checkInTimestamp/checkOutTimestamp exist
    console.log("Sample attendance data (first 3 entries):", attendanceData.slice(0, 3));
    const hasCheckInData = attendanceData.some(d => d.checkInTimestamp || d.checkOutTimestamp);
    console.log("Has check-in/check-out timestamp data:", hasCheckInData);

    const clientData = attendanceData.reduce(
        (acc, data) => {
            const date = dayjs(data.timestamp).format("DD/MM/YYYY");
            if (!acc[data.client]) {
                acc[data.client] = {
                    robots: {},
                    operators: {},
                    dates: {}
                };
            }

            acc[data.client].robots[data.robot] = "0";
            acc[data.client].operators[data.operator] = "absent";
            acc[data.client].operators[`${data.operator} Check In`] = "-";
            acc[data.client].operators[`${data.operator} Check Out`] = "-";
            acc[data.client].operators[`${data.operator} Difference`] = "-";

            if (!acc[data.client].dates[date]) {
                acc[data.client].dates[date] = {};
            }

            const currentDateData = acc[data.client].dates[date];
            currentDateData[data.robot] = `${data.operatingHours}`;
            currentDateData[data.operator] = "present";

            // Process Check In/Out
            if (data.checkInTimestamp || data.checkOutTimestamp) {
                const operatorCheckInKey = `${data.operator}_checkInTimestamp`;
                const operatorCheckOutKey = `${data.operator}_checkOutTimestamp`;

                if (data.checkInTimestamp) {
                    currentDateData[operatorCheckInKey] = Math.min(
                        (currentDateData[operatorCheckInKey] as number) ||
                        Infinity,
                        data.checkInTimestamp
                    );
                }
                if (data.checkOutTimestamp) {
                    currentDateData[operatorCheckOutKey] = Math.max(
                        (currentDateData[operatorCheckOutKey] as number) || 0,
                        data.checkOutTimestamp
                    );
                }

                const firstCheckIn = currentDateData[operatorCheckInKey] as number;
                const lastCheckOut = currentDateData[operatorCheckOutKey] as number;

                if (firstCheckIn && firstCheckIn !== Infinity) {
                    currentDateData[`${data.operator} Check In`] = dayjs(firstCheckIn).format("HH:mm");
                }

                if (lastCheckOut && lastCheckOut !== 0) {
                    currentDateData[`${data.operator} Check Out`] = dayjs(lastCheckOut).format("HH:mm");
                }

                // Difference calculation: (actual_checkout - scheduled_checkout)
                if (firstCheckIn && lastCheckOut && data.checkInTimeWithZone && data.operatingHours) {
                    try {
                        const [scheduledCheckInTime] = data.checkInTimeWithZone.split(",");
                        if (scheduledCheckInTime) {
                            const [hour, minute] = scheduledCheckInTime.split(":").map(Number);

                            const scheduledCheckOut = dayjs(firstCheckIn).startOf("day")
                                .hour(hour)
                                .minute(minute)
                                .add(data.operatingHours, "hour");

                            const diffMinutesTotal = dayjs(lastCheckOut).diff(scheduledCheckOut, "minute");
                            const isNegative = diffMinutesTotal < 0;
                            const absMinutes = Math.abs(diffMinutesTotal);
                            const h = Math.floor(absMinutes / 60);
                            const m = absMinutes % 60;
                            const formattedDiff = `${isNegative ? "-" : "+"}${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

                            currentDateData[`${data.operator} Difference`] = formattedDiff;
                        }
                    } catch (e) {
                        console.error("Error calculating difference", e);
                        currentDateData[`${data.operator} Difference`] = "ERR";
                    }
                }
            }

            return acc;
        },
        {} as {
            [client: string]: {
                robots: { [robot: string]: string };
                operators: { [operator: string]: string };
                dates: {
                    [date: string]: {
                        [key: string]: string | number;
                    };
                };
            };
        }
    );

    const clientMappedToData: {
        [client: string]: ClientFormat[];
    } = Object.keys(clientData).reduce(
        (acc, clientName) => {
            const { dates, operators, robots } = clientData[clientName];

            const diffDays = dayjs(endingTimestamp).diff(dayjs(startingTimestamp), "day") + 1;
            const daysInRange = Array.from(Array(diffDays).keys());

            const mappedData = daysInRange.map((dayOffset) => {
                const dayObj = dayjs(startingTimestamp).add(dayOffset, "day");
                const date = dayObj.format("DD/MM/YYYY");
                const day = dayObj.format("dddd");

                // Filter out internal timestamp keys (keys ending with _checkInTimestamp or _checkOutTimestamp)
                const dateData = dates[date] || {};
                const filteredDateData = Object.keys(dateData).reduce((acc, key) => {
                    if (!key.endsWith('_checkInTimestamp') && !key.endsWith('_checkOutTimestamp')) {
                        acc[key] = dateData[key];
                    }
                    return acc;
                }, {} as { [key: string]: string | number });

                let finalObj: ClientFormat = {
                    Date: date,
                    Day: day,
                    "Work Description": "-",
                    ...operators,
                    ...robots,
                    ...filteredDateData
                };
                return finalObj;
            });

            return { ...acc, [clientName]: mappedData };
        },
        {} as { [client: string]: ClientFormat[] }
    );

    const workbook = XLSX.utils.book_new();
    Object.keys(clientMappedToData).forEach((client) => {
        const worksheet = XLSX.utils.json_to_sheet(clientMappedToData[client]);
        worksheet["!cols"] = [];
        Object.keys(clientMappedToData[client][0] || {}).forEach(() => {
            worksheet["!cols"]?.push({
                wpx: 120
            });
        });
        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            client.length > 31 ? `${client.substring(0, 28)}...` : client
        );
    });
    XLSX.writeFile(workbook, "Attendance.xlsx", { compression: true });
};
