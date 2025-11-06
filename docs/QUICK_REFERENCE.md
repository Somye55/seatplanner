# Quick Reference Guide

## Room Capacity Auto-calculation

### Before:
```typescript
// User had to manually calculate: 5 rows × 8 cols = 40
<input type="number" value={newRoom.capacity} />
```

### After:
```typescript
// Capacity automatically set to rows × cols
useEffect(() => {
  if (showCreateForm) {
    setNewRoom(prev => ({ ...prev, capacity: prev.rows * prev.cols }));
  }
}, [showCreateForm]);

// When editing, capacity defaults to max
const handleEditRoom = (room: Room) => {
  const maxCapacity = room.rows * room.cols;
  setEditRoom({ ...room, capacity: maxCapacity });
};
```

## Accessibility Tags

### Import Constants:
```typescript
import { ACCESSIBILITY_NEEDS, SEAT_FEATURES } from '../constants';
```

### Use in Forms:
```typescript
// For student forms - only use accessibility needs
const POSSIBLE_NEEDS = ACCESSIBILITY_NEEDS;

// For admin seat editing - use seat features
const SEAT_FEATURE_OPTIONS = SEAT_FEATURES;

// Render checkboxes
{POSSIBLE_NEEDS.map(need => (
  <label key={need.id}>
    <input type="checkbox" value={need.id} />
    {need.label}
  </label>
))}
```

### Constants Definition:
```typescript
// frontend/constants.ts
export const ACCESSIBILITY_NEEDS = [
    { id: 'front_seat', label: 'Front Seat of a Row' },
    { id: 'middle_seat', label: 'Middle Seat of a Row' },
    { id: 'aisle_seat', label: 'Aisle Seat' },
] as const;

export const SEAT_FEATURES = [
    { id: 'wheelchair_access', label: 'Wheelchair Access' },
    { id: 'near_exit', label: 'Near Exit' },
] as const;
```

## Backend Seat Generation

### Positional Features (Auto-assigned):
```typescript
// First row
if (row === 0) {
  features.push('front_seat');
}
// Middle rows
else if (row > 0 && row < rows - 1) {
  features.push('middle_seat');
}

// Aisle seats (outer edges + bank edges)
const isOuterAisle = col === 0 || col === cols - 1;
let isInnerAisle = false;
if (banks.length > 1) {
  isInnerAisle = banks.some(bank => 
    col === bank.endCol || col === bank.startCol
  );
}
if (isOuterAisle || isInnerAisle) {
  features.push('aisle_seat');
}
```

### Filtering Positional Features:
```typescript
// In seats.ts - when updating features
const positionalFeatures = seat.features.filter(f => 
  ['front_seat', 'middle_seat', 'aisle_seat'].includes(f)
);

const newCustomFeatures = features.filter((f: string) => 
  !['front_seat', 'middle_seat', 'aisle_seat'].includes(f)
);

// Combine: positional (preserved) + custom (updated)
const updatedFeatures = [...positionalFeatures, ...newCustomFeatures];
```

## Database Migration

### Run Migration:
```bash
cd backend
psql -U your_user -d your_database -f migrate-accessibility-tags.sql
```

### Manual Update (if needed):
```sql
-- Update student needs
UPDATE "Student"
SET "accessibilityNeeds" = array(
    SELECT CASE 
        WHEN unnest = 'front_row' THEN 'front_seat'
        WHEN unnest = 'middle_row' THEN 'middle_seat'
        ELSE unnest
    END
    FROM unnest("accessibilityNeeds")
);

-- Update seat features
UPDATE "Seat"
SET "features" = array(
    SELECT CASE 
        WHEN unnest = 'front_row' THEN 'front_seat'
        WHEN unnest = 'middle_row' THEN 'middle_seat'
        ELSE unnest
    END
    FROM unnest("features")
);
```

## Testing Commands

### Frontend:
```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

### Backend:
```bash
cd backend
npm run dev
# API runs on http://localhost:3001
```

### Test Scenarios:
1. Create new room → verify capacity = rows × cols
2. Edit room → verify capacity updates to max
3. Create student → verify new accessibility tags
4. View seat map → verify positional features
5. Run allocation → verify matching works

## Common Issues

### Issue: Old tags still appearing
**Solution:** Run the migration script on your database

### Issue: Capacity not auto-filling
**Solution:** Check that `useEffect` hook is present in RoomsPage.tsx

### Issue: TypeScript errors
**Solution:** Ensure `frontend/constants.ts` is imported correctly

### Issue: Allocation not matching
**Solution:** Verify backend is using new tag names in allocation logic

## File Locations

```
frontend/
  ├── constants.ts (NEW)
  ├── pages/
  │   ├── RoomsPage.tsx (MODIFIED)
  │   ├── StudentsPage.tsx (MODIFIED)
  │   ├── LoginPage.tsx (MODIFIED)
  │   └── SeatMapPage.tsx (MODIFIED)
  ├── components/
  │   └── Layout.tsx (MODIFIED)
  └── services/
      └── apiService.ts (MODIFIED)

backend/
  ├── migrate-accessibility-tags.sql (NEW)
  └── src/
      ├── services/
      │   └── seatGenerationService.ts (MODIFIED)
      ├── routes/
      │   └── seats.ts (MODIFIED)
      ├── tests/
      │   └── allocationService.test.ts (MODIFIED)
      └── data.ts (MODIFIED)
```
