import Header from "@/components/header/Header";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FleetRobotsView } from "./FleetRobotsView";
import { FleetMaintenanceView } from "./FleetMaintenanceView";
import { FleetConfigurationView } from "./FleetConfigurationView";

type Tabs = "robots" | "maintenance" | "configuration";

const FleetDetails = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tabs>("robots");

    return (
        <div className="flex max-w-full flex-col overflow-x-hidden">
            <Header title="Fleet details" onBack={() => navigate(-1)} />
            <div className="no-scrollbar flex w-full gap-6 overflow-x-auto whitespace-nowrap border-t border-white/10 bg-blue-900/25 p-6 py-4 text-base font-semibold text-secondary md:border-b md:border-t-0 md:px-8 md:text-lg">
                <p
                    onClick={() => setTab("robots")}
                    className={`shrink-0 cursor-pointer transition-colors ${tab === "robots" ? "text-white" : "hover:text-white/70"}`}
                >
                    Robots
                </p>
                <p
                    onClick={() => setTab("maintenance")}
                    className={`shrink-0 cursor-pointer transition-colors ${tab === "maintenance" ? "text-white" : "hover:text-white/70"}`}
                >
                    Maintenance
                </p>
                <p
                    onClick={() => setTab("configuration")}
                    className={`shrink-0 cursor-pointer transition-colors ${tab === "configuration" ? "text-white" : "hover:text-white/70"}`}
                >
                    Configuration
                </p>
            </div>

            <div className="min-h-screen bg-blue-900/25">
                <div className="mx-auto flex flex-col md:w-3/4 md:gap-6 md:py-8">
                    {tab === "robots" && <FleetRobotsView />}
                    {tab === "maintenance" && <FleetMaintenanceView />}
                    {tab === "configuration" && <FleetConfigurationView />}
                </div>
            </div>
        </div>
    );
};

export default FleetDetails;
