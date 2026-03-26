import { useState } from "react";
import { MdEdit, MdSave, MdCancel, MdUndo } from "react-icons/md";
import SmIconButton from "@/components/ui/SmIconButton";
import { useMissionsStore } from "@/stores/missionsStore";
import { toast } from "react-toastify";
import Popup from "@/components/popup/Popup";
import { updatePathMapFn } from "@/features/dashboard/pathMapService";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const PathEditControls = () => {
    const [showPointCountDialog, setShowPointCountDialog] = useState(false);
    const [pointCount, setPointCount] = useState(30);
    const [isSaving, setIsSaving] = useState(false);

    const isEditingPaths = useMissionsStore((state) => state.isEditingPaths);
    const undoStack = useMissionsStore((state) => state.undoStack);
    const pathMap = useMissionsStore((state) => state.pathMap);
    const startPathEditing = useMissionsStore((state) => state.startPathEditing);
    const undoLastEdit = useMissionsStore((state) => state.undoLastEdit);
    const savePathEdits = useMissionsStore((state) => state.savePathEdits);
    const cancelPathEdits = useMissionsStore((state) => state.cancelPathEdits);

    const handleStartEditing = () => {
        if (pointCount < 5 || pointCount > 100) {
            toast.error("Point count must be between 5 and 100");
            return;
        }
        startPathEditing(pointCount);
        setShowPointCountDialog(false);
    };

    const handleSaveEdits = async () => {
        if (!pathMap) {
            toast.error("No pathmap selected");
            return;
        }

        setIsSaving(true);
        try {
            // Save edits to store (updates missions too)
            savePathEdits();

            // Save to database
            await updatePathMapFn(
                pathMap.paths,
                pathMap.stations,
                pathMap.id,
                pathMap.boundaries,
                pathMap.obstacles
            );

            toast.success("Changes saved to database!");
        } catch (error: any) {
            console.error("Failed to save to database:", error);
            toast.error("Failed to save to database. Changes saved locally only.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isEditingPaths) {
        return (
            <>
                <div className="flex items-center justify-between">
                    <span>Edit Path</span>
                    <SmIconButton
                        name="Edit"
                        className="bg-primary700"
                        onClick={() => setShowPointCountDialog(true)}
                    >
                        <MdEdit className="h-4 w-4 text-white" />
                    </SmIconButton>
                </div>

                <Popup
                    dialogToggle={showPointCountDialog}
                    onClose={() => setShowPointCountDialog(false)}
                    title="Path Editing"
                    description="Enter the number of editable points to display on paths. More points provide finer control but may clutter the map."
                >
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-300">
                                Number of points:
                            </label>
                            <input
                                type="number"
                                min={5}
                                max={100}
                                value={pointCount}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    // Allow empty string while typing
                                    if (value === '') {
                                        setPointCount(0);
                                    } else {
                                        const num = parseInt(value);
                                        if (!isNaN(num)) {
                                            setPointCount(num);
                                        }
                                    }
                                }}
                                placeholder="Enter points (5-100)"
                                className="w-full rounded-md bg-backgroundGray p-3 text-white placeholder:text-neutral-400 focus:outline-none"
                                autoFocus
                            />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                            <SmIconButton
                                name="Cancel"
                                className="border border-backgroundGray bg-transparent font-semibold text-white hover:bg-white/20"
                                onClick={() => setShowPointCountDialog(false)}
                            />
                            <SmIconButton
                                name="Start Editing"
                                className="border border-primary700 bg-primary700 font-semibold text-white"
                                onClick={handleStartEditing}
                            />
                        </div>
                    </div>
                </Popup>
            </>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="rounded-md bg-primary700/20 p-2 text-sm">
                <span className="text-primary700">
                    Editing Mode ({useMissionsStore.getState().editPointCount}{" "}
                    points)
                </span>
            </div>

            <div className="flex items-center justify-between">
                <span>Undo Last Edit</span>
                <SmIconButton
                    name="Undo"
                    className={undoStack.length === 0 ? "bg-gray-600 opacity-50" : "bg-yellow-600"}
                    onClick={undoStack.length === 0 ? () => {} : undoLastEdit}
                >
                    <MdUndo className="h-4 w-4 text-white" />
                </SmIconButton>
            </div>

            <div className="flex items-center justify-between">
                <span>Cancel All</span>
                <SmIconButton
                    name="Cancel"
                    className="bg-red-500"
                    onClick={cancelPathEdits}
                >
                    <MdCancel className="h-4 w-4 text-white" />
                </SmIconButton>
            </div>

            <div className="flex items-center justify-between">
                <span>Save Changes</span>
                <SmIconButton
                    name="Save"
                    className="bg-green-600"
                    onClick={handleSaveEdits}
                    isLoading={isSaving}
                >
                    {isSaving ? (
                        <LoadingSpinner className="h-3 w-3 animate-spin fill-white text-background" />
                    ) : (
                        <MdSave className="h-4 w-4 text-white" />
                    )}
                </SmIconButton>
            </div>
        </div>
    );
};

export default PathEditControls;
