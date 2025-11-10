import { Response } from "express";
import { ValidationError } from "express-validator";

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string;
  message?: string;
  details?: any;
  code?: string;
}

/**
 * Application error codes
 */
export enum ErrorCode {
  // Room Booking Errors
  ROOM_NOT_AVAILABLE = "ROOM_NOT_AVAILABLE",
  INVALID_TIME_RANGE = "INVALID_TIME_RANGE",
  PAST_BOOKING = "PAST_BOOKING",
  INSUFFICIENT_CAPACITY = "INSUFFICIENT_CAPACITY",
  BOOKING_NOT_FOUND = "BOOKING_NOT_FOUND",
  CANNOT_CANCEL_ONGOING = "CANNOT_CANCEL_ONGOING",
  CANNOT_CANCEL_COMPLETED = "CANNOT_CANCEL_COMPLETED",

  // Teacher Management Errors
  TEACHER_EXISTS = "TEACHER_EXISTS",
  TEACHER_NOT_FOUND = "TEACHER_NOT_FOUND",
  CANNOT_CREATE_ADMIN = "CANNOT_CREATE_ADMIN",

  // Location Hierarchy Errors
  INVALID_PARENT = "INVALID_PARENT",
  LOCATION_HAS_CHILDREN = "LOCATION_HAS_CHILDREN",
  DUPLICATE_LOCATION_CODE = "DUPLICATE_LOCATION_CODE",
  BLOCK_NOT_FOUND = "BLOCK_NOT_FOUND",
  BUILDING_NOT_FOUND = "BUILDING_NOT_FOUND",
  FLOOR_NOT_FOUND = "FLOOR_NOT_FOUND",
  ROOM_NOT_FOUND = "ROOM_NOT_FOUND",

  // Auth Errors
  SIGNUP_DISABLED = "SIGNUP_DISABLED",
  INVALID_ROLE = "INVALID_ROLE",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",

  // Admin Management Errors
  USER_EXISTS = "USER_EXISTS",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  CANNOT_DELETE_SUPER_ADMIN = "CANNOT_DELETE_SUPER_ADMIN",
  CANNOT_UPDATE_SUPER_ADMIN = "CANNOT_UPDATE_SUPER_ADMIN",
  NOT_AN_ADMIN = "NOT_AN_ADMIN",

  // Student Update Errors
  NAME_UPDATE_FORBIDDEN = "NAME_UPDATE_FORBIDDEN",
  STUDENT_NOT_FOUND = "STUDENT_NOT_FOUND",
  EMAIL_IN_USE = "EMAIL_IN_USE",

  // Validation Errors
  VALIDATION_ERROR = "VALIDATION_ERROR",

  // Generic Errors
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  NOT_FOUND = "NOT_FOUND",
}

/**
 * Error messages mapped to error codes
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  // Room Booking Errors
  [ErrorCode.ROOM_NOT_AVAILABLE]:
    "Room is not available for the selected time period",
  [ErrorCode.INVALID_TIME_RANGE]: "End time must be after start time",
  [ErrorCode.PAST_BOOKING]: "Cannot book rooms in the past",
  [ErrorCode.INSUFFICIENT_CAPACITY]:
    "Room capacity is less than requested number of students",
  [ErrorCode.BOOKING_NOT_FOUND]: "Booking not found",
  [ErrorCode.CANNOT_CANCEL_ONGOING]: "Cannot cancel an ongoing booking",
  [ErrorCode.CANNOT_CANCEL_COMPLETED]: "Cannot cancel a completed booking",

  // Teacher Management Errors
  [ErrorCode.TEACHER_EXISTS]: "Teacher with this email already exists",
  [ErrorCode.TEACHER_NOT_FOUND]: "Teacher not found",
  [ErrorCode.CANNOT_CREATE_ADMIN]:
    "Cannot create admin profiles through this interface",

  // Location Hierarchy Errors
  [ErrorCode.INVALID_PARENT]: "Invalid parent location in hierarchy",
  [ErrorCode.LOCATION_HAS_CHILDREN]:
    "Cannot delete location with existing child locations",
  [ErrorCode.DUPLICATE_LOCATION_CODE]: "Location code already exists",
  [ErrorCode.BLOCK_NOT_FOUND]: "Block not found",
  [ErrorCode.BUILDING_NOT_FOUND]: "Building not found",
  [ErrorCode.FLOOR_NOT_FOUND]: "Floor not found",
  [ErrorCode.ROOM_NOT_FOUND]: "Room not found",

  // Auth Errors
  [ErrorCode.SIGNUP_DISABLED]:
    "Public signup is disabled. Contact an administrator.",
  [ErrorCode.INVALID_ROLE]: "Invalid user role",
  [ErrorCode.UNAUTHORIZED]: "User not authenticated",
  [ErrorCode.FORBIDDEN]: "Insufficient permissions",

  // Admin Management Errors
  [ErrorCode.USER_EXISTS]: "User with this email already exists",
  [ErrorCode.USER_NOT_FOUND]: "User not found",
  [ErrorCode.CANNOT_DELETE_SUPER_ADMIN]: "Cannot delete super admin accounts",
  [ErrorCode.CANNOT_UPDATE_SUPER_ADMIN]: "Cannot update super admin accounts",
  [ErrorCode.NOT_AN_ADMIN]: "User is not an admin",

  // Student Update Errors
  [ErrorCode.NAME_UPDATE_FORBIDDEN]: "Student name cannot be modified",
  [ErrorCode.STUDENT_NOT_FOUND]: "Student not found",
  [ErrorCode.EMAIL_IN_USE]: "Email is already in use",

  // Validation Errors
  [ErrorCode.VALIDATION_ERROR]: "Validation failed",

  // Generic Errors
  [ErrorCode.INTERNAL_SERVER_ERROR]: "Internal server error",
  [ErrorCode.NOT_FOUND]: "Resource not found",
};

/**
 * Send a standardized error response
 */
export function sendError(
  res: Response,
  statusCode: number,
  errorCode: ErrorCode,
  details?: any
): Response {
  const response: ErrorResponse = {
    error: ErrorMessages[errorCode],
    code: errorCode,
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send validation error response
 */
export function sendValidationError(
  res: Response,
  errors: ValidationError[]
): Response {
  return res.status(400).json({
    error: ErrorMessages[ErrorCode.VALIDATION_ERROR],
    code: ErrorCode.VALIDATION_ERROR,
    details: errors.map((err) => ({
      field: err.type === "field" ? err.path : undefined,
      message: err.msg,
    })),
  });
}

/**
 * Handle Prisma errors
 */
export function handlePrismaError(error: any, res: Response): Response {
  console.error("Prisma error:", error);

  // P2025: Record not found
  if (error.code === "P2025") {
    return sendError(res, 404, ErrorCode.NOT_FOUND);
  }

  // P2002: Unique constraint violation
  if (error.code === "P2002") {
    const field = error.meta?.target?.[0] || "field";
    return res.status(400).json({
      error: `${field} already exists`,
      code: "DUPLICATE_ENTRY",
      details: { field },
    });
  }

  // P2003: Foreign key constraint violation
  if (error.code === "P2003") {
    return sendError(res, 400, ErrorCode.INVALID_PARENT);
  }

  // Default to internal server error
  return sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR);
}

/**
 * Catch-all error handler for unexpected errors
 */
export function handleUnexpectedError(error: any, res: Response): Response {
  console.error("Unexpected error:", error);
  return sendError(res, 500, ErrorCode.INTERNAL_SERVER_ERROR);
}
