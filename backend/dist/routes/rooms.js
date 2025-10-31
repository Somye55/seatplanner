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
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// GET /api/rooms/:id
router.get('/:id', [
    (0, express_validator_1.param)('id').isUUID()
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
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
// POST /api/rooms -> create room
router.post('/', [
    auth_1.authenticateToken,
    auth_1.requireAdmin,
    (0, express_validator_1.body)('buildingId').isUUID(),
    (0, express_validator_1.body)('name').isLength({ min: 1 }),
    (0, express_validator_1.body)('capacity').isInt({ min: 1 })
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { buildingId, name, capacity } = req.body;
        const building = yield prisma.building.findUnique({
            where: { id: buildingId }
        });
        if (!building) {
            return res.status(404).json({ error: 'Building not found' });
        }
        const room = yield prisma.room.create({
            data: { buildingId, name, capacity }
        });
        yield (0, cache_1.invalidateCache)('buildings');
        res.status(201).json(room);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create room' });
    }
}));
// GET /api/rooms/:id/seats
router.get('/:id/seats', [
    (0, express_validator_1.param)('id').isUUID()
], (0, cache_1.cacheMiddleware)('room-seats'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
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
