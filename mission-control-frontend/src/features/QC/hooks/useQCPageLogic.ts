import React, {
    useEffect,
    useState,
    useTransition,
    useCallback,
    useMemo,
    useRef
} from "react";
import { useQueryClient } from "react-query";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { QCSubmission, QCHeaderField, QCSignOffField } from "../types";
import {
    createQCSubmission,
    updateQCSubmission,
    submitQC,
    getLatestQCForRobot
} from "../qcService";
import { useQCTemplate, useQCSubmission } from "./useQCData";
import { getRobotFn } from "../../robots/services/robotsService";
import {
    useQCStore,
    useQCIsDirty,
    useQCMetadata,
    useQCSignOff,
    useQCAnswers
} from "../store/useQCStore";
import { useDebounce } from "@/hooks/useDebounce";
import { generateQCPDF } from "../utils/generateQCPDF";

export const useQCPageLogic = () => {
    const { robotId, submissionId } = useParams<{
        robotId: string;
        submissionId?: string;
    }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // CRITICAL: Save lock to prevent race conditions between auto-save and manual save
    const savingLockRef = useRef(false);

    // --- Data Fetching (React Query) ---
    const {
        template,
        isLoading: templateLoading,
        versionMismatch
    } = useQCTemplate(robotId);

    const {
        submission: fetchedSubmission,
        isLoading: submissionLoading,
        error: submissionError
    } = useQCSubmission(robotId, submissionId);

    // --- Local State ---
    const [submission, setSubmission] = useState<QCSubmission | null>(null);
    const [activeTab, setActiveTab] = useState<string>("");
    const [isPending, startTransition] = useTransition();
    const [saving, setSaving] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [robotName, setRobotName] = useState<string>("");
    const [isHistorical, setIsHistorical] = useState(false);

    // Use store state
    const isDirty = useQCIsDirty();
    const metadata = useQCMetadata();
    const signOff = useQCSignOff();
    const answersMap = useQCAnswers();

    // Derived state for compatibility
    const answers = useMemo(() => Object.values(answersMap), [answersMap]);

    // Store actions
    const initializeStore = useQCStore((state) => state.initialize);
    const setStoreMetadata = useQCStore((state) => state.setMetadata);
    const setStoreSignOff = useQCStore((state) => state.setSignOff);
    const setAnswer = useQCStore((state) => state.setAnswer);

    // --- Handlers ---

    const handleSaveDraft = useCallback(async () => {
        if (!robotId) return;

        if (savingLockRef.current) {
            console.warn(
                "Save already in progress, skipping duplicate save request"
            );
            return;
        }

        savingLockRef.current = true;
        setSaving(true);
        try {
            const answersArray = Object.values(useQCStore.getState().answers);
            const currentMetadata = useQCStore.getState().metadata;
            const currentSignOff = useQCStore.getState().signOff;

            let savedSubmission: QCSubmission;

            if (submission) {
                savedSubmission = await updateQCSubmission(submission.id, {
                    metadata: currentMetadata,
                    answers: answersArray,
                    signOff: currentSignOff,
                    status: "draft",
                    totalQuestions: template?.totalQuestions || 0
                });
            } else {
                savedSubmission = await createQCSubmission({
                    robotId,
                    metadata: currentMetadata,
                    answers: answersArray,
                    signOff: currentSignOff,
                    status: "draft",
                    totalQuestions: template?.totalQuestions || 0
                });
                window.history.replaceState(
                    null,
                    "",
                    `/robots/${robotId}/qc/${savedSubmission.id}`
                );
            }

            setSubmission(savedSubmission);
            useQCStore.getState().setIsDirty(false);
            setLastSaved(new Date());
            toast.success("Draft saved successfully");

            queryClient.invalidateQueries([
                "qc-submission",
                savedSubmission.id
            ]);
            queryClient.invalidateQueries(["qc-submission-latest", robotId]);
        } catch (error: any) {
            toast.error(
                error.response?.data?.message || "Failed to save draft"
            );
        } finally {
            setSaving(false);
            savingLockRef.current = false;
        }
    }, [robotId, submission, template, queryClient]);

    const handleSubmit = useCallback(async () => {
        if (savingLockRef.current) {
            toast.warn("Please wait for save to complete before submitting");
            return;
        }

        if (!submission) {
            toast.error("Please save the form first");
            return;
        }

        const answersArray = Object.values(useQCStore.getState().answers);
        const answeredCount = answersArray.filter(
            (a) => a.status !== null
        ).length;

        if (answeredCount < (template?.totalQuestions || 0)) {
            toast.error(
                `Please answer all questions before submitting. ${answeredCount}/${template?.totalQuestions || 0} questions answered.`
            );
            return;
        }

        const requiredHeaderFields = (template?.headerFields || []).filter(
            (f: QCHeaderField) => f.required
        );
        for (const field of requiredHeaderFields) {
            const value = metadata[field.fieldId];
            if (value === null || value === undefined || value === "") {
                toast.error(`Required field missing: ${field.fieldName}`);
                return;
            }
        }

        const requiredSignOffFields = (template?.signOffFields || []).filter(
            (f: QCSignOffField) => f.required
        );
        for (const field of requiredSignOffFields) {
            const value = signOff[field.fieldId];
            if (value === null || value === undefined || value === "") {
                toast.error(
                    `Required sign-off field missing: ${field.fieldName}`
                );
                return;
            }
        }

        if (
            !window.confirm(
                "Are you sure you want to submit this QC inspection? This cannot be undone."
            )
        ) {
            return;
        }

        setSaving(true);
        try {
            const currentMetadata = useQCStore.getState().metadata;
            const currentSignOff = useQCStore.getState().signOff;

            await updateQCSubmission(submission.id, {
                metadata: currentMetadata,
                answers: answersArray,
                signOff: currentSignOff,
                status: "draft",
                totalQuestions: template?.totalQuestions || 0
            });

            const submittedQC = await submitQC(submission.id);
            setSubmission(submittedQC);
            toast.success("QC Inspection submitted successfully!");

            queryClient.invalidateQueries(["qc-submission", submission.id]);
            queryClient.invalidateQueries(["qc-submission-latest", robotId]);
            queryClient.invalidateQueries(["qc-history", robotId]);
        } catch (error: any) {
            toast.error(
                error.response?.data?.message ||
                    "Failed to submit QC inspection"
            );
        } finally {
            setSaving(false);
        }
    }, [submission, template, metadata, signOff, robotId, queryClient]);

    const handleDownloadPDF = useCallback(() => {
        if (!submission) {
            toast.error("No QC form data to download");
            return;
        }

        try {
            const currentSubmissionState = {
                ...submission,
                metadata,
                answers: Object.values(answersMap),
                signOff
            };

            generateQCPDF({
                submission: currentSubmissionState,
                template: template!,
                robotId: robotId || "Unknown",
                mmrNumber: robotName || robotId
            });
            toast.success("PDF downloaded successfully!");
        } catch (error: any) {
            console.error("PDF generation error:", error);
            toast.error(
                `Failed to generate PDF: ${error.message || "Unknown error"}`
            );
        }
    }, [
        submission,
        metadata,
        answersMap,
        signOff,
        template,
        robotId,
        robotName
    ]);

    const handleClearAll = useCallback(async () => {
        if (savingLockRef.current) {
            toast.warn("Please wait for save to complete before clearing");
            return;
        }

        if (
            !window.confirm(
                "Are you sure you want to clear all form data? This will create a new inspection form."
            )
        ) {
            return;
        }

        try {
            initializeStore(null, robotId!);
            setLastSaved(null);

            setSaving(true);
            const newSubmission = await createQCSubmission({
                robotId: robotId!,
                metadata: {},
                answers: [],
                signOff: {},
                status: "draft",
                totalQuestions: template?.totalQuestions || 0
            });

            setSubmission(newSubmission);
            await queryClient.invalidateQueries([
                "qc-submission-latest",
                robotId
            ]);
            await queryClient.invalidateQueries([
                "qc-submission",
                newSubmission.id
            ]);

            navigate(`/robots/${robotId}/qc/${newSubmission.id}`, {
                replace: true
            });
            toast.success("Form cleared successfully.");
        } catch (error: any) {
            toast.error(
                error.response?.data?.message || "Failed to clear form"
            );
        } finally {
            setSaving(false);
        }
    }, [robotId, template, initializeStore, queryClient, navigate]);

    const handleFillFreshForm = useCallback(async () => {
        if (savingLockRef.current) {
            toast.warn(
                "Please wait for save to complete before creating new form"
            );
            return;
        }

        if (
            !window.confirm(
                "Are you sure you want to start a new QC inspection form?"
            )
        ) {
            return;
        }

        try {
            initializeStore(null, robotId!);
            setLastSaved(null);

            setSaving(true);
            const newSubmission = await createQCSubmission({
                robotId: robotId!,
                metadata: {},
                answers: [],
                signOff: {},
                status: "draft",
                totalQuestions: template?.totalQuestions || 0
            });

            setSubmission(newSubmission);
            await queryClient.invalidateQueries([
                "qc-submission-latest",
                robotId
            ]);
            await queryClient.invalidateQueries([
                "qc-submission",
                newSubmission.id
            ]);

            navigate(`/robots/${robotId}/qc/${newSubmission.id}`, {
                replace: true
            });
            toast.success("New inspection form created successfully.");
        } catch (error: any) {
            toast.error(
                error.response?.data?.message || "Failed to create new form"
            );
        } finally {
            setSaving(false);
        }
    }, [robotId, template, initializeStore, queryClient, navigate]);

    // --- Side Effects ---

    useEffect(() => {
        if (versionMismatch) {
            toast.warn(
                "A new QC template version is available. Reloading in 10 seconds...",
                { autoClose: 10000 }
            );
            const timer = setTimeout(() => window.location.reload(), 10000);
            return () => clearTimeout(timer);
        }
    }, [versionMismatch]);

    useEffect(() => {
        if (robotId) {
            getRobotFn(robotId)
                .then((res) => {
                    const rData = res?.data || res;
                    setRobotName(rData?.name || robotId);
                })
                .catch(() => setRobotName(robotId));
        }
    }, [robotId]);

    useEffect(() => {
        if (templateLoading) return;

        if (fetchedSubmission) {
            setSubmission(fetchedSubmission);
            initializeStore(fetchedSubmission, robotId!);

            if (submissionId) {
                setIsHistorical(true);
                getLatestQCForRobot(robotId!)
                    .then((latest) => {
                        if (latest && latest.id === fetchedSubmission.id) {
                            setIsHistorical(false);
                        }
                    })
                    .catch(() => {});
            } else {
                setIsHistorical(false);
            }
        } else if (!submissionLoading && !fetchedSubmission) {
            setSubmission(null);
            initializeStore(null, robotId!);
            setIsHistorical(false);
        }
    }, [
        fetchedSubmission,
        submissionLoading,
        templateLoading,
        robotId,
        submissionId,
        initializeStore
    ]);

    useEffect(() => {
        if ((template?.tabs?.length || 0) > 0 && !activeTab) {
            setActiveTab(template?.tabs?.[0]?.tabId || "");
        }
    }, [template, activeTab]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (isDirty && submission && !savingLockRef.current) {
                handleSaveDraft();
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [isDirty, submission, handleSaveDraft]);

    // --- Tab / Store Updates ---

    const handleMetadataChange = useDebounce(
        useCallback(
            (fieldId: string, value: any) => setStoreMetadata(fieldId, value),
            [setStoreMetadata]
        ),
        300
    );

    const handleAnswerChange = useCallback(
        (
            questionId: number,
            tabId: string,
            categoryId: string,
            status: any,
            remarks?: string,
            imageUrls?: string[],
            textResponse?: string
        ) => {
            setAnswer({
                questionId,
                tabId,
                categoryId,
                status,
                remarks,
                imageUrls,
                textResponse
            });
        },
        [setAnswer]
    );

    const handleSignOffChange = useDebounce(
        useCallback(
            (fieldId: string, value: any) => setStoreSignOff(fieldId, value),
            [setStoreSignOff]
        ),
        300
    );

    const handleTabChange = useCallback((tabId: string) => {
        startTransition(() => setActiveTab(tabId));
    }, []);

    const isReadOnly =
        isHistorical ||
        submission?.status === "submitted" ||
        submission?.status === "approved";
    const isFormComplete =
        answers.filter((a) => a.status !== null).length >=
        (template?.totalQuestions || 0);
    const answeredCount = answers.filter((a) => a.status !== null).length;
    const showCompletionView =
        submission?.status === "submitted" || submission?.status === "approved";

    return {
        robotId,
        submissionId,
        navigate,
        template,
        templateLoading,
        submission,
        submissionLoading,
        submissionError,
        activeTab,
        saving,
        showHistory,
        setShowHistory,
        isDirty,
        metadata,
        signOff,
        answers,
        lastSaved,
        robotName,
        isHistorical,
        isReadOnly,
        isFormComplete,
        answeredCount,
        handleMetadataChange,
        handleAnswerChange,
        handleSignOffChange,
        handleTabChange,
        handleSaveDraft,
        handleSubmit,
        handleDownloadPDF,
        handleClearAll,
        handleFillFreshForm,
        showCompletionView,
        isPending
    };
};
