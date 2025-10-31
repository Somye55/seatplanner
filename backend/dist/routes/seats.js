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
const express_validator_1 = require("express-validator");
const client_1 = require("../generated/prisma/client");
const cache_1 = require("../middleware/cache");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// PATCH /api/seats/:id/status
router.patch('/:id/status', [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('status').isIn(['Available', 'Allocated', 'Broken', 'Blocked']),
    (0, express_validator_1.body)('version').isInt({ min: 0 }).withMessage('Version is required for updates.')
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { status, version } = req.body;
    const seatId = req.params.id;
    try {
        const result = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const seat = yield tx.seat.findUnique({
                where: { id: seatId }
            });
            if (!seat) {
                // This will cause the transaction to roll back
                throw new Error('Seat not found');
            }
            // Optimistic locking: check version
            if (version !== seat.version) {
                // This will cause the transaction to roll back
                throw new Error('Conflict');
            }
            const updatedSeat = yield tx.seat.update({
                where: { id: seatId },
                data: {
                    status: status,
                    // If a seat is no longer allocated (e.g., broken, available), unassign the student.
                    studentId: status !== 'Allocated' ? null : seat.studentId,
                    version: { increment: 1 }
                },
                include: { student: true } // Include student for the response
            });
            return updatedSeat;
        }));
        // Invalidate cache for the room's seats
        yield (0, cache_1.invalidateCache)(`room-seats:/api/rooms/${result.roomId}/seats`);
        // Emit real-time update
        const io = req.app.get('io');
        io.emit('seatStatusChanged', {
            seatId: result.id,
            roomId: result.roomId,
            status: result.status
        });
        res.json(result);
    }
    catch (error) {
        if (error.message === 'Seat not found') {
            return res.status(404).json({ message: 'Seat not found' });
        }
        if (error.message === 'Conflict') {
            return res.status(409).json({ message: 'Seat has been modified by another user. Please refresh and try again.' });
        }
        console.error('Failed to update seat status:', error);
        res.status(500).json({ error: 'Failed to update seat status' });
    }
}));
exports.default = router;
