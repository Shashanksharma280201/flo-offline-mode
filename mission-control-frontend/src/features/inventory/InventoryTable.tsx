import { useState } from "react";
import { type InventoryItem } from "@/api/inventoryApi";
import { checkPermission } from "@/util/roles";
import { MdDelete, MdEdit, MdHistory, MdModeEdit } from "react-icons/md";
import { format } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import HistoryDialog from "./HistoryDialog";

interface InventoryTableProps {
  items: InventoryItem[];
  onEditItem: (item: InventoryItem) => void;
  onUpdateQuantity: (item: InventoryItem) => void;
  onDeleteItem: (itemId: string) => void;
}

const InventoryTable = ({
  items,
  onEditItem,
  onUpdateQuantity,
  onDeleteItem
}: InventoryTableProps) => {
  const canEdit = checkPermission("change_robots");
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleOpenHistory = (item: InventoryItem) => {
    setHistoryItem(item);
    setIsHistoryOpen(true);
  };

  const handleCloseHistory = () => {
    setIsHistoryOpen(false);
    setHistoryItem(null);
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case "out-of-stock":
        return "text-red-500";
      case "low-stock":
        return "text-yellow-500";
      default:
        return "text-green-500";
    }
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case "overdue":
        return "text-red-500";
      case "pending":
        return "text-yellow-500";
      case "delivered":
        return "text-green-500";
      default:
        return "text-neutral-400";
    }
  };

  return (
    <div className="w-full divide-y divide-border">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex w-full flex-col gap-3 bg-gray-900/25 p-4 hover:bg-slate-800/25 md:gap-4 md:p-6 lg:p-8"
        >
          <div className="flex w-full items-start justify-between gap-2">
            <div className="flex w-full flex-col gap-2 md:gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold opacity-85 sm:text-lg md:text-xl lg:text-2xl">{item.name}</h3>
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
                  {item.itemId}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-2 sm:text-sm md:grid-cols-4">
                <div>
                  <span className="text-neutral-400">Quantity: </span>
                  <span className="font-semibold">
                    {item.quantity} {item.unit}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400">Status: </span>
                  <span
                    className={`font-semibold capitalize ${getStockStatusColor(item.stockStatus)}`}
                  >
                    {item.stockStatus?.replace("-", " ") || "Unknown"}
                  </span>
                </div>
                {item.location && (
                  <div className="truncate">
                    <span className="text-neutral-400">Location: </span>
                    <span>{item.location}</span>
                  </div>
                )}
                {item.minStockLevel !== undefined && (
                  <div>
                    <span className="text-neutral-400">Min Stock: </span>
                    <span>{item.minStockLevel}</span>
                  </div>
                )}
              </div>
{/* 
              {item.description && (
                <p className="text-sm text-neutral-300">{item.description}</p>
              )} */}

              <Accordion type="single" collapsible className="mt-1 md:mt-2">
                <AccordionItem
                  value="vendor-info"
                  className="rounded-md border border-border bg-slate-800"
                >
                  <AccordionTrigger className="px-3 py-2 hover:no-underline md:px-3 md:py-3">
                    <span className="text-xs font-semibold text-neutral-400 md:text-sm">
                      Vendor Information
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 sm:text-sm md:grid-cols-2">
                      <div>
                        <span className="text-neutral-400">Vendor: </span>
                        <span>{item.vendor.name}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400">Order Date: </span>
                        <span>
                          {format(new Date(item.vendor.orderDate), "MMM dd, yyyy")}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400">Expected Arrival: </span>
                        <span>
                          {format(
                            new Date(item.vendor.expectedArrivalDate),
                            "MMM dd, yyyy"
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400">Delivery Status: </span>
                        <span
                          className={`font-semibold capitalize ${getDeliveryStatusColor(item.deliveryStatus)}`}
                        >
                          {item.deliveryStatus}
                        </span>
                      </div>
                      {item.vendor.actualArrivalDate && (
                        <div>
                          <span className="text-neutral-400">
                            Actual Arrival:{" "}
                          </span>
                          <span>
                            {format(
                              new Date(item.vendor.actualArrivalDate),
                              "MMM dd, yyyy"
                            )}
                          </span>
                        </div>
                      )}
                      {item.vendor.orderNumber && (
                        <div>
                          <span className="text-neutral-400">Order Number: </span>
                          <span>{item.vendor.orderNumber}</span>
                        </div>
                      )}
                      {item.vendor.contactPerson && (
                        <div>
                          <span className="text-neutral-400">Contact: </span>
                          <span>{item.vendor.contactPerson}</span>
                        </div>
                      )}
                      {item.vendor.phoneNumber && (
                        <div>
                          <span className="text-neutral-400">Phone: </span>
                          <span>{item.vendor.phoneNumber}</span>
                        </div>
                      )}
                      {item.vendor.email && (
                        <div>
                          <span className="text-neutral-400">Email: </span>
                          <span>{item.vendor.email}</span>
                        </div>
                      )}
                      {item.vendor.orderLink && (
                        <div className="col-span-2">
                          <span className="text-neutral-400">Order Link: </span>
                          <a
                            href={item.vendor.orderLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                          >
                            {item.vendor.orderLink}
                          </a>
                        </div>
                      )}
                      {item.vendor.notes && (
                        <div className="col-span-2">
                          <span className="text-neutral-400">Vendor Notes: </span>
                          <span>{item.vendor.notes}</span>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <div className="flex flex-shrink-0 items-start gap-1 md:gap-2">
              <button
                onClick={() => handleOpenHistory(item)}
                className="rounded-md p-1 transition-colors hover:bg-blue-500/20 md:p-1.5"
                title="View history"
              >
                <MdHistory className="h-5 w-5" color="white" />
              </button>
              {canEdit && (
                <button
                  onClick={() => onEditItem(item)}
                  className="rounded-md bg-yellow-500/20 px-2 py-1 text-xs font-medium text-yellow-400 transition-colors hover:bg-yellow-500/30 md:px-3 md:py-1.5 md:text-sm"
                  title="Edit item details"
                >
                  Edit
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => onUpdateQuantity(item)}
                  className="rounded-md p-1 transition-colors hover:bg-green-500/20 md:p-1.5"
                  title="Update quantity"
                >
                  <MdEdit className="h-5 w-5" color="white" />
                </button>
              )}
              {/* {canEdit && (
                <button
                  onClick={() => onDeleteItem(item.itemId)}
                  className="rounded-md p-1.5 transition-colors hover:bg-red-500/20 md:p-2"
                  title="Delete item"
                >
                  <MdDelete className="h-5 w-5 md:h-5 md:w-5" color="white" />
                </button>
              )} */}
            </div>
          </div>
        </div>
      ))}

      <HistoryDialog
        isOpen={isHistoryOpen}
        onClose={handleCloseHistory}
        item={historyItem}
      />
    </div>
  );
};

export default InventoryTable;
