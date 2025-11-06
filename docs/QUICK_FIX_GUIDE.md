# Quick Fix Guide - Concurrency Issue

## The Issue
After a conflict (409 error), admins can't update seats because they have an outdated version number.

## The Fix (3 Steps)

### Step 1: Import ConflictError
In any component that updates seats or rooms, add this import:

```typescript
import { api, ConflictError } from '../services/apiService';
```

### Step 2: Update Error Handling
Find code that looks like this:

```typescript
// OLD CODE
try {
  const updatedSeat = await api.updateSeatStatus(seatId, newStatus, seat.version);
  dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: updatedSeat });
  toast.success('Seat updated');
} catch (error) {
  toast.error('Failed to update seat');
}
```

Replace with:

```typescript
// NEW CODE
try {
  const updatedSeat = await api.updateSeatStatus(seatId, newStatus, seat.version);
  dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: updatedSeat });
  toast.success('Seat updated');
} catch (error) {
  if (error instanceof ConflictError && error.currentData) {
    // Update state with current data from 409 response
    dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: error.currentData });
    toast.warning('Seat was just modified by another admin. Your view has been updated. Please try again.');
  } else {
    toast.error('Failed to update seat');
  }
}
```

### Step 3: Test
1. Open two browser tabs as different admins
2. Both try to update the same seat
3. One gets a warning notification
4. Try updating again - it should work!

## Files to Update

Search for these function calls and add the error handling:
- `api.updateSeatStatus`
- `api.updateSeatFeatures`
- `api.updateRoom`

Common locations:
- `frontend/pages/SeatMapPage.tsx`
- `frontend/pages/RoomsPage.tsx`
- Any component with seat/room update buttons

## That's It!

The backend is already fixed. This frontend change ensures the version number stays in sync after conflicts.

## Need Help?

See detailed guides:
- `frontend/IMPLEMENTATION_GUIDE.md` - Step-by-step instructions
- `frontend/CONCURRENCY_FIX_EXAMPLE.md` - Complete code examples
- `CONCURRENCY_SOLUTION_SUMMARY.md` - Full solution overview
