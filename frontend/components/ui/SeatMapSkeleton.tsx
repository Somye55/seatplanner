import React from 'react';
import { Card, CardBody, Skeleton } from '@heroui/react';

const SeatMapSkeleton: React.FC = () => {
  // Create a grid of skeleton seats similar to the actual layout (5 columns, 4 rows)
  const skeletonSeats = Array.from({ length: 5 }, (_, colIndex) => 
    Array.from({ length: 4 }, (_, rowIndex) => ({ colIndex, rowIndex }))
  );

  return (
    <div>
      {/* Back button skeleton */}
      <Skeleton className="w-32 h-10 rounded-lg mb-6" />
      
      {/* Header section */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <div>
          {/* Title skeleton */}
          <Skeleton className="w-64 h-8 rounded-lg mb-2" />
          
          {/* Status chips skeleton */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3">
            <Skeleton className="w-20 h-6 rounded-full" />
            <Skeleton className="w-16 h-6 rounded-full" />
            <Skeleton className="w-18 h-6 rounded-full" />
            <Skeleton className="w-40 h-6 rounded-full" />
          </div>
          
          {/* Stats skeleton */}
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Skeleton className="w-16 h-5 rounded" />
            <Skeleton className="w-20 h-5 rounded" />
            <Skeleton className="w-20 h-5 rounded" />
            <Skeleton className="w-24 h-5 rounded" />
          </div>
        </div>
      </div>

      {/* Features text skeleton */}
      <div className="mb-4">
        <Skeleton className="w-48 h-4 rounded" />
      </div>

      {/* Seat map skeleton */}
      <Card>
        <CardBody className="overflow-auto">
          <div className="flex gap-0.5 sm:gap-1 md:gap-1.5 justify-center min-w-min p-4">
            {skeletonSeats.map((column, colIndex) => (
              <div 
                key={colIndex} 
                className={`flex flex-col gap-0.5 sm:gap-1 md:gap-1.5 ${
                  colIndex > 0 && colIndex % 3 === 0 ? 'ml-1 sm:ml-2 md:ml-3' : ''
                }`}
              >
                {column.map((_, seatIndex) => (
                  <Skeleton 
                    key={`skeleton-${colIndex}-${seatIndex}`}
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default SeatMapSkeleton;