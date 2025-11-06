# Accessibility Tags Visual Guide

## Seat Position Tags (Auto-assigned)

```
Room Layout Example (5 rows × 7 columns):

                    FRONT OF ROOM
    ┌─────────────────────────────────────────┐
    │  A1   A2   A3  │  A4   A5   A6   A7    │
    │  🔵  🔵  🔵  │  🔵  🔵  🔵  🔵    │  ← Row 1: front_seat
    │  ⭕   ⭕   ⭕  │  ⭕   ⭕   ⭕   ⭕    │     + aisle_seat (A1, A3, A4, A7)
    │                                         │
    │  B1   B2   B3  │  B4   B5   B6   B7    │
    │  🟢  🟢  🟢  │  🟢  🟢  🟢  🟢    │  ← Row 2: middle_seat
    │  ⭕   ⭕   ⭕  │  ⭕   ⭕   ⭕   ⭕    │     + aisle_seat (B1, B3, B4, B7)
    │                                         │
    │  C1   C2   C3  │  C4   C5   C6   C7    │
    │  🟢  🟢  🟢  │  🟢  🟢  🟢  🟢    │  ← Row 3: middle_seat
    │  ⭕   ⭕   ⭕  │  ⭕   ⭕   ⭕   ⭕    │     + aisle_seat (C1, C3, C4, C7)
    │                                         │
    │  D1   D2   D3  │  D4   D5   D6   D7    │
    │  🟢  🟢  🟢  │  🟢  🟢  🟢  🟢    │  ← Row 4: middle_seat
    │  ⭕   ⭕   ⭕  │  ⭕   ⭕   ⭕   ⭕    │     + aisle_seat (D1, D3, D4, D7)
    │                                         │
    │  E1   E2   E3  │  E4   E5   E6   E7    │
    │  ⚪  ⚪  ⚪  │  ⚪  ⚪  ⚪  ⚪    │  ← Row 5: (no row tag)
    │  ⭕   ⭕   ⭕  │  ⭕   ⭕   ⭕   ⭕    │     + aisle_seat (E1, E3, E4, E7)
    └─────────────────────────────────────────┘
                    BACK OF ROOM

Legend:
🔵 = front_seat (first row)
🟢 = middle_seat (middle rows)
⚪ = no row tag (last row)
⭕ = aisle_seat (outer edges + bank edges)
│  = main aisle (after 3rd column)
```

## Tag Definitions

### Student Accessibility Needs (Positional - Auto-assigned)

1. **front_seat** 🔵
   - First row of the room
   - For students who need to be close to the instructor
   - Example: Students with hearing difficulties

2. **middle_seat** 🟢
   - Middle rows (not first or last)
   - For students who prefer central positioning
   - Example: Students who want to be in the middle of the action

3. **aisle_seat** ⭕
   - Outer edges of room (leftmost/rightmost columns)
   - Inner edges of seat banks (where aisles are created)
   - For students who need easy access to exit
   - Example: Students who may need frequent breaks

### Additional Seat Features (Manual - Admin-assigned)

4. **wheelchair_access** ♿
   - Manually assigned by admins
   - For seats with wheelchair accessibility
   - Example: Wider spaces, no obstacles

5. **near_exit** 🚪
   - Manually assigned by admins
   - For seats close to emergency exits
   - Example: Students with medical conditions

## Student Selection Interface

When creating/editing a student, they can select from:

```
☐ Front Seat of a Row
☐ Middle Seat of a Row
☐ Aisle Seat
```

Note: Wheelchair Access and Near Exit are seat features that can only be assigned by admins to specific seats, not selected by students.

## Allocation Logic

The allocation algorithm matches students to seats based on their needs:

```
Student with [front_seat, aisle_seat]
    ↓
Matches seat with features: [front_seat, aisle_seat]
    ↓
Example: Seat A1 or A7 (front row + aisle)
```

## Migration from Old Tags

```
OLD SYSTEM                    NEW SYSTEM
─────────────────────────────────────────────
front_row          →          front_seat
middle_row         →          middle_seat
back_row           →          (removed)
middle_column_seat →          (removed)
aisle_seat         →          aisle_seat (unchanged)
wheelchair_access  →          wheelchair_access (unchanged)
near_exit          →          near_exit (unchanged)
```

## Benefits of New System

1. **Clearer naming**: "front_seat" is more descriptive than "front_row"
2. **Simplified logic**: Removed unnecessary tags (back_row, middle_column_seat)
3. **Consistent**: Same tags used across frontend and backend
4. **Flexible**: Admins can add custom features (wheelchair_access, near_exit)
5. **Automatic**: Positional tags are auto-assigned when seats are generated
