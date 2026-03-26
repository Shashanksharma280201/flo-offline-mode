import { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { usePDFGeneration } from "../hooks/usePDFGeneration";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";
import { usePDFConfigStore } from "@/stores/usePDFConfigStore";
import { toast } from "react-toastify";
import { MonthlyRobotCostModal } from "./MonthlyRobotCostModal";
import { MonthlyRobotCostInput } from "../types/costAnalysisTypes";
import { getClientsListFn } from "../analyticsService";

interface Client {
    id: string;
    name: string;
}

export const GeneratePDFButton = () => {
    const {
        isGenerating,
        generateSingleClientPDF,
        generateMultiClientPDF
    } = usePDFGeneration();
    const {
        selectedClient,
        selectedRobot,
        selectedAppUser,
        startingTimestamp,
        endingTimestamp
    } = useAnalyticsStore();

    const { pdfMode, selectedClientIds } = usePDFConfigStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);

    // Fetch clients list
    useEffect(() => {
        const fetchClients = async () => {
            try {
                const data = await getClientsListFn();
                setClients(data.filter((client: Client) => client && client.id && client.name));
            } catch (error) {
                console.error("Error fetching clients:", error);
            }
        };
        fetchClients();
    }, []);

    // Get selected clients for the modal
    const getSelectedClientsForModal = () => {
        if (pdfMode === "single" && selectedClient) {
            return [{ id: selectedClient.id, name: selectedClient.name }];
        }
        // Map selectedClientIds to client objects from clients array
        return selectedClientIds
            .map((id: string) => {
                const client = clients.find((c: Client) => c.id === id);
                return client ? { id, name: client.name } : null;
            })
            .filter((c): c is { id: string; name: string } => c !== null);
    };

    const handleGeneratePDF = async () => {
        if (!startingTimestamp || !endingTimestamp) {
            toast.error("Please select a valid date range");
            return;
        }

        if (pdfMode === "single") {
            // Single client mode
            if (!selectedClient) {
                toast.error("Please select a client first");
                return;
            }
        } else {
            // Multi client mode
            if (selectedClientIds.length === 0) {
                toast.error("Please select at least one client in PDF configuration");
                return;
            }
        }

        // Open modal to collect monthly robot costs
        setIsModalOpen(true);
    };

    const handleGenerateWithCosts = async (costs: MonthlyRobotCostInput) => {
        if (pdfMode === "single" && selectedClient) {
            // Single client mode
            await generateSingleClientPDF({
                clientId: selectedClient.id,
                clientName: selectedClient.name,
                startingTimestamp: startingTimestamp!.valueOf(),
                endingTimestamp: endingTimestamp!.valueOf(),
                operatorId: selectedAppUser?.id,
                robotId: selectedRobot?.id,
                monthlyRobotCost: costs[selectedClient.id]
            });
        } else {
            // Multi client mode - pass the complete cost mapping
            await generateMultiClientPDF({
                clientIds: selectedClientIds,
                startingTimestamp: startingTimestamp!.valueOf(),
                endingTimestamp: endingTimestamp!.valueOf(),
                monthlyRobotCosts: costs
            });
        }
    };

    const isDisabled = pdfMode === "single"
        ? !selectedClient || isGenerating
        : selectedClientIds.length === 0 || isGenerating;

    return (
        <>
            <button
                onClick={handleGeneratePDF}
                disabled={isDisabled}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-md font-semibold transition-colors ${
                    isDisabled
                        ? "cursor-not-allowed bg-gray-600 text-gray-400"
                        : "bg-green-600 text-white hover:bg-green-700"
                }`}
                title={
                    isDisabled
                        ? pdfMode === "single"
                            ? "Please select a client first"
                            : "Please select clients in PDF configuration"
                        : isGenerating
                          ? "Generating PDF..."
                          : pdfMode === "single"
                            ? "Generate PDF for current view"
                            : "Generate Combined PDF"
                }
            >
                <FileText className="h-4 w-4" />
                {isGenerating ? "Generating..." : "Generate PDF"}
            </button>

            <MonthlyRobotCostModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                selectedClients={getSelectedClientsForModal()}
                onGenerate={handleGenerateWithCosts}
            />
        </>
    );
};
