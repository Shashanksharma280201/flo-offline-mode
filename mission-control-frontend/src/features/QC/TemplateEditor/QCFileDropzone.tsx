import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
    Upload,
    FileSpreadsheet,
    FileJson,
    AlertCircle,
    Download
} from "lucide-react";
import { parseExcelFile, ImportErrors } from "../utils/importExcel";
import { normalizeTemplate } from "../utils/normalization";
import { QCFormTemplate } from "../types";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

interface QCFileDropzoneProps {
    onImport: (template: Partial<QCFormTemplate>, fileName: string) => void;
}

const QCFileDropzone: React.FC<QCFileDropzoneProps> = ({ onImport }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const processFile = async (file: File) => {
        setIsProcessing(true);
        setError(null);

        try {
            if (file.name.endsWith(".json")) {
                const text = await file.text();
                try {
                    const json = JSON.parse(text);
                    // Basic structural validation could go here
                    if (!json.tabs && !Array.isArray(json.tabs)) {
                        throw new Error(
                            "JSON file must contain a 'tabs' array."
                        );
                    }

                    // Normalize the data (e.g. default missing responseType to checkbox)
                    const normalizedJson = normalizeTemplate(json);

                    onImport(normalizedJson, file.name);
                } catch (e: any) {
                    setError("Invalid JSON file: " + e.message);
                }
            } else {
                // Excel
                const result = await parseExcelFile(file);
                if (Array.isArray(result)) {
                    // Handle errors
                    const errors = result as ImportErrors[];
                    const errorMsg = `Import failed: ${errors[0].error} (Row ${errors[0].row})`;
                    setError(errorMsg);
                    toast.error(
                        <div>
                            <p className="font-bold">Import Failed</p>
                            <ul className="mt-1 max-h-32 list-disc overflow-y-auto pl-4 text-xs">
                                {errors.slice(0, 5).map((err, idx) => (
                                    <li key={idx}>
                                        Row {err.row}: {err.error}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                } else {
                    onImport(result as Partial<QCFormTemplate>, file.name);
                }
            }
        } catch (err: any) {
            setError(err.message || "Failed to process file");
        } finally {
            setIsProcessing(false);
        }
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            processFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                [".xlsx"],
            "application/vnd.ms-excel": [".xls"],
            "application/json": [".json"]
        },
        multiple: false
    });

    const downloadSample = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Generate a simple sample using XLSX
        const ws = XLSX.utils.json_to_sheet([
            {
                tab: "Mechanical Checks",
                sub_category: "Chassis",
                question: "Is the frame aligned?",
                field_type: "checkbox",
                requires_image: "true",
                requires_text: "false",
                required: "false"
            },
            {
                tab: "Mechanical Checks",
                sub_category: "Chassis",
                question: "Check tire pressure",
                field_type: "checkbox",
                requires_image: "false",
                requires_text: "true",
                required: "false"
            }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "qc_template_sample.xlsx");
    };

    return (
        <div
            {...getRootProps()}
            className={`
                relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2
                border-dashed p-12 text-center transition-all duration-200
                ${
                    isDragActive
                        ? "border-emerald-500 bg-emerald-500/5"
                        : "border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50"
                }
            `}
        >
            <input {...getInputProps()} />

            <div className="mb-4 flex items-center justify-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                    <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                    <FileJson className="h-6 w-6" />
                </div>
            </div>

            <h3 className="mb-2 text-lg font-medium text-white">
                Drag and drop your QC Template
            </h3>
            <p className="mx-auto mb-6 max-w-sm text-sm text-slate-400">
                Support for Excel (.xlsx) or JSON files. Use this to quickly
                ingest your QC structure.
            </p>

            {isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-slate-900/80 backdrop-blur-sm">
                    <div className="mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500"></div>
                    <p className="text-sm font-medium text-emerald-400">
                        Processing...
                    </p>
                </div>
            )}

            {error && (
                <div className="mb-6 flex items-center gap-2 rounded-md bg-red-500/10 px-4 py-2 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
                <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                    <Upload className="mr-2 h-4 w-4" />
                    Browse Files
                </button>
                <button
                    type="button"
                    onClick={downloadSample}
                    className="inline-flex items-center justify-center rounded-md border border-slate-600 bg-transparent px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                    <Download className="mr-2 h-4 w-4" />
                    Sample Template
                </button>
            </div>
        </div>
    );
};

export default QCFileDropzone;
