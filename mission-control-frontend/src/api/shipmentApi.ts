import axios from "axios";
import { getAuthHeader } from "@/features/auth/authService";

const API_URL = "/api/v1";

export type ShipmentType = "robot" | "miscellaneous";
export type ShipmentStatus = "in-transit" | "delivered" | "cancelled";
export type DeliveryStatus = "on-time" | "overdue" | "delivered" | "cancelled";

export interface RobotReference {
  robotId: string;
  name: string;
  serialNumber?: string;
}

export interface ItemReference {
  inventoryItemId: string;
  itemId: string;
  name: string;
  quantity: number;
  unit: "pieces" | "meters" | "kilograms" | "liters" | "sets" | "boxes";
  customDescription?: string; // For "OTHERS" items
}

export interface EditHistory {
  field: string;
  oldValue: string;
  newValue: string;
  editedBy: {
    _id: string;
    name: string;
    email: string;
  };
  editedAt: string;
}

export interface Shipment {
  id: string;
  shipmentId: string;
  type: ShipmentType;
  status: ShipmentStatus;

  // Robot shipping
  robots?: RobotReference[];
  additionalItems?: ItemReference[];

  // Miscellaneous shipping
  items?: ItemReference[];

  description?: string;

  // Location and dates
  startLocation: string;
  endLocation: string;
  startDate: string;
  endDate: string;
  actualDeliveryDate?: string;

  // Audit trail
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  editHistory: EditHistory[];

  createdAt: string;
  updatedAt: string;

  // Virtuals
  duration?: number;
  deliveryStatus?: DeliveryStatus;
}

export interface ShipmentStats {
  totalShipments: number;
  robotShipments: number;
  miscellaneousShipments: number;
  inTransit: number;
  delivered: number;
}

export interface GetShipmentsParams {
  type?: ShipmentType;
  status?: ShipmentStatus;
  search?: string;
  robotId?: string;
  page?: number;
  limit?: number;
}

export interface GetShipmentsResponse {
  shipments: Shipment[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateRobotShipmentPayload {
  type: "robot";
  robots: RobotReference[];
  additionalItems?: ItemReference[];
  description?: string;
  startLocation: string;
  endLocation: string;
  startDate: string;
  endDate: string;
}

export interface CreateMiscellaneousShipmentPayload {
  type: "miscellaneous";
  items: ItemReference[];
  description?: string;
  startLocation: string;
  endLocation: string;
  startDate: string;
  endDate: string;
}

export type CreateShipmentPayload =
  | CreateRobotShipmentPayload
  | CreateMiscellaneousShipmentPayload;

export interface UpdateShipmentPayload {
  startLocation?: string;
  endLocation?: string;
  startDate?: string;
  endDate?: string;
  actualDeliveryDate?: string;
  status?: ShipmentStatus;
}

export const fetchShipments = async (
  params?: GetShipmentsParams
): Promise<GetShipmentsResponse> => {
  const response = await axios.get(API_URL + "/shipments", {
    params,
    headers: getAuthHeader()
  });
  return response.data;
};

export const fetchShipment = async (shipmentId: string): Promise<Shipment> => {
  const response = await axios.get(API_URL + `/shipments/${shipmentId}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const fetchShipmentsByRobot = async (
  robotId: string
): Promise<Shipment[]> => {
  const response = await axios.get(API_URL + `/shipments/robot/${robotId}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const fetchShipmentStats = async (): Promise<ShipmentStats> => {
  const response = await axios.get(API_URL + "/shipments/stats", {
    headers: getAuthHeader()
  });
  return response.data;
};

export const createShipment = async (
  payload: CreateShipmentPayload
): Promise<Shipment> => {
  const response = await axios.post(API_URL + "/shipments", payload, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const updateShipment = async (
  shipmentId: string,
  payload: UpdateShipmentPayload
): Promise<Shipment> => {
  const response = await axios.patch(
    API_URL + `/shipments/${shipmentId}`,
    payload,
    {
      headers: getAuthHeader()
    }
  );
  return response.data;
};

export const deleteShipment = async (
  shipmentId: string
): Promise<{ message: string }> => {
  const response = await axios.delete(API_URL + `/shipments/${shipmentId}`, {
    headers: getAuthHeader()
  });
  return response.data;
};
