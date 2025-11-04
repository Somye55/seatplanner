import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { PrismaClient, Branch } from '../../generated/prisma/client';
import { authenticateToken, requireAdmin, AuthRequest } from './auth';

const router = Router();
const prisma = new PrismaClient();


// GET /api/students/me - gets current student profile
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const student = await prisma.student.findUnique({
            where: { email: req.user.email },
            include: { 
                seats: {
                    include: {
                        room: {
                            include: {
                                building: true
                            }
                        }
                    }
                }
            }
        });

        if (!student) {
            return res.status(404).json({ error: 'Student profile not found' });
        }
        res.json(student);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch student profile' });
    }
});

// PUT /api/students/me - updates current student profile
router.put('/me', [
    authenticateToken,
    body('name').optional().isString().notEmpty(),
    body('accessibilityNeeds').optional().isArray()
], async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const { name, accessibilityNeeds } = req.body;
        const student = await prisma.student.findUnique({ where: { email: req.user.email } });
        if (!student) {
            return res.status(404).json({ error: 'Student profile not found' });
        }
        
        const dataToUpdate: { name?: string; accessibilityNeeds?: string[] } = {};
        if (name) dataToUpdate.name = name;
        if (accessibilityNeeds) dataToUpdate.accessibilityNeeds = accessibilityNeeds;

        const updatedStudent = await prisma.student.update({
            where: { email: req.user.email },
            data: dataToUpdate
        });
        res.json(updatedStudent);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update student profile' });
    }
});


// GET /api/students
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const students = await prisma.student.findMany({
            include: {
                seats: {
                    include: {
                        room: { include: { building: true } }
                    }
                }
            }
        });
        res.json(students);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

// POST /api/students
router.post('/', authenticateToken, requireAdmin, [
  body('name').isString().notEmpty(),
  body('email').isEmail(),
  body('branch').isIn(Object.values(Branch)).withMessage('A valid branch is required.'),
  body('tags').isArray(),
  body('accessibilityNeeds').isArray()
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
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
router.patch('/:id', authenticateToken, requireAdmin, [
  param('id').isString().notEmpty(),
  body('name').optional().isString().notEmpty(),
  body('email').optional().isEmail(),
  body('branch').optional().isIn(Object.values(Branch)),
  body('tags').optional().isArray(),
  body('accessibilityNeeds').optional().isArray()
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
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
router.delete('/:id', authenticateToken, requireAdmin, [
  param('id').isString().notEmpty()
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
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
