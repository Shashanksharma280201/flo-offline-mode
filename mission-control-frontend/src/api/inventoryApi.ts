import axios from "axios";
import { getAuthHeader } from "@/features/auth/authService";

const API_URL = "/api/v1";

export type InventoryCategory = "mechanical" | "electronics";
export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";
export type DeliveryStatus = "pending" | "delivered" | "overdue";
export type TransactionType = "add" | "remove" | "adjustment";

export interface Transaction {
  type: TransactionType;
  quantity: number;
  previousQty: number;
  newQty: number;
  date: string;
  performedBy: {
    _id: string;
    name: string;
    email: string;
  };
  notes?: string;
  vendorRef?: string;
}

export interface Vendor {
  name: string;
  orderLink?: string;
  credentials?: {
    username?: string;
    password?: string;
  };
  contactPerson?: string;
  phoneNumber?: string;
  email?: string;
  orderDate: string;
  expectedArrivalDate: string;
  actualArrivalDate?: string;
  orderNumber?: string;
  notes?: string;
}

export interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: "pieces" | "meters" | "kilograms" | "liters" | "sets" | "boxes";
  description?: string;
  location?: string;
  minStockLevel?: number;
  vendor: Vendor;
  transactions: Transaction[];
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  stockStatus: StockStatus;
  deliveryStatus: DeliveryStatus;
}

export interface InventoryStats {
  totalItems: number;
  mechanical: number;
  electronics: number;
  outOfStock: number;
  lowStock: number;
}

export interface GetInventoryItemsParams {
  category?: InventoryCategory;
  search?: string;
  stockStatus?: "out-of-stock" | "low-stock";
  page?: number;
  limit?: number;
}

export interface GetInventoryItemsResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateInventoryItemPayload {
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: "pieces" | "meters" | "kilograms" | "liters" | "sets" | "boxes";
  description?: string;
  location?: string;
  minStockLevel?: number;
  vendor: {
    name: string;
    orderLink?: string;
    contactPerson?: string;
    phoneNumber?: string;
    email?: string;
    orderDate: string;
    expectedArrivalDate: string;
    actualArrivalDate?: string;
    orderNumber?: string;
    notes?: string;
  };
}

export interface UpdateQuantityPayload {
  action: "add" | "remove";
  quantity: number;
  notes?: string;
  orderDate?: string;
  receivingDate?: string;
  minStockLevel?: number;
  vendor?: {
    name?: string;
    contactPerson?: string;
    phoneNumber?: string;
    email?: string;
    orderLink?: string;
  };
}

export interface UpdateInventoryItemPayload {
  name?: string;
  category?: InventoryCategory;
  unit?: "pieces" | "meters" | "kilograms" | "liters" | "sets" | "boxes";
  description?: string;
  location?: string;
  minStockLevel?: number;
  vendor?: {
    name?: string;
    orderLink?: string;
    contactPerson?: string;
    phoneNumber?: string;
    email?: string;
    orderDate?: string;
    expectedArrivalDate?: string;
    actualArrivalDate?: string;
    orderNumber?: string;
    notes?: string;
  };
}

export const fetchInventoryItems = async (
  params?: GetInventoryItemsParams
): Promise<GetInventoryItemsResponse> => {
  const response = await axios.get(API_URL + "/inventory", {
    params,
    headers: getAuthHeader()
  });
  return response.data;
};

export const fetchInventoryItem = async (
  itemId: string
): Promise<InventoryItem> => {
  const response = await axios.get(API_URL + `/inventory/${itemId}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const fetchInventoryStats = async (): Promise<InventoryStats> => {
  const response = await axios.get(API_URL + "/inventory/stats", {
    headers: getAuthHeader()
  });
  return response.data;
};

export const createInventoryItem = async (
  payload: CreateInventoryItemPayload
): Promise<InventoryItem> => {
  const response = await axios.post(API_URL + "/inventory", payload, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const updateInventoryItem = async (
  itemId: string,
  payload: UpdateInventoryItemPayload
): Promise<InventoryItem> => {
  const response = await axios.put(
    API_URL + `/inventory/${itemId}`,
    payload,
    {
      headers: getAuthHeader()
    }
  );
  return response.data;
};

export const updateInventoryQuantity = async (
  itemId: string,
  payload: UpdateQuantityPayload
): Promise<InventoryItem> => {
  const response = await axios.patch(
    API_URL + `/inventory/${itemId}/quantity`,
    payload,
    {
      headers: getAuthHeader()
    }
  );
  return response.data;
};

export const deleteInventoryItem = async (
  itemId: string
): Promise<{ message: string }> => {
  const response = await axios.delete(API_URL + `/inventory/${itemId}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Fetch all inventory items for export (without pagination)
 * @param category - Optional category filter
 * @param stockStatus - Optional stock status filter
 */
export const fetchAllInventoryItems = async (
  category?: InventoryCategory,
  stockStatus?: "out-of-stock" | "low-stock"
): Promise<InventoryItem[]> => {
  const params: GetInventoryItemsParams = {
    limit: 10000 // High limit to get all items
  };

  if (category) {
    params.category = category;
  }

  if (stockStatus) {
    params.stockStatus = stockStatus;
  }

  const response = await axios.get(API_URL + "/inventory", {
    params,
    headers: getAuthHeader()
  });

  return response.data.items;
};
