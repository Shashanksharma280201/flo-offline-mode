import React, { useState } from "react";
import axios from "axios";
import { Button } from "../../../components/ui/Button";
import { getAuthHeader } from "../../auth/authService";

interface ImageUploaderProps {
    images: string[];
    onImagesChange: (urls: string[]) => void;
    robotId: string;
    submissionId: string;
    questionId: number;
    disabled?: boolean;
    maxImages?: number;
    acceptVideo?: boolean; // Allow video uploads
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
    images,
    onImagesChange,
    robotId,
    submissionId,
    questionId,
    disabled = false,
    maxImages = 5,
    acceptVideo = false
}) => {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Check if adding these files would exceed the limit
        if (images.length + files.length > maxImages) {
            alert(`You can only upload up to ${maxImages} ${acceptVideo ? 'files (photos/videos)' : 'images'}`);
            return;
        }

        setUploading(true);

        try {
            const formData = new FormData();

            // IMPORTANT: Add metadata BEFORE files so multer can access them during file processing
            formData.append("robotId", robotId);
            formData.append("submissionId", submissionId);
            formData.append("questionId", questionId.toString());

            // Append all files after metadata
            for (let i = 0; i < files.length; i++) {
                formData.append("files", files[i]);
            }

            const response = await axios.post("/api/v1/qc/upload-image", formData, {
                headers: {
                    ...getAuthHeader(),
                    // Let browser set Content-Type automatically with multipart boundary
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const progress = Math.round(
                            (progressEvent.loaded / progressEvent.total) * 100
                        );
                        setUploadProgress(progress);
                    }
                }
            });

            if (response.data.success && response.data.urls) {
                console.log("✅ Upload successful! URLs:", response.data.urls);
                onImagesChange([...images, ...response.data.urls]);
            }
        } catch (error: any) {
            console.error("Error uploading images:", error);
            const errorMessage = error.response?.data?.message || "Failed to upload images. Please try again.";
            alert(errorMessage);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleRemoveImage = (index: number) => {
        const newImages = images.filter((_, i) => i !== index);
        onImagesChange(newImages);
    };

    return (
        <div className="space-y-3">
            {/* Upload Button */}
            {images.length < maxImages && !disabled && (
                <div>
                    <label className="inline-flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-green-800 text-white rounded-md cursor-pointer hover:bg-green-900 transition-all touch-manipulation min-h-[44px]">
                        <svg
                            className="w-4 h-4 md:w-5 md:h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                        <span className="text-xs md:text-sm font-medium">
                            {uploading ? "Uploading..." : acceptVideo ? "Upload Photo/Video" : "Upload Image"}
                        </span>
                        <input
                            type="file"
                            accept={acceptVideo ? "image/*,video/*" : "image/*"}
                            multiple
                            onChange={handleFileChange}
                            disabled={uploading}
                            className="hidden"
                        />
                    </label>
                    <p className="text-xs text-secondary mt-1">
                        {images.length}/{maxImages} {acceptVideo ? 'files' : 'images'} uploaded
                    </p>
                </div>
            )}

            {/* Upload Progress */}
            {uploading && (
                <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold inline-block text-primary600">
                                Uploading... {uploadProgress}%
                            </span>
                        </div>
                    </div>
                    <div className="overflow-hidden h-2 text-xs flex rounded bg-backgroundGray">
                        <div
                            style={{ width: `${uploadProgress}%` }}
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary600 transition-all duration-300"
                        ></div>
                    </div>
                </div>
            )}

            {/* Image/Video Thumbnails */}
            {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                    {images.map((url, index) => {
                        // Check if URL contains video extension (before query params)
                        const isVideo = url.match(/\.(mp4|mov|avi|wmv|flv|webm)(\?|$)/i);
                        return (
                        <div
                            key={index}
                            className="relative group aspect-square rounded-lg overflow-hidden border border-backgroundGray bg-background"
                        >
                            {isVideo ? (
                                <div className="w-full h-full flex flex-col items-center justify-center p-3 md:p-4 bg-blue-900/15">
                                    <svg
                                        className="w-8 h-8 md:w-10 md:h-10 text-primary600 mb-2"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                        />
                                    </svg>
                                    <p className="text-xs md:text-sm text-white font-medium text-center mb-2">
                                        Video uploaded successfully
                                    </p>
                                    <a
                                        href={url}
                                        download
                                        className="inline-flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 bg-primary600 text-white rounded-md text-xs hover:bg-primary700 transition-colors"
                                    >
                                        <svg
                                            className="w-3 h-3 md:w-4 md:h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                            />
                                        </svg>
                                        Download
                                    </a>
                                </div>
                            ) : (
                                <img
                                    src={url}
                                    alt={`Uploaded ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        console.error("Image failed to load:", url);
                                        console.error("Error details:", e);
                                    }}
                                    onLoad={() => {
                                        console.log("Image loaded successfully:", url);
                                    }}
                                />
                            )}
                            {!disabled && (
                                <button
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute top-1 right-1 md:top-2 md:right-2 bg-red-500 text-white rounded-full p-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-red-600 touch-manipulation"
                                    type="button"
                                    aria-label="Remove image"
                                >
                                    <svg
                                        className="w-3 h-3 md:w-4 md:h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            )}
                            {/* View/Download for images only */}
                            {!isVideo && (
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute bottom-1 right-1 md:bottom-2 md:right-2 bg-backgroundGray bg-opacity-90 text-white rounded-full p-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-primary600 touch-manipulation"
                                    aria-label="View full size"
                                >
                                    <svg
                                        className="w-3 h-3 md:w-4 md:h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                        />
                                    </svg>
                                </a>
                            )}
                        </div>
                    );
                    })}
                </div>
            )}
        </div>
    );
};

export default ImageUploader;
