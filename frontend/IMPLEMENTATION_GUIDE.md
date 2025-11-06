# Frontend Implementation Guide - Fixing Concurrency Issues

## Problem Summary

After a conflict (409 error), admins still have the old version number in their state, causing subsequent updates to fail even when working alone.

## Solution Overview

1. ✅ **Backend already returns current data** in 409 responses
2. ✅ **WebSocket already set up** and listening for updates
3. ⚠️ **Need to update state** when receiving 409 errors
4. ⚠️ **Need to show user-friendly notifications**

## Required Changes

### 1. Update API Service (✅ DONE)

The `apiService.ts` has been updated to throw a `ConflictError` with the current data when a 409 occurs.

### 2. Update Components to Handle Conflicts

#### Example: SeatMapPage.tsx

Find where `updateSeatStatus` is called and wrap it with proper error handling:

```typescript
// BEFORE (causes the issue)
try {
  const updatedSeat = await api.updateSeatStatus(seatId, newStatus, seat.version);
  dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: updatedSeat });
  toast.success('Seat updated successfully');
} catch (error) {
  toast.error('Failed to update seat');
}

// AFTER (fixes the issue)
try {
  const updatedSeat = await api.updateSeatStatus(seatId, newStatus, seat.version);
  dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: updatedSeat });
  toast.success('Seat updated successfully');
} catch (error) {
  if (error instanceof ConflictError && error.currentData) {
    // ✅ Update state with current data from 409 response
    dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: error.currentData });
    
    // Show user-friendly message
    toast.warning(
      'This seat was just modified by another admin. Your view has been updated. Please try again.',
      { duration: 5000 }
    );
  } else {
    toast.error(error instanceof Error ? error.message : 'Failed to update seat');
  }
}
```

### 3. Import ConflictError

At the top of components that update seats/rooms:

```typescript
import { api, ConflictError } from '../services/apiService';
```

### 4. Ensure WebSocket Updates State

The WebSocket listener is already set up correctly:

```typescript
socket.on('seatUpdated', (updatedSeat: Seat) => {
  if (updatedSeat.roomId === roomId) {
    dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: updatedSeat });
  }
});
```

This ensures that when Admin A updates a seat, Admin B's view automatically updates with the new version.

## Step-by-Step Implementation

### Step 1: Find All Seat Update Calls

Search for:
- `api.updateSeatStatus`
- `api.updateSeatFeatures`
- `api.updateRoom`

### Step 2: Wrap Each Call with Conflict Handling

Template:

```typescript
try {
  const result = await api.updateSeatStatus(seatId, newStatus, currentVersion);
  dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: result });
  // Success notification
} catch (error) {
  if (error instanceof ConflictError && error.currentData) {
    dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: error.currentData });
    // Conflict notification - user can retry
  } else {
    // Other error notification
  }
}
```

### Step 3: Always Use Latest Version

When calling update functions, always get the version from current state:

```typescript
// ✅ GOOD - Get latest version from state
const currentSeat = state.seats.find(s => s.id === seatId);
if (currentSeat) {
  await api.updateSeatStatus(seatId, newStatus, currentSeat.version);
}

// ❌ BAD - Using cached version
const [version, setVersion] = useState(seat.version);
await api.updateSeatStatus(seatId, newStatus, version);
```

## Testing the Fix

### Test 1: Concurrent Updates
1. Open two browser tabs as different admins
2. Both try to update the same seat simultaneously
3. **Expected:** One succeeds, one gets warning notification
4. **Expected:** Both views show the same final state
5. **Expected:** Either admin can now update the seat successfully

### Test 2: Sequential Updates After Conflict
1. Create a conflict (as above)
2. Wait for warning notification to appear
3. Click the same button again to update
4. **Expected:** Update succeeds without error

### Test 3: WebSocket Sync
1. Admin A updates a seat
2. **Expected:** Admin B's view updates automatically (no action needed)
3. Admin B updates the same seat
4. **Expected:** Update succeeds

## Quick Fix for Existing Components

If you want a quick fix without modifying many files, you can create a wrapper hook:

```typescript
// hooks/useSeatUpdate.ts
import { useCallback } from 'react';
import { api, ConflictError } from '../services/apiService';
import { useSeatPlanner } from '../context/SeatPlannerContext';
import { toast } from 'react-toastify';

export function useSeatUpdate() {
  const { dispatch } = useSeatPlanner();

  const updateSeatStatus = useCallback(async (
    seatId: string,
    status: SeatStatus,
    version: number
  ) => {
    try {
      const updatedSeat = await api.updateSeatStatus(seatId, status, version);
      dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: updatedSeat });
      toast.success('Seat updated successfully');
      return { success: true, data: updatedSeat };
    } catch (error) {
      if (error instanceof ConflictError && error.currentData) {
        dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: error.currentData });
        toast.warning(
          'This seat was just modified. Your view has been updated. Please try again.',
          { autoClose: 5000 }
        );
        return { success: false, conflict: true, data: error.currentData };
      }
      toast.error(error instanceof Error ? error.message : 'Failed to update seat');
      return { success: false, error };
    }
  }, [dispatch]);

  return { updateSeatStatus };
}
```

Then in components:

```typescript
const { updateSeatStatus } = useSeatUpdate();

// Use it
await updateSeatStatus(seatId, newStatus, seat.version);
```

## Summary

The fix is simple:
1. ✅ Backend returns current data in 409 responses (already done)
2. ✅ WebSocket broadcasts updates (already done)
3. ⚠️ **Frontend must update state when receiving 409** (needs implementation)
4. ⚠️ **Show user-friendly notifications** (needs implementation)

With these changes, the version number will always be in sync, and admins can work sequentially without persistent errors.
