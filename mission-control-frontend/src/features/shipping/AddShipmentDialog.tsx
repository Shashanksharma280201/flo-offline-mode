import { useMemo } from "react";
import { useQuery } from "react-query";
import Popup from "@/components/popup/Popup";
import SmIconButton from "@/components/ui/SmIconButton";
import { type CreateShipmentPayload, type ShipmentType } from "@/api/shipmentApi";
import { getRobotListFn } from "@/features/analytics/analyticsService";
import { fetchInventoryItems } from "@/api/inventoryApi";
import { format } from "date-fns";
import Calendar from "@/components/ui/Calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { MdCalendarToday } from "react-icons/md";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useShipmentForm, type UIItemReference } from "./hooks/useShipmentForm";
import { type RobotType } from "@/data/types/robotTypes";
import { RobotShipmentTab } from "./components/RobotShipmentTab";
import { MiscShipmentTab } from "./components/MiscShipmentTab";

interface AddShipmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateShipmentPayload) => void;
    isLoading: boolean;
}

const AddShipmentDialog = ({ isOpen, onClose, onSubmit, isLoading }: AddShipmentDialogProps) => {
    const { state, dispatch } = useShipmentForm();

    const { data: robotsData } = useQuery("robots-for-shipment", getRobotListFn, {
        staleTime: 5 * 60 * 1000,
        cacheTime: 10 * 60 * 1000
    });

    const { data: inventoryData } = useQuery(
        "inventory-for-shipment",
        () => fetchInventoryItems({ limit: 1000 }),
        {
            staleTime: 5 * 60 * 1000,
            cacheTime: 10 * 60 * 1000
        }
    );

    const robots = (robotsData as RobotType[]) || [];
    const allInventoryItems = inventoryData?.items || [];

    const filteredRobots = useMemo(() => {
        if (!state.robotQuery) return robots;
        return robots.filter((robot) =>
            robot.name.toLowerCase().includes(state.robotQuery.toLowerCase())
        );
    }, [robots, state.robotQuery]);

    const mechanicalItems = useMemo(
        () => allInventoryItems.filter((item) => item.category === "mechanical"),
        [allInventoryItems]
    );

    const electronicsItems = useMemo(
        () => allInventoryItems.filter((item) => item.category === "electronics"),
        [allInventoryItems]
    );

    const filteredMechanicalItems = useMemo(() => {
        if (!state.mechanicalQuery) return mechanicalItems;
        const query = state.mechanicalQuery.toLowerCase();
        return mechanicalItems.filter(
            (item) =>
                item.name.toLowerCase().includes(query) ||
                item.itemId.toLowerCase().includes(query)
        );
    }, [mechanicalItems, state.mechanicalQuery]);

    const filteredElectronicsItems = useMemo(() => {
        if (!state.electronicsQuery) return electronicsItems;
        const query = state.electronicsQuery.toLowerCase();
        return electronicsItems.filter(
            (item) =>
                item.name.toLowerCase().includes(query) ||
                item.itemId.toLowerCase().includes(query)
        );
    }, [electronicsItems, state.electronicsQuery]);
    
    const handleAddItem = (itemId: string, category: "mechanical" | "electronics", listKey: 'robotMechanicalItems' | 'robotElectronicsItems' | 'miscMechanicalItems' | 'miscElectronicsItems') => {
        if (itemId === "OTHERS") {
            const newItem: UIItemReference = {
                inventoryItemId: "OTHERS",
                itemId: "OTHERS",
                name: "Others",
                quantity: 0,
                unit: "pieces",
                customDescription: ""
            };
            dispatch({ type: "ADD_ITEM", payload: { item: newItem, listKey } });
            return;
        }

        const items = category === "mechanical" ? mechanicalItems : electronicsItems;
        const item = items.find((i) => i.itemId === itemId);
        if (!item) return;

        const newItem: UIItemReference = {
            inventoryItemId: item.id,
            itemId: item.itemId,
            name: item.name,
            quantity: 0,
            unit: item.unit,
            availableQuantity: item.quantity
        };
        dispatch({ type: "ADD_ITEM", payload: { item: newItem, listKey } });
    };

    const handleClose = () => {
        dispatch({ type: "RESET_FORM" });
        onClose();
    };

    const handleSubmit = () => {
        const {startLocation, endLocation, startDate, endDate, description, type, selectedRobot, robotMechanicalItems, robotElectronicsItems, miscMechanicalItems, miscElectronicsItems, othersDescription} = state;
        if (!startLocation || !endLocation || !startDate || !endDate) {
            alert("Please fill all required fields");
            return;
        }

        if (!description || description.trim() === "") {
            alert("Description is required");
            return;
        }

        if (type === "robot" && !selectedRobot) {
            alert("Please select a robot");
            return;
        }
        
        const allMiscItems = [...miscMechanicalItems, ...miscElectronicsItems];

        if (type === "miscellaneous") {
            const hasItems = allMiscItems.length > 0;
            const hasOthers = othersDescription.trim() !== "";

            if (!hasItems && !hasOthers) {
                alert("Please select at least one item from Mechanical, Electronics, or describe Others");
                return;
            }

            if (hasOthers) {
                allMiscItems.push({
                    inventoryItemId: "OTHERS",
                    itemId: "OTHERS",
                    name: "Others",
                    quantity: 1,
                    unit: "pieces",
                    customDescription: othersDescription
                });
            }
        }

        const allRobotItems = [...robotMechanicalItems, ...robotElectronicsItems];
        const othersWithoutDescription = allRobotItems.filter(
            (item) =>
                item.itemId === "OTHERS" &&
                (!item.customDescription || item.customDescription.trim() === "")
        );

        if (othersWithoutDescription.length > 0) {
            alert("Please provide a description for all 'Others' items");
            return;
        }

        if (type === "robot" && allRobotItems.length > 0) {
            const itemsWithZeroQty = allRobotItems.filter((item) => item.quantity <= 0);
            if (itemsWithZeroQty.length > 0) {
                alert("Please enter a quantity greater than 0 for all items");
                return;
            }
        }

        if (type === "miscellaneous" && allMiscItems.length > 0) {
            const itemsWithZeroQty = allMiscItems.filter(
                (item) => item.itemId !== "OTHERS" && item.quantity <= 0
            );
            if (itemsWithZeroQty.length > 0) {
                alert("Please enter a quantity greater than 0 for all items");
                return;
            }
        }

        let payload: CreateShipmentPayload;

        if (type === "robot") {
            const allAdditionalItems = [...robotMechanicalItems, ...robotElectronicsItems];
            payload = {
                type: "robot",
                robots: [{ robotId: selectedRobot!.id, name: selectedRobot!.name || "" }],
                additionalItems: allAdditionalItems.length > 0 ? allAdditionalItems : undefined,
                startLocation,
                endLocation,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                description: description || undefined
            };
        } else {
            payload = {
                type: "miscellaneous",
                items: allMiscItems,
                startLocation,
                endLocation,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                description: description || undefined
            };
        }

        onSubmit(payload);
    };

    return (
        <Popup
            title="Create New Shipment"
            description="Ship robots and inventory items to another location"
            onClose={handleClose}
            dialogToggle={isOpen}
        >
            <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto bg-transparent pr-1 text-white md:gap-4 md:pr-2">
                <Tabs
                    value={state.type}
                    onValueChange={(value) => dispatch({ type: "SET_TYPE", payload: value as ShipmentType })}
                >
                    <TabsList className="grid h-fit w-full grid-cols-2 bg-transparent">
                        <TabsTrigger className="flex rounded-xl text-sm text-white md:text-lg" value="robot">
                            <span className="hidden sm:inline">Robot Shipping</span>
                            <span className="sm:hidden">Robot</span>
                        </TabsTrigger>
                        <TabsTrigger className="flex rounded-xl text-sm text-white md:text-lg" value="miscellaneous">
                            <span className="hidden sm:inline">Miscellaneous Items</span>
                            <span className="sm:hidden">Misc Items</span>
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="robot">
                        <RobotShipmentTab
                            state={state}
                            dispatch={dispatch}
                            filteredRobots={filteredRobots}
                            mechanicalItems={filteredMechanicalItems}
                            electronicsItems={filteredElectronicsItems}
                            handleAddItem={handleAddItem}
                        />
                    </TabsContent>
                    <TabsContent value="miscellaneous">
                        <MiscShipmentTab
                            state={state}
                            dispatch={dispatch}
                            mechanicalItems={filteredMechanicalItems}
                            electronicsItems={filteredElectronicsItems}
                            handleAddItem={handleAddItem}
                        />
                    </TabsContent>
                </Tabs>

                {/* Common Fields */}
                <div className="rounded-md border border-border bg-gray-800/45 p-3 md:p-4">
                    <div className="mb-3 md:mb-4">
                        <label className="mb-1.5 block text-xs text-neutral-400 md:mb-2 md:text-sm">
                            Description *
                        </label>
                        <textarea
                            value={state.description}
                            onChange={(e) => dispatch({ type: "SET_FIELD", payload: { field: "description", value: e.target.value } })}
                            placeholder="Add shipping notes or description... (Required)"
                            rows={3}
                            className="w-full rounded-md border border-border bg-transparent p-2 text-sm text-white outline-none transition-all md:p-2.5 md:text-base"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                        <div>
                            <label className="mb-1.5 block text-xs text-neutral-400 md:mb-2 md:text-sm">
                                Start Location *
                            </label>
                            <input
                                type="text"
                                value={state.startLocation}
                                onChange={(e) => dispatch({ type: "SET_FIELD", payload: { field: "startLocation", value: e.target.value } })}
                                placeholder="e.g., Bangalore Warehouse"
                                className="w-full rounded-md border border-border bg-transparent p-2 text-sm text-white outline-none transition-all md:p-2.5 md:text-base"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs text-neutral-400 md:mb-2 md:text-sm">
                                End Location *
                            </label>
                            <input
                                type="text"
                                value={state.endLocation}
                                onChange={(e) => dispatch({ type: "SET_FIELD", payload: { field: "endLocation", value: e.target.value } })}
                                placeholder="e.g., Mumbai Site"
                                className="w-full rounded-md border border-border bg-transparent p-2 text-sm text-white outline-none transition-all md:p-2.5 md:text-base"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs text-neutral-400 md:mb-2 md:text-sm">Start Date *</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex w-full items-center justify-between rounded-md border border-border bg-transparent p-2 text-left text-sm text-white outline-none transition-all hover:border-neutral-500 md:p-2.5 md:text-base"
                                    >
                                        {state.startDate ? format(state.startDate, "MMM dd, yyyy") : <span>Pick a date</span>}
                                        <MdCalendarToday className="h-4 w-4 text-neutral-400 md:h-5 md:w-5" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="z-[9999] w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={state.startDate}
                                        onSelect={(date) => dispatch({ type: "SET_FIELD", payload: { field: "startDate", value: date } })}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs text-neutral-400 md:mb-2 md:text-sm">End Date *</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex w-full items-center justify-between rounded-md border border-border bg-transparent p-2 text-left text-sm text-white outline-none transition-all hover:border-neutral-500 md:p-2.5 md:text-base"
                                    >
                                        {state.endDate ? format(state.endDate, "MMM dd, yyyy") : <span>Pick a date</span>}
                                        <MdCalendarToday className="h-4 w-4 text-neutral-400 md:h-5 md:w-5" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="z-[9999] w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={state.endDate}
                                        onSelect={(date) => dispatch({ type: "SET_FIELD", payload: { field: "endDate", value: date } })}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-neutral-700 pt-3 md:gap-3 md:pt-4">
                <SmIconButton
                    name="Cancel"
                    className="border border-backgroundGray bg-transparent text-sm font-semibold text-white hover:bg-white/20 md:text-base"
                    onClick={handleClose}
                />
                <SmIconButton
                    name={isLoading ? "Creating..." : "Create Shipment"}
                    className="border bg-white text-sm font-semibold text-black md:text-base"
                    onClick={handleSubmit}
                    isLoading={isLoading}
                />
            </div>
        </Popup>
    );
};

export default AddShipmentDialog;