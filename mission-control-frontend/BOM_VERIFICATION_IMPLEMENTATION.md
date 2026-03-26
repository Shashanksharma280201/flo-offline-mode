# BOM Verification Frontend Implementation

## Overview

This document describes the frontend implementation of the BOM (Bill of Materials) verification pipeline for robot creation with inventory management.

## Features Implemented

### 1. BOM Verification Modal
A comprehensive modal that displays all fleet parts with:
- Real-time inventory availability checking
- Source selection dropdown (Flo/GKX/Abhirup)
- Visual indicators for inventory status:
  - ✅ GREEN: Sufficient inventory
  - ⚠️ YELLOW: Low stock warning
  - 🔴 RED: Insufficient inventory (blocks creation)
- Automatic inventory fetching for "Flo" parts
- Grouped display (Electrical vs Mechanical parts)

### 2. Enhanced Robot Creation Form
- Automatically fetches full fleet details when fleet is selected
- Shows BOM verification modal if fleet has parts consumption data
- Supports both standard robot creation and BOM-verified creation
- Displays success messages with low stock warnings
- Handles inventory errors gracefully

### 3. BOM Status Display on Robots Page
- Shows "INCOMPLETE" badge (red) for robots with incomplete BOM
- Shows "COMPLETE" badge (green) for robots with complete BOM
- Badge appears alongside Online/Offline and Issue badges
- Responsive layout with flex-wrap for multiple badges

## Files Modified/Created

### Created Files

#### 1. `BOMVerificationModal.tsx`
Location: `/src/features/robots/robotForm/BOMVerificationModal.tsx`

**Purpose:** Modal component for BOM verification during robot creation

**Key Features:**
- Fetches inventory data for all parts in parallel
- Displays electrical and mechanical parts separately
- Real-time inventory checking with loading states
- Source selection (Flo/GKX/Abhirup) per part
- Validation to prevent creation with insufficient Flo inventory
- Automatic suggestions to change source if inventory is low

**Component Props:**
```typescript
{
  fleetName: string;
  partsConsumption: PartsConsumption;
  onConfirm: (bomParts: BOMPart[]) => void;
  onCancel: () => void;
}
```

### Modified Files

#### 1. `robotTypes.ts`
Location: `/src/data/types/robotTypes.ts`

**Changes:**
- Added `bomCompletionStatus?: 'complete' | 'incomplete'` to RobotType

#### 2. `robotsService.ts`
Location: `/src/features/robots/services/robotsService.ts`

**Changes:**
- Added `source: 'Flo' | 'GKX' | 'Abhirup'` to PartsConsumedRecord type
- Created new `BOMPart` type for verification
- Added `createRobotWithBOMfn()` API function

**New API Function:**
```typescript
export const createRobotWithBOMfn = async (payload: {
    robotData: {...};
    bomVerification: BOMPart[];
}) => {
    const response = await axios.post(
        API_URL + "/create-with-bom",
        payload,
        { headers: getAuthHeader() }
    );
    return response.data;
};
```

#### 3. `RobotForm.tsx`
Location: `/src/features/robots/robotForm/RobotForm.tsx`

**Changes:**
- Imported BOM modal and fleet service
- Added state for `selectedFleetDetails` and `showBOMModal`
- Added `fetchFleetDetails()` to get full fleet data with parts
- Added `createRobotWithBOMMutation` for BOM-verified creation
- Modified `submitHandler()` to check for fleet parts and show modal
- Added `handleBOMConfirm()` to process BOM verification
- Added `resetForm()` helper function
- Integrated BOM modal in render
- Updated loading states to include BOM mutation

**Flow:**
1. User selects fleet → Fetches full fleet details with parts consumption
2. User submits form → Checks if fleet has parts
3. If yes → Shows BOM verification modal
4. User verifies parts and selects sources → Calls `createRobotWithBOMfn`
5. Success → Shows robot credentials + warnings (if any)

#### 4. `Robots.tsx`
Location: `/src/pages/Robots.tsx`

