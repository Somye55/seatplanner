
import { Building, Room, Seat, Student, SeatStatus } from '../../types';

// MOCK DATABASE
export let buildings: Building[] = [
  { id: 'b1', name: 'Science & Engineering Hall', code: 'SEH' },
  { id: 'b2', name: 'Arts & Humanities Pavilion', code: 'AHP' },
];

export let rooms: Room[] = [
  { id: 'r1', buildingId: 'b1', name: 'Lecture Hall 101', capacity: 50 },
  { id: 'r2', buildingId: 'b1', name: 'Computer Lab 203', capacity: 30 },
  { id: 'r3', buildingId: 'b2', name: 'Studio C', capacity: 25 },
];

export let seats: Seat[] = [
  // Seats for Room r1
  ...Array.from({ length: 50 }, (_, i) => ({
    id: `s_r1_${i + 1}`,
    roomId: 'r1',
    label: `R1-${String.fromCharCode(65 + Math.floor(i / 10))}${ (i % 10) + 1}`,
    row: Math.floor(i / 10),
    col: i % 10,
    status: SeatStatus.Available,
  })),
  // Seats for Room r2
  ...Array.from({ length: 30 }, (_, i) => ({
    id: `s_r2_${i + 1}`,
    roomId: 'r2',
    label: `R2-${String.fromCharCode(65 + Math.floor(i / 6))}${ (i % 6) + 1}`,
    row: Math.floor(i / 6),
    col: i % 6,
    status: SeatStatus.Available,
  })),
  // Seats for Room r3
  ...Array.from({ length: 25 }, (_, i) => ({
    id: `s_r3_${i + 1}`,
    roomId: 'r3',
    label: `R3-${String.fromCharCode(65 + Math.floor(i / 5))}${ (i % 5) + 1}`,
    row: Math.floor(i / 5),
    col: i % 5,
    status: SeatStatus.Available,
  })),
];
// Pre-set some statuses
seats[2].status = SeatStatus.Broken;
seats[10].status = SeatStatus.Allocated;
seats[10].studentId = 'st1';
seats[55].status = SeatStatus.Broken;


export let students: Student[] = [
  { id: 'st1', name: 'Alice Johnson', email: 'alice@example.com', tags: ['graduate'], accessibilityNeeds: [] },
  { id: 'st2', name: 'Bob Williams', email: 'bob@example.com', tags: ['undergraduate'], accessibilityNeeds: ['front_row'] },
  { id: 'st3', name: 'Charlie Brown', email: 'charlie@example.com', tags: ['undergraduate'], accessibilityNeeds: [] },
  { id: 'st4', name: 'Diana Miller', email: 'diana@example.com', tags: ['exchange'], accessibilityNeeds: ['wheelchair_access'] },
  ...Array.from({length: 40}, (_, i) => ({
    id: `st${i+5}`,
    name: `Student ${i+5}`,
    email: `student${i+5}@example.com`,
    tags: ['undergraduate'],
    accessibilityNeeds: [],
  }))
];
