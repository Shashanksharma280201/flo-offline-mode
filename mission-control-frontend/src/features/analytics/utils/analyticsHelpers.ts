import axios from "axios";
import { getAuthHeader } from "@/features/auth/authService";

/**
 * Validates if client IDs exist and user has access
 */
export async function validateClientIds(clientIds: string[]): Promise<{
    valid: string[];
    invalid: Array<{ clientId: string; reason: string }>;
    summary: {
        total: number;
        validCount: number;
        invalidCount: number;
    };
}> {
    try {
        const response = await axios.post(
            "/api/v1/clients/validate",
            { clientIds },
            { headers: getAuthHeader() }
        );
        return response.data;
    } catch (error) {
        console.error("Client validation error:", error);
        throw error;
    }
}

/**
 * Fetches data in batches to prevent connection overflow
 */
export async function fetchInBatches<T>(
    items: string[],
    fetchFn: (item: string) => Promise<T>,
    batchSize: number = 5
): Promise<{
    successful: T[];
    failed: Array<{ item: string; error: string }>;
}> {
    const successful: T[] = [];
    const failed: Array<{ item: string; error: string }> = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const results = await Promise.allSettled(
            batch.map((item) => fetchFn(item))
        );

        results.forEach((result, index) => {
            if (result.status === "fulfilled") {
                successful.push(result.value);
            } else {
                failed.push({
                    item: batch[index],
                    error: result.reason?.message || "Unknown error"
                });
            }
        });
    }

    return { successful, failed };
}

/**
 * Extracts detailed error information
 */
export function extractErrorDetails(error: any): {
    message: string;
    failedClients?: string[];
    statusCode?: number;
} {
    if (error.response) {
        return {
            message: error.response.data?.message || error.message,
            statusCode: error.response.status
        };
    }

    if (error.failedClients) {
        return {
            message: `Failed to fetch data for ${error.failedClients.length} clients`,
            failedClients: error.failedClients
        };
    }

    return {
        message: error.message || "Unknown error occurred"
    };
}
