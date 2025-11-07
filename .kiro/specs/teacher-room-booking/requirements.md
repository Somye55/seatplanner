# Requirements Document

## Introduction

This document specifies requirements for a teacher room booking system with hierarchical location management. The system enables teachers to find and book suitable rooms based on capacity, timing, and location preferences, while administrators manage the location hierarchy and user profiles. The feature introduces a new teacher role, removes public signup, and implements a distance-based location hierarchy (Block → Building → Floor → Room).

## Glossary

- **System**: The room booking and allocation management application
- **Teacher**: A user role that can search for and book rooms but cannot sign up independently
- **Admin**: A user role that can create teacher/student profiles and manage locations
- **Student**: An existing user role that can be managed by admins
- **Room Booking**: A time-bound reservation of a room by a teacher
- **Location Hierarchy**: A four-level structure consisting of Block, Building, Floor, and Room
- **Distance Parameter**: A numeric value representing proximity between locations at the same hierarchy level
- **Room Capacity**: The maximum number of students a room can accommodate
- **Allocation Status**: The current state of a room booking (not started, ongoing, or completed)
- **Faculty Management**: Admin interface for managing teacher profiles
- **Suitable Room**: A room that meets the teacher's capacity, timing, and location requirements

## Requirements

### Requirement 1: Teacher Role and Authentication

**User Story:** As an admin, I want to control who can access the system as a teacher, so that only authorized faculty members can book rooms.

#### Acceptance Criteria

1. WHEN a user navigates to the login page, THE System SHALL display a teacher role option in the login interface
2. THE System SHALL NOT display a teacher role option on any signup interface
3. WHEN a user attempts to sign up, THE System SHALL prevent creation of teacher accounts through the signup process
4. WHERE the signup page exists, THE System SHALL remove the signup page from the application
5. THE System SHALL allow only admins to create teacher user profiles

### Requirement 2: Teacher Room Search

**User Story:** As a teacher, I want to input my room requirements and find suitable options, so that I can quickly identify rooms that meet my needs.

#### Acceptance Criteria

1. WHEN a teacher logs in, THE System SHALL display a room search interface with input fields for capacity, branch, timing, and location
2. THE System SHALL accept the following search parameters: number of students, branch, start time, end time, block, building, floor, and room preferences
3. WHEN a teacher clicks the find button, THE System SHALL search for rooms matching the specified criteria
4. THE System SHALL display a list of suitable rooms ranked by suitability
5. WHERE a room has capacity equal to the requested number of students, THE System SHALL prioritize that room over rooms with greater capacity

### Requirement 3: Room Suitability Algorithm

**User Story:** As a teacher, I want the system to recommend the most suitable room based on my requirements, so that I can make an informed booking decision.

#### Acceptance Criteria

1. WHEN the System searches for suitable rooms, THE System SHALL filter rooms with capacity equal to or greater than the requested number of students
2. WHEN evaluating room availability, THE System SHALL verify the room is not booked during the requested time period
3. WHEN calculating location suitability, THE System SHALL compute distance based on the location hierarchy and distance parameters
4. THE System SHALL rank suitable rooms by proximity to the teacher's preferred location
5. THE System SHALL present the most suitable room as the primary recommendation

### Requirement 4: Room Booking and Claiming

**User Story:** As a teacher, I want to claim a recommended room for my specified time period, so that I can secure the space for my class.

#### Acceptance Criteria

1. WHEN a teacher views a suitable room, THE System SHALL display a claim button for that room
2. WHEN a teacher clicks the claim button, THE System SHALL create a room allocation with the specified branch, start time, and end time
3. WHEN a room is claimed, THE System SHALL mark the room as unavailable for the booked time period
4. THE System SHALL store the allocation with the teacher identifier, room identifier, branch, start time, and end time
5. WHEN the end time has passed, THE System SHALL automatically free the room and remove the allocation

### Requirement 5: Room Allocation Status

**User Story:** As a user, I want to see the current status of room allocations, so that I understand whether a class is upcoming, ongoing, or completed.

#### Acceptance Criteria

