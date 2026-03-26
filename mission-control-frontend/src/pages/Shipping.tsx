import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import Header from "@/components/header/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MdAdd, MdSearch } from "react-icons/md";
import { checkPermission } from "@/util/roles";
import { errorLogger } from "@/util/errorLogger";
import {
    fetchShipments,
    fetchShipmentStats,
    createShipment,
    updateShipment,
    deleteShipment,
    type ShipmentType,
    type Shipment,
    type CreateShipmentPayload,
    type UpdateShipmentPayload
} from "@/api/shipmentApi";
import ShipmentTable from "@/features/shipping/ShipmentTable";
import AddShipmentDialog from "@/features/shipping/AddShipmentDialog";
import EditShipmentDialog from "@/features/shipping/EditShipmentDialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/Select";

const Shipping = () => {
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<ShipmentType>("robot");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(
        null
    );
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Parse URL parameters and pre-fill search on mount
    useEffect(() => {
        const robotName = searchParams.get("robotName");
        const shipmentId = searchParams.get("shipmentId");

        if (robotName || shipmentId) {
            // Combine robot name and shipment ID for search
            const searchTerms = [robotName, shipmentId]
                .filter(Boolean)
                .join(" ");
            setSearchQuery(searchTerms);
        }
    }, [searchParams]);

    const { data: stats, isLoading: statsLoading } = useQuery(
        "shipment-stats",
        fetchShipmentStats,
        {
            onError: errorLogger
        }
    );

    const { data: robotData, isLoading: robotLoading } = useQuery(
        ["shipments", "robot", searchQuery, statusFilter],
        () =>
            fetchShipments({
                type: "robot",
                search: searchQuery || undefined,
                status:
                    statusFilter === "in-transit"
                        ? "in-transit"
                        : statusFilter === "delivered"
                          ? "delivered"
                          : statusFilter === "cancelled"
                            ? "cancelled"
                            : undefined,
                limit: 100
            }),
        {
            onError: errorLogger,
            keepPreviousData: true
        }
    );

    const { data: miscellaneousData, isLoading: miscellaneousLoading } =
        useQuery(
            ["shipments", "miscellaneous", searchQuery, statusFilter],
            () =>
                fetchShipments({
                    type: "miscellaneous",
                    search: searchQuery || undefined,
                    status:
                        statusFilter === "in-transit"
                            ? "in-transit"
                            : statusFilter === "delivered"
                              ? "delivered"
                              : statusFilter === "cancelled"
                                ? "cancelled"
                                : undefined,
                    limit: 100
                }),
            {
                onError: errorLogger,
                keepPreviousData: true
            }
        );

    const createShipmentMutation = useMutation(
        (payload: CreateShipmentPayload) => createShipment(payload),
        {
            onSuccess: () => {
                toast.success("Shipment created successfully");
                queryClient.invalidateQueries("shipments");
                queryClient.invalidateQueries("shipment-stats");
                setIsAddDialogOpen(false);
            },
            onError: errorLogger
        }
    );

    const updateShipmentMutation = useMutation(
        ({
            shipmentId,
            payload
        }: {
            shipmentId: string;
            payload: UpdateShipmentPayload;
        }) => updateShipment(shipmentId, payload),
        {
            onSuccess: () => {
                toast.success("Shipment updated successfully");
                queryClient.invalidateQueries("shipments");
                queryClient.invalidateQueries("shipment-stats");
                setIsEditDialogOpen(false);
                setSelectedShipment(null);
            },
            onError: errorLogger
        }
    );

    const deleteShipmentMutation = useMutation(
        (shipmentId: string) => deleteShipment(shipmentId),
        {
            onSuccess: () => {
                toast.success("Shipment deleted successfully");
                queryClient.invalidateQueries("shipments");
                queryClient.invalidateQueries("shipment-stats");
            },
            onError: errorLogger
        }
    );

    const handleCreateShipment = (payload: CreateShipmentPayload) => {
        createShipmentMutation.mutate(payload);
    };

    const handleUpdateShipment = (
        shipmentId: string,
        payload: UpdateShipmentPayload
    ) => {
        updateShipmentMutation.mutate({ shipmentId, payload });
    };

    const handleOpenEditDialog = (shipment: Shipment) => {
        setSelectedShipment(shipment);
        setIsEditDialogOpen(true);
    };

    const handleDeleteShipment = (shipmentId: string) => {
        if (window.confirm("Are you sure you want to delete this shipment?")) {
            deleteShipmentMutation.mutate(shipmentId);
        }
    };

    const currentShipments =
        activeTab === "robot"
            ? robotData?.shipments
            : miscellaneousData?.shipments;
    const isLoading =
        activeTab === "robot" ? robotLoading : miscellaneousLoading;

    return (
        <>
            <Header title="Shipping">
                {checkPermission("change_robots") && (
                    <button
                        className="flex items-center justify-center gap-x-2 rounded-lg border bg-green-600 p-2 shadow-md transition-all duration-150 hover:bg-green-700 hover:shadow-lg md:gap-x-2 md:rounded-md md:border-green-600 md:p-2.5 md:font-semibold md:shadow-none"
                        onClick={() => setIsAddDialogOpen(true)}
                        title="Create New Shipment"
                    >
                        <div className="hidden text-sm md:block md:text-base">
                            New Shipment
                        </div>
                        <MdAdd className="h-6 w-6 md:h-5 md:w-5" />
                    </button>
                )}
            </Header>
            <div className="flex w-full flex-col bg-blue-900/25 p-2 md:p-4">
                {!statsLoading && stats && (
                    <div className="grid grid-cols-2 gap-3 p-2 md:grid-cols-5 md:gap-4 md:p-4">
                        <div className="flex min-h-[80px] flex-col justify-center gap-2 rounded-md border border-border bg-backgroundGray/30 p-3 md:min-h-[100px] md:gap-3 md:p-4">
                            <p className="text-xs text-neutral-400 md:text-sm">
                                Total Shipments
                            </p>
                            <p className="text-xl font-semibold md:text-2xl">
                                {stats.totalShipments}
                            </p>
                        </div>
                        <div className="flex min-h-[80px] flex-col justify-center gap-2 rounded-md border border-border bg-backgroundGray/30 p-3 md:min-h-[100px] md:gap-3 md:p-4">
                            <p className="text-xs text-neutral-400 md:text-sm">
                                Robot Shipments
                            </p>
                            <p className="text-xl font-semibold md:text-2xl">
                                {stats.robotShipments}
                            </p>
                        </div>
                        <div className="flex min-h-[80px] flex-col justify-center gap-2 rounded-md border border-border bg-backgroundGray/30 p-3 md:min-h-[100px] md:gap-3 md:p-4">
                            <p className="text-xs text-neutral-400 md:text-sm">
                                Miscellaneous
                            </p>
                            <p className="text-xl font-semibold md:text-2xl">
                                {stats.miscellaneousShipments}
                            </p>
                        </div>
                        <div className="flex min-h-[80px] flex-col justify-center gap-2 rounded-md border border-border bg-backgroundGray/30 p-3 md:min-h-[100px] md:gap-3 md:p-4">
                            <p className="text-xs text-neutral-400 md:text-sm">
                                In Transit
                            </p>
                            <p className="text-xl font-semibold text-yellow-500 md:text-2xl">
                                {stats.inTransit}
                            </p>
                        </div>
                        <div className="flex min-h-[80px] flex-col justify-center gap-2 rounded-md border border-border bg-backgroundGray/30 p-3 md:min-h-[100px] md:gap-3 md:p-4">
                            <p className="text-xs text-neutral-400 md:text-sm">
                                Delivered
                            </p>
                            <p className="text-xl font-semibold text-green-500 md:text-2xl">
                                {stats.delivered}
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
                                placeholder="Search by shipment ID, location, robot name, or item"
                                className="block h-full w-full appearance-none items-center bg-transparent px-4 text-sm text-white placeholder:text-neutral-400 focus:outline-none md:px-8"
                            />
                            <MdSearch className="h-5 w-5 text-neutral-400 md:h-6 md:w-6" />
                        </label>
                        <div className="h-[3rem] w-full border-t border-border md:w-auto md:border-t-0">
                            <Select
                                value={statusFilter}
                                onValueChange={setStatusFilter}
                            >
                                <SelectTrigger className="h-full w-full rounded-none border-none bg-backgroundGray/30 px-4 text-white md:w-[200px] md:px-8">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent className="z-[9999]">
                                    <SelectItem value="all">
                                        All Status
                                    </SelectItem>
                                    <SelectItem value="in-transit">
                                        In Transit
                                    </SelectItem>
                                    <SelectItem value="delivered">
                                        Delivered
                                    </SelectItem>
                                    <SelectItem value="cancelled">
                                        Cancelled
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Tabs
                        value={activeTab}
                        onValueChange={(value: string) =>
                            setActiveTab(value as ShipmentType)
                        }
                        className="flex w-full flex-col"
                    >
                        <TabsList className="flex w-full flex-row gap-2 rounded-none border-b border-border bg-backgroundGray/30 p-3 text-white md:gap-3 md:p-7 md:text-lg">
                            <TabsTrigger
                                value="robot"
                                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white transition-all md:text-base"
                            >
                                <span className="hidden sm:inline">
                                    Robot Shipping
                                </span>
                                <span className="sm:hidden">
                                    Robots ({stats?.robotShipments ?? 0})
                                </span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="miscellaneous"
                                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white transition-all md:px-4 md:py-2.5 md:text-base"
                            >
                                <span className="hidden sm:inline">
                                    Miscellaneous Items
                                </span>
                                <span className="sm:hidden">
                                    Misc ({stats?.miscellaneousShipments ?? 0})
                                </span>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="robot" className="mt-0">
                            {isLoading ? (
                                <div className="flex min-h-[30vh] items-center justify-center">
                                    <div className="flex flex-col items-center justify-center gap-6 md:gap-8">
                                        <LoadingSpinner className="h-6 w-6 animate-spin fill-white text-center text-background" />
                                        <span>Loading shipments</span>
                                    </div>
                                </div>
                            ) : currentShipments &&
                              currentShipments.length > 0 ? (
                                <ShipmentTable
                                    shipments={currentShipments}
                                    onEditShipment={handleOpenEditDialog}
                                    onDeleteShipment={handleDeleteShipment}
                                />
                            ) : (
                                <div className="flex min-h-[30vh] items-center justify-center bg-background">
                                    <span>No shipments found</span>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="miscellaneous" className="mt-0">
                            {isLoading ? (
                                <div className="flex min-h-[30vh] items-center justify-center bg-background">
                                    <div className="flex flex-col items-center justify-center gap-6 md:gap-8">
                                        <LoadingSpinner className="h-6 w-6 animate-spin fill-white text-center text-background" />
                                        <span>Loading shipments</span>
                                    </div>
                                </div>
                            ) : currentShipments &&
                              currentShipments.length > 0 ? (
                                <ShipmentTable
                                    shipments={currentShipments}
                                    onEditShipment={handleOpenEditDialog}
                                    onDeleteShipment={handleDeleteShipment}
                                />
                            ) : (
                                <div className="flex min-h-[30vh] items-center justify-center bg-background">
                                    <span>No shipments found</span>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </section>
            </div>

            <AddShipmentDialog
                isOpen={isAddDialogOpen}
                onClose={() => setIsAddDialogOpen(false)}
                onSubmit={handleCreateShipment}
                isLoading={createShipmentMutation.isLoading}
            />

            {selectedShipment && (
                <EditShipmentDialog
                    isOpen={isEditDialogOpen}
                    onClose={() => {
                        setIsEditDialogOpen(false);
                        setSelectedShipment(null);
                    }}
                    shipment={selectedShipment}
                    onSubmit={(payload) =>
                        handleUpdateShipment(
                            selectedShipment.shipmentId,
                            payload
                        )
                    }
                    isLoading={updateShipmentMutation.isLoading}
                />
            )}
        </>
    );
};

export default Shipping;
