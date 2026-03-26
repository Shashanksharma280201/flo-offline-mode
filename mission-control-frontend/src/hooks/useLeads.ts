import { useMutation } from "react-query";
import { useEffect } from "react";

import { fetchLeadsFn } from "@/features/leads/services/leadService";
import { useLeadsStore } from "@/stores/leadsStore";
import { useShallow } from "zustand/react/shallow";
import { Lead } from "@/data/types";
import { PaginationInfo } from "@/components/pagination/PaginationComponent";
import { errorLogger } from "@/util/errorLogger";

export const useLeads = () => {
    const [currentPage, queryParams, setLeads, setPaginationInfo] =
        useLeadsStore(
            useShallow((state) => [
                state.currentPage,
                state.queryParams,
                state.setLeads,
                state.setPaginationInfo
            ])
        );

    const { mutate, isLoading } = useMutation({
        mutationFn: (query: string) => fetchLeadsFn(query),
        onSuccess: ({
            data,
            metadata
        }: {
            data: Lead[];
            metadata: PaginationInfo;
        }) => {
            setLeads(data);
            setPaginationInfo(metadata);
        },
        onError: (error) => errorLogger(error)
    });

    const fetchLeads = () => {
        let queryStr = "";

        if (queryParams.searchQuery)
            queryStr += `query=${queryParams.searchQuery}&`;
        if (queryParams.stage)
            queryStr += `stage=${queryParams.stage.split(" ")[1]}&`;
        if (queryParams.source) queryStr += `source=${queryParams.source}&`;
        if (queryParams.category) {
            const cat = queryParams.category.replace("+", "%2B");
            queryStr += `category=${cat}&`;
        }
        if (queryParams.product) queryStr += `product=${queryParams.product}&`;
        if (queryParams.pipelineStage)
            queryStr += `pipelineStage=${queryParams.pipelineStage}&`;
        queryStr += `page=${currentPage}`;

        mutate(queryStr);
    };

    return {
        fetchLeads,
        isLoading
    };
};
