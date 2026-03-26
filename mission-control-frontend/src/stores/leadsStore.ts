import { PaginationInfo } from "@/components/pagination/PaginationComponent";
import { Lead } from "@/data/types";
import { create } from "zustand";

type LeadQueryParams = {
    stage?: string;
    source?: string;
    category?: string;
    type?: string;
    product?: string;
    pipelineStage?: string;
    searchQuery?: string;
};

type LeadsStore = {
    leads: Lead[];
    selectedLead?: Lead;
    currentPage: number;
    paginationInfo?: PaginationInfo;
    queryParams: LeadQueryParams;
    setQueryParams: (queryParams: LeadQueryParams) => void;
    setCurrentPage: (page: number) => void;
    setSelectedLead: (lead?: Lead) => void;
    setLeads: (leads: Lead[]) => void;
    setPaginationInfo: (paginationInfo: PaginationInfo) => void;
};

export const useLeadsStore = create<LeadsStore>((set) => ({
    leads: [],
    selectedLead: undefined,
    paginationInfo: undefined,
    currentPage: 1,
    queryParams: {},
    setQueryParams: (queryParams: LeadQueryParams) => set({ queryParams }),
    setCurrentPage: (page) => set({ currentPage: page }),
    setSelectedLead: (lead) => set({ selectedLead: lead }),
    setLeads: (leads: Lead[]) => set({ leads }),
    setPaginationInfo: (paginationInfo) => set({ paginationInfo })
}));
