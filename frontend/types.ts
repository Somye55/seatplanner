
export enum SeatStatus {
  Available = 'available',
  Allocated = 'allocated',
  Broken = 'broken',
}

export interface Student {
  id: string;
  name: string;
  email: string;
  tags: string[];
  accessibilityNeeds: string[];
}

export interface Seat {
  id: string;
  roomId: string;
  label: string;
  row: number;
  col: number;
  status: SeatStatus;
  studentId?: string;
}

export interface Room {
  id: string;
  buildingId: string;
  name: string;
  capacity: number;
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
  utilization: number;
}