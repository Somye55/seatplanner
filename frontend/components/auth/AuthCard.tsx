import React from 'react';
import { Card, CardBody } from '@heroui/react';

interface AuthCardProps {
  children: React.ReactNode;
}

const AuthCard: React.FC<AuthCardProps> = ({ children }) => {
  return (
    <Card 
      className="w-full shadow-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-gray-800"
      shadow="lg"
    >
      <CardBody className="gap-6 px-8 py-8">
        {children}
      </CardBody>
    </Card>
  );
};

export default AuthCard;
