import * as XLSX from "xlsx";
import { type InventoryItem } from "@/api/inventoryApi";
import { format } from "date-fns";

/**
 * Export inventory items to Excel file
 * @param items - Array of inventory items to export
 * @param filename - Name of the downloaded file (without extension)
 */
export const exportInventoryToExcel = (
  items: InventoryItem[],
  filename: string = "flo-inventory"
) => {
  // Transform inventory items to flat structure for Excel
  const excelData = items.map((item) => ({
    "Item ID": item.itemId,
    "Item Name": item.name,
    Category: item.category.charAt(0).toUpperCase() + item.category.slice(1),
    Quantity: item.quantity,
    Unit: item.unit,
    "Stock Status": item.stockStatus?.replace("-", " ").toUpperCase() || "UNKNOWN",
    Location: item.location || "-",
    "Min Stock Level": item.minStockLevel ?? "-",
    Description: item.description || "-",
    "Vendor Name": item.vendor?.name || "-",
    "Vendor Contact Person": item.vendor?.contactPerson || "-",
    "Vendor Phone": item.vendor?.phoneNumber || "-",
    "Vendor Email": item.vendor?.email || "-",
    "Order Date": item.vendor?.orderDate
      ? format(new Date(item.vendor.orderDate), "MMM dd, yyyy")
      : "-",
    "Expected Arrival Date": item.vendor?.expectedArrivalDate
      ? format(new Date(item.vendor.expectedArrivalDate), "MMM dd, yyyy")
      : "-",
    "Actual Arrival Date": item.vendor?.actualArrivalDate
      ? format(new Date(item.vendor.actualArrivalDate), "MMM dd, yyyy")
      : "-",
    "Delivery Status": item.deliveryStatus?.toUpperCase() || "-",
    "Order Number": item.vendor?.orderNumber || "-",
    "Order Link": item.vendor?.orderLink || "-",
    "Vendor Notes": item.vendor?.notes || "-",
    "Created By": item.createdBy?.name || "-",
    "Created At": item.createdAt
      ? format(new Date(item.createdAt), "MMM dd, yyyy hh:mm a")
      : "-"
  }));

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Convert data to worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths for better readability
  const columnWidths = [
    { wch: 12 }, // Item ID
    { wch: 30 }, // Item Name
    { wch: 12 }, // Category
    { wch: 10 }, // Quantity
    { wch: 10 }, // Unit
    { wch: 15 }, // Stock Status
    { wch: 20 }, // Location
    { wch: 15 }, // Min Stock Level
    { wch: 40 }, // Description
    { wch: 25 }, // Vendor Name
    { wch: 25 }, // Vendor Contact Person
    { wch: 18 }, // Vendor Phone
    { wch: 25 }, // Vendor Email
    { wch: 15 }, // Order Date
    { wch: 20 }, // Expected Arrival Date
    { wch: 20 }, // Actual Arrival Date
    { wch: 15 }, // Delivery Status
    { wch: 15 }, // Order Number
    { wch: 40 }, // Order Link
    { wch: 40 }, // Vendor Notes
    { wch: 20 }, // Created By
    { wch: 25 }  // Created At
  ];

  worksheet["!cols"] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");

  // Generate buffer
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

  // Create blob and trigger download
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Generate filename with current date
 * @param category - Optional category filter (all/mechanical/electronics)
 * @param stockFilter - Optional stock filter (low-stock/out-of-stock)
 */
export const generateInventoryFilename = (
  category?: "all" | "mechanical" | "electronics",
  stockFilter?: string
): string => {
  const dateStr = format(new Date(), "yyyy-MM-dd");
  let filename = "flo-inventory";

  if (category && category !== "all") {
    filename += `-${category}`;
  }

  if (stockFilter && stockFilter !== "all") {
    filename += `-${stockFilter}`;
  }

  filename += `-${dateStr}`;

  return filename;
};
