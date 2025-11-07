import React from "react";
import { Card, CardBody, Skeleton } from "@heroui/react";

const SeatMapSkeleton: React.FC = () => {
  // Create a grid of skeleton seats similar to the actual layout (5 columns, 4 rows)
  const skeletonSeats = Array.from({ length: 5 }, (_, colIndex) =>
    Array.from({ length: 4 }, (_, rowIndex) => ({ colIndex, rowIndex }))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-default-50/30 dark:from-background dark:via-background dark:to-default-100/10">
      {/* Navigation Header */}
      <Skeleton className="w-32 h-10 rounded-lg mb-6" />

      <div className="max-w-7xl mx-auto px-4 pb-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Skeleton className="w-14 h-14 rounded-xl" />
            <Skeleton className="w-64 h-10 rounded-lg" />
          </div>
          <Skeleton className="w-96 h-6 rounded-lg mx-auto" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card
              key={i}
              className="bg-gradient-to-br from-default-50 to-white dark:from-[#1a1a1a] dark:to-[#0f0f0f] shadow-sm border border-default-200/50 dark:border-default-800/40"
            >
              <CardBody className="text-center py-6">
                <Skeleton className="w-16 h-8 rounded-lg mx-auto mb-2" />
                <Skeleton className="w-20 h-4 rounded-lg mx-auto" />
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Legend and Branch Info */}
        <Card className="mb-8 bg-gradient-to-r from-white to-default-50/50 dark:from-[#1a1a1a] dark:to-[#0f0f0f] shadow-sm border border-default-200/50 dark:border-default-800/40">
          <CardBody className="py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Legend */}
              <div>
                <Skeleton className="w-20 h-6 rounded-lg mb-3" />
                <div className="flex flex-wrap gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="w-4 h-4 rounded" />
                      <Skeleton className="w-20 h-4 rounded" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Branch Allocation */}
              <div>
                <Skeleton className="w-32 h-6 rounded-lg mb-3" />
                <Skeleton className="w-48 h-8 rounded-full" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Seat Map */}
        <div className="px-4">
          <Card className="bg-gradient-to-br from-white via-white to-default-50/30 dark:from-[#1a1a1a] dark:via-[#171717] dark:to-[#0f0f0f] shadow-lg border-0 dark:border dark:border-default-800/40">
            <CardBody className="p-8">
              <div className="text-center mb-6">
                <Skeleton className="w-48 h-8 rounded-lg mx-auto mb-2" />
                <Skeleton className="w-24 h-1 rounded-full mx-auto" />
              </div>

              <div className="overflow-auto bg-gradient-to-br from-default-50/50 to-white dark:from-[#0a0a0a] dark:to-[#050505] rounded-2xl p-6 border border-default-200/50 dark:border-default-800/30">
                <div className="flex gap-0.5 sm:gap-1 md:gap-1.5 justify-center min-w-min">
                  {skeletonSeats.map((column, colIndex) => (
                    <div
                      key={colIndex}
                      className={`flex flex-col gap-0.5 sm:gap-1 md:gap-1.5 ${
                        colIndex > 0 && colIndex % 3 === 0
                          ? "ml-1 sm:ml-2 md:ml-3"
                          : ""
                      }`}
                    >
                      {column.map((_, seatIndex) => (
                        <Skeleton
                          key={`skeleton-${colIndex}-${seatIndex}`}
                          className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg"
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 text-center">
                <Skeleton className="w-64 h-4 rounded-lg mx-auto" />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SeatMapSkeleton;
