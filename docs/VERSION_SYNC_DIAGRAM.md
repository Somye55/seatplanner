# Version Synchronization - Visual Explanation

## The Problem (Before Fix)

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND STATE                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Global State (Context)          Local State (Component)    │
│  ┌──────────────────┐            ┌──────────────────┐      │
│  │  state.seats     │            │  selectedSeat    │      │
│  │  ┌────────────┐  │            │  ┌────────────┐  │      │
│  │  │ Seat A     │  │            │  │ Seat A     │  │      │
│  │  │ version: 2 │  │            │  │ version: 1 │  │ ❌   │
│  │  └────────────┘  │            │  └────────────┘  │      │
│  └──────────────────┘            └──────────────────┘      │
│         ↑                                ↑                  │
│         │                                │                  │
│         │ Updated ✅                     │ NOT Updated ❌   │
│         │                                │                  │
└─────────┼────────────────────────────────┼──────────────────┘
          │                                │
          │                                │
    ┌─────┴────────┐                 ┌─────┴────────┐
    │  WebSocket   │                 │  User clicks │
    │  or 409      │                 │  update with │
    │  Response    │                 │  version: 1  │ ❌
    └──────────────┘                 └──────────────┘
                                            │
                                            ↓
                                     Backend rejects
                                     (version mismatch)
```

## The Solution (After Fix)

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND STATE                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Global State (Context)          Local State (Component)    │
│  ┌──────────────────┐            ┌──────────────────┐      │
│  │  state.seats     │            │  selectedSeat    │      │
│  │  ┌────────────┐  │            │  ┌────────────┐  │      │
│  │  │ Seat A     │  │            │  │ Seat A     │  │      │
│  │  │ version: 2 │  │            │  │ version: 2 │  │ ✅   │
│  │  └────────────┘  │            │  └────────────┘  │      │
│  └──────────────────┘            └──────────────────┘      │
│         ↑                                ↑                  │
│         │                                │                  │
│         │ Updated ✅                     │ Updated ✅       │
│         │                                │                  │
│         └────────────┬───────────────────┘                  │
│                      │                                      │
└──────────────────────┼──────────────────────────────────────┘
                       │
                       │ BOTH updated simultaneously
                       │
                 ┌─────┴────────┐
                 │  WebSocket   │
                 │  or 409      │
                 │  Response    │
                 └──────────────┘
                       │
                       ↓
                 User clicks update
                 with version: 2 ✅
                       │
                       ↓
                 Backend accepts!
```

## Update Flow Diagram

### Scenario: Concurrent Update with Conflict

```
Time →

Admin A                     Admin B                     Backend
  │                           │                           │
  │ Opens modal               │ Opens modal               │
  │ (Seat v1)                 │ (Seat v1)                 │
  │                           │                           │
  │ Clicks "Update"           │                           │
  ├──────────────────────────────────────────────────────>│
  │                           │                           │ Update succeeds
  │                           │                           │ Version: 1 → 2
  │<──────────────────────────────────────────────────────┤
  │ Success!                  │                           │
  │ selectedSeat.version = 2  │                           │
  │                           │                           │
  │                           │ Clicks "Update"           │
  │                           ├──────────────────────────>│
  │                           │                           │ Version mismatch!
  │                           │                           │ (sent v1, current v2)
  │                           │<──────────────────────────┤
  │                           │ 409 Conflict              │
  │                           │ + currentSeat (v2)        │
  │                           │                           │
  │                           │ ✅ Updates:               │
  │                           │   - state.seats           │
  │                           │   - selectedSeat          │
  │                           │                           │
  │                           │ Shows: "Seat was just     │
  │                           │ modified. Try again."     │
  │                           │                           │
  │                           │ Clicks "Update" again     │
  │                           ├──────────────────────────>│
  │                           │ (now with v2)             │ Version matches!
  │                           │<──────────────────────────┤
  │                           │ Success!                  │
```

## Code Flow

### Before (Broken)

```typescript
// 1. User clicks update
handleUpdateStatus(newStatus) {
  // selectedSeat.version = 1 (old)
  await api.updateSeatStatus(seatId, newStatus, selectedSeat.version);
}

// 2. Gets 409 error
catch (err) {
  if (err instanceof ConflictError) {
    dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: err.currentData });
    // ❌ selectedSeat still has version 1
  }
}

// 3. User clicks update again
handleUpdateStatus(newStatus) {
  // ❌ selectedSeat.version STILL = 1 (old)
  await api.updateSeatStatus(seatId, newStatus, selectedSeat.version);
  // Gets 409 again... infinite loop!
}
```

### After (Fixed)

```typescript
// 1. User clicks update
handleUpdateStatus(newStatus) {
  // selectedSeat.version = 1 (old)
  await api.updateSeatStatus(seatId, newStatus, selectedSeat.version);
}

// 2. Gets 409 error
catch (err) {
  if (err instanceof ConflictError) {
    dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: err.currentData });
    setSelectedSeat(err.currentData); // ✅ Update selectedSeat too!
  }
}

// 3. User clicks update again
handleUpdateStatus(newStatus) {
  // ✅ selectedSeat.version NOW = 2 (current)
  await api.updateSeatStatus(seatId, newStatus, selectedSeat.version);
  // Success!
}
```

## WebSocket Synchronization

```
Admin A (has modal open)              Admin B
  │                                      │
  │ Modal showing Seat X (v1)            │
  │                                      │
  │                                      │ Updates Seat X
  │                                      │ v1 → v2
  │                                      │
  │<─────────────────────────────────────┤ WebSocket broadcast
  │ 'seatUpdated' event                  │
  │                                      │
  │ ✅ Updates:                          │
  │   - state.seats (v2)                 │
  │   - selectedSeat (v2)                │
  │                                      │
  │ Clicks "Update"                      │
  │ Sends version: 2 ✅                  │
  │ Success!                             │
```

## Summary

The fix ensures that **both states** (global and local) are updated whenever:

1. ✅ A 409 Conflict occurs → Update both states
2. ✅ A WebSocket event arrives → Update both states
3. ✅ A successful update completes → WebSocket updates both states

This keeps `selectedSeat.version` always in sync with the actual database version, preventing persistent 409 errors.
