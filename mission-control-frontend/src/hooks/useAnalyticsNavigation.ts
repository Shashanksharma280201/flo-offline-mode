import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAnalyticsStore } from '@/stores/useAnalyticsStore';
import { useUserStore } from '@/stores/userStore';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import {
  findClientWithFallback,
  findRobotWithFallback,
  formatFuzzyResultsForDisambiguation,
} from '@/utils/fuzzySearch';

interface AnalyticsNavigationParams {
  clientName?: string;
  clientId?: string;
  robotName?: string;
  robotId?: string;
  startDate?: string; // ISO format or timestamp
  endDate?: string;   // ISO format or timestamp
}

interface DisambiguationState {
  type: 'client' | 'robot' | null;
  query: string;
  options: Array<{ number: number; name: string; id: string }>;
  message: string;
  pendingParams: AnalyticsNavigationParams;
}

/**
 * Custom hook to handle voice-triggered analytics navigation
 * Listens for 'analytics-navigate' custom events and auto-fills the analytics dashboard
 * Returns disambiguation state when fuzzy matches are found
 */
export const useAnalyticsNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [disambiguationState, setDisambiguationState] = useState<DisambiguationState | null>(null);

  const {
    setSelectedClient,
    setSelectedRobot,
    setStartingTimestamp,
    setEndingTimestamp,
  } = useAnalyticsStore();

  const { clients, robots } = useUserStore();

  /**
   * Handle user's disambiguation choice
   */
  const handleDisambiguationChoice = (choiceName: string, choiceId: string) => {
    if (!disambiguationState) return;

    const { type, pendingParams } = disambiguationState;

    // Update params with the chosen option
    const updatedParams = { ...pendingParams };
    if (type === 'client') {
      updatedParams.clientName = choiceName;
      updatedParams.clientId = choiceId;
    } else if (type === 'robot') {
      updatedParams.robotName = choiceName;
      updatedParams.robotId = choiceId;
    }

    // Close disambiguation dialog
    setDisambiguationState(null);

    // Trigger navigation with updated params
    window.dispatchEvent(
      new CustomEvent('analytics-navigate', {
        detail: updatedParams,
      })
    );
  };

  /**
   * Close disambiguation dialog
   */
  const closeDisambiguation = () => {
    setDisambiguationState(null);
  };

  useEffect(() => {
    const handleAnalyticsNavigation = (event: CustomEvent<AnalyticsNavigationParams>) => {
      const params = event.detail;

      console.log('=== ANALYTICS NAVIGATION TRIGGERED ===');
      console.log('Parameters:', params);

      // Navigate to analytics page if not already there
      if (!location.pathname.includes('/analytics')) {
        navigate('/analytics');
      }

      // Small delay to ensure page is mounted
      setTimeout(() => {
        let clientFound = false;
        let robotFound = false;
        let shouldShowDisambiguation = false;

        // Set client if provided
        if (params.clientName || params.clientId) {
          const query = params.clientName || params.clientId || '';
          const { exactMatch, fuzzyMatches, needsDisambiguation, isPartialPrefix } = findClientWithFallback(query, clients);

          if (exactMatch) {
            console.log('Found exact client match:', exactMatch);
            setSelectedClient(exactMatch);
            clientFound = true;
          } else if (needsDisambiguation && fuzzyMatches.length > 0) {
            console.log(
              isPartialPrefix
                ? `Partial prefix match detected - multiple clients start with "${query}"`
                : `Multiple similar clients found for "${query}"`,
              fuzzyMatches
            );
            const disambiguationData = formatFuzzyResultsForDisambiguation(
              fuzzyMatches,
              query,
              'client'
            );

            setDisambiguationState({
              type: 'client',
              query,
              options: disambiguationData.options,
              message: disambiguationData.message,
              pendingParams: params,
            });

            shouldShowDisambiguation = true;
            toast.info(`Multiple clients found matching "${query}". Please select one.`);
          } else if (fuzzyMatches.length > 0 && !needsDisambiguation) {
            // Auto-select the best fuzzy match if disambiguation is not needed
            console.log('Auto-selecting best client match:', fuzzyMatches[0].item);
            setSelectedClient(fuzzyMatches[0].item);
            clientFound = true;
          } else {
            console.warn('Client not found:', query);
            toast.error(`Client "${query}" not found. Please try a different search.`);
          }
        }

        // Only proceed with robot if no client disambiguation is needed
        if (!shouldShowDisambiguation && (params.robotName || params.robotId)) {
          const query = params.robotName || params.robotId || '';
          const { exactMatch, fuzzyMatches } = findRobotWithFallback(query, robots);

          if (exactMatch) {
            console.log('Found exact robot match:', exactMatch);
            setSelectedRobot({ id: exactMatch.id, name: exactMatch.name });
            robotFound = true;
          } else if (fuzzyMatches.length > 0) {
            console.log('No exact match, showing fuzzy matches:', fuzzyMatches);
            const disambiguationData = formatFuzzyResultsForDisambiguation(
              fuzzyMatches,
              query,
              'robot'
            );

            setDisambiguationState({
              type: 'robot',
              query,
              options: disambiguationData.options,
              message: disambiguationData.message,
              pendingParams: params,
            });

            shouldShowDisambiguation = true;
            toast.info(`Multiple robots found matching "${query}". Please select one.`);
          } else {
            console.warn('Robot not found:', query);
            toast.error(`Robot "${query}" not found. Please try a different search.`);
          }
        }

        // Set date range if provided
        if (params.startDate && params.endDate) {
          const startDate = dayjs(params.startDate);
          const endDate = dayjs(params.endDate);

          if (startDate.isValid() && endDate.isValid()) {
            console.log('Setting date range:', {
              start: startDate.format('YYYY-MM-DD'),
              end: endDate.format('YYYY-MM-DD'),
            });
            setStartingTimestamp(startDate);
            setEndingTimestamp(endDate);
          } else {
            console.warn('Invalid date range:', params.startDate, params.endDate);
            toast.error('Invalid date range provided');
          }
        }

        // Auto-trigger filter application after a short delay
        // This gives time for the UI to update with selected values
        // Only auto-apply if no disambiguation is needed
        if (!shouldShowDisambiguation) {
          setTimeout(() => {
            // Find the Apply Filters button by searching for the span with that text
            const buttons = Array.from(document.querySelectorAll('button'));
            const applyButton = buttons.find(button => {
              const span = button.querySelector('span');
              return span?.textContent?.includes('Apply Filters');
            });

            if (applyButton) {
              console.log('Auto-triggering Apply Filters button');
              applyButton.click();
              toast.success('Analytics data is being loaded...');
            } else {
              console.warn('Apply Filters button not found');
              // Fallback: show success message if selections were made
              if (clientFound || robotFound) {
                toast.success('Analytics filters updated. Click "Apply Filters" to load data.');
              }
            }
          }, 800); // Increased delay to 800ms to ensure UI is fully updated
        }

      }, 300);
    };

    // Listen for analytics navigation events
    window.addEventListener('analytics-navigate', handleAnalyticsNavigation as EventListener);

    return () => {
      window.removeEventListener('analytics-navigate', handleAnalyticsNavigation as EventListener);
    };
  }, [navigate, location, clients, robots, setSelectedClient, setSelectedRobot, setStartingTimestamp, setEndingTimestamp]);

  return {
    disambiguationState,
    handleDisambiguationChoice,
    closeDisambiguation,
  };
};
