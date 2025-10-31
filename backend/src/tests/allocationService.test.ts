// Mock PrismaClient
const mockUpdateMany = jest.fn();
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockUpdate = jest.fn();
const mockStudentFindMany = jest.fn();

jest.mock('../generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    seat: {
      updateMany: mockUpdateMany,
      findMany: mockFindMany,
      count: mockCount,
      update: mockUpdate,
    },
    student: {
      findMany: mockStudentFindMany,
    },
  })),
}));

import { PrismaClient } from '../generated/prisma/client';
import { AllocationService } from '../services/allocationService';

const mockPrisma = new PrismaClient();

describe('AllocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('allocate', () => {
    it('should allocate seats successfully with sufficient seats', async () => {
      // Mock data
      const mockSeats = [
        { id: '1', status: 'Available', row: 1, features: ['front_row'], studentId: null },
        { id: '2', status: 'Available', row: 2, features: [], studentId: null },
      ];
      const mockStudents = [
        { id: 's1', name: 'Student 1', accessibilityNeeds: ['front_row'] },
        { id: 's2', name: 'Student 2', accessibilityNeeds: [] },
      ];

      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockFindMany
        .mockResolvedValueOnce([]) // allocated seats
        .mockResolvedValueOnce(mockSeats) // available seats
        .mockResolvedValueOnce(mockSeats); // final seats
      mockStudentFindMany.mockResolvedValue(mockStudents);
      mockCount.mockResolvedValue(2);
      mockUpdate.mockResolvedValue({});

      const result = await AllocationService.allocate();

      expect(result.summary.allocatedCount).toBe(2);
      expect(result.summary.unallocatedCount).toBe(0);
      expect(result.summary.utilization).toBe(100);
    });

    it('should handle insufficient seats', async () => {
      const mockSeats = [{ id: '1', status: 'Available', row: 1, features: [], studentId: null }];
      const mockStudents = [
        { id: 's1', name: 'Student 1', accessibilityNeeds: [] },
        { id: 's2', name: 'Student 2', accessibilityNeeds: [] },
      ];

      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockSeats)
        .mockResolvedValueOnce(mockSeats);
      mockStudentFindMany.mockResolvedValue(mockStudents);
      mockCount.mockResolvedValue(1);
      mockUpdate.mockResolvedValue({});

      const result = await AllocationService.allocate();

      expect(result.summary.allocatedCount).toBe(1);
      expect(result.summary.unallocatedCount).toBe(1);
      expect(result.summary.utilization).toBe(100);
    });

    it('should handle students with accessibility needs', async () => {
      const mockSeats = [
        { id: '1', status: 'Available', row: 1, features: ['front_row'], studentId: null },
        { id: '2', status: 'Available', row: 2, features: [], studentId: null },
      ];
      const mockStudents = [
        { id: 's1', name: 'Student 1', accessibilityNeeds: ['front_row'] },
        { id: 's2', name: 'Student 2', accessibilityNeeds: ['nonexistent'] },
      ];

      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockSeats)
        .mockResolvedValueOnce(mockSeats);
      mockStudentFindMany.mockResolvedValue(mockStudents);
      mockCount.mockResolvedValue(2);
      mockUpdate.mockResolvedValue({});

      const result = await AllocationService.allocate();

      expect(result.summary.allocatedCount).toBe(1);
      expect(result.summary.unallocatedCount).toBe(1);
    });
  });

  describe('rebalance', () => {
    it('should rebalance unassigned students', async () => {
      const mockUnassignedStudents = [{ id: 's1', name: 'Student 1', accessibilityNeeds: [] }];
      const mockAvailableSeats = [{ id: '1', status: 'Available', row: 1, features: [], studentId: null }];

      mockStudentFindMany.mockResolvedValue(mockUnassignedStudents);
      mockFindMany
        .mockResolvedValueOnce(mockAvailableSeats)
        .mockResolvedValueOnce(mockAvailableSeats);
      mockUpdate.mockResolvedValue({});

      const result = await AllocationService.rebalance();

      expect(result.rebalanceSummary.reallocatedCount).toBe(1);
      expect(result.rebalanceSummary.stillUnassignedCount).toBe(0);
    });
  });
});