import React, { useState, useEffect } from "react";
import { Input } from "@heroui/react";

/**
 * TimeRangePicker Component
 *
 * A reusable component for selecting start and end times with built-in validation.
 *
 * Features:
 * - Prevents selection of past dates
 * - Validates that end time is after start time
 * - Provides visual feedback for validation errors
 * - Supports custom labels and external error messages
 *
 * Example usage:
 * ```tsx
 * const [startTime, setStartTime] = useState("");
 * const [endTime, setEndTime] = useState("");
 *
 * <TimeRangePicker
 *   startTime={startTime}
 *   endTime={endTime}
 *   onStartTimeChange={setStartTime}
 *   onEndTimeChange={setEndTime}
 *   isRequired
 * />
 * ```
 */
interface TimeRangePickerProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  startLabel?: string;
  endLabel?: string;
  startError?: string;
  endError?: string;
  isRequired?: boolean;
  className?: string;
}

const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  startLabel = "Start Time",
  endLabel = "End Time",
  startError,
  endError,
  isRequired = false,
  className = "",
}) => {
  const [internalStartError, setInternalStartError] = useState<string>("");
  const [internalEndError, setInternalEndError] = useState<string>("");

  // Get minimum datetime for input (current time + 5 minutes buffer)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  // Validate start time
  useEffect(() => {
    if (!startTime) {
      setInternalStartError("");
      return;
    }

    const startDate = new Date(startTime);
    const now = new Date();

    if (startDate <= now) {
      setInternalStartError("Start time must be in the future");
    } else {
      setInternalStartError("");
    }
  }, [startTime]);

  // Validate end time
  useEffect(() => {
    if (!endTime) {
      setInternalEndError("");
      return;
    }

    if (!startTime) {
      setInternalEndError("");
      return;
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (endDate <= startDate) {
      setInternalEndError("End time must be after start time");
    } else {
      setInternalEndError("");
    }
  }, [startTime, endTime]);

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onStartTimeChange(value);
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onEndTimeChange(value);
  };

  // Use external errors if provided, otherwise use internal validation
  const displayStartError = startError || internalStartError;
  const displayEndError = endError || internalEndError;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      <Input
        label={startLabel}
        type="datetime-local"
        value={startTime}
        onChange={handleStartTimeChange}
        isInvalid={!!displayStartError}
        errorMessage={displayStartError}
        variant="bordered"
        min={getMinDateTime()}
        isRequired={isRequired}
        placeholder="Enter capacity"
      />

      <Input
        label={endLabel}
        type="datetime-local"
        value={endTime}
        onChange={handleEndTimeChange}
        isInvalid={!!displayEndError}
        errorMessage={displayEndError}
        variant="bordered"
        min={startTime || getMinDateTime()}
        isRequired={isRequired}
        placeholder="Enter capacity"
      />
    </div>
  );
};

export default TimeRangePicker;
