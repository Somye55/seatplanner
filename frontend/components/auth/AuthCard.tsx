import React from 'react';
import { Card, CardBody } from '@heroui/react';

interface AuthCardProps {
  children: React.ReactNode;
}

const AuthCard: React.FC<AuthCardProps> = ({ children }) => {
  return (
    <Card 
      className="w-full shadow-2xl border-none bg-white/50 dark:bg-gray-900/50 backdrop-blur-lg"
      shadow="lg"
    >
      <CardBody className="gap-6 px-8 py-8">
        {children}
      </CardBody>
    </Card>
  );
};

export default AuthCard;
