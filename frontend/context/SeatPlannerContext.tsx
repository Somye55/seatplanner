import React, { createContext, useReducer, useContext, ReactNode } from "react";
import {
  Building,
  Room,
  Seat,
  Student,
  AllocationSummary,
  RoomBooking,
} from "../types";

interface State {
  buildings: Building[];
  rooms: Room[];
  seats: Seat[];
  students: Student[];
  bookings: RoomBooking[];
  allocationSummary: AllocationSummary | null;
  rebalanceSummary: any | null;
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: "API_REQUEST_START" }
  | { type: "API_REQUEST_FAIL"; payload: string }
  | { type: "GET_BUILDINGS_SUCCESS"; payload: Building[] }
  | { type: "GET_ROOMS_SUCCESS"; payload: Room[] }
  | { type: "GET_SEATS_SUCCESS"; payload: Seat[] }
  | { type: "GET_STUDENTS_SUCCESS"; payload: Student[] }
  | { type: "GET_BOOKINGS_SUCCESS"; payload: RoomBooking[] }
  | { type: "ADD_BOOKING_SUCCESS"; payload: RoomBooking }
  | { type: "UPDATE_BOOKING_SUCCESS"; payload: RoomBooking }
  | { type: "DELETE_BOOKING_SUCCESS"; payload: string }
  | { type: "UPDATE_SEAT_SUCCESS"; payload: Seat }
  | { type: "ADD_STUDENT_SUCCESS"; payload: Student }
  | { type: "UPDATE_STUDENT_SUCCESS"; payload: Student }
  | { type: "DELETE_STUDENT_SUCCESS"; payload: string }
  | {
      type: "RUN_ALLOCATION_SUCCESS";
      payload: { seats: Seat[]; summary: AllocationSummary };
    }
  | {
      type: "RUN_REBALANCE_SUCCESS";
      payload: { seats: Seat[]; rebalanceSummary: any };
    };

const initialState: State = {
  buildings: [],
  rooms: [],
  seats: [],
  students: [],
  bookings: [],
  allocationSummary: null,
  rebalanceSummary: null,
  loading: false,
  error: null,
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "API_REQUEST_START":
      return { ...state, loading: true, error: null };
    case "API_REQUEST_FAIL":
      return { ...state, loading: false, error: action.payload };
    case "GET_BUILDINGS_SUCCESS":
      return { ...state, loading: false, buildings: action.payload };
    case "GET_ROOMS_SUCCESS":
      return { ...state, loading: false, rooms: action.payload };
    case "GET_SEATS_SUCCESS":
      const newSeatsForRoom = action.payload;
      // If we receive an empty array for a room, we need its ID to clear existing seats.
      // This logic assumes we only get seats for one room at a time.
      if (newSeatsForRoom.length === 0) {
        // This is a tricky case not fully handled; for now, we just stop loading.
        // A better implementation would pass the roomId to clear.
        return { ...state, loading: false };
      }
      const roomIdOfNewSeats = newSeatsForRoom[0].roomId;
      const otherRoomsSeats = state.seats.filter(
        (s) => s.roomId !== roomIdOfNewSeats
      );
      return {
        ...state,
        loading: false,
        seats: [...otherRoomsSeats, ...newSeatsForRoom],
      };
    case "GET_STUDENTS_SUCCESS":
      return { ...state, loading: false, students: action.payload };
    case "GET_BOOKINGS_SUCCESS":
      return { ...state, loading: false, bookings: action.payload };
    case "ADD_BOOKING_SUCCESS":
      return {
        ...state,
        loading: false,
        bookings: [...state.bookings, action.payload],
      };
    case "UPDATE_BOOKING_SUCCESS":
      return {
        ...state,
        loading: false,
        bookings: state.bookings.map((b) =>
          b.id === action.payload.id ? action.payload : b
        ),
      };
    case "DELETE_BOOKING_SUCCESS":
      return {
        ...state,
        loading: false,
        bookings: state.bookings.filter((b) => b.id !== action.payload),
      };
    case "UPDATE_SEAT_SUCCESS":
      return {
        ...state,
        loading: false,
        seats: state.seats.map((s) =>
          s.id === action.payload.id ? action.payload : s
        ),
      };
    case "ADD_STUDENT_SUCCESS":
      return {
        ...state,
        loading: false,
        students: [...state.students, action.payload],
      };
    case "UPDATE_STUDENT_SUCCESS":
      return {
        ...state,
        loading: false,
        students: state.students.map((s) =>
          s.id === action.payload.id ? action.payload : s
        ),
      };
    case "DELETE_STUDENT_SUCCESS":
      return {
        ...state,
        loading: false,
        students: state.students.filter((s) => s.id !== action.payload),
      };
    case "RUN_ALLOCATION_SUCCESS":
      return {
        ...state,
        loading: false,
        seats: action.payload.seats,
        allocationSummary: action.payload.summary,
      };
    case "RUN_REBALANCE_SUCCESS":
      return {
        ...state,
        loading: false,
        seats: action.payload.seats,
        rebalanceSummary: action.payload.rebalanceSummary,
      };
    default:
      return state;
  }
};

interface SeatPlannerContextType {
  state: State;
  dispatch: React.Dispatch<Action>;
}

const SeatPlannerContext = createContext<SeatPlannerContextType | undefined>(
  undefined
);

export const SeatPlannerProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <SeatPlannerContext.Provider value={{ state, dispatch }}>
      {children}
    </SeatPlannerContext.Provider>
  );
};

export const useSeatPlanner = (): SeatPlannerContextType => {
  const context = useContext(SeatPlannerContext);
  if (context === undefined) {
    throw new Error("useSeatPlanner must be used within a SeatPlannerProvider");
  }
  return context;
};
