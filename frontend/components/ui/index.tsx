import React from "react";
import {
  Spinner as HeroSpinner,
  Card as HeroCard,
  CardHeader,
  CardBody,
  CardFooter,
  Button as HeroButton,
  Modal as HeroModal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Tooltip as HeroTooltip,
  Chip as HeroChip,
  Skeleton as HeroSkeleton,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Breadcrumbs as HeroBreadcrumbs,
  BreadcrumbItem,
} from "@heroui/react";

// Re-export HeroUI components with custom wrappers where needed
export { HeroTooltip as Tooltip, HeroChip as Chip, HeroSkeleton as Skeleton };
export { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell };
export { HeroBreadcrumbs as Breadcrumbs, BreadcrumbItem };

// Spinner
export const Spinner: React.FC = () => (
  <div className="flex justify-center items-center h-full py-8">
    <HeroSpinner size="lg" color="primary" />
  </div>
);

// Card
interface CardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  header,
  footer,
}) => (
  <HeroCard className={`bg-white dark:bg-gray-800 ${className}`}>
    {header && <CardHeader>{header}</CardHeader>}
    <CardBody>{children}</CardBody>
    {footer && <CardFooter>{footer}</CardFooter>}
  </HeroCard>
);

// Button
interface ButtonProps {
  variant?:
    | "solid"
    | "bordered"
    | "light"
    | "flat"
    | "faded"
    | "shadow"
    | "ghost";
  color?:
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  isLoading?: boolean;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  onPress?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  isDisabled?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "solid",
      color = "primary",
      size = "md",
      isLoading,
      className = "",
      onClick,
      onPress,
      type,
      disabled,
      isDisabled,
      startContent,
      endContent,
      ...props
    },
    ref
  ) => {
    // Map old variant names to HeroUI colors
    const mappedColor = color === "default" ? "default" : color;

    return (
      <HeroButton
        ref={ref}
        variant={variant}
        color={mappedColor}
        size={size}
        isLoading={isLoading}
        className={className}
        onPress={onPress || onClick}
        type={type}
        isDisabled={isDisabled || disabled}
        startContent={startContent}
        endContent={endContent}
      >
        {children}
      </HeroButton>
    );
  }
);

Button.displayName = "Button";

// Modal
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  hideCloseButton?: boolean;
  size?:
    | "xs"
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl"
    | "full";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  hideCloseButton = false,
  size = "lg",
}) => {
  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      hideCloseButton={hideCloseButton}
      classNames={{
        base: "bg-white dark:bg-gray-800",
        header: "border-b border-gray-200 dark:border-gray-700",
        body: "py-6",
        footer: "border-t border-gray-200 dark:border-gray-700",
      }}
    >
      <ModalContent>
        <ModalHeader className="text-xl font-bold text-gray-900 dark:text-white">
          {title}
        </ModalHeader>
        <ModalBody className="text-gray-700 dark:text-gray-300">
          {children}
        </ModalBody>
        {footer && <ModalFooter>{footer}</ModalFooter>}
      </ModalContent>
    </HeroModal>
  );
};

