import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { AnalyticsPDFDocument } from "../components/PDFDocument";
import { fetchSingleClientPDFData, fetchMultiClientPDFData, PDFData } from "../pdfService";
import { MonthlyRobotCostInput } from "../types/costAnalysisTypes";
import dayjs from "dayjs";
import { toast } from "react-toastify";

export const usePDFGeneration = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    /**
     * Generate PDF for a single client
     */
    const generateSingleClientPDF = async ({
        clientId,
        clientName,
        startingTimestamp,
        endingTimestamp,
        operatorId,
        robotId,
        monthlyRobotCost
    }: {
        clientId: string;
        clientName: string;
        startingTimestamp: number;
        endingTimestamp: number;
        operatorId?: string;
        robotId?: string;
        monthlyRobotCost?: number;
    }) => {
        try {
            setIsGenerating(true);
            setProgress(0);
            setError(null);

            // Fetch data
            setProgress(30);
            const data = await fetchSingleClientPDFData({
                clientId,
                startingTimestamp,
                endingTimestamp,
                operatorId,
                robotId,
                monthlyRobotCost
            });

            setProgress(60);

            // Generate PDF
            const doc = <AnalyticsPDFDocument data={data} />;
            const blob = await pdf(doc).toBlob();

            setProgress(90);

            // Download PDF
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const dateRangeStr = `${dayjs(startingTimestamp).format("DD-MMM-YYYY")}_to_${dayjs(endingTimestamp).format("DD-MMM-YYYY")}`;
            const filename = `Analytics_${clientName.replace(/\s+/g, "_")}_${dateRangeStr}.pdf`;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setProgress(100);
            toast.success("PDF generated successfully!");
        } catch (err: any) {
            const errorMessage = err?.response?.data?.message || err?.message || "Failed to generate PDF";
            setError(errorMessage);
            toast.error(errorMessage);
            console.error("PDF Generation Error:", err);
        } finally {
            setIsGenerating(false);
            setProgress(0);
        }
    };

    /**
     * Generate ONE combined PDF for multiple clients with aggregated data
     */
    const generateMultiClientPDF = async ({
        clientIds,
        startingTimestamp,
        endingTimestamp,
        monthlyRobotCosts
    }: {
        clientIds: string[];
        startingTimestamp: number;
        endingTimestamp: number;
        monthlyRobotCosts?: MonthlyRobotCostInput;
    }) => {
        try {
            setIsGenerating(true);
            setProgress(0);
            setError(null);

            if (clientIds.length === 0) {
                throw new Error("Please select at least one client");
            }

            console.log(`Generating PDF for ${clientIds.length} clients...`);

            // Fetch aggregated data for all clients
            setProgress(20);
            const aggregatedData = await fetchMultiClientPDFData({
                clientIds,
                startingTimestamp,
                endingTimestamp,
                monthlyRobotCosts
            });

            // Check if we got any data
            if (aggregatedData.chartData.appSessionData.length === 0) {
                toast.warning(
                    "No session data found for selected clients in this date range. " +
                    "PDF will be generated with summary only."
                );
            }

            setProgress(60);

            // Generate ONE combined PDF with all aggregated data
            const doc = <AnalyticsPDFDocument data={aggregatedData} />;
            const blob = await pdf(doc).toBlob();

            setProgress(90);

            // Download the combined PDF
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const dateRangeStr = `${dayjs(startingTimestamp).format("DD-MMM-YYYY")}_to_${dayjs(endingTimestamp).format("DD-MMM-YYYY")}`;
            const filename = clientIds.length === 1
                ? `Analytics_${aggregatedData.client.name.replace(/\s+/g, "_")}_${dateRangeStr}.pdf`
                : `Analytics_Multi_Client_${clientIds.length}_Clients_${dateRangeStr}.pdf`;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setProgress(100);

            const successMessage = clientIds.length === 1
                ? "PDF generated successfully!"
                : `Combined PDF generated successfully for ${clientIds.length} client${clientIds.length > 1 ? "s" : ""}!`;

            toast.success(successMessage);
        } catch (err: any) {
            const errorMessage =
                err?.response?.data?.message || err?.message || "Failed to generate combined PDF";
            setError(errorMessage);

            // More specific error messages
            if (errorMessage.includes("Invalid clients")) {
                toast.error(
                    "Some selected clients are invalid. Please refresh the page and try again."
                );
            } else if (errorMessage.includes("Failed to fetch")) {
                toast.error(
                    "Network error while fetching client data. Please check your connection."
                );
            } else {
                toast.error(errorMessage);
            }

            console.error("Multi-Client PDF Generation Error:", err);
        } finally {
            setIsGenerating(false);
            setProgress(0);
        }
    };

    return {
        isGenerating,
        progress,
        error,
        generateSingleClientPDF,
        generateMultiClientPDF
    };
};
