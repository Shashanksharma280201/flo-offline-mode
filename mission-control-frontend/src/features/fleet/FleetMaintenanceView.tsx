import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import {
    MoreHorizontal,
    Edit2,
    Trash2,
    Search,
    Plus,
    Image as ImageIcon,
    X
} from "lucide-react";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Popup from "@/components/popup/Popup";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/DropdownMenu";

import {
    addMaintenanceStepFn,
    deleteMaintenanceStepFn,
    fetchFleetMaintenanceStepsFn,
    updateMaintenanceStepFn,
    uploadMaintenanceStepReferenceFn,
    deleteMaintenanceStepReferenceFn
} from "./services/fleetService";
import { checkPermission } from "@/util/roles";

interface MaintenanceStep {
    _id: string;
    step: string;
    tag: string;
    referenceImageUrl?: string;
}

interface MaintenanceActionsProps {
    onEdit: () => void;
    onDelete: () => void;
}

interface AddOrEditMaintenanceStepPopupProps {
    selectedStep?: MaintenanceStep;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (
        data: { step: string; tag: string; isImageDeleted?: boolean },
        imageFile?: File | null
    ) => void;
    isLoading?: boolean;
}

interface DeleteMaintenanceStepPopupProps {
    selectedStep: MaintenanceStep;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
}

