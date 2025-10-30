
import { Router } from 'express';
import { students } from '../data';
import { Student } from '../../types';

const router = Router();

// GET /api/students
router.get('/', (req, res) => {
    res.json(students);
});

// POST /api/students
router.post('/', (req, res) => {
    const studentData: Omit<Student, 'id'> = req.body;
    const newStudent: Student = { ...studentData, id: `st${Date.now()}` };
    students.push(newStudent);
    res.status(201).json(newStudent);
});

// PATCH /api/students/:id
router.patch('/:id', (req, res) => {
    const studentIndex = students.findIndex(s => s.id === req.params.id);
    if (studentIndex > -1) {
        students[studentIndex] = { ...students[studentIndex], ...req.body };
        res.json(students[studentIndex]);
    } else {
        res.status(404).json({ message: 'Student not found' });
    }
});

// DELETE /api/students/:id
router.delete('/:id', (req, res) => {
    const initialLength = students.length;
    const studentIndex = students.findIndex(s => s.id === req.params.id);
    if (studentIndex > -1) {
        students.splice(studentIndex, 1);
        res.status(204).send();
    } else {
        res.status(404).json({ message: 'Student not found' });
    }
});

export default router;
