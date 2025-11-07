import React from "react";
import MyBookingsSection from "../components/teacher/MyBookingsSection";

const MyBookingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Bookings</h1>
        <p className="text-default-600 mt-2">
          View and manage all your room bookings in one place.
        </p>
      </div>

      {/* Bookings Section */}
      <MyBookingsSection refreshTrigger={0} />
    </div>
  );
};

export default MyBookingsPage;
