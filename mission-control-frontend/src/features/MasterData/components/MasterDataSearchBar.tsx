import {
    FormEvent,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef
} from "react";
import { MdSearch } from "react-icons/md";
import { useMasterDataStore } from "@/stores/masterDataStore";
import ComboBox from "@/components/comboBox/ComboBox";
import { useShallow } from "zustand/react/shallow";
import { useQuery } from "react-query";
import axios from "axios";
import { getAuthHeader } from "@/features/auth/authService";

export const MasterDataSearchBar = () => {
    const [queryParams, setQueryParams, setCurrentPage] = useMasterDataStore(
        useShallow((state) => [
            state.queryParams,
            state.setQueryParams,
            state.setCurrentPage
        ])
    );

    // Local state for search input (debounced)
    const [searchInput, setSearchInput] = useState(queryParams.searchQuery || "");
    const latestQueryParamsRef = useRef(queryParams);

    // Fetch unique clients for filter with caching
    const { data: clientsData } = useQuery("clients-filter", async () => {
        const response = await axios.get("/api/v1/clients/fetchAll", {
            headers: getAuthHeader()
        });
        return response.data;
    }, {
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    });

    // Fetch unique operators for filter with caching
    const { data: operatorsData } = useQuery("operators-filter", async () => {
        const response = await axios.get("/api/v1/operators", {
            headers: getAuthHeader()
        });
        return response.data;
    }, {
        staleTime: 5 * 60 * 1000,
        cacheTime: 10 * 60 * 1000,
    });

    // Fetch unique fleets for filter with caching
    const { data: fleetsData } = useQuery("fleets-filter", async () => {
        const response = await axios.get("/api/v1/fleets", {
            headers: getAuthHeader()
        });
        return response.data;
    }, {
        staleTime: 5 * 60 * 1000,
        cacheTime: 10 * 60 * 1000,
    });

    // Debounce search input - only update queryParams after 500ms of no typing
    useEffect(() => {
        latestQueryParamsRef.current = queryParams;
    }, [queryParams]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setQueryParams({
                ...latestQueryParamsRef.current,
                searchQuery: searchInput
            });
            setCurrentPage(1); // Reset to page 1 when search changes
        }, 500);

        return () => clearTimeout(timer);
    }, [searchInput, setCurrentPage, setQueryParams]);

    const onSearchHandler = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Immediately trigger search on form submit
        setQueryParams({
            ...latestQueryParamsRef.current,
            searchQuery: searchInput
        });
        setCurrentPage(1); // Reset to page 1 when search is submitted
    };

    const handleFilterChange = useCallback((filter: string, value: string) => {
        setQueryParams({ ...latestQueryParamsRef.current, [filter]: value });
        setCurrentPage(1); // Reset to page 1 when any filter changes
    }, [setQueryParams, setCurrentPage]);

    // Handle different response structures
    const clients = Array.isArray(clientsData) ? clientsData : (clientsData?.clients || []);
    const operators = Array.isArray(operatorsData) ? operatorsData : (operatorsData?.operators || []);
    const fleets = Array.isArray(fleetsData) ? fleetsData : (fleetsData?.fleets || []);

    const clientItems = useMemo(
        () =>
            clients
                .map((client: { name?: string }) => client?.name)
                .filter((name: string) => name && name.trim() !== "")
                .sort(),
        [clients]
    );
    const operatorItems = useMemo(
        () =>
            operators
                .map((operator: { name?: string }) => operator?.name)
                .filter((name: string) => name && name.trim() !== "")
                .sort(),
        [operators]
    );
    const fleetItems = useMemo(
        () =>
            fleets
                .map((fleet: { name?: string }) => fleet?.name)
                .filter((name: string) => name && name.trim() !== "")
                .sort(),
        [fleets]
    );

    return (
        <div className="flex flex-col gap-4">
            {/* Search Input */}
            <div className="flex gap-2 w-full">
                <form
                    onSubmit={onSearchHandler}
                    className="flex grow items-center justify-between rounded-lg border-2 border-gray-700 bg-slate-800/50"
                >
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => {
                            setSearchInput(e.target.value);
                        }}
                        placeholder="Search by Robot Name..."
                        className="grow bg-transparent px-3 py-2 sm:px-4 sm:py-3 outline-none text-sm sm:text-base"
                    />
                    <button
                        type="submit"
                        className="hidden sm:flex h-full bg-gray-700/50 px-4 sm:px-6 items-center hover:bg-white hover:text-black transition-colors"
                    >
                        <span className="text-sm">Search</span>
                    </button>
                    <MdSearch className="mr-3 h-5 w-5 sm:hidden text-gray-400" />
                </form>
            </div>

            {/* Filters - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 justify-center gap-2">
                <FilterItem
                    items={clientItems}
                    placeholder="Client"
                    selectedItem={queryParams.client}
                    setSelectedItem={(v) => handleFilterChange("client", v)}
                />
                <FilterItem
                    items={operatorItems}
                    placeholder="Operator"
                    selectedItem={queryParams.operator}
                    setSelectedItem={(v) => handleFilterChange("operator", v)}
                />
                <FilterItem
                    items={fleetItems}
                    placeholder="Fleet"
                    selectedItem={queryParams.fleet}
                    setSelectedItem={(v) => handleFilterChange("fleet", v)}
                />
                <FilterItem
                    items={[
                        "Idle",
                        "Running",
                        "Scrap",
                        "DOWN",
                        "Testing phase",
                        "Shipped",
                        "Sold - Refurbished"
                    ]}
                    placeholder="Status"
                    selectedItem={queryParams.status}
                    setSelectedItem={(v) => handleFilterChange("status", v)}
                />
                <FilterItem
                    items={["Enabled", "Disabled"]}
                    placeholder="Access"
                    selectedItem={queryParams.access}
                    setSelectedItem={(v) => handleFilterChange("access", v)}
                />
                <FilterItem
                    items={["Has GPS", "No GPS"]}
                    placeholder="GPS Status"
                    selectedItem={queryParams.gpsStatus}
                    setSelectedItem={(v) => handleFilterChange("gpsStatus", v)}
                />
                <button
                    onClick={() => {
                        setSearchInput("");
                        setQueryParams({});
                        setCurrentPage(1); // Reset to page 1 when clearing filters
                    }}
                    className="px-3 py-2 text-xs sm:text-sm bg-gray-700/50 rounded-lg hover:bg-gray-600 transition-colors whitespace-nowrap w-full"
                >
                    Clear Filters
                </button>
            </div>
        </div>
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
            wrapperClassName="px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2 h-fit w-full"
            inputClassName="placeholder:text-xs sm:placeholder:text-sm placeholder:text-gray-400 text-xs sm:text-sm"
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
