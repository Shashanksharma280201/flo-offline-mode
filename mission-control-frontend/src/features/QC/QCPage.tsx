import React from "react";
import { QCTab } from "./types";
import QCFormHeader from "./QCFormHeader";
import QCTabPanel from "./QCTabPanel";
import QCSignOffSection from "./QCSignOffSection";
import QCHistoryModal from "./QCHistoryModal";
import { Button } from "@/components/ui/Button";
import { useQCPageLogic } from "./hooks/useQCPageLogic";
import QCCompletionView from "./components/QCCompletionView";
import QCMainHeader from "./components/QCMainHeader";
import QCSubmissionInfo from "./components/QCSubmissionInfo";
import QCPageLoader from "./components/QCPageLoader";
import QCPageError from "./components/QCPageError";
import QCHistoricalBanner from "./components/QCHistoricalBanner";

const QCPage: React.FC = () => {
    const {
        robotId,
        submissionId,
        navigate,
        template,
        templateLoading,
        submission,
        submissionLoading,
        submissionError,
        activeTab,
        saving,
        showHistory,
        setShowHistory,
        isDirty,
        metadata,
        signOff,
        answers,
        lastSaved,
        robotName,
        isHistorical,
        isReadOnly,
        isFormComplete,
        answeredCount,
        handleMetadataChange,
        handleAnswerChange,
        handleSignOffChange,
        handleTabChange,
        handleSaveDraft,
        handleSubmit,
        handleDownloadPDF,
        handleClearAll,
        handleFillFreshForm,
        showCompletionView
    } = useQCPageLogic();

    if (submissionError && !submissionLoading && submissionId) {
        return (
            <QCPageError
                submissionError={submissionError}
                submissionId={submissionId}
                robotId={robotId!}
                navigate={navigate}
            />
        );
    }

    if (templateLoading || (submissionLoading && !submission)) {
        return <QCPageLoader templateLoading={templateLoading} />;
    }

    const historicalBanner = (
        <QCHistoricalBanner
            isHistorical={isHistorical}
            submission={submission}
            robotId={robotId!}
            navigate={navigate}
        />
    );

    if (showCompletionView) {
        return (
            <QCCompletionView
                submission={submission}
                template={template}
                robotId={robotId!}
                robotName={robotName}
                isHistorical={isHistorical}
                showHistory={showHistory}
                saving={saving}
                onDownloadPDF={handleDownloadPDF}
                onFillFreshForm={handleFillFreshForm}
                setShowHistory={setShowHistory}
                navigate={navigate}
                historicalBanner={historicalBanner}
            />
        );
    }

    return (
        <div
            className={`min-h-screen bg-slate-900 pb-12 ${isHistorical ? "shadow-[inset_0_0_0_4px_rgba(245,158,11,0.2)]" : ""}`}
        >
            {historicalBanner}
            <QCMainHeader
                robotId={robotId!}
                robotName={robotName}
                saving={saving}
                lastSaved={lastSaved}
                isDirty={isDirty}
                isReadOnly={isReadOnly}
                isFormComplete={isFormComplete}
                answeredCount={answeredCount}
                totalQuestions={template?.totalQuestions || 0}
                submission={submission}
                onSaveDraft={handleSaveDraft}
                onSubmit={handleSubmit}
                onDownloadPDF={handleDownloadPDF}
                onShowHistory={() => setShowHistory(true)}
                onClearAll={handleClearAll}
                navigate={navigate}
            />

            {/* Main Content */}
            <div className="mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
                <QCSubmissionInfo
                    submission={submission}
                    template={template}
                    answeredCount={answeredCount}
                />

                {/* Form Header (Metadata) */}
                <QCFormHeader
                    headerFields={template?.headerFields || []}
                    metadata={metadata}
                    onMetadataChange={handleMetadataChange}
                    disabled={isReadOnly}
                    robotId={robotId}
                    robotName={robotName}
                />

                {/* Tabs Navigation */}
                <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/40 shadow-lg">
                    <div className="no-scrollbar overflow-x-auto border-b border-slate-700">
                        <nav className="-mb-px flex bg-slate-800/60">
                            {(template?.tabs || [])
                                .sort((a: QCTab, b: QCTab) => a.order - b.order)
                                .map((tab: QCTab) => (
                                    <Button
                                        key={tab.tabId}
                                        onClick={() =>
                                            handleTabChange(tab.tabId)
                                        }
                                        variant="ghost"
                                        className={`flex-shrink-0 whitespace-nowrap rounded-none border-b-2 px-4 py-2 text-xs font-medium transition-all md:px-6 md:py-3 md:text-sm ${
                                            activeTab === tab.tabId
                                                ? "border-emerald-500 bg-slate-700/30 text-emerald-400"
                                                : "border-transparent text-slate-400 hover:bg-slate-700/20 hover:text-slate-200"
                                        }`}
                                    >
                                        {tab.tabName}
                                    </Button>
                                ))}
                        </nav>
                    </div>

                    <div className="rounded-b-lg bg-slate-800/30 p-3 md:p-6">
                        <QCTabPanel
                            tab={
                                (template?.tabs || []).find(
                                    (t: QCTab) => t.tabId === activeTab
                                ) || (template?.tabs || [])[0]
                            }
                            robotId={robotId!}
                            submissionId={submission?.id || ""}
                            answers={answers}
                            onAnswerChange={handleAnswerChange}
                            disabled={isReadOnly}
                        />
                    </div>
                </div>

                {/* Sign Off Section */}
                <div className="mt-8">
                    <QCSignOffSection
                        signOffFields={template?.signOffFields || []}
                        signOffData={signOff}
                        onSignOffChange={handleSignOffChange}
                        disabled={isReadOnly}
                    />
                </div>
            </div>

            {/* History Modal */}
            <QCHistoryModal
                robotId={robotId!}
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                onViewSubmission={(id) =>
                    navigate(`/robots/${robotId}/qc/${id}`)
                }
            />
        </div>
    );
};

export default QCPage;
