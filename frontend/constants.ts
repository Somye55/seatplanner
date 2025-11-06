// Centralized constants for accessibility needs across the application

export const ACCESSIBILITY_NEEDS = [
    { id: 'front_seat', label: 'Front Seat of a Row' },
    { id: 'middle_seat', label: 'Middle Seat of a Row' },
    { id: 'aisle_seat', label: 'Aisle Seat' },
] as const;

// Additional seat features that can be manually assigned by admins
export const SEAT_FEATURES = [
    { id: 'wheelchair_access', label: 'Wheelchair Access' },
    { id: 'near_exit', label: 'Near Exit' },
] as const;

export type AccessibilityNeedId = typeof ACCESSIBILITY_NEEDS[number]['id'];
export type SeatFeatureId = typeof SEAT_FEATURES[number]['id'];
