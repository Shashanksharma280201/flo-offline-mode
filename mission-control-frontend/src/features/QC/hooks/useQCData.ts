import { useQuery } from "react-query";
import {
    getQCTemplateForRobot,
    getQCSubmissionById,
    getLatestQCForRobot
} from "../qcService";
import { QCFormTemplate, QCSubmission } from "../types";
import { QC_FORM_TEMPLATE } from "../qcFormTemplate_COMPLETE_200";
import { getCachedTemplate, saveCachedTemplate } from "@/lib/storage/qcCache";
import { toast } from "react-toastify";

// --- Types ---
interface UseQCTemplateResult {
    template: QCFormTemplate;
    isLoading: boolean;
    error: unknown;
    isFallback: boolean;
    versionMismatch: boolean;
}

interface UseQCSubmissionResult {
    submission: QCSubmission | null;
    isLoading: boolean;
    error: unknown;
    isHistorical: boolean;
}

// --- Hooks ---

/**
 * Fetches the QC Template for a given robot.
 * Uses IndexedDB for instant load and performs background revalidation.
 */
export const useQCTemplate = (
    robotId: string | undefined
): UseQCTemplateResult => {
    // 1. Query for cached data first (Sequential Dependency start)
    const { data: cached, isFetched: isCacheFetched } = useQuery(
        ["qc-template-cached", robotId],
        () => (robotId ? getCachedTemplate(robotId) : null),
        {
            enabled: !!robotId,
            staleTime: 1000 * 60 * 5, // 5 minutes - allow cache to be used but eventually revalidate
            cacheTime: 1000 * 60 * 60 * 24, // Keep in memory for 24 hours
            initialData: undefined
        }
    );

    // 2. Fetch/Revalidate from server (Dependent on cache check)
    const {
        data: serverResponse,
        isLoading: isServerLoading,
        error,
        isError
    } = useQuery(
        ["qc-template-server", robotId, cached?.templateId], // Include templateId in key for proper invalidation
        async () => {
            if (!robotId) throw new Error("No robot ID provided");

            // Pass templateId & lastUpdated for conditional fetch
            // Backend will return modified: false if templateId matches
            return await getQCTemplateForRobot(robotId, {
                templateId: cached?.templateId,
                lastUpdated: cached?.lastUpdated
            });
        },
        {
            // Wait for IndexedDB check to complete
            enabled: !!robotId && isCacheFetched,
            staleTime: 0, // Always check with server for template updates
            cacheTime: 1000 * 60 * 60, // Keep in memory for 1 hour
            retry: 1,
            refetchOnWindowFocus: true, // Check for template updates when user returns
            onSuccess: (data) => {
                // If server returned a new/updated template, persist to IndexedDB
                if (data?.modified && data.data && robotId) {
                    saveCachedTemplate(robotId, data.data);
                }
            }
        }
    );

    // Detect if templateId changed (cache invalidation trigger)
    // Backend uses templateId (not version) for comparison
    const templateIdChanged = !!(
        cached?.templateId &&
        serverResponse?.data?.id &&
        cached.templateId !== serverResponse.data.id
    );

    // CRITICAL FIX: Prioritize server response over cache to avoid race conditions
    let templateToReturn: QCFormTemplate;
    let isFallback = false;
    let isLoading = false;

    if (serverResponse?.data) {
        // Case 1: Server returned new/updated template - ALWAYS use it (highest priority)
        templateToReturn = serverResponse.data;
    } else if (serverResponse?.modified === false && cached?.data) {
        // Case 2: Server confirmed cache is current - safe to use cache
        templateToReturn = cached.data;
    } else if (isServerLoading && cached?.data) {
        // Case 3: Server still loading - show cached data for instant UX
        templateToReturn = cached.data;
        isLoading = true; // Keep loading indicator
    } else if (isError && cached?.data) {
        // Case 4: Server error but have cache - fallback to cache
        templateToReturn = cached.data;
        console.warn("Template fetch failed, using cached version", error);
        // Show warning toast once
        if (!sessionStorage.getItem("qc-cache-warning-shown")) {
            toast.warn(
                "Failed to fetch latest template. Using cached version.",
                { autoClose: 5000 }
            );
            sessionStorage.setItem("qc-cache-warning-shown", "true");
        }
    } else if (!isServerLoading && !serverResponse && !cached?.data) {
        // Case 5: No server response, no cache - use static fallback
        templateToReturn = QC_FORM_TEMPLATE as unknown as QCFormTemplate;
        isFallback = true;
        if (isError) {
            console.error("Template fetch failed, using static fallback", error);
            // CRITICAL FIX: Show error toast when using static fallback
            if (!sessionStorage.getItem("qc-fallback-error-shown")) {
                toast.error(
                    "Failed to load template from server. Using offline backup version. Some features may be outdated.",
                    { autoClose: 8000 }
                );
                sessionStorage.setItem("qc-fallback-error-shown", "true");
            }
        }
    } else {
        // Case 6: Initial load, no cache yet
        templateToReturn = QC_FORM_TEMPLATE as unknown as QCFormTemplate;
        isLoading = true;
    }

    return {
        template: templateToReturn,
        isLoading: isLoading || (!isCacheFetched && isServerLoading),
        error,
        isFallback,
        versionMismatch: templateIdChanged // Based on templateId change, not version
    };
};

/**
 * Fetches the QC Submission (Answers).
 */
export const useQCSubmission = (
    robotId: string | undefined,
    submissionId: string | undefined
): UseQCSubmissionResult => {
    const byIdQuery = useQuery<QCSubmission, Error>(
        ["qc-submission", submissionId],
        () => getQCSubmissionById(submissionId!),
        {
            enabled: !!submissionId,
            staleTime: 1000 * 60
        }
    );

    const latestQuery = useQuery<QCSubmission, Error>(
        ["qc-submission-latest", robotId],
        () => getLatestQCForRobot(robotId!),
        {
            enabled: !!robotId && !submissionId,
            staleTime: 1000 * 60,
            retry: 1
        }
    );

    if (submissionId) {
        return {
            submission: byIdQuery.data || null,
            isLoading: byIdQuery.isLoading,
            error: byIdQuery.error,
            isHistorical: true
        };
    }

    return {
        submission: latestQuery.data || null,
        isLoading: latestQuery.isLoading,
        error: latestQuery.error,
        isHistorical: false
    };
};
