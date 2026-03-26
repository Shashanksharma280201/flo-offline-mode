import dayjs from "dayjs";
import { useMutation } from "react-query";
import * as XLSX from "xlsx";
import { fetchWeeklyReportDataFn } from "../services/leadService";
import { DropdownMenuItem } from "@/components/ui/DropdownMenu";

type LeadData = {
    [date: string]: {
        [stage: string]: {
            acv: number;
            tcv: number;
            robotCount: {
                [product: string]: number;
            };
            count: number;
        };
    };
};

type SheetData = number[] | string[] | (number | string)[];

const downloadReport = (data: LeadData) => {
    const sheetData: SheetData[] = [];
    let previousACV: { [key: string]: number } = {
        L1: 0,
        L2: 0,
        L3: 0,
        L4: 0,
        L5: 0
    };

    Object.keys(data)
        .reverse()
        .forEach((date) => {
            const weekDate = dayjs(date).format("D-MMM-YY");
            sheetData.push([weekDate, "", "", "", ""]);
            sheetData.push([
                "",
                "ACV",
                "TCV",
                "Units (rental)",
                "Units (OTB)"
                // "Change"
            ]);

            let totalACV = 0;
            let totalChange = 0;
            let currentACV: { [key: string]: number } = {}; // Store current ACV values for this week

            ["L5", "L4", "L3", "L2"].forEach((stage) => {
                const stageData = data[date][stage];
                const acv = stageData ? stageData.acv : 0;
                const change = acv - (previousACV[stage] || 0);

                totalACV += stage === "L5" ? 0 : acv;
                currentACV[stage] = acv; // Store the current week's ACV

                sheetData.push([
                    stage,
                    acv,
                    stageData?.tcv || 0,
                    stageData?.robotCount["MMR rental"] || 0,
                    stageData?.robotCount["MMR otb"] || 0
                    // change
                ]);
            });

            // sheetData.push(["", totalACV, "", "", "", totalChange]);
            sheetData.push(["", totalACV, "", "", ""]);
            sheetData.push([]);

            // Update previousACV for the next iteration
            previousACV = currentACV;
        });

    // Create worksheet and workbook
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Weekly Data");

    // Export as Excel file
    XLSX.writeFile(wb, "weekly_data.xlsx");
};

export const GenerateReportMenuItem = () => {
    const fetchReportMutation = useMutation({
        mutationFn: ({
            startDate,
            endDate
        }: {
            startDate: Date;
            endDate: Date;
        }) =>
            fetchWeeklyReportDataFn({
                startDate,
                endDate
            }),
        onSuccess: (data) => {
            downloadReport(data);
        },
        onError: (error) => {
            console.log(error);
        }
    });

    const reportgenerationHandler = () => {
        const startDate = dayjs().startOf("month").toDate();
        const endDate = dayjs().endOf("month").toDate();
        fetchReportMutation.mutate({
            startDate,
            endDate
        });
    };

    return (
        <DropdownMenuItem
            onClick={reportgenerationHandler}
            className="cursor-pointer rounded-md text-white focus:bg-neutral-100 focus:text-black"
        >
            Generate report
        </DropdownMenuItem>
    );
};
