import { useNavigate } from "react-router-dom";
import Header from "@/components/header/Header";

import { toast } from "react-toastify";
import { useMutation } from "react-query";
import { addLeadFn } from "./services/leadService";
import { LeadPayload } from "@/data/types";
import { AddOrEditLeadForm } from "./components/AddOrEditLeadForm";
import { errorLogger } from "@/util/errorLogger";

const AddLead = () => {
    const navigate = useNavigate();

    const addLeadMutation = useMutation({
        mutationFn: (lead: Partial<LeadPayload>) => addLeadFn(lead),
        onSuccess: () => {
            toast.success("Lead added successfully!");
            navigate(-1);
        },
        onError: (error) => errorLogger(error)
    });

    const submitHandler = (data: Partial<LeadPayload>) => {
        if (addLeadMutation.isLoading) return; // Prevent multiple submissions

        const { pocName, city, companyName } = data;
        if (!pocName || !city || !companyName) {
            toast.error("Missing required fields");
            return;
        }

        addLeadMutation.mutate(data);
    };

    return (
        <>
            <Header title="Create new lead" onBack={() => navigate(-1)} />
            <AddOrEditLeadForm
                onCancel={() => navigate(-1)}
                onSubmit={submitHandler}
            />
        </>
    );
};

export default AddLead;
