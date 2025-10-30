"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.students = exports.seats = exports.rooms = exports.buildings = void 0;
const types_1 = require("../../types");
// MOCK DATABASE
exports.buildings = [
    { id: 'b1', name: 'Science & Engineering Hall', code: 'SEH' },
    { id: 'b2', name: 'Arts & Humanities Pavilion', code: 'AHP' },
];
exports.rooms = [
    { id: 'r1', buildingId: 'b1', name: 'Lecture Hall 101', capacity: 50 },
    { id: 'r2', buildingId: 'b1', name: 'Computer Lab 203', capacity: 30 },
    { id: 'r3', buildingId: 'b2', name: 'Studio C', capacity: 25 },
];
exports.seats = [
    // Seats for Room r1
    ...Array.from({ length: 50 }, (_, i) => ({
        id: `s_r1_${i + 1}`,
        roomId: 'r1',
        label: `R1-${String.fromCharCode(65 + Math.floor(i / 10))}${(i % 10) + 1}`,
        row: Math.floor(i / 10),
        col: i % 10,
        status: types_1.SeatStatus.Available,
    })),
    // Seats for Room r2
    ...Array.from({ length: 30 }, (_, i) => ({
        id: `s_r2_${i + 1}`,
        roomId: 'r2',
        label: `R2-${String.fromCharCode(65 + Math.floor(i / 6))}${(i % 6) + 1}`,
        row: Math.floor(i / 6),
        col: i % 6,
        status: types_1.SeatStatus.Available,
    })),
    // Seats for Room r3
    ...Array.from({ length: 25 }, (_, i) => ({
        id: `s_r3_${i + 1}`,
        roomId: 'r3',
        label: `R3-${String.fromCharCode(65 + Math.floor(i / 5))}${(i % 5) + 1}`,
        row: Math.floor(i / 5),
        col: i % 5,
        status: types_1.SeatStatus.Available,
    })),
];
// Pre-set some statuses
exports.seats[2].status = types_1.SeatStatus.Broken;
exports.seats[10].status = types_1.SeatStatus.Allocated;
exports.seats[10].studentId = 'st1';
exports.seats[55].status = types_1.SeatStatus.Broken;
exports.students = [
    { id: 'st1', name: 'Alice Johnson', email: 'alice@example.com', tags: ['graduate'], accessibilityNeeds: [] },
    { id: 'st2', name: 'Bob Williams', email: 'bob@example.com', tags: ['undergraduate'], accessibilityNeeds: ['front_row'] },
    { id: 'st3', name: 'Charlie Brown', email: 'charlie@example.com', tags: ['undergraduate'], accessibilityNeeds: [] },
    { id: 'st4', name: 'Diana Miller', email: 'diana@example.com', tags: ['exchange'], accessibilityNeeds: ['wheelchair_access'] },
    ...Array.from({ length: 40 }, (_, i) => ({
        id: `st${i + 5}`,
        name: `Student ${i + 5}`,
        email: `student${i + 5}@example.com`,
        tags: ['undergraduate'],
        accessibilityNeeds: [],
    }))
];
