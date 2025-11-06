# Middle Seat Allocation Fix

## Problem
The "Middle Seat of a Row" allocation was incorrectly assigning seats. 

### Example Issue:
- Occupied seats: A1, B1, B2, B3
- New student with "middle seat" preference was assigned **B4** ❌
- Expected assignment: **A2** ✅ (which is between A1 and A3)

### Root Cause:
The system was treating "middle_seat" as "middle ROW" (rows B, C, D) instead of "middle POSITION within a row" (seats between other seats in the same row).

## Solution

### 1. Updated Seat Generation Logic (`seatGenerationService.ts`)

**Before:**
- `middle_seat` tag was assigned to ALL seats in middle rows (B, C, D, etc.)
- Example: B1, B2, B3, B4, B5 all had `middle_seat` tag

**After:**
- `middle_seat` tag is assigned to seats that are NOT on the edges of their bank
- Only seats in the middle COLUMNS of a bank get the tag
- Example in a 3-seat bank: Only the middle seat (position 2) gets the tag
- Example in a 5-seat bank: Positions 2, 3, 4 get the tag (not 1 or 5)

```typescript
// Middle seat = seats that are NOT on the edges of their bank
const currentBank = banks.find(bank => col >= bank.startCol && col <= bank.endCol);
if (currentBank) {
  const bankWidth = currentBank.endCol - currentBank.startCol + 1;
  const colInBank = col - currentBank.startCol;
  // A seat is a middle seat if it's not on the edge of its bank and the bank has at least 3 seats
  if (bankWidth >= 3 && colInBank > 0 && colInBank < bankWidth - 1) {
    features.push('middle_seat');
  }
}
```

### 2. Updated Allocation Logic (`allocationService.ts`)

Added intelligent seat selection that prioritizes seats with occupied neighbors:

```typescript
// For middle seat preference, prioritize seats with occupied neighbors
const seatsWithOccupiedNeighbors = suitableSeats.filter(seat => {
  const occupiedSeatsInRow = allSeatsInRoom.filter(s => 
    s.row === seat.row && s.status === SeatStatus.Allocated
  );
  
  const hasLeftNeighbor = occupiedSeatsInRow.some(s => s.col === seat.col - 1);
  const hasRightNeighbor = occupiedSeatsInRow.some(s => s.col === seat.col + 1);
  
  return hasLeftNeighbor || hasRightNeighbor;
});
```

## What Changed

### Files Modified:
1. `backend/src/services/seatGenerationService.ts`
   - Changed middle_seat assignment from row-based to column-based
   - Now considers bank structure and column position

2. `backend/src/services/allocationService.ts`
   - Added `selectBestSeat()` helper method
   - Prioritizes seats with occupied neighbors for middle_seat preference
   - Updated all allocation methods to use the new logic

## Expected Behavior After Fix

### Scenario: 5-column room with 2 banks (3 seats | 2 seats)

```
     Bank 1        Bank 2
  A1  A2  A3  |  A4  A5
  🔵  🟢  🔵  |  🔵  🔵
```

- A1, A3, A4, A5: Aisle seats (edges) ❌ No middle_seat tag
- A2: Middle seat ✅ Has middle_seat tag

### Allocation Priority:
1. If A1 is occupied and A2 is available → Student gets A2 (between A1 and A3)
2. If A1 and A3 are occupied and A2 is available → Student gets A2 (has neighbors on both sides)
3. Otherwise → Any available seat with middle_seat tag

## Testing

To test the fix:
1. Regenerate seats for existing rooms (this will apply the new tagging logic)
2. Create a student with "Middle Seat of a Row" preference
3. Allocate the student - they should get a seat in the middle column position, preferably with occupied neighbors

## Migration Note

Existing rooms will need to have their seats regenerated to apply the new middle_seat tagging logic. The allocation logic will work immediately, but seats won't have the correct tags until regenerated.
