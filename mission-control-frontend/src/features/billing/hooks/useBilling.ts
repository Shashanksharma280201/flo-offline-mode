import { useMutation, useQuery, useQueryClient } from "react-query";
import {
    createBilling,
    getLatestRobotBilling,
    getRobotBillingHistory,
    updateBilling,
    getBillingSummary,
    BillingRecord
} from "../services/billingService";

export const useBillingHistory = (robotId: string) => {
    return useQuery(
        ["billingHistory", robotId],
        () => getRobotBillingHistory(robotId),
        {
            enabled: !!robotId,
        }
    );
};

export const useLatestBilling = (robotId: string) => {
    return useQuery(
        ["latestBilling", robotId],
        () => getLatestRobotBilling(robotId),
        {
            enabled: !!robotId,
        }
    );
};

export const useBillingSummary = (filters?: {
    clientId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
}) => {
    return useQuery(["billingSummary", filters], () => getBillingSummary(filters));
};

export const useCreateBilling = () => {
    const queryClient = useQueryClient();
    return useMutation(
        (billingData: Partial<BillingRecord>) => createBilling(billingData),
        {
            onSuccess: (_, variables) => {
                queryClient.invalidateQueries(["billingHistory", variables.robotId]);
                queryClient.invalidateQueries(["latestBilling", variables.robotId]);
                queryClient.invalidateQueries(["billingSummary"]);
            },
        }
    );
};

export const useUpdateBilling = () => {
    const queryClient = useQueryClient();
    return useMutation(
        ({ robotId, billingData }: { robotId: string; billingData: Partial<BillingRecord> }) =>
            updateBilling(robotId, billingData),
        {
            onSuccess: (_, variables) => {
                queryClient.invalidateQueries(["billingHistory", variables.robotId]);
                queryClient.invalidateQueries(["latestBilling", variables.robotId]);
                queryClient.invalidateQueries(["billingSummary"]);
            },
        }
    );
};
