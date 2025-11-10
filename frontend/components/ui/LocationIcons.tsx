import React from "react";

interface LocationIconProps {
  className?: string;
  variant?: "solid" | "gradient";
}

export const BlockIcon: React.FC<LocationIconProps> = ({
  className = "h-12 w-12",
  variant = "gradient",
}) => {
  if (variant === "gradient") {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl blur-sm opacity-50" />
        <div className="relative bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-3 shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`${className} text-white`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
            <path d="M7 7h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2zM7 11h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2zM7 15h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} text-blue-600`}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
      <path d="M7 7h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2zM7 11h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2zM7 15h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z" />
    </svg>
  );
};

export const BuildingIcon: React.FC<LocationIconProps> = ({
  className = "h-12 w-12",
  variant = "gradient",
}) => {
  if (variant === "gradient") {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-700 rounded-2xl blur-sm opacity-50" />
        <div className="relative bg-gradient-to-br from-indigo-500 to-purple-700 rounded-2xl p-3 shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`${className} text-white`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 3L2 9v12h20V9l-10-6zm8 16h-3v-3h-2v3h-2v-3h-2v3H9v-3H7v3H4v-9l8-4.8L20 10v9z" />
            <path d="M10 11h4v2h-4zm0 4h4v2h-4z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} text-indigo-600`}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 3L2 9v12h20V9l-10-6zm8 16h-3v-3h-2v3h-2v-3h-2v3H9v-3H7v3H4v-9l8-4.8L20 10v9z" />
      <path d="M10 11h4v2h-4zm0 4h4v2h-4z" />
    </svg>
  );
};

export const FloorIcon: React.FC<LocationIconProps> = ({
  className = "h-12 w-12",
  variant = "gradient",
}) => {
  if (variant === "gradient") {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-700 rounded-2xl blur-sm opacity-50" />
        <div className="relative bg-gradient-to-br from-green-500 to-emerald-700 rounded-2xl p-3 shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`${className} text-white`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M3 5h18v2H3zm0 4h18v2H3zm0 4h18v2H3zm0 4h18v2H3z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} text-green-600`}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M3 5h18v2H3zm0 4h18v2H3zm0 4h18v2H3zm0 4h18v2H3z" />
    </svg>
  );
};

export const RoomIcon: React.FC<LocationIconProps> = ({
  className = "h-12 w-12",
  variant = "gradient",
}) => {
  if (variant === "gradient") {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-700 rounded-2xl blur-sm opacity-50" />
        <div className="relative bg-gradient-to-br from-orange-500 to-amber-700 rounded-2xl p-3 shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`${className} text-white`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
            <path d="M11 7h2v10h-2z" />
            <circle cx="12" cy="14" r="1.5" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} text-orange-600`}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
      <path d="M11 7h2v10h-2z" />
      <circle cx="12" cy="14" r="1.5" />
    </svg>
  );
};
