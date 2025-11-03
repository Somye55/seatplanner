import { GoogleGenAI } from "@google/genai";
import { Building, Room, Seat, Student, SeatStatus, AllocationSummary } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://seatplanner-zsi2.onrender.com/api' : 'http://localhost:3001/api');

// Helper for fetch requests
async function fetchApi(url: string, options: RequestInit = {}) {
    const { authService } = await import('./authService');
    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...authService.getAuthHeaders(),
            ...options.headers,
        },
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
        // The backend now sends "message" instead of "error" for some validation
        throw new Error(errorData.message || errorData.error || 'Network response was not ok');
    }
    if (response.status === 204) {
        return;
    }
    return response.json();
}

// API FUNCTIONS
export const api = {
  // Auth
  login: (email: string, password: string) => {
    const { authService } = require('./authService');
    return authService.login(email, password);
  },

  signup: (email: string, password: string, role?: 'Admin' | 'Student') => {
    const { authService } = require('./authService');
    return authService.signup(email, password, role);
  },

  // Buildings
  getBuildings: (): Promise<Building[]> => fetchApi('/buildings'),

  createBuilding: (buildingData: { name: string; code: string }): Promise<Building> =>
    fetchApi('/buildings', {
      method: 'POST',
      body: JSON.stringify(buildingData),
    }),

  updateBuilding: (buildingId: string, buildingData: { name?: string; code?: string }): Promise<Building> =>
    fetchApi(`/buildings/${buildingId}`, {
      method: 'PUT',
      body: JSON.stringify(buildingData),
    }),

  deleteBuilding: (buildingId: string): Promise<void> =>
    fetchApi(`/buildings/${buildingId}`, { method: 'DELETE' }),

  getRoomsByBuilding: (buildingId: string): Promise<Room[]> => fetchApi(`/buildings/${buildingId}/rooms`),

  // Rooms
  createRoom: (roomData: { buildingId: string; name: string; capacity: number }): Promise<Room> =>
    fetchApi('/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData),
    }),

  updateRoom: (roomId: string, roomData: { name?: string; capacity?: number }): Promise<Room> =>
    fetchApi(`/rooms/${roomId}`, {
      method: 'PUT',
      body: JSON.stringify(roomData),
    }),

  deleteRoom: (roomId: string): Promise<void> =>
    fetchApi(`/rooms/${roomId}`, { method: 'DELETE' }),

  getRoomById: (roomId: string): Promise<Room> => fetchApi(`/rooms/${roomId}`),

  getSeatsByRoom: (roomId: string): Promise<Seat[]> => fetchApi(`/rooms/${roomId}/seats`),

  // Seats
  claimSeat: (seatId: string, version: number): Promise<Seat> =>
    fetchApi(`/seats/${seatId}/claim`, {
        method: 'POST',
        body: JSON.stringify({ version }),
    }),
  
  updateSeatStatus: (seatId: string, status: SeatStatus, version: number): Promise<Seat> =>
    fetchApi(`/seats/${seatId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, version }),
    }),

  // Students
  getStudents: (): Promise<Student[]> => fetchApi('/students'),

  addStudent: (studentData: Omit<Student, 'id'>): Promise<Student> =>
    fetchApi('/students', {
        method: 'POST',
        body: JSON.stringify(studentData),
    }),

  updateStudent: (studentId: string, studentData: Partial<Student>): Promise<Student> =>
    fetchApi(`/students/${studentId}`, {
        method: 'PATCH',
        body: JSON.stringify(studentData),
    }),

  deleteStudent: (studentId: string): Promise<void> =>
    fetchApi(`/students/${studentId}`, { method: 'DELETE' }),

  // Planning
  runAllocation: (): Promise<{ seats: Seat[], summary: AllocationSummary }> =>
    fetchApi('/plan/allocate', { method: 'POST' }),

  runRebalance: (): Promise<{ seats: Seat[], rebalanceSummary: any }> =>
    fetchApi('/plan/rebalance', { method: 'POST' }),
};


// Mock Gemini Service
export const geminiService = {
  getSeatingSuggestion: async (students: Student[], rooms: Room[]): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: "mock-api-key-for-type-checking" });
    const prompt = `
      As a facilities manager, provide a seating strategy suggestion for the following scenario.
      Be concise and provide actionable advice.

      Rooms available: ${rooms.map(r => `${r.name} (capacity: ${r.capacity})`).join(', ')}.
      Total students to seat: ${students.length}.
      
      Key student considerations:
      - ${students.filter(s => s.accessibilityNeeds.includes('front_row')).length} students require front row seating.
      - ${students.filter(s => s.accessibilityNeeds.includes('wheelchair_access')).length} students require wheelchair access.
      - ${students.filter(s => s.tags.includes('graduate')).length} are graduate students.

      Based on this, what is an optimal seating strategy?
    `;
    
    // This is a MOCK API call. In a real app, this would be:
    // const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });
    // return response.text;
    
    await new Promise(res => setTimeout(res, 1500));
    
    return `**Seating Strategy Suggestion:**

*   **Prioritize Accessibility:** Begin by placing the ${students.filter(s => s.accessibilityNeeds.includes('front_row')).length} students needing front-row seats in the first two rows of 'Lecture Hall 101'. Ensure the seats assigned to students needing wheelchair access are clear of obstructions.
*   **Graduate Student Cohort:** Consider dedicating 'Studio C' for the ${students.filter(s => s.tags.includes('graduate')).length} graduate students to foster a collaborative environment.
*   **General Allocation:** Fill the remaining seats in 'Lecture Hall 101' and 'Computer Lab 203' with the undergraduate population, starting from the front and moving backwards.
*   **Contingency:** Keep a few seats in each room open if possible to handle any last-minute changes or unforeseen needs.`;
  }
};
