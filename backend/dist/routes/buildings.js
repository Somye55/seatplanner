"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const data_1 = require("../data");
const router = (0, express_1.Router)();
// GET /api/buildings -> list buildings
router.get('/', (req, res) => {
    const buildingsWithRoomCount = data_1.buildings.map(b => (Object.assign(Object.assign({}, b), { roomCount: data_1.rooms.filter(r => r.buildingId === b.id).length })));
    res.json(buildingsWithRoomCount);
});
// GET /api/buildings/:id/rooms -> rooms in a building
router.get('/:id/rooms', (req, res) => {
    const buildingId = req.params.id;
    const buildingRooms = data_1.rooms.filter(r => r.buildingId === buildingId);
    res.json(buildingRooms);
});
exports.default = router;
