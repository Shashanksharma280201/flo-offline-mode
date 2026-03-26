import { useMutation } from "react-query";

import { fetchMasterDataFn } from "@/features/MasterData/service/masterDataService";
import { useMasterDataStore } from "@/stores/masterDataStore";
import { useShallow } from "zustand/react/shallow";
import { MasterData } from "@/data/types/masterDataTypes";
import { PaginationInfo } from "@/components/pagination/PaginationComponent";
import { errorLogger } from "@/util/errorLogger";

export const useMasterData = () => {
    const [currentPage, queryParams, setMasterData, setPaginationInfo] =
        useMasterDataStore(
            useShallow((state) => [
                state.currentPage,
                state.queryParams,
                state.setMasterData,
                state.setPaginationInfo
            ])
        );

    const { mutate, isLoading } = useMutation({
        mutationFn: (query: string) => fetchMasterDataFn(query),
        onSuccess: ({
            data,
            metadata
        }: {
            data: MasterData[];
            metadata: PaginationInfo;
        }) => {
            setMasterData(data);
            setPaginationInfo(metadata);
        },
        onError: (error) => errorLogger(error)
    });

    const fetchMasterData = () => {
        let queryStr = "";

        if (queryParams.searchQuery)
            queryStr += `query=${queryParams.searchQuery}&`;
        if (queryParams.category) queryStr += `category=${queryParams.category}&`;
        if (queryParams.status) queryStr += `status=${queryParams.status}&`;
        if (queryParams.type) queryStr += `type=${queryParams.type}&`;
        if (queryParams.priority) queryStr += `priority=${queryParams.priority}&`;
        if (queryParams.isActive) queryStr += `isActive=${queryParams.isActive}&`;
        queryStr += `page=${currentPage}`;

        mutate(queryStr);
    };

    return {
        fetchMasterData,
        isLoading
    };
};
