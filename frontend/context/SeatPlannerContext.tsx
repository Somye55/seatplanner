
import React, { createContext, useReducer, useContext, ReactNode } from 'react';
import { Building, Room, Seat, Student, AllocationSummary } from '../types';

interface State {
  buildings: Building[];
  rooms: Room[];
  seats: Seat[];
  students: Student[];
  allocationSummary: AllocationSummary | null;
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: 'API_REQUEST_START' }
  | { type: 'API_REQUEST_FAIL'; payload: string }
  | { type: 'GET_BUILDINGS_SUCCESS'; payload: Building[] }
  | { type: 'GET_ROOMS_SUCCESS'; payload: Room[] }
  | { type: 'GET_SEATS_SUCCESS'; payload: Seat[] }
  | { type: 'GET_STUDENTS_SUCCESS'; payload: Student[] }
  | { type: 'UPDATE_SEAT_SUCCESS'; payload: Seat }
  | { type: 'ADD_STUDENT_SUCCESS'; payload: Student }
  | { type: 'UPDATE_STUDENT_SUCCESS'; payload: Student }
  | { type: 'DELETE_STUDENT_SUCCESS'; payload: string }
  | { type: 'RUN_ALLOCATION_SUCCESS'; payload: { seats: Seat[]; summary: AllocationSummary } };

const initialState: State = {
  buildings: [],
  rooms: [],
  seats: [],
  students: [],
  allocationSummary: null,
  loading: false,
  error: null,
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'API_REQUEST_START':
      return { ...state, loading: true, error: null };
    case 'API_REQUEST_FAIL':
      return { ...state, loading: false, error: action.payload };
    case 'GET_BUILDINGS_SUCCESS':
      return { ...state, loading: false, buildings: action.payload };
    case 'GET_ROOMS_SUCCESS':
      return { ...state, loading: false, rooms: action.payload };
    case 'GET_SEATS_SUCCESS':
      return { ...state, loading: false, seats: action.payload };
    case 'GET_STUDENTS_SUCCESS':
      return { ...state, loading: false, students: action.payload };
    case 'UPDATE_SEAT_SUCCESS':
      return {
        ...state,
        loading: false,
        seats: state.seats.map((s) => (s.id === action.payload.id ? action.payload : s)),
      };
    case 'ADD_STUDENT_SUCCESS':
      return {
          ...state,
          loading: false,
          students: [...state.students, action.payload]
      };
    case 'UPDATE_STUDENT_SUCCESS':
      return {
          ...state,
          loading: false,
          students: state.students.map(s => s.id === action.payload.id ? action.payload : s)
      };
    case 'DELETE_STUDENT_SUCCESS':
        return {
            ...state,
            loading: false,
            students: state.students.filter(s => s.id !== action.payload)
        };
    case 'RUN_ALLOCATION_SUCCESS':
      return {
        ...state,
        loading: false,
        seats: action.payload.seats,
        allocationSummary: action.payload.summary,
      };
    default:
      return state;
  }
};

interface SeatPlannerContextType {
  state: State;
  dispatch: React.Dispatch<Action>;
}

const SeatPlannerContext = createContext<SeatPlannerContextType | undefined>(undefined);

export const SeatPlannerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <SeatPlannerContext.Provider value={{ state, dispatch }}>{children}</SeatPlannerContext.Provider>;
};

export const useSeatPlanner = (): SeatPlannerContextType => {
  const context = useContext(SeatPlannerContext);
  if (context === undefined) {
    throw new Error('useSeatPlanner must be used within a SeatPlannerProvider');
  }
  return context;
};
