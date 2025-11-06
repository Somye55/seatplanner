// Mock PrismaClient
const mockSeatUpdateMany = jest.fn();
const mockSeatFindMany = jest.fn();
const mockSeatCount = jest.fn();
const mockSeatUpdate = jest.fn();
const mockStudentFindMany = jest.fn();
const mockStudentFindUnique = jest.fn();
const mockRoomFindMany = jest.fn();
const mockRoomFindUnique = jest.fn();
const mockRoomUpdate = jest.fn();
const mockTransaction = jest.fn();

jest.mock("../../generated/prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    seat: {
      updateMany: mockSeatUpdateMany,
      findMany: mockSeatFindMany,
      count: mockSeatCount,
      update: mockSeatUpdate,
    },
    student: {
      findMany: mockStudentFindMany,
      findUnique: mockStudentFindUnique,
    },
    room: {
      findMany: mockRoomFindMany,
      findUnique: mockRoomFindUnique,
      update: mockRoomUpdate,
    },
    $transaction: mockTransaction,
  })),
  SeatStatus: {
    Available: "Available",
    Allocated: "Allocated",
    Broken: "Broken",
  },
  Branch: {
    ConsultingClub: "ConsultingClub",
    InvestmentBankingClub: "InvestmentBankingClub",
    TechAndInnovationClub: "TechAndInnovationClub",
    EntrepreneurshipCell: "EntrepreneurshipCell",
    SustainabilityAndCSRClub: "SustainabilityAndCSRClub",
    WomenInBusiness: "WomenInBusiness",
    HealthcareManagementClub: "HealthcareManagementClub",
    RealEstateClub: "RealEstateClub",
  },
}));

import { AllocationService } from "../services/allocationService";
import { Branch } from "../../generated/prisma/client";

describe("AllocationService", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe("allocateBranchToRoom", () => {
    it("should allocate students to suitable seats in a room", async () => {
      // Arrange: Mock data
      const mockRoom = { id: "room1", version: 1, branchAllocated: null };
      const mockSeats = [
        {
          id: "s1",
          status: "Available",
          row: 1,
          features: ["front_seat"],
          studentId: null,
          roomId: "room1",
          version: 1,
        },
        {
          id: "s2",
          status: "Available",
          row: 2,
          features: [],
          studentId: null,
          roomId: "room1",
          version: 1,
        },
        {
          id: "s3",
          status: "Available",
          row: 3,
          features: ["wheelchair_access"],
          studentId: null,
          roomId: "room1",
          version: 1,
        },
      ];
      const mockStudents = [
        {
          id: "st1",
          name: "Student 1",
          accessibilityNeeds: ["front_seat"],
          branch: Branch.ConsultingClub,
        },
        {
          id: "st2",
          name: "Student 2",
          accessibilityNeeds: [],
          branch: Branch.ConsultingClub,
        },
        {
          id: "st3",
          name: "Student 3",
          accessibilityNeeds: ["wheelchair_access"],
          branch: Branch.ConsultingClub,
        },
      ];

      // Mock transaction to execute the callback with mock tx
      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          room: {
            findUnique: jest.fn().mockResolvedValue(mockRoom),
            update: jest.fn().mockResolvedValue({}),
          },
          student: {
            findMany: jest.fn().mockResolvedValue(mockStudents),
          },
          seat: {
            findMany: jest.fn().mockResolvedValue(mockSeats),
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return await callback(mockTx);
      });

      // Act
      const { summary } = await AllocationService.allocateBranchToRoom(
        Branch.ConsultingClub,
        "room1"
      );

      // Assert
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(summary.allocatedCount).toBe(3);
      expect(summary.unallocatedCount).toBe(0);
      expect(summary.affectedRoomIds).toEqual(["room1"]);
    });

    it("should leave students unallocated if no suitable seats are available", async () => {
      // Arrange
      const mockRoom = { id: "room1", version: 1, branchAllocated: null };
      const mockSeats = [
        {
          id: "s1",
          status: "Available",
          row: 1,
          features: [],
          studentId: null,
          roomId: "room1",
          version: 1,
        },
      ];
      const mockStudents = [
        {
          id: "st1",
          name: "Student 1",
          accessibilityNeeds: ["front_seat"],
          branch: Branch.ConsultingClub,
        },
        {
          id: "st2",
          name: "Student 2",
          accessibilityNeeds: [],
          branch: Branch.ConsultingClub,
        },
      ];

      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          room: {
            findUnique: jest.fn().mockResolvedValue(mockRoom),
            update: jest.fn().mockResolvedValue({}),
          },
          student: {
            findMany: jest.fn().mockResolvedValue(mockStudents),
          },
          seat: {
            findMany: jest.fn().mockResolvedValue(mockSeats),
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return await callback(mockTx);
      });

      // Act
      const { summary } = await AllocationService.allocateBranchToRoom(
        Branch.ConsultingClub,
        "room1"
      );

      // Assert
      expect(summary.allocatedCount).toBe(1); // Only Student 2 gets a seat
      expect(summary.unallocatedCount).toBe(1);
      expect(summary.unallocatedStudents[0].student.id).toBe("st1");
    });
  });

  describe("reallocateStudent", () => {
    it("should reallocate a student to an available seat", async () => {
      // Arrange
      const mockStudent = {
        id: "st1",
        name: "Student 1",
        accessibilityNeeds: [],
        branch: Branch.ConsultingClub,
      };
      const mockAvailableSeats = [
        {
          id: "s1",
          status: "Available",
          row: 1,
          features: [],
          studentId: null,
          roomId: "room2",
          version: 1,
          room: { id: "room2", branchAllocated: null, version: 1 },
        },
      ];

      mockStudentFindUnique.mockResolvedValueOnce(mockStudent);
      mockSeatFindMany.mockResolvedValueOnce(mockAvailableSeats);

      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          seat: {
            findUnique: jest.fn().mockResolvedValue(mockAvailableSeats[0]),
            update: jest.fn().mockResolvedValue({}),
          },
          room: {
            findUnique: jest.fn().mockResolvedValue(mockAvailableSeats[0].room),
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return await callback(mockTx);
      });

      // Act
      const result = await AllocationService.reallocateStudent(
        "st1",
        "building1",
        "room1"
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.student).toEqual(mockStudent);
      expect(result.message).toBe("Student reallocated successfully");
    });

    it("should return failure if no suitable seats are available", async () => {
      // Arrange
      const mockStudent = {
        id: "st1",
        name: "Student 1",
        accessibilityNeeds: ["front_seat"],
        branch: Branch.ConsultingClub,
      };

      mockStudentFindUnique.mockResolvedValueOnce(mockStudent);
      mockSeatFindMany.mockResolvedValueOnce([]); // No available seats

      // Act
      const result = await AllocationService.reallocateStudent(
        "st1",
        "building1",
        "room1"
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "No suitable seats available for reallocation in this building."
      );
    });
  });
});
