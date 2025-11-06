import React from 'react';
import { Link } from 'react-router-dom';
import { Input, Button } from '@heroui/react';

interface SignInFormProps {
  email: string;
  password: string;
  error: string;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onErrorClear: () => void;
}

const SignInForm: React.FC<SignInFormProps> = ({
  email,
  password,
  error,
  loading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onErrorClear,
}) => {
  return (
    <>
      <div className="text-center space-y-1 mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 dark:from-primary-400 dark:to-secondary-400 bg-clip-text text-transparent">
          Sign In
        </h1>
        <p className="text-sm text-default-500">
          Welcome back! Enter your details to continue
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Input
          label="Email Address"
          type="email"
          variant="bordered"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@example.com"
          classNames={{
            inputWrapper: "border-default-200 dark:border-default-100 hover:border-primary-400 dark:hover:border-primary-500"
          }}
        />
        
        <Input
          label="Password"
          type="password"
          variant="bordered"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="Enter your password"
          classNames={{
            inputWrapper: "border-default-200 dark:border-default-100 hover:border-primary-400 dark:hover:border-primary-500"
          }}
        />

        {error && (
          <div className="bg-danger-50 text-danger-600 border border-danger-200 rounded-lg p-3 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <Button 
          type="submit" 
          color="primary" 
          size="lg" 
          isLoading={loading} 
          className="w-full font-semibold shadow-lg shadow-primary-500/30 dark:shadow-primary-500/20"
        >
          Sign In
        </Button>
      </form>

      <p className="text-sm text-center text-default-500 mt-6">
        Don't have an account? 
        <Link 
          to="/signup" 
          className="font-semibold text-primary-600 dark:text-primary-400 hover:underline ml-1"
          onClick={onErrorClear}
        >
          Sign Up
        </Link>
      </p>
    </>
  );
};

export default SignInForm;
