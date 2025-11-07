# Implementation Plan

- [x] 1. Update database schema and create migrations

  - [x] 1.1 Add Teacher model to Prisma schema

    - Add Teacher model with fields: id, name, email, userId, bookings, timestamps
    - Add Teacher role to UserRole enum
    - Create relation between User and Teacher models
    - _Requirements: 1.1, 1.3, 1.5_

  - [x] 1.2 Add location hierarchy models (Block, Floor)

    - Add Block model with fields: id, name, code, distance, buildings, timestamps
    - Add Floor model with fields: id, buildingId, name, number, distance, rooms, timestamps
    - Update Building model to include blockId and distance fields
    - Update Room model to include floorId and distance fields
    - _Requirements: 6.1, 6.2, 6.3, 8.1, 8.2, 8.3, 8.4_

  - [x] 1.3 Add RoomBooking model

    - Add RoomBooking model with fields: id, roomId, teacherId, branch, capacity, startTime, endTime, status, timestamps
    - Add BookingStatus enum (NotStarted, Ongoing, Completed)
    - Create indexes for efficient queries (roomId+time, teacherId, status, endTime)
    - _Requirements: 4.2, 4.3, 5.1, 5.2, 5.3_

  - [x] 1.4 Generate and run Prisma migrations

    - Generate migration files for all schema changes
    - Create data migration script to add default Block and Floor for existing Buildings and Rooms
    - Run migrations on development database
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 2. Implement backend API for teacher management

  - [x] 2.1 Create teacher routes and controllers

    - Implement POST /api/teachers endpoint for creating teacher profiles (admin only)
    - Implement GET /api/teachers endpoint for listing all teachers (admin only)
    - Implement GET /api/teachers/:id endpoint for fetching teacher details (admin only)
    - Implement PUT /api/teachers/:id endpoint for updating teacher email/password (admin only)
    - Implement DELETE /api/teachers/:id endpoint for deleting teachers (admin only)
    - Add validation middleware for all endpoints
    - _Requirements: 1.5, 9.3, 9.4, 9.5, 11.2_

  - [x] 2.2 Update auth routes to support Teacher role

    - Update login endpoint to support Teacher role authentication
    - Remove or disable signup endpoint (return 403 error)
    - Update JWT token generation to include Teacher role
    - _Requirements: 1.1, 1.4, 12.1, 12.2, 12.3_

  - [x] 2.3 Add authorization middleware for teacher operations

    - Create requireTeacher middleware to verify teacher role
    - Update requireAdmin middleware to prevent admin creation through API
    - Add permission checks for teacher-specific operations
    - _Requirements: 1.5, 11.1, 11.2, 11.4_

- [x] 3. Implement location hierarchy management API

  - [x] 3.1 Create Block management endpoints

    - Implement POST /api/locations/blocks (admin only)
    - Implement GET /api/locations/blocks (admin only)
    - Implement PUT /api/locations/blocks/:id (admin only)
    - Implement DELETE /api/locations/blocks/:id (admin only)
    - Add validation for block data (name, code, distance)
    - _Requirements: 8.1, 8.5_

  - [x] 3.2 Update Building management endpoints

    - Update POST /api/locations/buildings to require blockId
    - Update building endpoints to include distance parameter
    - Add validation for blockId reference
    - _Requirements: 8.2, 8.5_

  - [x] 3.3 Create Floor management endpoints

    - Implement POST /api/locations/floors (admin only)
    - Implement GET /api/locations/floors with buildingId filter (admin only)
    - Implement PUT /api/locations/floors/:id (admin only)
    - Implement DELETE /api/locations/floors/:id (admin only)
    - Add validation for floor data (name, number, buildingId, distance)
    - _Requirements: 8.3, 8.5_

  - [x] 3.4 Update Room management endpoints

    - Update POST /api/rooms to require floorId
    - Update room endpoints to include distance parameter
    - Add validation for floorId reference
    - _Requirements: 8.4, 8.5_

- [x] 4. Implement room booking search and recommendation system

  - [x] 4.1 Create room search service with distance calculation

    - Implement calculateDistance function for location hierarchy
    - Implement hasOverlappingBooking function for availability checking
    - Implement calculateRoomScore function with capacity, availability, and location scoring
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 4.2 Create room booking search endpoint

    - Implement POST /api/room-bookings/search endpoint
    - Accept search criteria: capacity, branch, startTime, endTime, preferredLocation
    - Return sorted list of room recommendations with distance and score
    - Add input validation for search criteria
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.5_

  - [x] 4.3 Add caching for room search results

    - Implement search result caching with 5-minute TTL
    - Add cache invalidation on booking creation/deletion
    - _Requirements: 2.3_

