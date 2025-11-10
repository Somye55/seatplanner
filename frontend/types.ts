export enum SeatStatus {
  Available = "Available",
  Allocated = "Allocated",
  Broken = "Broken",
}

export enum Branch {
  ConsultingClub = "ConsultingClub",
  InvestmentBankingClub = "InvestmentBankingClub",
  TechAndInnovationClub = "TechAndInnovationClub",
  EntrepreneurshipCell = "EntrepreneurshipCell",
  SustainabilityAndCSRClub = "SustainabilityAndCSRClub",
  WomenInBusiness = "WomenInBusiness",
  HealthcareManagementClub = "HealthcareManagementClub",
  RealEstateClub = "RealEstateClub",
}

export const BRANCH_OPTIONS = [
  { id: Branch.ConsultingClub, label: "Consulting Club" },
  { id: Branch.InvestmentBankingClub, label: "Investment Banking Club" },
  { id: Branch.TechAndInnovationClub, label: "Tech & Innovation Club" },
  { id: Branch.EntrepreneurshipCell, label: "Entrepreneurship Cell" },
  { id: Branch.SustainabilityAndCSRClub, label: "Sustainability & CSR Club" },
  { id: Branch.WomenInBusiness, label: "Women in Business" },
  { id: Branch.HealthcareManagementClub, label: "Healthcare Management Club" },
  { id: Branch.RealEstateClub, label: "Real Estate Club" },
];

export interface User {
  id: string;
  email: string;
  role: "Admin" | "Student" | "Teacher";
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  branch: Branch;
  tags: string[];
  accessibilityNeeds: string[];
  seats?: Seat[];
}

export interface Seat {
  id: string;
  roomId: string;
  label: string;
  row: number;
  col: number;
  status: SeatStatus;
  studentId?: string;
  features: string[];
  version: number;
  room?: Room & {
    bookings?: RoomBooking[];
  };
}

export interface Room {
  id: string;
  buildingId: string;
  floorId: string;
  name: string;
  capacity: number;
  rows: number;
  cols: number;
  claimed: number;
  distance: number;
  branchAllocated?: Branch;
  building?: Building;
  floor?: Floor;
  version: number;
}

export interface Building {
  id: string;
  name: string;
  code: string;
  blockId: string;
  distance: number;
  block?: Block;
  roomCount?: number;
}

export interface AllocationSummary {
  allocatedCount: number;
  unallocatedCount: number;
  unallocatedStudents: { student: Student; reason: string }[];
  utilization?: number;
  affectedRoomIds?: string[];
  branchAllocated?: string;
  availableSeatsAfterAllocation?: number;
  roomsAllocated?: number;
}

// Teacher and Room Booking Types
export interface Teacher {
  id: string;
  name: string;
  email: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export enum BookingStatus {
  NotStarted = "NotStarted",
  Ongoing = "Ongoing",
  Completed = "Completed",
}

export interface RoomBooking {
  id: string;
  roomId: string;
  teacherId: string;
  branch: Branch;
  capacity: number;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  room?: Room;
  teacher?: Teacher;
  createdAt: string;
  updatedAt: string;
}

// Location Hierarchy Types
export interface Block {
  id: string;
  name: string;
  code: string;
  distance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Floor {
  id: string;
  buildingId: string;
  name: string;
  number: number;
  distance: number;
  building?: Building;
  createdAt: string;
  updatedAt: string;
}

// Room Search and Recommendation Types
export interface SearchCriteria {
  capacity: number;
  branch: Branch;
  startTime: string;
  endTime: string;
  currentLocation: {
    blockId?: string;
    buildingId?: string;
    floorId?: string;
  };
  preferredLocation?: {
    blockId?: string;
    buildingId?: string;
    floorId?: string;
  };
}

export interface RoomRecommendation {
  room: Room & {
    floor: Floor & {
      building: Building & { block: Block };
    };
  };
  distance: number;
  score: number;
}