// Skeleton Card for loading states
export const SkeletonCard: React.FC<{
  variant?: "default" | "compact" | "room";
}> = ({ variant = "default" }) => {
  if (variant === "room") {
    return (
      <HeroCard className="w-full hover:scale-105 transition-transform duration-300">
        <CardBody className="gap-3">
          {/* Title skeleton */}
          <HeroSkeleton className="rounded-lg">
            <div className="h-7 w-3/4 rounded-lg bg-default-200"></div>
          </HeroSkeleton>
          {/* Subtitle/description skeleton */}
          <HeroSkeleton className="rounded-lg">
            <div className="h-5 w-2/3 rounded-lg bg-default-200"></div>
          </HeroSkeleton>
          {/* Optional chip/tag skeleton */}
          <HeroSkeleton className="rounded-lg">
            <div className="h-6 w-1/3 rounded-lg bg-default-200"></div>
          </HeroSkeleton>
          {/* Status section with border */}
          <div className="pt-3 border-t border-divider">
            <HeroSkeleton className="rounded-lg">
              <div className="h-7 w-1/2 rounded-lg bg-default-200"></div>
            </HeroSkeleton>
          </div>
        </CardBody>
        <CardFooter className="justify-between border-t border-divider">
          {/* Primary action button */}
          <HeroSkeleton className="rounded-lg">
            <div className="h-9 w-24 rounded-lg bg-default-200"></div>
          </HeroSkeleton>
          {/* Admin actions */}
          <div className="flex flex-col gap-2">
            <HeroSkeleton className="rounded-lg">
              <div className="h-8 w-28 rounded-lg bg-default-200"></div>
            </HeroSkeleton>
            <div className="flex gap-2">
              <HeroSkeleton className="rounded-lg">
                <div className="h-8 w-12 rounded-lg bg-default-200"></div>
              </HeroSkeleton>
              <HeroSkeleton className="rounded-lg">
                <div className="h-8 w-16 rounded-lg bg-default-200"></div>
              </HeroSkeleton>
            </div>
          </div>
        </CardFooter>
      </HeroCard>
    );
  }

  return (
    <HeroCard className="w-full">
      <CardBody className={variant === "compact" ? "gap-3" : "gap-4"}>
        {/* Title skeleton */}
        <HeroSkeleton className="rounded-lg">
          <div
            className={`${
              variant === "compact" ? "h-6" : "h-7"
            } w-3/4 rounded-lg bg-default-200`}
          ></div>
        </HeroSkeleton>
        {/* Subtitle/description skeleton */}
        <HeroSkeleton className="rounded-lg">
          <div
            className={`${
              variant === "compact" ? "h-4" : "h-5"
            } w-1/2 rounded-lg bg-default-200`}
          ></div>
        </HeroSkeleton>
        {/* Additional content skeleton */}
        <HeroSkeleton className="rounded-lg">
          <div
            className={`${
              variant === "compact" ? "h-4" : "h-5"
            } w-2/3 rounded-lg bg-default-300`}
          ></div>
        </HeroSkeleton>
      </CardBody>
      <CardFooter className="justify-between border-t border-divider">
        {/* Primary action button */}
        <HeroSkeleton className="rounded-lg">
          <div className="h-9 w-24 rounded-lg bg-default-200"></div>
        </HeroSkeleton>
        {/* Secondary actions */}
        <div className="flex gap-2">
          <HeroSkeleton className="rounded-lg">
            <div className="h-8 w-12 rounded-lg bg-default-200"></div>
          </HeroSkeleton>
          <HeroSkeleton className="rounded-lg">
            <div className="h-8 w-16 rounded-lg bg-default-200"></div>
          </HeroSkeleton>
        </div>
      </CardFooter>
    </HeroCard>
  );
};

// Generic Table Skeleton for loading states
export const SkeletonTable: React.FC<{
  columns: string[];
  rows?: number;
  columnWidths?: string[];
}> = ({ columns, rows = 5, columnWidths }) => (
  <Table aria-label="Loading table" className="min-w-full">
    <TableHeader>
      {columns.map((column, index) => (
        <TableColumn key={index}>{column}</TableColumn>
      ))}
    </TableHeader>
    <TableBody>
      {Array.from({ length: rows }, (_, i) => (
        <TableRow key={i}>
          {columns.map((_, colIndex) => (
            <TableCell key={colIndex}>
              <HeroSkeleton className="rounded-lg">
                <div
                  className={`h-5 ${
                    columnWidths?.[colIndex] || "w-24"
                  } rounded-lg bg-default-200`}
                ></div>
              </HeroSkeleton>
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// Confirmation Modal
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: "danger" | "warning" | "default";
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  isLoading = false,
  variant = "danger",
}) => {
  const getConfirmColor = () => {
    switch (variant) {
      case "danger":
        return "danger";
      case "warning":
        return "warning";
      default:
        return "primary";
    }
  };

  return (
    <HeroModal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="text-xl font-bold">{title}</ModalHeader>
            <ModalBody>
              <p className="text-default-600">{message}</p>
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="light"
                onPress={onClose}
                isDisabled={isLoading}
              >
                {cancelText}
              </Button>
              <Button
                color={getConfirmColor()}
                onPress={onConfirm}
                isLoading={isLoading}
              >
                {confirmText}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </HeroModal>
  );
};

// Export the SeatMapSkeleton component
export { default as SeatMapSkeleton } from "./SeatMapSkeleton";