- [x] 5. Implement room booking creation and management

  - [x] 5.1 Create room booking endpoints

    - Implement POST /api/room-bookings for creating bookings (teacher only)
    - Implement GET /api/room-bookings for listing bookings (filtered by teacherId or roomId)
    - Implement DELETE /api/room-bookings/:id for canceling bookings (teacher only, own bookings)
    - Add validation to prevent overlapping bookings
    - Add validation to prevent past bookings
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 5.2 Implement booking expiration service

    - Create BookingExpirationService class
    - Implement updateBookingStatuses method to transition NotStarted → Ongoing → Completed
    - Set up scheduled job to run every 5 minutes
    - Emit real-time events for booking status changes
    - _Requirements: 4.5, 5.3, 5.4_

  - [x] 5.3 Add real-time booking updates

    - Emit Socket.io events for booking creation, status changes, and expiration
    - Update frontend to listen for booking events
    - _Requirements: 5.4_

- [x] 6. Update student management to restrict name editing

  - [x] 6.1 Modify student update endpoint

    - Update PUT /api/students/:id to reject name field changes
    - Return 400 error with appropriate message when name change attempted
    - Allow updates to email, password, branch, tags, and accessibilityNeeds
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 7. Create frontend types and constants

  - [x] 7.1 Update TypeScript types

    - Add Teacher interface
    - Add RoomBooking interface
    - Add BookingStatus enum
    - Add Block, Floor interfaces
    - Update Room and Building interfaces with new fields
    - Add SearchCriteria and RoomRecommendation interfaces
    - _Requirements: 1.1, 4.1, 5.1, 6.1_

  - [x] 7.2 Update API service methods

    - Add teacher management API methods (getTeachers, createTeacher, updateTeacher, deleteTeacher)
    - Add location management API methods (blocks, floors)
    - Add room booking API methods (searchRooms, createBooking, getBookings, cancelBooking)
    - Update building and room API methods for new fields
    - _Requirements: 2.1, 4.1, 8.1_

- [x] 8. Create teacher dashboard and room search interface

  - [x] 8.1 Create TeacherDashboardPage component

    - Create page layout with room search form and results sections
    - Add navigation for teachers to access dashboard
    - _Requirements: 2.1_

  - [x] 8.2 Create RoomSearchForm component

    - Add input fields for capacity, branch, start time, end time
    - Add LocationHierarchySelector for preferred location (block, building, floor)
    - Add form validation (required fields, time validation, capacity limits)
    - Implement search button with loading state
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 8.3 Create RoomRecommendationCard component

    - Display room details (name, capacity, location hierarchy)
    - Show distance and suitability score
    - Add "Claim Room" button
    - Show booking confirmation modal
    - _Requirements: 2.4, 4.1_

  - [x] 8.4 Create MyBookingsSection component

    - Display list of teacher's bookings
    - Show booking status with BookingStatusBadge component
    - Add cancel booking functionality for NotStarted bookings
    - Auto-refresh when booking status changes
    - _Requirements: 4.1, 5.1, 5.2, 5.3_

-

- [ ] 9. Create faculty management page for admins

  - [x] 9.1 Create FacultyManagementPage component

    - Create page layout similar to StudentsPage
    - Display table of teachers with columns: name, email, actions
    - Add "Add Teacher" button
    - _Requirements: 9.1, 9.2_

  - [x] 9.2 Create TeacherForm component

    - Add input fields for name, email, password
    - Add form validation
    - Prevent name editing for existing teachers
    - Allow email and password updates only
    - _Requirements: 9.3, 9.4, 9.5_

  - [x] 9.3 Add teacher CRUD operations

    - Implement create teacher functionality
    - Implement update teacher functionality (email/password only)
    - Implement delete teacher functionality with confirmation
    - Show success/error notifications
    - _Requirements: 9.3, 9.4, 9.5_

- [x] 10. Create location hierarchy management pages

  - [x] 10.1 Create BlocksPage component

    - Display table of blocks with columns: name, code, distance, actions
    - Add create/edit/delete functionality
    - Add form validation
    - _Requirements: 8.1, 8.5_

  - [x] 10.2 Update BuildingsPage component

    - Add block selection dropdown
    - Add distance parameter field
    - Update building creation/editing to include blockId and distance
    - Display block information in building list
    - _Requirements: 8.2, 8.5_

  - [x] 10.3 Create FloorsPage component

    - Display table of floors filtered by building
    - Add columns: name, number, distance, actions
    - Add create/edit/delete functionality
    - Add building selector for filtering
    - _Requirements: 8.3, 8.5_

  - [x] 10.4 Update RoomsPage component

    - Add floor selection dropdown
    - Add distance parameter field
    - Update room creation/editing to include floorId and distance
    - Display floor information in room list
    - Show booking status alongside allocation status
    - _Requirements: 8.4, 8.5_

