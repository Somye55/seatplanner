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
// GET /api/buildings -> list buildings
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const buildings = yield prisma.building.findMany({
            include: {
                _count: {
                    select: { rooms: true }
                }
            }
        });
        const buildingsWithRoomCount = buildings.map(b => ({
            id: b.id,
            name: b.name,
            code: b.code,
            roomCount: b._count.rooms
        }));
        res.json(buildingsWithRoomCount);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch buildings' });
    }
}));
// GET /api/buildings/:id/rooms -> rooms in a building
router.get('/:id/rooms', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const buildingId = req.params.id;
        const buildingRooms = yield prisma.room.findMany({
            where: { buildingId }
        });
        res.json(buildingRooms);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
}));
exports.default = router;
