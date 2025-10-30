"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const data_1 = require("../data");
const types_1 = require("../../types");
const router = (0, express_1.Router)();
// PATCH /api/seats/:id/status
router.patch('/:id/status', (req, res) => {
    const { status } = req.body;
    const seat = data_1.seats.find(s => s.id === req.params.id);
    if (seat) {
        seat.status = status;
        if (status !== types_1.SeatStatus.Allocated) {
            seat.studentId = undefined;
        }
        res.json(seat);
    }
    else {
        res.status(404).json({ message: 'Seat not found' });
    }
});
exports.default = router;
