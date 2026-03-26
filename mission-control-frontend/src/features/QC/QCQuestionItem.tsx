import React, { memo, useState, useEffect } from "react";
import ImageUploader from "./components/ImageUploader";
import { Input } from "../../components/ui/Input";
import {
    useQCAnswer,
    useQCRobotId,
    useQCSubmissionId,
    useQCStore
} from "./store/useQCStore";
import { FlatQuestionItem } from "./utils/virtualization";
import { useDebounce } from "@/hooks/useDebounce";

interface QCQuestionItemProps {
    question: FlatQuestionItem;
    disabled?: boolean;
}

const QCQuestionItem: React.FC<QCQuestionItemProps> = ({
    question,
    disabled = false
}) => {
    // Subscribe to specific answer
    const answer = useQCAnswer(question.questionId);
    const robotId = useQCRobotId();
    const submissionId = useQCSubmissionId();
    const setAnswer = useQCStore((state) => state.setAnswer);

    const [showRemarks, setShowRemarks] = useState(false);

    const currentStatus = answer?.status || null;
    const remarks = answer?.remarks || "";
    const textResponse = answer?.textResponse || "";
    const images = answer?.imageUrls || [];

    // Local state for text inputs to prevent laggy typing
    const [localRemarks, setLocalRemarks] = useState(remarks);
    const [localTextResponse, setLocalTextResponse] = useState(textResponse);

    // Sync local state when external answer changes (e.g. initial load or reset)
    useEffect(() => {
        setLocalRemarks(remarks);
    }, [remarks]);

    useEffect(() => {
        setLocalTextResponse(textResponse);
    }, [textResponse]);

    const handleAnswerUpdate = (
        status: "passed" | "repaired" | "replaced" | null,
        newRemarks?: string,
        newImages?: string[],
        newText?: string
    ) => {
        setAnswer({
            questionId: question.questionId,
            tabId: question.tabId,
            categoryId: question.categoryId,
            status,
            remarks: newRemarks,
            imageUrls: newImages,
            textResponse: newText
        });
    };

    // Debounced sync for text-based inputs
    const debouncedSync = useDebounce((field: "remarks" | "text", val: string) => {
        if (field === "remarks") {
            handleAnswerUpdate(currentStatus, val, images, localTextResponse);
        } else {
            let newStatus = currentStatus;
            const renderType = question.responseType || "checkbox";
            if (renderType !== "checkbox") {
                newStatus = val ? "passed" : null;
            }
            handleAnswerUpdate(newStatus, localRemarks, images, val);
        }
    }, 500);

    const handleStatusChange = (status: "passed" | "repaired" | "replaced") => {
        const newStatus = currentStatus === status ? null : status;
        handleAnswerUpdate(newStatus, localRemarks, images, localTextResponse);

        if (newStatus === "repaired" || newStatus === "replaced") {
            setShowRemarks(true);
        }
    };

    const handleRemarksChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setLocalRemarks(val);
        debouncedSync("remarks", val);
    };

    const handleImagesChange = (urls: string[]) => {
        handleAnswerUpdate(currentStatus, localRemarks, urls, localTextResponse);
    };

    // Determine render type
    const renderType = question.responseType || "checkbox";

    const handleTextOrNumberChange = (val: string) => {
        setLocalTextResponse(val);
        debouncedSync("text", val);
    };

    return (
        <div className="group border-x border-slate-700 bg-slate-800/40 px-4 py-3 transition-colors duration-300 animate-in fade-in slide-in-from-top-2 hover:bg-slate-800/60 md:px-6 md:py-4">
            {/* Horizontal Line Divider - Faint and inset */}
            <div className="absolute left-6 right-6 top-0 h-[1px] bg-slate-700/30" />

            <div className="relative flex items-start gap-3 md:gap-4">
                {/* Question Number */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-primary600 bg-green-700 bg-opacity-20 text-sm font-semibold text-primary600 md:h-12 md:w-12 md:text-base">
                    {question.questionId}
                </div>

                {/* Question Content */}
                <div className="min-w-0 flex-1">
                    <h4 className="mb-3 text-sm font-medium leading-snug text-white md:text-base">
                        {question.questionText}
                    </h4>

                    {/* Checkbox Options */}
                    {renderType === "checkbox" && (
                        <div className="my-3 flex flex-wrap gap-3 md:gap-6">
                            <label className="flex cursor-pointer touch-manipulation items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={currentStatus === "passed"}
                                    onChange={() =>
                                        handleStatusChange("passed")
                                    }
                                    disabled={disabled}
                                    className="h-5 w-5 rounded border-border bg-background text-primary700 focus:ring-2 focus:ring-primary700 md:h-6 md:w-6"
                                />
                                <span className="text-xs font-medium text-white md:text-sm">
                                    Passed
                                </span>
                            </label>

                            <label className="flex cursor-pointer touch-manipulation items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={currentStatus === "repaired"}
                                    onChange={() =>
                                        handleStatusChange("repaired")
                                    }
                                    disabled={disabled}
                                    className="h-5 w-5 rounded border-border bg-background text-yellow-500 focus:ring-2 focus:ring-yellow-500 md:h-6 md:w-6"
                                />
                                <span className="text-xs font-medium text-white md:text-sm">
                                    Repaired
                                </span>
                            </label>

                            <label className="flex cursor-pointer touch-manipulation items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={currentStatus === "replaced"}
                                    onChange={() =>
                                        handleStatusChange("replaced")
                                    }
                                    disabled={disabled}
                                    className="h-5 w-5 rounded border-border bg-background text-orange-500 focus:ring-2 focus:ring-orange-500 md:h-6 md:w-6"
                                />
                                <span className="text-xs font-medium text-white md:text-sm">
                                    Replaced
                                </span>
                            </label>
                        </div>
                    )}

                    {/* Text/Number Input */}
                    {(renderType === "text" || renderType === "number") && (
                        <div className="my-3 max-w-md">
                            <label className="mb-1 block text-xs font-medium text-secondary md:text-sm">
                                {renderType === "number"
                                    ? "Value / Measurement"
                                    : "Response"}
                                {question.required && (
                                    <span className="ml-1 text-red-500">*</span>
                                )}
                            </label>
                            <Input
                                type={renderType}
                                value={localTextResponse}
                                onChange={(e) =>
                                    handleTextOrNumberChange(e.target.value)
                                }
                                disabled={disabled}
                                placeholder={
                                    renderType === "number"
                                        ? "Enter number..."
                                        : "Enter text response..."
                                }
                                className="min-h-[44px] touch-manipulation border-border bg-blue-900/25 text-sm text-white placeholder-secondary md:text-base"
                            />
                        </div>
                    )}

                    {/* Remarks Section */}
                    {!question.requiresText &&
                        (showRemarks ||
                            localRemarks ||
                            currentStatus === "repaired" ||
                            currentStatus === "replaced") && (
                            <div className="mt-3">
                                <label className="mb-1 block text-xs font-medium text-secondary md:text-sm">
                                    Remarks
                                </label>
                                <textarea
                                    value={localRemarks}
                                    onChange={handleRemarksChange}
                                    disabled={disabled}
                                    placeholder="Add any comments or notes..."
                                    className="w-full touch-manipulation rounded-md border border-border bg-blue-900/15 px-3 py-2 text-xs text-white placeholder-secondary shadow-sm focus:border-primary600 focus:ring-primary600 md:text-sm"
                                    rows={2}
                                />
                            </div>
                        )}

                    {/* Show Remarks Button */}
                    {!question.requiresText &&
                        !showRemarks &&
                        !localRemarks &&
                        (currentStatus === "passed" ||
                            renderType !== "checkbox") && (
                            <button
                                type="button"
                                onClick={() => setShowRemarks(true)}
                                className="mt-2 flex min-h-[44px] touch-manipulation items-center text-xs text-green-700 transition-colors hover:text-green-800 md:min-h-0 md:text-sm"
                            >
                                + Add remarks
                            </button>
                        )}

                    {/* Detailed Text Response Support */}
                    {question.requiresText && renderType === "checkbox" && (
                        <div className="mt-4">
                            <label className="mb-1 block text-xs font-medium text-secondary md:text-sm">
                                Response
                                {question.required && (
                                    <span className="ml-1 text-red-500">*</span>
                                )}
                            </label>
                            <Input
                                type="text"
                                value={localTextResponse}
                                onChange={(e) =>
                                    handleTextOrNumberChange(e.target.value)
                                }
                                disabled={disabled}
                                placeholder="Enter details..."
                                className="min-h-[44px] touch-manipulation border-border bg-blue-900/25 text-sm text-white placeholder-secondary md:text-base"
                            />
                        </div>
                    )}

                    {/* Photo/Video Upload */}
                    <div className="mt-4">
                        <label className="mb-2 block text-xs font-medium text-secondary md:text-sm">
                            {question.requiresImage && (
                                <span className="mr-1 text-red-500">*</span>
                            )}
                            Photos/Videos{" "}
                            {question.requiresImage
                                ? "(Required)"
                                : "(Optional)"}
                        </label>
                        <ImageUploader
                            images={images}
                            onImagesChange={handleImagesChange}
                            robotId={robotId || ""}
                            submissionId={submissionId || ""}
                            questionId={question.questionId}
                            disabled={disabled}
                            maxImages={10}
                            acceptVideo={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(QCQuestionItem);
