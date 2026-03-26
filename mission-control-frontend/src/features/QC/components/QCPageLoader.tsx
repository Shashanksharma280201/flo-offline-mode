import React from "react";

interface QCPageLoaderProps {
    templateLoading: boolean;
}

const QCPageLoader: React.FC<QCPageLoaderProps> = ({ templateLoading }) => {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900">
            <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-emerald-500"></div>
            <p className="text-sm text-slate-400">
                {templateLoading
                    ? "Loading QC template..."
                    : "Syncing form data..."}
            </p>
        </div>
    );
};

export default QCPageLoader;
