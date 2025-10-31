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
// GET /api/rooms/:id
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const room = yield prisma.room.findUnique({
            where: { id: req.params.id }
        });
        if (room) {
            res.json(room);
        }
        else {
            res.status(404).json({ message: 'Room not found' });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch room' });
    }
}));
// GET /api/rooms/:id/seats
router.get('/:id/seats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const roomSeats = yield prisma.seat.findMany({
            where: { roomId: req.params.id }
        });
        res.json(roomSeats);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch seats' });
    }
}));
exports.default = router;
