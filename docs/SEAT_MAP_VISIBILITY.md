# Seat Map Visibility Implementation

## Overview

Implemented role-based access control for seat map visibility to ensure proper data privacy and user experience.

## Requirements Implemented

### 1. Admin/Super Admin Access

- ✅ Can view all seats in any room
- ✅ Can see student names allocated to seats
- ✅ Can update seat status (Available/Allocated/Broken)
- ✅ Full seat management capabilities

### 2. Teacher Access

- ✅ Can view all seats in any room
- ✅ Can see student names allocated to seats
- ✅ **Cannot** update seat status (read-only access)
- ✅ Useful for monitoring room occupancy during bookings

### 3. Student Access

- ✅ Can **only** see their own seat if they have one booked in that room
- ✅ Cannot see other students' seats or names
- ✅ If no seat is booked in the room, they see an empty seat map
- ✅ Their own seat is highlighted with a special visual indicator

## Technical Implementation

### Backend Changes

#### File: `backend/src/routes/rooms.ts`

Modified the `GET /api/rooms/:id/seats` endpoint to implement role-based filtering:

```typescript
// Admin, SuperAdmin, and Teacher: See all seats
if (userRole === "Admin" || userRole === "SuperAdmin" || userRole === "Teacher") {
  return all seats with student information
}

// Student: See only their own seat
if (userRole === "Student") {
  1. Find student record associated with user
  2. Check if student has a seat in this room
  3. Return only their seat if found, empty array otherwise
}
```

### Frontend Changes

#### File: `frontend/services/authService.ts`

Added helper methods for role checking:

- `isTeacher()`: Check if user is a teacher
- `isStudent()`: Check if user is a student

#### File: `frontend/pages/SeatMapPage.tsx`

1. **Role-based UI rendering**:

   - `canEditSeats`: Only admins can edit seat status
   - Teachers can view but not edit
   - Students see limited view

2. **Visual indicators**:

   - Student's own seat is highlighted with a special gradient and ring effect
   - Helpful messages for students:
     - "You don't have a seat booked in this room" (if no seat)
     - "✓ Your seat: [label]" (if seat exists)

3. **Tooltip behavior**:
   - Admins and teachers see student names in tooltips
   - Students see generic "Allocated" text

## Security Considerations

1. **Backend enforcement**: Access control is enforced at the API level, not just UI
2. **Token-based authentication**: All requests require valid JWT tokens
3. **Role validation**: User role is verified from JWT payload
4. **Data filtering**: Students receive only their own seat data from the server

## Testing

Created comprehensive test suite in `backend/src/tests/seatMapVisibility.test.ts`:

- Admin can see all seats ✓
- Teacher can see all seats ✓
- Student with seat sees only their seat ✓
- Student without seat sees empty array ✓
- Unauthenticated requests are rejected ✓

## User Experience

### Admin/Super Admin View

- Full seat map with all seats visible
- Click any seat to manage status
- See student names in tooltips and modal
- Update seat status with optimistic locking

### Teacher View

- Full seat map with all seats visible (read-only)
- See student names in tooltips
- Cannot click or edit seats
- Useful for monitoring during class sessions

### Student View

- See only their own seat (if booked)
- Their seat is highlighted with special styling
- Clear message if no seat is booked
- Privacy-focused: cannot see other students

## API Endpoints

### GET /api/rooms/:id/seats

**Authentication**: Required (JWT token)

**Response based on role**:

- **Admin/SuperAdmin/Teacher**: Array of all seats in the room
- **Student**: Array with single seat (their own) or empty array
- **Unauthenticated**: 401 Unauthorized

**Example Response (Student with seat)**:

```json
[
  {
    "id": "seat123",
    "roomId": "room456",
    "label": "A2",
    "row": 0,
    "col": 1,
    "status": "Allocated",
    "studentId": "student789",
    "features": ["front_seat"],
    "version": 1,
    "student": {
      "id": "student789",
      "name": "John Doe",
      "email": "john@example.com",
      "branch": "ConsultingClub"
    }
  }
]
```

## Future Enhancements

1. **Real-time updates**: Socket.io events for seat changes visible to all roles
2. **Seat history**: Track who sat where and when
3. **Teacher seat assignment**: Allow teachers to assign seats during their booking
4. **Student preferences**: Let students request specific seat features
