# Room Search Current Location Fix

## Problem

The room search form was not asking teachers for their current location, only for a preferred search location (which was optional). When teachers didn't fill in the preferred location, all rooms showed "Same location" as the distance because the distance calculation defaulted to 0.

## Solution

Added a required "Current Location" field to accurately calculate distances from the teacher's actual position to available rooms.

## Changes Made

### Frontend Changes

#### 1. `frontend/types.ts`

- Updated `SearchCriteria` interface to include required `currentLocation` field
- Kept `preferredLocation` as optional for filtering search results

#### 2. `frontend/components/teacher/RoomSearchForm.tsx`

- Added `currentLocation` state variable
- Added validation to ensure current location is provided
- Added new "Your Current Location" section with:
  - Required field indicator (\*)
  - Clear description explaining it's used for distance calculation
  - Visual distinction (primary border color) from optional preferred location
- Updated "Preferred Location" section to clarify it's for narrowing search area
- Updated form submission to include `currentLocation` in search criteria

### Backend Changes

#### 1. `backend/src/services/roomSearchService.ts`

- Updated `SearchCriteria` interface to include required `currentLocation`
- Modified `searchRooms()` to:
  - Include `currentLocation` in cache key
  - Use `preferredLocation` to filter which rooms to search (if provided)
  - Calculate distance from `currentLocation` to each room
- Improved `calculateDistance()` logic to properly handle hierarchical distances:
  - Same floor: room distance only
  - Same building, different floor: floor + room distance
  - Same block, different building: building + floor + room distance
  - Different blocks: all distances combined
- Updated `calculateRoomScore()` to always use distance in scoring (removed conditional)

#### 2. `backend/src/routes/roomBookings.ts`

- Added validation for `currentLocation` field:
  - Must be an object
  - Must specify at least one level (block, building, or floor)
- Updated route handler to pass `currentLocation` to search service

## User Experience Improvements

### Before

- Only asked for "Preferred Location (Optional)"
- When left empty, all rooms showed "Same location"
- Distance calculation was meaningless

### After

- Asks for "Your Current Location (Required)" - where the teacher is now
- Asks for "Preferred Search Location (Optional)" - to narrow search area
- Distance is always calculated from teacher's actual location
- More accurate room recommendations based on proximity

## Example Usage

1. Teacher fills in:

   - Current Location: Block A → Building 1 → Floor 2
   - Preferred Search Location: (empty - search all locations)
   - Result: Shows all rooms with accurate distances from Floor 2 of Building 1

2. Teacher fills in:

   - Current Location: Block A → Building 1 → Floor 2
   - Preferred Search Location: Block A
   - Result: Shows only rooms in Block A, with distances from Floor 2 of Building 1

3. Teacher fills in:
   - Current Location: Block A → Building 1
   - Preferred Search Location: Block B → Building 3
   - Result: Shows only rooms in Building 3 of Block B, with distances from Building 1 of Block A
