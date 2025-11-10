import React from "react";
import { Link } from "react-router-dom";
import { BlockIcon, BuildingIcon, FloorIcon, RoomIcon } from "./LocationIcons";

interface LocationLevel {
  type: "block" | "building" | "floor" | "room";
  name: string;
  code?: string;
  link?: string;
}

interface LocationBreadcrumbProps {
  levels: LocationLevel[];
  className?: string;
}

const iconMap = {
  block: BlockIcon,
  building: BuildingIcon,
  floor: FloorIcon,
  room: RoomIcon,
};

const colorMap = {
  block: "text-blue-600 dark:text-blue-400",
  building: "text-indigo-600 dark:text-indigo-400",
  floor: "text-green-600 dark:text-green-400",
  room: "text-orange-600 dark:text-orange-400",
};

export const LocationBreadcrumb: React.FC<LocationBreadcrumbProps> = ({
  levels,
  className = "",
}) => {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {levels.map((level, index) => {
        const Icon = iconMap[level.type];
        const isLast = index === levels.length - 1;

        const content = (
          <div
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg
              transition-all duration-200
              ${
                isLast
                  ? "bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/30 border-2 border-primary-300 dark:border-primary-700"
                  : "bg-default-100 dark:bg-default-50/10 hover:bg-default-200 dark:hover:bg-default-100/20"
              }
              ${level.link && !isLast ? "cursor-pointer" : ""}
            `}
          >
            <Icon className="h-4 w-4" variant="solid" />
            <div className="flex flex-col">
              <span
                className={`text-sm font-semibold ${
                  isLast ? "text-primary" : "text-foreground"
                }`}
              >
                {level.name}
              </span>
              {level.code && (
                <span className="text-xs text-default-500">{level.code}</span>
              )}
            </div>
          </div>
        );

        return (
          <React.Fragment key={index}>
            {level.link && !isLast ? (
              <Link to={level.link}>{content}</Link>
            ) : (
              content
            )}
            {!isLast && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-default-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
