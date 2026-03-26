# Analytics Voice Navigation - Backend Integration Guide

## Overview

The voice assistant now supports automatic navigation and auto-fill of the Analytics dashboard. When users ask to view analytics data for a specific client/robot with a date range, the backend should return a navigation response that will:

1. Navigate to the Analytics page
2. Auto-select the client/robot
3. Set the date range
4. Auto-trigger the "Apply Filters" button to load data

---

## Backend Response Format

### Navigation Object Structure

When the user requests analytics data, return a navigation object with the following structure:

```typescript
{
  "success": true,
  "transcription": "show me analytics for Acme Corp from January 1st to January 31st",
  "response": "Navigating to analytics dashboard for Acme Corp. Date range: January 1st to January 31st, 2025.",
  "navigation": {
    "page": "Analytics",
    "path": "/analytics",
    "params": {
      "clientName": "Acme Corp",        // Optional: Client name (case-insensitive)
      "clientId": "client-123",          // Optional: Client ID
      "robotName": "MMR-31",             // Optional: Robot name (case-insensitive)
      "robotId": "robot-456",            // Optional: Robot ID
      "startDate": "2025-01-01",         // Required: ISO date format YYYY-MM-DD or timestamp
      "endDate": "2025-01-31"            // Required: ISO date format YYYY-MM-DD or timestamp
    }
  },
  "conversationId": "conv-789"
}
```

---

## Parameter Details

### params.clientName (Optional)
- **Type**: `string`
- **Description**: Name of the client (case-insensitive matching)
- **Example**: `"Acme Corp"`, `"TechStart"`, `"Global Industries"`

### params.clientId (Optional)
- **Type**: `string`
- **Description**: Unique client ID from the database
- **Example**: `"client-123"`
- **Note**: If both `clientName` and `clientId` are provided, `clientId` takes precedence

### params.robotName (Optional)
- **Type**: `string`
- **Description**: Name of the robot (case-insensitive matching)
- **Example**: `"MMR-31"`, `"MMR-1"`, `"mmr_dbx"`

### params.robotId (Optional)
- **Type**: `string`
- **Description**: Unique robot ID from the database
- **Example**: `"robot-456"`
- **Note**: If both `robotName` and `robotId` are provided, `robotId` takes precedence

### params.startDate (Required)
- **Type**: `string`
- **Format**: ISO 8601 date string `YYYY-MM-DD` or Unix timestamp (milliseconds)
- **Examples**:
  - `"2025-01-01"`
  - `"2025-12-25"`
  - `1735689600000` (timestamp)

### params.endDate (Required)
- **Type**: `string`
- **Format**: ISO 8601 date string `YYYY-MM-DD` or Unix timestamp (milliseconds)
- **Examples**:
  - `"2025-01-31"`
  - `"2025-12-31"`
  - `1738367999000` (timestamp)

---

## Example Voice Commands & Responses

### Example 1: Client + Date Range

**User Voice Command:**
> "Show me analytics for Acme Corp from December 1st to December 31st 2025"

**Backend Response:**
```json
{
  "success": true,
  "transcription": "Show me analytics for Acme Corp from December 1st to December 31st 2025",
  "response": "Opening analytics dashboard for Acme Corp. Loading data from December 1st to December 31st, 2025.",
  "navigation": {
    "page": "Analytics",
    "path": "/analytics",
    "params": {
      "clientName": "Acme Corp",
      "startDate": "2025-12-01",
      "endDate": "2025-12-31"
    }
  },
  "conversationId": "conv-001"
}
```

### Example 2: Robot + Date Range

**User Voice Command:**
> "Display analytics for robot MMR-31 from last week"

**Backend Response:**
```json
{
  "success": true,
  "transcription": "Display analytics for robot MMR-31 from last week",
  "response": "Loading analytics for robot MMR-31 from February 6th to February 12th, 2025.",
  "navigation": {
    "page": "Analytics",
    "path": "/analytics",
    "params": {
      "robotName": "MMR-31",
      "startDate": "2025-02-06",
      "endDate": "2025-02-12"
    }
  },
  "conversationId": "conv-002"
}
```

### Example 3: Specific Date Range with Client ID

**User Voice Command:**
> "Get me the analytics data for client ID client-789 between January 15th and February 15th"

**Backend Response:**
```json
{
  "success": true,
  "transcription": "Get me the analytics data for client ID client-789 between January 15th and February 15th",
  "response": "Fetching analytics for the specified client from January 15th to February 15th.",
  "navigation": {
    "page": "Analytics",
    "path": "/analytics",
    "params": {
      "clientId": "client-789",
      "startDate": "2025-01-15",
      "endDate": "2025-02-15"
    }
  },
  "conversationId": "conv-003"
}
```