- [x] 11. Update navigation and layout for new roles

  - [x] 11.1 Update Layout component for teacher navigation

    - Add conditional navigation items based on user role
    - Show "Find Room" link for teachers
    - Show "Faculty" link for admins
    - Show "Locations" link for admins (Blocks, Buildings, Floors)
    - _Requirements: 1.1, 9.1_

  - [x] 11.2 Update breadcrumbs for new pages

    - Add breadcrumb support for teacher dashboard
    - Add breadcrumb support for faculty management
    - Add breadcrumb support for location pages
    - _Requirements: 9.1_

- [x] 12. Remove signup functionality

  - [x] 12.1 Remove SignUpPage component

    - Delete SignUpPage component file
    - Remove signup route from App.tsx
    - _Requirements: 1.4, 12.1, 12.2_

  - [x] 12.2 Update SignInPage component

    - Remove "Sign Up" link from login page
    - Update UI to indicate admin-managed accounts
    - _Requirements: 12.2, 12.3_

  - [x] 12.3 Update authentication service

    - Remove signup method from authService
    - Update API service to remove signup endpoint calls
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 13. Update student management restrictions

  - [x] 13.1 Update StudentsPage component

    - Make name field read-only in edit mode
    - Show informational message that name cannot be changed
    - Allow editing of email, password, branch, tags, accessibilityNeeds
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 13.2 Update StudentForm component

    - Disable name input when editing existing student
    - Add visual indicator that name is not editable
    - Update form submission to exclude name from update payload
    - _Requirements: 10.1, 10.5_

- [x] 14. Create shared UI components

  - [x] 14.1 Create BookingStatusBadge component

    - Display status badge with color coding (NotStarted: blue, Ongoing: green, Completed: gray)
    - Show start and end times
    - Calculate status based on current time
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 14.2 Create LocationHierarchySelector component

    - Create cascading dropdowns for block → building → floor selection
    - Load options dynamically based on parent selection
    - Support optional selection at any level
    - _Requirements: 2.1, 2.2_

  - [x] 14.3 Create TimeRangePicker component

    - Create date/time picker for start and end times
    - Add validation to prevent past dates
    - Add validation to ensure end time is after start time
    - _Requirements: 2.1, 2.2_

- [x] 15. Add real-time updates for booking status

  - [x] 15.1 Update Socket.io event handlers

    - Add listener for 'bookingCreated' event
    - Add listener for 'bookingStatusChanged' event
    - Add listener for 'bookingExpired' event
    - Update UI components when events received
    - _Requirements: 5.4_

  - [x] 15.2 Update context/state management

    - Add booking state to global context
    - Update booking list when real-time events occur
    - Refresh room availability when bookings change
    - _Requirements: 5.4_

- [x] 16. Add error handling and validation

  - [x] 16.1 Implement backend error responses

    - Add consistent error response format
    - Implement specific error messages for booking conflicts
    - Add validation error messages for all endpoints
    - _Requirements: 2.1, 4.2, 9.3_

  - [x] 16.2 Implement frontend error handling

    - Add toast notifications for success/error messages
    - Display inline validation errors in forms
    - Handle network errors gracefully
    - _Requirements: 2.1, 4.1, 9.3_

-

- [x] 17. Integration and end-to-end testing

  - [x] 17.1 Test teacher authentication and authorization

    - Verify teacher can login
    - Verify teacher cannot access admin endpoints
    - Verify admin can manage teachers
    - _Requirements: 1.1, 1.5, 9.3_

  - [x] 17.2 Test room search and booking flow

    - Verify room search returns correct results
    - Verify booking creation prevents overlaps
    - Verify booking status updates automatically
    - Verify expired bookings are cleaned up
    - _Requirements: 2.1, 2.3, 4.2, 4.5, 5.3_

  - [x] 17.3 Test location hierarchy management

    - Verify complete hierarchy can be created
    - Verify distance calculations work correctly
    - Verify cascade deletes work properly
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.5, 8.5_

  - [x] 17.4 Test signup removal and student restrictions

    - Verify signup endpoint returns error
    - Verify signup page is not accessible
    - Verify student name cannot be edited
    - _Requirements: 10.1, 12.1, 12.2, 12.3_
