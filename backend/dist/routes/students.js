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
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// GET /api/students
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const students = yield prisma.student.findMany();
        res.json(students);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch students' });
    }
}));
// POST /api/students
router.post('/', [
    (0, express_validator_1.body)('name').isString().notEmpty(),
    (0, express_validator_1.body)('email').isEmail(),
    (0, express_validator_1.body)('tags').isArray(),
    (0, express_validator_1.body)('accessibilityNeeds').isArray()
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const studentData = req.body;
        const newStudent = yield prisma.student.create({
            data: studentData
        });
        res.status(201).json(newStudent);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create student' });
    }
}));
// PATCH /api/students/:id
router.patch('/:id', [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('name').optional().isString().notEmpty(),
    (0, express_validator_1.body)('email').optional().isEmail(),
    (0, express_validator_1.body)('tags').optional().isArray(),
    (0, express_validator_1.body)('accessibilityNeeds').optional().isArray()
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const updatedStudent = yield prisma.student.update({
            where: { id: req.params.id },
            data: req.body
        });
        res.json(updatedStudent);
    }
    catch (error) {
        if (error.code === 'P2025') {
            res.status(404).json({ message: 'Student not found' });
        }
        else {
            res.status(500).json({ error: 'Failed to update student' });
        }
    }
}));
// DELETE /api/students/:id
router.delete('/:id', [
    (0, express_validator_1.param)('id').isUUID()
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        yield prisma.student.delete({
            where: { id: req.params.id }
        });
        res.status(204).send();
    }
    catch (error) {
        if (error.code === 'P2025') {
            res.status(404).json({ message: 'Student not found' });
        }
        else {
            res.status(500).json({ error: 'Failed to delete student' });
        }
    }
}));
exports.default = router;
