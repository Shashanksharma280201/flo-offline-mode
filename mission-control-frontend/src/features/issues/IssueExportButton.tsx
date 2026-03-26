import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Download } from "lucide-react";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import {
    exportIssuesFn,
    ExportedIssue,
    IssueExportParams
} from "@/features/robots/services/issuesService";

type IssueExportButtonProps = {
    exportParams: Omit<IssueExportParams, "startingTimestamp" | "endingTimestamp"> & {
        startingTimestamp?: number;
        endingTimestamp?: number;
    };
};

// Format timestamp to readable date string
const formatDate = (timestamp?: number): string => {
    if (!timestamp) return "-";
    return dayjs(timestamp).format("DD/MM/YYYY HH:mm");
};

// Capitalize first letter
const capitalize = (str: string): string => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
};

// Transform issue data for Excel row
const transformIssueToRow = (issue: ExportedIssue) => ({
    "Issue ID": issue.id,
    Title: issue.title,
    Description: issue.issueDescription || "-",
    "Raised By": issue.raisedBy || "-",
    Robot: issue.robotName || "-",
    Client: issue.clientName || "-",
    Category: capitalize(issue.typeOfIssue),
    Subcategory: issue.issueSubCategory || "-",
    Status: capitalize(issue.status),
    "Raised On": formatDate(issue.raisedOnTimestamp),
    "Start Time": formatDate(issue.startTimestamp),
    "Closed On": formatDate(issue.closeTimestamp),
    Solution: issue.solution || "-"
});

export const IssueExportButton = ({ exportParams }: IssueExportButtonProps) => {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        // Validate date range
        if (!exportParams.startingTimestamp || !exportParams.endingTimestamp) {
            toast.warning("Please select a date range to export issues");
            return;
        }

        setIsExporting(true);

        try {
            const data = await exportIssuesFn({
                startingTimestamp: exportParams.startingTimestamp,
                endingTimestamp: exportParams.endingTimestamp,
                robotId: exportParams.robotId,
                clientId: exportParams.clientId,
                issueStatus: exportParams.issueStatus,
                typeOfIssue: exportParams.typeOfIssue,
                issueSubCategory: exportParams.issueSubCategory
            });

            if (data.totalCount === 0) {
                toast.info("No issues found for the selected filters");
                setIsExporting(false);
                return;
            }

            // Create workbook
            const workbook = XLSX.utils.book_new();

            // Define sheet order and names
            const categories = [
                { key: "mechanical", name: "Mechanical" },
                { key: "electrical", name: "Electrical" },
                { key: "downtime", name: "Downtime" },
                { key: "observation", name: "Observation" },
                { key: "other", name: "Other" }
            ] as const;

            // Add sheets for each category
            categories.forEach(({ key, name }) => {
                const issues = data.groupedIssues[key];

                if (issues && issues.length > 0) {
                    const rows = issues.map(transformIssueToRow);
                    const worksheet = XLSX.utils.json_to_sheet(rows);

                    // Set column widths
                    worksheet["!cols"] = [
                        { wch: 26 }, // Issue ID
                        { wch: 40 }, // Title
                        { wch: 60 }, // Description
                        { wch: 20 }, // Raised By
                        { wch: 15 }, // Robot
                        { wch: 20 }, // Client
                        { wch: 12 }, // Category
                        { wch: 25 }, // Subcategory
                        { wch: 10 }, // Status
                        { wch: 18 }, // Raised On
                        { wch: 18 }, // Start Time
                        { wch: 18 }, // Closed On
                        { wch: 40 }, // Solution
                        // { wch: 12 } // Thread Count
                    ];

                    XLSX.utils.book_append_sheet(
                        workbook,
                        worksheet,
                        `${name} (${issues.length})`
                    );
                }
            });

            // Check if workbook has any sheets
            if (workbook.SheetNames.length === 0) {
                toast.info("No issues found for the selected filters");
                setIsExporting(false);
                return;
            }

            // Generate filename with date range
            const fromDate = dayjs(exportParams.startingTimestamp).format(
                "YYYY-MM-DD"
            );
            const toDate = dayjs(exportParams.endingTimestamp).format(
                "YYYY-MM-DD"
            );
            const filename = `Issues_${fromDate}_to_${toDate}.xlsx`;

            // Download the file
            XLSX.writeFile(workbook, filename);

            toast.success(
                `Exported ${data.totalCount} issues to ${filename}`
            );
        } catch (error) {
            console.error("Export failed:", error);
            toast.error("Failed to export issues. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    const isDisabled =
        isExporting ||
        !exportParams.startingTimestamp ||
        !exportParams.endingTimestamp;

    return (
        <Button
            onClick={handleExport}
            disabled={isDisabled}
            variant="outline"
            className="flex items-center gap-2 bg-green-500/60 border-border hover:bg-green-600/50 hover:border-green-600 text-green-100 hover:text-white disabled:opacity-50"
            title={
                !exportParams.startingTimestamp || !exportParams.endingTimestamp
                    ? "Select a date range to export"
                    : "Export issues to Excel"
            }
        >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export Excel"}
        </Button>
    );
};

export default IssueExportButton;
