# Middle Seat Assignment Fix

## Problem
Students with the "middle seat" accessibility tag were not being assigned to middle seats.

## Root Cause
The database contained **old accessibility tag names** that didn't match the new tag names used in the code:

### Old Tags (in database):
- `front_row` 
- `middle_row`
- `back_row`
- `middle_column_seat`

### New Tags (in code):
- `front_seat` - First row of a room
- `middle_seat` - Middle rows (not first or last)
- `aisle_seat` - Outer edges or bank edges

## Solution
Ran the migration script (`migrate-accessibility-tags.sql`) to update all existing data:

1. **Student accessibility needs**: Updated 3 students
   - `front_row` → `front_seat`
   - `middle_row` → `middle_seat`
   - Removed deprecated tags: `back_row`, `middle_column_seat`

2. **Seat features**: Updated 80 seats
   - `front_row` → `front_seat`
   - `middle_row` → `middle_seat`
   - Removed deprecated tags from 45 seats: `back_row`, `middle_column_seat`

## Verification
After migration:
- ✅ Students with `middle_seat` need are correctly assigned to seats with `middle_seat` feature
- ✅ All 81 middle row seats now have the `middle_seat` tag
- ✅ 73 middle seats are currently available for allocation

## How Middle Seat Works
- **Middle Seat** = A seat in a middle row (not the first or last row)
- Row A (first row) → `front_seat`
- Rows B, C, D, etc. (middle rows) → `middle_seat`
- Last row → no row tag

Example in a 5-row room:
- Row A: front_seat ✅
- Row B: middle_seat ✅
- Row C: middle_seat ✅
- Row D: middle_seat ✅
- Row E: (no tag)

## Status
✅ **FIXED** - Middle seat assignment is now working correctly!