**Changes:**
- Added BOM completion status badges in robot card
- Shows "INCOMPLETE" (red) or "COMPLETE" (green) alongside other badges
- Changed layout to `flex-wrap` for responsive badge display

## API Integration

### Endpoint Used
```
POST /api/v1/robots/create-with-bom
```

### Request Format
```json
{
  "robotData": {
    "name": "MMR-75",
    "desc": "Description",
    "password": "secure123",
    "owner": "userId",
    "fleetId": "fleetId",
    "robotType": "manual",
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "maintenance": {
      "schedule": [1, 4],
      "lastMaintenance": 1234567890
    }
  },
  "bomVerification": [
    {
      "itemId": "MOTOR-001",
      "name": "DC Motor",
      "quantity": 2,
      "unit": "pcs",
      "source": "Flo",
      "purpose": "electrical"
    }
  ]
}
```

### Response Format
```json
{
  "success": true,
  "robot": { /* robot object */ },
  "bomStatus": "complete" | "incomplete",
  "inventoryDeductions": [
    {
      "itemId": "MOTOR-001",
      "name": "DC Motor",
      "quantity": 2,
      "remainingAfterDeduction": 48
    }
  ],
  "warnings": [
    {
      "itemId": "BATTERY-001",
      "name": "Li-ion Battery",
      "message": "Low stock after deduction: 3 units remaining"
    }
  ]
}
```

## User Flow

### 1. Creating Robot with BOM Verification

1. User clicks "Create" button on Robots page
2. Fills in robot details (name, description, password, etc.)
3. Selects robot type (Manual/Autonomous)
4. Selects fleet from dropdown
5. System fetches fleet parts consumption data
6. User clicks "Submit"
7. **BOM Verification Modal appears** showing:
   - All electrical parts with quantities
   - All mechanical parts with quantities
   - Real-time inventory availability for each part
   - Source dropdown for each part (Flo/GKX/Abhirup)
8. User verifies and selects source for each part:
   - Flo → Will deduct from inventory (shows available qty)
   - GKX/Abhirup → External source (no inventory check)
9. If any "Flo" part has insufficient inventory → Button shows "Insufficient Inventory" (disabled)
10. User can change source to GKX/Abhirup to proceed
11. User clicks "Confirm & Create Robot"
12. Robot created with:
    - Inventory deducted for Flo parts
    - BOM completion status set
    - Success message shown with any low stock warnings
13. User sees robot credentials to copy

### 2. Viewing BOM Status

1. User navigates to Robots page
2. Each robot card shows status badges:
   - Online/Offline status (green/red)
   - Issue badge (orange) if recent issues exist
   - **BOM status badge:**
     - "INCOMPLETE" (red) if parts not fully verified (new robots only)
     - "COMPLETE" (green) for all other cases:
       - Old robots created before BOM feature (backward compatibility)
       - New robots with complete BOM verification
3. Badges wrap responsively on smaller screens

**Backward Compatibility:**
All existing robots (created before this feature) automatically show "COMPLETE" (green) badge. This ensures no confusion for historical data. Only new robots created through the BOM verification flow will show accurate "INCOMPLETE" or "COMPLETE" status based on actual verification.

## Inventory Integration

### Real-Time Inventory Checking

When BOM modal opens:
1. Fetches inventory for each part using `fetchInventoryItem(itemId)`
2. Shows loading state while fetching
3. Displays availability with color-coded indicators:
   - **Green**: Available ≥ Required
   - **Yellow**: Low stock (< 2x required or < 5 units)
   - **Red**: Insufficient (Available < Required)

### Inventory Deduction Rules

- **Source = "Flo":**
  - Checks inventory availability before creation
  - Blocks creation if insufficient
  - Deducts quantity after successful creation
  - Shows low stock warnings

- **Source = "GKX" or "Abhirup":**
  - No inventory check
  - No inventory deduction
  - Treated as external procurement

## Visual Design

