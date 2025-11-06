# Implementation Summary: Room Capacity & Accessibility Tags

## Changes Implemented

### 1. Removed Wheelchair Access & Near Exit from Student Forms

**Rationale:** These are physical seat features that should be assigned by admins to specific seats, not selected by students during signup/profile editing.

**Changes:**
- Students can only select positional preferences: front_seat, middle_seat, aisle_seat
- Wheelchair Access and Near Exit remain as admin-assignable seat features
- Updated LoginPage, StudentsPage, and Layout components

### 2. Auto-calculate Seat Capacity (Default to Max)

**Problem:** When creating a new room, users had to manually calculate and enter the seat capacity based on rows × columns.

**Solution:** 
- Seat capacity now automatically defaults to the maximum value (rows × columns)
- When rows or columns are changed, capacity updates automatically
- When editing a room, capacity is pre-filled with the maximum value
- Users can still manually adjust if needed (e.g., to account for broken seats)

**Files Modified:**
- `frontend/pages/RoomsPage.tsx`
  - Added `useEffect` hook to auto-calculate capacity when create form opens
  - Updated `handleEditRoom` to set capacity to max value
  - Updated row/column change handlers to auto-update capacity

### 2. Standardize Accessibility Tags

**Problem:** Accessibility tags were inconsistent across the application:
- Different files used different tag names (`front_row` vs `front_seat`)
- Some files had tags that weren't used elsewhere (`back_row`, `middle_column_seat`)
- No centralized source of truth for tag definitions

**Solution:**
- Created centralized constants file (`frontend/constants.ts`)
- Standardized to 3 clear accessibility needs (student-selectable):
  1. **Front Seat of a Row** (`front_seat`)
  2. **Middle Seat of a Row** (`middle_seat`)
  3. **Aisle Seat** (`aisle_seat`)
- Additional admin-only seat features (not selectable by students):
  1. **Wheelchair Access** (`wheelchair_access`) - Admin assigns to specific seats
  2. **Near Exit** (`near_exit`) - Admin assigns to specific seats

**Files Modified:**

**Frontend:**
- `frontend/constants.ts` (NEW) - Centralized accessibility constants
- `frontend/pages/RoomsPage.tsx` - Import and use constants
- `frontend/pages/StudentsPage.tsx` - Import and use constants
- `frontend/pages/LoginPage.tsx` - Import and use constants
- `frontend/pages/SeatMapPage.tsx` - Import and use constants
- `frontend/components/Layout.tsx` - Import and use constants
- `frontend/services/apiService.ts` - Update mock AI suggestions

**Backend:**
- `backend/src/services/seatGenerationService.ts` - Generate seats with new tags
- `backend/src/routes/seats.ts` - Update positional feature filtering
- `backend/src/tests/allocationService.test.ts` - Update test data
- `backend/src/data.ts` - Update commented example data

**Migration:**
- `backend/migrate-accessibility-tags.sql` (NEW) - SQL script to migrate existing data
- `ACCESSIBILITY_TAGS_UPDATE.md` (NEW) - Detailed migration guide

## Tag Mapping (Old → New)

| Old Tag | New Tag | Notes |
|---------|---------|-------|
| `front_row` | `front_seat` | Renamed for clarity |
| `middle_row` | `middle_seat` | Renamed for clarity |
| `back_row` | (removed) | No longer used |
| `middle_column_seat` | (removed) | Simplified - not needed |
| `aisle_seat` | `aisle_seat` | Unchanged |
| `wheelchair_access` | `wheelchair_access` | Unchanged |
| `near_exit` | `near_exit` | Unchanged |

## Benefits

1. **Consistency** - All parts of the app use the same tag names
2. **Simplicity** - Reduced complexity with fewer, clearer tags
3. **Maintainability** - Centralized constants make future changes easier
4. **User Experience** - Auto-calculated capacity reduces manual errors
5. **Clarity** - Tag names clearly describe what they represent

## Testing Checklist

- [x] Frontend compiles without errors
- [x] Backend compiles without errors
- [x] All TypeScript diagnostics pass
- [ ] Create new room - verify capacity auto-fills
- [ ] Edit room - verify capacity updates to max
- [ ] Create student - verify new accessibility tags appear
- [ ] View seat map - verify correct positional features
- [ ] Run allocation - verify accessibility matching works

## Next Steps

1. **If you have existing data:** Run the migration script:
   ```bash
   cd backend
   psql -U your_user -d your_database -f migrate-accessibility-tags.sql
   ```

2. **Test the changes:**
   - Start the backend: `cd backend && npm run dev`
   - Start the frontend: `cd frontend && npm run dev`
   - Create a new room and verify capacity auto-fills
   - Create/edit students and verify new accessibility options

3. **Deploy:**
   - Run migration script on production database
   - Deploy backend changes
   - Deploy frontend changes
