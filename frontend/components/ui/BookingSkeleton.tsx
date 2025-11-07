import React from "react";
import { Card, CardBody, CardHeader, Divider, Skeleton } from "@heroui/react";

const BookingSkeleton: React.FC = () => {
  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <Skeleton className="rounded-lg">
          <div className="h-7 w-32 rounded-lg bg-default-200"></div>
        </Skeleton>
        <Skeleton className="rounded-lg">
          <div className="h-8 w-20 rounded-lg bg-default-200"></div>
        </Skeleton>
      </CardHeader>
      <Divider />
      <CardBody>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-divider rounded-lg p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-2">
                  {/* Room name */}
                  <Skeleton className="rounded-lg">
                    <div className="h-6 w-40 rounded-lg bg-default-200"></div>
                  </Skeleton>
                  {/* Location */}
                  <Skeleton className="rounded-lg">
                    <div className="h-4 w-56 rounded-lg bg-default-200"></div>
                  </Skeleton>
                  {/* Details */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Skeleton className="rounded">
                      <div className="h-6 w-24 rounded bg-default-200"></div>
                    </Skeleton>
                    <Skeleton className="rounded">
                      <div className="h-6 w-32 rounded bg-default-200"></div>
                    </Skeleton>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {/* Status badge */}
                  <Skeleton className="rounded-full">
                    <div className="h-6 w-20 rounded-full bg-default-200"></div>
                  </Skeleton>
                  {/* Time info */}
                  <div className="text-right space-y-1">
                    <Skeleton className="rounded-lg">
                      <div className="h-3 w-28 rounded-lg bg-default-200"></div>
                    </Skeleton>
                    <Skeleton className="rounded-lg">
                      <div className="h-3 w-28 rounded-lg bg-default-200"></div>
                    </Skeleton>
                  </div>
                  {/* Cancel button */}
                  <Skeleton className="rounded-lg">
                    <div className="h-8 w-16 rounded-lg bg-default-200"></div>
                  </Skeleton>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};

export default BookingSkeleton;
