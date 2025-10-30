"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const data_1 = require("../data");
const router = (0, express_1.Router)();
// GET /api/rooms/:id
router.get('/:id', (req, res) => {
    const room = data_1.rooms.find(r => r.id === req.params.id);
    if (room) {
        res.json(room);
    }
    else {
        res.status(404).json({ message: 'Room not found' });
    }
});
// GET /api/rooms/:id/seats
router.get('/:id/seats', (req, res) => {
    const roomSeats = data_1.seats.filter(s => s.roomId === req.params.id);
    res.json(roomSeats);
});
exports.default = router;
