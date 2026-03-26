import axios from "axios";
import { getAuthHeader } from "@/features/auth/authService";

const API_URL = "/api/v1";

export type OvertimeRequest = {
  _id: string;
  operatorId: string;
  operatorName: string;
  clientId: string;
  clientName: string;
  robotId?: string;
  robotName?: string;
  requestedAt: string;
  requestedDuration: number;
  approvedDuration?: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  expiresAt?: string;
  overtimeSessionId?: string;
};

export type OvertimeSession = {
  session: {
    id: string;
    requestId: string;
    operatorId: string;
    clientId: string;
    approvedDuration: number;
    checkInTime: number;
    isActive: boolean;
  };
  operator: {
    id: string;
    name: string;
  };
  client: {
    id: string;
    name: string;
  };
  elapsedTime: number;
  remainingTime: number;
};

export const fetchPendingRequests = async (): Promise<{
  requests: OvertimeRequest[];
  count: number;
}> => {
  const response = await axios.get(API_URL + "/overtime/admin/pending", {
    headers: getAuthHeader()
  });
  return response.data;
};

export const approveOvertimeRequest = async (
  requestId: string,
  adminId: string,
  adminName: string,
  approvedDuration?: number
): Promise<{ success: boolean; message: string; expiresAt: string; approvedDuration: number }> => {
  const response = await axios.post(
    API_URL + `/overtime/admin/approve/${requestId}`,
    {
      adminId,
      adminName,
      approvedDuration
    },
    {
      headers: getAuthHeader()
    }
  );
  return response.data;
};

export const rejectOvertimeRequest = async (
  requestId: string,
  adminId: string,
  adminName: string,
  reason: string
): Promise<{ success: boolean; message: string }> => {
  const response = await axios.post(
    API_URL + `/overtime/admin/reject/${requestId}`,
    {
      adminId,
      adminName,
      reason
    },
    {
      headers: getAuthHeader()
    }
  );
  return response.data;
};

export const updateApprovedDuration = async (
  requestId: string,
  adminId: string,
  adminName: string,
  approvedDuration: number
): Promise<{ success: boolean; message: string; oldDuration: number; newDuration: number }> => {
  const response = await axios.patch(
    API_URL + `/overtime/admin/update-duration/${requestId}`,
    {
      adminId,
      adminName,
      approvedDuration
    },
    {
      headers: getAuthHeader()
    }
  );
  return response.data;
};

export const updateActiveSessionDuration = async (
  sessionId: string,
  adminId: string,
  adminName: string,
  newApprovedDuration: number
): Promise<{
  success: boolean;
  message: string;
  oldDuration: number;
  newDuration: number;
  session: {
    id: string;
    operatorId: string;
    overtimeApprovedDuration: number;
    overtimeStartTime: number;
    isActive: boolean;
  }
}> => {
  const response = await axios.patch(
    API_URL + `/overtime/admin/update-active-session/${sessionId}`,
    {
      adminId,
      adminName,
      newApprovedDuration
    },
    {
      headers: getAuthHeader()
    }
  );
  return response.data;
};

export const fetchActiveSessions = async (): Promise<{
  sessions: OvertimeSession[];
}> => {
  const response = await axios.get(API_URL + "/overtime/admin/active-sessions", {
    headers: getAuthHeader()
  });
  return response.data;
};

export const fetchOvertimeHistory = async (params: {
  startDate?: string;
  endDate?: string;
  operatorId?: string;
  clientId?: string;
  robotId?: string;
  status?: string;
}): Promise<{
  records: OvertimeRequest[];
  total: number;
  totalHours: number;
  totalCost: number;
}> => {
  console.log("[OvertimeAPI] Calling fetchOvertimeHistory with params:", params);
  console.log("[OvertimeAPI] Auth header:", getAuthHeader());
  const response = await axios.get(API_URL + "/overtime/admin/history", {
    params,
    headers: getAuthHeader()
  });
  console.log("[OvertimeAPI] Response received:", response.data);
  return response.data;
};

export const fetchOvertimeAnalytics = async (params: {
  startDate?: string;
  endDate?: string;
}): Promise<{
  totalRequests: number;
  approvalRate: number;
  averageDuration: number;
  totalOvertimeHours: number;
  totalCost: number;
  byOperator: Array<{ operatorId: string; name: string; hours: number }>;
  byClient: Array<{ clientId: string; name: string; hours: number }>;
  byMonth: Array<{ month: string; hours: number; cost: number }>;
}> => {
  const response = await axios.get(API_URL + "/overtime/admin/analytics", {
    params,
    headers: getAuthHeader()
  });
  return response.data;
};
