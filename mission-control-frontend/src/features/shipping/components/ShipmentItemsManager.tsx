
import { Combobox } from "@headlessui/react";
import { MdClose } from "react-icons/md";
import { type InventoryItem } from "@/api/inventoryApi";
import { type UIItemReference } from "../hooks/useShipmentForm";

interface ShipmentItemsManagerProps {
    category: "mechanical" | "electronics";
    availableItems: InventoryItem[];
    selectedItems: UIItemReference[];
    query: string;
    onQueryChange: (query: string) => void;
    onAddItem: (itemId: string) => void;
    onRemoveItem: (itemId: string) => void;
    onUpdateItem: (itemId: string, updates: Partial<UIItemReference>) => void;
}

export const ShipmentItemsManager = ({
    category,
    availableItems,
    selectedItems,
    query,
    onQueryChange,
    onAddItem,
    onRemoveItem,
    onUpdateItem
}: ShipmentItemsManagerProps) => {

    const handleUpdateQty = (itemId: string, value: string) => {
        const quantity = value === "" ? 0 : parseInt(value) || 0;
        onUpdateItem(itemId, { quantity });
    };

    const handleUpdateCustomDescription = (itemId: string, customDescription: string) => {
        onUpdateItem(itemId, { customDescription });
    };

    const itemsForCombobox = availableItems.filter(
        (item) => !selectedItems.find((s) => s.itemId === item.itemId)
    );

    return (
        <div>
            {/* --- COMBOBOX for adding items --- */}
            <Combobox
                value={null}
                onChange={(item: InventoryItem | null) => {
                    if (item) {
                        onAddItem(item.itemId);
                        onQueryChange(""); // Clear search after selection
                    }
                }}
            >
                <div className="relative w-full">
                    <Combobox.Input
                        className="w-full rounded-md border border-border bg-gray-800 px-3 py-2 text-sm text-white placeholder-neutral-400 md:text-base"
                        displayValue={() => ""}
                        onChange={(event) => onQueryChange(event.target.value)}
                        placeholder={`Search ${category} items...`}
                        value={query}
                    />

                    <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-gray-900 py-1 shadow-lg">
                        {itemsForCombobox.length === 0 && query !== "" ? (
                            <div className="px-3 py-2 text-sm text-neutral-400">
                                No items found
                            </div>
                        ) : (
                            <>
                                <Combobox.Option value={null} className="hidden" />
                                {itemsForCombobox.map((item) => (
                                    <Combobox.Option
                                        key={item.itemId}
                                        value={item}
                                        className={({ active }) =>
                                            `cursor-pointer px-3 py-2 text-sm md:text-base ${active ? "bg-gray-800 text-white" : "text-white"}`
                                        }
                                    >
                                        <div className="flex w-full items-center justify-between">
                                            <span>{item.name} ({item.itemId})</span>
                                            <span className="ml-2 text-xs text-green-400">
                                                Avail: {item.quantity} {item.unit}
                                            </span>
                                        </div>
                                    </Combobox.Option>
                                ))}
                                <Combobox.Option
                                    value={{ itemId: "OTHERS" } as any}
                                    className={({ active }) =>
                                        `cursor-pointer border-t border-border px-3 py-2 text-sm md:text-base ${active ? "bg-gray-800 text-yellow-400" : "text-yellow-400"}`
                                    }
                                    onClick={() => {
                                        onAddItem("OTHERS");
                                        onQueryChange("");
                                    }}
                                >
                                    <span className="font-medium">+ Others (Custom Item)</span>
                                </Combobox.Option>
                            </>
                        )}
                    </Combobox.Options>
                </div>
            </Combobox>

            {/* --- SELECTED ITEMS list --- */}
            {selectedItems.length > 0 && (
                 <div className="mt-1.5 space-y-1.5 md:mt-2 md:space-y-2">
                    {selectedItems.map((item, index) => (
                        <div key={`${item.itemId}-${index}`} className="rounded-md border border-border bg-gray-700/50 p-2 md:p-3">
                            <div className="flex items-center gap-1.5 md:gap-2">
                                <div className="flex-1">
                                    <span className="block text-xs font-medium text-white md:text-sm">{item.name}</span>
                                    {item.availableQuantity !== undefined && (
                                        <span className="text-xs text-green-400">
                                            Available: {item.availableQuantity} {item.unit}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-neutral-400">{item.unit}</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={item.quantity === 0 ? "" : item.quantity}
                                    placeholder="0"
                                    onChange={(e) => handleUpdateQty(item.itemId, e.target.value)}
                                    className="w-16 rounded border border-border bg-gray-800 p-1 text-center text-xs text-white placeholder-neutral-500 outline-none focus:border-blue-500 md:w-20 md:p-1.5 md:text-sm"
                                />
                                <MdClose
                                    className="h-4 w-4 cursor-pointer text-neutral-400 transition-colors hover:text-red-400 md:h-5 md:w-5"
                                    onClick={() => onRemoveItem(item.itemId)}
                                />
                            </div>
                            {item.itemId === "OTHERS" && (
                                <div className="mt-1.5 md:mt-2">
                                    <input
                                        type="text"
                                        value={item.customDescription || ""}
                                        onChange={(e) => handleUpdateCustomDescription(item.itemId, e.target.value)}
                                        placeholder="Describe this item *"
                                        className="w-full rounded border border-yellow-500/50 bg-gray-800 p-1.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-yellow-500 md:p-2 md:text-sm"
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
