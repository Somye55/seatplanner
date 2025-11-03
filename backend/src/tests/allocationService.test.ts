// Mock PrismaClient
const mockSeatUpdateMany = jest.fn();
const mockSeatFindMany = jest.fn();
const mockSeatCount = jest.fn();
const mockSeatUpdate = jest.fn();
const mockStudentFindMany = jest.fn();

jest.mock('../../generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    seat: {
      updateMany: mockSeatUpdateMany,
      findMany: mockSeatFindMany,
      count: mockSeatCount,
      update: mockSeatUpdate,
    },
    student: {
      findMany: mockStudentFindMany,
    },
  })),
  SeatStatus: {
    Available: 'Available',
    Allocated: 'Allocated',
    Broken: 'Broken'
  }
}));

import { AllocationService } from '../services/allocationService';

describe('AllocationService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('allocate', () => {
    it('should allocate students to suitable seats', async () => {
      // Arrange: Mock data
      const mockSeats = [
        { id: 's1', status: 'Available', row: 1, features: ['front_row'], studentId: null },
        { id: 's2', status: 'Available', row: 2, features: [], studentId: null },
        { id: 's3', status: 'Available', row: 3, features: ['wheelchair_access'], studentId: null },
      ];
      const mockStudents = [
        { id: 'st1', name: 'Student 1', accessibilityNeeds: ['front_row'] },
        { id: 'st2', name: 'Student 2', accessibilityNeeds: [] },
        { id: 'st3', name: 'Student 3', accessibilityNeeds: ['wheelchair_access'] },
      ];
      
      // Mock Prisma calls
      mockSeatUpdateMany.mockResolvedValue({ count: 0 }); // No seats to reset
      mockSeatFindMany.mockResolvedValueOnce(mockSeats); // available seats
      mockStudentFindMany.mockResolvedValueOnce(mockStudents);
      mockSeatCount.mockResolvedValue(3);
      mockSeatUpdate.mockResolvedValue({}); // Mocks the seat update for allocation
      mockSeatFindMany.mockResolvedValueOnce(mockSeats); // final seats fetch

      // Act
      const { summary } = await AllocationService.allocate();

      // Assert
      expect(mockSeatUpdateMany).toHaveBeenCalledTimes(1);
      expect(mockStudentFindMany).toHaveBeenCalledTimes(1);
      expect(mockSeatUpdate).toHaveBeenCalledTimes(3);
      expect(summary.allocatedCount).toBe(3);
      expect(summary.unallocatedCount).toBe(0);
      expect(summary.utilization).toBe(100);
    });

    it('should leave students unallocated if no suitable seats are available', async () => {
      // Arrange
      const mockSeats = [
        { id: 's1', status: 'Available', row: 1, features: [], studentId: null },
      ];
      const mockStudents = [
        { id: 'st1', name: 'Student 1', accessibilityNeeds: ['front_row'] },
        { id: 'st2', name: 'Student 2', accessibilityNeeds: [] },
      ];
      
      mockSeatUpdateMany.mockResolvedValue({ count: 0 });
      mockSeatFindMany.mockResolvedValueOnce(mockSeats); // available seats
      mockStudentFindMany.mockResolvedValueOnce(mockStudents);
      mockSeatCount.mockResolvedValue(1);
      mockSeatUpdate.mockResolvedValue({});
      mockSeatFindMany.mockResolvedValueOnce(mockSeats); // final seats

      // Act
      const { summary } = await AllocationService.allocate();

      // Assert
      expect(mockSeatUpdate).toHaveBeenCalledTimes(1); // Only Student 2 gets a seat
      expect(summary.allocatedCount).toBe(1);
      expect(summary.unallocatedCount).toBe(1);
      expect(summary.unallocatedStudents[0].student.id).toBe('st1');
    });
  });

  describe('rebalance', () => {
    it('should reallocate unassigned students to available seats', async () => {
      // Arrange
      const mockUnassignedStudents = [
        { id: 'st1', name: 'Student 1', accessibilityNeeds: [] },
      ];
      const mockAvailableSeats = [
        { id: 's1', status: 'Available', row: 1, features: [], studentId: null },
      ];

      mockStudentFindMany.mockResolvedValueOnce(mockUnassignedStudents);
      mockSeatFindMany.mockResolvedValueOnce(mockAvailableSeats); // available seats
      mockSeatUpdate.mockResolvedValue({});
      mockSeatFindMany.mockResolvedValueOnce(mockAvailableSeats); // final seats

      // Act
      const { summary } = await AllocationService.rebalance();
      
      // Assert
      expect(mockStudentFindMany).toHaveBeenCalledWith({ where: { seats: { none: {} } } });
      expect(mockSeatUpdate).toHaveBeenCalledTimes(1);
      expect(summary.reallocatedCount).toBe(1);
      expect(summary.stillUnassignedCount).toBe(0);
    });

    it('should return empty summary if no students are unassigned', async () => {
        // Arrange
        mockStudentFindMany.mockResolvedValueOnce([]); // No unassigned students
        mockSeatFindMany.mockResolvedValueOnce([]); // final seats
  
        // Act
        const { summary } = await AllocationService.rebalance();
        
        // Assert
        expect(mockSeatUpdate).not.toHaveBeenCalled();
        expect(summary.reallocatedCount).toBe(0);
        expect(summary.stillUnassignedCount).toBe(0);
      });
  });
});
