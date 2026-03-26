import { useEffect, useState } from "react";
import { useMutation } from "react-query";
import { useOutletContext } from "react-router-dom";
import { MdDelete, MdSearch, MdSettings, MdClose, MdAdd } from "react-icons/md";
import { toast } from "react-toastify";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { ClientData } from "@/data/types";
import { errorLogger } from "@/util/errorLogger";
import {
    addMaterialsToClient,
    removeMaterialFromClient,
    fetchClientMaterials
} from "./services/clientService";
import {
    AddMaterialsPopup,
    RemoveMaterialFromClientPopup
} from "./components/MaterialPopups";
import { Material } from "@/data/types/appDataTypes";
import { checkPermission } from "@/util/roles";

const ClientMaterials = () => {
    const { selectedClient }: { selectedClient: ClientData } =
        useOutletContext();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);

    const [isViewMode, setIsViewMode] = useState(true);

    const [selectedMaterial, setSelectedMaterial] = useState<Material>();

    const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
    const [isAddMaterialsPopupOpen, setIsAddMaterialsPopupOpen] =
        useState(false);

    const { mutate: mutateFetchClientMaterials, isLoading } = useMutation({
        mutationFn: (clientId: string) => fetchClientMaterials(clientId),
        onSuccess: (data) => {
            setMaterials(data);
            setFilteredMaterials(data);
        },
        onError: (error) => errorLogger(error)
    });

    const { mutate: mutateRemoveMaterialFromClient } = useMutation({
        mutationFn: ({
            clientId,
            materialId
        }: {
            clientId: string;
            materialId: string;
        }) => removeMaterialFromClient(materialId, clientId),
        onSuccess: () => {
            toast.success("Material removed successfully!");
            mutateFetchClientMaterials(selectedClient.id);
        },
        onError: (error) => errorLogger(error)
    });

    const { mutate: mutateAddMaterialsToClient } = useMutation({
        mutationFn: ({
            clientId,
            names
        }: {
            clientId: string;
            names: string[];
        }) => addMaterialsToClient(clientId, names),
        onSuccess: () => {
            toast.success("Materials added successfully!");
            mutateFetchClientMaterials(selectedClient.id);
        },
        onError: (error) => errorLogger(error)
    });

    useEffect(() => {
        mutateFetchClientMaterials(selectedClient.id);
    }, []);

    const filterMaterialsOnSearch = (searchValue: string) => {
        const filteredMaterials = materials.filter((material) => {
            if (searchValue === "") {
                return true;
            }
            const reSearchValue = searchValue
                .toLowerCase()
                .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const re = new RegExp(reSearchValue, "i");

            if (material.name.toLowerCase().match(re)) {
                return true;
            }
            return false;
        });
        setFilteredMaterials(filteredMaterials);
    };

    const addMaterialHandler = () => {
        setIsAddMaterialsPopupOpen(true);
    };

    const confirmAddMaterialsHandler = (materials: Material[]) => {
        mutateAddMaterialsToClient({
            clientId: selectedClient.id,
            names: materials.map((material) => material.id)
        });
        setIsAddMaterialsPopupOpen(false);
    };

    const manageMaterialsHandler = () => {
        if (!materials.length) {
            toast.info("No materials exist");
            return;
        }
        setIsViewMode((prev) => !prev);
    };

    const confirmRemoveHandler = () => {
        if (selectedMaterial) {
            mutateRemoveMaterialFromClient({
                clientId: selectedClient.id,
                materialId: selectedMaterial.id
            });
        }
        setIsDeletePopupOpen(false);
        setSelectedMaterial(undefined);
    };

    const closeDeleteMaterialPopup = () => {
        setSelectedMaterial(undefined);
        setIsDeletePopupOpen(false);
    };

    return (
        <>
            <div className="m-auto flex h-full w-full flex-col items-center overflow-hidden border-border md:my-8  md:w-[85%] md:rounded-md md:border">
                <div className="flex h-full w-full items-center divide-x divide-border overflow-hidden  border-b border-border bg-backgroundGray/30 text-sm md:text-lg">
                    <label
                        htmlFor="Search"
                        className="flex h-full flex-1 items-center justify-between
                         bg-transparent pr-6 text-sm text-white transition-colors ease-in md:rounded-none md:pr-8 md:text-lg"
                    >
                        <input
                            onChange={(ev) =>
                                filterMaterialsOnSearch(ev.target.value)
                            }
                            type="text"
                            placeholder="Search materials"
                            className="block h-full w-full appearance-none items-center bg-transparent  px-6 text-sm  text-white placeholder:text-neutral-400 focus:outline-none md:px-8"
                        />
                        <MdSearch className="h-6 w-6 text-neutral-400" />
                    </label>
                    {materials.length > 0 && (
                        <div className="flex h-full items-center px-4 text-sm text-neutral-400 md:px-6">
                            <span>
                                {filteredMaterials.length} of {materials.length}
                            </span>
                        </div>
                    )}
                    {checkPermission("change_site_mgmt") && (
                        <div className="flex h-full divide-x divide-border">
                            <button
                                onClick={addMaterialHandler}
                                className={`h-full border-border  px-4 text-sm text-white hover:bg-white hover:text-black md:border-l  md:px-8 md:text-white`}
                            >
                                <span className="hidden sm:block">Add</span>
                                <MdAdd size={24} className="sm:hidden" />
                            </button>
                            <button
                                onClick={manageMaterialsHandler}
                                className={`h-full px-4 sm:min-w-20 md:min-w-28  ${isViewMode ? " text-white hover:bg-white hover:text-black md:text-white" : "bg-red-500 text-white hover:bg-red-400 md:bg-red-500"} border-border  text-sm  md:border-l `}
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
                                        <span className="hidden  sm:block">
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
                    )}
                </div>
                <div className="flex w-full flex-col divide-y divide-border overflow-auto">
                    {filteredMaterials.length > 0 ? (
                        filteredMaterials.map((material, index) => {
                            if (!material) return null;
                            const deleteMaterialHandler = () => {
                                setSelectedMaterial(material);
                                setIsDeletePopupOpen(true);
                            };

                            return (
                                <div
                                    className={`flex w-full px-6 py-4 transition-all ${!isViewMode ? "hover:bg-red-900/20" : "hover:bg-primary-800"}`}
                                    key={material.id}
                                >
                                    <div className="flex w-full items-start gap-3 text-white">
                                        <span className="min-w-[2rem] pt-1 text-xs font-medium text-neutral-500">
                                            #{index + 1}
                                        </span>
                                        <div className="flex flex-1 flex-col gap-2">
                                            <span className="text-base font-semibold">
                                                {material.name}
                                            </span>
                                            <span className="text-xs text-secondary">
                                                ID: {material.id}
                                            </span>
                                        </div>
                                    </div>
                                    {!isViewMode && (
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                className="rounded-md p-2 transition-colors hover:bg-red-500/20"
                                                onClick={deleteMaterialHandler}
                                                title={`Remove ${material.name}`}
                                            >
                                                <MdDelete
                                                    size={24}
                                                    color="white"
                                                />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex min-h-[30vh] items-center justify-center ">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center gap-6 md:gap-8">
                                    <LoadingSpinner className="h-6 w-6 animate-spin fill-white text-center text-background" />
                                    <span className="text-neutral-400">
                                        Loading Materials...
                                    </span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4 text-neutral-400">
                                    <span className="text-lg">
                                        No materials found
                                    </span>
                                    {materials.length > 0 && (
                                        <span className="text-sm">
                                            Try adjusting your search
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <AddMaterialsPopup
                existingMaterials={materials}
                isOpen={isAddMaterialsPopupOpen}
                onClose={() => setIsAddMaterialsPopupOpen(false)}
                onConfirm={confirmAddMaterialsHandler}
            />
            {selectedMaterial && (
                <RemoveMaterialFromClientPopup
                    isOpen={isDeletePopupOpen}
                    selectedMaterial={selectedMaterial}
                    onClose={closeDeleteMaterialPopup}
                    onConfirm={confirmRemoveHandler}
                />
            )}
        </>
    );
};

export default ClientMaterials;
