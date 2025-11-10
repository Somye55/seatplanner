# Teacher Room Booking Guide

## What Happens When Multiple Teachers Book the Same Room?

### The System Protects You

When you and another teacher try to book the same room at the same time, our system ensures only one booking succeeds. Here's what you'll experience:

## Booking Scenarios

### ✅ Scenario 1: You Book First

1. You search for available rooms
2. You click "Claim Room" on your preferred room
3. You confirm the booking
4. **Success!** You see: "Room booked successfully"
5. The room is now reserved for you

### ❌ Scenario 2: Another Teacher Books First

1. You search for available rooms
2. You click "Claim Room" on a room
3. Another teacher confirms their booking 1 second before you
4. You click "Confirm Booking"
5. **You see an error message:**
   - "Room already booked by [Teacher Name]"
   - The booking modal shows the conflict details
6. **What happens next:**
   - Your search results automatically refresh
   - The booked room disappears from your results
   - You can choose another available room

### ⚠️ Scenario 3: Someone is Currently Booking

1. You try to book a room
2. Another teacher is in the middle of confirming their booking
3. **You see:**
   - "Another teacher is currently booking this room. Please try again."
4. **What to do:**
   - Wait a few seconds
   - Try booking again
   - Or choose a different room

## Real-Time Updates

### Your Dashboard Stays Current

- When any teacher books a room, your search results update automatically
- You always see the most current availability
- No need to manually refresh the page

### Notifications You'll See

- ✅ **Success Toast**: "Room booked successfully"
- ❌ **Conflict Toast**: "Room already booked by [Teacher Name]"
- ⚠️ **Busy Toast**: "Another teacher is currently booking this room"

## Tips for Successful Booking

### 1. Book Early

- Popular rooms fill up quickly
- Book as soon as you know your schedule

### 2. Have Backup Options

- Search results show multiple room recommendations
- Keep 2-3 backup rooms in mind

### 3. Act Quickly

- Once you find a suitable room, book it promptly
- The system holds your selection for 30 seconds while you confirm

### 4. Check Your Bookings

- View "My Bookings" section to confirm your reservations
- You can cancel bookings before they start

## Understanding Error Messages

| Error Message                                        | What It Means                                                 | What To Do                              |
| ---------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------- |
| "Room already booked by [Name]"                      | Another teacher confirmed their booking first                 | Choose a different room or time slot    |
| "Another teacher is currently booking this room"     | Someone is in the process of booking (within last 30 seconds) | Wait a moment and try again             |
| "Room is not available for the selected time period" | The room has a conflicting booking                            | Adjust your time or choose another room |
| "Room capacity is less than requested"               | Room is too small for your class size                         | Choose a larger room                    |

## Frequently Asked Questions

### Q: How long do I have to confirm a booking?

**A:** You have 30 seconds from when you click "Claim Room" to confirm. After that, the room becomes available to others again.

### Q: Can I book the same room multiple times?

**A:** Yes! You can book the same room for different time slots.

### Q: What if I need to cancel?

**A:** Go to "My Bookings" and click "Cancel" on any booking that hasn't started yet.

### Q: Will I know if someone books a room I'm looking at?

**A:** Yes! Your search results automatically update in real-time. If someone books a room while you're viewing results, it will disappear from your list.

### Q: Can two teachers book the same room for different times?

**A:** Absolutely! Multiple teachers can book the same room as long as the time slots don't overlap.

### Q: What happens if my booking time arrives?

**A:** Your booking status automatically changes to "Ongoing" when the start time arrives, and "Completed" when the end time passes.

## Need Help?

If you encounter any issues:

1. Try refreshing your search results
2. Check "My Bookings" to verify your reservations
3. Contact your administrator if problems persist

## Technical Details (For Curious Teachers)

The system uses:

- **Socket.IO**: For real-time updates across all users
- **Room Locking**: Prevents double bookings during the confirmation process
- **Automatic Refresh**: Keeps your view up-to-date without manual refreshing
- **Conflict Detection**: Checks for overlapping bookings at multiple stages

This ensures a fair, reliable booking experience for all teachers!
