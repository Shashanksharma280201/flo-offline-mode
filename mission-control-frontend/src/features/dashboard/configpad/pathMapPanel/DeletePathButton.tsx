import SmIconButton from "@/components/ui/SmIconButton";
import { useMissionsStore } from "@/stores/missionsStore";
import { useState } from "react";
import { MdCancel, MdClose, MdDelete } from "react-icons/md";

const DeletePathButton = () => {
    const [
        pathMap,
        pathToDelete,
        isDeletingPath,
        setIsDeletingPath,
        setPathToDelete,
        deletePath
    ] = useMissionsStore((state) => [
        state.pathMap,
        state.pathToDelete,
        state.isDeletingPath,
        state.setIsDeletingPath,
        state.setPathToDelete,
        state.deletePath
    ]);

    const deleteClickHandler = () => {
        setPathToDelete(undefined);
        setIsDeletingPath(true);
    };

    const confirmDeleteHandler = () => {
        deletePath();
    };

    const cancelDeletePathHandler = () => {
        setIsDeletingPath(false);
        setPathToDelete(undefined);
    };

    if (!pathMap?.paths || Object.keys(pathMap.paths).length === 0) return null;

    return (
        <div className="flex items-center justify-between">
            <span>Delete path</span>
            {isDeletingPath ? (
                pathToDelete ? (
                    <div className="flex gap-2">
                        <SmIconButton
                            name={"Confirm"}
                            className={"bg-red-500"}
                            onClick={confirmDeleteHandler}
                        >
                            <MdDelete className="h-4 w-4 text-white" />
                        </SmIconButton>
                        <SmIconButton
                            name={"Cancel"}
                            className={"bg-backgroundGray"}
                            onClick={cancelDeletePathHandler}
                        >
                            <MdClose className="h-4 w-4 text-white" />
                        </SmIconButton>
                    </div>
                ) : (
                    <p className="text-sm text-slate-400">
                        Select path to delete
                    </p>
                )
            ) : (
                <SmIconButton
                    name={"Delete"}
                    className={"bg-red-500"}
                    onClick={deleteClickHandler}
                >
                    <MdDelete className="h-4 w-4 text-white" />
                </SmIconButton>
            )}
        </div>
    );
};
export default DeletePathButton;
