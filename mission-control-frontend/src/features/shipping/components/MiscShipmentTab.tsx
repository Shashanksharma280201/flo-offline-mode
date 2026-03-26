import { type Dispatch } from "react";
import { type UIItemReference, type Action } from "../hooks/useShipmentForm";
import { ShipmentItemsManager } from "./ShipmentItemsManager";
import { type InventoryItem } from "@/api/inventoryApi";

interface MiscShipmentTabProps {
    state: {
        miscMechanicalItems: UIItemReference[];
        miscElectronicsItems: UIItemReference[];
        othersDescription: string;
        mechanicalQuery: string;
        electronicsQuery: string;
    };
    dispatch: Dispatch<Action>;
    mechanicalItems: InventoryItem[];
    electronicsItems: InventoryItem[];
    handleAddItem: (itemId: string, category: 'mechanical' | 'electronics', listKey: 'robotMechanicalItems' | 'robotElectronicsItems' | 'miscMechanicalItems' | 'miscElectronicsItems') => void;
}

export const MiscShipmentTab = ({
    state,
    dispatch,
    mechanicalItems,
    electronicsItems,
    handleAddItem,
}: MiscShipmentTabProps) => {
    return (
        <div className="space-y-3 md:space-y-4">
            <div className="rounded-md border border-border bg-gray-800/45 p-3 md:p-4">
                <label className="mb-1.5 block text-xs text-neutral-400 md:mb-2 md:text-sm">
                    Select Items (Select at least one option below)
                </label>
                <div className="space-y-2 md:space-y-3">
                    <div>
                        <p className="mb-1 text-xs text-neutral-500">Mechanical</p>
                        <ShipmentItemsManager
                            category="mechanical"
                            availableItems={mechanicalItems}
                            selectedItems={state.miscMechanicalItems}
                            query={state.mechanicalQuery}
                            onQueryChange={(query) => dispatch({ type: "SET_FIELD", payload: { field: "mechanicalQuery", value: query } })}
                            onAddItem={(itemId) => handleAddItem(itemId, "mechanical", "miscMechanicalItems")}
                            onRemoveItem={(itemId) => dispatch({ type: "REMOVE_ITEM", payload: { itemId, listKey: "miscMechanicalItems" } })}
                            onUpdateItem={(itemId, updates) => dispatch({ type: "UPDATE_ITEM", payload: { itemId, listKey: "miscMechanicalItems", updates } })}
                        />
                    </div>
                    <div>
                        <p className="mb-1 text-xs text-neutral-500">Electronics</p>
                        <ShipmentItemsManager
                            category="electronics"
                            availableItems={electronicsItems}
                            selectedItems={state.miscElectronicsItems}
                            query={state.electronicsQuery}
                            onQueryChange={(query) => dispatch({ type: "SET_FIELD", payload: { field: "electronicsQuery", value: query } })}
                            onAddItem={(itemId) => handleAddItem(itemId, "electronics", "miscElectronicsItems")}
                            onRemoveItem={(itemId) => dispatch({ type: "REMOVE_ITEM", payload: { itemId, listKey: "miscElectronicsItems" } })}
                            onUpdateItem={(itemId, updates) => dispatch({ type: "UPDATE_ITEM", payload: { itemId, listKey: "miscElectronicsItems", updates } })}
                        />
                    </div>
                    <div>
                        <p className="mb-1 text-xs text-neutral-500">Others</p>
                        <textarea
                            value={state.othersDescription}
                            onChange={(e) => dispatch({ type: "SET_FIELD", payload: { field: "othersDescription", value: e.target.value } })}
                            placeholder="Describe custom items to ship..."
                            rows={2}
                            className="w-full rounded-md border border-border bg-gray-800 p-2 text-sm text-white placeholder-neutral-500 outline-none transition-all focus:border-yellow-500 md:p-2.5 md:text-base"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};