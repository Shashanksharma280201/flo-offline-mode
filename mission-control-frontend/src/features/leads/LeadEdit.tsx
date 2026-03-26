import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/header/Header";

import { toast } from "react-toastify";
import { useMutation } from "react-query";
import { updateLeadFn } from "./services/leadService";
import { LeadPayload } from "@/data/types";
import { AddOrEditLeadForm } from "./components/AddOrEditLeadForm";
import { useLeadsStore } from "@/stores/leadsStore";
import { useLead } from "@/hooks/useLead";
import { useEffect } from "react";
import { errorLogger } from "@/util/errorLogger";

const EditLead = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { mutate: fetchLead } = useLead();
    const [selectedLead, setSelectedLead] = useLeadsStore((state) => [
        state.selectedLead,
        state.setSelectedLead
    ]);

    const updateLeadMutation = useMutation({
        mutationFn: ({
            lead,
            id
        }: {
            lead: Partial<LeadPayload>;
            id: string;
        }) => updateLeadFn(lead, id),
        onSuccess: (data) => {
            toast.success("Lead updated successfully!");
            setSelectedLead(data);
            navigate(-1);
        },
        onError: errorLogger
    });

    const submitHandler = (data: Partial<LeadPayload>) => {
        if (updateLeadMutation.isLoading) return; // Prevent multiple submissions
        if (!selectedLead) return;

        const { pocName, city, companyName } = data;
        if (!pocName || !city || !companyName) {
            toast.error("Missing required fields");
            return;
        }

        updateLeadMutation.mutate({ lead: data, id: selectedLead._id });
    };

    useEffect(() => {
        if (!id) return;
        fetchLead(id);
    }, []);

    return (
        <>
            <Header title="Edit lead" onBack={() => navigate(-1)} />
            <AddOrEditLeadForm
                onCancel={() => navigate(-1)}
                onSubmit={submitHandler}
            />
        </>
    );
};

export default EditLead;
