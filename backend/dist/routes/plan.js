"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const data_1 = require("../data");
const types_1 = require("../../types");
const router = (0, express_1.Router)();
// POST /api/plan/allocate
router.post('/allocate', (req, res) => {
    data_1.seats.forEach(seat => {
        if (seat.status === types_1.SeatStatus.Allocated) {
            seat.status = types_1.SeatStatus.Available;
            seat.studentId = undefined;
        }
    });
    const availableSeats = data_1.seats.filter(s => s.status === types_1.SeatStatus.Available).sort((a, b) => a.row - b.row);
    const studentsToAllocate = data_1.students.filter(student => !data_1.seats.find(s => s.studentId === student.id));
    let allocatedCount = 0;
    const unallocatedStudents = [];
    const priorityStudents = studentsToAllocate.filter(s => s.accessibilityNeeds.length > 0);
    const otherStudents = studentsToAllocate.filter(s => s.accessibilityNeeds.length === 0);
    const allocate = (student) => {
        let seatFound = false;
        if (student.accessibilityNeeds.includes('front_row')) {
            const frontRowSeatIndex = availableSeats.findIndex(s => s.row <= 1);
            if (frontRowSeatIndex !== -1) {
                const seat = availableSeats.splice(frontRowSeatIndex, 1)[0];
                seat.status = types_1.SeatStatus.Allocated;
                seat.studentId = student.id;
                allocatedCount++;
                seatFound = true;
            }
        }
        if (!seatFound && availableSeats.length > 0) {
            const seat = availableSeats.shift();
            seat.status = types_1.SeatStatus.Allocated;
            seat.studentId = student.id;
            allocatedCount++;
            seatFound = true;
        }
        if (!seatFound) {
            unallocatedStudents.push({ student, reason: 'No suitable seats available.' });
        }
    };
    [...priorityStudents, ...otherStudents].forEach(allocate);
    const totalSeats = data_1.seats.filter(s => s.status !== types_1.SeatStatus.Broken).length;
    const summary = {
        allocatedCount,
        unallocatedCount: unallocatedStudents.length,
        unallocatedStudents,
        utilization: totalSeats > 0 ? (allocatedCount / totalSeats) * 100 : 0
    };
    res.json({ seats: JSON.parse(JSON.stringify(data_1.seats)), summary });
});
exports.default = router;
