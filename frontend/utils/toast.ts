// Toast utility - uses HeroUI's ToastProvider
import { addToast } from "@heroui/react";

/**
 * Toast utility for displaying notifications using HeroUI
 */
export const toast = {
  success: (message: string, description?: string) => {
    addToast({
      title: message,
      description,
      color: "success",
      severity: "success",
      timeout: 4000,
    });
  },

  error: (message: string, description?: string) => {
    addToast({
      title: message,
      description,
      color: "danger",
      severity: "danger",
      timeout: 5000,
    });
  },

  warning: (message: string, description?: string) => {
    addToast({
      title: message,
      description,
      severity: "warning",
      timeout: 4000,
    });
  },

  info: (message: string, description?: string) => {
    addToast({
      title: message,
      description,
      severity: "primary",
      timeout: 4000,
    });
  },
};

/**
 * Extract error message from API error response
 */
export function getErrorMessage(error: any): string {
  // Check for structured error response from backend
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  // Check for validation errors
  if (error?.response?.data?.details) {
    const details = error.response.data.details;
    if (Array.isArray(details) && details.length > 0) {
      return details.map((d) => d.message).join(", ");
    }
  }

  // Check for error message property
  if (error?.message) {
    return error.message;
  }

  // Default error message
  return "An unexpected error occurred";
}

/**
 * Display error toast from API error
 */
export function showErrorToast(error: any, defaultMessage?: string) {
  const message = getErrorMessage(error);
  toast.error(defaultMessage || "Error", message);
}

/**
 * Display success toast
 */
export function showSuccessToast(message: string, description?: string) {
  toast.success(message, description);
}
