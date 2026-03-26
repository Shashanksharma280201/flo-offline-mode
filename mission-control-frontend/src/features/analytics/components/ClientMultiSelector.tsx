import { useState, useEffect } from "react";
import { Search, CheckSquare, Square } from "lucide-react";
import { getClientsListFn } from "../analyticsService";
import { toast } from "react-toastify";

interface Client {
    id: string;
    name: string;
}

interface ClientMultiSelectorProps {
    selectedClientIds: string[];
    onSelectionChange: (clientIds: string[]) => void;
}

export const ClientMultiSelector: React.FC<ClientMultiSelectorProps> = ({
    selectedClientIds,
    onSelectionChange
}) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [filteredClients, setFilteredClients] = useState<Client[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // Fetch all clients on mount
    useEffect(() => {
        const fetchClients = async () => {
            try {
                setIsLoading(true);
                const data = await getClientsListFn();

                // Filter out null/undefined/invalid clients
                const validClients = data.filter(
                    (client: Client) => client && client.id && client.name
                );

                if (validClients.length < data.length) {
                    console.warn(
                        `Filtered out ${data.length - validClients.length} invalid clients`
                    );
                }

                setClients(validClients);
                setFilteredClients(validClients);
            } catch (error) {
                console.error("Error fetching clients:", error);
                toast.error("Failed to load clients");
            } finally {
                setIsLoading(false);
            }
        };

        fetchClients();
    }, []);

    // Filter clients based on search query
    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredClients(clients);
        } else {
            const filtered = clients.filter((client) =>
                client.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredClients(filtered);
        }
    }, [searchQuery, clients]);

    const handleToggleClient = (clientId: string) => {
        if (selectedClientIds.includes(clientId)) {
            onSelectionChange(selectedClientIds.filter((id) => id !== clientId));
        } else {
            onSelectionChange([...selectedClientIds, clientId]);
        }
    };

    const handleSelectAll = () => {
        const allClientIds = filteredClients.map((client) => client.id);
        onSelectionChange(allClientIds);
    };

    const handleDeselectAll = () => {
        onSelectionChange([]);
    };

    if (isLoading) {
        return (
            <div className="rounded-lg bg-gray-800 p-4">
                <p className="text-gray-400">Loading clients...</p>
            </div>
        );
    }

    return (
        <div className="rounded-lg bg-gray-800 p-4">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Select Clients</h3>
                <div className="flex gap-2">
                    <button
                        onClick={handleSelectAll}
                        className="rounded px-3 py-1 text-sm text-green-400 hover:bg-gray-700"
                    >
                        Select All
                    </button>
                    <button
                        onClick={handleDeselectAll}
                        className="rounded px-3 py-1 text-sm text-red-400 hover:bg-gray-700"
                    >
                        Deselect All
                    </button>
                </div>
            </div>

            {/* Search bar */}
            <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg bg-gray-700 py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
            </div>

            {/* Client list */}
            <div className="max-h-64 overflow-y-auto rounded-lg bg-gray-700 p-2">
                {filteredClients.length === 0 ? (
                    <p className="py-4 text-center text-gray-400">No clients found</p>
                ) : (
                    <div className="space-y-1">
                        {filteredClients.map((client) => {
                            const isSelected = selectedClientIds.includes(client.id);
                            return (
                                <button
                                    key={client.id}
                                    onClick={() => handleToggleClient(client.id)}
                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                                        isSelected
                                            ? "bg-green-600/20 text-green-600"
                                            : "text-gray-300 hover:bg-gray-600"
                                    }`}
                                >
                                    {isSelected ? (
                                        <CheckSquare className="h-5 w-5 flex-shrink-0 text-green-600" />
                                    ) : (
                                        <Square className="h-5 w-5 flex-shrink-0 text-gray-400" />
                                    )}
                                    <span className="flex-1">{client.name}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Selection counter */}
            <div className="mt-3 text-center text-sm text-gray-400">
                {selectedClientIds.length > 0 ? (
                    <span className="text-green-600">
                        {selectedClientIds.length} client{selectedClientIds.length > 1 ? "s" : ""}{" "}
                        selected
                    </span>
                ) : (
                    <span>No clients selected</span>
                )}
            </div>
        </div>
    );
};
