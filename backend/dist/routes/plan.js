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
const allocationService_1 = require("../services/allocationService");
const router = (0, express_1.Router)();
// POST /api/plan/allocate
router.post('/allocate', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { seats, summary } = yield allocationService_1.AllocationService.allocate();
        // Emit an event to all clients that the plan has been updated
        const io = req.app.get('io');
        io.emit('planUpdated', { seats, summary });
        res.json({ summary });
    }
    catch (error) {
        console.error("Allocation failed:", error);
        res.status(500).json({ error: 'Failed to allocate seats' });
    }
}));
// POST /api/plan/rebalance
router.post('/rebalance', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { seats, summary } = yield allocationService_1.AllocationService.rebalance();
        // Emit an event to all clients that the plan has been updated
        const io = req.app.get('io');
        io.emit('planUpdated', { seats, summary });
        res.json({ summary });
    }
    catch (error) {
        console.error("Rebalance failed:", error);
        res.status(500).json({ error: 'Failed to rebalance allocations' });
    }
}));
exports.default = router;
