-- Migration script to update accessibility tags from old to new format
-- Run this script if you have existing data with old tag names

-- Function to replace array elements (PostgreSQL)
-- This handles the array replacement for accessibility needs and seat features

-- Update Student accessibility needs
-- Replace 'front_row' with 'front_seat'
UPDATE "Student"
SET "accessibilityNeeds" = array(
    SELECT CASE 
        WHEN unnest = 'front_row' THEN 'front_seat'
        WHEN unnest = 'middle_row' THEN 'middle_seat'
        ELSE unnest
    END
    FROM unnest("accessibilityNeeds")
)
WHERE 'front_row' = ANY("accessibilityNeeds") OR 'middle_row' = ANY("accessibilityNeeds");

-- Remove deprecated tags from students (back_row, middle_column_seat)
UPDATE "Student"
SET "accessibilityNeeds" = array(
    SELECT unnest
    FROM unnest("accessibilityNeeds")
    WHERE unnest NOT IN ('back_row', 'middle_column_seat')
)
WHERE 'back_row' = ANY("accessibilityNeeds") OR 'middle_column_seat' = ANY("accessibilityNeeds");

-- Update Seat features
-- Replace 'front_row' with 'front_seat' and 'middle_row' with 'middle_seat'
UPDATE "Seat"
SET "features" = array(
    SELECT CASE 
        WHEN unnest = 'front_row' THEN 'front_seat'
        WHEN unnest = 'middle_row' THEN 'middle_seat'
        ELSE unnest
    END
    FROM unnest("features")
)
WHERE 'front_row' = ANY("features") OR 'middle_row' = ANY("features");

-- Remove deprecated tags from seats (back_row, middle_column_seat)
UPDATE "Seat"
SET "features" = array(
    SELECT unnest
    FROM unnest("features")
    WHERE unnest NOT IN ('back_row', 'middle_column_seat')
)
WHERE 'back_row' = ANY("features") OR 'middle_column_seat' = ANY("features");

-- Verify the changes
SELECT 'Students with accessibility needs' as category, COUNT(*) as count
FROM "Student"
WHERE array_length("accessibilityNeeds", 1) > 0
UNION ALL
SELECT 'Seats with features', COUNT(*)
FROM "Seat"
WHERE array_length("features", 1) > 0;

-- Show sample of updated data
SELECT 'Sample Students' as info, id, name, "accessibilityNeeds"
FROM "Student"
WHERE array_length("accessibilityNeeds", 1) > 0
LIMIT 5;

SELECT 'Sample Seats' as info, id, label, features
FROM "Seat"
WHERE array_length("features", 1) > 0
LIMIT 10;