### BOM Verification Modal
- **Header:** Fleet name and title
- **Info Banner:** Blue background with source selection instructions
- **Parts List:** Scrollable area with grouped parts
- **Part Cards:**
  - Part name and item ID
  - Required quantity
  - Inventory availability (for Flo parts)
  - Source dropdown
  - Color-coded status indicators
- **Footer:**
  - Total parts count
  - Cancel and Confirm buttons
  - Insufficient inventory warning (if applicable)

### Robots Page Badges
- Consistent badge design with other status indicators
- Monospace font for consistency
- Semi-transparent backgrounds
- Color-coded text and backgrounds
- Flexible layout for multiple badges

**Badge Logic:**
```typescript
// Show INCOMPLETE only if explicitly set
if (robot.bomCompletionStatus === 'incomplete') {
  // Red badge: "INCOMPLETE"
} else {
  // Green badge: "COMPLETE"
  // Covers: undefined (old robots), null, or 'complete'
}
```

## Error Handling

### Insufficient Inventory
- Shows detailed error in modal
- Lists all insufficient parts with shortfall
- Suggests changing source to proceed
- Disables confirm button

### Network Errors
- Inventory fetch failures show error message
- Part marked with error state
- Graceful degradation

### API Errors
- Toast notifications for user-friendly errors
- Detailed error logging for debugging
- Modal closes on error
- Form remains filled for retry

## Future Enhancements

### Possible Improvements
1. **Bulk Source Selection:** Allow setting all parts to same source
2. **Inventory History:** Show recent inventory transactions
3. **Auto-Suggestions:** Recommend source based on inventory levels
4. **Part Substitutions:** Allow alternative parts selection
5. **BOM Templates:** Save common BOM configurations
6. **Notification System:** Alert when robots have incomplete BOM
7. **BOM Update:** Allow updating BOM after robot creation
8. **Inventory Reservation:** Reserve inventory during modal interaction

## Testing Checklist

- [ ] Robot creation with fleet that has parts
- [ ] Robot creation with fleet without parts
- [ ] BOM modal displays all parts correctly
- [ ] Inventory fetching works for all parts
- [ ] Source selection updates correctly
- [ ] Insufficient inventory blocks creation
- [ ] Changing source from Flo to GKX/Abhirup allows creation
- [ ] Successful creation shows credentials
- [ ] Low stock warnings display correctly
- [ ] BOM status badges appear on Robots page
- [ ] Multiple badges wrap properly on small screens
- [ ] Error handling for network failures
- [ ] Error handling for API failures

## Dependencies

### New Dependencies
None - uses existing packages

### Key Libraries Used
- React Query - API calls and caching
- Axios - HTTP requests
- React Toastify - Toast notifications
- Lucide React - Icons
- Tailwind CSS - Styling

## Configuration

No additional configuration required. The feature works with:
- Existing authentication system
- Existing API base URL configuration
- Existing fleet and inventory systems

## Deployment Notes

1. Ensure backend BOM verification endpoint is deployed
2. Verify fleet data includes `partsConsumption` field
3. Confirm inventory API is accessible
4. Test with production fleet and inventory data
5. Monitor for any CORS or authentication issues

## Support and Maintenance

### Common Issues

**BOM Modal Not Showing:**
- Check if fleet has `partsConsumption` data
- Verify fleet API returns full details
- Check console for fetch errors

**Inventory Not Loading:**
- Verify inventory API is accessible
- Check itemId matches inventory records (case-sensitive)
- Review network tab for failed requests

**Creation Fails:**
- Verify all required robot fields are filled
- Check for validation errors in console
- Ensure user has proper permissions

### Monitoring

Monitor these metrics:
- BOM verification modal open rate
- Completion rate (confirmed vs cancelled)
- Insufficient inventory frequency
- Low stock warning frequency
- Source selection patterns (Flo vs GKX vs Abhirup)

---

**Implementation Date:** February 25, 2026
**Version:** 1.0.0
**Author:** Claude Code
**Status:** ✅ Complete
