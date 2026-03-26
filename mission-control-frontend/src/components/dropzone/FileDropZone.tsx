import { useCallback, useState } from "react";
import { useDropzone, FileRejection, DropEvent } from "react-dropzone";
import { MdDriveFolderUpload } from "react-icons/md";
import AttachmentThumbnail from "./AttachmentThumbnail";

type FileDropZoneProps = {
    onDrop?:
        | (<T extends File>(
              acceptedFiles: T[],
              fileRejections: FileRejection[],
              event: DropEvent
          ) => void)
        | undefined;
    attachments?: File[];
};

const FileDropZone = ({ onDrop, attachments }: FileDropZoneProps) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop
    });

    return (
        <div
            className="relative flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 p-6
            hover:text-neutral-400 md:p-8"
            {...getRootProps()}
        >
            <div className="pointer-events-auto absolute h-full w-full p-2">
                <div
                    className={`h-full w-full  ${isDragActive ? "border" : "border-none"} border-dashed border-border`}
                />
            </div>

            <input {...getInputProps()} />
            <MdDriveFolderUpload className="h-5 w-5  cursor-pointer  md:h-6  md:w-6 " />
            {isDragActive ? (
                <p>Drop the files here ...</p>
            ) : (
                <p>Drag 'n' drop some files here, or click to select files</p>
            )}
        </div>
    );
};
export default FileDropZone;
