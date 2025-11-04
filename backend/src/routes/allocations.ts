import { Router, Request, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import { PrismaClient, Branch } from '../../generated/prisma/client';
import { authenticateToken, requireAdmin } from './auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/allocations/eligible-branches
router.get('/eligible-branches', [
  authenticateToken,
  requireAdmin,
  query('buildingId').isString().notEmpty()
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { buildingId } = req.query;

  try {
    // 1. Find branches already allocated to OTHER buildings
    const allocatedRoomsInOtherBuildings = await prisma.room.findMany({
      where: {
        buildingId: { not: buildingId as string },
        branchAllocated: { not: null }
      },
      select: { branchAllocated: true },
      distinct: ['branchAllocated']
    });
    const allocatedBranchesSet = new Set(
        allocatedRoomsInOtherBuildings
            .map(r => r.branchAllocated)
            .filter((b): b is Branch => b !== null)
    );

    // 2. Find branches that have students
    const studentCounts = await prisma.student.groupBy({
        by: ['branch'],
        _count: { _all: true },
    });
    const branchesWithStudentsSet = new Set(studentCounts.map(sc => sc.branch));

    // 3. Determine eligible branches
    const allBranches = Object.values(Branch);
    const eligibleBranches = allBranches.filter(branch => 
        !allocatedBranchesSet.has(branch) && branchesWithStudentsSet.has(branch)
    );

    res.json(eligibleBranches);

  } catch (error) {
    console.error('Failed to fetch eligible branches:', error);
    res.status(500).json({ error: 'Failed to fetch eligible branches' });
  }
});

// GET /api/allocations -> query allocations (by studentId/roomId)
router.get('/', [
  authenticateToken,
  requireAdmin,
  query('studentId').optional().isString().notEmpty(),
  query('roomId').optional().isString().notEmpty()
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { studentId, roomId } = req.query;

    let whereClause: any = {
      status: 'Allocated',
      studentId: { not: null }
    };

    if (studentId) {
      whereClause.studentId = studentId;
    }

    if (roomId) {
      whereClause.roomId = roomId;
    }

    const allocations = await prisma.seat.findMany({
      where: whereClause,
      include: {
        student: true,
        room: {
          include: {
            building: true
          }
        }
      }
    });

    const formattedAllocations = allocations.map(allocation => ({
      id: allocation.id,
      studentId: allocation.studentId,
      studentName: allocation.student?.name,
      studentEmail: allocation.student?.email,
      roomId: allocation.roomId,
      roomName: allocation.room?.name,
      buildingName: allocation.room?.building?.name,
      seatLabel: allocation.label,
      allocatedAt: allocation.updatedAt // Assuming updatedAt reflects allocation time
    }));

    res.json(formattedAllocations);
  } catch (error) {
    console.error('Failed to fetch allocations:', error);
    res.status(500).json({ error: 'Failed to fetch allocations' });
  }
});

// DELETE /api/allocations/:id -> unassign
router.delete('/:id', [
  authenticateToken,
  requireAdmin,
  param('id').isString().notEmpty()
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const allocationId = req.params.id;

    const allocation = await prisma.seat.findUnique({
      where: { id: allocationId },
      include: { room: true }
    });

    if (!allocation) {
      return res.status(404).json({ error: 'Allocation not found' });
    }

    if (allocation.status !== 'Allocated' || !allocation.studentId) {
      return res.status(400).json({ error: 'Seat is not allocated' });
    }

    // Update seat to available and remove student assignment
    const updatedSeat = await prisma.seat.update({
      where: { id: allocationId },
      data: {
        status: 'Available',
        studentId: null,
        version: { increment: 1 }
      }
    });

    // Decrement claimed count on the room
    await prisma.room.update({
      where: { id: allocation.roomId },
      data: { claimed: { decrement: 1 } }
    });

    // Invalidate cache for the room's seats
    await import('../middleware/cache').then(({ invalidateCache }) =>
      invalidateCache(`room-seats:/api/rooms/${allocation.roomId}/seats`)
    );

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('seatUpdated', updatedSeat);
    }

    res.status(204).send();
  } catch (error) {
    console.error('Failed to unassign allocation:', error);
    res.status(500).json({ error: 'Failed to unassign allocation' });
  }
});

export default router;
