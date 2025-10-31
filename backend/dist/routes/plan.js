"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../generated/prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// POST /api/plan/allocate
router.post('/allocate', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Reset all allocated seats
        yield prisma.seat.updateMany({
            where: { status: 'Allocated' },
            data: { status: 'Available', studentId: null }
        });
        // Get available seats sorted by row
        const availableSeats = yield prisma.seat.findMany({
            where: { status: 'Available' },
            orderBy: { row: 'asc' }
        });
        // Get students not yet allocated
        const allocatedStudentIds = yield prisma.seat.findMany({
            where: { status: 'Allocated' },
            select: { studentId: true }
        }).then(seats => seats.map(s => s.studentId).filter(Boolean));
        const studentsToAllocate = yield prisma.student.findMany({
            where: {
                id: { notIn: allocatedStudentIds.filter(Boolean) }
            }
        });
        let allocatedCount = 0;
        const unallocatedStudents = [];
        const priorityStudents = studentsToAllocate.filter(s => s.accessibilityNeeds.length > 0);
        const otherStudents = studentsToAllocate.filter(s => s.accessibilityNeeds.length === 0);
        const allocate = (student) => __awaiter(void 0, void 0, void 0, function* () {
            let seatFound = false;
            if (student.accessibilityNeeds.includes('front_row')) {
                const frontRowSeat = availableSeats.find(s => s.row <= 1);
                if (frontRowSeat) {
                    yield prisma.seat.update({
                        where: { id: frontRowSeat.id },
                        data: { status: 'Allocated', studentId: student.id }
                    });
                    availableSeats.splice(availableSeats.indexOf(frontRowSeat), 1);
                    allocatedCount++;
                    seatFound = true;
                }
            }
            if (!seatFound && availableSeats.length > 0) {
                const seat = availableSeats.shift();
                yield prisma.seat.update({
                    where: { id: seat.id },
                    data: { status: 'Allocated', studentId: student.id }
                });
                allocatedCount++;
                seatFound = true;
            }
            if (!seatFound) {
                unallocatedStudents.push({ student, reason: 'No suitable seats available.' });
            }
        });
        for (const student of [...priorityStudents, ...otherStudents]) {
            yield allocate(student);
        }
        const totalSeats = yield prisma.seat.count({
            where: { status: { not: 'Broken' } }
        });
        const seats = yield prisma.seat.findMany();
        const summary = {
            allocatedCount,
            unallocatedCount: unallocatedStudents.length,
            unallocatedStudents,
            utilization: totalSeats > 0 ? (allocatedCount / totalSeats) * 100 : 0
        };
        res.json({ seats, summary });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to allocate seats' });
    }
}));
exports.default = router;
