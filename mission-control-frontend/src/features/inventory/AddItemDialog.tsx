import { useState, useEffect } from "react";
import Popup from "@/components/popup/Popup";
import SmIconButton from "@/components/ui/SmIconButton";
import { type CreateInventoryItemPayload, type InventoryCategory, type InventoryItem } from "@/api/inventoryApi";
import { MdOutlineInventory2, MdOutlineLocalShipping, MdLink, MdPerson, MdPhone, MdEmail, MdCalendarToday } from "react-icons/md";
import { format } from "date-fns";
import Calendar from "@/components/ui/Calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateInventoryItemPayload) => void;
  isLoading: boolean;
  editMode?: { item: InventoryItem };
}

const AddItemDialog = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  editMode
}: AddItemDialogProps) => {
  const [formData, setFormData] = useState<any>({
    name: "",
    category: "mechanical",
    quantity: "",
    unit: "pieces",
    description: "",
    location: "",
    minStockLevel: "",
    vendor: {
      name: "",
      orderDate: "",
      expectedArrivalDate: "",
      contactPerson: "",
      phoneNumber: "",
      email: "",
      orderLink: "",
      orderNumber: "",
      notes: ""
    }
  });

  const [vendorType, setVendorType] = useState<"online" | "direct">("online");
  const [orderDate, setOrderDate] = useState<Date | undefined>(undefined);
  const [expectedArrivalDate, setExpectedArrivalDate] = useState<Date | undefined>(undefined);

  // Pre-populate form when in edit mode
  useEffect(() => {
    if (editMode?.item) {
      const item = editMode.item;
      setFormData({
        name: item.name || "",
        category: item.category || "mechanical",
        quantity: item.quantity.toString() || "",
        unit: item.unit || "pieces",
        description: item.description || "",
        location: item.location || "",
        minStockLevel: item.minStockLevel?.toString() || "",
        vendor: {
          name: item.vendor.name || "",
          orderDate: item.vendor.orderDate || "",
          expectedArrivalDate: item.vendor.expectedArrivalDate || "",
          contactPerson: item.vendor.contactPerson || "",
          phoneNumber: item.vendor.phoneNumber || "",
          email: item.vendor.email || "",
          orderLink: item.vendor.orderLink || "",
          orderNumber: item.vendor.orderNumber || "",
          notes: item.vendor.notes || ""
        }
      });
      setOrderDate(item.vendor.orderDate ? new Date(item.vendor.orderDate) : undefined);
      setExpectedArrivalDate(item.vendor.expectedArrivalDate ? new Date(item.vendor.expectedArrivalDate) : undefined);
      // Auto-detect vendor type
      if (item.vendor.orderLink) {
        setVendorType("online");
      } else if (item.vendor.contactPerson || item.vendor.phoneNumber || item.vendor.email) {
        setVendorType("direct");
      }
    }
  }, [editMode]);

  const handleSubmit = () => {
    const quantity = parseInt(formData.quantity) || 0;
    const minStockLevel = parseInt(formData.minStockLevel) || 0;

    if (
      !formData.name ||
      !formData.category ||
      quantity < 0 ||
      !formData.unit ||
      !formData.vendor.name ||
      !orderDate ||
      !expectedArrivalDate
    ) {
      alert("Please fill all required fields");
      return;
    }

    const payload: CreateInventoryItemPayload = {
      ...formData,
      quantity,
      minStockLevel,
      vendor: {
        ...formData.vendor,
        orderDate: orderDate.toISOString().split('T')[0],
        expectedArrivalDate: expectedArrivalDate.toISOString().split('T')[0],
        orderLink:
          vendorType === "online" && formData.vendor.orderLink
            ? formData.vendor.orderLink
            : undefined,
        contactPerson:
          vendorType === "direct" ? formData.vendor.contactPerson : undefined,
        phoneNumber:
          vendorType === "direct" ? formData.vendor.phoneNumber : undefined,
        email: vendorType === "direct" ? formData.vendor.email : undefined
      }
    };

    onSubmit(payload);
  };

  const handleClose = () => {
    setFormData({
      name: "",
      category: "mechanical",
      quantity: "",
      unit: "pieces",
      description: "",
      location: "",
      minStockLevel: "",
      vendor: {
        name: "",
        orderDate: "",
        expectedArrivalDate: "",
        contactPerson: "",
        phoneNumber: "",
        email: "",
        orderLink: "",
        orderNumber: "",
        notes: ""
      }
    });
    setVendorType("online");
    setOrderDate(undefined);
    setExpectedArrivalDate(undefined);
    onClose();
  };

  return (
    <Popup
      title={editMode ? "Edit Inventory Item" : "Add New Inventory Item"}
      description={editMode ? `Edit details for ${editMode.item.name} (${editMode.item.itemId})` : "Fill in the details below to add a new item to inventory"}
      onClose={handleClose}
      dialogToggle={isOpen}
    >
      <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1 md:gap-5 md:pr-2">
        {/* Item Details Section */}
        <div className="rounded-lg border border-border bg-blue-900/5 p-3 shadow-lg md:p-5">
          <div className="mb-3 flex items-center gap-2 md:mb-4">
            {/* <MdOutlineInventory2 className="h-5 w-5 text-blue-400" /> */}
            <h3 className="text-sm font-semibold text-white md:text-base">
              Item Details
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <div className="flex flex-col gap-1.5 md:gap-2">
              <label className="text-xs font-medium text-neutral-300">
                Item Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="rounded-md border border-neutral-600 bg-neutral-800/50 p-2 text-sm text-white outline-none transition-all md:p-2.5"
                placeholder="e.g., Motor, Wire, Shaft"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:gap-2">
              <label className="text-xs font-medium text-neutral-300">
                Category <span className="text-red-400">*</span>
              </label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    category: value as InventoryCategory
                  })
                }
              >
                <SelectTrigger className="rounded-md border border-neutral-600 bg-neutral-800/50 p-2 text-sm text-white md:p-2.5">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="mechanical">Mechanical</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5 md:gap-2">
              <label className="text-xs font-medium text-neutral-300">
                Quantity <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantity: e.target.value
                  })
                }
                className="rounded-md border border-neutral-600 bg-neutral-800/50 p-2 text-sm text-white outline-none transition-all md:p-2.5"
                min="0"
                placeholder="0"
                disabled={!!editMode}
              />
            </div>

            <div className="flex flex-col gap-1.5 md:gap-2">
              <label className="text-xs font-medium text-neutral-300">
                Unit <span className="text-red-400">*</span>
              </label>
              <Select
                value={formData.unit}
                onValueChange={(value) =>
                  setFormData({ ...formData, unit: value as any })
                }
              >
                <SelectTrigger className="rounded-md border border-neutral-600 bg-neutral-800/50 p-2 text-sm text-white md:p-2.5">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="pieces">Pieces</SelectItem>
                  <SelectItem value="meters">Meters</SelectItem>
                  <SelectItem value="kilograms">Kilograms</SelectItem>
                  <SelectItem value="liters">Liters</SelectItem>
                  <SelectItem value="sets">Sets</SelectItem>
                  <SelectItem value="boxes">Boxes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5 md:gap-2">
              <label className="text-xs font-medium text-neutral-300">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="rounded-md border border-neutral-600 bg-neutral-800/50 p-2 text-sm text-white outline-none transition-all md:p-2.5"
                placeholder="Warehouse, Shelf A1"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:gap-2">
              <label className="text-xs font-medium text-neutral-300">
                Min Stock Level
              </label>
              <input
                type="number"
                value={formData.minStockLevel}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minStockLevel: e.target.value
                  })
                }
                className="rounded-md border border-neutral-600 bg-neutral-800/50 p-2 text-sm text-white outline-none transition-all md:p-2.5"
                min="0"
                placeholder="0"
              />
            </div>

            <div className="col-span-1 flex flex-col gap-1.5 md:col-span-2 md:gap-2">
              <label className="text-xs font-medium text-neutral-300">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="rounded-md border border-neutral-600 bg-neutral-800/50 p-2 text-sm text-white outline-none transition-all md:p-2.5"
                placeholder="Additional details about the item"
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Vendor Information Section */}
        <div className="rounded-lg border border-border bg-blue-900/5 p-3 shadow-lg md:p-5">
          <div className="mb-3 flex items-center gap-2 md:mb-4">
            {/* <MdOutlineLocalShipping className="h-5 w-5 text-green-400" /> */}
            <h3 className="text-sm font-semibold text-white md:text-base">
              Vendor Information
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <div className="flex flex-col gap-1.5 md:gap-2">
              <label className="text-xs font-medium text-neutral-300">
                Vendor Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.vendor.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    vendor: { ...formData.vendor, name: e.target.value }
                  })
                }
                className="rounded-md border border-neutral-600 bg-neutral-800/50 p-2 text-sm text-white outline-none transition-all md:p-2.5"
                placeholder="Vendor/Supplier name"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:gap-2">
              <label className="text-xs font-medium text-neutral-300">Order Number</label>
              <input
                type="text"
                value={formData.vendor.orderNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    vendor: { ...formData.vendor, orderNumber: e.target.value }
                  })
                }
                className="rounded-md border border-neutral-600 bg-neutral-800/50 p-2 text-sm text-white outline-none transition-all md:p-2.5"
                placeholder="PO-12345"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:gap-2">
              <label className="text-xs font-medium text-neutral-300">
                Order Date <span className="text-red-400">*</span>
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-between rounded-md border border-neutral-600 bg-neutral-800/50 p-2 text-left text-xs text-white outline-none transition-all md:p-2.5 md:text-sm"
                  >
                    {orderDate ? (
                      format(orderDate, "MMM dd, yyyy")
                    ) : (
                      <span className="text-neutral-400">Pick a date</span>
                    )}
                    <MdCalendarToday className="h-4 w-4 text-neutral-400 md:h-5 md:w-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="z-[99999] w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={orderDate}
                    onSelect={setOrderDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1.5 md:gap-2">
              <label className="text-xs font-medium text-neutral-300">
                Expected Arrival <span className="text-red-400">*</span>
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-between rounded-md border border-neutral-600 bg-neutral-800/50 p-2 text-left text-xs text-white outline-none transition-all md:p-2.5 md:text-sm"
                  >
                    {expectedArrivalDate ? (
                      format(expectedArrivalDate, "MMM dd, yyyy")
                    ) : (
                      <span className="text-neutral-400">Pick a date</span>
                    )}
                    <MdCalendarToday className="h-4 w-4 text-neutral-400 md:h-5 md:w-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="z-[99999] w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expectedArrivalDate}
                    onSelect={setExpectedArrivalDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-neutral-300 md:mb-2">Vendor Type</label>
              <div className="flex gap-2 md:gap-4">
                <button
                  type="button"
                  onClick={() => setVendorType("online")}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-lg border-1 px-2 py-2 transition-all md:gap-2 md:px-4 md:py-3 ${
                    vendorType === "online"
                      ? "border-green-500 bg-green-500/20 text-white"
                      : "border-neutral-600 bg-neutral-800/30 text-neutral-200 hover:border-green-500 hover:bg-neutral-800/50"
                  }`}
                >
                  {/* <MdLink className="h-5 w-5" /> */}
                  <span className="text-xs font-medium md:text-sm">Online Order</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVendorType("direct")}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-lg border-1 px-2 py-2 transition-all md:gap-2 md:px-4 md:py-3 ${
                    vendorType === "direct"
                      ? "border-green-500 bg-green-500/20 text-white"
                      : "border-neutral-600 bg-neutral-800/30 text-neutral-200 hover:border-green-500 hover:bg-neutral-800/50"
                  }`}
                >
                  {/* <MdPerson className="h-5 w-5" /> */}
                  <span className="text-xs font-medium md:text-sm">Direct Contact</span>
                </button>
              </div>
            </div>

            {vendorType === "online" ? (
              <div className="col-span-1 flex flex-col gap-1.5 md:col-span-2 md:gap-2">
                <label className="flex items-center gap-2 text-xs font-medium text-neutral-300">
                  {/* <MdLink className="h-4 w-4 text-green-400" /> */}
                  Order Link
                </label>
                <input
                  type="url"
                  value={formData.vendor.orderLink}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      vendor: {
                        ...formData.vendor,
                        orderLink: e.target.value
                      }
                    })
                  }
                  className="rounded-md border border-neutral-600 bg-neutral-800/50 p-2 text-sm text-white outline-none transition-all md:p-2.5"
                  placeholder="https://example.com/order"
                />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5 md:gap-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-neutral-300">
                    {/* <MdPerson className="h-4 w-4 text-green-400" /> */}
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.vendor.contactPerson}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        vendor: {
                          ...formData.vendor,
                          contactPerson: e.target.value
                        }
                      })
                    }
                    className="rounded-md border border-neutral-600 bg-neutral-800/50 p-2 text-sm text-white outline-none transition-all md:p-2.5"
                    placeholder="Contact name"
                  />
                </div>

                <div className="flex flex-col gap-1.5 md:gap-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-neutral-300">
                    {/* <MdPhone className="h-4 w-4 text-green-400" /> */}
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.vendor.phoneNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        vendor: {
                          ...formData.vendor,
                          phoneNumber: e.target.value
                        }
                      })
                    }
                    className="rounded-md border border-neutral-600 bg-neutral-800/50 p-2 text-sm text-white outline-none transition-all md:p-2.5"
                    placeholder="+91 1234567890"
                  />
                </div>

                <div className="col-span-1 flex flex-col gap-1.5 md:col-span-2 md:gap-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-neutral-300">
                    {/* <MdEmail className="h-4 w-4 text-green-400" /> */}
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.vendor.email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        vendor: { ...formData.vendor, email: e.target.value }
                      })
                    }
                    className="rounded-md border border-neutral-600 bg-neutral-800/50 p-2 text-sm text-white outline-none transition-all md:p-2.5"
                    placeholder="vendor@example.com"
                  />
                </div>
              </>
            )}

            <div className="col-span-1 flex flex-col gap-1.5 md:col-span-2 md:gap-2">
              <label className="text-xs font-medium text-neutral-300">Vendor Notes</label>
              <textarea
                value={formData.vendor.notes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    vendor: { ...formData.vendor, notes: e.target.value }
                  })
                }
                className="rounded-md border border-neutral-600 bg-neutral-800/50 p-2 text-sm text-white outline-none transition-all md:p-2.5"
                placeholder="Additional vendor information"
                rows={2}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-700 pt-3 md:gap-3 md:pt-4">
        <SmIconButton
          name="Cancel"
          className="border border-neutral-600 bg-transparent text-sm font-semibold text-white hover:bg-neutral-800 md:text-base"
          onClick={handleClose}
        />
        <SmIconButton
          name={isLoading ? (editMode ? "Updating..." : "Creating...") : (editMode ? "Update Item" : "Create Item")}
          className="border-none bg-green-600 text-sm text-white md:text-base"
          onClick={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </Popup>
  );
};

export default AddItemDialog;