### Example 4: Both Client and Robot (Multi-Filter)

**User Voice Command:**
> "Show me Acme Corp's analytics for robot MMR-1 in January"

**Backend Response:**
```json
{
  "success": true,
  "transcription": "Show me Acme Corp's analytics for robot MMR-1 in January",
  "response": "Loading analytics for Acme Corp, robot MMR-1, for the month of January 2025.",
  "navigation": {
    "page": "Analytics",
    "path": "/analytics",
    "params": {
      "clientName": "Acme Corp",
      "robotName": "MMR-1",
      "startDate": "2025-01-01",
      "endDate": "2025-01-31"
    }
  },
  "conversationId": "conv-004"
}
```

---

## Natural Language Processing Guidelines

The backend AI should be able to understand various date formats and convert them to standard ISO format:

### Date Format Examples:
- **"last week"** → Calculate previous 7 days
- **"this month"** → Start of current month to today
- **"December 2025"** → `2025-12-01` to `2025-12-31`
- **"January 1st to 31st"** → `2025-01-01` to `2025-01-31`
- **"from 1/15 to 2/15"** → `2025-01-15` to `2025-02-15`
- **"Q1 2025"** → `2025-01-01` to `2025-03-31`
- **"yesterday"** → Yesterday's date
- **"last 30 days"** → 30 days ago to today

### Client/Robot Name Variations:
- Handle case-insensitive matching
- Handle partial names (e.g., "Acme" should match "Acme Corp")
- Handle common abbreviations (e.g., "MMR 31" = "MMR-31")

---

## Frontend Behavior

When the backend returns the above response:

1. **Navigation**: Immediately navigates to `/analytics`
2. **Client Selection**: If `clientName` or `clientId` is provided, auto-selects the matching client
3. **Robot Selection**: If `robotName` or `robotId` is provided, auto-selects the matching robot
4. **Date Range**: Sets the start and end dates in the date picker
5. **Auto-Apply**: Automatically clicks the "Apply Filters" button after 800ms to trigger data loading
6. **Success Toast**: Shows "Analytics data is being loaded..." confirmation
7. **Error Handling**: Shows toast notifications if:
   - Client not found
   - Robot not found
   - Invalid date range
   - Apply Filters button not found (fallback message)

---

## Fuzzy Matching & Disambiguation ⭐ NEW FEATURE

### How Fuzzy Matching Works

The frontend now includes **intelligent fuzzy search** using the Fuse.js library. When an exact match is not found for a client or robot name, the system will:

1. **Find closest matches** using fuzzy string matching (handles typos, partial names, abbreviations)
2. **Show disambiguation dialog** with up to 5 closest matches
3. **Let user select** the correct option
4. **Continue with selected option** automatically

### Fuzzy Match Examples

| User Says | Actual Name | Match Quality | Result |
|-----------|-------------|---------------|---------|
| "Acme" | "Acme Corp" | Exact substring | ✅ Matches |
| "Acme Corp" | "ACME CORP" | Case-insensitive | ✅ Matches |
| "Acme Coporation" | "Acme Corp" | Typo tolerance | ✅ Matches (fuzzy) |
| "K2K Green Gables" | "K2K-Green Gables" | Space vs hyphen | ✅ Matches (normalized) |
| "MMR 31" | "MMR-31" | Space vs dash | ✅ Matches (normalized) |
| "mmr31" | "MMR-31" | No separator | ✅ Matches (normalized) |
| "K2K_Green_Gables" | "K2K-Green Gables" | Underscore vs hyphen | ✅ Matches (normalized) |
| "Techstart" | "TechStart Inc" | Partial match | ✅ Matches (fuzzy) |
| "MNR-31" | "MMR-31" | Similar letters | ⚠️ Possible match (shows in disambiguation) |

### String Normalization for Better Matching ⭐ ENHANCED

The system now includes intelligent string normalization that handles common naming variations:

**Normalization Process:**
1. Converts to lowercase
2. Removes hyphens (`-`), underscores (`_`), and spaces
3. Compares normalized versions

**Examples:**
- `"K2K Green Gables"` → normalized to `"k2kgreengables"`
- `"K2K-Green Gables"` → normalized to `"k2kgreengables"`
- `"K2K_Green_Gables"` → normalized to `"k2kgreengables"`
- **Result**: All three variations match the database name `"K2K-Green Gables"`

This ensures that voice transcription variations (spaces vs hyphens vs underscores) don't prevent matches.

### When Fuzzy Matching Triggers

Fuzzy matching only triggers when:
- ❌ Exact match (case-insensitive **and** normalized) is **not found**
- ✅ At least one fuzzy match is found with score < 0.5 (configurable)

