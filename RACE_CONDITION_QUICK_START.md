# Race Condition Handling - Quick Start Guide

## 🚀 Quick Start

### Prerequisites

- Node.js installed
- Backend and frontend dependencies installed
- Database running

### 1. Start the Backend

```bash
cd backend
npm run dev
```

The backend will:

- Start Socket.IO server
- Initialize room lock service
- Start lock cleanup job (every 60s)

### 2. Start the Frontend

```bash
cd frontend
npm run dev
```

### 3. Test the Implementation

#### Option A: Manual Testing (Recommended)

1. **Open Two Browser Windows**

   - Window 1: http://localhost:3000
   - Window 2: http://localhost:3000 (incognito/private mode)

2. **Login as Two Different Teachers**

   - Window 1: Login as Teacher A
   - Window 2: Login as Teacher B

3. **Search for the Same Room**

   - Both windows: Search for available rooms
   - Both windows: Find the same room (e.g., "Room 101")

4. **Try to Book Simultaneously**

   - Window 1: Click "Claim Room" → "Confirm Booking"
   - Window 2: Click "Claim Room" → "Confirm Booking" (within 1-2 seconds)

5. **Observe the Results**
   - ✅ One window: "Room booked successfully"
   - ❌ Other window: "Room already booked by [Teacher Name]"
   - Both windows: Search results auto-refresh

#### Option B: Automated Testing

```bash
cd backend
npm test -- roomBookingRaceCondition.test.ts
```

Expected output:

```
✓ should handle race condition when two teachers try to book the same room simultaneously
✓ should allow booking after lock expires (30 seconds)
✓ should return proper error message when room is being booked by another teacher
✓ should allow different teachers to book different time slots for the same room
✓ should detect overlapping bookings even with partial overlap
✓ should release lock after successful booking
✓ should release lock after failed booking
```

## 📊 What to Look For

### Success Indicators

1. **Backend Console**

   ```
   A user connected: [socket-id]
   Cleaned up 0 expired room locks
   ```

2. **Browser Console (DevTools)**

   ```
   🌐 API Request: POST /api/room-bookings
   Socket.IO connected
   ```

3. **Network Tab**
   - WebSocket connection established
   - Socket.IO events flowing

### Error Scenarios to Test

#### Scenario 1: Simultaneous Booking

- **Expected**: One succeeds, one fails with conflict error
- **Error Message**: "Room already booked by [Teacher Name]"

#### Scenario 2: Lock Conflict

- **Expected**: Second request immediately rejected
- **Error Message**: "Another teacher is currently booking this room"

#### Scenario 3: Overlapping Times

- **Expected**: Second booking rejected
- **Error Message**: "Room is not available for the selected time period"

## 🔍 Debugging

### Check Socket.IO Connection

**Frontend (Browser Console):**

```javascript
// Check if Socket.IO is connected
window.io; // Should show Socket.IO client

// Listen for events
socket.on("bookingConflict", (data) => {
  console.log("Conflict:", data);
});
```

**Backend (Server Console):**

```
A user connected: [socket-id]
User disconnected: [socket-id]
```

### Check Active Locks

Add this to your backend route for debugging:

```typescript
import { roomLockService } from "../services/roomLockService";

// In any route
console.log("Active locks:", roomLockService.getActiveLocks());
```

### Check Database

```sql
-- Check bookings
SELECT * FROM RoomBooking WHERE roomId = 'your-room-id';

-- Check for overlaps
SELECT * FROM RoomBooking
WHERE roomId = 'your-room-id'
AND status IN ('NotStarted', 'Ongoing')
AND startTime < '2024-01-01T12:00:00Z'
AND endTime > '2024-01-01T10:00:00Z';
```

## 🎯 Key Features to Verify

### 1. Lock Acquisition

- [ ] First teacher acquires lock
- [ ] Second teacher gets lock denied
- [ ] Lock expires after 30 seconds

### 2. Conflict Detection

- [ ] Overlapping bookings detected
- [ ] Proper error messages shown
- [ ] Socket.IO events emitted

### 3. Real-Time Updates

- [ ] Search results auto-refresh
- [ ] Toast notifications appear
- [ ] UI updates without manual refresh

### 4. Error Handling

- [ ] Clear error messages
- [ ] Teacher name in conflict message
- [ ] Actionable guidance provided

## 📱 User Flow Testing

### Happy Path (Success)

1. Search for rooms ✅
2. Find suitable room ✅
3. Click "Claim Room" ✅
4. Review details ✅
5. Click "Confirm Booking" ✅
6. See success message ✅
7. Room appears in "My Bookings" ✅

### Conflict Path (Failure)

1. Search for rooms ✅
2. Find suitable room ✅
3. Click "Claim Room" ✅
4. Another teacher books first ⚠️
5. Click "Confirm Booking" ✅
6. See error message ❌
7. Search results refresh ✅
8. Room no longer available ✅
9. Choose different room ✅

## 🐛 Common Issues

### Issue: "Socket.IO not connected"

**Solution:**

```bash
# Check backend is running
curl http://localhost:3001/api

# Check Socket.IO endpoint
curl http://localhost:3001/socket.io/
```

### Issue: "Locks not cleaning up"

**Solution:**

- Check backend console for cleanup logs
- Verify cleanup interval is running
- Restart backend if needed

### Issue: "Both bookings succeed"

**Solution:**

- Verify lock service is imported correctly
- Check database for duplicate bookings
- Review booking route implementation

### Issue: "No error messages shown"

**Solution:**

- Check browser console for errors
- Verify toast utility is working
- Check Socket.IO event listeners

## 📚 Documentation

- **Technical Guide**: `docs/RACE_CONDITION_HANDLING.md`
- **Flow Diagrams**: `docs/RACE_CONDITION_FLOW_DIAGRAM.md`
- **User Guide**: `docs/TEACHER_BOOKING_GUIDE.md`
- **Implementation Summary**: `docs/IMPLEMENTATION_SUMMARY_RACE_CONDITION.md`

## ✅ Verification Checklist

Before considering the implementation complete:

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Socket.IO connection established
- [ ] Lock service initialized
- [ ] Cleanup job running
- [ ] Manual test: Simultaneous booking (one succeeds, one fails)
- [ ] Manual test: Error messages display correctly
- [ ] Manual test: Real-time updates work
- [ ] Automated tests: All passing
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Documentation complete

## 🎉 Success!

If all checks pass, your race condition handling is working correctly!

Teachers can now safely book rooms without worrying about conflicts, and the system will provide clear feedback when rooms are unavailable.

## 💡 Next Steps

1. **Monitor in Production**

   - Track conflict frequency
   - Monitor lock cleanup
   - Review error logs

2. **Optimize if Needed**

   - Adjust lock duration
   - Tune cleanup interval
   - Add analytics

3. **Scale if Required**
   - Consider Redis for multi-server
   - Implement distributed locks
   - Add load balancing

## 🆘 Need Help?

- Check documentation in `docs/` folder
- Review test file for examples
- Check backend console logs
- Inspect browser DevTools
- Review Socket.IO connection status
