import Popup from "@/components/popup/Popup";
import { type InventoryItem } from "@/api/inventoryApi";
import { format } from "date-fns";

interface HistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
}

const HistoryDialog = ({ isOpen, onClose, item }: HistoryDialogProps) => {
  if (!item) return null;

  return (
    <Popup
      title="Transaction History"
      description={`Complete history for ${item.name} (${item.itemId})`}
      onClose={onClose}
      dialogToggle={isOpen}
    >
      <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-2 text-white md:gap-4">
        {/* Item Summary */}
        <div className="rounded-md border border-border bg-slate-800/30 p-3 md:p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <div>
              <p className="text-xs text-neutral-400 md:text-sm">Current Quantity</p>
              <p className="text-lg font-semibold md:text-xl">
                {item.quantity} {item.unit}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-400 md:text-sm">Stock Status</p>
              <p
                className={`text-base font-semibold capitalize md:text-lg ${
                  item.stockStatus === "out-of-stock"
                    ? "text-red-500"
                    : item.stockStatus === "low-stock"
                      ? "text-yellow-500"
                      : "text-green-500"
                }`}
              >
                {item.stockStatus?.replace("-", " ") || "Unknown"}
              </p>
            </div>
            {item.location && (
              <div>
                <p className="text-xs text-neutral-400 md:text-sm">Location</p>
                <p className="text-sm font-semibold md:text-base">{item.location}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-neutral-400 md:text-sm">Total Transactions</p>
              <p className="text-lg font-semibold md:text-xl">{item.transactions.length}</p>
            </div>
          </div>
        </div>

        {/* Vendor Information */}
        <div className="rounded-md border border-border bg-slate-800/30 p-3 md:p-4">
          <h4 className="mb-2 text-sm font-semibold text-neutral-300 md:mb-3 md:text-base">
            Current Vendor Information
          </h4>
          <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2 md:gap-3 md:text-sm">
            <div>
              <span className="text-neutral-400">Vendor: </span>
              <span className="font-medium text-white">{item.vendor.name}</span>
            </div>
            <div>
              <span className="text-neutral-400">Order Date: </span>
              <span className="text-white">
                {format(new Date(item.vendor.orderDate), "MMM dd, yyyy")}
              </span>
            </div>
            <div>
              <span className="text-neutral-400">Expected Arrival: </span>
              <span className="text-white">
                {format(new Date(item.vendor.expectedArrivalDate), "MMM dd, yyyy")}
              </span>
            </div>
            <div>
              <span className="text-neutral-400">Delivery Status: </span>
              <span
                className={`font-semibold capitalize ${
                  item.deliveryStatus === "delivered"
                    ? "text-green-400"
                    : item.deliveryStatus === "overdue"
                      ? "text-red-400"
                      : "text-yellow-400"
                }`}
              >
                {item.deliveryStatus}
              </span>
            </div>
            {item.vendor.actualArrivalDate && (
              <div>
                <span className="text-neutral-400">Actual Arrival: </span>
                <span className="text-white">
                  {format(new Date(item.vendor.actualArrivalDate), "MMM dd, yyyy")}
                </span>
              </div>
            )}
            {item.vendor.contactPerson && (
              <div>
                <span className="text-neutral-400">Contact: </span>
                <span className="text-white">{item.vendor.contactPerson}</span>
              </div>
            )}
          </div>
        </div>

        {/* Transaction History */}
        <div className="rounded-md border border-border bg-slate-800/30 p-3 md:p-4">
          <h4 className="mb-2 text-sm font-semibold text-neutral-300 md:mb-3 md:text-base">
            All Transactions ({item.transactions.length})
          </h4>

          {item.transactions.length === 0 ? (
            <div className="py-6 text-center text-sm text-neutral-400 md:py-8">
              No transactions yet
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {item.transactions
                .slice()
                .reverse()
                .map((txn, idx) => (
                  <div
                    key={idx}
                    className="rounded-md border border-border bg-slate-900/50 p-3 md:p-4"
                  >
                    {/* Transaction Header */}
                    <div className="mb-2 flex flex-col gap-2 md:mb-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold md:px-3 md:py-1 md:text-sm ${
                            txn.type === "add"
                              ? "bg-green-500/20 text-green-400"
                              : txn.type === "remove"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {txn.type === "add" ? "+" : "-"}
                          {txn.quantity} {item.unit}
                        </span>
                        <span className="text-sm text-neutral-400 md:text-base">
                          {txn.previousQty} → {txn.newQty}
                        </span>
                      </div>
                      <span className="text-xs text-neutral-500 md:text-sm">
                        {format(new Date(txn.date), "MMM dd, yyyy 'at' hh:mm a")}
                      </span>
                    </div>

                    {/* Transaction Details */}
                    <div className="space-y-1.5 text-xs md:space-y-2 md:text-sm">
                      <div className="flex flex-wrap items-center gap-1 md:gap-2">
                        <span className="text-neutral-500">Updated by:</span>
                        <span className="font-medium text-blue-400">
                          {txn.performedBy?.name || "Unknown"}
                        </span>
                        {txn.performedBy?.email && (
                          <span className="text-xs text-neutral-500">
                            ({txn.performedBy.email})
                          </span>
                        )}
                      </div>

                      {txn.vendorRef && (
                        <div className="flex flex-wrap items-center gap-1 md:gap-2">
                          <span className="text-neutral-500">Vendor:</span>
                          <span className="font-medium text-emerald-400">
                            {txn.vendorRef}
                          </span>
                        </div>
                      )}

                      {txn.notes && (
                        <div className="flex flex-col gap-1 md:flex-row md:items-start md:gap-2">
                          <span className="text-neutral-500">Note:</span>
                          <span className="italic text-neutral-300">"{txn.notes}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </Popup>
  );
};

export default HistoryDialog;