### Disambiguation Dialog Behavior

When fuzzy matches are found, the user sees:

**Dialog Title:** "Did you mean?"
**Message:** "I couldn't find an exact match for '[query]'. Did you mean one of these [clients/robots]?"

**Options displayed:**
1. Closest match (highest confidence)
2. Second closest match
3. Third closest match
...up to 5 matches

**User can:**
- Click an option to select it
- Click "Cancel" to dismiss
- Press Escape key to close

### Backend Response (No Changes Required)

The backend doesn't need to change! Just return the client/robot name as you would normally:

```json
{
  "navigation": {
    "path": "/analytics",
    "params": {
      "clientName": "Acme",  // Even if typed incorrectly, fuzzy match will find it
      "startDate": "2025-01-01",
      "endDate": "2025-01-31"
    }
  }
}
```

The frontend will automatically:
1. Try exact match
2. If not found, search for fuzzy matches
3. Show disambiguation if multiple matches found
4. Auto-select if only one good match

---

## Error Handling

### Client Not Found (No Matches)

If the specified client doesn't exist and no fuzzy matches are found:

```json
{
  "success": false,
  "transcription": "Show analytics for XYZ Company",
  "response": "I couldn't find a client named 'XYZ Company'. Please verify the client name.",
  "error": "Client not found",
  "conversationId": "conv-005"
}
```

**Frontend Behavior:** Shows error toast: *"Client 'XYZ Company' not found. Please try a different search."*

### Robot Not Found (No Matches)

If the specified robot doesn't exist and no fuzzy matches are found:

```json
{
  "success": false,
  "transcription": "Show analytics for robot MMR-999",
  "response": "Robot MMR-999 was not found in the system. Please check the robot ID.",
  "error": "Robot not found",
  "conversationId": "conv-006"
}
```

**Frontend Behavior:** Shows error toast: *"Robot 'MMR-999' not found. Please try a different search."*

### Fuzzy Matches Found

When fuzzy matches are found:

**Frontend Behavior:**
1. Shows disambiguation dialog
2. Toast notification: *"Multiple clients found matching '[query]'. Please select one."*
3. User selects the correct option
4. Analytics navigation continues with selected option

---

## Testing Checklist

Backend developers should test the following scenarios:

### Basic Functionality
- [ ] Client name only + date range
- [ ] Robot name only + date range
- [ ] Client ID + date range
- [ ] Robot ID + date range
- [ ] Both client and robot + date range
- [ ] Various date formats (last week, this month, Q1, etc.)
- [ ] Case-insensitive client/robot names
- [ ] Non-existent client/robot error handling
- [ ] Invalid date range error handling

### Fuzzy Matching Scenarios (Frontend Handles)
- [ ] Typo in client name (e.g., "Acme Coporation" → "Acme Corp")
- [ ] Partial client name (e.g., "Acme" → "Acme Corp")
- [ ] Case mismatch (e.g., "acme corp" → "Acme Corp")
- [ ] Robot name with different separators (e.g., "MMR 31" → "MMR-31")
- [ ] Similar robot names (e.g., "MMR-1" should show "MMR-1", "MMR-10", "MMR-11", etc.)
- [ ] Abbreviations (e.g., "Tech" → "TechStart Inc")
- [ ] Multiple possible matches triggering disambiguation
- [ ] No matches found showing error toast

---

## Frontend Implementation Details

The frontend listens for `analytics-navigate` custom events and:

1. **Normalizes search queries** - Removes hyphens, underscores, spaces for better matching ⭐ ENHANCED
2. Matches client/robot by name (case-insensitive and normalized) or ID
3. **Uses fuzzy search if exact match not found** ⭐ NEW
4. **Shows disambiguation dialog for multiple matches** ⭐ NEW
5. Validates dates using `dayjs` library
6. Updates the Zustand analytics store
7. Auto-triggers the filter application

**Key Files:**
- `/src/hooks/useAnalyticsNavigation.ts` - Event listener, fuzzy matching, and auto-fill logic
- `/src/pages/Analytics.tsx` - Integrates the hook and disambiguation dialog
- `/src/components/UnifiedVoiceAssistant.tsx` - Dispatches the event
- `/src/components/FuzzySearchDisambiguation.tsx` - Disambiguation UI component ⭐ NEW
- `/src/utils/fuzzySearch.ts` - Fuzzy search utilities using Fuse.js ⭐ NEW

---

## Questions?

If you have questions about the expected format or need clarification, please refer to:
- TypeScript interfaces in `/src/components/UnifiedVoiceAssistant.tsx`
- Analytics store in `/src/stores/useAnalyticsStore.ts`
