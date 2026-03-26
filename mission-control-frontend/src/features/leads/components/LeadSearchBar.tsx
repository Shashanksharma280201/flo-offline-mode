import { FormEvent, useEffect } from "react";
import { MdAdd, MdSearch } from "react-icons/md";
import { Link } from "react-router-dom";

import { useLeads } from "@/hooks/useLeads";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useLeadsStore } from "@/stores/leadsStore";
import ComboBox from "@/components/comboBox/ComboBox";
import { useShallow } from "zustand/react/shallow";

export const LeadSearchBar = () => {
    const { fetchLeads, isLoading } = useLeads();
    const [currentPage, queryParams, setQueryParams, setCurrentPage] =
        useLeadsStore(
            useShallow((state) => [
                state.currentPage,
                state.queryParams,
                state.setQueryParams,
                state.setCurrentPage
            ])
        );

    useEffect(() => {
        fetchLeads();
    }, [
        currentPage,
        queryParams.stage,
        queryParams.source,
        queryParams.category,
        queryParams.product,
        queryParams.pipelineStage
    ]);

    const onSearchHandler = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchLeads();
    };

    const handleFilterChange = (filter: string, value: string) => {
        setCurrentPage(1);
        setQueryParams({ ...queryParams, [filter]: value });
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-1 md:rounded-md">
                <form
                    onSubmit={onSearchHandler}
                    className="flex min-w-0 flex-1 items-center rounded-lg border-2 border-gray-700"
                >
                    <input
                        type="text"
                        value={queryParams.searchQuery}
                        onChange={(e) =>
                            setQueryParams({ searchQuery: e.target.value })
                        }
                        placeholder="Search for name, city, company..."
                        className="min-w-0 flex-1 truncate bg-transparent px-3 py-3 outline-none"
                    />

                    {isLoading && (
                        <LoadingSpinner className="mx-2 h-4 w-4 animate-spin fill-white" />
                    )}

                    <button
                        type="submit"
                        className="flex-shrink-0 px-3 py-3 text-gray-300 hover:text-white"
                    >
                        <MdSearch className="h-4 w-4" />
                    </button>
                </form>

                <div className="flex-shrink-0">
                    <AddLeadButton />
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
                <FilterItem
                    items={[
                        "Inbound",
                        "LinkedIn",
                        "FB Marketplace",
                        "Reference",
                        "Cold Email",
                        "Other"
                    ]}
                    placeholder="Select source"
                    selectedItem={queryParams.source}
                    setSelectedItem={(v) => handleFilterChange("source", v)}
                />
                <FilterItem
                    items={["Strategic", "Large", "Medium", "Long Tail"]}
                    selectedItem={queryParams.category}
                    setSelectedItem={(v) => handleFilterChange("category", v)}
                    placeholder="Select category"
                />
                <FilterItem
                    items={[
                        "MMR rental",
                        "MMR otb",
                        "MMR",
                        "LM",
                        "Autonomy",
                        "Projects",
                        "Others"
                    ]}
                    selectedItem={queryParams.product}
                    setSelectedItem={(v) => handleFilterChange("product", v)}
                    placeholder="Select product"
                />
                <FilterItem
                    items={[
                        "Stage -1",
                        "Stage 0",
                        "Stage 1",
                        "Stage 2",
                        "Stage 3",
                        "Stage 4",
                        "Stage 5"
                    ]}
                    selectedItem={queryParams.stage}
                    setSelectedItem={(v) => handleFilterChange("stage", v)}
                    placeholder="Select pipeline stage"
                />
                <FilterItem
                    items={[
                        "Contacted",
                        "Not Contacted",
                        "Deferred",
                        "Closed",
                        "Not Responding",
                        "On going discussion (call)",
                        "Meeting done",
                        "Post meeting discussion",
                        "Closing pending",
                        "Not interested",
                        "Industry connects"
                    ]}
                    selectedItem={queryParams.pipelineStage}
                    setSelectedItem={(v) =>
                        handleFilterChange("pipelineStage", v)
                    }
                    placeholder="Select the status"
                />
            </div>
        </div>
    );
};

const AddLeadButton = () => {
    return (
        <Link
            to={"/leads/new"}
            role="button"
            className="flex items-center justify-center rounded-lg bg-gray-700/50 p-4 hover:bg-gray-400 hover:text-black lg:p-3"
        >
            <span className="hidden md:block">Add lead</span>
            <MdAdd className="h-4 w-4 md:hidden" />
        </Link>
    );
};

const FilterItem = ({
    placeholder,
    items,
    selectedItem,
    setSelectedItem
}: {
    placeholder: string;
    items: string[];
    selectedItem?: string;
    setSelectedItem: (item: string) => void;
}) => {
    return (
        <ComboBox
            wrapperClassName="px-4 py-2 h-fit"
            inputClassName="placeholder:text-sm placeholder:text-gray"
            label=""
            showLabel={false}
            items={items}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            getItemLabel={(item) => item}
            placeholder={placeholder}
            compareItems={(itemA, itemB) => itemA === itemB}
        />
    );
};
