import React, { useState } from "react";
import { Input, Select, SelectItem, Button } from "@heroui/react";
import LocationHierarchySelector from "./LocationHierarchySelector";
import TimeRangePicker from "../ui/TimeRangePicker";
import { SearchCriteria, Branch, BRANCH_OPTIONS } from "../../types";

interface RoomSearchFormProps {
  onSearch: (criteria: SearchCriteria) => void;
  loading: boolean;
}

const RoomSearchForm: React.FC<RoomSearchFormProps> = ({
  onSearch,
  loading,
}) => {
  const [capacity, setCapacity] = useState<string>("");
  const [branch, setBranch] = useState<Branch | "">("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [preferredLocation, setPreferredLocation] = useState<{
    blockId?: string;
    buildingId?: string;
    floorId?: string;
  }>({});

  const [errors, setErrors] = useState<{
    capacity?: string;
    branch?: string;
    startTime?: string;
    endTime?: string;
  }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Validate capacity
    const capacityNum = parseInt(capacity);
    if (!capacity || isNaN(capacityNum)) {
      newErrors.capacity = "Capacity is required";
    } else if (capacityNum < 1) {
      newErrors.capacity = "Capacity must be at least 1";
    } else if (capacityNum > 1000) {
      newErrors.capacity = "Capacity cannot exceed 1000";
    }

    // Validate branch
    if (!branch) {
      newErrors.branch = "Branch is required";
    }

    // Validate start time
    if (!startTime) {
      newErrors.startTime = "Start time is required";
    } else {
      const startDate = new Date(startTime);
      if (startDate <= new Date()) {
        newErrors.startTime = "Start time must be in the future";
      }
    }

    // Validate end time
    if (!endTime) {
      newErrors.endTime = "End time is required";
    } else if (startTime) {
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      if (endDate <= startDate) {
        newErrors.endTime = "End time must be after start time";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const criteria: SearchCriteria = {
      capacity: parseInt(capacity),
      branch: branch as Branch,
      startTime,
      endTime,
      preferredLocation:
        Object.keys(preferredLocation).length > 0
          ? preferredLocation
          : undefined,
    };

    onSearch(criteria);
  };

  const handleBranchChange = (keys: any) => {
    const selectedBranch = Array.from(keys)[0] as Branch;
    setBranch(selectedBranch);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Capacity Input */}
        <Input
          label="Number of Students"
          type="number"
          placeholder="Enter capacity"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          isInvalid={!!errors.capacity}
          errorMessage={errors.capacity}
          variant="bordered"
          min={1}
          max={1000}
          isRequired
        />

        {/* Branch Select */}
        <Select
          label="Branch"
          placeholder="Select a branch"
          selectedKeys={branch ? new Set([branch]) : new Set()}
          onSelectionChange={handleBranchChange}
          isInvalid={!!errors.branch}
          errorMessage={errors.branch}
          variant="bordered"
          isRequired
        >
          {BRANCH_OPTIONS.map((option) => (
            <SelectItem key={option.id}>{option.label}</SelectItem>
          ))}
        </Select>
      </div>

      {/* Time Range Picker */}
      <TimeRangePicker
        startTime={startTime}
        endTime={endTime}
        onStartTimeChange={setStartTime}
        onEndTimeChange={setEndTime}
        startError={errors.startTime}
        endError={errors.endTime}
        isRequired
      />

      {/* Location Hierarchy Selector */}
      <div className="border-2 border-dashed border-default-200 dark:border-default-100 rounded-xl p-4 bg-default-50 dark:bg-default-50/5">
        <label className="text-sm font-semibold text-default-700 mb-3 block">
          Preferred Location (Optional)
        </label>
        <p className="text-xs text-default-500 mb-4">
          Select your preferred location to find rooms nearby. You can choose at
          any level.
        </p>
        <LocationHierarchySelector
          onSelect={setPreferredLocation}
          value={preferredLocation}
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          color="primary"
          size="lg"
          isLoading={loading}
          className="min-w-[200px]"
        >
          {loading ? "Searching..." : "Find Rooms"}
        </Button>
      </div>
    </form>
  );
};

export default RoomSearchForm;
