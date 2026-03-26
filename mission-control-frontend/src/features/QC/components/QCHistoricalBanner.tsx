import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import dayjs from "dayjs";
import { QCSubmission } from "../types";

interface QCHistoricalBannerProps {
    isHistorical: boolean;
    submission: QCSubmission | null;
    robotId: string;
    navigate: (path: string) => void;
}

const QCHistoricalBanner: React.FC<QCHistoricalBannerProps> = ({
    isHistorical,
    submission,
    robotId,
    navigate
}) => {
    if (!isHistorical || !submission) {
        return null;
    }

    return (
        <div className="relative z-50 flex h-10 w-full items-center justify-center border-b border-amber-700/50 bg-amber-900/40 px-4">
            <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-200">
                    Viewing Record from{" "}
                    {dayjs(submission.createdAt).format("DD/MMM/YYYY")}
                </span>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/robots/${robotId}/qc`)}
                    className="ml-2 h-6 border border-amber-800/50 bg-amber-950/50 text-xs text-amber-200 hover:bg-amber-900"
                >
                    Go to Latest
                </Button>
            </div>
        </div>
    );
};

export default QCHistoricalBanner;
