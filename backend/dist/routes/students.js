"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const data_1 = require("../data");
const router = (0, express_1.Router)();
// GET /api/students
router.get('/', (req, res) => {
    res.json(data_1.students);
});
// POST /api/students
router.post('/', (req, res) => {
    const studentData = req.body;
    const newStudent = Object.assign(Object.assign({}, studentData), { id: `st${Date.now()}` });
    data_1.students.push(newStudent);
    res.status(201).json(newStudent);
});
// PATCH /api/students/:id
router.patch('/:id', (req, res) => {
    const studentIndex = data_1.students.findIndex(s => s.id === req.params.id);
    if (studentIndex > -1) {
        data_1.students[studentIndex] = Object.assign(Object.assign({}, data_1.students[studentIndex]), req.body);
        res.json(data_1.students[studentIndex]);
    }
    else {
        res.status(404).json({ message: 'Student not found' });
    }
});
// DELETE /api/students/:id
router.delete('/:id', (req, res) => {
    const initialLength = data_1.students.length;
    const studentIndex = data_1.students.findIndex(s => s.id === req.params.id);
    if (studentIndex > -1) {
        data_1.students.splice(studentIndex, 1);
        res.status(204).send();
    }
    else {
        res.status(404).json({ message: 'Student not found' });
    }
});
exports.default = router;
