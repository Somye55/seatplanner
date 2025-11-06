# Accessibility Tags Standardization & Room Capacity Auto-calculation

## Summary of Changes

### 1. Seat Capacity Auto-calculation
When creating or editing a room, the seat capacity field now automatically defaults to the maximum value (rows × columns). This ensures consistency and reduces manual errors.

**Changes:**
- When opening the create room form, capacity is auto-set to rows × cols
- When editing a room, capacity is auto-set to the maximum possible value
- Users can still manually adjust capacity if needed (e.g., to exclude broken seats)

### 2. Accessibility Tags Standardization

The accessibility tags have been standardized across the entire application to use consistent naming:

#### New Standard Tags (for students to select/be assigned):
1. **`front_seat`** - Front Seat of a Row (first row)
2. **`middle_seat`** - Middle Seat of a Row (middle rows, not first or last)
3. **`aisle_seat`** - Aisle Seat (outer edges or inner bank edges)

#### Additional Seat Features (admin-only, assigned to specific seats):
1. **`wheelchair_access`** - Wheelchair Access (not selectable by students)
2. **`near_exit`** - Near Exit (not selectable by students)

**Important:** Students cannot select wheelchair_access or near_exit during signup or profile editing. These are physical seat attributes that admins assign to specific seats in the seat map.

#### Old Tags (DEPRECATED):
- ❌ `front_row` → ✅ `front_seat`
- ❌ `back_row` → (removed - no longer used)
- ❌ `middle_row` → ✅ `middle_seat`
- ❌ `middle_column_seat` → (removed - simplified to just row-based middle)

## Files Modified

### Frontend:
1. **`frontend/constants.ts`** (NEW) - Centralized constants for accessibility needs
2. **`frontend/pages/RoomsPage.tsx`** - Auto-calculate capacity, import constants
3. **`frontend/pages/StudentsPage.tsx`** - Use standardized constants
4. **`frontend/pages/LoginPage.tsx`** - Use standardized constants
5. **`frontend/pages/SeatMapPage.tsx`** - Use standardized constants
6. **`frontend/components/Layout.tsx`** - Use standardized constants
7. **`frontend/services/apiService.ts`** - Update mock AI suggestions

### Backend:
1. **`backend/src/services/seatGenerationService.ts`** - Generate seats with new tags
2. **`backend/src/routes/seats.ts`** - Update positional feature filtering
3. **`backend/src/tests/allocationService.test.ts`** - Update test data

## Migration Notes

### For Existing Data:
If you have existing data in the database with old tags, you may need to run a migration script to update:
- `front_row` → `front_seat`
- `middle_row` → `middle_seat`
- Remove `back_row` and `middle_column_seat` tags

### Example Migration SQL:
```sql
-- Update student accessibility needs
UPDATE "Student"
SET "accessibilityNeeds" = array_replace("accessibilityNeeds", 'front_row', 'front_seat');

UPDATE "Student"
SET "accessibilityNeeds" = array_replace("accessibilityNeeds", 'middle_row', 'middle_seat');

-- Update seat features
UPDATE "Seat"
SET "features" = array_replace("features", 'front_row', 'front_seat');

UPDATE "Seat"
SET "features" = array_replace("features", 'middle_row', 'middle_seat');

-- Remove deprecated tags
UPDATE "Seat"
SET "features" = array_remove("features", 'back_row');

UPDATE "Seat"
SET "features" = array_remove("features", 'middle_column_seat');
```

## Testing Recommendations

1. **Create a new room** - Verify capacity auto-fills to rows × cols
2. **Edit an existing room** - Verify capacity updates to max value
3. **Create a student** - Verify new accessibility tags appear in the form
4. **View seat map** - Verify seats show correct positional features
5. **Run allocation** - Verify students with accessibility needs are matched correctly

## Benefits

1. **Consistency** - All parts of the app use the same tag names
2. **Simplicity** - Reduced from 5 positional tags to 3 clear categories
3. **Maintainability** - Centralized constants make future changes easier
4. **User Experience** - Auto-calculated capacity reduces errors
5. **Clarity** - Tag names clearly describe what they represent
