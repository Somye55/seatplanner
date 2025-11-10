import { GoogleGenAI } from "@google/genai";
import {
  Building,
  Room,
  Seat,
  Student,
  SeatStatus,
  AllocationSummary,
  Branch,
  Teacher,
  RoomBooking,
  Block,
  Floor,
  SearchCriteria,
  RoomRecommendation,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

// Custom error class for conflicts
export class ConflictError extends Error {
  currentData: any;

  constructor(message: string, currentData: any) {
    super(message);
    this.name = "ConflictError";
    this.currentData = currentData;
  }
}

// Custom error class for API errors with structured data
export class ApiError extends Error {
  code?: string;
  details?: any;
  statusCode: number;

  constructor(
    message: string,
    statusCode: number,
    code?: string,
    details?: any
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// Helper for fetch requests
async function fetchApi(url: string, options: RequestInit = {}) {
  const { authService } = await import("./authService");

  // Check if user is authenticated before making request
  if (!authService.isAuthenticated() && !url.includes("/auth/")) {
    if (import.meta.env.DEV) {
      console.error("🔐 API: Not authenticated for request:", url, {
        hasToken: !!authService.getToken(),
        hasUser: !!authService.getUser(),
        tokenExpiry: authService.getTimeUntilExpiry(),
      });
    }
    authService.handleAuthError();
    throw new Error("Session expired. Please login again.");
  }

  if (import.meta.env.DEV) {
    console.log("🌐 API Request:", options.method || "GET", url);
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authService.getAuthHeaders(),
      ...options.headers,
    },
  });

  // Handle authentication errors (401 Unauthorized, 403 Forbidden)
  if (response.status === 401 || response.status === 403) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "Authentication failed" }));
    authService.handleAuthError();
    throw new Error(
      errorData.error || "Your session has expired. Please login again."
    );
  }

  // Handle 409 Conflict specially
  if (response.status === 409) {
    const errorData = await response
      .json()
      .catch(() => ({ message: "Conflict detected" }));
    throw new ConflictError(
      errorData.message || "Resource was modified by another user",
      errorData.currentSeat || errorData.currentRoom || null
    );
  }

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "An unknown error occurred" }));

    // Throw structured API error
    throw new ApiError(
      errorData.error || errorData.message || "Network response was not ok",
      response.status,
      errorData.code,
      errorData.details
    );
  }
  if (response.status === 204) {
    return;
  }
  return response.json();
}

