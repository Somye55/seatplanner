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
  query('buildingId').optional().isString().notEmpty(),
  query('roomId').optional().isString().notEmpty()
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { buildingId, roomId } = req.query;

  // Must provide either buildingId or roomId
  if (!buildingId && !roomId) {
    return res.status(400).json({ error: 'Either buildingId or roomId must be provided' });
  }

  try {
    // Find branches that have unallocated students
    const branchesWithUnallocatedStudents = await prisma.student.groupBy({
        by: ['branch'],
        where: {
          seats: {
            none: {}
          }
        },
        _count: { _all: true },
    });
    const branchesWithStudentsSet = new Set(
      branchesWithUnallocatedStudents
        .filter(sc => sc._count._all > 0)
        .map(sc => sc.branch)
    );

    let eligibleBranches: Branch[];

    if (roomId) {
      // Room-level allocation
      const room = await prisma.room.findUnique({
        where: { id: roomId as string }
      });

      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      if (room.branchAllocated) {
        // Room is already allocated - only that branch is eligible if it has unallocated students
        eligibleBranches = branchesWithStudentsSet.has(room.branchAllocated) 
          ? [room.branchAllocated] 
          : [];
      } else {
        // Room is unallocated - any branch with unallocated students is eligible
        eligibleBranches = Array.from(branchesWithStudentsSet);
      }
    } else {
      // Building-level allocation
      // Find branches already allocated to OTHER buildings (not the current one)
      const allocatedRoomsInOtherBuildings = await prisma.room.findMany({
        where: {
          buildingId: { not: buildingId as string },
          branchAllocated: { not: null }
        },
        select: { branchAllocated: true },
        distinct: ['branchAllocated']
      });
      const allocatedBranchesInOtherBuildings = new Set(
          allocatedRoomsInOtherBuildings
              .map(r => r.branchAllocated)
              .filter((b): b is Branch => b !== null)
      );

      // A branch is eligible if:
      // - It has unallocated students AND
      // - It's NOT allocated to other buildings (but can be allocated to the current building)
      const allBranches = Object.values(Branch);
      eligibleBranches = allBranches.filter(branch => 
          branchesWithStudentsSet.has(branch) && !allocatedBranchesInOtherBuildings.has(branch)
      );
    }

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
  param('id').isString().notEmpty(),
  query('version').optional().isInt({ min: 0 })
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const allocationId = req.params.id;
    const version = req.query.version ? parseInt(req.query.version as string) : undefined;

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

    if (version !== undefined && allocation.version !== version) {
      return res.status(409).json({ 
        message: 'Seat has been modified by another user. Please refresh and try again.',
        currentSeat: {
          id: allocation.id,
          status: allocation.status,
          version: allocation.version,
          studentId: allocation.studentId
        }
      });
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Update seat to available and remove student assignment
      await tx.seat.update({
        where: { 
          id: allocationId,
          version: allocation.version
        },
        data: {
          status: 'Available',
          studentId: null,
          version: { increment: 1 }
        }
      });

      // Decrement claimed count on the room with version check
      await tx.room.update({
        where: { 
          id: allocation.roomId,
          version: allocation.room.version
        },
        data: { 
          claimed: { decrement: 1 },
          version: { increment: 1 }
        }
      });
    });

    // Invalidate cache for the room's seats
    await import('../middleware/cache').then(({ invalidateCache }) =>
      invalidateCache(`room-seats:/api/rooms/${allocation.roomId}/seats`)
    );

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('seatUpdated', { id: allocationId, status: 'Available', studentId: null });
      io.emit('roomUpdated');
    }

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(409).json({ 
        message: 'Seat or room has been modified by another user. Please refresh and try again.'
      });
    }
    console.error('Failed to unassign allocation:', error);
    res.status(500).json({ error: 'Failed to unassign allocation' });
  }
});

export default router;
