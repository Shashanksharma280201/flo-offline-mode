import { fetchLeadFn } from "@/features/leads/services/leadService";
import { useLeadsStore } from "@/stores/leadsStore";
import { useMutation } from "react-query";

export const useLead = () => {
    const setSelectedLead = useLeadsStore((state) => state.setSelectedLead);
    return useMutation({
        mutationFn: (leadId: string) => fetchLeadFn(leadId),
        onSuccess: (data) => {
            setSelectedLead(data);
        },
        onError: (error) => {
            console.log(error);
        }
    });
};
