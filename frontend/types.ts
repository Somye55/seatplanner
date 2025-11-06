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
  role: "Admin" | "Student";
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
  room?: Room;
}

export interface Room {
  id: string;
  buildingId: string;
  name: string;
  capacity: number;
  rows: number;
  cols: number;
  claimed: number;
  branchAllocated?: Branch;
  building?: Building;
  version: number;
}

export interface Building {
  id: string;
  name: string;
  code: string;
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
