import React from "react";
import { Chip } from "@heroui/react";
import { BookingStatus } from "../../types";

interface BookingStatusBadgeProps {
  status: BookingStatus;
  startTime: string;
  endTime: string;
}

const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({
  status,
  startTime,
  endTime,
}) => {
  // Calculate actual status based on current time
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);

  let actualStatus: BookingStatus = status;
  let displayText = status;

  if (now < start) {
    actualStatus = BookingStatus.NotStarted;
    displayText = BookingStatus.NotStarted;
  } else if (now >= start && now < end) {
    actualStatus = BookingStatus.Ongoing;
    displayText = BookingStatus.Ongoing;
  } else {
    actualStatus = BookingStatus.Completed;
    displayText = BookingStatus.Completed;
  }

  // Get color based on status
  const getStatusColor = (): "primary" | "success" | "default" => {
    switch (actualStatus) {
      case BookingStatus.NotStarted:
        return "primary";
      case BookingStatus.Ongoing:
        return "success";
      case BookingStatus.Completed:
        return "default";
      default:
        return "default";
    }
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <Chip color={getStatusColor()} variant="flat" size="sm">
        {displayText}
      </Chip>
      <div className="text-xs text-default-500">
        <div>{formatTime(startTime)}</div>
        <div>to {formatTime(endTime)}</div>
      </div>
    </div>
  );
};

export default BookingStatusBadge;
