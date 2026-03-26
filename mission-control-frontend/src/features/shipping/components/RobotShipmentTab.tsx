import { Combobox } from "@headlessui/react";
import { type Dispatch } from "react";
import { type UIItemReference, type Action } from "../hooks/useShipmentForm";
import { type RobotType } from "@/data/types/robotTypes";
import { ShipmentItemsManager } from "./ShipmentItemsManager";
import { type InventoryItem } from "@/api/inventoryApi";

interface RobotShipmentTabProps {
    state: {
        selectedRobot: RobotType | null;
        robotQuery: string;
        robotMechanicalItems: UIItemReference[];
        robotElectronicsItems: UIItemReference[];
        mechanicalQuery: string;
        electronicsQuery: string;
    };
    dispatch: Dispatch<Action>;
    filteredRobots: RobotType[];
    mechanicalItems: InventoryItem[];
    electronicsItems: InventoryItem[];
    handleAddItem: (itemId: string, category: 'mechanical' | 'electronics', listKey: 'robotMechanicalItems' | 'robotElectronicsItems' | 'miscMechanicalItems' | 'miscElectronicsItems') => void;
}

export const RobotShipmentTab = ({
    state,
    dispatch,
    filteredRobots,
    mechanicalItems,
    electronicsItems,
    handleAddItem,
}: RobotShipmentTabProps) => {
    return (
        <div className="space-y-3 md:space-y-4">
            {/* Robot Selection */}
            <div className="rounded-md border border-border bg-gray-800/45 p-3 md:p-4">
                <label className="mb-1.5 block text-xs text-neutral-400 md:mb-2 md:text-sm">
                    Select Robot *
                </label>
                <Combobox
                    value={state.selectedRobot}
                    onChange={(robot) => dispatch({ type: "SET_ROBOT", payload: robot })}
                >
                    <div className="relative w-full">
                        <Combobox.Input
                            className="w-full rounded-md border border-border bg-gray-800 px-3 py-2 text-sm text-white md:text-base"
                            displayValue={(robot: RobotType) => robot?.name ?? ""}
                            onChange={(event) => dispatch({ type: "SET_FIELD", payload: { field: "robotQuery", value: event.target.value }})}
                            placeholder="Search robot…"
                        />
                        <Combobox.Option value={null} className="hidden" />
                        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-gray-900 py-1 shadow-lg">
                            {filteredRobots.length === 0 && state.robotQuery !== "" ? (
                                <div className="px-3 py-2 text-sm text-neutral-400">
                                    No robots found
                                </div>
                            ) : (
                                filteredRobots.map((robot) => (
                                    <Combobox.Option
                                        key={robot.id}
                                        value={robot}
                                        className={({ active }) =>
                                            `cursor-pointer px-3 py-2 text-sm md:text-base ${active ? "bg-gray-800 text-white" : "text-white"}`
                                        }
                                    >
                                        {robot.name}
                                    </Combobox.Option>
                                ))
                            )}
                        </Combobox.Options>
                    </div>
                </Combobox>
            </div>

            {/* Additional Items */}
            <div className="rounded-md border border-border bg-gray-800/45 p-3 md:p-4">
                <label className="mb-1.5 block text-xs text-neutral-400 md:mb-2 md:text-sm">
                    Additional Items (Optional)
                </label>
                <div className="space-y-2 md:space-y-3">
                    <div>
                        <p className="mb-1 text-xs text-neutral-500">Mechanical</p>
                        <ShipmentItemsManager
                            category="mechanical"
                            availableItems={mechanicalItems}
                            selectedItems={state.robotMechanicalItems}
                            query={state.mechanicalQuery}
                            onQueryChange={(query) => dispatch({ type: "SET_FIELD", payload: { field: "mechanicalQuery", value: query } })}
                            onAddItem={(itemId) => handleAddItem(itemId, "mechanical", "robotMechanicalItems")}
                            onRemoveItem={(itemId) => dispatch({ type: "REMOVE_ITEM", payload: { itemId, listKey: "robotMechanicalItems" } })}
                            onUpdateItem={(itemId, updates) => dispatch({ type: "UPDATE_ITEM", payload: { itemId, listKey: "robotMechanicalItems", updates } })}
                        />
                    </div>
                    <div>
                        <p className="mb-1 text-xs text-neutral-500">Electronics</p>
                        <ShipmentItemsManager
                            category="electronics"
                            availableItems={electronicsItems}
                            selectedItems={state.robotElectronicsItems}
                            query={state.electronicsQuery}
                            onQueryChange={(query) => dispatch({ type: "SET_FIELD", payload: { field: "electronicsQuery", value: query } })}
                            onAddItem={(itemId) => handleAddItem(itemId, "electronics", "robotElectronicsItems")}
                            onRemoveItem={(itemId) => dispatch({ type: "REMOVE_ITEM", payload: { itemId, listKey: "robotElectronicsItems" } })}
                            onUpdateItem={(itemId, updates) => dispatch({ type: "UPDATE_ITEM", payload: { itemId, listKey: "robotElectronicsItems", updates } })}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};