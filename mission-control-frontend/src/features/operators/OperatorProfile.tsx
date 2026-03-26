import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
import RobotProfileItem from "../robots/robot/robotProfile/RobotProfileItem";
import { Operator } from "@/data/types/appDataTypes";
import {
    resetOperatorPassword,
    uploadOperatorDocuments,
    deleteOperatorDocument,
    updateOperatorDetails
} from "./services/operatorService";

const Profile = () => {
    const { selectedOperator }: { selectedOperator: Operator } =
        useOutletContext();

    const [isViewOnly, setIsViewOnly] = useState(true);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [isSavingDetails, setIsSavingDetails] = useState(false);

    const [operatorDetails, setOperatorDetails] = useState({
        name: selectedOperator.name,
        phoneNumber: selectedOperator.phoneNumber,
        newPassword: ""
    });

    // Document upload states
    const [panCardFiles, setPanCardFiles] = useState<File[]>([]);
    const [aadharCardFiles, setAadharCardFiles] = useState<File[]>([]);
    const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
    const [panCardPreviews, setPanCardPreviews] = useState<string[]>([]);
    const [aadharCardPreviews, setAadharCardPreviews] = useState<string[]>([]);
    const [profileImagePreview, setProfileImagePreview] = useState<
        string | null
    >(null);

    const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);
    const [deletingImageUrl, setDeletingImageUrl] = useState<string | null>(
        null
    );
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const panCardInputRef = useRef<HTMLInputElement>(null);
    const aadharCardInputRef = useRef<HTMLInputElement>(null);
    const profileImageInputRef = useRef<HTMLInputElement>(null);

    // Cleanup object URLs to prevent memory leaks
    useEffect(() => {
        return () => {
            panCardPreviews.forEach((url) => URL.revokeObjectURL(url));
            aadharCardPreviews.forEach((url) => URL.revokeObjectURL(url));
            if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
        };
    }, [panCardPreviews, aadharCardPreviews, profileImagePreview]);

    const editClickHandler = () => {
        setIsViewOnly((prev) => !prev);
    };

    const cancelEditHandler = () => {
        setOperatorDetails({
            name: selectedOperator.name,
            phoneNumber: selectedOperator.phoneNumber,
            newPassword: ""
        });
        setProfileImageFile(null);
        setProfileImagePreview(null);
        setIsViewOnly(true);
    };

    const onChangeHandler = (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setOperatorDetails((prev) => ({
            ...prev,
            [event.target.name]: event.target.value
        }));
    };

    const handleProfileImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (validateFile(file)) {
            setProfileImageFile(file);
            const previewUrl = URL.createObjectURL(file);
            setProfileImagePreview(previewUrl);
        }
    };

    const handlePanCardChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const validFiles: File[] = [];
        const newPreviews: string[] = [];

        Array.from(files).forEach((file) => {
            if (validateFile(file)) {
                validFiles.push(file);
                newPreviews.push(URL.createObjectURL(file));
            }
        });

        setPanCardFiles((prev) => [...prev, ...validFiles]);
        setPanCardPreviews((prev) => [...prev, ...newPreviews]);
    };

    const handleRemovePanPreview = (index: number) => {
        const urlToRemove = panCardPreviews[index];
        if (urlToRemove) URL.revokeObjectURL(urlToRemove);

        setPanCardFiles((prev) => prev.filter((_, i) => i !== index));
        setPanCardPreviews((prev) => prev.filter((_, i) => i !== index));

        if (panCardFiles.length === 1 && panCardInputRef.current) {
            panCardInputRef.current.value = "";
        }
    };

    const handleAadharCardChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const validFiles: File[] = [];
        const newPreviews: string[] = [];

        Array.from(files).forEach((file) => {
            if (validateFile(file)) {
                validFiles.push(file);
                newPreviews.push(URL.createObjectURL(file));
            }
        });

        setAadharCardFiles((prev) => [...prev, ...validFiles]);
        setAadharCardPreviews((prev) => [...prev, ...newPreviews]);
    };

    const handleRemoveAadharPreview = (index: number) => {
        const urlToRemove = aadharCardPreviews[index];
        if (urlToRemove) URL.revokeObjectURL(urlToRemove);

        setAadharCardFiles((prev) => prev.filter((_, i) => i !== index));
        setAadharCardPreviews((prev) => prev.filter((_, i) => i !== index));

        if (aadharCardFiles.length === 1 && aadharCardInputRef.current) {
            aadharCardInputRef.current.value = "";
        }
    };

    const handleResetPassword = async () => {
        const passwordToSet =
            operatorDetails.newPassword.trim() ||
            `flo${selectedOperator.phoneNumber}`;
        const confirmed = window.confirm(
            `Reset password for ${selectedOperator.name}?\n\nNew password will be: ${passwordToSet}`
        );

        if (!confirmed) return;

        setIsResettingPassword(true);
        try {
            const result = await resetOperatorPassword(
                selectedOperator.id,
                operatorDetails.newPassword.trim() || undefined
            );
            toast.success(
                `Password reset successfully!\nNew password: ${result.newPassword}`,
                { autoClose: 10000 }
            );
            setOperatorDetails((prev) => ({ ...prev, newPassword: "" }));
        } catch (error: any) {
            toast.error(
                error.response?.data?.message ||
                    "Failed to reset password. Please try again."
            );
        } finally {
            setIsResettingPassword(false);
        }
    };

    const validateFile = (file: File): boolean => {
        const validTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "application/pdf"
        ];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!validTypes.includes(file.type)) {
            toast.error(
                "Invalid file type. Only JPG, PNG, and PDF are allowed."
            );
            return false;
        }

        if (file.size > maxSize) {
            toast.error("File size exceeds 5MB limit.");
            return false;
        }

        return true;
    };

    const handleUploadDocuments = async () => {
        if (
            panCardFiles.length === 0 &&
            aadharCardFiles.length === 0 &&
            !profileImageFile
        ) {
            toast.info("Please select at least one document to upload.");
            return;
        }

        setIsUploadingDocuments(true);
        try {
            await uploadOperatorDocuments(
                selectedOperator.id,
                panCardFiles.length > 0 ? panCardFiles : undefined,
                aadharCardFiles.length > 0 ? aadharCardFiles : undefined,
                profileImageFile || undefined
            );

            toast.success("Documents uploaded successfully!");

            // Clear file inputs and previews
            setPanCardFiles([]);
            setAadharCardFiles([]);
            setProfileImageFile(null);
            setPanCardPreviews([]);
            setAadharCardPreviews([]);
            setProfileImagePreview(null);
            if (panCardInputRef.current) panCardInputRef.current.value = "";
            if (aadharCardInputRef.current)
                aadharCardInputRef.current.value = "";
            if (profileImageInputRef.current)
                profileImageInputRef.current.value = "";

            // Reload the page to fetch updated images from server
            window.location.reload();
        } catch (error: any) {
            toast.error(
                error.response?.data?.message ||
                    "Failed to upload documents. Please try again."
            );
        } finally {
            setIsUploadingDocuments(false);
        }
    };

    const handleDeleteDocument = async (
        documentType: "pan" | "aadhar",
        imageUrl: string
    ) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete this ${documentType === "pan" ? "PAN" : "Aadhar"} card image?`
        );

        if (!confirmed) return;

        setDeletingImageUrl(imageUrl);
        try {
            await deleteOperatorDocument(
                selectedOperator.id,
                documentType,
                imageUrl
            );

            toast.success("Document deleted successfully!");

            // Reload the page to fetch updated images
            window.location.reload();
        } catch (error: any) {
            toast.error(
                error.response?.data?.message ||
                    "Failed to delete document. Please try again."
            );
        } finally {
            setDeletingImageUrl(null);
        }
    };

    const handleSaveDetails = async () => {
        if (
            !operatorDetails.name.trim() ||
            !operatorDetails.phoneNumber.trim()
        ) {
            toast.error("Name and phone number are required.");
            return;
        }

        setIsSavingDetails(true);
        try {
            // First, upload documents if any files are selected
            if (
                panCardFiles.length > 0 ||
                aadharCardFiles.length > 0 ||
                profileImageFile
            ) {
                await uploadOperatorDocuments(
                    selectedOperator.id,
                    panCardFiles.length > 0 ? panCardFiles : undefined,
                    aadharCardFiles.length > 0 ? aadharCardFiles : undefined,
                    profileImageFile || undefined
                );
                toast.success("Documents uploaded successfully!");
            }

            // Then update operator details
            await updateOperatorDetails(
                selectedOperator.id,
                operatorDetails.name,
                operatorDetails.phoneNumber
            );

            toast.success("Operator details updated successfully!");
            setIsViewOnly(true);

            // Clear file inputs and previews
            setPanCardFiles([]);
            setAadharCardFiles([]);
            setProfileImageFile(null);
            setPanCardPreviews([]);
            setAadharCardPreviews([]);
            setProfileImagePreview(null);
            if (panCardInputRef.current) panCardInputRef.current.value = "";
            if (aadharCardInputRef.current)
                aadharCardInputRef.current.value = "";
            if (profileImageInputRef.current)
                profileImageInputRef.current.value = "";

            // Reload the page to reflect changes
            window.location.reload();
        } catch (error: any) {
            toast.error(
                error.response?.data?.message ||
                    "Failed to update operator details. Please try again."
            );
        } finally {
            setIsSavingDetails(false);
        }
    };

    return (
        <div className="flex min-h-full flex-col p-4 md:p-6 lg:p-8">
            {/* Image Preview Modal */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-h-[90vh] max-w-7xl">
                        <img
                            src={previewImage}
                            alt="Preview"
                            className="max-h-[90vh] w-full rounded-lg object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute right-4 top-4 rounded-md bg-white/10 px-4 py-2 font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            <div className="mx-auto w-full max-w-7xl">
                <div className="flex flex-col gap-8 lg:flex-row">
                    {/* Profile Image Section */}
                    <div className="flex w-full items-start justify-center lg:w-1/3">
                        <div className="group relative">
                            <div className="aspect-square h-48 w-48 overflow-hidden rounded-lg border border-white/10 bg-white/5 sm:h-56 sm:w-56 md:h-64 md:w-64">
                                {profileImagePreview ||
                                selectedOperator.imageUrl ? (
                                    <img
                                        src={
                                            profileImagePreview ||
                                            selectedOperator.imageUrl
                                        }
                                        alt={selectedOperator.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <span className="text-sm text-white/30">
                                            No Image
                                        </span>
                                    </div>
                                )}

                                {!isViewOnly && (
                                    <div
                                        onClick={() =>
                                            profileImageInputRef.current?.click()
                                        }
                                        className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
                                    >
                                        <span className="text-sm font-medium text-white">
                                            Change Photo
                                        </span>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={profileImageInputRef}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png"
                                onChange={handleProfileImageChange}
                                className="hidden"
                            />
                        </div>
                    </div>

                    {/* Profile Details Section */}
                    <div className="flex w-full flex-col lg:w-2/3">
                        <div className="flex flex-col rounded-lg border border-white/10 bg-white/5">
                            <RobotProfileItem
                                childClassname="border-b border-white/10"
                                title="Operator Name"
                                desc="Official name of the operator"
                            >
                                <input
                                    disabled={isViewOnly}
                                    value={operatorDetails.name}
                                    name="name"
                                    className="w-full rounded-md bg-transparent p-3 font-semibold text-white outline-none placeholder:text-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Operator Name"
                                    onChange={onChangeHandler}
                                />
                            </RobotProfileItem>

                            <RobotProfileItem
                                childClassname="border-b border-white/10"
                                title="Phone Number"
                                desc="Contact number for on-field communication"
                            >
                                <input
                                    disabled={isViewOnly}
                                    value={operatorDetails.phoneNumber}
                                    name="phoneNumber"
                                    type="tel"
                                    className="w-full rounded-md bg-transparent p-3 font-semibold text-white outline-none placeholder:text-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Enter phone number"
                                    onChange={onChangeHandler}
                                />
                            </RobotProfileItem>

                            <RobotProfileItem
                                childClassname="border-b border-white/10"
                                title="Security"
                                desc="Reset password for this operator"
                            >
                                <div className="flex flex-col gap-3 p-1">
                                    <input
                                        value={operatorDetails.newPassword}
                                        name="newPassword"
                                        type="password"
                                        className="w-full rounded-md border border-white/10 bg-white/5 p-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/30"
                                        placeholder={`Default: flo${selectedOperator.phoneNumber}`}
                                        onChange={onChangeHandler}
                                        disabled={isResettingPassword}
                                    />
                                    <button
                                        onClick={handleResetPassword}
                                        disabled={isResettingPassword}
                                        className="w-full rounded-md bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/20 disabled:opacity-50 sm:w-auto"
                                    >
                                        {isResettingPassword
                                            ? "Processing..."
                                            : "Reset Password"}
                                    </button>
                                </div>
                            </RobotProfileItem>

                            <RobotProfileItem
                                childClassname="border-b border-white/10"
                                title="PAN Card"
                                desc="Verification documents for PAN"
                            >
                                <div className="flex flex-col gap-4 p-1">
                                    {!isViewOnly && (
                                        <input
                                            ref={panCardInputRef}
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,application/pdf"
                                            onChange={handlePanCardChange}
                                            multiple
                                            className="w-full text-sm text-white/50 file:mr-4 file:rounded-md file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-white/20"
                                        />
                                    )}

                                    {selectedOperator.panCardImageUrls &&
                                    selectedOperator.panCardImageUrls.length >
                                        0 ? (
                                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                                            {selectedOperator.panCardImageUrls.map(
                                                (url, index) => (
                                                    <div
                                                        key={index}
                                                        className="group relative h-32 overflow-hidden rounded-md border border-white/10 bg-white/5"
                                                    >
                                                        {url
                                                            .toLowerCase()
                                                            .endsWith(
                                                                ".pdf"
                                                            ) ? (
                                                            <div className="flex h-full flex-col items-center justify-center p-2">
                                                                <span className="text-[10px] uppercase tracking-wider text-red-400">
                                                                    PDF Document
                                                                </span>
                                                                <a
                                                                    href={url}
                                                                    download
                                                                    className="mt-2 text-xs text-white underline"
                                                                >
                                                                    Download
                                                                </a>
                                                            </div>
                                                        ) : (
                                                            <img
                                                                src={url}
                                                                className="h-full w-full cursor-pointer object-cover"
                                                                onClick={() =>
                                                                    setPreviewImage(
                                                                        url
                                                                    )
                                                                }
                                                            />
                                                        )}
                                                        {!isViewOnly && (
                                                            <button
                                                                onClick={() =>
                                                                    handleDeleteDocument(
                                                                        "pan",
                                                                        url
                                                                    )
                                                                }
                                                                className="absolute right-1 top-1 rounded bg-red-500/80 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    ) : (
                                        <div className="rounded-md border border-dashed border-white/10 bg-white/5 p-8 text-center">
                                            <span className="text-xs italic text-white/30">
                                                No PAN card documents uploaded
                                            </span>
                                        </div>
                                    )}

                                    {!isViewOnly &&
                                        panCardPreviews.length > 0 && (
                                            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                                                {panCardPreviews.map(
                                                    (url, index) => (
                                                        <div
                                                            key={index}
                                                            className="group relative h-32 overflow-hidden rounded-md border border-green-500/30 bg-green-500/5"
                                                        >
                                                            <img
                                                                src={url}
                                                                className="h-full w-full object-cover opacity-50"
                                                            />
                                                            <button
                                                                onClick={() =>
                                                                    handleRemovePanPreview(
                                                                        index
                                                                    )
                                                                }
                                                                className="absolute right-1 top-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        )}
                                </div>
                            </RobotProfileItem>

                            <RobotProfileItem
                                childClassname="last:border-b-0"
                                title="Aadhar Card"
                                desc="Verification documents for Aadhar"
                            >
                                <div className="flex flex-col gap-4 p-1">
                                    {!isViewOnly && (
                                        <input
                                            ref={aadharCardInputRef}
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,application/pdf"
                                            onChange={handleAadharCardChange}
                                            multiple
                                            className="w-full text-sm text-white/50 file:mr-4 file:rounded-md file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-white/20"
                                        />
                                    )}

                                    {selectedOperator.aadharCardImageUrls &&
                                    selectedOperator.aadharCardImageUrls
                                        .length > 0 ? (
                                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                                            {selectedOperator.aadharCardImageUrls.map(
                                                (url, index) => (
                                                    <div
                                                        key={index}
                                                        className="group relative h-32 overflow-hidden rounded-md border border-white/10 bg-white/5"
                                                    >
                                                        {url
                                                            .toLowerCase()
                                                            .endsWith(
                                                                ".pdf"
                                                            ) ? (
                                                            <div className="flex h-full flex-col items-center justify-center p-2">
                                                                <span className="text-[10px] uppercase tracking-wider text-red-400">
                                                                    PDF Document
                                                                </span>
                                                                <a
                                                                    href={url}
                                                                    download
                                                                    className="mt-2 text-xs text-white underline"
                                                                >
                                                                    Download
                                                                </a>
                                                            </div>
                                                        ) : (
                                                            <img
                                                                src={url}
                                                                className="h-full w-full cursor-pointer object-cover"
                                                                onClick={() =>
                                                                    setPreviewImage(
                                                                        url
                                                                    )
                                                                }
                                                            />
                                                        )}
                                                        {!isViewOnly && (
                                                            <button
                                                                onClick={() =>
                                                                    handleDeleteDocument(
                                                                        "aadhar",
                                                                        url
                                                                    )
                                                                }
                                                                className="absolute right-1 top-1 rounded bg-red-500/80 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    ) : (
                                        <div className="rounded-md border border-dashed border-white/10 bg-white/5 p-8 text-center">
                                            <span className="text-xs italic text-white/30">
                                                No Aadhar card documents
                                                uploaded
                                            </span>
                                        </div>
                                    )}

                                    {!isViewOnly &&
                                        aadharCardPreviews.length > 0 && (
                                            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                                                {aadharCardPreviews.map(
                                                    (url, index) => (
                                                        <div
                                                            key={index}
                                                            className="group relative h-32 overflow-hidden rounded-md border border-green-500/30 bg-green-500/5"
                                                        >
                                                            <img
                                                                src={url}
                                                                className="h-full w-full object-cover opacity-50"
                                                            />
                                                            <button
                                                                onClick={() =>
                                                                    handleRemoveAadharPreview(
                                                                        index
                                                                    )
                                                                }
                                                                className="absolute right-1 top-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        )}
                                </div>
                            </RobotProfileItem>
                        </div>

                        {!isViewOnly &&
                            (panCardFiles.length > 0 ||
                                aadharCardFiles.length > 0 ||
                                profileImageFile) && (
                                <div className="mt-4 rounded-md border border-white/10 bg-white/5 px-4 py-3">
                                    <p className="text-xs text-white/50">
                                        {panCardFiles.length +
                                            aadharCardFiles.length +
                                            (profileImageFile ? 1 : 0)}{" "}
                                        files staged for upload.
                                    </p>
                                </div>
                            )}
                    </div>
                </div>

                {/* Edit/Save/Cancel Buttons */}
                <div className="mt-8 flex justify-end gap-3">
                    {isViewOnly ? (
                        <button
                            onClick={editClickHandler}
                            className="rounded-md bg-white px-6 py-2 text-sm font-semibold text-black transition-all hover:bg-white/90 active:scale-95"
                        >
                            Edit Profile
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={cancelEditHandler}
                                disabled={isSavingDetails}
                                className="rounded-md border border-white/10 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-white/5 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveDetails}
                                disabled={isSavingDetails}
                                className="rounded-md bg-white px-6 py-2 text-sm font-semibold text-black transition-all hover:bg-white/90 active:scale-95 disabled:opacity-50"
                            >
                                {isSavingDetails ? "Saving..." : "Save Changes"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
