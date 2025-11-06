import React from 'react';
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
  BreadcrumbItem
} from '@heroui/system';

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

export const Card: React.FC<CardProps> = ({ children, className = '', header, footer }) => (
  <HeroCard className={`bg-white dark:bg-gray-800 ${className}`}>
    {header && <CardHeader>{header}</CardHeader>}
    <CardBody>{children}</CardBody>
    {footer && <CardFooter>{footer}</CardFooter>}
  </HeroCard>
);

// Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'bordered' | 'light' | 'flat' | 'faded' | 'shadow' | 'ghost';
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  isLoading?: boolean;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'solid', color = 'primary', size = 'md', isLoading, className = '', ...props }, ref) => {
    // Map old variant names to HeroUI colors
    const mappedColor = color === 'default' ? 'default' : color;
    
    return (
      <HeroButton
        ref={ref}
        variant={variant}
        color={mappedColor}
        size={size}
        isLoading={isLoading}
        className={className}
        {...props}
      >
        {children}
      </HeroButton>
    );
  }
);

Button.displayName = 'Button';

// Modal
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  hideCloseButton?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  hideCloseButton = false,
  size = 'lg'
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
        footer: "border-t border-gray-200 dark:border-gray-700"
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
export const SkeletonCard: React.FC = () => (
  <HeroCard className="w-full space-y-5 p-4">
    <HeroSkeleton className="rounded-lg">
      <div className="h-24 rounded-lg bg-default-300"></div>
    </HeroSkeleton>
    <div className="space-y-3">
      <HeroSkeleton className="w-3/5 rounded-lg">
        <div className="h-3 w-3/5 rounded-lg bg-default-200"></div>
      </HeroSkeleton>
      <HeroSkeleton className="w-4/5 rounded-lg">
        <div className="h-3 w-4/5 rounded-lg bg-default-200"></div>
      </HeroSkeleton>
      <HeroSkeleton className="w-2/5 rounded-lg">
        <div className="h-3 w-2/5 rounded-lg bg-default-300"></div>
      </HeroSkeleton>
    </div>
  </HeroCard>
);
