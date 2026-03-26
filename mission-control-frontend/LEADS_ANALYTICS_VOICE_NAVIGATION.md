# Leads Analytics Voice Navigation - Backend Integration Guide

## Overview

The voice assistant now supports automatic navigation and auto-fill of the **Leads Analytics** dashboard. When users ask to view leads analytics data for a specific product, pipeline stage, or date range, the backend should return a navigation response that will:

1. Navigate to the Leads Analytics page (`/leads/analytics`)
2. Auto-select the product (if specified)
3. Set the date range
4. Auto-trigger the "Submit" button to load data
5. Inform user about pipeline stage data availability (e.g., L2, L3, etc.)

---

## Backend Response Format

### Navigation Object Structure

When the user requests leads analytics data, return a navigation object with the following structure:

```typescript
{
  "success": true,
  "transcription": "Please take me to leads analytics page and then give me the results for L2",
  "response": "Navigating to leads analytics dashboard. The analytics will show all pipeline stages including L2.",
  "navigation": {
    "page": "Leads Analytics",
    "path": "/leads/analytics",
    "params": {
      "product": "MMR rental",           // Optional: Product name
      "pipelineStage": "L2",            // Optional: Pipeline stage for reference (L0-L5)
      "startDate": "2025-02-01",        // Optional: ISO date format YYYY-MM-DD or timestamp
      "endDate": "2025-02-13"           // Optional: ISO date format YYYY-MM-DD or timestamp
    }
  },
  "conversationId": "conv-789"
}
```

---

## Parameter Details

### params.product (Optional)
- **Type**: `string`
- **Description**: Product name from available options
- **Available Values**:
  - `"MMR rental"`
  - `"MMR otb"`
  - `"LM"`
  - `"Autonomy"`
  - `"Projects"`
  - `"Others"`
- **Examples**:
  - `"MMR rental"` (exact match)
  - `"rental"` (will be normalized to "MMR rental")
  - `"mmr otb"` (case-insensitive, will be normalized to "MMR otb")

### params.pipelineStage (Optional)
- **Type**: `string`
- **Description**: Pipeline stage identifier for reference
- **Available Values**: `"L0"`, `"L1"`, `"L2"`, `"L3"`, `"L4"`, `"L5"`
- **Note**: The leads analytics page shows data for **all pipeline stages** in charts and tables. This parameter is informational and helps the AI provide context to the user.
- **Examples**: `"L2"`, `"L3"`, `"l1"` (case-insensitive)

### params.startDate (Optional)
- **Type**: `string`
- **Format**: ISO 8601 date string `YYYY-MM-DD` or Unix timestamp (milliseconds)
- **Default**: Current month start (if not provided, page defaults to current month)
- **Examples**:
  - `"2025-02-01"`
  - `"2025-12-25"`
  - `1735689600000` (timestamp)

### params.endDate (Optional)
- **Type**: `string`
- **Format**: ISO 8601 date string `YYYY-MM-DD` or Unix timestamp (milliseconds)
- **Default**: Current month end (if not provided, page defaults to current month)
- **Examples**:
  - `"2025-02-28"`
  - `"2025-12-31"`
  - `1738367999000` (timestamp)

---

## Example Voice Commands & Responses

### Example 1: Navigate with Pipeline Stage Only

**User Voice Command:**
> "Please take me to leads analytics page and then give me the results for L2"

**Backend Response:**
```json
{
  "success": true,
  "transcription": "Please take me to leads analytics page and then give me the results for L2",
  "response": "Navigating to leads analytics dashboard. The analytics will show all pipeline stages including L2. You can view L2 data in the charts and tables below.",
  "navigation": {
    "page": "Leads Analytics",
    "path": "/leads/analytics",
    "params": {
      "pipelineStage": "L2"
    }
  },
  "conversationId": "conv-001"
}
```

**Frontend Behavior:**
1. Navigates to `/leads/analytics`
2. Shows info toast: "The analytics will show all stages including L2. You can view L2 data in the charts and tables below."
3. Uses default date range (current month)
4. Auto-clicks "Submit" button
5. User can view L2 data in the funnel chart, breakup table, and other visualizations

---

### Example 2: Product + Date Range

**User Voice Command:**
> "Show me leads analytics for MMR rental from January 1st to January 31st"

**Backend Response:**
```json
{
  "success": true,
  "transcription": "Show me leads analytics for MMR rental from January 1st to January 31st",
  "response": "Loading leads analytics for MMR rental from January 1st to January 31st, 2025.",
  "navigation": {
    "page": "Leads Analytics",
    "path": "/leads/analytics",
    "params": {
      "product": "MMR rental",
      "startDate": "2025-01-01",
      "endDate": "2025-01-31"
    }
  },
  "conversationId": "conv-002"
}
```

**Frontend Behavior:**
1. Navigates to `/leads/analytics`
2. Auto-selects "MMR rental" in product dropdown
3. Sets date range: Jan 1 - Jan 31, 2025
4. Auto-clicks "Submit" button after 800ms
5. Shows success toast: "Leads analytics data is being loaded..."

---

### Example 3: Product + Pipeline Stage + Date Range

**User Voice Command:**
> "Show me L3 stage analytics for Autonomy product this month"

**Backend Response:**
```json
{
  "success": true,
  "transcription": "Show me L3 stage analytics for Autonomy product this month",
  "response": "Loading leads analytics for Autonomy product. The analytics will show all stages including L3 for this month.",
  "navigation": {
    "page": "Leads Analytics",
    "path": "/leads/analytics",
    "params": {
      "product": "Autonomy",
      "pipelineStage": "L3",
      "startDate": "2025-02-01",
      "endDate": "2025-02-28"
    }
  },
  "conversationId": "conv-003"
}
```