1. WHERE a room allocation has a start time in the future, THE System SHALL display "not started" status in the user interface
2. WHILE the current time is between the start time and end time of an allocation, THE System SHALL display "ongoing" status in the user interface
3. WHEN the current time exceeds the end time of an allocation, THE System SHALL free the room and remove the allocation record
4. THE System SHALL update allocation status in real-time based on current time
5. THE System SHALL display start time and end time for each room allocation

### Requirement 6: Location Hierarchy

**User Story:** As an admin, I want to manage a hierarchical location structure, so that the system can organize rooms and calculate distances effectively.

#### Acceptance Criteria

1. THE System SHALL implement a four-level location hierarchy: Block, Building, Floor, Room
2. WHEN an admin creates a location, THE System SHALL require the location to be assigned to the appropriate hierarchy level
3. THE System SHALL enforce that Buildings belong to Blocks, Floors belong to Buildings, and Rooms belong to Floors
4. THE System SHALL store distance parameters at all hierarchy levels
5. THE System SHALL allow admins to create and modify location entities at any hierarchy level

### Requirement 7: Distance Calculation

**User Story:** As a teacher, I want the system to find rooms closest to my preferred location, so that I minimize travel time between locations.

#### Acceptance Criteria

1. THE System SHALL calculate distance between two Blocks using their distance parameters
2. THE System SHALL calculate distance between two Buildings using their distance parameters
3. THE System SHALL calculate distance between two Floors using their distance parameters
4. THE System SHALL calculate distance between two Rooms using their distance parameters
5. WHEN comparing locations at different hierarchy levels, THE System SHALL aggregate distances across all relevant levels

### Requirement 8: Admin Location Management

**User Story:** As an admin, I want to create and manage locations in the hierarchy, so that teachers can search for rooms in the correct organizational structure.

#### Acceptance Criteria

1. THE System SHALL provide an admin interface for creating Blocks with distance parameters
2. THE System SHALL provide an admin interface for creating Buildings within Blocks with distance parameters
3. THE System SHALL provide an admin interface for creating Floors within Buildings with distance parameters
4. THE System SHALL provide an admin interface for creating Rooms within Floors with distance parameters
5. THE System SHALL validate that each location entity has a valid parent in the hierarchy

### Requirement 9: Faculty Management

**User Story:** As an admin, I want to manage teacher profiles similar to how I manage students, so that I have consistent user management capabilities.

#### Acceptance Criteria

1. THE System SHALL display a "Faculty" page in the admin interface
2. WHEN an admin navigates to the Faculty page, THE System SHALL display a list of all teacher profiles
3. THE System SHALL allow admins to create new teacher profiles with email and password
4. THE System SHALL allow admins to change teacher passwords and email addresses
5. THE System SHALL prevent admins from editing teacher names after creation

### Requirement 10: Student Management Restrictions

**User Story:** As an admin, I want appropriate restrictions on student profile management, so that critical information remains consistent.

#### Acceptance Criteria

1. THE System SHALL prevent admins from editing student names after creation
2. THE System SHALL allow admins to change student passwords
3. THE System SHALL allow admins to change student email addresses
4. THE System SHALL maintain existing student management functionality for other editable fields
5. THE System SHALL display appropriate validation messages when admins attempt to edit restricted fields

### Requirement 11: Admin Profile Restrictions

**User Story:** As an admin, I want to ensure admin accounts are created through secure processes, so that unauthorized users cannot gain administrative access.

#### Acceptance Criteria

1. THE System SHALL prevent admins from creating other admin profiles through the admin interface
2. THE System SHALL allow admins to create only teacher and student profiles
3. THE System SHALL display only teacher and student options in the user creation interface
4. THE System SHALL validate user role during profile creation to prevent admin role assignment
5. THE System SHALL require alternative secure processes for admin account creation

### Requirement 12: Signup Removal

**User Story:** As a system administrator, I want to remove public signup capabilities, so that only authorized admins can create user accounts.

#### Acceptance Criteria

1. THE System SHALL remove all signup page routes from the application
2. THE System SHALL remove all signup links from the user interface
3. THE System SHALL return an error when users attempt to access signup endpoints
4. THE System SHALL display only the login page for unauthenticated users
5. THE System SHALL require admin authentication for all user creation operations
