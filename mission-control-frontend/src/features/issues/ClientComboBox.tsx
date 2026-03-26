import ComboBox from "@/components/comboBox/ComboBox";
import { ClientData } from "@/data/types";
import useClients from "@/hooks/useClients";
import { useUserStore } from "@/stores/userStore";
import { useEffect } from "react";
import { allClientOption } from "./constants";

const ClientComboBox = ({
    selectedClient,
    setSelectedClient
}: {
    selectedClient?: ClientData;
    setSelectedClient: (selectedClient: ClientData) => void;
}) => {
    const fetchClientListMutation = useClients();
    const clients = useUserStore((state) => state.clients);

    useEffect(() => {
        fetchClientListMutation.mutate();
    }, []);

    return (
        <ComboBox
            wrapperClassName="bg-backgroundGray/30"
            label="Client"
            items={[allClientOption, ...clients]}
            selectedItem={selectedClient}
            setSelectedItem={setSelectedClient}
            getItemLabel={(client) => client?.name ?? ""}
            placeholder="Select Client"
            isLoading={fetchClientListMutation.isLoading}
        />
    );
};

export default ClientComboBox;
