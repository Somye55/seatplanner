# Aisle Seat Allocation Fix

## Problem
Students with the `aisle_seat` accessibility tag were being assigned the first available seat in the first row (like A1, A2, A3...) instead of being prioritized for corner seats (the outermost aisle seats like A1 or A7).

## Root Cause
The allocation logic in `allocationService.ts` was using a simple `findIndex()` to find the first seat that matched all accessibility needs, without any prioritization for corner/edge positions.

## Solution
Updated the allocation logic in three methods to prioritize corner seats for students with `aisle_seat` tag:

### 1. `allocateBranchToBuilding()` - Lines ~228-260
### 2. `allocateBranchToRoom()` - Lines ~340-372
### 3. `reallocateStudent()` - Lines ~40-80

## Changes Made

### New Logic Flow:
1. **Find all suitable seats** that match the student's accessibility needs (not just the first one)
2. **Check if student needs aisle seat**:
   - If YES:
     - Identify corner seats (col 0 or maxCol) from the suitable seats
     - Prioritize leftmost corner (col 0) first
     - If no leftmost, take rightmost corner
     - If no corner seats available, take any aisle seat
   - If NO:
     - Take the first suitable seat (original behavior)

### Example Scenario:
**Room Layout (5 rows × 7 columns):**
```
A1  A2  A3 | A4  A5  A6  A7
B1  B2  B3 | B4  B5  B6  B7
C1  C2  C3 | C4  C5  C6  C7
```

**Student with tags: `['front_seat', 'aisle_seat']`**

**Before Fix:**
- Would get assigned: A1 (first match found)

**After Fix:**
- Suitable seats: A1, A3, A4, A7 (all have both front_seat and aisle_seat)
- Corner seats: A1 (col 0), A7 (col 6 = maxCol)
- **Assigned: A1** (leftmost corner prioritized)

**If A1 is taken:**
- Suitable seats: A3, A4, A7
- Corner seats: A7 (col 6 = maxCol)
- **Assigned: A7** (rightmost corner)

**If both A1 and A7 are taken:**
- Suitable seats: A3, A4
- Corner seats: none
- **Assigned: A3** (next available aisle seat)

## Benefits
1. **Correct prioritization**: Corner seats are truly the most accessible aisle positions
2. **Better user experience**: Students needing aisle access get the best possible seats
3. **Consistent behavior**: All three allocation methods now use the same logic
4. **Maintains compatibility**: Non-aisle students still get assigned normally

## Testing Recommendations
1. Create a student with `aisle_seat` tag only
2. Create a student with `['front_seat', 'aisle_seat']` tags
3. Allocate their branch to a building/room
4. Verify they get corner seats (A1, A7, etc.) instead of middle aisle seats (A3, A4)
5. Test with multiple students to ensure proper fallback when corners are taken

## Files Modified
- `backend/src/services/allocationService.ts`
