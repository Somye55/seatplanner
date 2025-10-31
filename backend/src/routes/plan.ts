
import { Router } from 'express';
import { PrismaClient } from '../generated/prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/plan/allocate
router.post('/allocate', async (req, res) => {
    try {
        // Reset all allocated seats
        await prisma.seat.updateMany({
            where: { status: 'Allocated' },
            data: { status: 'Available', studentId: null }
        });

        // Get available seats sorted by row
        const availableSeats = await prisma.seat.findMany({
            where: { status: 'Available' },
            orderBy: { row: 'asc' }
        });

        // Get students not yet allocated
        const allocatedStudentIds = await prisma.seat.findMany({
            where: { status: 'Allocated' },
            select: { studentId: true }
        }).then(seats => seats.map(s => s.studentId).filter(Boolean));

        const studentsToAllocate = await prisma.student.findMany({
            where: {
                id: { notIn: allocatedStudentIds.filter(Boolean) as string[] }
            }
        });

        let allocatedCount = 0;
        const unallocatedStudents: { student: any; reason: string }[] = [];

        const priorityStudents = studentsToAllocate.filter(s => s.accessibilityNeeds.length > 0);
        const otherStudents = studentsToAllocate.filter(s => s.accessibilityNeeds.length === 0);

        const allocate = async (student: any) => {
            let seatFound = false;
            if (student.accessibilityNeeds.includes('front_row')) {
                const frontRowSeat = availableSeats.find(s => s.row <= 1);
                if (frontRowSeat) {
                    await prisma.seat.update({
                        where: { id: frontRowSeat.id },
                        data: { status: 'Allocated', studentId: student.id }
                    });
                    availableSeats.splice(availableSeats.indexOf(frontRowSeat), 1);
                    allocatedCount++;
                    seatFound = true;
                }
            }

            if (!seatFound && availableSeats.length > 0) {
                const seat = availableSeats.shift()!;
                await prisma.seat.update({
                    where: { id: seat.id },
                    data: { status: 'Allocated', studentId: student.id }
                });
                allocatedCount++;
                seatFound = true;
            }

            if (!seatFound) {
                unallocatedStudents.push({ student, reason: 'No suitable seats available.' });
            }
        };

        for (const student of [...priorityStudents, ...otherStudents]) {
            await allocate(student);
        }

        const totalSeats = await prisma.seat.count({
            where: { status: { not: 'Broken' } }
        });

        const seats = await prisma.seat.findMany();

        const summary = {
            allocatedCount,
            unallocatedCount: unallocatedStudents.length,
            unallocatedStudents,
            utilization: totalSeats > 0 ? (allocatedCount / totalSeats) * 100 : 0
        };

        res.json({ seats, summary });
    } catch (error) {
        res.status(500).json({ error: 'Failed to allocate seats' });
    }
});

export default router;
