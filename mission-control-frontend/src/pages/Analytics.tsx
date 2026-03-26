import Header from "../components/header/Header";
import { AppDataCards } from "@/features/analytics/components/AppDataCards";
import { AnalyticsChartDisplay } from "@/features/analytics/components/AnalyticsChartDisplay";
import AnalyticsFilter from "@/features/analytics/components/AnalyticsFilter";
import { DownloadDataButton } from "@/features/analytics/components/DownloadDataButton";
import { GeneratePDFButton } from "@/features/analytics/components/GeneratePDFButton";
import { PDFConfigSection } from "@/features/analytics/components/PDFConfigSection";
import { useAnalyticsNavigation } from "@/hooks/useAnalyticsNavigation";
import { FuzzySearchDisambiguation } from "@/components/FuzzySearchDisambiguation";

/**
 * This page lets the user view analytics based on the
 * data collected from Flo Trips mobile app and robot sensor data.
 *
 * The user can filter the data based on clients, robots, operator and add a timeframe.
 * And also download the reports generated while generating the charts
 *
 */
const Analytics = () => {
    // Enable voice-triggered analytics navigation with fuzzy matching
    const { disambiguationState, handleDisambiguationChoice, closeDisambiguation } =
        useAnalyticsNavigation();

    return (
        <div className="flex h-screen w-screen flex-col overflow-y-auto">
            <Header title="Analytics">
                <div className="flex gap-2">
                    <DownloadDataButton />
                    <GeneratePDFButton />
                </div>
            </Header>
            <AnalyticsFilter />
            <PDFConfigSection />
            <AppDataCards />
            <AnalyticsChartDisplay />

            {/* Fuzzy Search Disambiguation Dialog */}
            <FuzzySearchDisambiguation
                isOpen={!!disambiguationState}
                message={disambiguationState?.message || ''}
                options={disambiguationState?.options || []}
                onSelect={handleDisambiguationChoice}
                onClose={closeDisambiguation}
                entityType={disambiguationState?.type || 'client'}
            />
        </div>
    );
};

export default Analytics;
