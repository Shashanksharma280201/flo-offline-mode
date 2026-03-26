import ComboBox from "@/components/comboBox/ComboBox";
import Header from "@/components/header/Header";
import Popup from "@/components/popup/Popup";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SmIconButton from "@/components/ui/SmIconButton";
import {
    fetchMaterials,
    insertMaterialsFn,
    updateMaterialFn,
    updateMaterialStatusFn
} from "@/features/clients/services/clientService";
import { errorLogger } from "@/util/errorLogger";
import { checkPermission } from "@/util/roles";
import { useEffect, useRef, useState } from "react";
import {
    MdAdd,
    MdArchive,
    MdClose,
    MdEdit,
    MdSearch,
    MdSettings,
    MdUndo
} from "react-icons/md";
import { useMutation } from "react-query";
import { toast } from "react-toastify";

type Material = {
    id: string;
    name: string;
    isActive: boolean;
};

const Materials = () => {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [isViewMode, setIsViewMode] = useState(true);
    const [materialStatus, setMaterialStatus] = useState<string>("Active");
    const [isMaterialStatusPopupOpen, setIsMaterialStatusPopupOpen] =
        useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isMaterialPopupOpen, setIsMaterialPopupOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<Material>();
    const [isEditMaterialPopupOpen, setIsEditMaterialPopupOpen] =
        useState(false);

    const fetchMaterialsMutation = useMutation({
        mutationFn: () => fetchMaterials(),
        onSuccess: setMaterials,
        onError: errorLogger
    });

    const createMaterialsMutation = useMutation({
        mutationFn: ({ materials }: { materials: string[] }) =>
            insertMaterialsFn(materials),
        onSuccess: () => {
            toast.success("Materials created successfully");
            fetchMaterialsMutation.mutate();
        },
        onError: errorLogger
    });

    const updateMaterialMutation = useMutation({
        mutationFn: ({
            newMaterialName,
            materialId
        }: {
            newMaterialName: string;
            materialId: string;
        }) => updateMaterialFn(newMaterialName, materialId),
        onSuccess: () => {
            toast.success("Material updated successfully");
            fetchMaterialsMutation.mutate();
        },
        onError: errorLogger
    });
    const updateMaterialStatusMutation = useMutation({
        mutationFn: ({
            isActive,
            materialId
        }: {
            isActive: boolean;
            materialId: string;
        }) => updateMaterialStatusFn(isActive, materialId),
        onSuccess: () => {
            toast.success("Material status updated successfully");
            fetchMaterialsMutation.mutate();
        },
        onError: errorLogger
    });

    const createMaterialClickHandler = () => {
        setIsMaterialPopupOpen(true);
    };
    const createNewMaterialsHandler = (materials: string[]) => {
        createMaterialsMutation.mutate({ materials });
        setIsMaterialPopupOpen(false);
    };
    const updateMaterialHandler = (updatedMaterialName: string, id: string) => {
        updateMaterialMutation.mutate({
            newMaterialName: updatedMaterialName,
            materialId: id
        });
    };

    const manageClickHandler = () => {
        if (materials.length === 0) {
            toast.info("No Materials exist");
            return;
        }
        setIsViewMode((prev) => !prev);
    };

    const materialStatusChangeHandler = () => {
        if (!selectedMaterial) return;
        const isActive = !selectedMaterial.isActive;
        updateMaterialStatusMutation.mutate({
            materialId: selectedMaterial.id,
            isActive
        });
        setIsMaterialStatusPopupOpen(false);
    };

    const filterMaterialsOnSearch = (material: Material) => {
        return material.name.toLowerCase().includes(searchQuery.toLowerCase());
    };

    const filterMaterialsOnStatus = (material: Material) => {
        if (material.isActive === undefined) return true;
        if (materialStatus === "All") return true;
        if (materialStatus === "Inactive") return material.isActive === false;
        if (materialStatus === "Active") return material.isActive === true;
    };

    const filteredMaterials = materials
        .filter(filterMaterialsOnStatus)
        .filter(filterMaterialsOnSearch);

    useEffect(() => {
        fetchMaterialsMutation.mutate();
    }, []);

    return (
        <>
            <div className="flex w-full flex-col bg-blue-900/25">
                <Header title="Materials">
                    {checkPermission("change_site_mgmt") && (
                        <button
                            className="flex items-center gap-x-2 md:rounded-md md:border md:p-2.5 md:font-semibold md:hover:border-green-500 md:hover:bg-green-500"
                            onClick={createMaterialClickHandler}
                        >
                            <div className="hidden text-sm md:block md:text-base">
                                Create
                            </div>
                            <MdAdd className="h-6 w-6 md:h-5 md:w-5" />
                        </button>
                    )}
                </Header>
                <section className="m-auto flex h-full w-full flex-col items-center justify-center  border-border bg-backgroundGray/30 md:my-8 md:w-[75%] md:rounded-md md:border">
                    <div
                        className={
                            "flex h-[3rem] w-full items-center divide-x divide-border border-b border-t border-border text-sm md:border-t-0 md:text-lg"
                        }
                    >
                        <label
                            htmlFor="Search"
                            className={
                                "flex h-full w-full items-center justify-between bg-backgroundGray/30 pr-4 text-sm text-white transition-colors ease-in md:text-lg"
                            }
                        >
                            <input
                                onChange={(event) =>
                                    setSearchQuery(event.target.value)
                                }
                                value={searchQuery}
                                type="text"
                                placeholder="Search materials"
                                className="block h-full w-full appearance-none items-center bg-transparent  px-6 text-sm  text-white placeholder:text-neutral-400 focus:outline-none md:px-8"
                            />
                            <MdSearch className="h-6 w-6 text-neutral-400" />
                        </label>
                        <div className="-order-1 w-[15%] md:order-none">
                            <ComboBox
                                nullable={false}
                                label="Material status"
                                items={["All", "Active", "Inactive"]}
                                selectedItem={materialStatus}
                                setSelectedItem={setMaterialStatus}
                                getItemLabel={(materialStatus) =>
                                    materialStatus ?? ""
                                }
                                wrapperClassName="border-none z-10 px-6 md:px-8 bg-backgroundGray/30"
                                compareItems={(itemOne, itemTwo) =>
                                    itemOne === itemTwo
                                }
                                showLabel={false}
                                isSelect={true}
                            />
                        </div>
                        <button
                            onClick={manageClickHandler}
                            className={`h-full ${isViewMode ? "bg-backgroundGray/30 text-white hover:bg-white hover:text-black md:text-white" : "bg-red-500 text-white hover:bg-red-400 md:bg-red-500"} border-border px-4 text-sm md:rounded-r-md  md:border-l md:px-6`}
                        >
                            {isViewMode ? (
                                <>
                                    <span className="hidden sm:block">
                                        Manage
                                    </span>
                                    <MdSettings
                                        size={24}
                                        className="sm:hidden"
                                    />
                                </>
                            ) : (
                                <>
                                    <span className="hidden sm:block">
                                        Cancel
                                    </span>
                                    <MdClose
                                        size={24}
                                        color="white"
                                        className="sm:hidden"
                                    />
                                </>
                            )}
                        </button>
                    </div>
                    <div className="w-full divide-y divide-border">
                        {filteredMaterials.length > 0 ? (
                            filteredMaterials.map((material) => {
                                const materialStatusChangeHandler = () => {
                                    setSelectedMaterial(material);
                                    setIsMaterialStatusPopupOpen(true);
                                };

                                const materialEditClickHandler = () => {
                                    setSelectedMaterial(material);
                                    setIsEditMaterialPopupOpen(true);
                                };
                                return (
                                    <div
                                        className="flex w-full items-center gap-6 bg-gray-900/25 p-6 hover:bg-slate-800/25 md:p-8"
                                        key={material.id}
                                    >
                                        <div className="flex w-full justify-between">
                                            <div className="flex w-full flex-col">
                                                <h3 className="text-base font-semibold">
                                                    {material.name}
                                                </h3>
                                                <span className="text-secondary">
                                                    {material.id}
                                                </span>
                                            </div>
                                            {isViewMode ? null : (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={
                                                            materialEditClickHandler
                                                        }
                                                        className="p-2 hover:opacity-80"
                                                    >
                                                        <MdEdit
                                                            size={20}
                                                            color="white"
                                                        />
                                                    </button>
                                                    <button
                                                        onClick={
                                                            materialStatusChangeHandler
                                                        }
                                                    >
                                                        {material.isActive ? (
                                                            <MdArchive className="h-6 w-6 cursor-pointer text-white" />
                                                        ) : (
                                                            <MdUndo className="h-6 w-6 cursor-pointer text-white" />
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex min-h-[30vh] items-center justify-center bg-background">
                                {fetchMaterialsMutation.isLoading ? (
                                    <div className="flex flex-col items-center justify-center gap-6 md:gap-8">
                                        <LoadingSpinner className="h-6 w-6 animate-spin fill-white text-center text-background" />
                                        <span>Loading materials</span>
                                    </div>
                                ) : (
                                    <span>No materials found</span>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </div>
            <InsertMaterialsPopup
                isOpen={isMaterialPopupOpen}
                setIsOpen={setIsMaterialPopupOpen}
                onSubmit={createNewMaterialsHandler}
            />
            {selectedMaterial && (
                <EditMaterialPopup
                    isOpen={isEditMaterialPopupOpen}
                    setIsOpen={setIsEditMaterialPopupOpen}
                    onSubmit={updateMaterialHandler}
                    material={selectedMaterial}
                />
            )}
            {selectedMaterial && (
                <MaterialStatusChangePopup
                    isOpen={isMaterialStatusPopupOpen}
                    setIsOpen={setIsMaterialStatusPopupOpen}
                    material={selectedMaterial}
                    onSubmit={materialStatusChangeHandler}
                />
            )}
        </>
    );
};

const InsertMaterialsPopup = ({
    isOpen,
    setIsOpen,
    onSubmit
}: {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onSubmit: (materialList: string[]) => void;
}) => {
    const [materialString, setMaterialString] = useState("");
    const materialList = materialString
        .split(",")
        .filter((item) => item.trim() !== "")
        .map((item) => item.trim());

    return (
        <Popup
            title={"Insert materials"}
            description={""}
            onClose={() => setIsOpen(false)}
            dialogToggle={isOpen}
        >
            <input
                className="rounded-md border border-border bg-transparent p-2 text-white outline-none"
                type="text"
                value={materialString}
                onChange={(e) => setMaterialString(e.target.value)}
                placeholder="Enter material names separated by comma"
            />
            <div className="flex flex-wrap items-start justify-start gap-2">
                {materialList.map((material) => (
                    <div
                        key={material}
                        className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-black"
                    >
                        <span>{material}</span>
                    </div>
                ))}
            </div>
            <div className="flex items-center justify-end gap-2 md:gap-4">
                <SmIconButton
                    name="Cancel"
                    className="border border-backgroundGray bg-transparent font-semibold text-white hover:bg-white/20"
                    onClick={() => setIsOpen(false)}
                />
                <SmIconButton
                    name="Confirm"
                    className="border bg-white font-semibold text-black"
                    onClick={() => onSubmit(materialList)}
                />
            </div>
        </Popup>
    );
};

const EditMaterialPopup = ({
    material,
    isOpen,
    setIsOpen,
    onSubmit
}: {
    material: Material;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onSubmit: (material: string, id: string) => void;
}) => {
    const [materialString, setMaterialString] = useState(() => material.name);

    const submitHandler = () => {
        if (!materialString) return;
        onSubmit(materialString, material.id);
        setIsOpen(false);
    };

    return (
        <Popup
            title={"Edit material?"}
            description={"Enter new material name"}
            onClose={() => setIsOpen(false)}
            dialogToggle={isOpen}
        >
            <input
                className="rounded-md border border-border bg-transparent p-2 text-white outline-none"
                type="text"
                value={materialString}
                onChange={(e) => setMaterialString(e.target.value)}
                placeholder="Material name"
            />
            <div className="flex items-center justify-end gap-2 md:gap-4">
                <SmIconButton
                    name="Cancel"
                    className="border border-backgroundGray bg-transparent font-semibold text-white hover:bg-white/20"
                    onClick={() => setIsOpen(false)}
                />
                <SmIconButton
                    name="Update"
                    className="border bg-white font-semibold text-black"
                    onClick={submitHandler}
                />
            </div>
        </Popup>
    );
};

const MaterialStatusChangePopup = ({
    material,
    isOpen,
    setIsOpen,
    onSubmit
}: {
    material: Material;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onSubmit: () => void;
}) => {
    return (
        <Popup
            title={`${material.isActive ? "Deactivate" : "Activate"} material?`}
            description={
                <p>
                    Are you sure you want to{" "}
                    {material.isActive ? "deactivate" : "activate"}{" "}
                    <span className="font-bold">{material.name}</span>?
                </p>
            }
            onClose={() => setIsOpen(false)}
            dialogToggle={isOpen}
        >
            <div className="flex items-center justify-end gap-2 md:gap-4">
                <SmIconButton
                    name="Cancel"
                    className="border border-backgroundGray bg-transparent font-semibold text-white hover:bg-white/20"
                    onClick={() => setIsOpen(false)}
                />
                <SmIconButton
                    name="Confirm"
                    className="border bg-white font-semibold text-black"
                    onClick={onSubmit}
                />
            </div>
        </Popup>
    );
};

export default Materials;
