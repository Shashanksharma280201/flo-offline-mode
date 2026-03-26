import axios from "axios";
import { getAuthHeader } from "@/features/auth/authService";

const API_URL = "/api/v1/billing";

export enum BillingStatus {
    NOTBILLING = "not billing",
    BILLING = "billing",
    POC = "poc",
    SOLD = "sold",
    PAIDPOC = "paid poc",
    NA = "N/A",
    WORKORDERPENDING = "work order pending"
}

export interface BillingRecord {
    _id: string;
    robotId: string | { _id: string; name: string };
    clientId: string | { _id: string; name: string };
    startDate: string;
    endDate?: string;
    amount: number;
    status: BillingStatus;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    history?: {
        action: string;
        changedBy: string;
        updatedAt: string;
        changes?: any;
    }[];
}

export const createBilling = async (billingData: Partial<BillingRecord>) => {
    const response = await axios.post(`${API_URL}/create`, billingData, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const updateBilling = async (robotId: string, billingData: Partial<BillingRecord>) => {
    const response = await axios.post(`${API_URL}/update/${robotId}`, billingData, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const getRobotBillingHistory = async (robotId: string) => {
    const response = await axios.get(`${API_URL}/history/${robotId}`, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const getLatestRobotBilling = async (robotId: string) => {
    const response = await axios.get(`${API_URL}/latest/${robotId}`, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const getBillingSummary = async (filters?: {
    clientId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
}) => {
    const response = await axios.get(`${API_URL}/summary`, {
        params: filters,
        headers: getAuthHeader()
    });
    return response.data;
};
