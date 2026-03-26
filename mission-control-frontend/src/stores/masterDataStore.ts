import { PaginationInfo } from "@/components/pagination/PaginationComponent";
import { MasterData } from "@/data/types/masterDataTypes";
import { create } from "zustand";

type MasterDataQueryParams = {
    category?: string;
    status?: string;
    type?: string;
    priority?: string;
    isActive?: string;
    searchQuery?: string;
    client?: string;
    operator?: string;
    fleet?: string;
    access?: string;
    gpsStatus?: string;
};

type MasterDataStore = {
    masterData: MasterData[];
    selectedMasterData?: MasterData;
    currentPage: number;
    paginationInfo?: PaginationInfo;
    queryParams: MasterDataQueryParams;
    setQueryParams: (queryParams: MasterDataQueryParams) => void;
    setCurrentPage: (page: number) => void;
    setSelectedMasterData: (masterData?: MasterData) => void;
    setMasterData: (masterData: MasterData[]) => void;
    setPaginationInfo: (paginationInfo: PaginationInfo) => void;
};

export const useMasterDataStore = create<MasterDataStore>((set) => ({
    masterData: [],
    selectedMasterData: undefined,
    paginationInfo: undefined,
    currentPage: 1,
    queryParams: {},
    setQueryParams: (queryParams: MasterDataQueryParams) => set({ queryParams }),
    setCurrentPage: (page) => set({ currentPage: page }),
    setSelectedMasterData: (masterData) => set({ selectedMasterData: masterData }),
    setMasterData: (masterData: MasterData[]) => set({ masterData }),
    setPaginationInfo: (paginationInfo) => set({ paginationInfo })
}));
