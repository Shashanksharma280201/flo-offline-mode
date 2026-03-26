import Header from "@/components/header/Header";
import Popup from "@/components/popup/Popup";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import {
    addFleetFn,
    fetchFleetsFn,
    updateFleetMetadataFn,
    CreateFleetPayload
} from "@/features/fleet/services/fleetService";
import { FleetCreationWizard } from "@/features/fleet/FleetCreationWizard";
import { errorLogger } from "@/util/errorLogger";
import { checkPermission } from "@/util/roles";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ChevronRight, Plus, Search, Settings2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AnimatePresence, motion } from "framer-motion";

type Fleet = {
    name: string;
    prefix: string;
    modelVersion: string;
    maintenanceSteps: {
        step: string;
        tag: string;
        _id: string;
    }[];
    id: string;
};

const Fleet = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [selectedFleet, setSelectedFleet] = useState<Fleet>();

    // Use useQuery instead of useMutation for fetching data
    const { data: fleets = [], isLoading } = useQuery({
        queryKey: ["fleets"],
        queryFn: fetchFleetsFn,
        onError: (error) => errorLogger(error)
    });

    const filteredFleets = useMemo<Fleet[]>(() => {
        return (fleets as Fleet[]).filter((item: Fleet) =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [fleets, searchTerm]);

    const addFleetMutation = useMutation({
        mutationFn: (data: CreateFleetPayload) => addFleetFn(data),
        onSuccess: () => {
            toast.success("Fleet added successfully!");
            setIsWizardOpen(false);
            // Invalidate and refetch fleets query
            queryClient.invalidateQueries(["fleets"]);
        },
        onError: (error) => errorLogger(error)
    });

    const updateFleetMetadataMutation = useMutation({
        mutationFn: (data: {
            name: string;
            prefix: string;
            modelVersion: string;
            id: string;
        }) => updateFleetMetadataFn(data),
        onSuccess: () => {
            toast.success("Fleet updated successfully!");
            // Invalidate and refetch fleets query
            queryClient.invalidateQueries(["fleets"]);
        },
        onError: (error) => errorLogger(error)
    });

    const editFleetHandler = (data: {
        name: string;
        prefix: string;
        modelVersion: string;
    }) => {
        if (selectedFleet) {
            updateFleetMetadataMutation.mutate({
                ...data,
                id: selectedFleet.id
            });
        }
        setIsOpen(false);
    };

    const createFleetHandler = (data: CreateFleetPayload) => {
        addFleetMutation.mutate(data);
    };

    const searchHandler = (query: string) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setSearchTerm(query);
        }, 300);
    };

    return (
        <>
            <Header title="Fleet" />
            <div className="min-h-screen w-full bg-blue-900/25">
                <div className="mx-auto flex h-full max-w-7xl flex-col gap-8 px-4 py-8 md:w-3/4 md:px-8">
                    {/* Actions Bar */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative w-full sm:w-96">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                            <Input
                                onChange={(event) =>
                                    searchHandler(event.target.value)
                                }
                                className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/50 focus-visible:ring-blue-500/50"
                                placeholder="Search fleets..."
                            />
                        </div>
                        {checkPermission("change_fleet") && (
                            <Button
                                onClick={() => setIsWizardOpen(true)}
                                className="bg-white text-black hover:bg-white/90"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Create Fleet
                            </Button>
                        )}
                    </div>

                    {/* Fleet List */}
                    <motion.div
                        layout
                        className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm"
                    >
                        {isLoading ? (
                            <div className="flex min-h-[40vh] items-center justify-center">
                                <div className="flex flex-col items-center gap-4 text-white/50">
                                    <LoadingSpinner className="h-8 w-8 animate-spin fill-white text-blue-500" />
                                    <span className="text-sm font-medium">
                                        Loading fleets...
                                    </span>
                                </div>
                            </div>
                        ) : filteredFleets.length > 0 ? (
                            <div className="flex flex-col">
                                <AnimatePresence
                                    mode="popLayout"
                                    initial={false}
                                >
                                    {filteredFleets.map((item) => (
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            key={item.id}
                                            onClick={() =>
                                                navigate(`/fleet/${item.id}`, {
                                                    state: item
                                                })
                                            }
                                            className="group flex cursor-pointer items-center justify-between border-b border-white/10 p-4 transition-colors last:border-b-0 hover:bg-white/5 sm:p-6"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col gap-1">
                                                    <h1 className="font-semibold text-white">
                                                        {item.name}
                                                    </h1>
                                                    <div className="flex items-center gap-2">
                                                        <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs font-medium uppercase tracking-wider text-white/70">
                                                            {item.prefix}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {checkPermission(
                                                    "change_fleet"
                                                ) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedFleet(
                                                                item
                                                            );
                                                            setIsOpen(true);
                                                        }}
                                                        className="text-white/50 hover:bg-white/10 hover:text-white"
                                                    >
                                                        <Settings2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <ChevronRight className="h-5 w-5 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-white/50" />
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-white/50">
                                <Search className="h-10 w-10 opacity-20" />
                                <span className="font-medium">
                                    No fleets found
                                </span>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>

            <AddOrEditFleetPopup
                onSubmit={editFleetHandler}
                isOpen={isOpen}
                selectedFleet={selectedFleet}
                setIsOpen={setIsOpen}
            />
            <FleetCreationWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onSubmit={createFleetHandler}
                isSubmitting={addFleetMutation.isLoading}
            />
        </>
    );
};

const AddOrEditFleetPopup = ({
    selectedFleet,
    isOpen,
    setIsOpen,
    onSubmit
}: {
    selectedFleet?: Fleet;
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    onSubmit: (data: {
        name: string;
        prefix: string;
        modelVersion: string;
    }) => void;
}) => {
    const { register, handleSubmit, setValue, reset } = useForm();

    const submitHandler = (data: any) => {
        onSubmit(data);
    };

    useEffect(() => {
        if (selectedFleet) {
            setValue("name", selectedFleet.name);
            setValue("prefix", selectedFleet.prefix);
            setValue("modelVersion", selectedFleet.modelVersion);
        } else {
            reset({ name: "", prefix: "", modelVersion: "" });
        }
    }, [selectedFleet, setValue, reset]);

    return (
        <Popup
            title="Edit Fleet"
            description="Update the fleet details below."
            dialogToggle={isOpen}
            onClose={() => setIsOpen(false)}
            panelClassName="w-full max-w-md bg-[#0a0a0a] text-white border border-white/10"
        >
            <form
                className="flex flex-col gap-6 pt-4"
                onSubmit={handleSubmit(submitHandler)}
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-white/70">
                            Name
                        </Label>
                        <Input
                            id="name"
                            {...register("name")}
                            className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
                            placeholder="e.g. Alpha Squadron"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="prefix" className="text-white/70">
                            Prefix
                        </Label>
                        <Input
                            id="prefix"
                            {...register("prefix")}
                            className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
                            placeholder="e.g. AS"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="modelVersion" className="text-white/70">
                            Model Version
                        </Label>
                        <Input
                            id="modelVersion"
                            {...register("modelVersion")}
                            className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
                            placeholder="e.g. V1, V2"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                        className="border-white/10 bg-transparent text-white hover:bg-white/10 hover:text-white"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        className="bg-white text-black hover:bg-white/90"
                    >
                        Save Changes
                    </Button>
                </div>
            </form>
        </Popup>
    );
};

export default Fleet;
