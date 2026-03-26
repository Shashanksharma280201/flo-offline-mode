import { useState } from "react";
import PendingRequestsTab from "./components/PendingRequestsTab";
import OvertimeHistoryTab from "./components/OvertimeHistoryTab";

const OvertimeDashboard = () => {
    const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

    return (
        <div className="w-full">
            <div className="border-b border-gray-700">
                <nav className="flex gap-4">
                    <button
                        onClick={() => setActiveTab("pending")}
                        className={`px-6 py-3 font-semibold transition-colors ${
                            activeTab === "pending"
                                ? "border-b-2 border-blue-500 text-blue-500"
                                : "text-gray-400 hover:text-gray-300"
                        }`}
                    >
                        Pending Requests
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`px-6 py-3 font-semibold transition-colors ${
                            activeTab === "history"
                                ? "border-b-2 border-blue-500 text-blue-500"
                                : "text-gray-400 hover:text-gray-300"
                        }`}
                    >
                        Overtime History
                    </button>
                </nav>
            </div>

            <div className="mt-6">
                {activeTab === "pending" ? <PendingRequestsTab /> : <OvertimeHistoryTab />}
            </div>
        </div>
    );
};

export default OvertimeDashboard;