**Frontend Behavior:**
1. Navigates to `/leads/analytics`
2. Auto-selects "Autonomy" in product dropdown
3. Sets date range to current month (Feb 1-28, 2025)
4. Shows info toast about L3 stage data
5. Auto-clicks "Submit" button
6. Loads analytics data showing all stages with focus on L3

---

### Example 4: Product Name Variations

**User Voice Command:**
> "Show me rental product analytics for last week"

**Backend Response:**
```json
{
  "success": true,
  "transcription": "Show me rental product analytics for last week",
  "response": "Loading leads analytics for MMR rental from February 6th to February 12th, 2025.",
  "navigation": {
    "page": "Leads Analytics",
    "path": "/leads/analytics",
    "params": {
      "product": "rental",
      "startDate": "2025-02-06",
      "endDate": "2025-02-12"
    }
  },
  "conversationId": "conv-004"
}
```

**Frontend Behavior:**
1. Navigates to `/leads/analytics`
2. Normalizes "rental" → "MMR rental"
3. Auto-selects "MMR rental" in product dropdown
4. Sets date range for last week
5. Auto-clicks "Submit" button

---

## Natural Language Processing Guidelines

The backend AI should understand various date formats and product name variations:

### Date Format Examples:
- **"this month"** → Start of current month to today
- **"last week"** → Calculate previous 7 days
- **"January 2025"** → `2025-01-01` to `2025-01-31`
- **"from Jan 1st to Jan 31st"** → `2025-01-01` to `2025-01-31`
- **"Q1 2025"** → `2025-01-01` to `2025-03-31`
- **"yesterday"** → Yesterday's date
- **"last 30 days"** → 30 days ago to today

### Product Name Variations:
- **"rental"** → "MMR rental"
- **"otb"** → "MMR otb"
- **"autonomy"** / **"Autonomy"** → "Autonomy"
- **"LM"** / **"lm"** → "LM"
- **"projects"** → "Projects"
- **"others"** → "Others"

### Pipeline Stage Variations:
- **"L2"** / **"l2"** / **"stage 2"** / **"level 2"** → "L2"
- **"L0"** / **"L1"** / **"L3"** / **"L4"** / **"L5"** (case-insensitive)

---

## Frontend Behavior

When the backend returns the above response:

1. **Navigation**: Immediately navigates to `/leads/analytics`
2. **Product Selection**: If `product` is provided, auto-selects the matching product from dropdown
3. **Date Range**: Sets the start and end dates in the date picker (defaults to current month if not provided)
4. **Pipeline Stage Info**: If `pipelineStage` is provided, shows informational toast explaining that all stages are displayed
5. **Auto-Submit**: Automatically clicks the "Submit" button after 800ms to trigger data loading
6. **Success Toast**: Shows "Leads analytics data is being loaded..." confirmation
7. **Error Handling**: Shows warning toast if product name doesn't match available options

---

## Important Notes About Pipeline Stages

⚠️ **Key Understanding:**

The Leads Analytics page **does NOT have a pipeline stage filter** in the UI. Instead:

- The page displays data for **ALL pipeline stages** (L0, L1, L2, L3, L4, L5)
- Users can view stage-specific data in:
  - **ACV/TCV Line Chart** - Shows trends for each stage over time
  - **ACV Funnel Chart** - Visualizes pipeline funnel across all stages
  - **Leads Breakup Table** - Shows counts and values by stage
  - **Leads Level Product Machinewise** - Detailed stage breakdown

**Therefore:**
- When user asks for "L2 data", the AI should:
  1. Navigate to leads analytics
  2. Load all stages data
  3. Inform user that L2 data is visible in the charts/tables
  4. NOT attempt to filter by stage (no such UI control exists)

---

## Error Handling

### Product Not Recognized

If an invalid product name is provided:

**Frontend Behavior:**
```
⚠️ Warning Toast: "Product 'XYZ' not recognized. Please select manually."
```

The page will still navigate and show the analytics with default filters. User can manually select the correct product.

---

## Testing Checklist

Backend developers should test the following scenarios:

### Basic Functionality
- [ ] Navigate to leads analytics without parameters
- [ ] Navigate with product only
- [ ] Navigate with date range only
- [ ] Navigate with pipeline stage only (informational)
- [ ] Navigate with product + date range
- [ ] Navigate with product + pipeline stage + date range
- [ ] Product name variations (e.g., "rental" → "MMR rental")
- [ ] Case-insensitive product names
- [ ] Various date formats (this month, last week, Q1, etc.)
- [ ] Pipeline stage variations (L2, l2, stage 2, level 2)

### Edge Cases
- [ ] Invalid product name (should show warning but still navigate)
- [ ] Invalid date range (should show error toast)
- [ ] Missing start or end date (should use current month default)
- [ ] Future dates
- [ ] Very wide date ranges (e.g., full year)

---

## Frontend Implementation Details

The frontend listens for `leads-analytics-navigate` custom events and:

1. **Normalizes product names** - Maps variations to exact product names
2. Matches product by name (case-insensitive)
3. Validates dates using `dayjs` library
4. Updates component state (product, startDate, endDate)
5. Auto-triggers the submit functionality
6. Provides informational feedback about pipeline stages

**Key Files:**
- `/src/hooks/useLeadsAnalyticsNavigation.ts` - Event listener and auto-fill logic
- `/src/features/leads/LeadsAnalytics.tsx` - Integrates the hook
- `/src/components/UnifiedVoiceAssistant.tsx` - Dispatches the event

---

## Questions?

If you have questions about the expected format or need clarification, please refer to:
- TypeScript interfaces in `/src/components/UnifiedVoiceAssistant.tsx`
- Leads types in `/src/data/types.ts`
- Leads store in `/src/stores/leadsStore.ts`
