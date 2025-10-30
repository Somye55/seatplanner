
import { Router } from 'express';
import { seats, students } from '../data';
import { SeatStatus, AllocationSummary, Student } from '../../types';

const router = Router();

// POST /api/plan/allocate
router.post('/allocate', (req, res) => {
    seats.forEach(seat => {
        if (seat.status === SeatStatus.Allocated) {
            seat.status = SeatStatus.Available;
            seat.studentId = undefined;
        }
    });

    const availableSeats = seats.filter(s => s.status === SeatStatus.Available).sort((a,b) => a.row - b.row);
    const studentsToAllocate = students.filter(student => !seats.find(s => s.studentId === student.id));

    let allocatedCount = 0;
    const unallocatedStudents: { student: Student; reason: string }[] = [];

    const priorityStudents = studentsToAllocate.filter(s => s.accessibilityNeeds.length > 0);
    const otherStudents = studentsToAllocate.filter(s => s.accessibilityNeeds.length === 0);

    const allocate = (student: Student) => {
        let seatFound = false;
        if(student.accessibilityNeeds.includes('front_row')) {
            const frontRowSeatIndex = availableSeats.findIndex(s => s.row <= 1);
            if (frontRowSeatIndex !== -1) {
                const seat = availableSeats.splice(frontRowSeatIndex, 1)[0];
                seat.status = SeatStatus.Allocated;
                seat.studentId = student.id;
                allocatedCount++;
                seatFound = true;
            }
        }
        
        if (!seatFound && availableSeats.length > 0) {
            const seat = availableSeats.shift()!;
            seat.status = SeatStatus.Allocated;
            seat.studentId = student.id;
            allocatedCount++;
            seatFound = true;
        }

        if(!seatFound) {
            unallocatedStudents.push({student, reason: 'No suitable seats available.'});
        }
    };
    
    [...priorityStudents, ...otherStudents].forEach(allocate);

    const totalSeats = seats.filter(s => s.status !== SeatStatus.Broken).length;
    const summary: AllocationSummary = {
        allocatedCount,
        unallocatedCount: unallocatedStudents.length,
        unallocatedStudents,
        utilization: totalSeats > 0 ? (allocatedCount / totalSeats) * 100 : 0
    };
    
    res.json({ seats: JSON.parse(JSON.stringify(seats)), summary });
});

export default router;