// API FUNCTIONS
export const api = {
  // Generic HTTP methods
  get: (url: string) => fetchApi(url),
  post: (url: string, data?: any) =>
    fetchApi(url, { method: "POST", body: JSON.stringify(data) }),
  put: (url: string, data?: any) =>
    fetchApi(url, { method: "PUT", body: JSON.stringify(data) }),
  patch: (url: string, data?: any) =>
    fetchApi(url, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (url: string) => fetchApi(url, { method: "DELETE" }),

  // Buildings
  getBuildings: (): Promise<Building[]> => fetchApi("/buildings"),
  createBuilding: (buildingData: {
    name: string;
    code: string;
    blockId: string;
    distance: number;
  }): Promise<Building> =>
    fetchApi("/buildings", {
      method: "POST",
      body: JSON.stringify(buildingData),
    }),
  updateBuilding: (
    buildingId: string,
    buildingData: {
      name?: string;
      code?: string;
      blockId?: string;
      distance?: number;
    }
  ): Promise<Building> =>
    fetchApi(`/buildings/${buildingId}`, {
      method: "PUT",
      body: JSON.stringify(buildingData),
    }),
  deleteBuilding: (buildingId: string): Promise<void> =>
    fetchApi(`/buildings/${buildingId}`, { method: "DELETE" }),
  getRoomsByBuilding: (buildingId: string): Promise<Room[]> =>
    fetchApi(`/buildings/${buildingId}/rooms`),

  // Rooms
  getRooms: (): Promise<Room[]> => fetchApi("/rooms"),
  createRoom: (roomData: {
    buildingId: string;
    floorId: string;
    name: string;
    capacity: number;
    rows: number;
    cols: number;
    distance: number;
  }): Promise<Room> =>
    fetchApi("/rooms", { method: "POST", body: JSON.stringify(roomData) }),
  updateRoom: (
    roomId: string,
    roomData: {
      name?: string;
      capacity?: number;
      rows?: number;
      cols?: number;
      floorId?: string;
      distance?: number;
      version: number;
    }
  ): Promise<Room> =>
    fetchApi(`/rooms/${roomId}`, {
      method: "PUT",
      body: JSON.stringify(roomData),
    }),
  deleteRoom: (roomId: string): Promise<void> =>
    fetchApi(`/rooms/${roomId}`, { method: "DELETE" }),
  getRoomById: (roomId: string): Promise<Room> => fetchApi(`/rooms/${roomId}`),
  getSeatsByRoom: (roomId: string): Promise<Seat[]> =>
    fetchApi(`/rooms/${roomId}/seats`),

  // Seats
  updateSeatStatus: (
    seatId: string,
    status: SeatStatus,
    version: number
  ): Promise<Seat> =>
    fetchApi(`/seats/${seatId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, version }),
    }),
  updateSeatFeatures: (
    seatId: string,
    features: string[],
    version: number
  ): Promise<Seat> =>
    fetchApi(`/seats/${seatId}/features`, {
      method: "PATCH",
      body: JSON.stringify({ features, version }),
    }),

  // Students & Profile
  getStudents: (): Promise<Student[]> => fetchApi("/students"),
  addStudent: (studentData: Omit<Student, "id">): Promise<Student> =>
    fetchApi("/students", {
      method: "POST",
      body: JSON.stringify(studentData),
    }),
  updateStudent: (
    studentId: string,
    studentData: Partial<Student>
  ): Promise<Student> =>
    fetchApi(`/students/${studentId}`, {
      method: "PUT",
      body: JSON.stringify(studentData),
    }),
  deleteStudent: (studentId: string): Promise<void> =>
    fetchApi(`/students/${studentId}`, { method: "DELETE" }),
  getStudentProfile: (): Promise<Student> => fetchApi("/students/me"),
  updateStudentProfile: (profileData: {
    name?: string;
    accessibilityNeeds?: string[];
  }): Promise<Student> =>
    fetchApi("/students/me", {
      method: "PUT",
      body: JSON.stringify(profileData),
    }),

  // Planning
  runAllocation: (): Promise<{ seats: Seat[]; summary: AllocationSummary }> =>
    fetchApi("/plan/allocate", { method: "POST" }),

  runRebalance: (): Promise<{ seats: Seat[]; rebalanceSummary: any }> =>
    fetchApi("/plan/rebalance", { method: "POST" }),

  allocateBranchToBuilding: (
    branch: Branch,
    buildingId: string
  ): Promise<{ summary: AllocationSummary }> =>
    fetchApi("/plan/allocate-branch", {
      method: "POST",
      body: JSON.stringify({ branch, buildingId }),
    }),

  allocateBranchToRoom: (
    branch: Branch,
    roomId: string
  ): Promise<{ summary: AllocationSummary }> =>
    fetchApi("/plan/allocate-branch-to-room", {
      method: "POST",
      body: JSON.stringify({ branch, roomId }),
    }),

  getEligibleBranches: (
    buildingId?: string,
    roomId?: string
  ): Promise<Branch[]> => {
    const params = new URLSearchParams();
    if (buildingId) params.append("buildingId", buildingId);
    if (roomId) params.append("roomId", roomId);
    return fetchApi(`/allocations/eligible-branches?${params.toString()}`);
  },

  // Teachers
  getTeachers: (): Promise<Teacher[]> => fetchApi("/teachers"),
  createTeacher: (teacherData: {
    name: string;
    email: string;
    password: string;
  }): Promise<Teacher> =>
    fetchApi("/teachers", {
      method: "POST",
      body: JSON.stringify(teacherData),
    }),
  updateTeacher: (
    teacherId: string,
    teacherData: { email?: string; password?: string }
  ): Promise<Teacher> =>
    fetchApi(`/teachers/${teacherId}`, {
      method: "PUT",
      body: JSON.stringify(teacherData),
    }),
  deleteTeacher: (teacherId: string): Promise<void> =>
    fetchApi(`/teachers/${teacherId}`, { method: "DELETE" }),

  // Admins
  getAdmins: (): Promise<
    Array<{
      id: string;
      email: string;
      password: string;
      role: string;
      createdAt: string;
    }>
  > => fetchApi("/admins"),
  createAdmin: (adminData: {
    email: string;
    password: string;
  }): Promise<{
    id: string;
    email: string;
    password: string;
    role: string;
    createdAt: string;
  }> =>
    fetchApi("/admins", {
      method: "POST",
      body: JSON.stringify(adminData),
    }),
  updateAdmin: (
    adminId: string,
    adminData: { email?: string; password?: string }
  ): Promise<{
    id: string;
    email: string;
    password: string;
    role: string;
    createdAt: string;
  }> =>
    fetchApi(`/admins/${adminId}`, {
      method: "PUT",
      body: JSON.stringify(adminData),
    }),
  deleteAdmin: (adminId: string): Promise<void> =>
    fetchApi(`/admins/${adminId}`, { method: "DELETE" }),

  // Blocks
  getBlocks: (): Promise<Block[]> => fetchApi("/locations/blocks"),
  createBlock: (blockData: {
    name: string;
    code: string;
    distance: number;
  }): Promise<Block> =>
    fetchApi("/locations/blocks", {
      method: "POST",
      body: JSON.stringify(blockData),
    }),
  updateBlock: (
    blockId: string,
    blockData: { name?: string; code?: string; distance?: number }
  ): Promise<Block> =>
    fetchApi(`/locations/blocks/${blockId}`, {
      method: "PUT",
      body: JSON.stringify(blockData),
    }),
  deleteBlock: (blockId: string): Promise<void> =>
    fetchApi(`/locations/blocks/${blockId}`, { method: "DELETE" }),

  // Floors
  getFloors: (buildingId?: string): Promise<Floor[]> => {
    const params = buildingId ? `?buildingId=${buildingId}` : "";
    return fetchApi(`/locations/floors${params}`);
  },
  createFloor: (floorData: {
    buildingId: string;
    name: string;
    number: number;
    distance: number;
  }): Promise<Floor> =>
    fetchApi("/locations/floors", {
      method: "POST",
      body: JSON.stringify(floorData),
    }),
  updateFloor: (
    floorId: string,
    floorData: {
      name?: string;
      number?: number;
      buildingId?: string;
      distance?: number;
    }
  ): Promise<Floor> =>
    fetchApi(`/locations/floors/${floorId}`, {
      method: "PUT",
      body: JSON.stringify(floorData),
    }),
  deleteFloor: (floorId: string): Promise<void> =>
    fetchApi(`/locations/floors/${floorId}`, { method: "DELETE" }),

  // Room Bookings
  searchRooms: (
    criteria: SearchCriteria
  ): Promise<{ rooms: RoomRecommendation[] }> =>
    fetchApi("/room-bookings/search", {
      method: "POST",
      body: JSON.stringify(criteria),
    }),
  createBooking: (bookingData: {
    roomId: string;
    branch: Branch;
    capacity: number;
    startTime: string;
    endTime: string;
  }): Promise<RoomBooking> =>
    fetchApi("/room-bookings", {
      method: "POST",
      body: JSON.stringify(bookingData),
    }),
  getBookings: (filters?: {
    teacherId?: string;
    roomId?: string;
    status?: string;
  }): Promise<RoomBooking[]> => {
    const params = new URLSearchParams();
    if (filters?.teacherId) params.append("teacherId", filters.teacherId);
    if (filters?.roomId) params.append("roomId", filters.roomId);
    if (filters?.status) params.append("status", filters.status);
    const queryString = params.toString();
    return fetchApi(`/room-bookings${queryString ? `?${queryString}` : ""}`);
  },
  cancelBooking: (bookingId: string): Promise<void> =>
    fetchApi(`/room-bookings/${bookingId}`, { method: "DELETE" }),
};

// Mock Gemini Service
export const geminiService = {
  getSeatingSuggestion: async (
    students: Student[],
    rooms: Room[]
  ): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: "mock-api-key-for-type-checking" });
    const prompt = `
      As a facilities manager, provide a seating strategy suggestion for the following scenario.
      Be concise and provide actionable advice.

      Rooms available: ${rooms
        .map((r) => `${r.name} (capacity: ${r.capacity})`)
        .join(", ")}.
      Total students to seat: ${students.length}.
      
      Key student considerations:
      - ${
        students.filter((s) => s.accessibilityNeeds.includes("front_seat"))
          .length
      } students require front row seating.
      - ${
        students.filter((s) =>
          s.accessibilityNeeds.includes("wheelchair_access")
        ).length
      } students require wheelchair access.
      - ${
        students.filter((s) => s.tags.includes("graduate")).length
      } are graduate students.

      Based on this, what is an optimal seating strategy?
    `;

    // This is a MOCK API call. In a real app, this would be:
    // const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });
    // return response.text;

    await new Promise((res) => setTimeout(res, 1500));

    return `**Seating Strategy Suggestion:**

*   **Prioritize Accessibility:** Begin by placing the ${
      students.filter((s) => s.accessibilityNeeds.includes("front_seat")).length
    } students needing front-row seats in the first two rows of 'Lecture Hall 101'. Ensure the seats assigned to students needing wheelchair access are clear of obstructions.
*   **Graduate Student Cohort:** Consider dedicating 'Studio C' for the ${
      students.filter((s) => s.tags.includes("graduate")).length
    } graduate students to foster a collaborative environment.
*   **General Allocation:** Fill the remaining seats in 'Lecture Hall 101' and 'Computer Lab 203' with the undergraduate population, starting from the front and moving backwards.
*   **Contingency:** Keep a few seats in each room open if possible to handle any last-minute changes or unforeseen needs.`;
  },
};
