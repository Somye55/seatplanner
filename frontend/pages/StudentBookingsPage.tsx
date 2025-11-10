import React, { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Divider,
  Spinner,
} from "@heroui/react";
import { api } from "../services/apiService";
import { Student } from "../types";
import { showErrorToast } from "../utils/toast";

const StudentBookingsPage: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>("");

  const loadStudentData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const profile = await api.getStudentProfile();
      setStudent(profile);
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(errorMsg);
      showErrorToast(err, "Failed to load your bookings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-danger shadow-sm">
        <CardBody className="pt-4">
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-danger-50 mb-4">
              <svg
                className="w-8 h-8 text-danger"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-danger font-medium">{error}</p>
            <Button
              color="primary"
              variant="flat"
              className="mt-4"
              onPress={() => loadStudentData()}
            >
              Try Again
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  const allocatedSeats = student?.seats || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Bookings</h1>
          <p className="text-default-600 mt-2">
            View all your allocated seats across different rooms.
          </p>
        </div>
        <Button
          size="sm"
          variant="light"
          onPress={() => loadStudentData(true)}
          isLoading={refreshing}
          startContent={
            !refreshing && (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )
          }
        >
          Refresh
        </Button>
      </div>

      {/* Student Info Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Student Information</h2>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-default-500">Name</p>
              <p className="font-medium text-default-900">{student?.name}</p>
            </div>
            <div>
              <p className="text-sm text-default-500">Email</p>
              <p className="font-medium text-default-900">{student?.email}</p>
            </div>
            <div>
              <p className="text-sm text-default-500">Club / Branch</p>
              <p className="font-medium text-default-900">{student?.branch}</p>
            </div>
            <div>
              <p className="text-sm text-default-500">Total Seats Allocated</p>
              <p className="font-medium text-default-900">
                {allocatedSeats.length}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Allocated Seats Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">My Allocated Seats</h2>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="pt-4">
          {allocatedSeats.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-default-100 mb-4">
                <svg
                  className="w-8 h-8 text-default-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
              </div>
              <p className="text-default-600 text-lg font-medium">
                No seats allocated yet
              </p>
              <p className="text-default-400 text-sm mt-1">
                Your seats will appear here once the admin allocates them
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allocatedSeats.map((seat) => (
                <div
                  key={seat.id}
                  className="border border-divider rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all duration-200 bg-gradient-to-br from-default-50 to-default-100/50 dark:from-default-100/5 dark:to-default-100/10"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center mt-0.5">
                          <svg
                            className="w-5 h-5 text-success"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg text-default-900">
                            Seat {seat.label}
                          </h3>
                          {seat.room && (
                            <>
                              <p className="text-sm text-default-500 mt-0.5">
                                {seat.room.name}
                              </p>
                              {seat.room.building && (
                                <p className="text-sm text-default-500 flex items-center gap-1.5 mt-1">
                                  <svg
                                    className="w-4 h-4 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                  </svg>
                                  <span className="truncate">
                                    {seat.room.building.name}
                                  </span>
                                </p>
                              )}
                            </>
                          )}
                          {seat.features && seat.features.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-2">
                              {seat.features.map((feature) => (
                                <span
                                  key={feature}
                                  className="inline-flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-md text-xs font-medium text-primary"
                                >
                                  {feature}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="inline-flex items-center gap-1.5 bg-success/10 px-3 py-1.5 rounded-full text-xs font-semibold text-success">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Allocated
                      </span>
                      <div className="text-right text-xs text-default-500">
                        <p>Row {seat.row}</p>
                        <p>Column {seat.col}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default StudentBookingsPage;
