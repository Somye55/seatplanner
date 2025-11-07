// Toast utility - uses the custom ToastProvider
// Import useToast from components/ui/Toast in components

let toastFunction:
  | ((
      message: string,
      type: "success" | "error" | "warning" | "info",
      description?: string
    ) => void)
  | null = null;

export const setToastFunction = (
  fn: (
    message: string,
    type: "success" | "error" | "warning" | "info",
    description?: string
  ) => void
) => {
  toastFunction = fn;
};

/**
 * Toast utility for displaying notifications
 */
export const toast = {
  success: (message: string, description?: string) => {
    if (toastFunction) {
      toastFunction(message, "success", description);
    } else {
      console.log("✓ Success:", message, description);
    }
  },

  error: (message: string, description?: string) => {
    if (toastFunction) {
      toastFunction(message, "error", description);
    } else {
      console.error("✗ Error:", message, description);
    }
  },

  warning: (message: string, description?: string) => {
    if (toastFunction) {
      toastFunction(message, "warning", description);
    } else {
      console.warn("⚠ Warning:", message, description);
    }
  },

  info: (message: string, description?: string) => {
    if (toastFunction) {
      toastFunction(message, "info", description);
    } else {
      console.info("ℹ Info:", message, description);
    }
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
