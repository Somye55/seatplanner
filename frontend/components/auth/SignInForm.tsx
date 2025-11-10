import React, { useState } from "react";
import { Input, Button, RadioGroup, Radio } from "@heroui/react";

interface SignInFormProps {
  email: string;
  password: string;
  selectedRole: "Admin" | "Teacher" | "Student";
  loading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRoleChange: (value: "Admin" | "Teacher" | "Student") => void;
  onSubmit: (e: React.FormEvent) => void;
}

const SignInForm: React.FC<SignInFormProps> = ({
  email,
  password,
  selectedRole,
  loading,
  onEmailChange,
  onPasswordChange,
  onRoleChange,
  onSubmit,
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
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
            inputWrapper:
              "border-default-200 dark:border-default-100 hover:border-primary-400 dark:hover:border-primary-500",
          }}
        />

        <Input
          label="Password"
          type={isPasswordVisible ? "text" : "password"}
          variant="bordered"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="Enter your password"
          classNames={{
            inputWrapper:
              "border-default-200 dark:border-default-100 hover:border-primary-400 dark:hover:border-primary-500",
          }}
          endContent={
            <button
              className="focus:outline-none"
              type="button"
              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
            >
              {isPasswordVisible ? (
                <svg
                  className="w-5 h-5 text-default-400 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-default-400 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          }
        />

        <div className="space-y-2">
          <RadioGroup
            label="Sign in as"
            value={selectedRole}
            onValueChange={(value) =>
              onRoleChange(value as "Admin" | "Teacher" | "Student")
            }
            orientation="horizontal"
            classNames={{
              label: "text-sm font-medium text-foreground",
              wrapper: "gap-4",
            }}
          >
            <Radio value="Student">Student</Radio>
            <Radio value="Teacher">Teacher</Radio>
            <Radio value="Admin">Admin</Radio>
          </RadioGroup>
        </div>

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

      {/* <div className="text-center mt-6 p-3 bg-default-100 dark:bg-default-50/5 rounded-lg border border-default-200 dark:border-default-100">
        <p className="text-xs text-default-600 dark:text-default-400">
          <svg
            className="w-4 h-4 inline-block mr-1 mb-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          Accounts are managed by administrators. Contact your admin to create
          an account.
        </p>
      </div> */}
    </>
  );
};

export default SignInForm;