export const FleetMaintenanceView = (): JSX.Element => {
    const { id } = useParams() as { id: string };
    const queryClient = useQueryClient();

    const [isAddEditPopupOpen, setIsAddEditPopupOpen] = useState(false);
    const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
    const [selectedStep, setSelectedStep] = useState<MaintenanceStep>();
    const [searchQuery, setSearchQuery] = useState("");

    const { data: maintenanceSteps = [], isLoading: isFetching } = useQuery(
        ["fleet-maintenance", id],
        () => fetchFleetMaintenanceStepsFn(id),
        {
            enabled: !!id,
            onError: (error) => {
                console.error("Error fetching fleet maintenance steps", error);
                toast.error("Error fetching fleet maintenance steps");
            }
        }
    );

    const filteredSteps = useMemo(() => {
        if (!searchQuery) return maintenanceSteps;
        const query = searchQuery.toLowerCase();
        return maintenanceSteps.filter(
            (s: MaintenanceStep) =>
                s.step.toLowerCase().includes(query) ||
                s.tag.toLowerCase().includes(query)
        );
    }, [maintenanceSteps, searchQuery]);

    const addStepMutation = useMutation({
        mutationFn: addMaintenanceStepFn,
        onSuccess: () => {
            queryClient.invalidateQueries(["fleet-maintenance", id]);
        }
    });

    const updateStepMutation = useMutation({
        mutationFn: updateMaintenanceStepFn,
        onSuccess: () => {
            queryClient.invalidateQueries(["fleet-maintenance", id]);
            toast.success("Step updated successfully");
            setIsAddEditPopupOpen(false);
        }
    });

    const deleteStepMutation = useMutation({
        mutationFn: deleteMaintenanceStepFn,
        onSuccess: () => {
            queryClient.invalidateQueries(["fleet-maintenance", id]);
            toast.success("Step deleted successfully");
            setIsDeletePopupOpen(false);
        }
    });

    const uploadReferenceMutation = useMutation({
        mutationFn: uploadMaintenanceStepReferenceFn,
        onSuccess: () => {
            queryClient.invalidateQueries(["fleet-maintenance", id]);
            toast.success("Reference image uploaded successfully");
        }
    });

    const deleteReferenceMutation = useMutation({
        mutationFn: deleteMaintenanceStepReferenceFn,
        onSuccess: () => {
            queryClient.invalidateQueries(["fleet-maintenance", id]);
            toast.success("Reference image deleted successfully");
        }
    });

    const onSubmit = async (
        formData: { step: string; tag: string; isImageDeleted?: boolean },
        imageFile?: File | null
    ): Promise<void> => {
        try {
            if (selectedStep) {
                const hasStepChange = formData.step !== selectedStep.step;
                const hasImageChange = !!imageFile;
                const shouldDeleteImage =
                    formData.isImageDeleted && !hasImageChange;

                if (hasStepChange) {
                    await updateStepMutation.mutateAsync({
                        fleetId: id,
                        stepId: selectedStep._id,
                        step: formData.step
                    });
                }

                if (shouldDeleteImage && selectedStep.referenceImageUrl) {
                    await deleteReferenceMutation.mutateAsync({
                        fleetId: id,
                        stepId: selectedStep._id
                    });
                } else if (hasImageChange && imageFile) {
                    await uploadReferenceMutation.mutateAsync({
                        fleetId: id,
                        stepId: selectedStep._id,
                        imageFile: imageFile
                    });
                }

                if (!hasStepChange && !hasImageChange && !shouldDeleteImage) {
                    setIsAddEditPopupOpen(false);
                }
            } else {
                const result = await addStepMutation.mutateAsync({
                    fleetId: id,
                    step: formData.step,
                    tag: formData.tag
                });

                if (imageFile) {
                    const newStep = result.maintenanceSteps?.find(
                        (s: any) => s.tag === formData.tag
                    );
                    if (newStep?._id) {
                        await uploadReferenceMutation.mutateAsync({
                            fleetId: id,
                            stepId: newStep._id,
                            imageFile: imageFile
                        });
                    }
                }
                toast.success("Step added successfully");
            }
            setIsAddEditPopupOpen(false);
        } catch (error) {
            console.error("Operation failed", error);
            toast.error("Operation failed");
        }
    };

    const isMutating =
        addStepMutation.isLoading ||
        updateStepMutation.isLoading ||
        uploadReferenceMutation.isLoading ||
        deleteReferenceMutation.isLoading;

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 overflow-x-hidden px-4 md:px-0">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-1.5 px-2 transition-colors focus-within:border-white/20 sm:gap-3 sm:px-3">
                <Search className="ml-1 size-5 shrink-0 text-white/40" />
                <input
                    className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-white outline-none placeholder:text-white/30"
                    placeholder="Search maintenance steps..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {checkPermission("change_fleet") && (
                    <button
                        onClick={() => {
                            setSelectedStep(undefined);
                            setIsAddEditPopupOpen(true);
                        }}
                        className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-white/90 sm:px-4 sm:py-2"
                    >
                        <Plus className="size-5 shrink-0" />
                        <span className="hidden sm:inline">Add Step</span>
                    </button>
                )}
            </div>

            {isFetching && (
                <div className="flex justify-center p-12">
                    <LoadingSpinner className="size-8 animate-spin fill-white text-white/20" />
                </div>
            )}

            {!isFetching && (
                <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5">
                    {filteredSteps.length > 0 ? (
                        filteredSteps.map(
                            (maintenanceStep: MaintenanceStep) => (
                                <div
                                    key={maintenanceStep._id}
                                    className="group flex items-center justify-between border-b border-white/10 p-4 transition-colors last:border-b-0 hover:bg-white/[0.02] sm:p-5"
                                >
                                    <div className="flex items-center gap-4 overflow-hidden sm:gap-6">
                                        {maintenanceStep.referenceImageUrl ? (
                                            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-white/10 sm:size-20">
                                                <img
                                                    src={
                                                        maintenanceStep.referenceImageUrl
                                                    }
                                                    alt=""
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/5 text-white/20 sm:size-20">
                                                <ImageIcon className="size-6" />
                                            </div>
                                        )}
                                        <div className="flex min-w-0 flex-col gap-1.5">
                                            <h1 className="truncate text-base font-semibold text-white sm:text-lg">
                                                {maintenanceStep.step}
                                            </h1>
                                            <span className="w-fit rounded border border-white/5 bg-white/5 px-2 py-0.5 font-mono text-xs uppercase tracking-wider text-white/40">
                                                {maintenanceStep.tag}
                                            </span>
                                        </div>
                                    </div>
                                    {checkPermission("change_fleet") && (
                                        <MaintenanceActions
                                            onDelete={() => {
                                                setSelectedStep(
                                                    maintenanceStep
                                                );
                                                setIsDeletePopupOpen(true);
                                            }}
                                            onEdit={() => {
                                                setSelectedStep(
                                                    maintenanceStep
                                                );
                                                setIsAddEditPopupOpen(true);
                                            }}
                                        />
                                    )}
                                </div>
                            )
                        )
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <span className="text-base text-white/30">
                                {searchQuery
                                    ? "No steps match your search"
                                    : "No maintenance steps defined"}
                            </span>
                        </div>
                    )}
                </div>
            )}

            <AddOrEditMaintenanceStepPopup
                selectedStep={selectedStep}
                isOpen={isAddEditPopupOpen}
                onClose={() => setIsAddEditPopupOpen(false)}
                onSubmit={onSubmit}
                isLoading={isMutating}
            />

            {selectedStep && (
                <DeleteMaintenanceStepPopup
                    selectedStep={selectedStep}
                    isOpen={isDeletePopupOpen}
                    onClose={() => setIsDeletePopupOpen(false)}
                    onConfirm={() => {
                        deleteStepMutation.mutate({
                            fleetId: id,
                            stepId: selectedStep._id
                        });
                    }}
                    isLoading={deleteStepMutation.isLoading}
                />
            )}
        </div>
    );
};

const MaintenanceActions = ({
    onEdit,
    onDelete
}: MaintenanceActionsProps): JSX.Element => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="p-2 text-white/40 transition-colors hover:text-white">
                <MoreHorizontal className="size-6" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-36 border-white/10 bg-gray-900 p-1 shadow-2xl"
            >
                <DropdownMenuItem
                    onClick={onEdit}
                    className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-white hover:bg-white/10"
                >
                    <span>Edit</span>
                    <Edit2 className="size-4" />
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={onDelete}
                    className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                >
                    <span>Delete</span>
                    <Trash2 className="size-4" />
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

