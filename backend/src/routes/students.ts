
import { Router } from 'express';
import { PrismaClient } from '../generated/prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/students
router.get('/', async (req, res) => {
    try {
        const students = await prisma.student.findMany();
        res.json(students);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

// POST /api/students
router.post('/', async (req, res) => {
    try {
        const studentData = req.body;
        const newStudent = await prisma.student.create({
            data: studentData
        });
        res.status(201).json(newStudent);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create student' });
    }
});

// PATCH /api/students/:id
router.patch('/:id', async (req, res) => {
    try {
        const updatedStudent = await prisma.student.update({
            where: { id: req.params.id },
            data: req.body
        });
        res.json(updatedStudent);
    } catch (error: any) {
        if (error.code === 'P2025') {
            res.status(404).json({ message: 'Student not found' });
        } else {
            res.status(500).json({ error: 'Failed to update student' });
        }
    }
});

// DELETE /api/students/:id
router.delete('/:id', async (req, res) => {
    try {
        await prisma.student.delete({
            where: { id: req.params.id }
        });
        res.status(204).send();
    } catch (error: any) {
        if (error.code === 'P2025') {
            res.status(404).json({ message: 'Student not found' });
        } else {
            res.status(500).json({ error: 'Failed to delete student' });
        }
    }
});

export default router;
