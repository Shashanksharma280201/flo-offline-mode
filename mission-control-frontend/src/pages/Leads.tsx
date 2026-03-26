import { useShallow } from "zustand/react/shallow";
import Header from "@/components/header/Header";
import { PaginationComponent } from "@/components/pagination/PaginationComponent";
import { LeadList } from "@/features/leads/components/LeadList";
import { LeadsActionButton } from "@/features/leads/components/LeadActionsButton";
import { LeadSearchBar } from "@/features/leads/components/LeadSearchBar";
import { useLeadsStore } from "@/stores/leadsStore";

const Leads = () => {
    return (
        <div className="h-screen overflow-y-auto bg-blue-900/25">
            <Header title="Leads">
                <div className="flex items-center gap-4">
                    <LeadsActionButton />
                </div>
            </Header>
            <div className="mx-auto flex w-full flex-col gap-4 p-7 md:gap-6  md:p-10 md:py-8">
                <LeadSearchBar />
                <LeadList />
                <LeadsPagination />
            </div>
        </div>
    );
};

const LeadsPagination = () => {
    const [currentPage, setCurrentPage, paginationInfo] = useLeadsStore(
        useShallow((state) => [
            state.currentPage,
            state.setCurrentPage,
            state.paginationInfo
        ])
    );

    if (!paginationInfo) return null;

    return (
        <PaginationComponent
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            paginationInfo={paginationInfo}
        />
    );
};

export default Leads;
