import Header from "@/components/header/Header";
import { ClientData } from "@/data/types";
import { fetchClientDetails } from "@/features/clients/services/clientService";
import { useEffect, useState } from "react";
import { useMutation } from "react-query";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

const Client = () => {
    const { clientId } = useParams();
    const navigate = useNavigate();
    const [selectedClient, setSelectedClient] = useState<ClientData>();

    const { mutate: mutateFetchClientDetails, isLoading } = useMutation({
        mutationFn: (clientId: string) => fetchClientDetails(clientId),
        onSuccess: (data) => {
            setSelectedClient(data);
        },
        onError: (err: Error) => {
            toast.error(err.message);
        }
    });

    useEffect(() => {
        if (clientId) mutateFetchClientDetails(clientId);
    }, []);

    const refetchClient = () => {
        if (clientId) mutateFetchClientDetails(clientId);
    };
    return (
        <div className="flex h-full w-full flex-col bg-blue-900/25">
            <Header
                title={selectedClient?.name ?? "Clients"}
                onBack={() =>
                    navigate(`/clients/`, {
                        replace: true
                    })
                }
            />
            <ul className="flex min-h-[3rem] w-full items-center gap-6 border-b border-t border-border px-6 text-sm md:gap-8 md:border-t-0 md:px-8 md:text-lg">
                <NavLink
                    replace
                    className={({ isActive }) =>
                        `outline-none hover:opacity-100 ${isActive ? "opacity-100" : "opacity-50"}`
                    }
                    to={`/clients/${clientId}/config`}
                >
                    Config
                </NavLink>
                <NavLink
                    replace
                    className={({ isActive }) =>
                        ` outline-none hover:opacity-100 ${isActive ? "opacity-100" : "opacity-50"}`
                    }
                    to={`/clients/${clientId}/operators`}
                >
                    Operators
                </NavLink>
                <NavLink
                    replace
                    className={({ isActive }) =>
                        ` outline-none hover:opacity-100 ${isActive ? "opacity-100" : "opacity-50"}`
                    }
                    to={`/clients/${clientId}/materials`}
                >
                    Materials
                </NavLink>
            </ul>
            {selectedClient && (
                <Outlet context={{ selectedClient, refetchClient }} />
            )}
        </div>
    );
};

export default Client;