const AddOrEditMaintenanceStepPopup = ({
    selectedStep,
    isOpen,
    onClose,
    onSubmit,
    isLoading
}: AddOrEditMaintenanceStepPopupProps): JSX.Element => {
    const { register, handleSubmit, reset } = useForm();
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isImageDeleted, setIsImageDeleted] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            reset(
                selectedStep
                    ? { step: selectedStep.step, tag: selectedStep.tag }
                    : { step: "", tag: "" }
            );
            setPreviewUrl(selectedStep?.referenceImageUrl || null);
            setSelectedImage(null);
            setIsImageDeleted(false);
        }
    }, [selectedStep, isOpen, reset]);

    const submitHandler = (data: any): void => {
        const { step, tag } = data as { step: string; tag: string };
        const formattedTag = tag.trim().replaceAll(" ", "-").toLowerCase();
        onSubmit({ step, tag: formattedTag, isImageDeleted }, selectedImage);
    };

    const handleFileSelect = (
        event: React.ChangeEvent<HTMLInputElement>
    ): void => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            setIsImageDeleted(false);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <Popup
            title={selectedStep ? "Edit Step" : "Add Step"}
            description={
                selectedStep
                    ? "Update the maintenance step details."
                    : "Define a new maintenance step for this fleet."
            }
            dialogToggle={isOpen}
            onClose={onClose}
            panelClassName="md:w-[480px]"
        >
            <form
                className="flex flex-col gap-6"
                onSubmit={handleSubmit(submitHandler)}
            >
                <div className="flex flex-col gap-2">
                    <label
                        htmlFor="step"
                        className="text-sm font-medium text-white/50"
                    >
                        Instruction
                    </label>
                    <input
                        id="step"
                        {...register("step", { required: true })}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition-colors placeholder:text-white/20 focus:border-white/20"
                        placeholder="e.g. Check battery terminals for corrosion"
                    />
                </div>
                {!selectedStep && (
                    <div className="flex flex-col gap-2">
                        <label
                            htmlFor="tag"
                            className="text-sm font-medium text-white/50"
                        >
                            Tag Identifier
                        </label>
                        <input
                            id="tag"
                            {...register("tag", { required: true })}
                            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-base text-white outline-none transition-colors placeholder:text-white/20 focus:border-white/20"
                            placeholder="battery-check"
                        />
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-white/50">
                        Reference Image
                    </label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    {previewUrl ? (
                        <div className="group relative">
                            <img
                                src={previewUrl}
                                alt=""
                                className="aspect-video w-full rounded-xl border border-white/10 object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center gap-3 rounded-xl bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                    type="button"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    className="rounded-full bg-white/10 p-3 transition-colors hover:bg-white/20"
                                >
                                    <ImageIcon className="size-6 text-white" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPreviewUrl(null);
                                        setSelectedImage(null);
                                        setIsImageDeleted(true);
                                    }}
                                    className="rounded-full bg-red-500/20 p-3 transition-colors hover:bg-red-500/40"
                                >
                                    <X className="size-6 text-red-400" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="group flex aspect-video items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5 transition-colors hover:bg-white/[0.08]"
                        >
                            <div className="flex flex-col items-center gap-3 text-white/30 transition-colors group-hover:text-white/50">
                                <Plus className="size-8" />
                                <span className="text-sm">
                                    Upload Reference
                                </span>
                            </div>
                        </button>
                    )}
                </div>

                <div className="mt-4 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-medium text-white/50 transition-colors hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="rounded-xl bg-white px-8 py-2.5 text-sm font-bold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? "Saving..." : "Save Step"}
                    </button>
                </div>
            </form>
        </Popup>
    );
};

const DeleteMaintenanceStepPopup = ({
    selectedStep,
    isOpen,
    onClose,
    onConfirm,
    isLoading
}: DeleteMaintenanceStepPopupProps): JSX.Element => {
    return (
        <Popup
            title="Delete Step"
            description="Are you sure you want to delete this maintenance step? This action cannot be undone."
            dialogToggle={isOpen}
            onClose={onClose}
            panelClassName="md:w-[400px]"
        >
            <div className="flex flex-col gap-6">
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <p className="text-base font-medium text-white">
                        {selectedStep.step}
                    </p>
                    <p className="mt-2 font-mono text-xs uppercase text-red-400/60">
                        {selectedStep.tag}
                    </p>
                </div>
                <div className="flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-medium text-white/50 transition-colors hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="rounded-xl bg-red-600 px-8 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                    >
                        {isLoading ? "Deleting..." : "Delete Step"}
                    </button>
                </div>
            </div>
        </Popup>
    );
};
