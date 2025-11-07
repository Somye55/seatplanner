import React, { createContext, useContext, useState, useCallback } from "react";
import { Card, CardBody } from "@heroui/react";

interface ToastMessage {
  id: string;
  message: string;
  description?: string;
  type: "success" | "error" | "warning" | "info";
}

interface ToastContextType {
  showToast: (
    message: string,
    type: "success" | "error" | "warning" | "info",
    description?: string
  ) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (
      message: string,
      type: "success" | "error" | "warning" | "info",
      description?: string
    ) => {
      const id = Math.random().toString(36).substring(7);
      const newToast: ToastMessage = { id, message, description, type };

      setToasts((prev) => [...prev, newToast]);

      // Auto-remove toast after duration
      const duration = type === "error" ? 5000 : 4000;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    []
  );

  const getToastColor = (type: ToastMessage["type"]) => {
    switch (type) {
      case "success":
        return "bg-success-50 border-success text-success-700 dark:bg-success-900/20 dark:text-success-400";
      case "error":
        return "bg-danger-50 border-danger text-danger-700 dark:bg-danger-900/20 dark:text-danger-400";
      case "warning":
        return "bg-warning-50 border-warning text-warning-700 dark:bg-warning-900/20 dark:text-warning-400";
      case "info":
        return "bg-primary-50 border-primary text-primary-700 dark:bg-primary-900/20 dark:text-primary-400";
    }
  };

  const getToastIcon = (type: ToastMessage["type"]) => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✗";
      case "warning":
        return "⚠";
      case "info":
        return "ℹ";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-md">
        {toasts.map((toast) => (
          <Card
            key={toast.id}
            className={`border ${getToastColor(
              toast.type
            )} shadow-lg animate-in slide-in-from-right`}
          >
            <CardBody className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl font-bold flex-shrink-0">
                  {getToastIcon(toast.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{toast.message}</p>
                  {toast.description && (
                    <p className="text-xs mt-1 opacity-90">
                      {toast.description}
                    </p>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
