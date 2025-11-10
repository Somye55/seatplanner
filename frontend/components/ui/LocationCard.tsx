import React from "react";
import { Card, CardBody, CardFooter, Chip } from "@heroui/react";

interface LocationCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  metadata?: Array<{ label: string; value: string | number }>;
  badge?: {
    text: string;
    color?: "primary" | "success" | "warning" | "danger";
  };
  footer?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  colorScheme?: "blue" | "indigo" | "green" | "orange";
}

const colorSchemes = {
  blue: {
    card: "border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600",
    bg: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30",
  },
  indigo: {
    card: "border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600",
    bg: "bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-950/30 dark:to-purple-900/30",
  },
  green: {
    card: "border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600",
    bg: "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-900/30",
  },
  orange: {
    card: "border-orange-200 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-600",
    bg: "bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950/30 dark:to-amber-900/30",
  },
};

export const LocationCard: React.FC<LocationCardProps> = ({
  icon,
  title,
  subtitle,
  metadata,
  badge,
  footer,
  onClick,
  className = "",
  colorScheme = "blue",
}) => {
  const scheme = colorSchemes[colorScheme];

  return (
    <Card
      isPressable={!!onClick}
      onPress={onClick}
      className={`
        border-2 transition-all duration-300
        hover:shadow-xl hover:-translate-y-1
        ${scheme.card}
        ${className}
      `}
    >
      <CardBody className="gap-4">
        <div className={`${scheme.bg} rounded-xl p-4 -m-2 mb-2`}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xl font-bold text-foreground truncate">
                  {title}
                </h3>
                {badge && (
                  <Chip
                    color={badge.color || "primary"}
                    variant="flat"
                    size="sm"
                    className="shrink-0"
                  >
                    {badge.text}
                  </Chip>
                )}
              </div>
              {subtitle && (
                <p className="text-default-600 text-sm mt-1">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        {metadata && metadata.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {metadata.map((item, index) => (
              <div
                key={index}
                className="bg-default-100 dark:bg-default-50/10 rounded-lg p-3"
              >
                <p className="text-xs text-default-500 uppercase tracking-wide">
                  {item.label}
                </p>
                <p className="text-lg font-semibold text-foreground mt-1">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardBody>

      {footer && (
        <CardFooter className="border-t border-divider bg-default-50/50 dark:bg-default-100/10">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
};
