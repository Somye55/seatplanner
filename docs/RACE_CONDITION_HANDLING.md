# Race Condition Handling for Room Bookings

## Overview

This document explains how the system handles race conditions when multiple teachers attempt to book the same room simultaneously using Socket.IO and optimistic locking.

## Problem Statement

When multiple teachers try to book the same room at the same time, without proper handling:

- Both requests might pass the availability check
- Both might attempt to create bookings
- Database could end up with conflicting bookings
- Teachers wouldn't know their booking failed until it's too late

## Solution Architecture

### 1. Room Lock Service (Backend)

**File**: `backend/src/services/roomLockService.ts`

The `RoomLockService` implements an in-memory locking mechanism:

```typescript
// Key features:
- Locks are identified by: roomId + startTime + endTime
- Lock duration: 30 seconds (enough time to complete booking)
- Automatic expiration and cleanup
- Same user can proceed with their lock
```

**How it works:**

1. When a booking request arrives, system tries to acquire a lock
2. If lock exists and hasn't expired, request is rejected
3. If lock acquired, booking proceeds
4. Lock is released after booking completes (success or failure)
5. Expired locks are cleaned up every 60 seconds

### 2. Booking Flow with Race Condition Protection

**File**: `backend/src/routes/roomBookings.ts`

```
Request arrives
    ↓
Try to acquire lock
    ↓
Lock acquired? ──NO──→ Return 409 Conflict + emit Socket.IO event
    ↓ YES
Verify teacher exists
    ↓
Verify room exists & capacity
    ↓
Double-check for overlapping bookings (race protection)
    ↓
Overlapping? ──YES──→ Release lock + Return 409 + emit conflict event
    ↓ NO
Create booking in database
    ↓
Release lock
    ↓
Emit "bookingCreated" Socket.IO event
    ↓
Return success
```

### 3. Real-Time Conflict Notifications (Socket.IO)

**Backend Events Emitted:**

```typescript
// When booking succeeds
io.emit("bookingCreated", booking);

// When conflict detected
io.emit("bookingConflict", {
  roomId,
  startTime,
  endTime,
  userId,
  conflictingBooking: {
    id,
    teacherName,
    startTime,
    endTime,
  },
  message: "Room already booked by Teacher Name",
});
```

### 4. Frontend Real-Time Updates

**File**: `frontend/hooks/useBookingUpdates.ts`

Custom React hook that listens for Socket.IO events:

```typescript
useBookingUpdates({
  onBookingCreated: (event) => {
    // Refresh room availability
  },
  onBookingConflict: (event) => {
    // Show error toast to user
    // Refresh search results
  },
});
```

**Files Using the Hook:**

- `frontend/pages/TeacherDashboardPage.tsx` - Main search page
- `frontend/components/teacher/MyBookingsSection.tsx` - Bookings list
- `frontend/components/teacher/RoomRecommendationCard.tsx` - Individual room cards

## Error Handling

### Backend Error Codes

```typescript
BOOKING_CONFLICT: "Another teacher is currently booking this room";
ROOM_NOT_AVAILABLE: "Room is not available for the selected time period";
```

### Frontend Error Display

1. **Toast Notifications**: Immediate feedback when conflict occurs
2. **Modal Error Messages**: Detailed error in booking confirmation modal
3. **Automatic Refresh**: Search results refresh to show updated availability

## Testing

**File**: `backend/src/tests/roomBookingRaceCondition.test.ts`

Test scenarios covered:

1. ✅ Concurrent booking attempts (one succeeds, one fails)
2. ✅ Proper error messages for conflicts
3. ✅ Different time slots can be booked by different teachers
4. ✅ Overlapping bookings are detected
5. ✅ Lock release after success/failure

## User Experience Flow

### Scenario: Two Teachers Book Same Room

**Teacher A's Experience:**

1. Searches for rooms
2. Clicks "Claim Room" on Room 101
3. Confirms booking
4. ✅ Success! "Room booked successfully"

**Teacher B's Experience (1 second later):**

1. Searches for rooms (sees Room 101 available)
2. Clicks "Claim Room" on Room 101
3. Confirms booking
4. ❌ Error toast: "Room already booked by Teacher A"
5. Modal shows: "This room is already booked by Teacher A for the selected time slot"
6. Search results automatically refresh
7. Room 101 no longer appears in results

## Performance Considerations

### Lock Cleanup

- Runs every 60 seconds
- Removes expired locks (older than 30 seconds)
- Minimal memory footprint

### Socket.IO Events

- Only emitted for actual conflicts
- Targeted to specific users when possible
- Lightweight payloads

### Database Queries

- Double-check query prevents race conditions
- Indexed on roomId, startTime, endTime, status
- Minimal performance impact

## Configuration

### Lock Duration

```typescript
// backend/src/services/roomLockService.ts
private readonly LOCK_DURATION_MS = 30000; // 30 seconds
```

### Cleanup Interval

```typescript
// backend/src/index.ts
const lockCleanupInterval = setInterval(() => {
  roomLockService.cleanupExpiredLocks();
}, 60000); // 60 seconds
```

## Monitoring & Debugging

### Backend Logs

```typescript
console.log(`Cleaned up ${cleaned} expired room locks`);
```

### Active Locks Inspection

```typescript
// For debugging
const activeLocks = roomLockService.getActiveLocks();
```

## Future Enhancements

1. **Redis-based Locking**: For multi-server deployments
2. **Lock Queue**: Allow teachers to queue for popular rooms
3. **Booking Notifications**: Email/SMS when room becomes available
4. **Analytics**: Track conflict frequency to identify high-demand rooms

## Related Files

### Backend

- `backend/src/services/roomLockService.ts` - Lock management
- `backend/src/routes/roomBookings.ts` - Booking endpoints
- `backend/src/utils/errorHandler.ts` - Error codes
- `backend/src/index.ts` - Socket.IO setup

### Frontend

- `frontend/hooks/useBookingUpdates.ts` - Real-time updates hook
- `frontend/pages/TeacherDashboardPage.tsx` - Search page
- `frontend/components/teacher/RoomRecommendationCard.tsx` - Booking UI
- `frontend/components/teacher/MyBookingsSection.tsx` - Bookings list

### Tests

- `backend/src/tests/roomBookingRaceCondition.test.ts` - Race condition tests

## Summary

The race condition handling system provides:

- ✅ **Reliable**: Prevents double bookings through locking
- ✅ **Fast**: In-memory locks with minimal overhead
- ✅ **User-Friendly**: Real-time feedback via Socket.IO
- ✅ **Tested**: Comprehensive test coverage
- ✅ **Scalable**: Clean architecture for future enhancements
