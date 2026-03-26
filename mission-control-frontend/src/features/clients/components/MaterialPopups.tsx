import { useEffect, useState } from "react";
import { MdClose } from "react-icons/md";

import Popup from "@/components/popup/Popup";
import SmIconButton from "@/components/ui/SmIconButton";
import { Material } from "@/data/types/appDataTypes";
import { useMutation } from "react-query";
import { fetchMaterials } from "../services/clientService";
import { errorLogger } from "@/util/errorLogger";
import ComboBox from "@/components/comboBox/ComboBox";
import { toast } from "react-toastify";

export const AddMaterialsPopup = ({
    existingMaterials,
    isOpen,
    onClose,
    onConfirm
}: {
    existingMaterials: Material[];
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (materials: Material[]) => void;
}) => {
    const [allMaterials, setAllMaterials] = useState<Material[]>([]);
    const [selectedMaterials, setSelectedMaterials] = useState<Material[]>([]);

    const removeMaterial = (material: Material) => {
        const updatedMaterials = selectedMaterials.filter(
            (selectedMaterial) => selectedMaterial.id !== material.id
        );
        setSelectedMaterials(updatedMaterials);
    };

    const confirmHandler = () => {
        if (selectedMaterials.length === 0) {
            toast.error("No materials selected");
            return;
        }
        onConfirm(selectedMaterials);
        setSelectedMaterials([]);
    };

    const cancelHandler = () => {
        onClose();
        setSelectedMaterials([]);
    };

    const selectAllHandler = () => {
        const availableMaterials = allMaterials.filter(
            (material) => !selectedMaterials.find((sm) => sm.id === material.id)
        );
        setSelectedMaterials([...selectedMaterials, ...availableMaterials]);
        toast.success(
            `Selected all ${availableMaterials.length} available materials`
        );
    };

    const clearAllHandler = () => {
        setSelectedMaterials([]);
        toast.info("Cleared all selections");
    };

    const fetchMaterialsMutation = useMutation({
        mutationFn: () => fetchMaterials(),
        onSuccess: (data: Material[]) => {
            const existingMaterialOb = existingMaterials.reduce(
                (acc, material) => {
                    acc[material.id] = material;
                    return acc;
                },
                {} as { [key: string]: Material }
            );
            const updatedMaterials = data.reduce((acc, material) => {
                if (!existingMaterialOb[material.id]) {
                    acc.push(material);
                }
                return acc;
            }, [] as Material[]);
            setAllMaterials(updatedMaterials);
        },
        onError: (error) => errorLogger(error)
    });

    useEffect(() => {
        fetchMaterialsMutation.mutate();
    }, [existingMaterials.length]);

    const selectMaterialHandler = (material: Material) => {
        const alreadyExists = selectedMaterials.find(
            (selectedMaterial) => selectedMaterial.id === material.id
        );
        if (alreadyExists) return;
        setSelectedMaterials((prev) => [...prev, material]);
    };

    const availableCount = allMaterials.length - selectedMaterials.length;
    const isAllSelected = availableCount === 0 && allMaterials.length > 0;

    return (
        <Popup
            dialogToggle={isOpen}
            onClose={onClose}
            title="Add materials"
            panelClassName="overflow-visible"
            description={`Select materials to add to this client (${allMaterials.length} available)`}
        >
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                    <ComboBox
                        label="Materials"
                        items={allMaterials.filter(
                            (material) =>
                                !selectedMaterials.find(
                                    (sm) => sm.id === material.id
                                )
                        )}
                        setSelectedItem={selectMaterialHandler}
                        getItemLabel={(material) =>
                            material ? material.name : ""
                        }
                        placeholder="Search and select materials"
                        wrapperClassName="bg-background flex-1"
                        compareItems={(itemOne, itemTwo) =>
                            itemOne?.id === itemTwo?.id
                        }
                        showLabel={false}
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={selectAllHandler}
                            disabled={
                                isAllSelected || allMaterials.length === 0
                            }
                            className="whitespace-nowrap rounded-md border border-green-600 bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-green-700"
                        >
                            Select All
                        </button>
                        <button
                            onClick={clearAllHandler}
                            disabled={selectedMaterials.length === 0}
                            className="whitespace-nowrap rounded-md border border-orange-600 bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-orange-600"
                        >
                            Clear All
                        </button>
                    </div>
                </div>

                {selectedMaterials.length > 0 && (
                    <div className="rounded-md border border-border bg-backgroundGray/20 p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm font-semibold text-white">
                                Selected Materials ({selectedMaterials.length})
                            </span>
                        </div>
                        <div className="max-h-48 overflow-y-auto overflow-x-hidden pr-2">
                            <div className="flex flex-wrap gap-2">
                                {selectedMaterials.map((material) => (
                                    <div
                                        key={material.id}
                                        className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-black transition-all hover:bg-gray-200"
                                    >
                                        <span>{material.name}</span>
                                        <MdClose
                                            size={16}
                                            onClick={removeMaterial.bind(
                                                null,
                                                material
                                            )}
                                            color="black"
                                            className="-mb-[3px] cursor-pointer hover:scale-110"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
                <span className="text-sm text-neutral-400">
                    {selectedMaterials.length} material
                    {selectedMaterials.length !== 1 ? "s" : ""} selected
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={cancelHandler}
                        className="rounded-md border border-border bg-background px-6 py-2 text-white hover:bg-backgroundGray/30"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={confirmHandler}
                        disabled={selectedMaterials.length === 0}
                        className="rounded-md border border-white bg-white px-6 py-2 text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Add ({selectedMaterials.length})
                    </button>
                </div>
            </div>
        </Popup>
    );
};

export const RemoveMaterialFromClientPopup = ({
    selectedMaterial,
    isOpen,
    onClose,
    onConfirm
}: {
    selectedMaterial: Material;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}) => {
    return (
        <Popup
            dialogToggle={isOpen}
            onClose={onClose}
            title={`Remove ${selectedMaterial.name}?`}
            description="Are you sure you want to remove this material ?"
        >
            <div className="flex items-center justify-end gap-2 md:gap-4">
                <SmIconButton
                    name="Cancel"
                    className="border border-backgroundGray bg-transparent font-semibold text-white hover:bg-white/20"
                    onClick={onClose}
                />
                <SmIconButton
                    name="Delete"
                    className="border border-red-500 bg-red-500 font-semibold text-white"
                    onClick={onConfirm}
                />
            </div>
        </Popup>
    );
};
