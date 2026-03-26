import { MdDownload } from "react-icons/md";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

import { ProcessedAppData } from "@/data/types/appDataTypes";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/DropdownMenu";
import { toast } from "react-toastify";

const csvFriendlyData = (data: ProcessedAppData) => {
    const sessionData = (data.appSessionData ?? []).map((session) => {
        return {
            Date: dayjs(session.timestamp).format("DD/MM/YYYY"),
            "Client Name": session.clientName,
            "Operator Name": session.operatorName,
            "Robot Name": session.robotName,
            "Type of material ": session.loadingMaterialType,
            "Material Qty. (units)": session.loadingMaterialQuantity,
            "No. of labor loading": session.loadingWorkerCount,
            "No. of labor unloading": session.unloadingWorkerCount,
            "Actuator used for unloading": session.unloadingActuatorUsed
                ? "Yes"
                : "No",
            "Loading Start Time": dayjs(session.loadingStartTimestamp).format(
                "h:mm:ss A"
            ),
            "Loading End time": dayjs(session.loadingEndTimestamp).format(
                "h:mm:ss A"
            ),
            "Robot trip start time": dayjs(session.tripStartTimestamp).format(
                "h:mm:ss A"
            ),
            "Robot trip end time": dayjs(session.tripEndTimestamp).format(
                "h:mm:ss A"
            ),
            "Unloading Start Time": dayjs(
                session.unloadingStartTimestamp
            ).format("h:mm:ss A"),
            "Unloading End time": dayjs(session.unloadingEndTimestamp).format(
                "h:mm:ss A"
            ),
            "Robot return trip start time": dayjs(
                session.returnTripStartTimestamp
            ).format("h:mm:ss A"),
            "Robot return trip end time": dayjs(
                session.returnTripEndTimestamp
            ).format("h:mm:ss A"),
            "Load Time (min)": dayjs
                .duration(session.loadingTime, "millisecond")
                .asMinutes()
                .toFixed(2),
            "Unload Time (min)": dayjs
                .duration(session.unloadingTime, "millisecond")
                .asMinutes()
                .toFixed(2),
            "Load-Unload Time (min)": dayjs
                .duration(
                    session.loadingTime + session.unloadingTime,
                    "millisecond"
                )
                .asMinutes()
                .toFixed(2),
            "Robot running Time (min)": dayjs
                .duration(
                    session.tripTime + session.returnTripTime,
                    "millisecond"
                )
                .asMinutes()
                .toFixed(2),
            "Robot Idle Time (min)": dayjs
                .duration(session.tripIdleTime, "millisecond")
                .asMinutes()
                .toFixed(2),
            "Robot Down Time (min)": dayjs
                .duration(session.totalDownTime || 0, "millisecond")
                .asMinutes()
                .toFixed(2),
            "Total Trip time (min)": dayjs
                .duration(session.totalTripTime, "millisecond")
                .asMinutes()
                .toFixed(2)
        };
    });
    const downtimeData = (data.downtimeData ?? []).map((item) => {
        return {
            Date: dayjs(item.timestamp).format("DD/MM/YYYY"),
            Client: item.clientName,
            Operator: item.operatorName,
            Robot: item.robotName,
            Task: item.task,
            "Downtime start time": dayjs(item.downtimeStartTimestamp).format(
                "h:mm:ss A"
            ),
            "Downtime end time": dayjs(item.downtimeEndTimestamp).format(
                "h:mm:ss A"
            ),
            "Duration (min)": dayjs
                .duration(item.downTimeDuration)
                .asMinutes()
                .toFixed(2)
        };
    });
    return { sessionData, downtimeData };
};

export const DownloadDataButton = () => {
    const processedAppData = useAnalyticsStore(
        (state) => state.processedAppData
    );

    if (!processedAppData) return null;

    const hasSessionData = processedAppData.appSessionData?.length;
    const hasDowntimeData = processedAppData.downtimeData?.length;

    if (!hasSessionData && !hasDowntimeData) return null;

    const { sessionData, downtimeData } = csvFriendlyData(processedAppData);

    const handleSessionDataDownload = () => {
        if (sessionData.length === 0) {
            toast.info("No data to download");
            return;
        }
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(sessionData);

        worksheet["!cols"] = [];
        Object.keys(sessionData[0] || {}).forEach((key, idx) => {
            worksheet["!cols"]?.push({
                wpx: 100
            });
        });

        XLSX.utils.book_append_sheet(workbook, worksheet, "data");
        const sessionClientName = sessionData[0]?.["Client Name"];
        const sessionFileName = sessionClientName
            ? `Data report - ${sessionClientName}.xlsx`
            : "Data report.xlsx";
        XLSX.writeFile(
            workbook,
            sessionFileName,
            { compression: true }
        );
    };

    const handleDowntimeDataDownload = () => {
        if (downtimeData.length === 0) {
            toast.info("No data to download");
            return;
        }
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(downtimeData);
        worksheet["!cols"] = [];
        Object.keys(downtimeData[0] || {}).forEach((key, idx) => {
            worksheet["!cols"]?.push({
                wpx: 100
            });
        });

        XLSX.utils.book_append_sheet(workbook, worksheet, "downtime");
        const downtimeClientName = downtimeData[0]?.Client;
        const downtimeFileName = downtimeClientName
            ? `Downtime data report - ${downtimeClientName}.xlsx`
            : "Downtime data report.xlsx";
        XLSX.writeFile(
            workbook,
            downtimeFileName,
            { compression: true }
        );
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                <div className="flex items-center gap-x-2 md:rounded-md md:border md:p-2.5 md:font-semibold md:hover:border-blue-700 md:hover:bg-blue-700">
                    <div className="hidden md:block">Download</div>
                    <MdDownload className="h-6 w-6 md:h-5 md:w-5" />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="border-backgroundGray bg-backgroundGray">
                <DropdownMenuItem
                    onClick={handleSessionDataDownload}
                    className="cursor-pointer rounded-md text-white focus:bg-neutral-100 focus:text-black"
                >
                    Session Data
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={handleDowntimeDataDownload}
                    className="cursor-pointer rounded-md text-white focus:bg-neutral-100 focus:text-black"
                >
                    Downtime data
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
