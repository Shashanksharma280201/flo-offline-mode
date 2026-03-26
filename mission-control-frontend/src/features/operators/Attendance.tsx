import { buttonVariants } from "@/components/ui/Button";
import * as XLSX from "xlsx";
import Calendar from "@/components/ui/Calendar";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import { useEffect, useState } from "react";
import { useMutation } from "react-query";
import { useOutletContext } from "react-router-dom";
import { fetchOperatorAttendance } from "./services/operatorService";
import { MdArrowLeft, MdArrowRight, MdDownload } from "react-icons/md";
import { AttendanceItem } from "./components/AttendanceItem";
import { toast } from "react-toastify";
import { OperatorAttendanceMap } from "./components/OperatorAttendanceMap";
import { getTimeDifference } from "@/util/timeFormatter";
import { Operator } from "@/data/types/appDataTypes";

dayjs.extend(advancedFormat);

type CalendarDate = {
    [date: string]: {
        checkIn?: {
            time: string;
            location: {
                lat: number;
                lng: number;
            };
            status: string;
        };
        checkOut?: {
            time: string;
            location: {
                lat: number;
                lng: number;
            };
        };
    };
};

type AttendancePayload = {
    attendanceData: {
        checkInStatus?: string;
        entryType: "checkIn" | "checkOut" | "attendance";
        startingTimestamp: string;
        location: {
            lat: number;
            lng: number;
        };
        _id: string;
    }[];
    totalAttended: number;
    totalOnTime: number;
};

type CSVFormattedDate = {
    Date: string;
    "Check In Time": string;
    "Check In Status": string;
    "Check Out Time": string;
    "Working duration (hours)": string;
};

// Helper function to get date key in consistent format (YYYY-MM-DD)
const getDateKey = (date: Date) => dayjs(date).format("YYYY-MM-DD");

const convertToCSVFriendlyData = (dates: CalendarDate) => {
    return Object.keys(dates).map((date) => {
        const currentKey = dates[date];
        let timeDiff = 0;
        if (currentKey.checkIn?.time && currentKey.checkOut?.time) {
            const msDiff =
                new Date(currentKey.checkOut?.time).getTime() -
                new Date(currentKey.checkIn?.time).getTime();
            timeDiff = msDiff / 1000 / 60 / 60;
        }

        const csvDate: CSVFormattedDate = {
            // Parse date with explicit format since keys are now YYYY-MM-DD
            Date: dayjs(date, "YYYY-MM-DD").format("DD/MM/YYYY"),
            "Check In Status": currentKey.checkIn?.status ?? "-",
            "Check In Time": currentKey.checkIn?.time
                ? dayjs(currentKey.checkIn.time).isValid()
                    ? dayjs(currentKey.checkIn.time).format("h:mm A")
                    : "-"
                : "-",
            "Check Out Time": currentKey.checkOut?.time
                ? dayjs(currentKey.checkOut.time).isValid()
                    ? dayjs(currentKey.checkOut.time).format("h:mm A")
                    : "-"
                : "-",
            "Working duration (hours)": timeDiff.toFixed(2)
        };
        return csvDate;
    }).sort((a, b) => {
        // Sort chronologically
        const dateA = dayjs(a.Date, "DD/MM/YYYY");
        const dateB = dayjs(b.Date, "DD/MM/YYYY");
        return dateA.valueOf() - dateB.valueOf();
    });
};

