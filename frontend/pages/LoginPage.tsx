import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authService } from "../services/authService";
import { Branch } from "../types";
import AuthCard from "../components/auth/AuthCard";
import SignInForm from "../components/auth/SignInForm";
import SignUpForm from "../components/auth/SignUpForm";
import { useTheme } from "../providers/ThemeProvider";
import { Switch } from "@heroui/react";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Admin" | "Student">("Admin");
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<string[]>([]);
  const [branch, setBranch] = useState<Branch>(Branch.ConsultingClub);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const isLogin =
    location.pathname === "/signin" || location.pathname === "/login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await authService.login(email, password);
      } else {
        await authService.signup(
          email,
          password,
          role,
          accessibilityNeeds,
          role === "Student" ? branch : undefined
        );
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleErrorClear = () => setError("");

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="absolute top-6 right-6 z-20">
        <div className="flex items-center gap-2 bg-content1/70 dark:bg-content1/70 backdrop-blur-md p-2 rounded-full shadow-lg border border-default-200 dark:border-default-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
          <Switch
            isSelected={theme === "dark"}
            onValueChange={toggleTheme}
            size="sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-primary-100 via-secondary-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-black p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-primary-100/40 via-transparent to-transparent dark:from-primary-900/30" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-secondary-100/40 via-transparent to-transparent dark:from-secondary-900/30" />

          <div className="relative z-10 flex flex-col items-center">
            <img
              src="/assets/icon-512x512.png"
              alt="SeatPlanner Logo"
              className="h-32 w-32 mx-auto mb-8 drop-shadow-2xl"
            />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 dark:from-primary-400 dark:to-secondary-400 bg-clip-text text-transparent mb-4">
              Welcome to SeatPlanner
            </h1>
            <p className="text-lg text-default-600 dark:text-default-300 max-w-md mx-auto">
              Streamlining event seating for clubs and organizations with
              accessibility in mind.
            </p>
          </div>
        </div>

        {/* Right Side - Auth Forms */}
        <div className="flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-white dark:bg-gray-950">
          <div className="flip-card-container">
            <div className={`flip-card-inner ${!isLogin ? "flipped" : ""}`}>
              {/* Sign In Card (Front) */}
              <div className="flip-card-front">
                <AuthCard>
                  <SignInForm
                    email={email}
                    password={password}
                    error={isLogin ? error : ""}
                    loading={loading}
                    onEmailChange={setEmail}
                    onPasswordChange={setPassword}
                    onSubmit={handleSubmit}
                    onErrorClear={handleErrorClear}
                  />
                </AuthCard>
              </div>

              {/* Sign Up Card (Back) */}
              <div className="flip-card-back">
                <AuthCard>
                  <SignUpForm
                    email={email}
                    password={password}
                    role={role}
                    branch={branch}
                    accessibilityNeeds={accessibilityNeeds}
                    error={!isLogin ? error : ""}
                    loading={loading}
                    onEmailChange={setEmail}
                    onPasswordChange={setPassword}
                    onRoleChange={setRole}
                    onBranchChange={setBranch}
                    onAccessibilityNeedsChange={setAccessibilityNeeds}
                    onSubmit={handleSubmit}
                    onErrorClear={handleErrorClear}
                  />
                </AuthCard>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
