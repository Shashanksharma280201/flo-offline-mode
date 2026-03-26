import { useState } from "react";
import Popup from "@/components/popup/Popup";
import SmIconButton from "@/components/ui/SmIconButton";
import {
    type InventoryItem,
    type UpdateQuantityPayload
} from "@/api/inventoryApi";
import { format } from "date-fns";
import Calendar from "@/components/ui/Calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/Popover";
import { MdCalendarToday } from "react-icons/md";

interface UpdateQuantityDialogProps {
    isOpen: boolean;
    onClose: () => void;
    item: InventoryItem;
    onSubmit: (payload: UpdateQuantityPayload) => void;
    isLoading: boolean;
}

const UpdateQuantityDialog = ({
    isOpen,
    onClose,
    item,
    onSubmit,
    isLoading
}: UpdateQuantityDialogProps) => {
    const [action, setAction] = useState<"add" | "remove">("add");
    const [quantity, setQuantity] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [orderDate, setOrderDate] = useState<Date | undefined>(
        item.vendor?.orderDate ? new Date(item.vendor.orderDate) : undefined
    );
    const [receivingDate, setReceivingDate] = useState<Date | undefined>(
        item.vendor?.actualArrivalDate
            ? new Date(item.vendor.actualArrivalDate)
            : undefined
    );
    const [vendorName, setVendorName] = useState<string>(
        item.vendor?.name || ""
    );
    const [vendorContact, setVendorContact] = useState<string>(
        item.vendor?.contactPerson || ""
    );
    const [vendorPhone, setVendorPhone] = useState<string>(
        item.vendor?.phoneNumber || ""
    );
    const [vendorEmail, setVendorEmail] = useState<string>(
        item.vendor?.email || ""
    );
    const [vendorLink, setVendorLink] = useState<string>(
        item.vendor?.orderLink || ""
    );
    const [minStockLevel, setMinStockLevel] = useState<string>(
        item.minStockLevel?.toString() || ""
    );

    const handleSubmit = () => {
        const parsedQuantity = parseInt(quantity) || 0;
        if (parsedQuantity <= 0) {
            alert("Quantity must be greater than 0");
            return;
        }

        if (action === "remove" && parsedQuantity > item.quantity) {
            alert(
                `Cannot remove ${parsedQuantity} ${item.unit}. Only ${item.quantity} available.`
            );
            return;
        }

        const payload: any = {
            action,
            quantity: parsedQuantity,
            notes,
            orderDate: orderDate?.toISOString(),
            receivingDate: receivingDate?.toISOString()
        };

        // Include minStockLevel if changed
        const parsedMinStockLevel = parseInt(minStockLevel) || 0;
        if (parsedMinStockLevel !== (item.minStockLevel || 0)) {
            payload.minStockLevel = parsedMinStockLevel;
        }

        // Check if any vendor field has changed from original
        const vendorChanged =
            vendorName !== (item.vendor?.name || "") ||
            vendorContact !== (item.vendor?.contactPerson || "") ||
            vendorPhone !== (item.vendor?.phoneNumber || "") ||
            vendorEmail !== (item.vendor?.email || "") ||
            vendorLink !== (item.vendor?.orderLink || "");

        // Only include vendor if any vendor field is changed
        if (vendorChanged) {
            payload.vendor = {
                name: vendorName,
                contactPerson: vendorContact,
                phoneNumber: vendorPhone,
                email: vendorEmail,
                orderLink: vendorLink
            };
        }

        onSubmit(payload);
    };

    const handleClose = () => {
        setAction("add");
        setQuantity("");
        setNotes("");
        setOrderDate(
            item.vendor?.orderDate ? new Date(item.vendor.orderDate) : undefined
        );
        setReceivingDate(
            item.vendor?.actualArrivalDate
                ? new Date(item.vendor.actualArrivalDate)
                : undefined
        );
        // Reset vendor fields to original item values
        setVendorName(item.vendor?.name || "");
        setVendorContact(item.vendor?.contactPerson || "");
        setVendorPhone(item.vendor?.phoneNumber || "");
        setVendorEmail(item.vendor?.email || "");
        setVendorLink(item.vendor?.orderLink || "");
        setMinStockLevel(item.minStockLevel?.toString() || "");
        onClose();
    };

    const parsedQuantity = parseInt(quantity) || 0;
    const newQuantity =
        action === "add"
            ? item.quantity + parsedQuantity
            : item.quantity - parsedQuantity;

    return (
        <Popup
            title="Update Item Quantity"
            description={`Update quantity for ${item.name} (${item.itemId})`}
            onClose={handleClose}
            dialogToggle={isOpen}
        >
            <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-2 text-white">
                <div className="rounded-md border border-border bg-gray-800/45 p-4">
                    <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div>
                            <p className="text-sm text-neutral-400">
                                Current Quantity
                            </p>
                            <p className="text-2xl font-semibold">
                                {item.quantity} {item.unit}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-neutral-400">
                                Stock Status
                            </p>
                            <p
                                className={`text-lg font-semibold capitalize ${
                                    item.stockStatus === "out-of-stock"
                                        ? "text-red-500"
                                        : item.stockStatus === "low-stock"
                                          ? "text-yellow-500"
                                          : "text-green-500"
                                }`}
                            >
                                {item.stockStatus?.replace("-", " ") ||
                                    "Unknown"}
                            </p>
                        </div>
                        {item.location && (
                            <div>
                                <p className="text-sm text-neutral-400">
                                    Location
                                </p>
                                <p className="text-lg font-semibold">
                                    {item.location}
                                </p>
                            </div>
                        )}
                        <div>
                            <p className="text-sm text-neutral-400">
                                Min Stock Level
                            </p>
                            <input
                                type="number"
                                value={minStockLevel}
                                onChange={(e) =>
                                    setMinStockLevel(e.target.value)
                                }
                                className="mt-1 w-full rounded-md border border-border bg-transparent p-2 text-base text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                min="0"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {item.vendor && (
                        <div className="mb-4 rounded-md border border-border bg-slate-900/50 p-4">
                            <p className="mb-3 text-sm font-semibold text-neutral-300">
                                Vendor Information
                            </p>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm text-neutral-400">
                                        Vendor Name
                                    </label>
                                    <input
                                        type="text"
                                        value={vendorName}
                                        onChange={(e) =>
                                            setVendorName(e.target.value)
                                        }
                                        placeholder="Enter vendor name"
                                        className="rounded-md border border-border bg-transparent p-2.5 text-sm text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm text-neutral-400">
                                        Contact Person
                                    </label>
                                    <input
                                        type="text"
                                        value={vendorContact}
                                        onChange={(e) =>
                                            setVendorContact(e.target.value)
                                        }
                                        placeholder="Enter contact name"
                                        className="rounded-md border border-border bg-transparent p-2.5 text-sm text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm text-neutral-400">
                                        Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        value={vendorPhone}
                                        onChange={(e) =>
                                            setVendorPhone(e.target.value)
                                        }
                                        placeholder="Enter phone number"
                                        className="rounded-md border border-border bg-transparent p-2.5 text-sm text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm text-neutral-400">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={vendorEmail}
                                        onChange={(e) =>
                                            setVendorEmail(e.target.value)
                                        }
                                        placeholder="Enter email"
                                        className="rounded-md border border-border bg-transparent p-2.5 text-sm text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="col-span-1 flex flex-col gap-1 md:col-span-2">
                                    <label className="text-sm text-neutral-400">
                                        Order Link
                                    </label>
                                    <input
                                        type="url"
                                        value={vendorLink}
                                        onChange={(e) =>
                                            setVendorLink(e.target.value)
                                        }
                                        placeholder="Enter order link (https://...)"
                                        className="rounded-md border border-border bg-transparent p-2.5 text-sm text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-neutral-400">
                                Action <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        value="add"
                                        checked={action === "add"}
                                        onChange={(e) =>
                                            setAction(e.target.value as "add")
                                        }
                                    />
                                    <span className="text-base">Add Stock</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        value="remove"
                                        checked={action === "remove"}
                                        onChange={(e) =>
                                            setAction(
                                                e.target.value as "remove"
                                            )
                                        }
                                    />
                                    <span className="text-base">
                                        Remove Stock
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-neutral-400">
                                Quantity ({item.unit}){" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="rounded-md border border-border bg-transparent p-2.5 text-base text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                placeholder="0"
                                min="0"
                            />
                        </div>

                        {parsedQuantity > 0 && (
                            <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-3">
                                <p className="text-sm text-neutral-400">
                                    New Quantity
                                </p>
                                <p className="text-xl font-semibold text-blue-400">
                                    {newQuantity} {item.unit}
                                    <span className="ml-2 text-sm text-neutral-400">
                                        ({action === "add" ? "+" : "-"}
                                        {parsedQuantity})
                                    </span>
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-neutral-400">
                                Notes
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="rounded-md border border-border bg-transparent p-2.5 text-base text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                placeholder="Reason for update (optional)"
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="flex flex-col gap-1">
                                <label className="text-sm text-neutral-400">
                                    Order Date (Optional)
                                </label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className="flex items-center justify-between rounded-md border border-border bg-transparent p-2.5 text-left text-base text-white outline-none transition-all hover:border-neutral-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        >
                                            {orderDate ? (
                                                format(
                                                    orderDate,
                                                    "MMM dd, yyyy"
                                                )
                                            ) : (
                                                <span className="text-neutral-400">
                                                    Pick a date
                                                </span>
                                            )}
                                            <MdCalendarToday className="h-5 w-5 text-neutral-400" />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="z-[99999] w-auto p-0"
                                        align="start"
                                    >
                                        <Calendar
                                            mode="single"
                                            selected={orderDate}
                                            onSelect={setOrderDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-sm text-neutral-400">
                                    Actual Arrival Date (Optional)
                                </label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className="flex items-center justify-between rounded-md border border-border bg-transparent p-2.5 text-left text-base text-white outline-none transition-all hover:border-neutral-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        >
                                            {receivingDate ? (
                                                format(
                                                    receivingDate,
                                                    "MMM dd, yyyy"
                                                )
                                            ) : (
                                                <span className="text-neutral-400">
                                                    Pick a date
                                                </span>
                                            )}
                                            <MdCalendarToday className="h-5 w-5 text-neutral-400" />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="z-[99999] w-auto p-0"
                                        align="start"
                                    >
                                        <Calendar
                                            mode="single"
                                            selected={receivingDate}
                                            onSelect={setReceivingDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-neutral-700 pt-4 md:gap-4">
                <SmIconButton
                    name="Cancel"
                    className="border border-backgroundGray bg-transparent font-semibold text-white hover:bg-white/20"
                    onClick={handleClose}
                />
                <SmIconButton
                    name={isLoading ? "Updating..." : "Update Quantity"}
                    className="border bg-white font-semibold text-black"
                    onClick={parsedQuantity <= 0 ? () => {} : handleSubmit}
                    isLoading={isLoading}
                />
            </div>
        </Popup>
    );
};

export default UpdateQuantityDialog;