const Attendance = () => {
    const { selectedOperator }: { selectedOperator: Operator } =
        useOutletContext();
    const [dates, setDates] = useState<CalendarDate>();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [totalAttended, setTotalAttended] = useState(0);
    const [totalOnTime, setTotalOnTime] = useState(0);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const currentMonthFullString = dayjs(currentMonth).format("MMMM");

    const { mutate: mutateFetchOperatorAttendance } = useMutation({
        mutationFn: ({
            operatorId,
            startingTimestamp,
            endingTimestamp
        }: {
            operatorId: string;
            startingTimestamp: number;
            endingTimestamp: number;
        }) =>
            fetchOperatorAttendance(
                operatorId,
                startingTimestamp,
                endingTimestamp
            ),
        onSuccess: (data: AttendancePayload) => {
            const calendarDates: CalendarDate = {};
            data.attendanceData.forEach((item) => {
                // Use ISO format (YYYY-MM-DD) for consistent date keys
                const startOfDay = dayjs(item.startingTimestamp).format("YYYY-MM-DD");

                if (!calendarDates[startOfDay]) {
                    if (
                        (item.entryType === "attendance" ||
                            item.entryType === "checkIn") &&
                        item.checkInStatus
                    ) {
                        calendarDates[startOfDay] = {
                            checkIn: {
                                time: item.startingTimestamp,
                                location: item.location,
                                status: item.checkInStatus
                            }
                        };
                    } else {
                        calendarDates[startOfDay] = {
                            checkOut: {
                                time: item.startingTimestamp,
                                location: item.location
                            }
                        };
                    }
                } else {
                    if (item.entryType === "checkIn" && item.checkInStatus) {
                        calendarDates[startOfDay] = {
                            ...calendarDates[startOfDay],
                            checkIn: {
                                time: item.startingTimestamp,
                                location: item.location,
                                status: item.checkInStatus
                            }
                        };
                    } else {
                        calendarDates[startOfDay] = {
                            ...calendarDates[startOfDay],
                            checkOut: {
                                time: item.startingTimestamp,
                                location: item.location
                            }
                        };
                    }
                }
            });

            setDates(calendarDates);
            setTotalAttended(data.totalAttended);
            setTotalOnTime(data.totalOnTime);
            convertToCSVFriendlyData(calendarDates);
        },
        onError: (err: Error) => {
            toast.error(err.message);
        }
    });
    useEffect(() => {
        if (selectedOperator.client)
            mutateFetchOperatorAttendance({
                operatorId: selectedOperator.id,
                startingTimestamp: dayjs().startOf("month").valueOf(),
                endingTimestamp: dayjs().endOf("month").valueOf()
            });
    }, []);

    const handleAttendanceDownload = () => {
        if (!dates) return;
        const csvData = convertToCSVFriendlyData(dates);

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(csvData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "attendance");

        XLSX.writeFile(
            workbook,
            `${selectedOperator.name}_Attendance_${currentMonthFullString}.xlsx`,
            { compression: true }
        );
    };

    return (
        <div className="flex flex-col gap-6 p-6 sm:px-6 md:flex-row  ">
            <div className="order-1 md:order-none md:basis-3/12">
                <div className="flex h-[50vh] w-full flex-col overflow-hidden rounded-md border border-border bg-backgroundGray/30 md:h-full">
                    <OperatorAttendanceMap
                        checkIn={
                            dates?.[getDateKey(selectedDate)]?.checkIn
                        }
                        checkOut={
                            dates?.[getDateKey(selectedDate)]?.checkOut
                        }
                    />
                </div>
            </div>
            <div className="basis-5/12">
                <Calendar
                    className="flex h-full items-center justify-center rounded-md border border-border py-6"
                    showOutsideDays={false}
                    classNames={{
                        nav_button: cn(
                            buttonVariants({ variant: "outline" }),
                            "size-7 text-neutral-200 sm:size-9 border-none bg-transparent p-0 opacity-50 hover:opacity-100"
                        ),
                        day: cn(
                            buttonVariants({ variant: "ghost" }),
                            "size-9 text-neutral-200 sm:size-16 cursor-pointer p-0 font-normal aria-selected:opacity-100"
                        ),
                        day_selected: "",
                        cell: "size-9 sm:size-16",
                        head_row: "bg-backgroundGray/30 my-2 flex rounded-md",
                        head_cell:
                            "size-9 text-neutral-200 sm:size-16 flex items-center justify-center"
                    }}
                    mode="multiple"
                    toMonth={new Date()}
                    selected={
                        dates &&
                        Object.keys(dates).map((date) => dayjs(date).toDate())
                    }
                    onDayClick={setSelectedDate}
                    onMonthChange={(month) => {
                        setCurrentMonth(month);
                        setSelectedDate(month);
                        if (selectedOperator.client) {
                            mutateFetchOperatorAttendance({
                                operatorId: selectedOperator.id,
                                startingTimestamp: dayjs(month)
                                    .startOf("month")
                                    .valueOf(),
                                endingTimestamp: dayjs(month)
                                    .endOf("month")
                                    .valueOf()
                            });
                        }
                    }}
                    components={{
                        CaptionLabel: (props) => (
                            <h3 className="text-lg font-semibold text-neutral-200">
                                {dayjs(selectedDate).format("Do MMM YYYY")}
                            </h3>
                        ),
                        IconLeft: ({ ...props }) => (
                            <MdArrowLeft className="size-4 lg:size-6" />
                        ),
                        IconRight: ({ ...props }) => (
                            <MdArrowRight className="size-4 lg:size-6" />
                        ),
                        DayContent: (props) => {
                            return (
                                <span
                                    className={`flex flex-col items-center ${props.date.toString() === selectedDate.toString() ? "size-full rounded-md bg-neutral-100 text-black" : ""}  ${props.activeModifiers.today ? "size-full rounded-md bg-primary600" : ""} justify-center`}
                                >
                                    <span className="relative flex w-full items-center justify-center text-sm sm:text-lg">
                                        {dates &&
                                            dates[
                                                getDateKey(props.date)
                                            ]?.checkIn && (
                                                <span className="absolute -top-1 h-1  w-1 rounded-sm bg-primary600 lg:-top-1" />
                                            )}
                                        {props.date.getDate()}
                                    </span>
                                </span>
                            );
                        }
                    }}
                />
            </div>
            <div className="divide-y-1 relative flex h-fit basis-full flex-col divide-y divide-border rounded-md border  border-border  md:basis-4/12">
                {Object.keys(dates || {}).length > 0 && (
                    <button
                        onClick={handleAttendanceDownload}
                        className="absolute right-6 top-6 flex cursor-pointer items-center gap-2 font-semibold text-white/50 hover:text-neutral-200"
                    >
                        <MdDownload className="h-6 w-6 translate-y-[1px] md:h-5 md:w-5" />
                        <span>{dayjs(currentMonth).format("MMM")}</span>
                    </button>
                )}
                <AttendanceItem
                    title="Attendance status"
                    description={
                        <p className="text-sm text-white/50">
                            Know when the operator checked in and out
                        </p>
                    }
                    data={
                        <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold">
                                {dates &&
                                dates[getDateKey(selectedDate)] ? (
                                    dates[getDateKey(selectedDate)]
                                        .checkIn ? (
                                        dates[getDateKey(selectedDate)]
                                            .checkOut ? (
                                            `${dayjs(dates[getDateKey(selectedDate)].checkIn?.time).format("h:mm A")} - ${dayjs(dates[getDateKey(selectedDate)].checkOut?.time).format("h:mm A")}`
                                        ) : (
                                            dayjs(
                                                dates[
                                                    getDateKey(selectedDate)
                                                ].checkIn?.time
                                            ).format("h:mm A")
                                        )
                                    ) : (
                                        <span className="text-red-400">
                                            Not Checked In
                                        </span>
                                    )
                                ) : (
                                    <span className="text-red-400">
                                        Not Checked In
                                    </span>
                                )}
                            </span>
                            <span className="text-sm text-white/50">
                                {dates &&
                                    dates[getDateKey(selectedDate)]
                                        ?.checkIn &&
                                    dates[getDateKey(selectedDate)]
                                        ?.checkOut &&
                                    `(${getTimeDifference(
                                        new Date(
                                            dates[
                                                getDateKey(selectedDate)
                                            ].checkIn!.time
                                        ),
                                        new Date(
                                            dates[
                                                getDateKey(selectedDate)
                                            ].checkOut!.time
                                        )
                                    )})`}
                            </span>
                        </div>
                    }
                />
                <AttendanceItem
                    title="On Time Percentage"
                    description={
                        <>
                            <p className="text-sm text-secondary">
                                Operator has arrived on time in{" "}
                                <span className="font-bold text-neutral-200">
                                    {currentMonthFullString}
                                </span>
                            </p>
                            {selectedOperator.client &&
                                selectedOperator.client.checkInTimeWithZone && (
                                    <p className="text-sm text-secondary">
                                        Check in time at{" "}
                                        <span className="font-bold text-white/50">
                                            {selectedOperator.client.name}
                                        </span>
                                        :{" "}
                                        <span className="font-bold text-white/50">
                                            {dayjs(
                                                `1/1/1 ${selectedOperator.client.checkInTimeWithZone.split(",")[0]}`
                                            ).format("h:mm A")}
                                        </span>
                                    </p>
                                )}
                        </>
                    }
                    data={
                        <div className="flex items-baseline gap-2">
                            <p className="flex items-baseline">
                                <span className="text-lg font-bold">
                                    {totalAttended
                                        ? (
                                              (totalOnTime / totalAttended) *
                                              100
                                          ).toFixed(2)
                                        : 0}
                                </span>
                                <span className="text-sm text-white/50">%</span>
                            </p>
                        </div>
                    }
                />
                <AttendanceItem
                    title="Total Days Attended"
                    description={
                        <p className="text-sm text-secondary">
                            Number of days the operator has attended in{" "}
                            <span className="font-bold text-neutral-200">
                                {currentMonthFullString}
                            </span>
                        </p>
                    }
                    data={
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold">
                                {totalAttended}
                            </span>
                            <span className="text-sm text-white/50">
                                {totalAttended === 1 ? "day" : "days"} attended
                            </span>
                        </div>
                    }
                />
                <AttendanceItem
                    title="Amount"
                    description={
                        <p className="text-sm text-secondary">
                            Amount to be paid to the operator for{" "}
                            <span className="font-bold text-neutral-200">
                                {currentMonthFullString}
                            </span>
                        </p>
                    }
                    data={
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold">
                                {totalAttended * 500}
                            </span>
                            <span className="text-sm text-white/50">
                                rupees, estimated at ₹500 per day
                            </span>
                        </div>
                    }
                />
            </div>
        </div>
    );
};

export default Attendance;
