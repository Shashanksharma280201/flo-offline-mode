import { useAnalyticsStore } from "@/stores/useAnalyticsStore";
import { usePDFConfigStore } from "@/stores/usePDFConfigStore";
import { ClientMultiSelector } from "./ClientMultiSelector";

export const PDFConfigSection = () => {
    const {
        selectedClient,
        selectedRobot,
        selectedAppUser,
        startingTimestamp,
        endingTimestamp
    } = useAnalyticsStore();

    const { pdfMode, selectedClientIds, setPdfMode, setSelectedClientIds } = usePDFConfigStore();

    return (
        <div className="border-b border-border bg-blue-900/25 px-6 py-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-300">PDF Export Configuration</h3>

            {/* Toggle Switch */}
            <div className="mb-4 flex items-center gap-4">
                <span className="text-sm font-medium text-gray-400">Mode:</span>
                <div className="inline-flex rounded-lg bg-gray-700 p-1">
                    <button
                        onClick={() => setPdfMode("single")}
                        className={`rounded-md px-4 py-2 text-xs font-normal transition-all ${
                            pdfMode === "single"
                                ? "bg-green-600 text-white shadow-lg"
                                : "text-gray-400 hover:text-gray-200"
                        }`}
                    >
                        Single Client
                    </button>
                    <button
                        onClick={() => setPdfMode("multi")}
                        className={`rounded-md px-4 py-2 text-xs font-normal transition-all ${
                            pdfMode === "multi"
                                ? "bg-green-600 text-white shadow-lg"
                                : "text-gray-400 hover:text-gray-200"
                        }`}
                    >
                        Multiple Clients
                    </button>
                </div>
            </div>

            {/* Conditional Content */}
            {pdfMode === "single" ? (
                <div className="rounded-lg bg-gray-700/50 p-4">
                    <div className="text-sm text-gray-300">
                        <p className="mb-2">
                            <strong className="text-white">Selected Client:</strong>{" "}
                            {selectedClient ? selectedClient.name : "None"}
                        </p>
                        {selectedRobot && (
                            <p className="mb-2">
                                <strong className="text-white">Robot:</strong> {selectedRobot.name}
                            </p>
                        )}
                        {selectedAppUser && (
                            <p className="mb-2">
                                <strong className="text-white">Operator:</strong>{" "}
                                {selectedAppUser.name}
                            </p>
                        )}
                        {startingTimestamp && endingTimestamp && (
                            <p>
                                <strong className="text-white">Date Range:</strong>{" "}
                                {new Date(startingTimestamp.valueOf()).toLocaleDateString()} -{" "}
                                {new Date(endingTimestamp.valueOf()).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <div>
                    <ClientMultiSelector
                        selectedClientIds={selectedClientIds}
                        onSelectionChange={setSelectedClientIds}
                    />
                </div>
            )}
        </div>
    );
};
