import React from "react";
import { Link } from "react-router-dom";
import {
  Input,
  Button,
  Select,
  SelectItem,
  Checkbox,
  CheckboxGroup,
} from "@heroui/react";
import { Branch } from "../../types";
import { ACCESSIBILITY_NEEDS } from "../../constants";

const POSSIBLE_NEEDS = ACCESSIBILITY_NEEDS;

const BRANCHES = [
  { id: Branch.ConsultingClub, label: "Consulting Club" },
  { id: Branch.InvestmentBankingClub, label: "Investment Banking Club" },
  { id: Branch.TechAndInnovationClub, label: "Tech & Innovation Club" },
  { id: Branch.EntrepreneurshipCell, label: "Entrepreneurship Cell" },
  { id: Branch.SustainabilityAndCSRClub, label: "Sustainability & CSR Club" },
  { id: Branch.WomenInBusiness, label: "Women in Business" },
  { id: Branch.HealthcareManagementClub, label: "Healthcare Management Club" },
  { id: Branch.RealEstateClub, label: "Real Estate Club" },
];

interface SignUpFormProps {
  email: string;
  password: string;
  role: "Admin" | "Student";
  branch: Branch;
  accessibilityNeeds: string[];
  error: string;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRoleChange: (value: "Admin" | "Student") => void;
  onBranchChange: (value: Branch) => void;
  onAccessibilityNeedsChange: (value: string[]) => void;
  onSubmit: (e: React.FormEvent) => void;
  onErrorClear: () => void;
}

const SignUpForm: React.FC<SignUpFormProps> = ({
  email,
  password,
  role,
  branch,
  accessibilityNeeds,
  error,
  loading,
  onEmailChange,
  onPasswordChange,
  onRoleChange,
  onBranchChange,
  onAccessibilityNeedsChange,
  onSubmit,
  onErrorClear,
}) => {
  return (
    <>
      <div className="text-center space-y-1 mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 dark:from-primary-400 dark:to-secondary-400 bg-clip-text text-transparent">
          Create Account
        </h1>
        <p className="text-sm text-default-500">
          Join us today! It only takes a minute
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
          type="password"
          variant="bordered"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          required
          autoComplete="new-password"
          placeholder="Create a strong password"
          classNames={{
            inputWrapper:
              "border-default-200 dark:border-default-100 hover:border-primary-400 dark:hover:border-primary-500",
          }}
        />

        <Select
          label="Select Your Role"
          variant="bordered"
          selectedKeys={[role]}
          onSelectionChange={(keys) => {
            const selectedKey = Array.from(keys)[0] as string;
            if (
              selectedKey &&
              (selectedKey === "Admin" || selectedKey === "Student")
            ) {
              onRoleChange(selectedKey);
            }
          }}
          disallowEmptySelection
          classNames={{
            trigger:
              "border-default-200 dark:border-default-100 hover:border-primary-400 dark:hover:border-primary-500",
          }}
        >
          <SelectItem key="Student">Student</SelectItem>
          <SelectItem key="Admin">Admin</SelectItem>
        </Select>

        {role === "Student" && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
            <Select
              label="Club / Branch"
              variant="bordered"
              selectedKeys={[branch]}
              onSelectionChange={(keys) => {
                const selectedKey = Array.from(keys)[0] as string;
                if (selectedKey) {
                  onBranchChange(selectedKey as Branch);
                }
              }}
              disallowEmptySelection
              classNames={{
                trigger:
                  "border-default-200 dark:border-default-100 hover:border-primary-400 dark:hover:border-primary-500",
              }}
            >
              {BRANCHES.map((b) => (
                <SelectItem key={b.id}>{b.label}</SelectItem>
              ))}
            </Select>

            <div className="border-2 border-dashed border-default-200 dark:border-default-100 rounded-xl p-4 bg-default-50 dark:bg-default-50/5">
              <label className="text-sm font-semibold text-default-700">
                Accessibility Needs (Optional)
              </label>
              <p className="text-xs text-default-500 mt-1 mb-3">
                Select any requirements to help us provide better seating.
              </p>
              <CheckboxGroup
                value={accessibilityNeeds}
                onValueChange={onAccessibilityNeedsChange}
                classNames={{ wrapper: "gap-3" }}
              >
                {POSSIBLE_NEEDS.map((need) => (
                  <Checkbox
                    key={need.id}
                    value={need.id}
                    classNames={{ label: "text-sm" }}
                  >
                    {need.label}
                  </Checkbox>
                ))}
              </CheckboxGroup>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-danger-50 text-danger-600 border border-danger-200 rounded-lg p-3 text-sm flex items-start gap-3">
            <svg
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
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
          Create Account
        </Button>
      </form>

      <p className="text-sm text-center text-default-500 mt-6">
        Already have an account?
        <Link
          to="/signin"
          className="font-semibold text-primary-600 dark:text-primary-400 hover:underline ml-1"
          onClick={onErrorClear}
        >
          Sign In
        </Link>
      </p>
    </>
  );
};

export default SignUpForm;
