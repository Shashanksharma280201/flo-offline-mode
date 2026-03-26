import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { toast } from "react-toastify";
import Header from "@/components/header/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    MdAdd,
    MdSearch,
    MdDownload,
    MdKeyboardArrowDown
} from "react-icons/md";
import { checkPermission } from "@/util/roles";
import { errorLogger } from "@/util/errorLogger";
import {
    fetchInventoryItems,
    fetchInventoryStats,
    createInventoryItem,
    updateInventoryItem,
    updateInventoryQuantity,
    deleteInventoryItem,
    fetchAllInventoryItems,
    type InventoryCategory,
    type InventoryItem,
    type CreateInventoryItemPayload,
    type UpdateInventoryItemPayload,
    type UpdateQuantityPayload
} from "@/api/inventoryApi";
import InventoryTable from "@/features/inventory/InventoryTable";
import AddItemDialog from "@/features/inventory/AddItemDialog";
import UpdateQuantityDialog from "@/features/inventory/UpdateQuantityDialog";
import ComboBox from "@/components/comboBox/ComboBox";
import {
    exportInventoryToExcel,
    generateInventoryFilename
} from "@/util/excelExport";

const Inventory = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<InventoryCategory>("mechanical");
    const [searchQuery, setSearchQuery] = useState("");
    const [stockFilter, setStockFilter] = useState<string>("all");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(
        null
    );
    const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
    const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const downloadMenuRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                downloadMenuRef.current &&
                !downloadMenuRef.current.contains(event.target as Node)
            ) {
                setIsDownloadMenuOpen(false);
            }
        };

        if (isDownloadMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isDownloadMenuOpen]);

    const { data: stats, isLoading: statsLoading } = useQuery(
        "inventory-stats",
        fetchInventoryStats,
        {
            onError: errorLogger
        }
    );

    const {
        data: mechanicalData,
        isLoading: mechanicalLoading,
        refetch: refetchMechanical
    } = useQuery(
        ["inventory-items", "mechanical", searchQuery, stockFilter],
        () =>
            fetchInventoryItems({
                category: "mechanical",
                search: searchQuery || undefined,
                stockStatus:
                    stockFilter === "low-stock"
                        ? "low-stock"
                        : stockFilter === "out-of-stock"
                          ? "out-of-stock"
                          : undefined,
                limit: 100
            }),
        {
            onError: errorLogger,
            keepPreviousData: true
        }
    );

    const {
        data: electronicsData,
        isLoading: electronicsLoading,
        refetch: refetchElectronics
    } = useQuery(
        ["inventory-items", "electronics", searchQuery, stockFilter],
        () =>
            fetchInventoryItems({
                category: "electronics",
                search: searchQuery || undefined,
                stockStatus:
                    stockFilter === "low-stock"
                        ? "low-stock"
                        : stockFilter === "out-of-stock"
                          ? "out-of-stock"
                          : undefined,
                limit: 100
            }),
        {
            onError: errorLogger,
            keepPreviousData: true
        }
    );

    const createItemMutation = useMutation(
        (payload: CreateInventoryItemPayload) => createInventoryItem(payload),
        {
            onSuccess: () => {
                toast.success("Item created successfully");
                queryClient.invalidateQueries("inventory-items");
                queryClient.invalidateQueries("inventory-stats");
                setIsAddDialogOpen(false);
            },
            onError: errorLogger
        }
    );

    const updateItemMutation = useMutation(
        ({
            itemId,
            payload
        }: {
            itemId: string;
            payload: UpdateInventoryItemPayload;
        }) => updateInventoryItem(itemId, payload),
        {
            onSuccess: () => {
                toast.success("Item updated successfully");
                queryClient.invalidateQueries("inventory-items");
                queryClient.invalidateQueries("inventory-stats");
                setIsAddDialogOpen(false);
                setEditingItem(null);
            },
            onError: errorLogger
        }
    );

    const updateQuantityMutation = useMutation(
        ({
            itemId,
            payload
        }: {
            itemId: string;
            payload: UpdateQuantityPayload;
        }) => updateInventoryQuantity(itemId, payload),
        {
            onSuccess: () => {
                toast.success("Quantity updated successfully");
                queryClient.invalidateQueries("inventory-items");
                queryClient.invalidateQueries("inventory-stats");
                setIsUpdateDialogOpen(false);
                setSelectedItem(null);
            },
            onError: errorLogger
        }
    );

    const deleteItemMutation = useMutation(
        (itemId: string) => deleteInventoryItem(itemId),
        {
            onSuccess: () => {
                toast.success("Item deleted successfully");
                queryClient.invalidateQueries("inventory-items");
                queryClient.invalidateQueries("inventory-stats");
            },
            onError: errorLogger
        }
    );

    const handleCreateItem = (payload: CreateInventoryItemPayload) => {
        if (editingItem) {
            // In edit mode, convert CreateInventoryItemPayload to UpdateInventoryItemPayload
            const updatePayload: UpdateInventoryItemPayload = {
                name: payload.name,
                category: payload.category,
                unit: payload.unit,
                description: payload.description,
                location: payload.location,
                minStockLevel: payload.minStockLevel,
                vendor: payload.vendor
            };
            updateItemMutation.mutate({
                itemId: editingItem.itemId,
                payload: updatePayload
            });
        } else {
            createItemMutation.mutate(payload);
        }
    };

    const handleEditItem = (item: InventoryItem) => {
        setEditingItem(item);
        setIsAddDialogOpen(true);
    };

    const handleUpdateQuantity = (
        itemId: string,
        payload: UpdateQuantityPayload
    ) => {
        updateQuantityMutation.mutate({ itemId, payload });
    };

    const handleOpenUpdateDialog = (item: InventoryItem) => {
        setSelectedItem(item);
        setIsUpdateDialogOpen(true);
    };

    const handleDeleteItem = (itemId: string) => {
        if (window.confirm("Are you sure you want to delete this item?")) {
            deleteItemMutation.mutate(itemId);
        }
    };

    const handleDownload = async (
        category?: "all" | "mechanical" | "electronics",
        stockStatus?: "low-stock" | "out-of-stock"
    ) => {
        try {
            setIsDownloading(true);
            setIsDownloadMenuOpen(false);

            let categoryFilter: InventoryCategory | undefined;
            if (category === "mechanical" || category === "electronics") {
                categoryFilter = category;
            }

            const items = await fetchAllInventoryItems(
                categoryFilter,
                stockStatus
            );

            if (items.length === 0) {
                toast.warning("No items found to export");
                return;
            }

            const filename = generateInventoryFilename(category, stockStatus);
            exportInventoryToExcel(items, filename);

            toast.success(`Downloaded ${items.length} items successfully`);
        } catch (error) {
            errorLogger(error);
            toast.error("Failed to download inventory");
        } finally {
            setIsDownloading(false);
        }
    };

    const currentItems =
        activeTab === "mechanical"
            ? mechanicalData?.items
            : electronicsData?.items;
    const isLoading =
        activeTab === "mechanical" ? mechanicalLoading : electronicsLoading;

    return (
        <>
            <Header title="Inventory">
                <div className="flex items-center gap-2">
                    {checkPermission("change_robots") && (
                        <>
                            {/* Download Button with Dropdown */}
                            <div className="relative" ref={downloadMenuRef}>
                                <button
                                    className="flex items-center justify-center gap-x-2 rounded-lg border border-green-600 bg-green-600 p-2 shadow-md transition-all duration-150 hover:bg-green-700 hover:shadow-lg md:gap-x-2 md:rounded-md md:p-2.5 md:font-semibold md:shadow-none"
                                    onClick={() =>
                                        setIsDownloadMenuOpen(
                                            !isDownloadMenuOpen
                                        )
                                    }
                                    title="Download Inventory"
                                    disabled={isDownloading}
                                >
                                    <div className="hidden text-sm md:block md:text-base">
                                        {isDownloading
                                            ? "Downloading..."
                                            : "Download"}
                                    </div>
                                    {isDownloading ? (
                                        <LoadingSpinner className="h-5 w-5 animate-spin fill-white text-blue-600 md:h-4 md:w-4" />
                                    ) : (
                                        <>
                                            <MdDownload className="h-6 w-6 md:h-5 md:w-5" />
                                            {/* <MdKeyboardArrowDown className="hidden h-4 w-4 md:block" /> */}
                                        </>
                                    )}
                                </button>

                                {/* Dropdown Menu */}
                                {isDownloadMenuOpen && !isDownloading && (
                                    <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-border bg-backgroundGray shadow-lg">
                                        <div className="py-1">
                                            <button
                                                onClick={() =>
                                                    handleDownload("all")
                                                }
                                                className="block w-full px-4 py-2 text-left text-sm text-white transition-colors hover:bg-blue-600/20"
                                            >
                                                Download All Items
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleDownload("mechanical")
                                                }
                                                className="block w-full px-4 py-2 text-left text-sm text-white transition-colors hover:bg-blue-600/20"
                                            >
                                                Download Mechanical Only
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleDownload(
                                                        "electronics"
                                                    )
                                                }
                                                className="block w-full px-4 py-2 text-left text-sm text-white transition-colors hover:bg-blue-600/20"
                                            >
                                                Download Electronics Only
                                            </button>
                                            <div className="my-1 border-t border-border"></div>
                                            <button
                                                onClick={() =>
                                                    handleDownload(
                                                        "all",
                                                        "low-stock"
                                                    )
                                                }
                                                className="block w-full px-4 py-2 text-left text-sm text-yellow-400 transition-colors hover:bg-blue-600/20"
                                            >
                                                Download Low Stock Items
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleDownload(
                                                        "all",
                                                        "out-of-stock"
                                                    )
                                                }
                                                className="block w-full px-4 py-2 text-left text-sm text-red-400 transition-colors hover:bg-blue-600/20"
                                            >
                                                Download Out of Stock Items
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Add Item Button */}
                            <button
                                className="flex items-center justify-center gap-x-2 rounded-lg border bg-green-600 p-2 shadow-md transition-all duration-150 hover:bg-green-700 hover:shadow-lg md:gap-x-2 md:rounded-md md:border-green-600 md:p-2.5 md:font-semibold md:shadow-none"
                                onClick={() => setIsAddDialogOpen(true)}
                                title="Add New Item"
                            >
                                <div className="hidden text-sm md:block md:text-base">
                                    Add Item
                                </div>
                                <MdAdd className="h-6 w-6 md:h-5 md:w-5" />
                            </button>
                        </>
                    )}
                </div>
            </Header>
            <div className="flex w-full flex-col bg-blue-900/25 p-2 md:p-4">
                {!statsLoading && stats && (
                    <div className="grid grid-cols-2 gap-3 p-2 md:grid-cols-5 md:gap-4 md:p-4">
                        <div className="flex min-h-[80px] flex-col justify-center gap-2 rounded-md border border-border bg-backgroundGray/30 p-3 md:min-h-[100px] md:gap-3 md:p-4">
                            <p className="text-xs text-neutral-400 md:text-sm">
                                Total Items
                            </p>
                            <p className="text-xl font-semibold md:text-2xl">
                                {stats.totalItems}
                            </p>
                        </div>
                        <div className="flex min-h-[80px] flex-col justify-center gap-2 rounded-md border border-border bg-backgroundGray/30 p-3 md:min-h-[100px] md:gap-3 md:p-4">
                            <p className="text-xs text-neutral-400 md:text-sm">
                                Mechanical
                            </p>
                            <p className="text-xl font-semibold md:text-2xl">
                                {stats.mechanical}
                            </p>
                        </div>
                        <div className="flex min-h-[80px] flex-col justify-center gap-2 rounded-md border border-border bg-backgroundGray/30 p-3 md:min-h-[100px] md:gap-3 md:p-4">
                            <p className="text-xs text-neutral-400 md:text-sm">
                                Electronics
                            </p>
                            <p className="text-xl font-semibold md:text-2xl">
                                {stats.electronics}
                            </p>
                        </div>
                        <div className="flex min-h-[80px] flex-col justify-center gap-2 rounded-md border border-border bg-backgroundGray/30 p-3 md:min-h-[100px] md:gap-3 md:p-4">
                            <p className="text-xs text-neutral-400 md:text-sm">
                                Low Stock
                            </p>
                            <p className="text-xl font-semibold text-yellow-500 md:text-2xl">
                                {stats.lowStock}
                            </p>
                        </div>
                        <div className="flex min-h-[80px] flex-col justify-center gap-2 rounded-md border border-border bg-backgroundGray/30 p-3 md:min-h-[100px] md:gap-3 md:p-4">
                            <p className="text-xs text-neutral-400 md:text-sm">
                                Out of Stock
                            </p>
                            <p className="text-xl font-semibold text-red-500 md:text-2xl">
                                {stats.outOfStock}
                            </p>
                        </div>
                    </div>
                )}

                <section className="m-auto my-4 flex h-full w-full flex-col items-center justify-center border-border bg-backgroundGray/30 md:my-8 md:rounded-md md:border">
                    <div className="flex h-auto w-full flex-col border-b border-t border-border md:h-[3rem] md:flex-row md:items-center md:divide-x md:divide-border md:border-t-0">
                        <label
                            htmlFor="Search"
                            className="flex h-[3rem] w-full items-center justify-between bg-backgroundGray/30 pr-3 text-sm text-white md:pr-4 md:text-lg"
                        >
                            <input
                                onChange={(event) =>
                                    setSearchQuery(event.target.value)
                                }
                                value={searchQuery}
                                type="text"
                                placeholder="Search by name or item ID"
                                className="block h-full w-full appearance-none items-center bg-transparent px-4 text-sm text-white placeholder:text-neutral-400 focus:outline-none md:px-8"
                            />
                            <MdSearch className="h-5 w-5 text-neutral-400 md:h-6 md:w-6" />
                        </label>
                        <div className="h-[3rem] w-full border-t border-border md:w-auto md:border-t-0">
                            <ComboBox
                                nullable={false}
                                label="Stock status"
                                items={["all", "low-stock", "out-of-stock"]}
                                selectedItem={stockFilter}
                                setSelectedItem={setStockFilter}
                                getItemLabel={(status) =>
                                    status === "all"
                                        ? "All"
                                        : status === "low-stock"
                                          ? "Low Stock"
                                          : "Out of Stock"
                                }
                                wrapperClassName="border-none z-10 px-4 md:px-8 bg-backgroundGray/30 h-full"
                                compareItems={(itemOne, itemTwo) =>
                                    itemOne === itemTwo
                                }
                                showLabel={false}
                                isSelect={true}
                            />
                        </div>
                    </div>

                    <Tabs
                        value={activeTab}
                        onValueChange={(value: string) =>
                            setActiveTab(value as InventoryCategory)
                        }
                        className="flex w-full flex-col"
                    >
                        <TabsList className="flex w-full flex-row gap-2 rounded-none border-b border-border bg-backgroundGray/30 p-3 text-white md:gap-3 md:p-7">
                            <TabsTrigger
                                value="mechanical"
                                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white transition-all md:px-4 md:py-2.5 md:text-base"
                            >
                                <span className="hidden sm:inline">
                                    Mechanical ({stats?.mechanical ?? 0})
                                </span>
                                <span className="sm:hidden">
                                    Mech ({stats?.mechanical ?? 0})
                                </span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="electronics"
                                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white transition-all md:px-4 md:py-2.5 md:text-base"
                            >
                                <span className="hidden sm:inline">
                                    Electronics ({stats?.electronics ?? 0})
                                </span>
                                <span className="sm:hidden">
                                    Elec ({stats?.electronics ?? 0})
                                </span>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="mechanical" className="mt-0">
                            {isLoading ? (
                                <div className="flex min-h-[30vh] items-center justify-center">
                                    <div className="flex flex-col items-center justify-center gap-6 md:gap-8">
                                        <LoadingSpinner className="h-6 w-6 animate-spin fill-white text-center text-background" />
                                        <span>Loading items</span>
                                    </div>
                                </div>
                            ) : currentItems && currentItems.length > 0 ? (
                                <InventoryTable
                                    items={currentItems}
                                    onEditItem={handleEditItem}
                                    onUpdateQuantity={handleOpenUpdateDialog}
                                    onDeleteItem={handleDeleteItem}
                                />
                            ) : (
                                <div className="flex min-h-[30vh] items-center justify-center bg-background">
                                    <span>No items found</span>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="electronics" className="mt-0">
                            {isLoading ? (
                                <div className="flex min-h-[30vh] items-center justify-center bg-background">
                                    <div className="flex flex-col items-center justify-center gap-6 md:gap-8">
                                        <LoadingSpinner className="h-6 w-6 animate-spin fill-white text-center text-background" />
                                        <span>Loading items</span>
                                    </div>
                                </div>
                            ) : currentItems && currentItems.length > 0 ? (
                                <InventoryTable
                                    items={currentItems}
                                    onEditItem={handleEditItem}
                                    onUpdateQuantity={handleOpenUpdateDialog}
                                    onDeleteItem={handleDeleteItem}
                                />
                            ) : (
                                <div className="flex min-h-[30vh] items-center justify-center bg-background">
                                    <span>No items found</span>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </section>
            </div>

            <AddItemDialog
                isOpen={isAddDialogOpen}
                onClose={() => {
                    setIsAddDialogOpen(false);
                    setEditingItem(null);
                }}
                onSubmit={handleCreateItem}
                isLoading={editingItem ? updateItemMutation.isLoading : createItemMutation.isLoading}
                editMode={editingItem ? { item: editingItem } : undefined}
            />

            {selectedItem && (
                <UpdateQuantityDialog
                    isOpen={isUpdateDialogOpen}
                    onClose={() => {
                        setIsUpdateDialogOpen(false);
                        setSelectedItem(null);
                    }}
                    item={selectedItem}
                    onSubmit={(payload) =>
                        handleUpdateQuantity(selectedItem.itemId, payload)
                    }
                    isLoading={updateQuantityMutation.isLoading}
                />
            )}
        </>
    );
};

export default Inventory;
