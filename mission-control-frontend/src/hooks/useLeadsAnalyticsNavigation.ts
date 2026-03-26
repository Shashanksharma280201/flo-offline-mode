import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { toast } from 'react-toastify';

interface LeadsAnalyticsNavigationParams {
  product?: string; // "MMR rental", "MMR otb", "LM", "Autonomy", "Projects", "Others"
  pipelineStage?: string; // "L0", "L1", "L2", "L3", "L4", "L5"
  startDate?: string; // ISO format or timestamp
  endDate?: string;   // ISO format or timestamp
}

interface UseLeadsAnalyticsNavigationProps {
  setProduct: (product: string | undefined) => void;
  setStartDate: (date: Dayjs | undefined) => void;
  setEndDate: (date: Dayjs | undefined) => void;
  submitHandler: () => void;
}

/**
 * Custom hook to handle voice-triggered leads analytics navigation
 * Listens for 'leads-analytics-navigate' custom events and auto-fills the leads analytics dashboard
 */
export const useLeadsAnalyticsNavigation = ({
  setProduct,
  setStartDate,
  setEndDate,
  submitHandler,
}: UseLeadsAnalyticsNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleLeadsAnalyticsNavigation = (event: CustomEvent<LeadsAnalyticsNavigationParams>) => {
      const params = event.detail;

      console.log('=== LEADS ANALYTICS NAVIGATION TRIGGERED ===');
      console.log('Parameters:', params);

      // Navigate to leads analytics page if not already there
      if (!location.pathname.includes('/leads/analytics')) {
        navigate('/leads/analytics');
      }

      // Small delay to ensure page is mounted
      setTimeout(() => {
        let productSet = false;
        let dateRangeSet = false;

        // Set product if provided
        if (params.product) {
          const normalizedProduct = params.product.toLowerCase();

          // Map common variations to exact product names
          const productMap: { [key: string]: string } = {
            'mmr rental': 'MMR rental',
            'mmr otb': 'MMR otb',
            'lm': 'LM',
            'autonomy': 'Autonomy',
            'projects': 'Projects',
            'others': 'Others',
            'rental': 'MMR rental',
            'otb': 'MMR otb',
          };

          const matchedProduct = productMap[normalizedProduct];

          if (matchedProduct) {
            console.log('Setting product to:', matchedProduct);
            setProduct(matchedProduct);
            productSet = true;
          } else {
            console.warn('Product not found:', params.product);
            toast.warning(`Product "${params.product}" not recognized. Please select manually.`);
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
            setStartDate(startDate);
            setEndDate(endDate);
            dateRangeSet = true;
          } else {
            console.warn('Invalid date range:', params.startDate, params.endDate);
            toast.error('Invalid date range provided');
          }
        }

        // Note about pipeline stage
        if (params.pipelineStage) {
          toast.info(
            `The analytics will show all stages including ${params.pipelineStage}. ` +
            `You can view ${params.pipelineStage} data in the charts and tables below.`
          );
        }

        // Auto-trigger submit after a short delay
        // This gives time for the UI to update with selected values
        if (productSet || dateRangeSet) {
          setTimeout(() => {
            // Find the Submit button
            const buttons = Array.from(document.querySelectorAll('button'));
            const submitButton = buttons.find(button =>
              button.textContent?.includes('Submit')
            );

            if (submitButton) {
              console.log('Auto-triggering Submit button');
              submitButton.click();
              toast.success('Leads analytics data is being loaded...');
            } else {
              console.warn('Submit button not found');
              toast.success('Leads analytics filters updated. Click "Submit" to load data.');
            }
          }, 800); // 800ms delay to ensure UI is fully updated
        }

      }, 300);
    };

    // Listen for leads analytics navigation events
    window.addEventListener('leads-analytics-navigate', handleLeadsAnalyticsNavigation as EventListener);

    return () => {
      window.removeEventListener('leads-analytics-navigate', handleLeadsAnalyticsNavigation as EventListener);
    };
  }, [navigate, location, setProduct, setStartDate, setEndDate, submitHandler]);
};
